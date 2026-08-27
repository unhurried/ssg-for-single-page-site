// Redirects the site root (`base` itself) to the top page of the default locale.
//
// Every locale sits under a URL prefix of its own (/ja/, /en/), so there is no page at the root.
// A static build has no server configuration to redirect with, so this registers an Astro
// `redirects` entry: the build then writes an HTML page with a <meta http-equiv="refresh"> there,
// and an adapter that supports redirects can turn the same entry into a real 3xx.
//
// It is registered as an integration rather than written into the config directly for two
// reasons: the destination has to carry the base, which `redirects` does not add by itself, and
// the base is the one in effect (`astro dev` falls back to '/', see src/asciiDevBase.ts).
//
// A page under src/pages/ would be the obvious alternative, but Astro's i18n router answers 404
// for a path that carries no locale unless it recognises the path as the site root — which it
// does by comparing it against `base` as written, so a base that URLs percent-encode never
// matches and the page is dropped from the build. A `redirects` entry is not routed through it.
import type { AstroIntegration } from 'astro';

/** Path the site root redirects to, e.g. base '/docs/' and locale 'ja' -> '/docs/ja/'. */
export function localeRootPath(base: string, locale: string): string {
	return `${base.replace(/\/$/, '')}/${locale}/`;
}

export function localeRootRedirect(locale: string): AstroIntegration {
	return {
		name: 'locale-root-redirect',
		hooks: {
			'astro:config:setup': ({ config, updateConfig }) => {
				// The base as written: Astro percent-encodes the destination itself when it puts it
				// into the Location header, so encoding it here would encode it twice.
				updateConfig({ redirects: { '/': localeRootPath(config.base, locale) } });
			},
		},
	};
}
