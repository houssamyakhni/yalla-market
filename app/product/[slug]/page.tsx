import {ProductDetail} from '@/components/product-detail';
import {catalog} from '@/lib/server';
import {notFound} from 'next/navigation';
export const dynamic='force-dynamic';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const {products}=await catalog();const p=products.find(p=>p.slug===slug);return {title:p?.name||'Product',description:p?.description};}
export default async function ProductPage({params}:{params:Promise<{slug:string}>}){const {slug}=await params;const {products,online}=await catalog();const product=products.find(p=>p.slug===slug);if(!product)notFound();return <ProductDetail key={product.id} product={product} online={online} related={products.filter(p=>p.category===product.category&&p.id!==product.id).slice(0,4)}/>;}
