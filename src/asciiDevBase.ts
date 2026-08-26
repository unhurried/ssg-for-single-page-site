// Lets `astro dev` run when `base` contains non-ASCII characters.
//
// The dev server strips `base` off an incoming request by comparing it against the string in the
// config, but a browser sends the path percent-encoded. So a base such as '/日本語ディレクトリ/'
// never matches, the base stays on the path, and every page answers 404 ("no matching static path
// was found"). Writing the base percent-encoded in the config does not help either: route
// matching then compares it against the decoded path and fails the other way around.
//
// Since the base only decides which subdirectory of the server the built site is deployed under,
// dev falls back to serving it at the root. `astro build` keeps the configured base (the encoding
// mismatch on the image side is handled by src/imageService.ts).
import type { AstroIntegration } from 'astro';

/** True for a base the dev server cannot match, i.e. one that is not left as-is when encoded. */
export function isEncodedInUrl(base: string): boolean {
	return encodeURI(base) !== base;
}

export function asciiDevBase(): AstroIntegration {
	return {
		name: 'ascii-dev-base',
		hooks: {
			'astro:config:setup': ({ command, config, updateConfig, logger }) => {
				if (command !== 'dev' || !isEncodedInUrl(config.base)) return;
				logger.warn(
					`base "${config.base}" is percent-encoded in URLs, which the dev server cannot match. ` +
						'Serving the site at / for `astro dev`; `astro build` uses the base as configured.'
				);
				updateConfig({ base: '/' });
			},
		},
	};
}
