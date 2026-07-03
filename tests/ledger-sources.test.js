import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBackfillSnapshots,
  latestBarchartBreadth,
  latestCboeDailyPutCall,
  latestManualMetric,
  metricInRange
} from "../scripts/update-ledger.mjs";

test("Cboe put/call parser reads escaped market statistics payload", () => {
  const metric = latestCboeDailyPutCall(
    'data":{"optionsData":{"ratios":[{"name":"EQUITY PUT/CALL RATIO\\",\\"value\\":\\"0.53\\"}]}'
  );

  assert.equal(metric.source, "Cboe daily market statistics equity put/call ratio");
  assert.equal(metric.value, 0.53);
});

test("Cboe put/call parser rejects missing and zero values", () => {
  assert.throws(() => latestCboeDailyPutCall("<html>No market statistics</html>"), /Invalid metric/);
  assert.throws(() => latestCboeDailyPutCall("EQUITY PUT/CALL RATIO 0.00"), /Out-of-range metric/);
});

test("Cboe put/call parser rejects unexpected oversized values", () => {
  assert.throws(() => latestCboeDailyPutCall("EQUITY PUT/CALL RATIO 99.00"), /Out-of-range metric/);
});

test("Barchart breadth parser reads the $S5TH symbol header", () => {
  const metric = latestBarchartBreadth(
    '<div data-ng-init=\'init({"symbol":"$S5TH","symbolName":"S&P 500 Stocks Above 200-Day Average","lastPrice":"66.07","tradeTime":"07/02/26"})\'></div>'
  );

  assert.equal(metric.source, "Barchart $S5TH S&P 500 stocks above 200-day average");
  assert.equal(metric.date, "2026-07-02");
  assert.equal(metric.value, 66.07);
});

test("Barchart breadth parser rejects missing, zero, and above-100 values", () => {
  assert.throws(() => latestBarchartBreadth("<html>No S5TH payload</html>"), /Invalid metric/);
  assert.throws(() => latestBarchartBreadth("$S5TH : 0.00"), /Out-of-range metric/);
  assert.throws(() => latestBarchartBreadth("$S5TH : 101.00"), /Out-of-range metric/);
});

test("manual fallback still validates value shape", () => {
  assert.throws(
    () => latestManualMetric({ putCall: { date: "2026-07-02", value: "bad" } }, "putCall", "fetch failed"),
    /Invalid metric/
  );
});

test("metric range helper rejects finite but nonsensical values", () => {
  assert.throws(
    () => metricInRange("Test metric", "2026-07-02", 0, { minExclusive: 0, maxInclusive: 100 }),
    /Out-of-range metric/
  );
});

test("backfill snapshots join historical VIX and credit rows while carrying current-only values", () => {
  const snapshots = buildBackfillSnapshots({
    vixCsv: [
      "DATE,OPEN,HIGH,LOW,CLOSE",
      "06/30/2026,16,17,15,16.50",
      "07/01/2026,15,16,14,15.75"
    ].join("\n"),
    creditCsv: [
      "observation_date,BAMLH0A0HYM2",
      "2026-06-30,2.80",
      "2026-07-01,2.74"
    ].join("\n"),
    currentBreadth: {
      source: "Barchart $S5TH S&P 500 stocks above 200-day average",
      date: "2026-07-02",
      value: 66.07
    },
    currentPutCall: {
      source: "Cboe daily market statistics equity put/call ratio",
      date: "2026-07-03",
      value: 0.53
    },
    days: 2,
    endDate: "2026-07-01"
  });

  assert.equal(snapshots.length, 2);
  assert.equal(snapshots[0].date, "2026-07-01");
  assert.equal(snapshots[0].vix, 15.75);
  assert.equal(snapshots[0].creditSpread, 2.74);
  assert.equal(snapshots[0].breadth, 66.07);
  assert.equal(snapshots[0].sources.breadth.carriedFromDate, "2026-07-02");
  assert.match(snapshots[0].sources.putCall.source, /carried backward/);
});
