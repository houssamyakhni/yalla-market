export const STANDARD_DELIVERY_CENTS = 300;
export const FREE_DELIVERY_OVER_CENTS = 5000;
export const DELIVERY_DAYS = 2;

export const DELIVERY_ETA = `Delivery within ${DELIVERY_DAYS} days across all Lebanon.`;
export const DELIVERY_OFFER = `$${STANDARD_DELIVERY_CENTS / 100} delivery. Free delivery on orders over $${FREE_DELIVERY_OVER_CENTS / 100}.`;
export const DELIVERY_BANNER = `Delivery within ${DELIVERY_DAYS} days across all Lebanon · Free delivery on orders over $${FREE_DELIVERY_OVER_CENTS / 100}`;

// Subtotals are integer USD cents. Exactly $50 still pays standard delivery.
export function shippingForSubtotal(subtotal: number): number {
  return subtotal > FREE_DELIVERY_OVER_CENTS ? 0 : STANDARD_DELIVERY_CENTS;
}

export function centsUntilFreeDelivery(subtotal: number): number {
  return Math.max(0, FREE_DELIVERY_OVER_CENTS + 1 - subtotal);
}
