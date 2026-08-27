// Redirects the site root (`base` itself) to the top page of the default locale.
//
// Every locale sits under a URL prefix of its own (/ja/, /en/), so there is no page at the root.
// A static build has no server configuration to redirect with, so this registers an Astro
// `redirects` entry: the build then writes an HTML page with a <meta http-equiv="refresh"> there,
// and an adapter that supports redirects can turn the same entry into a real 3xx.
//
// The destination has to carry the base, which `redirects` does not add by itself. The base in
// question is the one the site is built under (BUILD_BASE, see src/portableBase.ts), which the
// build output then rewrites to the configured one along with every other URL. Reading it from
// the constant rather than from `config.base` keeps this independent of where the integration
// sits in `integrations` (portableBase() replaces the base in a hook of its own).
import type { AstroIntegration } from 'astro';
import { BUILD_BASE } from './portableBase.ts';

/** Path the site root redirects to, e.g. base '/docs/' and locale 'ja' -> '/docs/ja/'. */
export function localeRootPath(base: string, locale: string): string {
	return `${base.replace(/\/$/, '')}/${locale}/`;
}

export function localeRootRedirect(locale: string): AstroIntegration {
	return {
		name: 'locale-root-redirect',
		hooks: {
			'astro:config:setup': ({ updateConfig }) => {
				updateConfig({ redirects: { '/': localeRootPath(BUILD_BASE, locale) } });
			},
		},
	};
}
