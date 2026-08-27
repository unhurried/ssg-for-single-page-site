// Verifies with a real `astro build` that swapping in different documents does not break.
// The fixtures (tests/fixtures/docs) are independent of the demo documents and are written to
// exercise every transformation specific to this project (H1 titles, de-duplicated headings,
// raw HTML images, math, per-locale document list).
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { before, describe, it } from 'node:test';
import { buildFixtureSiteOrThrow, listFiles } from './buildFixtureSite.ts';
import { BUILD_BASE } from '../../src/portableBase.ts';

// Deliberately different from the production config ('/starlight-demo/' in astro.config.mjs),
// which at the same time proves base is not hardcoded anywhere.
const BASE = '/test-base/';

let distDir: string;
let distFiles: string[];

before(async () => {
	const result = await buildFixtureSiteOrThrow({
		docsFixture: 'fixtures/docs',
		name: 'build',
		base: BASE,
	});
	distDir = result.distDir;
	distFiles = await listFiles(distDir);
});

function html(relativePath: string): string {
	const file = path.join(distDir, relativePath);
	assert.ok(existsSync(file), `${relativePath} was not generated`);
	return readFileSync(file, 'utf-8');
}

/** Extracts elements regardless of attribute order. */
function matchAll(source: string, pattern: RegExp): string[] {
	return [...source.matchAll(pattern)].map((match) => match[0]);
}

describe('routing (the generateDocsId result becomes the URL)', () => {
	it('generates HTML for every document', () => {
		for (const page of [
			'ja/index.html', // Japanese top page
			'en/index.html', // English top page
			'ja/alpha/index.html',
			'ja/beta/index.html',
			'ja/gamma/guide/index.html', // document whose file name is not index
			'en/alpha/index.html',
			'en/beta/index.html',
		]) {
			assert.ok(distFiles.includes(page), `${page} was not generated`);
		}
	});

	it('every URL carries a locale prefix, the default locale included', () => {
		const pages = distFiles.filter(
			(file) => file.endsWith('.html') && !['index.html', '404.html'].includes(file)
		);
		const unprefixed = pages.filter((file) => !/^(?:ja|en)\//.test(file));
		assert.deepEqual(unprefixed, [], `pages outside a locale directory: ${unprefixed.join(', ')}`);
	});

	it('the site root redirects to the top page of the default locale', () => {
		// The root itself holds no page (no root locale), so it is a redirect page: a static build
		// has no other way to send a visitor of `base` to a locale.
		const page = html('index.html');
		assert.match(page, new RegExp(`<meta http-equiv="refresh" content="0;url=${BASE}ja/">`));
		assert.match(page, new RegExp(`<link rel="canonical" href="${BASE}ja/">`));
	});

	it('a document without a translation falls back to the default locale on another locale URL', () => {
		// Starlight's standard i18n fallback. The URL itself is generated.
		const page = html('en/gamma/guide/index.html');
		assert.match(page, /<html[^>]*lang="en"/);
		assert.match(page, /ガンマ文書のガイド/);
	});
});

describe('page title (taken from the leading H1 of the body)', () => {
	it('the <title>, the header, and the body h1 all use the H1 text', () => {
		const page = html('ja/alpha/index.html');
		assert.match(page, /<title>アルファ文書のタイトル \| /);
		assert.match(page, /<a href="#"[^>]*class="page-title[^"]*"[^>]*>アルファ文書のタイトル<\/a>/);
		assert.match(page, /<h1 id="_top"[^>]*>アルファ文書のタイトル<\/h1>/);
	});

	it('the English version takes its own H1 as the title', () => {
		const page = html('en/alpha/index.html');
		assert.match(page, /<title>Alpha Document Title \| /);
		assert.match(page, /<h1 id="_top"[^>]*>Alpha Document Title<\/h1>/);
	});

	it('the H1 used as the title is removed from the body, leaving no duplicate h1', () => {
		for (const page of ['ja/alpha/index.html', 'en/alpha/index.html', 'ja/beta/index.html']) {
			assert.equal(matchAll(html(page), /<h1[\s>]/g).length, 1, `${page} does not have exactly one h1`);
		}
	});

	it('body headings (h2/h3) are left as they are', () => {
		const page = html('ja/alpha/index.html');
		assert.match(page, /<h2[^>]*>[\s\S]*?画像/);
		assert.match(page, /<h3[^>]*>[\s\S]*?入れ子の見出し/);
	});

	it('does not mistake a `#` line in a leading code fence for the title', () => {
		const page = html('ja/beta/index.html');
		assert.match(page, /<title>ベータ文書のタイトル \| /);
		assert.doesNotMatch(page, /<title>[^<]*コメントであってページタイトルではない/);
	});

	it('stripping code fences to find the title does not affect the code blocks in the body', () => {
		const page = html('ja/beta/index.html');
		assert.match(page, /この行はコメントであってページタイトルではない/);
		assert.match(page, /usr\/bin\/env python3/);
	});
});

describe('line breaks (remarkBreaks)', () => {
	it('a plain line break in a paragraph becomes <br>', () => {
		assert.match(
			html('ja/alpha/index.html'),
			/Markdown標準では詰められてしまう単なる改行も、<br>\s*そのまま改行として表示される。/
		);
	});

	it('a line break inside a code block does not become <br>', () => {
		const code = /<pre[^>]*>[\s\S]*?<\/pre>/.exec(html('ja/beta/index.html'))?.[0];
		assert.ok(code, 'no code block was generated');
		assert.doesNotMatch(code, /<br\s*\/?>/, '<br> found inside a code block');
		assert.match(code, /print/);
	});
});

describe('images (on the Astro image pipeline)', () => {
	it('both Markdown syntax and a raw HTML <img> point at a hashed output file', () => {
		const images = matchAll(html('ja/alpha/index.html'), /<img[^>]*>/g);
		assert.equal(images.length, 2, 'expected two images, one from Markdown syntax and one from raw HTML');
		for (const image of images) {
			const src = /src="([^"]+)"/.exec(image)?.[1];
			assert.ok(src, `no src: ${image}`);
			assert.ok(src.startsWith(`${BASE}_astro/`), `not on the image pipeline: ${src}`);
			assert.ok(
				existsSync(path.join(distDir, src.slice(BASE.length))),
				`the referenced file is missing: ${src}`
			);
		}
	});

	it('the width attribute and the alt written on a raw HTML <img> are carried over', () => {
		const images = matchAll(html('ja/alpha/index.html'), /<img[^>]*>/g);
		const fromHtmlTag = images.find((image) => image.includes('width="160"'));
		assert.ok(fromHtmlTag, `no image with width="160":\n${images.join('\n')}`);
		assert.match(fromHtmlTag, /alt="四角形の図（幅160px）"/);
		const fromMarkdown = images.find((image) => image.includes('alt="四角形の図"'));
		assert.ok(fromMarkdown, 'the image from Markdown syntax was not found');
	});
});

