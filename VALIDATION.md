# Validation of the portfolio snapshot

Checked on Windows on 2026-10-01 using Node.js **26.7.0** and npm **11.19.0**. The project requires Node.js 22.13 or newer; CI installs the latest Node.js 22 release and has not been run remotely yet.

| Check | Result |
| --- | --- |
| `npm test` | Passed: 3 domain tests |
| `npm run check` | Passed: TypeScript, no emit |
| `npm run build` (`next build --webpack`) | Passed: Next.js 16.3.8 production compilation, type checking, page generation and build traces |
| Local production HTTP checks | Passed: 11 checks, without database/admin/ImageKit credentials |

The build script is now `next build --webpack`, so normal `npm run build` uses the verified compiler. The earlier default Turbopack attempt failed because the local validation environment reused dependencies through a junction that pointed outside the snapshot root. This was a dependency-layout limitation; webpack completed successfully.

Existing installed dependencies were reused read-only for local validation. The installed key versions matched the lockfile: Next.js 16.3.8, TypeScript 5.9.3, MongoDB 6.21.0 and React 19.3.0. A fresh `npm ci` was not performed locally. GitHub Actions is configured to perform a fresh install before tests, type checking and the webpack build.

The domain tests validate delivery charges at and around the strict $50 threshold, the 120 synthetic products' unique IDs/routes and complete color/gallery/local-asset mappings, and ImageKit endpoint restrictions against foreign accounts, lookalike hosts, insecure protocols, path traversal and URL credentials. The Node test runner emitted a module-type inference warning; all tests passed.

Local HTTP checks verified the home, shop, synthetic product, help, checkout and login pages, the anonymous session response, protected admin API access, the expected unconfigured-database response, cross-origin mutation rejection and an original SVG asset. Page HTML contained no original store owner contact details. The temporary local server was stopped after the checks.

These checks do not verify a live MongoDB checkout transaction, concurrent stock reservations, admin authentication with a real configured account, real ImageKit uploads, payment receipt handling, browser interaction/accessibility, external hosting or remote CI. Those require separate isolated backend and browser tests. No production database or live store deployment was used or changed.

Publication excludes environment/access files, signing keys, deployment state, build/dependency caches, customer/order data, operational reports, original product photographs/recolors and external catalog images. The source project had no local Git history to migrate. All original project files were preserved outside this snapshot. No project license was added.
