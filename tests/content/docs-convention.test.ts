// Checks that the documents actually placed in src/content/docs/ meet the assumptions of this
// tool. Meant to be usable as-is as an intake check after swapping in your own documents.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { generateDocsId, localeOfDocsId } from '../../src/i18n.ts';
import { extractTitleFromMarkdown } from '../../src/titleFromHeading.ts';

const docsDir = fileURLToPath(new URL('../../src/content/docs/', import.meta.url));

// Matches the extensions docsLoader (@astrojs/starlight/loaders) reads, and its rule of
// ignoring names starting with `_`.
const DOC_EXTENSIONS = ['.markdown', '.mdown', '.mkdn', '.mkd', '.mdwn', '.md', '.mdx'];

/** Lists the files the loader reads, as paths relative to the docs directory. */
async function listDocFiles(dir: string, prefix = ''): Promise<string[]> {
	const found: string[] = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		if (entry.name.startsWith('_')) continue;
		const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
		if (entry.isDirectory()) {
			found.push(...(await listDocFiles(path.join(dir, entry.name), relative)));
		} else if (DOC_EXTENSIONS.includes(path.extname(entry.name))) {
			found.push(relative);
		}
	}
	return found.sort();
}

const docFiles = await listDocFiles(docsDir);

/** Collects relative image references from a body (both Markdown syntax and raw HTML <img>). */
function collectRelativeImagePaths(markdown: string): string[] {
	const urls = [
		...[...markdown.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)].map((match) => match[1]),
		...[...markdown.matchAll(/<img\s[^>]*?src\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+?))[\s>/]/gi)].map(
			(match) => match[1] ?? match[2] ?? match[3]
		),
	];
	return urls.filter(
		(url): url is string => url !== undefined && !/^(?:[a-z]+:|\/|#)/i.test(url)
	);
}

describe('document conventions in src/content/docs', () => {
	it('has at least one document', () => {
		assert.ok(docFiles.length > 0, `no document in ${docsDir}`);
	});

	it('every file follows the <document>/<locale>/... layout', () => {
		for (const file of docFiles) {
			assert.doesNotThrow(
				() => generateDocsId({ entry: file }),
				`${file} cannot be converted into a slug`
			);
		}
	});

	it('slugs do not collide, since a collision would drop a page', () => {
		const seen = new Map<string, string>();
		for (const file of docFiles) {
			const id = generateDocsId({ entry: file });
			const previous = seen.get(id);
			assert.equal(previous, undefined, `slug "${id}" is used by both ${previous} and ${file}`);
			seen.set(id, file);
		}
	});

	it('every file has a leading H1 (= the page title)', () => {
		for (const file of docFiles) {
			const markdown = readFileSync(path.join(docsDir, file), 'utf-8');
			// A title in the frontmatter takes precedence, so an H1 is not required then.
			if (/^---\r?\n[\s\S]*?^title:/m.test(markdown)) continue;
			const title = extractTitleFromMarkdown(markdown);
			assert.ok(
				title,
				`${file} has neither an H1 (# heading) nor a frontmatter title, so no title can be determined`
			);
		}
	});

	it('every relative image referenced in a body exists', () => {
		for (const file of docFiles) {
			const markdown = readFileSync(path.join(docsDir, file), 'utf-8');
			for (const url of collectRelativeImagePaths(markdown)) {
				const target = path.resolve(path.dirname(path.join(docsDir, file)), url);
				assert.ok(existsSync(target), `an image referenced by ${file} is missing: ${url}`);
			}
		}
	});

	it('the locale of every document is one of the supported locales (src/i18n.ts)', () => {
		for (const file of docFiles) {
			const id = generateDocsId({ entry: file });
			const locale = localeOfDocsId(id);
			assert.ok(
				file.split('/').includes(locale),
				`the locale directory of ${file} disagrees with locale "${locale}" derived from slug "${id}"`
			);
		}
	});
});
