# Tool initial HTML build

The existing tools registry remains the source for tool HTML. When tool content changes or a tool is added, regenerate initial HTML rather than editing a stale snapshot.

Install a compatible puppeteer-core in your build environment (the build was tested with Google Chrome and puppeteer-core). Run from repository root:

    node scripts/generate-tool-html.cjs deploy-primary tool-prerender.json

Set CHROME_PATH if Chrome is elsewhere. The script serves source locally, loads the actual tools.js/tools-extra.js/unified.js and writes all current registry tools' initial HTML. It does not call tool init or upload media. Keep tool-prerender.json at repo root for server.js, outside public/. Regenerate per-route deploy-primary HTML from this map using apply-tool-html.py.

    python3 scripts/apply-tool-html.py deploy-primary tool-prerender.json

Host differences: public/index.html and server.js remain the Vercel host. deploy-primary is Cloudflare Pages ONLY, with its own canonical/verification metadata. Never copy one host's head wholesale onto the other.

After any change: verify every tool route raw title/canonical, JS-on/off first view, mobile/desktop width, back/navigation, and actual affected tool output. Check no duplicate IDs and no init errors. Homepage design, source metadata and existing assets must be preserved. Do not change the frozen own-device package or trial.

Deployment: existing Vercel integration follows main branch. deploy-primary can be zipped with files at archive root and uploaded atomically through existing Cloudflare Pages direct upload UI to shaher-tech. Current Pages initial-HTML candidate is NOT yet deployed, blocked by dashboard loading on Oct28 13:07 Cairo. Do not infer a successful Pages deployment from the Git commit. No Cloudflare API token is included.
