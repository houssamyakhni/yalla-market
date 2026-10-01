'use client';
import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import Link from 'next/link';
import { X, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { cartKey, money, productImage, type Product, type CartItem } from '@/lib/types';
import { DELIVERY_ETA, DELIVERY_OFFER, centsUntilFreeDelivery } from '@/lib/delivery';
type State={cart:CartItem[];add:(item:CartItem)=>void;quantity:(key:string,n:number)=>void;clear:()=>void;openCart:()=>void;favorites:string[];favorite:(id:string)=>void;toast:(message:string)=>void;ready:boolean};
const Context=createContext<State|null>(null);
export const useStore=()=>{const value=useContext(Context);if(!value) throw new Error('Store provider missing');return value;};
export function StoreProvider({children}:{children:ReactNode}) {
  const [cart,setCart]=useState<CartItem[]>([]);const [favorites,setFavorites]=useState<string[]>([]);const [ready,setReady]=useState(false);const [message,setMessage]=useState('');const dialog=useRef<HTMLDialogElement>(null);const timer=useRef<ReturnType<typeof setTimeout>|null>(null);
  useEffect(()=>{try {const items=JSON.parse(localStorage.getItem('yalla-cart')||'[]');if(Array.isArray(items)) setCart(items.filter((i:CartItem)=>i && typeof i.productId==='string'&&Number.isInteger(i.quantity)&&i.quantity>0&&i.quantity<=20&&Number.isFinite(i.price)&&typeof i.name==='string'&&typeof i.image==='string'&&typeof i.color==='string'&&typeof i.size==='string').slice(0,50));const ids=JSON.parse(localStorage.getItem('yalla-favorites')||'[]');if(Array.isArray(ids))setFavorites(ids.filter(i=>typeof i==='string'));}catch{} setReady(true);},[]);
  useEffect(()=>{if(ready){try{localStorage.setItem('yalla-cart',JSON.stringify(cart));localStorage.setItem('yalla-favorites',JSON.stringify(favorites));}catch{/* The bag still works for this visit when browser storage is unavailable. */}}},[cart,favorites,ready]);
  useEffect(()=>{fetch('/api/products').then(async response=>{if(!response.ok)return;const products:Product[]=await response.json();setCart(items=>items.map(item=>{const p=products.find(p=>p.id===item.productId);return p?{...item,name:p.name,price:p.price,image:productImage(p,item.color)}:item;}));}).catch(()=>{});},[]);
  function toast(text:string){setMessage(text);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setMessage(''),4000);}
  function add(item:CartItem){setCart(items=>{const old=items.find(i=>cartKey(i)===cartKey(item));return old?items.map(i=>cartKey(i)===cartKey(item)?{...item,quantity:Math.min(20,i.quantity+item.quantity)}:i):[...items,item];});toast('Added to your bag');}
  function quantity(key:string,n:number){setCart(items=>n<=0?items.filter(i=>cartKey(i)!==key):items.map(i=>cartKey(i)===key?{...i,quantity:Math.min(20,n)}:i));}
  const subtotal=cart.reduce((s,i)=>s+i.price*i.quantity,0);
  return <Context.Provider value={{cart,add,quantity,clear:()=>setCart([]),openCart:()=>dialog.current?.showModal(),favorites,favorite:(id)=>setFavorites(ids=>ids.includes(id)?ids.filter(x=>x!==id):[...ids,id]),toast,ready}}>
    {children}
    {message&&<div className="toast" role="status">{message}</div>}
    <dialog ref={dialog} className="bag-dialog"><div className="bag-content"><div className="dialog-head"><h2>Your bag <span>({cart.reduce((s,i)=>s+i.quantity,0)})</span></h2><button className="icon-button" aria-label="Close bag" onClick={()=>dialog.current?.close()}><X/></button></div>
      {cart.length===0?<div className="empty"><ShoppingBag size={48}/><h3>A little room for something good.</h3><p>Your bag is empty. Find your next everyday favorite.</p><button className="button" onClick={()=>dialog.current?.close()}>Keep exploring</button></div>:<><div className="bag-lines">{cart.map(item=><div className="bag-line" key={cartKey(item)}><img src={item.image} alt={item.name}/><div><b>{item.name}</b><p className="muted">{[item.color,item.size].filter(Boolean).join(' / ')}</p><strong>{money(item.price)}</strong><div className="quantity"><button aria-label={`Remove one ${item.name}`} onClick={()=>quantity(cartKey(item),item.quantity-1)}><Minus size={14}/></button><span>{item.quantity}</span><button aria-label={`Add one ${item.name}`} onClick={()=>quantity(cartKey(item),item.quantity+1)}><Plus size={14}/></button></div></div><button className="icon-button" aria-label={`Remove ${item.name}`} onClick={()=>quantity(cartKey(item),0)}><Trash2 size={17}/></button></div>)}</div><div className="bag-bottom"><div className="between"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><p className="muted">{DELIVERY_OFFER} {centsUntilFreeDelivery(subtotal)>0?`${money(centsUntilFreeDelivery(subtotal))} away from free delivery.`:"Your delivery is on us."}</p><p className="muted">{DELIVERY_ETA}</p><Link className="button full" href="/checkout" onClick={()=>dialog.current?.close()}>Go to checkout</Link><button className="text-button full" onClick={()=>dialog.current?.close()}>Continue shopping</button></div></>}
    </div></dialog>
  </Context.Provider>;
}
