// Run: npx tsx --test scripts/address-match.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { outcomeIndicesFor, sameAddress } from "./address-match.js";

const lower = "0xfb6916095ca1df60bb79ce92ce3ea74c37c5d359";
const checksummed = "0xfB6916095ca1df60bB79Ce92cE3Ea74c37c5d359";
const positions = [
  { marketProxy: lower, outcomeIdx: "0" },
  { marketProxy: lower, outcomeIdx: "1" },
  { marketProxy: lower, outcomeIdx: "1" },
  { marketProxy: "0x94d829cce7e8532aef2a829489c1c1296c111990", outcomeIdx: "2" },
];

test("lowercase and checksummed addresses select the same positions", () => {
  const byLower = positions.filter((p) => sameAddress(p.marketProxy, lower));
  assert.equal(byLower.length, 3);
  assert.deepEqual(
    positions.filter((p) => sameAddress(p.marketProxy, checksummed)),
    byLower,
  );
});

test("lowercase and checksummed addresses give the same outcome indices", () => {
  assert.deepEqual(outcomeIndicesFor(positions, lower), [0, 1]);
  assert.deepEqual(outcomeIndicesFor(positions, checksummed), [0, 1]);
});
