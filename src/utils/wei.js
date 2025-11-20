// utils/wei.js
export function toTokenUnits(amountStr, decimals = 18) {
  const [whole, frac = ""] = String(amountStr).split(".");

  const wholeBig = BigInt(whole || "0");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  const fracBig = BigInt(fracPadded || "0");

  const base = 10n ** BigInt(decimals);
  return (wholeBig * base + fracBig).toString(); // uint256 en string
}