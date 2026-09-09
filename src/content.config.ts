import { defineCollection } from 'astro:content';
import { docsSchema } from '@astrojs/starlight/schema';
import { docsLoaderWithTitleFromHeading } from './docsLoaderWithTitleFromHeading';
import { generateDocsId } from './i18n';

export const collections = {
	docs: defineCollection({
		loader: docsLoaderWithTitleFromHeading({ generateId: generateDocsId }),
		schema: docsSchema(),
	}),
};
