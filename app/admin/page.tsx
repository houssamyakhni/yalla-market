import {Admin} from '@/components/admin';
import {isAdmin} from '@/lib/server';
import {redirect} from 'next/navigation';
export const metadata={title:'Admin panel',robots:{index:false,follow:false}};
export const dynamic='force-dynamic';
export default async function AdminPage(){if(!await isAdmin())redirect('/login');return <Admin/>;}
