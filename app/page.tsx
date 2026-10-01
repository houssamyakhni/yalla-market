import {Catalog} from '@/components/catalog';
import {catalog} from '@/lib/server';
export const dynamic='force-dynamic';
export default async function Home(){return <Catalog {...await catalog()} home/>;}
