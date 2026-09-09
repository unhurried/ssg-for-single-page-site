import { readFile } from 'node:fs/promises';
import { docsLoader } from '@astrojs/starlight/loaders';
import type { Loader, LoaderContext } from 'astro/loaders';
import { extractTitleFromMarkdown } from './titleFromHeading';

type DocsLoaderOptions = Parameters<typeof docsLoader>[0];

/**
 * Wraps Starlight's docsLoader so a page title can come from the leading H1 of the body
 * instead of a `title` frontmatter field.
 *
 * docsSchema requires `title` in the frontmatter, and that validation (parseData) happens when
 * the file is read, before the Markdown is rendered. A remark plugin therefore cannot supply
 * the title; instead `parseData` itself is wrapped to fill in `data.title` before validation.
 *
 * For how the H1 is found, see src/titleFromHeading.ts.
 *
 * The H1 left in the body would be shown twice alongside the page heading, so it is removed
 * at render time by remarkStripLeadingHeading (see astro.config.mjs).
 */
export function docsLoaderWithTitleFromHeading(options?: DocsLoaderOptions): Loader {
	const loader = docsLoader(options);
	return {
		...loader,
		load: async (context: LoaderContext) => {
			const wrappedParseData: LoaderContext['parseData'] = async ({ id, data, filePath }) => {
				if (data.title === undefined && filePath !== undefined) {
					const title = extractTitleFromMarkdown(await readFile(filePath, 'utf-8'));
					if (title !== undefined) {
						data = { ...data, title };
					}
				}
				return context.parseData({ id, data, filePath });
			};
			return loader.load({ ...context, parseData: wrappedParseData });
		},
	};
}
