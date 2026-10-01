import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes, randomUUID } from 'node:crypto';
import { ApiError, database, isAdmin, issueSession, checkPassword, sameOrigin, rateLimit } from '@/lib/server';
import { CATEGORIES, productImage, type Product, type Order, type CartItem } from '@/lib/types';
import { shippingForSubtotal } from '@/lib/delivery';
import { isStoreImage } from '@/lib/images';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const safeImage = z.url().refine(url => isStoreImage(url), 'Use an uploaded image from your configured ImageKit endpoint.');
const productSchema = z.object({
  name: z.string().trim().min(2).max(160), description:z.string().trim().min(10).max(5000),
  category:z.enum(CATEGORIES as [string,...string[]]), price:z.number().int().min(1).max(10000000),
  compareAtPrice:z.number().int().min(0).max(10000000), images:z.array(safeImage).min(1).max(12),
  imageIds:z.array(z.string().max(100)).max(12).optional(), colors:z.array(z.object({name:z.string().trim().min(1).max(40),hex:z.string().regex(/^#[0-9a-fA-F]{6}$/),image:safeImage.optional(),generatedPreview:z.boolean().optional()})).max(20),
  sizes:z.array(z.string().trim().min(1).max(20)).max(30), stock:z.number().int().min(0).max(100000),
  featured:z.boolean(), active:z.boolean(), sku:z.string().trim().min(1).max(80), sample:z.boolean().optional(),
}).refine(p => p.compareAtPrice === 0 || p.compareAtPrice >= p.price, 'Original price must be at least the sale price.')
  .refine(p => p.colors.every(c => !c.image || p.images.includes(c.image)), 'Each color photo must be in the product gallery.')
  .refine(p => !p.active || p.colors.length < 2 || p.colors.every(c => !!c.image), 'Assign a matching photo to every color before publishing.')
  .refine(p => new Set(p.colors.map(c => c.name.toLowerCase())).size === p.colors.length, 'Use a unique name for each color.');
const orderSchema = z.object({
  customer:z.object({name:z.string().trim().min(2).max(100),phone:z.string().trim().regex(/^\+?[0-9 ()-]{8,20}$/, 'Enter a valid phone number.').refine(phone=>{const digits=phone.replace(/\D/g,'');return digits.length>=8&&digits.length<=15;},'Enter a phone number with 8 to 15 digits.'), email:z.union([z.email(),z.literal('')]).optional(),city:z.string().trim().min(2).max(100),address:z.string().trim().min(8).max(500),notes:z.string().trim().max(1000).optional()}),
  items:z.array(z.object({productId:z.string().max(100),quantity:z.number().int().min(1).max(20),color:z.string().max(40),size:z.string().max(20)})).min(1).max(50),
  paymentMethod:z.enum(['cash','whish']),paymentReference:z.string().trim().max(100).optional(),idempotencyKey:z.uuid(),
});
const json = (value: unknown, status = 200) => NextResponse.json(value, {status, headers:{'Cache-Control':'no-store'}});
async function body(req:NextRequest) {
  if (!req.headers.get('content-type')?.includes('application/json')) throw new ApiError(415,'Send JSON data.');
  if (Number(req.headers.get('content-length') || 0)>100000) throw new ApiError(413,'Request is too large.');
  const text = await req.text(); if(text.length > 100000) throw new ApiError(413,'Request is too large.');
  try {return JSON.parse(text);} catch {throw new ApiError(400,'Invalid request.');}
}
async function adminOnly() {if(!await isAdmin()) throw new ApiError(401,'Please sign in as admin.');}
async function handle(req:NextRequest, method:string, paths:string[]) {
  const path = paths.join('/');
  if(method === 'GET' && path === 'session') return json({admin:await isAdmin(),email:await isAdmin()?process.env.ADMIN_EMAIL:null});
  if(method !== 'GET') sameOrigin(req);
  if(method === 'POST' && path === 'login') {
    const input=z.object({email:z.email(),password:z.string().min(1).max(200)}).parse(await body(req));
    await rateLimit('admin-login', 12, 15*60*1000);
    const valid=checkPassword(input.password);
    if(input.email.toLowerCase() !== process.env.ADMIN_EMAIL?.toLowerCase() || !valid) throw new ApiError(401,'Email or password is incorrect.');
    const response=json({admin:true});
    response.cookies.set('yalla_admin',issueSession(),{httpOnly:true,secure:req.nextUrl.protocol==='https:',sameSite:'lax',path:'/',maxAge:8*60*60});
    return response;
  }
  if(method === 'POST' && path === 'logout') {const response=json({ok:true});response.cookies.set('yalla_admin','',{httpOnly:true,path:'/',maxAge:0});return response;}
  if(paths[0]==='admin') await adminOnly();
  const db=await database();
  if(method === 'GET' && path === 'products') {
    return json(await db.collection<Product>('products').find({active:true},{projection:{_id:0}}).sort({featured:-1,createdAt:-1}).toArray());
  }
  if(method === 'GET' && paths[0] === 'order' && paths.length===2) {
    const token=req.nextUrl.searchParams.get('token');
    if(!token || token.length<32) throw new ApiError(404,'Order not found.');
    const order=await db.collection<Order>('orders').findOne({reference:paths[1],accessToken:token},{projection:{_id:0,accessToken:0,idempotencyKey:0}});
    if(!order) throw new ApiError(404,'Order not found.');return json(order);
  }
  if(method === 'POST' && path === 'orders') {
    const input=orderSchema.parse(await body(req));
    await rateLimit(`order:${input.customer.phone.replace(/\D/g,'')}`,10,60*60*1000);
    await rateLimit('all-checkout-requests',60,60*60*1000);
    const connection=await (globalThis as unknown as {mongo:Promise<import('mongodb').MongoClient>}).mongo;
    const session=connection.startSession();
    let saved:Order | null=null;
    try {
      await session.withTransaction(async()=>{
        const prior=await db.collection<Order>('orders').findOne({idempotencyKey:input.idempotencyKey},{session});
        if(prior) {saved=prior;return;}
        const ids=[...new Set(input.items.map(i=>i.productId))];
        const products=await db.collection<Product>('products').find({id:{$in:ids},active:true},{session}).toArray();
        const totals=new Map<string,number>(); const items:CartItem[]=[];
        for(const requested of input.items) {
          const p=products.find(p=>p.id===requested.productId);
          if(!p) throw new ApiError(409,'A product is no longer available. Please refresh your cart.');
          if((p.colors.length && !p.colors.some(c=>c.name===requested.color)) || (!p.colors.length && requested.color!=='')) throw new ApiError(400,'Choose a valid product color.');
          if(p.colors.length>1 && !p.colors.find(c=>c.name===requested.color)?.image) throw new ApiError(409,'This color is being updated. Please choose another product or contact the store.');
          if((p.sizes.length && !p.sizes.includes(requested.size)) || (!p.sizes.length && requested.size!=='')) throw new ApiError(400,'Choose a valid product size.');
          totals.set(p.id,(totals.get(p.id)||0)+requested.quantity);
          items.push({...requested,name:p.name,image:productImage(p,requested.color),price:p.price});
        }
        for(const [id,qty] of totals) {
          if(qty>20) throw new ApiError(400,'Maximum 20 units of each product per order.');
          const result=await db.collection<Product>('products').updateOne({id,stock:{$gte:qty},active:true},{$inc:{stock:-qty}},{session});
          if(result.modifiedCount!==1) throw new ApiError(409,`${products.find(p=>p.id===id)?.name || 'Product'} does not have enough stock.`);
        }
        const subtotal=items.reduce((s,i)=>s+i.price*i.quantity,0);const shipping=shippingForSubtotal(subtotal);
        saved={id:randomUUID(),reference:`YM-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${randomBytes(4).toString('hex').toUpperCase()}`,accessToken:randomBytes(24).toString('base64url'),idempotencyKey:input.idempotencyKey,customer:input.customer,items,subtotal,shipping,total:subtotal+shipping,paymentMethod:input.paymentMethod,paymentStatus:'pending',paymentReference:input.paymentReference,status:'new',createdAt:new Date().toISOString()};
        await db.collection<Order>('orders').insertOne(saved,{session});
      });
    } catch(error) {
      if(error && typeof error==='object' && 'code' in error && error.code===11000) saved=await db.collection<Order>('orders').findOne({idempotencyKey:input.idempotencyKey});
      else throw error;
    } finally {await session.endSession();}
    if(!saved) throw new ApiError(503,'Could not save order. Please try again.');
    return json(saved,201);
  }
  if(paths[0]==='admin') {
    if(method==='GET' && path==='admin/products') return json(await db.collection<Product>('products').find({},{projection:{_id:0}}).sort({createdAt:-1}).toArray());
    if(method==='GET' && path==='admin/orders') return json(await db.collection<Order>('orders').find({},{projection:{_id:0,accessToken:0,idempotencyKey:0}}).sort({createdAt:-1}).limit(500).toArray());
    if(method==='POST' && path==='admin/products') {
      const input=productSchema.parse(await body(req));const id=randomUUID();
      const slug=input.name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100)+'-'+id.slice(0,6);
      const product:Product={...input,id,slug,createdAt:new Date().toISOString()};
      await db.collection<Product>('products').insertOne(product);return json(product,201);
    }
    if(method==='PATCH' && paths[1]==='products' && paths.length===3) {
      const data=await body(req);const input=productSchema.parse(data);const expectedStock=z.number().int().min(0).parse(data.expectedStock);
      const result=await db.collection<Product>('products').findOneAndUpdate({id:paths[2],stock:expectedStock},{$set:input},{returnDocument:'after',projection:{_id:0}});
      if(!result) throw new ApiError(409,'Product stock changed while you were editing. Reload products and try again.');return json(result);
    }
    if(method==='DELETE' && paths[1]==='products' && paths.length===3) {
      const result=await db.collection<Product>('products').updateOne({id:paths[2]},{$set:{active:false}});if(!result.matchedCount) throw new ApiError(404,'Product not found.');return json({ok:true});
    }
    if(method==='PATCH' && paths[1]==='orders' && paths.length===3) {
      const input=z.object({status:z.enum(['new','confirmed','shipped','delivered','cancelled']),paymentStatus:z.enum(['pending','paid'])}).parse(await body(req));
      const connection=await (globalThis as unknown as {mongo:Promise<import('mongodb').MongoClient>}).mongo;const session=connection.startSession();
      try {await session.withTransaction(async()=>{
        const order=await db.collection<Order>('orders').findOne({id:paths[2]},{session});if(!order) throw new ApiError(404,'Order not found.');
        if(order.status==='cancelled' && input.status!=='cancelled') throw new ApiError(409,'Cancelled orders cannot be reopened.');
        if(order.status!== 'cancelled' && input.status==='cancelled') {
          if(order.status==='delivered') throw new ApiError(409,'Delivered orders cannot be cancelled.');
          for(const item of order.items) await db.collection<Product>('products').updateOne({id:item.productId},{$inc:{stock:item.quantity}},{session});
        }
        await db.collection<Order>('orders').updateOne({id:order.id},{$set:input},{session});
      });} finally {await session.endSession();}return json({ok:true});
    }
    if(method==='POST' && path==='admin/upload') {
      if(Number(req.headers.get('content-length')||0)>11*1024*1024) throw new ApiError(413,'Images must be under 10 MB.');
      const form=await req.formData();const file=form.get('file');
      if(!(file instanceof File)||file.size===0||file.size>10*1024*1024) throw new ApiError(400,'Choose an image under 10 MB.');
      if(!['image/jpeg','image/png','image/webp','image/avif'].includes(file.type)) throw new ApiError(400,'Use a JPG, PNG, WebP, or AVIF image.');
      const bytes=Buffer.from(await file.arrayBuffer());
      const jpg=bytes[0]===0xff&&bytes[1]===0xd8;const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
      const webp=bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';const avif=bytes.toString('ascii',4,8)==='ftyp'&&/avif|avis/.test(bytes.toString('ascii',8,32));
      if(!jpg&&!png&&!webp&&!avif) throw new ApiError(400,'This file is not a supported image.');
      if(!process.env.IMAGEKIT_PRIVATE_KEY) throw new ApiError(503,'Image uploads are not configured.');
      const upload=new FormData();upload.set('file',new Blob([bytes],{type:file.type}),file.name);upload.set('fileName',`${randomUUID()}.${jpg?'jpg':png?'png':webp?'webp':'avif'}`);upload.set('folder','/yalla-market/products');
      const result=await fetch('https://upload.imagekit.io/api/v1/files/upload',{method:'POST',headers:{Authorization:`Basic ${Buffer.from(process.env.IMAGEKIT_PRIVATE_KEY+':').toString('base64')}`},body:upload,signal:AbortSignal.timeout(45000)});
      if(!result.ok) throw new ApiError(502,'Image upload failed. Please try again.');const image=await result.json();return json({url:image.url,fileId:image.fileId});
    }
  }
  throw new ApiError(404,'Not found.');
}
async function dispatch(req:NextRequest,context:{params:Promise<{path:string[]}>},method:string) {
  try {return await handle(req,method,(await context.params).path);} catch(error) {
    if(error instanceof z.ZodError) return json({error:error.issues.map(i=>i.message).join(' ')},400);
    if(error instanceof ApiError) return json({error:error.message},error.status);
    console.error('Store API request failed:', error instanceof Error ? error.name : 'UnknownError');
    return json({error:'The store is temporarily unavailable. Your information has not been lost; please try again.'},503);
  }
}
export const GET=(req:NextRequest,ctx:{params:Promise<{path:string[]}>})=>dispatch(req,ctx,'GET');
export const POST=(req:NextRequest,ctx:{params:Promise<{path:string[]}>})=>dispatch(req,ctx,'POST');
export const PATCH=(req:NextRequest,ctx:{params:Promise<{path:string[]}>})=>dispatch(req,ctx,'PATCH');
export const DELETE=(req:NextRequest,ctx:{params:Promise<{path:string[]}>})=>dispatch(req,ctx,'DELETE');
