// Takes screenshots of the built site so a dependency update can be checked visually, before and
// after. Serve the build first (`npm run preview`), then:
//   node .claude/skills/update-deps/screenshots.cjs <site-url> <out-dir>
// e.g. node .claude/skills/update-deps/screenshots.cjs http://localhost:4321/starlight-demo/ /tmp/shots-before
// CommonJS on purpose: a globally installed Playwright resolves through NODE_PATH, which ESM ignores.
const { mkdirSync } = require('node:fs');
const path = require('node:path');

let chromium;
try {
	({ chromium } = require('playwright'));
} catch {
	console.error('playwright is not available here: skip the visual check and say so in the PR.');
	process.exit(2);
}

const [siteUrl, outDir] = process.argv.slice(2);
if (!siteUrl || !outDir) {
	console.error('usage: node screenshots.cjs <site-url> <out-dir>');
	process.exit(1);
}

// The top page of each locale and one document, at a desktop and a phone width.
const PAGES = ['ja/', 'en/', 'ja/a/'];
const VIEWPORTS = { desktop: { width: 1280, height: 900 }, mobile: { width: 390, height: 844 } };

(async () => {
	mkdirSync(outDir, { recursive: true });
	const browser = await chromium.launch();
	try {
		for (const [name, viewport] of Object.entries(VIEWPORTS)) {
			const page = await browser.newPage({ viewport });
			for (const pagePath of PAGES) {
				const url = new URL(pagePath, siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`).href;
				const response = await page.goto(url, { waitUntil: 'networkidle' });
				if (!response || !response.ok()) throw new Error(`${url} returned ${response?.status()}`);
				const file = path.join(outDir, `${pagePath.replace(/\/$/, '').replaceAll('/', '_')}-${name}.png`);
				await page.screenshot({ path: file, fullPage: true });
				console.log(file);
			}
			await page.close();
		}
	} finally {
		await browser.close();
	}
})().catch((error) => {
	console.error(error);
	process.exit(1);
});
