export const RENT = 1500;
export const GARBAGE = 20;

export type LineInput = {
  previousElectric: number;
  currentElectric: number;
  previousWater: number;
  currentWater: number;
  electricRate: number;
  waterRate: number;
};

export type LineResult = {
  electricUsage: number;
  waterUsage: number;
  electricAmount: number;
  waterAmount: number;
  rent: number;
  garbage: number;
  total: number;
};

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function calcLine(input: LineInput): LineResult {
  if (input.currentElectric < input.previousElectric) {
    throw new Error("มิเตอร์ไฟปัจจุบันน้อยกว่ามิเตอร์เดิม");
  }
  if (input.currentWater < input.previousWater) {
    throw new Error("มิเตอร์น้ำปัจจุบันน้อยกว่ามิเตอร์เดิม");
  }
  const electricUsage = round2(input.currentElectric - input.previousElectric);
  const waterUsage = round2(input.currentWater - input.previousWater);
  const electricAmount = round2(electricUsage * input.electricRate);
  const waterAmount = round2(waterUsage * input.waterRate);
  const total = round2(RENT + electricAmount + waterAmount + GARBAGE);
  return {
    electricUsage,
    waterUsage,
    electricAmount,
    waterAmount,
    rent: RENT,
    garbage: GARBAGE,
    total,
  };
}

export function sumTotals(lines: LineResult[]): number {
  return round2(lines.reduce((sum, line) => sum + line.total, 0));
}
