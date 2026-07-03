import assert from "node:assert/strict";
import test from "node:test";
import { evaluateSnapshot, scoreBreadth, scorePutCall, scoreVix } from "../src/core/sentinel.js";

test("credit spread above threshold forces systemic crash", () => {
  const snapshot = evaluateSnapshot({
    date: "2026-01-01",
    vix: 15,
    breadth: 72,
    putCall: 0.7,
    creditSpread: 4.51
  });

  assert.equal(snapshot.route.id, "systemic-crash");
  assert.equal(snapshot.creditCircuitOpen, true);
});

test("aggregate score of 8 or more selects broad capitulation when credit is safe", () => {
  const snapshot = evaluateSnapshot({
    date: "2026-01-02",
    vix: 38,
    breadth: 29,
    putCall: 1.18,
    creditSpread: 4.5
  });

  assert.equal(snapshot.aggregateScore, 9);
  assert.equal(snapshot.route.id, "broad-capitulation");
});

test("liquidity flash crash override wins before standard rotation", () => {
  const snapshot = evaluateSnapshot({
    date: "2026-01-03",
    vix: 36,
    breadth: 68,
    putCall: 1.31,
    creditSpread: 3.4
  });

  assert.equal(snapshot.aggregateScore, 7);
  assert.equal(snapshot.route.id, "liquidity-flash-crash");
});

test("stealth liquidation override wins before standard rotation", () => {
  const snapshot = evaluateSnapshot({
    date: "2026-01-04",
    vix: 21,
    breadth: 31,
    putCall: 0.91,
    creditSpread: 3.4
  });

  assert.equal(snapshot.aggregateScore, 5);
  assert.equal(snapshot.route.id, "stealth-liquidation");
});

test("aggregate score of 3 or less selects passive indexing", () => {
  const snapshot = evaluateSnapshot({
    date: "2026-01-05",
    vix: 17,
    breadth: 63,
    putCall: 0.8,
    creditSpread: 3.4
  });

  assert.equal(snapshot.aggregateScore, 2);
  assert.equal(snapshot.route.id, "passive-indexing");
});

test("remaining 4 to 7 scores select standard annual rotation", () => {
  const snapshot = evaluateSnapshot({
    date: "2026-01-06",
    vix: 28,
    breadth: 44,
    putCall: 1.08,
    creditSpread: 3.4
  });

  assert.equal(snapshot.aggregateScore, 6);
  assert.equal(snapshot.route.id, "annual-rotation");
});

test("scoring brackets respect boundary values", () => {
  assert.equal(scoreVix(18).points, 1);
  assert.equal(scoreVix(45).points, 3);
  assert.equal(scoreBreadth(65).points, 1);
  assert.equal(scoreBreadth(25).points, 3);
  assert.equal(scorePutCall(1).points, 2);
  assert.equal(scorePutCall(1.3).points, 3);
});

test("missing metrics throw before any snapshot can be persisted", () => {
  assert.throws(
    () =>
      evaluateSnapshot({
        date: "2026-01-07",
        vix: 20,
        breadth: 55,
        creditSpread: 3.4
      }),
    /Missing required metric: putCall/
  );
});
