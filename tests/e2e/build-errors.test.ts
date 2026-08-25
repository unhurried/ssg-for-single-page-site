// Checks that a misplaced document stops the build with an error that names the cause.
// These two are what someone swapping in documents hits first.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildFixtureSite } from './buildFixtureSite.ts';

describe('building misplaced documents', () => {
	it('stops with an error naming the offending file when the locale directory is missing', async () => {
		const result = await buildFixtureSite({
			docsFixture: 'fixtures/docs-invalid-no-locale',
			name: 'error-no-locale',
			base: '/test-base/',
		});
		assert.equal(result.ok, false, 'the build unexpectedly succeeded');
		assert.match(result.output, /言語ディレクトリ/);
		assert.match(result.output, /solo\/index\.md/);
	});

	it('stops with a missing-title error when there is neither an H1 nor a frontmatter title', async () => {
		const result = await buildFixtureSite({
			docsFixture: 'fixtures/docs-invalid-no-title',
			name: 'error-no-title',
			base: '/test-base/',
		});
		assert.equal(result.ok, false, 'the build unexpectedly succeeded');
		assert.match(result.output, /InvalidContentEntryDataError/);
		assert.match(result.output, /title: Required/);
		assert.match(result.output, /solo\/ja\/index\.md/);
	});
});
