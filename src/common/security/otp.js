import { randomInt } from "node:crypto";

// 6 random digits, e.g. "048213"
export function generateOtp() {
  return randomInt(0, 1000000).toString().padStart(6, "0");
}
