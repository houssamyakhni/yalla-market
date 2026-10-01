import {Catalog} from '@/components/catalog';
import {catalog} from '@/lib/server';
export const dynamic='force-dynamic';
export const metadata={title:'Shop all products'};
export default async function Shop({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){const params=await searchParams;return <Catalog key={JSON.stringify(params)} {...await catalog()} initialCategory={params.category||''} initialQuery={params.q||''} initialSale={params.sale==='1'} onlyFavorites={params.favorites==='1'}/>;}
