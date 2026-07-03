import { evaluateSnapshot } from "./core/sentinel.js";
import { sampleLedger } from "./data/sample-ledger.js";

const snapshots = sampleLedger.map(evaluateSnapshot).sort((a, b) => b.date.localeCompare(a.date));
const latest = snapshots[0];

renderHero(latest);
renderMetricCards(latest);
renderChart(snapshots);
renderLedgerControls(snapshots);
renderLedger(snapshots);

function renderHero(snapshot) {
  const hero = document.querySelector("[data-hero]");
  const [command, detail] = splitDirective(snapshot.route.directive);
  hero.dataset.severity = snapshot.route.severity;
  hero.querySelector("[data-regime]").textContent = snapshot.route.label;
  hero.querySelector("[data-command]").textContent = command;
  hero.querySelector("[data-directive]").textContent = detail;
  hero.querySelector("[data-score]").textContent = `${snapshot.aggregateScore}/12`;
  hero.querySelector("[data-credit]").textContent = `${snapshot.inputs.creditSpread.toFixed(2)}% HY spread`;
  hero.querySelector("[data-date]").textContent = snapshot.date;
}

function renderMetricCards(snapshot) {
  const cards = [
    {
      name: "VIX",
      value: snapshot.inputs.vix.toFixed(2),
      score: snapshot.scores.vix
    },
    {
      name: "S&P 500 Breadth",
      value: `${snapshot.inputs.breadth.toFixed(1)}%`,
      score: snapshot.scores.breadth
    },
    {
      name: "Equity Put/Call",
      value: snapshot.inputs.putCall.toFixed(2),
      score: snapshot.scores.putCall
    },
    {
      name: "High-Yield Credit",
      value: `${snapshot.inputs.creditSpread.toFixed(2)}%`,
      score: {
        points: snapshot.creditCircuitOpen ? "LOCK" : "SAFE",
        badge: snapshot.creditCircuitOpen ? "Circuit Tripped" : "Circuit Closed",
        detail: snapshot.creditCircuitOpen ? "Credit stress overrides equity signals" : "Credit permits equity signal evaluation",
        thresholdHint: "Trip point: >4.50%"
      }
    }
  ];

  document.querySelector("[data-metrics]").innerHTML = cards
    .map(
      (card) => `
        <article class="metric-card">
          <div>
            <p class="metric-name">${card.name}</p>
            <p class="metric-value">${card.value}</p>
          </div>
          <span class="badge">${card.score.badge}</span>
          <div class="metric-footer">
            <strong>${card.score.points}</strong>
            <span>${card.score.detail}</span>
          </div>
          <p class="threshold-hint">${card.score.thresholdHint}</p>
        </article>
      `
    )
    .join("");
}

function renderChart(snapshots) {
  const ordered = [...snapshots].sort((a, b) => a.date.localeCompare(b.date));
  const width = 760;
  const height = 240;
  const padding = 28;
  const xStep = (width - padding * 2) / Math.max(ordered.length - 1, 1);
  const points = ordered
    .map((snapshot, index) => {
      const x = padding + index * xStep;
      const y = height - padding - (snapshot.aggregateScore / 12) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const guideLines = [0, 3, 7, 12]
    .map((value) => {
      const y = height - padding - (value / 12) * (height - padding * 2);
      return `<line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" class="guide" />
        <text x="4" y="${y + 4}" class="axis-label">${value}</text>`;
    })
    .join("");

  document.querySelector("[data-chart]").innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Aggregate sentiment score history">
      ${renderRegimeBand(0, 3, "Passive", "#dff5e9", height, padding, width)}
      ${renderRegimeBand(4, 7, "Rotation", "#fff1c7", height, padding, width)}
      ${renderRegimeBand(8, 12, "Panic", "#ffe0d6", height, padding, width)}
      ${guideLines}
      <polyline points="${points}" class="score-line" />
      ${ordered
        .map((snapshot, index) => {
          const [x, y] = points.split(" ")[index].split(",");
          return `<circle cx="${x}" cy="${y}" r="5"><title>${snapshot.date}: ${snapshot.aggregateScore}/12</title></circle>`;
        })
        .join("")}
      ${ordered
        .map((snapshot, index) => {
          const x = padding + index * xStep;
          return `<text x="${x}" y="${height - 6}" class="date-label">${formatShortDate(snapshot.date)}</text>`;
        })
        .join("")}
    </svg>
  `;
}

function renderRegimeBand(min, max, label, color, height, padding, width) {
  const chartHeight = height - padding * 2;
  const yTop = height - padding - (max / 12) * chartHeight;
  const yBottom = height - padding - (min / 12) * chartHeight;
  return `<rect x="${padding}" y="${yTop}" width="${width - padding * 2}" height="${yBottom - yTop}" fill="${color}" />
    <text x="${width - padding - 6}" y="${yTop + 18}" class="band-label">${label}</text>`;
}

function renderLedgerControls(snapshots) {
  const regimes = [...new Set(snapshots.map((snapshot) => snapshot.route.id))];
  document.querySelector("[data-ledger-controls]").innerHTML = `
    <label>
      Regime
      <select data-filter-regime>
        <option value="">All regimes</option>
        ${regimes.map((id) => `<option value="${id}">${formatRegimeId(id)}</option>`).join("")}
      </select>
    </label>
    <label>
      From
      <input type="date" data-filter-from />
    </label>
    <label>
      To
      <input type="date" data-filter-to />
    </label>
    <label>
      Search
      <input type="search" data-filter-search placeholder="Signal text or date" />
    </label>
  `;

  document.querySelector("[data-ledger-controls]").addEventListener("input", () => {
    renderLedger(filterSnapshots(snapshots));
  });
}

function filterSnapshots(snapshots) {
  const regime = document.querySelector("[data-filter-regime]").value;
  const from = document.querySelector("[data-filter-from]").value;
  const to = document.querySelector("[data-filter-to]").value;
  const search = document.querySelector("[data-filter-search]").value.trim().toLowerCase();

  return snapshots.filter((snapshot) => {
    const haystack = `${snapshot.date} ${snapshot.route.label} ${snapshot.route.directive}`.toLowerCase();
    return (
      (!regime || snapshot.route.id === regime) &&
      (!from || snapshot.date >= from) &&
      (!to || snapshot.date <= to) &&
      (!search || haystack.includes(search))
    );
  });
}

function renderLedger(snapshots) {
  document.querySelector("[data-ledger]").innerHTML = snapshots
    .map(
      (snapshot) => `
        <tr>
          <td>${snapshot.date}</td>
          <td>${snapshot.aggregateScore}/12</td>
          <td>${snapshot.inputs.vix.toFixed(2)}</td>
          <td>${snapshot.inputs.breadth.toFixed(1)}%</td>
          <td>${snapshot.inputs.putCall.toFixed(2)}</td>
          <td>${snapshot.inputs.creditSpread.toFixed(2)}%</td>
          <td>${snapshot.route.label}</td>
        </tr>
      `
    )
    .join("") || `<tr><td colspan="7">No snapshots match the current filters.</td></tr>`;
}

function splitDirective(directive) {
  const [command, detail = ""] = directive.split("|").map((part) => part.trim());
  return [command, detail];
}

function formatRegimeId(id) {
  return id
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function formatShortDate(date) {
  return date.slice(5).replace("-", "/");
}