describe('math (remark-math + rehype-katex)', () => {
	it('inline and block math are rendered by KaTeX', () => {
		const page = html('ja/alpha/index.html');
		assert.ok(matchAll(page, /class="katex/g).length > 0, 'no KaTeX output');
		assert.doesNotMatch(page, /\$\$/, 'a raw $$ is left in the body');
		assert.doesNotMatch(page, /\$E = mc\^2\$/, 'raw inline math is left in the body');
	});
});

describe('per-locale document list (top page)', () => {
	function listItems(page: string): Array<{ href: string; text: string }> {
		const list = /<ul>([\s\S]*?)<\/ul>/.exec(page)?.[1];
		assert.ok(list, 'no <ul> for the document list');
		return [...list.matchAll(/<a href="([^"]+)">([^<]*)<\/a>/g)].map((match) => ({
			href: match[1] as string,
			text: match[2] as string,
		}));
	}

	it('the top page of the default locale lists its documents in slug order', () => {
		assert.deepEqual(listItems(html('ja/index.html')), [
			{ href: `${BASE}ja/alpha/`, text: 'アルファ文書のタイトル' },
			{ href: `${BASE}ja/beta/`, text: 'ベータ文書のタイトル' },
			{ href: `${BASE}ja/gamma/guide/`, text: 'ガンマ文書のガイド' },
		]);
	});

	it('the English top page lists only the documents that have an English version', () => {
		// gamma has no English version, so it is not listed (its URL exists through the fallback).
		assert.deepEqual(listItems(html('en/index.html')), [
			{ href: `${BASE}en/alpha/`, text: 'Alpha Document Title' },
			{ href: `${BASE}en/beta/`, text: 'Beta Document Title' },
		]);
	});

	it('the top page title comes from indexTitles per locale', () => {
		assert.match(html('ja/index.html'), /<title>ドキュメント一覧 \| /);
		assert.match(html('en/index.html'), /<title>Document List \| /);
	});
});

describe('i18n', () => {
	it('the lang attribute of a page switches per locale', () => {
		assert.match(html('ja/alpha/index.html'), /<html[^>]*lang="ja"/);
		assert.match(html('en/alpha/index.html'), /<html[^>]*lang="en"/);
	});

	it('the locale switcher UI is generated', () => {
		assert.match(html('ja/alpha/index.html'), /<starlight-lang-select/);
	});
});

describe('layout (the left sidebar holds the TOC)', () => {
	it('the left sidebar shows a TOC linking to the body headings', () => {
		const page = html('ja/alpha/index.html');
		assert.match(page, /<page-toc/);
		for (const anchor of ['#画像', '#数式', '#表', '#入れ子の見出し', '#コード']) {
			assert.ok(page.includes(`href="${anchor}"`), `${anchor} is missing from the TOC`);
		}
	});

	it('the sidebar shows no page list (links to other documents)', () => {
		const links = matchAll(html('ja/alpha/index.html'), new RegExp(`href="${BASE}[^"]*"`, 'g'));
		const docLinks = links.filter((link) => !/_astro\/|favicon/.test(link));
		assert.deepEqual(docLinks, [], `page list links are present: ${docLinks.join(', ')}`);
	});
});

describe('deployment base', () => {
	it('nothing in the output is left under the placeholder base the site is built with', () => {
		// src/portableBase.ts replaces it with `base` everywhere; a leftover would be a dead link.
		const left = distFiles.filter((file) =>
			readFileSync(path.join(distDir, file)).includes(BUILD_BASE)
		);
		assert.deepEqual(left, [], `files still carrying ${BUILD_BASE}: ${left.join(', ')}`);
	});
});

describe('search (Pagefind)', () => {
	it('the search index is generated', () => {
		assert.ok(distFiles.includes('pagefind/pagefind.js'), 'pagefind/pagefind.js is missing');
		assert.ok(
			distFiles.some((file) => file.startsWith('pagefind/fragment/')),
			'no Pagefind index fragment'
		);
	});
});
