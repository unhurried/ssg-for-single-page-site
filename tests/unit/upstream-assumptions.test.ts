// Tests that make it noticeable when an assumption breaks in the places where this project
// leans on Starlight / starlight-theme-nova internals.
//
// A customization that cannot be done through a public API has to depend on files outside the
// package exports, or on properties that are private as far as the types go. Such a dependency
// breaks silently on an upgrade (the build passes, only the rendering is off), so the sources
// depended on are read directly to check the assumption still holds.
//
// A failure here is not a bug but a sign that upstream changed and needs following up:
// fix the depending file named in each test's comment.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const modules = new URL('../../node_modules/', import.meta.url);

/** Reads a file in node_modules. A missing file counts as a broken assumption too. */
function readUpstream(relativePath: string): string {
	const path = fileURLToPath(new URL(relativePath, modules));
	try {
		return readFileSync(path, 'utf-8');
	} catch {
		assert.fail(`upstream file not found (moved or deleted): ${relativePath}`);
	}
}

describe('@astrojs/starlight assumptions', () => {
	// Depended on by: src/styles/page-title.css (hides h1#_top and collapses its parent panel).
	// The constants module is not in the exports and cannot be imported, so the value is inlined.
	it('the id of the page title h1 is still "_top"', () => {
		assert.match(readUpstream('@astrojs/starlight/constants.ts'), /PAGE_TITLE_ID = '_top'/);
	});

	// Depended on by: the .content-panel:has(> .sl-container > h1#_top) selector in src/styles/page-title.css
	it('ContentPanel still nests .content-panel > .sl-container', () => {
		const source = readUpstream('@astrojs/starlight/components/ContentPanel.astro');
		assert.match(source, /class="content-panel"[\s\S]*class="sl-container"/);
	});

	// Depended on by: src/styles/page-title.css, which uses :only-child to drop the padding and
	// separator of the panel, assuming PageTitle sits alone in one ContentPanel.
	it('PageTitle sits in a ContentPanel of its own', () => {
		const source = readUpstream('@astrojs/starlight/components/Page.astro');
		assert.match(source, /<ContentPanel>\s*<PageTitle \/>/);
	});
});

describe('starlight-theme-nova assumptions', () => {
	// Depended on by: components.SiteTitle in astro.config.mjs / src/components/SiteTitle.astro.
	// The header itself is left to the theme; only the SiteTitle it renders is replaced.
	it('the theme header renders SiteTitle', () => {
		const source = readUpstream('starlight-theme-nova/src/components/Header.astro');
		assert.match(source, /from 'virtual:starlight\/components\/SiteTitle'/);
		assert.match(source, /<SiteTitle \/>/);
	});

	// Depended on by: components in astro.config.mjs.
	// The theme merges the user components after its own, so ours wins. In the opposite order the
	// theme's SiteTitle would be used and the site name would show up in the header.
	it('the theme gives user components precedence over its own', () => {
		const source = readUpstream('starlight-theme-nova/src/index.ts');
		assert.match(source, /\.\.\.components,\s*\.\.\.config\.components,/);
	});
});
