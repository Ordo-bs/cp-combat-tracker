/** All fractional combat damage values round down. */
export function floorDamage(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.floor(value);
}
