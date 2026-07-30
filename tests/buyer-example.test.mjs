import assert from "node:assert/strict";
import test from "node:test";
import { selectProofDeskBase } from "../examples/pay-with-base.mjs";

const expected = {
  scheme: "exact",
  network: "eip155:8453",
  asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  amount: "40000",
  payTo: "0x36D130BEed8E68Bbd74225F1f56a381BB5B3C23F",
  maxTimeoutSeconds: 300,
  extra: {},
};

test("Base buyer example selects only the exact advertised payment", () => {
  assert.equal(selectProofDeskBase(2, [expected]), expected);
});

test("Base buyer example refuses price or receiver changes", () => {
  assert.throws(
    () => selectProofDeskBase(2, [{ ...expected, amount: "40001" }]),
    /refusing to sign/,
  );
  assert.throws(
    () =>
      selectProofDeskBase(2, [
        {
          ...expected,
          payTo: "0x0000000000000000000000000000000000000000",
        },
      ]),
    /refusing to sign/,
  );
});
