import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { MATCH_STATISTICS, parseMatchStatistics, statisticShares } from "../lib/match-statistics.ts";

test("statistics preserve real zeroes, missing values, percentages and fractional xG", () => {
  const data = { updatedAt: "2026-09-06T15:00:00Z", statistics: [
    { key: "redCards", home: 0, away: null }, { key: "possession", home: 62, away: 38 },
    { key: "expectedGoals", home: 1.42, away: 0.75 }, { key: "goalsPrevented", home: -0.4, away: 0.2 },
  ] };
  assert.deepEqual(parseMatchStatistics(data), data);
  assert.deepEqual(parseMatchStatistics({ updatedAt: null, statistics: [] }), { updatedAt: null, statistics: [] });
});

test("malformed live frames cannot overwrite validated statistics", () => {
  for (const invalid of [null, {}, { updatedAt: null, statistics: [{ key: "possession", home: "62%", away: 38 }] },
    { updatedAt: null, statistics: [{ key: "shotsTotal", home: NaN, away: 2 }] },
    { updatedAt: null, statistics: [{ key: "shotsTotal", home: 2 }] },
    { updatedAt: null, statistics: [{ key: "shotsTotal", home: 2, away: 1 }, { key: "shotsTotal", home: 9, away: 1 }] }]) {
    assert.equal(parseMatchStatistics(invalid), null);
  }
});

test("comparison bars do not turn unknown, zero-total or negative stats into misleading shares", () => {
  assert.equal(statisticShares(null, 4), null);
  assert.equal(statisticShares(0, null), null);
  assert.equal(statisticShares(0, 0), null);
  assert.equal(statisticShares(-0.4, 0.2), null);
  assert.deepEqual(statisticShares(0, 4), [0, 100]);
  assert.deepEqual(statisticShares(60, 40), [60, 40]);
  assert.deepEqual(statisticShares(12, 4), [75, 25]);
});

test("every displayed provider statistic has a Spanish and English label", async () => {
  for (const locale of ["es", "en"]) {
    const messages = JSON.parse(await readFile(new URL(`../messages/${locale}.json`, import.meta.url), "utf8"));
    for (const row of MATCH_STATISTICS) assert.equal(typeof messages.MatchStatistics[row.key], "string", `${locale}: ${row.key}`);
  }
  assert.equal(new Set(MATCH_STATISTICS.map(row => row.key)).size, MATCH_STATISTICS.length);
});
