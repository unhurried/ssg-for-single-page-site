// The rewrite that turns output built under the placeholder base into output for the base the
// site is deployed under (see src/portableBase.ts).
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { BUILD_BASE, rewriteBase, rewriteBaseInDir, urlBase } from '../../src/portableBase.ts';

describe('urlBase', () => {
	it('leaves a base that appears in URLs as it is written', () => {
		assert.equal(urlBase('/'), '/');
		assert.equal(urlBase('/starlight-demo/'), '/starlight-demo/');
		assert.equal(urlBase('/docs/v1.0/'), '/docs/v1.0/');
	});

	it('percent-encodes a base a browser would send encoded', () => {
		assert.equal(urlBase('/日本語/'), '/%E6%97%A5%E6%9C%AC%E8%AA%9E/');
		assert.equal(urlBase('/with space/'), '/with%20space/');
	});
});

describe('rewriteBase', () => {
	it('replaces every occurrence of the placeholder', () => {
		const page = `<a href="${BUILD_BASE}ja/"><img src="${BUILD_BASE}_astro/x.svg"></a>`;
		assert.equal(rewriteBase(page, '/docs/'), '<a href="/docs/ja/"><img src="/docs/_astro/x.svg"></a>');
	});

	it('writes the base percent-encoded, as URLs carry it', () => {
		assert.equal(rewriteBase(`${BUILD_BASE}ja/`, '/日本語/'), '/%E6%97%A5%E6%9C%AC%E8%AA%9E/ja/');
	});

	it('collapses to a single slash for a site at the root', () => {
		assert.equal(rewriteBase(`${BUILD_BASE}ja/`, '/'), '/ja/');
	});

	it('leaves everything else alone', () => {
		const text = 'a path like /__other__/ or the word base stays as it is';
		assert.equal(rewriteBase(text, '/docs/'), text);
	});
});

describe('rewriteBaseInDir', () => {
	/** Builds a directory of files, keyed by path relative to it. */
	async function dirWith(files: Record<string, string>): Promise<string> {
		const dir = await mkdtemp(path.join(tmpdir(), 'portable-base-'));
		for (const [relative, content] of Object.entries(files)) {
			const file = path.join(dir, relative);
			await mkdir(path.dirname(file), { recursive: true });
			await writeFile(file, content);
		}
		return dir;
	}

	it('rewrites every text file that carries the placeholder, at any depth', async () => {
		const dir = await dirWith({
			'index.html': `<a href="${BUILD_BASE}ja/">`,
			'ja/index.html': `<a href="${BUILD_BASE}ja/alpha/">`,
			'_astro/style.css': `url(${BUILD_BASE}_astro/font.woff2)`,
			'_astro/script.js': `const base="${BUILD_BASE}";`,
			'untouched.html': '<p>no base here</p>',
		});

		assert.equal(await rewriteBaseInDir(dir, '/日本語/'), 4);
		const encoded = '/%E6%97%A5%E6%9C%AC%E8%AA%9E/';
		assert.equal(await readFile(path.join(dir, 'ja/index.html'), 'utf-8'), `<a href="${encoded}ja/alpha/">`);
		assert.equal(await readFile(path.join(dir, '_astro/style.css'), 'utf-8'), `url(${encoded}_astro/font.woff2)`);
		assert.equal(await readFile(path.join(dir, 'untouched.html'), 'utf-8'), '<p>no base here</p>');
	});

	it('fails on a file type it does not rewrite, naming it', async () => {
		// Such a file would keep the placeholder and point at a path that does not exist.
		const dir = await dirWith({ 'pagefind/index.pf_fragment': `url:${BUILD_BASE}ja/` });
		await assert.rejects(rewriteBaseInDir(dir, '/docs/'), /index\.pf_fragment.*REWRITTEN_EXTENSIONS/s);
	});
});
