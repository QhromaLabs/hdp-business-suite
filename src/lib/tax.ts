export const TAX_RATE = 0.16;

export function calculateTaxAmount(subtotal: number, discount: number, enabled: boolean) {
  const taxable = Math.max(0, subtotal - discount);
  return enabled ? taxable * TAX_RATE : 0;
}

export function calculateTotals(subtotal: number, discount: number, enabled: boolean) {
  const tax = calculateTaxAmount(subtotal, discount, enabled);
  const total = subtotal - discount + tax;
  return { tax, total };
}
