export type Color = { name: string; hex: string; image?: string; generatedPreview?: boolean };
export type Product = {
  id: string; slug: string; name: string; description: string; category: string;
  price: number; compareAtPrice: number; images: string[]; imageIds?: string[];
  colors: Color[]; sizes: string[]; stock: number; featured: boolean;
  active: boolean; sample?: boolean; sku: string; createdAt: string;
};
export type CartItem = { productId: string; name: string; image: string; price: number; quantity: number; color: string; size: string };
export type Order = {
  id: string; reference: string; accessToken?: string; idempotencyKey?: string;
  customer: { name: string; phone: string; email?: string; city: string; address: string; notes?: string };
  items: CartItem[]; subtotal: number; shipping: number; total: number;
  paymentMethod: 'cash' | 'whish'; paymentStatus: 'pending' | 'paid'; paymentReference?: string;
  status: 'new' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'; createdAt: string;
};
export const CATEGORIES = ['Fashion','Shoes','Bags & accessories','Electronics','Beauty','Home & living'];
export const money = (cents: number) => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD'}).format(cents / 100);
export const productImage = (product: Pick<Product, 'colors'|'images'>, color: string) => product.colors.find(c => c.name === color)?.image || product.images[0];
export const cartKey = (p: Pick<CartItem, 'productId'|'color'|'size'>) => `${p.productId}:${p.color}:${p.size}`;
