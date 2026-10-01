import {readFileSync,writeFileSync} from 'node:fs';
import {randomBytes,scryptSync} from 'node:crypto';
const path=new URL('../.env.local',import.meta.url);let env=readFileSync(path,'utf8');const password=randomBytes(18).toString('base64url');const salt=randomBytes(16).toString('hex');const hash=salt+':'+scryptSync(password,salt,64).toString('hex');
env=env.replace(/^ADMIN_PASSWORD_HASH=.*$/m,'ADMIN_PASSWORD_HASH='+hash);
if(!/^SESSION_SECRET=.{48,}$/m.test(env)) env=env.replace(/^SESSION_SECRET=.*$/m,'SESSION_SECRET='+randomBytes(48).toString('hex'));
writeFileSync(path,env);
const email=env.match(/^ADMIN_EMAIL=(.*)$/m)?.[1]||'admin@example.invalid';writeFileSync(new URL('../admin-access.txt',import.meta.url),`Yalla Market admin access\nEmail: ${email}\nPassword: ${password}\nLogin: /login\nKeep this file private. Restart the app after resetting the password.\n`);
console.log('New password saved in admin-access.txt. Previous sessions are revoked after the server restarts.');
