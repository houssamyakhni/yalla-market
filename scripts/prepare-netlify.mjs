import { cp, lstat, readdir, realpath, rename, unlink, access } from 'node:fs/promises';
import { resolve, relative, join, sep, isAbsolute } from 'node:path';

// Turbopack makes Windows junctions for external packages. The Netlify adapter
// copies them as symlinks, which requires Windows privileges. Materialize only
// these generated build links so the deployment contains ordinary directories.
const app = process.cwd();
const build = resolve(app, '.next');
const dependencies = resolve(app, 'node_modules');
let copied = 0;
const inside = (root, path) => { const rel = relative(root, path); return rel === '' || (!rel.startsWith('..' + sep) && rel !== '..' && !isAbsolute(rel)); };
async function walk(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (!inside(build, path)) throw new Error('Build path escaped its output directory.');
    const info = await lstat(path);
    if (info.isSymbolicLink()) {
      const target = await realpath(path);
      if (!inside(dependencies, target) && !inside(build, target)) throw new Error('Unexpected external build link.');
      const temporary = path + '.portable-copy';
      try { await access(temporary); throw new Error('Temporary build copy already exists.'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      await cp(target, temporary, { recursive: true, dereference: true, force: false, errorOnExist: true });
      await unlink(path); // Remove the generated link only, never its target.
      await rename(temporary, path);
      copied++;
    } else if (info.isDirectory()) await walk(path);
  }
}
if (process.platform === 'win32') {
  for (const folder of [join(build, 'node_modules'), join(build, 'standalone')]) {
    try { await access(folder); } catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    await walk(folder);
  }
}
console.log(JSON.stringify({ portableNetlifyBuild: true, materializedBuildLinks: copied }));
