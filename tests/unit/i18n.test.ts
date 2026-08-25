import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
	defaultLocale,
	generateDocsId,
	indexTitles,
	locales,
	localeOfDocsId,
	starlightLocales,
} from '../../src/i18n.ts';

const repoRoot = new URL('../../', import.meta.url);

describe('generateDocsId', () => {
	it('gives a document in the default locale a slug with no locale prefix', () => {
		assert.equal(generateDocsId({ entry: 'a/ja/index.md' }), 'a');
	});

	it('moves the locale to the front of the slug for other locales', () => {
		assert.equal(generateDocsId({ entry: 'a/en/index.md' }), 'en/a');
	});

	it('returns "index" for a root index, which Starlight normalizes to an empty slug', () => {
		assert.equal(generateDocsId({ entry: 'ja/index.md' }), 'index');
		assert.equal(generateDocsId({ entry: 'en/index.md' }), 'en');
	});

	it('keeps a file name other than index at the end of the slug', () => {
		assert.equal(generateDocsId({ entry: 'a/ja/intro.md' }), 'a/intro');
		assert.equal(generateDocsId({ entry: 'a/en/intro.md' }), 'en/a/intro');
	});

	it('moves only the locale to the front even for nested document directories', () => {
		assert.equal(generateDocsId({ entry: 'x/y/ja/index.md' }), 'x/y');
		assert.equal(generateDocsId({ entry: 'x/y/en/index.md' }), 'en/x/y');
	});

	it('keeps the directories below the locale directory in the slug', () => {
		assert.equal(generateDocsId({ entry: 'a/ja/sub/page.md' }), 'a/sub/page');
		assert.equal(generateDocsId({ entry: 'a/ja/sub/index.md' }), 'a/sub');
	});

	it('strips the extension whatever it is', () => {
		for (const ext of ['md', 'mdx', 'markdown', 'mkd']) {
			assert.equal(generateDocsId({ entry: `a/ja/index.${ext}` }), 'a');
		}
	});

	it('throws an error explaining the cause for a path with no locale directory', () => {
		assert.throws(
			() => generateDocsId({ entry: 'a/index.md' }),
			(error: unknown) => {
				assert.ok(error instanceof Error);
				// Knowing which file is at fault is what matters when swapping in documents.
				assert.match(error.message, /a\/index\.md/);
				for (const locale of Object.keys(locales)) {
					assert.ok(error.message.includes(locale), `the error message should contain ${locale}`);
				}
				return true;
			}
		);
	});
});

describe('localeOfDocsId', () => {
	it('treats a slug without a locale prefix as the default locale', () => {
		assert.equal(localeOfDocsId('a'), 'ja');
		assert.equal(localeOfDocsId('x/y'), 'ja');
		assert.equal(localeOfDocsId('index'), 'ja');
	});

	it('takes the locale from a slug with a locale prefix', () => {
		assert.equal(localeOfDocsId('en/a'), 'en');
		assert.equal(localeOfDocsId('en'), 'en');
		assert.equal(localeOfDocsId('en/x/y'), 'en');
	});

	it('is the inverse of generateDocsId', () => {
		const entries = [
			'a/ja/index.md',
			'a/en/index.md',
			'x/y/ja/index.md',
			'x/y/en/index.md',
			'a/ja/intro.md',
			'a/en/intro.md',
			'ja/index.md',
			'en/index.md',
		];
		for (const entry of entries) {
			const expected = entry.split('/').find((segment) => segment in locales);
			assert.equal(localeOfDocsId(generateDocsId({ entry })), expected, entry);
		}
	});
});

// Pins down the places that are easy to forget to update when adding a locale.
describe('locale config consistency', () => {
	it('defaultLocale is a key of locales', () => {
		assert.ok(defaultLocale in locales);
	});

	it('starlightLocales maps the default locale to root and keeps the others under their key', () => {
		assert.deepEqual(starlightLocales.root, locales[defaultLocale]);
		const nonDefault = Object.keys(locales).filter((locale) => locale !== defaultLocale);
		assert.deepEqual(
			Object.keys(starlightLocales).sort(),
			['root', ...nonDefault].sort()
		);
		for (const locale of nonDefault) {
			assert.deepEqual(
				starlightLocales[locale as keyof typeof starlightLocales],
				locales[locale as keyof typeof locales]
			);
		}
	});

	it('indexTitles covers every locale', () => {
		assert.deepEqual(Object.keys(indexTitles).sort(), Object.keys(locales).sort());
		for (const [locale, title] of Object.entries(indexTitles)) {
			assert.ok(title.length > 0, `the top page title for ${locale} is empty`);
		}
	});

	it('every locale has a top page (src/pages/<locale>/index.astro)', () => {
		for (const locale of Object.keys(locales)) {
			const path =
				locale === defaultLocale ? 'src/pages/index.astro' : `src/pages/${locale}/index.astro`;
			assert.ok(
				existsSync(fileURLToPath(new URL(path, repoRoot))),
				`${path} is missing (add a top page when adding a locale)`
			);
		}
	});
});
