import {OrderView} from '@/components/order';
export const metadata={title:'Your order',robots:{index:false,follow:false}};
export default async function OrderPage({params,searchParams}:{params:Promise<{reference:string}>;searchParams:Promise<{token?:string}>}){return <OrderView reference={(await params).reference} token={(await searchParams).token||''}/>;}
