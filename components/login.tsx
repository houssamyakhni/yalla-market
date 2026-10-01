'use client';
import {useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import {LockKeyhole} from 'lucide-react';
export function Login(){const router=useRouter();const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setError('');try{const response=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})});const data=await response.json();if(!response.ok)throw new Error(data.error);router.replace('/admin');router.refresh();}catch(err){setError(err instanceof Error?err.message:'Could not sign in.');}finally{setBusy(false);}}
 return <main className="form-page"><span className="eyebrow"><LockKeyhole size={25}/></span><h1>Welcome back.</h1><p>Sign in to manage products, stock, and orders.</p><form onSubmit={submit}>{error&&<div className="error-message" role="alert">{error}</div>}<label className="field">Email<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="field">Password<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="button full" disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form><p className="muted" style={{marginTop:22}}>Shopping? You can check out as a guest.</p><Link className="text-button" href="/shop">Back to the shop</Link></main>;
}
