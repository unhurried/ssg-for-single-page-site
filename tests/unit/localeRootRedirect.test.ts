import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { localeRootPath } from '../../src/localeRootRedirect.ts';
import { BUILD_BASE } from '../../src/portableBase.ts';

describe('localeRootPath', () => {
	it('puts the locale under the base', () => {
		assert.equal(localeRootPath('/starlight-demo/', 'ja'), '/starlight-demo/ja/');
	});

	it('works for a base without a trailing slash and for the root', () => {
		assert.equal(localeRootPath('/starlight-demo', 'ja'), '/starlight-demo/ja/');
		assert.equal(localeRootPath('/', 'ja'), '/ja/');
	});

	it('puts the locale under the base the site is built with', () => {
		// What the integration actually passes: the real base is written into the output later,
		// by src/portableBase.ts.
		assert.equal(localeRootPath(BUILD_BASE, 'ja'), `${BUILD_BASE}ja/`);
	});
});
