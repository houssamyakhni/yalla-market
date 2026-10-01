// NEXT_PUBLIC values are embedded at build time. Keep credentials server-side.
export const whatsappNumber = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '').replace(/\D/g, '');
export const paymentPhone = process.env.NEXT_PUBLIC_PAYMENT_PHONE || 'Contact the store for payment details';

export function whatsappUrl(message?: string): string {
  if (!whatsappNumber) return '/help';
  return `https://wa.me/${whatsappNumber}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}
