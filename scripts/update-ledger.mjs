import { readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const ledgerPath = join(root, "data", "ledger.json");
const overridesPath = join(root, "data", "manual-overrides.json");

const sources = {
  vix: "https://cdn.cboe.com/api/global/us_indices/daily_prices/VIX_History.csv",
  putCall: "https://www.cboe.com/markets/us/options/market-statistics/daily",
  breadth: "https://www.barchart.com/stocks/quotes/%24S5TH",
  creditSpread: "https://fred.stlouisfed.org/graph/fredgraph.csv?id=BAMLH0A0HYM2"
};

const maxAgeDays = Number(process.env.MAX_SOURCE_AGE_DAYS || 14);
const dryRun = process.argv.includes("--dry-run");

main().catch((error) => {
  if (process.env.NOOP_ON_STALE === "true" && error.message.includes("source is stale")) {
    console.warn(`No ledger update: ${error.message}`);
    return;
  }

  console.error(error.message);
  process.exitCode = 1;
});

async function main() {
  const [ledger, overrides, vixCsv, putCallHtmlResult, breadthHtmlResult, creditCsv] = await Promise.all([
    readJson(ledgerPath),
    readJson(overridesPath),
    fetchText(sources.vix),
    fetchOptionalText(sources.putCall),
    fetchOptionalText(sources.breadth),
    fetchText(sources.creditSpread)
  ]);

  const metrics = {
    vix: latestVix(vixCsv),
    putCall: latestProviderOrManual(
      () => latestCboeDailyPutCall(putCallHtmlResult),
      overrides,
      "putCall"
    ),
    creditSpread: latestCreditSpread(creditCsv),
    breadth: latestProviderOrManual(
      () => latestBarchartBreadth(breadthHtmlResult),
      overrides,
      "breadth"
    )
  };

  validateFreshMetrics(metrics, maxAgeDays);

  const date = latestSharedDate(metrics);
  const snapshot = {
    date,
    vix: metrics.vix.value,
    breadth: metrics.breadth.value,
    putCall: metrics.putCall.value,
    creditSpread: metrics.creditSpread.value,
    sources: {
      vix: metrics.vix,
      breadth: metrics.breadth,
      putCall: metrics.putCall,
      creditSpread: metrics.creditSpread
    }
  };

  const existingSnapshots = ledger.sourceMode === "sample"
    ? []
    : (ledger.snapshots || []).filter((row) => row.sources);
  const snapshots = upsertSnapshot(existingSnapshots, snapshot);
  const nextLedger = {
    generatedAt: new Date().toISOString(),
    sourceMode: "automated-with-public-page-fallbacks",
    snapshots
  };

  if (dryRun) {
    console.log(`Dry run passed for ${date}`);
    return;
  }

  await writeJsonAtomic(ledgerPath, nextLedger);
  console.log(`Updated ledger with ${date}`);
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "user-agent": "plutus-sentinel/0.1" }
    });
    if (!response.ok) {
      throw new Error(`Fetch failed for ${url}: ${response.status} ${response.statusText}`);
    }
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchOptionalText(url) {
  try {
    return { ok: true, text: await fetchText(url) };
  } catch (error) {
    return { ok: false, error };
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function writeJsonAtomic(path, value) {
  const tmpPath = `${path}.tmp`;
  await writeFile(tmpPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tmpPath, path);
}

function latestVix(csv) {
  const rows = parseCsv(csv);
  const row = lastDataRow(rows, ["DATE", "CLOSE"]);
  return metric("Cboe VIX history", normalizeDate(row.DATE), Number(row.CLOSE));
}

function latestCboeDailyPutCall(result) {
  if (!result.ok) {
    throw result.error;
  }

  const value = firstFiniteNumber([
    result.text.match(/EQUITY PUT\/CALL RATIO\s+([\d.]+)/i)?.[1],
    result.text.match(/EQUITY PUT\/CALL RATIO\\",\\"value\\":\\"([\d.]+)\\"/i)?.[1],
    result.text.match(/EQUITY PUT\/CALL RATIO","value":"([\d.]+)"/i)?.[1]
  ]);
  if (!Number.isFinite(value)) {
    throw new Error("Cboe equity put/call ratio not found");
  }

  return metric("Cboe daily market statistics equity put/call ratio", todayIsoDate(), value);
}

function latestBarchartBreadth(result) {
  if (!result.ok) {
    throw result.error;
  }

  const header = barchartHeaderData(result.text);
  const value = firstFiniteNumber([
    header?.lastPrice,
    result.text.match(/\$S5TH\s*:\s*([\d.]+)/i)?.[1],
    result.text.match(/"symbol":"\$S5TH".*?"lastPrice":"([\d.]+)"/s)?.[1]
  ]);
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error("Barchart $S5TH breadth value not found");
  }

  return metric(
    "Barchart $S5TH S&P 500 stocks above 200-day average",
    header?.tradeTime ? normalizeShortDate(header.tradeTime) : latestShortDateInHtml(result.text),
    value
  );
}

function latestCreditSpread(csv) {
  const rows = parseCsv(csv);
  const row = lastDataRow(rows, ["observation_date", "BAMLH0A0HYM2"]);
  return metric("FRED BAMLH0A0HYM2", row.observation_date, Number(row.BAMLH0A0HYM2));
}

function latestProviderOrManual(provider, overrides, key) {
  try {
    return provider();
  } catch (error) {
    return latestManualMetric(overrides, key, error.message);
  }
}

function latestManualMetric(overrides, key, reason) {
  const value = overrides[key];
  if (!value) {
    throw new Error(`Missing manual ${key} override after provider failed: ${reason}`);
  }
  return metric(value.source || `Manual ${key} override`, value.date, Number(value.value));
}

function firstFiniteNumber(values) {
  for (const value of values) {
    const number = Number(value);
    if (Number.isFinite(number)) {
      return number;
    }
  }
  return Number.NaN;
}

function barchartHeaderData(html) {
  const match = html.match(/data-ng-init='init\((\{[^']*"symbol":"\$S5TH"[^']*\})\)'/s);
  if (!match) {
    return null;
  }

  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function metric(source, date, value) {
  if (!date || !Number.isFinite(value)) {
    throw new Error(`Invalid metric from ${source}`);
  }
  return { source, date, value };
}

function parseCsv(csv) {
  const lines = csv
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const headerIndex = lines.findIndex((line) => /^date,|^observation_date,/i.test(line));
  if (headerIndex === -1) {
    throw new Error("CSV header not found");
  }

  const headers = splitCsvLine(lines[headerIndex]).map((header) => header.trim());
  return lines.slice(headerIndex + 1).map((line) => {
    const values = splitCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() || ""]));
  });
}

function splitCsvLine(line) {
  const cells = [];
  let cell = "";
  let quoted = false;

  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }

  cells.push(cell);
  return cells;
}

