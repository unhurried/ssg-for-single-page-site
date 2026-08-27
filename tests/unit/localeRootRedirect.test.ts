import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { localeRootPath } from '../../src/localeRootRedirect.ts';

describe('localeRootPath', () => {
	it('puts the locale under the base', () => {
		assert.equal(localeRootPath('/starlight-demo/', 'ja'), '/starlight-demo/ja/');
	});

	it('works for a base without a trailing slash and for the root', () => {
		assert.equal(localeRootPath('/starlight-demo', 'ja'), '/starlight-demo/ja/');
		assert.equal(localeRootPath('/', 'ja'), '/ja/');
	});

	it('leaves a base containing non-ASCII characters as it is', () => {
		// Astro percent-encodes the destination when it puts it into the Location header,
		// so encoding it here would encode it twice ('%' itself would be escaped).
		assert.equal(localeRootPath('/日本語ディレクトリ/', 'ja'), '/日本語ディレクトリ/ja/');
	});
});
