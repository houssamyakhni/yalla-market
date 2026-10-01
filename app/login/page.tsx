import {Login} from '@/components/login';
import {isAdmin} from '@/lib/server';
import {redirect} from 'next/navigation';
export const metadata={title:'Admin sign in'};
export default async function LoginPage(){if(await isAdmin())redirect('/admin');return <Login/>;}
