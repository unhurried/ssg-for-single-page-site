// The predicate that decides when `astro dev` has to fall back to the root (see
// src/asciiDevBase.ts): a base is unusable there as soon as URLs encode it.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isEncodedInUrl } from '../../src/asciiDevBase.ts';

describe('isEncodedInUrl', () => {
	it('is false for a base that appears in URLs as it is written', () => {
		assert.equal(isEncodedInUrl('/'), false);
		assert.equal(isEncodedInUrl('/starlight-demo/'), false);
		assert.equal(isEncodedInUrl('/docs/v1.0/'), false);
	});

	it('is true for a base URLs percent-encode', () => {
		assert.equal(isEncodedInUrl('/日本語ディレクトリ/'), true);
		assert.equal(isEncodedInUrl('/with space/'), true);
	});
});
