import Link from 'next/link';
export default function NotFound(){return <main className="container empty"><span className="eyebrow">404</span><h1>This find has moved.</h1><p>Try exploring the latest collection.</p><Link href="/shop" className="button">Back to the shop</Link></main>;}
