import {MongoClient} from 'mongodb';
import {readFileSync} from 'node:fs';
const products=JSON.parse(readFileSync(new URL('../lib/catalog.seed.json',import.meta.url),'utf8'));
if(products.length<100) throw new Error('Catalog not ready: at least 100 products required.');
const client=new MongoClient(process.env.MONGODB_URI,{serverSelectionTimeoutMS:15000});
try {
 await client.connect();const db=client.db(process.env.MONGODB_DB||'yalla_market');
 await Promise.all([
  db.collection('products').createIndex({id:1},{unique:true}),
  db.collection('products').createIndex({slug:1},{unique:true}),
  db.collection('orders').createIndex({idempotencyKey:1},{unique:true}),
  db.collection('orders').createIndex({reference:1},{unique:true}),
  db.collection('limits').createIndex({expires:1},{expireAfterSeconds:0})
 ]);
 const result=await db.collection('products').bulkWrite(products.map(p=>({updateOne:{filter:{id:p.id},update:{$setOnInsert:p},upsert:true}})));
 console.log(JSON.stringify({inserted:result.upsertedCount,total:await db.collection('products').countDocuments(),sampleProducts:await db.collection('products').countDocuments({sample:true})}));
} catch(error){console.error('Database seed failed:',error.name, error.code || 'connection unavailable');process.exitCode=1;} finally{await client.close();}
