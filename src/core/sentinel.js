export const CREDIT_SPREAD_LIMIT = 4.5;

export const ROUTES = {
  SYSTEMIC_CRASH: {
    id: "systemic-crash",
    severity: "danger",
    label: "SYSTEMIC CRASH - STAND DOWN",
    frequency: "1 to 2 times per decade",
    directive:
      "EMERGENCY: STOP ALL BUYING! | Credit Crunch: Actual economic and banking structures are breaking down. Cease all dip-buying operations immediately and protect your cash."
  },
  BROAD_CAPITULATION: {
    id: "broad-capitulation",
    severity: "panic",
    label: "Panic - High Conviction Buy (8-12 pts)",
    frequency: "3 to 5 times per decade",
    directive:
      "ACTION: BUY SINGLE STOCKS AGGRESSIVELY! | Market Panic: Complete stock market surrender while the economic backbone remains safe. This is a rare, highest-conviction window to buy premium companies at massive discounts."
  },
  LIQUIDITY_FLASH_CRASH: {
    id: "liquidity-flash-crash",
    severity: "rotation",
    label: "Annual Rotation Window (4-7 pts) - Liquidity Flash Crash",
    frequency: "Sudden derivative-driven flash crashes",
    directive:
      "ACTION: BUY MEGA-CAP MARKET LEADERS! | Liquidity Flash Crash: Leverage unwinds and options panic are causing a fast, artificial drop. Excellent tactical window to scoop up dominant, highly liquid single stocks."
  },
  STEALTH_LIQUIDATION: {
    id: "stealth-liquidation",
    severity: "rotation",
    label: "Annual Rotation Window (4-7 pts) - Stealth Liquidation",
    frequency: "Divergent, top-heavy distribution markets",
    directive:
      "ACTION: AVOID INDEX ETFs, HUNT FOR SINGLE STOCKS! | Stealth Liquidation: A few massive mega-caps are artificially keeping indices high, but the average stock underneath is getting quietly crushed. Pick individual value names."
  },
  PASSIVE_INDEXING: {
    id: "passive-indexing",
    severity: "calm",
    label: "Passive Indexing (0-3 pts)",
    frequency: "~60% to 70% of the time",
    directive:
      "ACTION: HOLD BROAD ETFs & DO NOTHING! | High Complacency: Market risk metrics are asleep and there are no fear-based discounts available. Sit tight in your passive indexes."
  },
  ANNUAL_ROTATION: {
    id: "annual-rotation",
    severity: "rotation",
    label: "Annual Rotation Window (4-7 pts)",
    frequency: "1 to 3 times per year",
    directive:
      "ACTION: ROTATE FROM ETFs TO SINGLE STOCKS! | Annual Buying Window: The market is experiencing a routine yearly pullback while credit remains perfectly safe. This is your green light to turn off the ETF autopilot and start scaling cash into high-quality individual stocks at a local discount."
  }
};

export function evaluateSnapshot(input) {
  const metrics = validateInput(input);
  const scores = {
    vix: scoreVix(metrics.vix),
    breadth: scoreBreadth(metrics.breadth),
    putCall: scorePutCall(metrics.putCall)
  };
  const aggregateScore = scores.vix.points + scores.breadth.points + scores.putCall.points;
  const route = selectRoute(metrics.creditSpread, scores, aggregateScore);

  return Object.freeze({
    date: metrics.date,
    inputs: metrics,
    scores,
    aggregateScore,
    creditCircuitOpen: metrics.creditSpread > CREDIT_SPREAD_LIMIT,
    route
  });
}

export function selectRoute(creditSpread, scores, aggregateScore) {
  if (creditSpread > CREDIT_SPREAD_LIMIT) {
    return ROUTES.SYSTEMIC_CRASH;
  }

  if (aggregateScore >= 8) {
    return ROUTES.BROAD_CAPITULATION;
  }

  if (scores.vix.points + scores.putCall.points >= 6 && scores.breadth.points <= 1) {
    return ROUTES.LIQUIDITY_FLASH_CRASH;
  }

  if (scores.breadth.points >= 3 && scores.vix.points + scores.putCall.points <= 3) {
    return ROUTES.STEALTH_LIQUIDATION;
  }

  if (aggregateScore <= 3) {
    return ROUTES.PASSIVE_INDEXING;
  }

  return ROUTES.ANNUAL_ROTATION;
}

export function scoreVix(value) {
  if (value < 18) return metricScore(0, "OK", "Low expected volatility", "Next: 18.00 = Churn");
  if (value < 25) return metricScore(1, "Churn", "Elevated but orderly hedging", "Next: 25.00 = Discount");
  if (value < 35) return metricScore(2, "Discount", "Meaningful anxiety", "Next: 35.00 = Panic");
  if (value <= 45) return metricScore(3, "Panic", "Severe volatility stress", "Next: >45.00 = Capitulation");
  return metricScore(4, "Capitulation", "Extreme volatility event", "Max bracket reached");
}

export function scoreBreadth(value) {
  if (value > 65) return metricScore(0, "OK", "Broad participation", "Next: <=65.0% = Churn");
  if (value >= 50) return metricScore(1, "Churn", "Participation softening", "Next: <50.0% = Discount");
  if (value >= 40) return metricScore(2, "Discount", "Trend damage visible", "Next: <40.0% = Panic");
  if (value >= 25) return metricScore(3, "Panic", "Broad internal weakness", "Next: <25.0% = Capitulation");
  return metricScore(4, "Capitulation", "Severe market-wide weakness", "Max bracket reached");
}

export function scorePutCall(value) {
  if (value < 0.75) return metricScore(0, "OK", "Call demand dominant", "Next: 0.75 = Churn");
  if (value < 1) return metricScore(1, "Churn", "Protection demand rising", "Next: 1.00 = Discount");
  if (value <= 1.15) return metricScore(2, "Discount", "Defensive positioning", "Next: 1.16 = Panic");
  if (value <= 1.3) return metricScore(3, "Panic", "Heavy put demand", "Next: >1.30 = Capitulation");
  return metricScore(4, "Capitulation", "Extreme protective positioning", "Max bracket reached");
}

function metricScore(points, badge, detail, thresholdHint) {
  return Object.freeze({ points, badge, detail, thresholdHint });
}

function validateInput(input) {
  const required = ["date", "vix", "breadth", "putCall", "creditSpread"];
  for (const key of required) {
    if (input[key] === undefined || input[key] === null || input[key] === "") {
      throw new Error(`Missing required metric: ${key}`);
    }
  }

  const metrics = {
    date: String(input.date),
    vix: Number(input.vix),
    breadth: Number(input.breadth),
    putCall: Number(input.putCall),
    creditSpread: Number(input.creditSpread)
  };

  for (const [key, value] of Object.entries(metrics)) {
    if (key !== "date" && !Number.isFinite(value)) {
      throw new Error(`Invalid numeric metric: ${key}`);
    }
  }

  return metrics;
}
