// Lets Starlight resolve paths when `base` contains non-ASCII characters.
//
// Two Starlight helpers take `base` off the front of the current path, comparing it against
// `import.meta.env.BASE_URL` (the base exactly as written in the config) while the path itself
// comes from a URL object and is therefore percent-encoded. For a base such as
// '/日本語ディレクトリ/' the two never match, and each helper then goes wrong in its own way:
//
//   utils/localizedUrl.ts  the language switcher builds '/en/<base>/…' (the locale in front of
//                          the base) instead of '/<base>/en/…', so switching language 404s.
//   utils/slugs.ts         urlToSlug() leaves the base in the slug, so <StarlightPage> (used by
//                          src/components/DocumentIndex.astro) does not recognise the locale of
//                          the page: the English top page is rendered as Japanese.
//
// Both read the base through the same expression, so a Vite plugin rewrites that expression to
// the percent-encoded form the paths it is compared against are in. Only the reading of `base`
// changes; everything the helpers do with it stays Starlight's own logic.
//
// The patch is applied only for a base that needs it, so an ASCII base builds exactly as it does
// without this integration. If Starlight stops reading the base this way, the build fails with a
// message naming the file to fix (tests/unit/upstream-assumptions.test.ts warns about it earlier).
import type { AstroIntegration } from 'astro';
import { isEncodedInUrl } from './asciiDevBase.ts';

/** Starlight modules that strip `base` off a percent-encoded path, as paths under node_modules. */
export const PATCHED_MODULES = [
	'@astrojs/starlight/utils/localizedUrl.ts',
	'@astrojs/starlight/utils/slugs.ts',
];

/** The expression they read the base with, and what it is replaced by. */
const BASE_EXPRESSION = 'stripTrailingSlash(import.meta.env.BASE_URL)';
const ENCODED_BASE_EXPRESSION = 'stripTrailingSlash(encodeURI(import.meta.env.BASE_URL))';

/** Rewrites the base of one upstream module to its encoded form. */
export function patchBaseExpression(code: string, modulePath: string): string {
	if (!code.includes(BASE_EXPRESSION)) {
		throw new Error(
			`${modulePath} no longer reads the base as \`${BASE_EXPRESSION}\`. Starlight changed how ` +
				'it strips `base` off a path, so src/starlightEncodedBase.ts has to be updated before a ' +
				'base containing non-ASCII characters can be used.'
		);
	}
	return code.replaceAll(BASE_EXPRESSION, ENCODED_BASE_EXPRESSION);
}

/** The module of PATCHED_MODULES a Vite module id refers to, if any. */
export function patchedModuleOf(id: string): string | undefined {
	const path = id.replace(/\\/g, '/').split('?')[0] ?? '';
	return PATCHED_MODULES.find((modulePath) => path.endsWith(modulePath));
}

export function starlightEncodedBase(): AstroIntegration {
	return {
		name: 'starlight-encoded-base',
		hooks: {
			'astro:config:setup': ({ config, updateConfig }) => {
				// Runs after asciiDevBase(), so the dev fallback to '/' is already accounted for.
				if (!isEncodedInUrl(config.base)) return;
				updateConfig({
					vite: {
						plugins: [
							{
								name: 'starlight-encoded-base',
								// Before the base is substituted into the source by Vite's own define plugin.
								enforce: 'pre',
								transform(code: string, id: string) {
									const modulePath = patchedModuleOf(id);
									return modulePath ? patchBaseExpression(code, modulePath) : undefined;
								},
							},
						],
					},
				});
			},
		},
	};
}
