// @ts-check
import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import starlight from '@astrojs/starlight';
import starlightThemeNova from 'starlight-theme-nova';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { asciiDevBase } from './src/asciiDevBase.ts';
import { starlightEncodedBase } from './src/starlightEncodedBase.ts';
import { defaultLocale, starlightLocales } from './src/i18n.ts';
import { localeRootRedirect } from './src/localeRootRedirect.ts';
import { remarkBreaks } from './src/remarkBreaks.ts';
import { remarkHtmlImage } from './src/remarkHtmlImage.ts';
import { remarkStripLeadingHeading } from './src/remarkStripLeadingHeading.ts';

// Subdirectory of the web server the site is deployed under.
// e.g. keep '/starlight-demo/' for https://example.com/starlight-demo/, or use '/' for the root.
const base = '/starlight-demo/';

// https://astro.build/config
export default defineConfig({
	base,
	server: {
		// Listen on 0.0.0.0: the default (localhost only) is unreachable through port
		// forwarding from the host OS of the devcontainer.
		host: true,
	},
	image: {
		// Emit image files as-is instead of optimizing them (sharp), so the build also
		// works with `ignore-scripts=true` in .npmrc.
		// A custom service rather than passthroughImageService(): see src/imageService.ts,
		// which is also what makes a `base` with non-ASCII characters build.
		service: { entrypoint: './src/imageService.ts', config: {} },
	},
	markdown: {
		// Astro 7 defaults to the satteri Markdown processor, but rehype-katex (used to render
		// math) is a rehype (unified) plugin, incompatible with satteri's plugin format.
		// So the remark/rehype based unified processor is selected explicitly.
		processor: unified({
			// remarkBreaks: output a line break inside a paragraph as <br> (Markdown collapses it
			// into a space, but these documents expect the lines they were written as).
			// remarkHtmlImage: turn an <img> tag written as raw HTML in Markdown into the same mdast
			// node as ![](), putting it on Astro's image pipeline (relative paths, hashed filenames).
			// remarkStripLeadingHeading: the leading H1 is used as the page title, so remove it from
			// the rendered output (see src/docsLoaderWithTitleFromHeading.ts).
			remarkPlugins: [remarkMath, remarkBreaks, remarkHtmlImage, remarkStripLeadingHeading],
			rehypePlugins: [rehypeKatex],
		}),
	},
	integrations: [
		// `astro dev` cannot serve a base that URLs percent-encode (e.g. one with Japanese
		// characters), so it falls back to the root there. Does nothing for an ASCII base.
		asciiDevBase(),
		// Such a base also has to be percent-encoded where Starlight strips it off the current
		// path (the language switcher, the locale of a <StarlightPage>). Does nothing otherwise.
		// Must come after asciiDevBase(), which drops the base for `astro dev`.
		starlightEncodedBase(),
		// No locale lives at the site root, so `base` itself redirects to the default locale.
		// Must come after asciiDevBase() as well: the destination carries the base in effect.
		localeRootRedirect(defaultLocale),
		starlight({
			plugins: [starlightThemeNova()],
			title: {
				ja: 'Starlight デモサイト',
				en: 'Starlight Demo Site',
			},
			// Every locale under a prefix of its own: Japanese under /ja/, English under /en/.
			// The mapping to slugs (URL paths) is done by generateDocsId in src/i18n.ts; the site
			// root holds no page and is redirected by localeRootRedirect() above.
			locales: starlightLocales,
			// Used for the fallback of a page that has no translation in the locale being viewed.
			defaultLocale,
			// No page list (site navigation). The left sidebar area is still rendered for an
			// empty array, which leaves room for the table of contents.
			sidebar: [],
			components: {
				// Show the current page's table of contents in the left sidebar instead of a page list.
				Sidebar: './src/components/Sidebar.astro',
				// Drop the right column entirely for a two-pane layout: body + left TOC.
				TwoColumnContent: './src/components/TwoColumnContent.astro',
				// Show the current page name where the site title normally goes.
				// (The header itself is the theme's. The theme plugin merges user-specified
				//  components after its own, so this one wins.)
				SiteTitle: './src/components/SiteTitle.astro',
			},
			// Visual tweaks are done in CSS rather than by overriding components, including
			// visually hiding the in-body page title (page-title.css).
			customCss: [
				'./src/styles/katex.css',
				'./src/styles/page-title.css',
				'./src/styles/toc.css',
				'./src/styles/table.css',
			],
		}),
	],
});
