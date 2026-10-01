'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="container empty"><h1>We hit a little snag.</h1><p>Please try loading the page again.</p><button className="button" onClick={reset}>Try again</button></main>;}
