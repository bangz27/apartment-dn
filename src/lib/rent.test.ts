import assert from "node:assert/strict";
import test from "node:test";
import { calcLine, sumTotals } from "./rent.ts";

test("building 1 sample from the rent rules", () => {
  const line = calcLine({
    previousElectric: 3560,
    currentElectric: 3701,
    previousWater: 685,
    currentWater: 688,
    electricRate: 7,
    waterRate: 13,
  });
  assert.equal(line.electricUsage, 141);
  assert.equal(line.electricAmount, 987);
  assert.equal(line.waterUsage, 3);
  assert.equal(line.waterAmount, 39);
  assert.equal(line.rent, 1500);
  assert.equal(line.garbage, 20);
  assert.equal(line.total, 2546);
});

test("building 2 rates and a second room stay on one total", () => {
  const first = calcLine({
    previousElectric: 100,
    currentElectric: 110,
    previousWater: 50,
    currentWater: 52,
    electricRate: 10,
    waterRate: 15,
  });
  const second = calcLine({
    previousElectric: 10,
    currentElectric: 10,
    previousWater: 4,
    currentWater: 4,
    electricRate: 10,
    waterRate: 15,
  });
  assert.equal(first.total, 1650);
  assert.equal(second.total, 1520);
  assert.equal(sumTotals([first, second]), 3170);
});

test("rejects a meter that went backwards", () => {
  assert.throws(
    () =>
      calcLine({
        previousElectric: 10,
        currentElectric: 9,
        previousWater: 1,
        currentWater: 1,
        electricRate: 7,
        waterRate: 13,
      }),
    /มิเตอร์ไฟ/,
  );
});
