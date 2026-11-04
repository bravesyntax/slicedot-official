// Store charges, in one place. Same rules as the PHP checkout, which hardcoded them; the shipping numbers in the
// `settings` table were never read.
export const FREE_SHIPPING_FROM = 499;
export const SHIPPING_FEE = 49;
export const COD_FEE = 40;

export const shippingFor = (subtotal: number) => (subtotal <= 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_FEE);
