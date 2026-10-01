import type {MetadataRoute} from 'next';
import {catalog} from '@/lib/server';
export const dynamic='force-dynamic';
export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const origin=(process.env.SITE_URL||process.env.NEXT_PUBLIC_SITE_URL||'http://localhost:3000').replace(/\/$/,'');
 const {products,online}=await catalog();
 return [{url:origin,changeFrequency:'daily',priority:1},{url:origin+'/shop',changeFrequency:'daily',priority:.9},{url:origin+'/help',changeFrequency:'monthly',priority:.3},...(online?products.map(p=>({url:origin+'/product/'+p.slug,changeFrequency:'weekly' as const,priority:.7})):[])];
}