function lastDataRow(rows, requiredColumns) {
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index];
    if (requiredColumns.every((column) => row[column] && row[column] !== ".")) {
      return row;
    }
  }
  throw new Error(`No complete row found for columns: ${requiredColumns.join(", ")}`);
}

function normalizeDate(date) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const [month, day, year] = date.split("/").map((part) => part.padStart(2, "0"));
  if (!year || !month || !day) {
    throw new Error(`Unsupported date format: ${date}`);
  }
  return `${year}-${month}-${day}`;
}

function normalizeShortDate(date) {
  const [month, day, year] = date.split("/").map((part) => part.padStart(2, "0"));
  if (!year || !month || !day) {
    throw new Error(`Unsupported date format: ${date}`);
  }
  return `20${year}-${month}-${day}`;
}

function latestShortDateInHtml(html) {
  const dates = [...html.matchAll(/\bon\s+(\d{2}\/\d{2}\/\d{2})\b/g)].map((match) => normalizeShortDate(match[1]));
  if (dates.length === 0) {
    return todayIsoDate();
  }
  return dates.sort().at(-1);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function validateFreshMetrics(metrics, maxDays) {
  const now = new Date();
  for (const [name, value] of Object.entries(metrics)) {
    const ageMs = now.getTime() - new Date(`${value.date}T00:00:00Z`).getTime();
    const ageDays = ageMs / 86_400_000;
    if (ageDays > maxDays) {
      throw new Error(`${name} source is stale: ${value.date}`);
    }
  }
}

function latestSharedDate(metrics) {
  return Object.values(metrics)
    .map((value) => value.date)
    .sort()
    .at(0);
}

function upsertSnapshot(existing, snapshot) {
  const next = existing.filter((row) => row.date !== snapshot.date);
  next.push(snapshot);
  return next.sort((a, b) => b.date.localeCompare(a.date));
}
