import type {Metadata} from 'next';
import {StoreProvider} from '@/components/store-context';
import {Header,Footer} from '@/components/chrome';
import {isAdmin} from '@/lib/server';
import './globals.css';
export const metadata:Metadata={title:{default:'Yalla Market — Good finds, every day',template:'%s | Yalla Market'},description:'Shop fashion, shoes, electronics, beauty, and home favorites. Cash on delivery, Whish Money, and WhatsApp ordering in Lebanon.'};
export default async function Layout({children}:{children:React.ReactNode}){return <html lang="en" data-scroll-behavior="smooth"><body><StoreProvider><Header admin={await isAdmin()}/>{children}<Footer/></StoreProvider></body></html>;}
