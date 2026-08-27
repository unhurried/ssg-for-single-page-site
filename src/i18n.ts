/** Supported locales. Keys are the locale directory name in content, and the URL prefix. */
export const locales = {
	ja: { label: '日本語', lang: 'ja' },
	en: { label: 'English', lang: 'en' },
} as const;

export type Locale = keyof typeof locales;

/** Default locale. Used for the fallback of an untranslated page and for the site root redirect. */
export const defaultLocale: Locale = 'ja';

/**
 * Starlight's `locales` config. Every locale sits under a URL prefix of its own (there is no
 * `root` locale), so no page is generated at the site root; src/localeRootRedirect.ts redirects
 * it to the default locale.
 */
export const starlightLocales: Record<string, { label: string; lang: string }> = { ...locales };

/** Title of the top page (document list). */
export const indexTitles: Record<Locale, string> = {
	ja: 'ドキュメント一覧',
	en: 'Document List',
};

/**
 * Converts a path relative to `src/content/docs/` into a Starlight slug.
 *
 * Content is laid out as `<document>/<locale>/index.md`, keeping the translations of a
 * document together, but Starlight's i18n treats the leading directory as the locale
 * (`<locale>/<document>/index.md`). Moving the locale directory to the front here keeps the
 * content layout as it is while still using Starlight's standard i18n (locale switcher, UI
 * strings, per-locale Pagefind index).
 *
 * e.g. a/ja/index.md -> 'ja/a'  /  a/en/index.md -> 'en/a'
 */
export function generateDocsId({ entry }: { entry: string }): string {
	const segments = entry.replace(/\.[^/.]+$/, '').split('/');
	const localeIndex = segments.findIndex((segment) => segment in locales);
	if (localeIndex === -1) {
		throw new Error(`言語ディレクトリ(${Object.keys(locales).join('/')})が見つかりません: ${entry}`);
	}
	const locale = segments[localeIndex] as Locale;
	const rest = [...segments.slice(0, localeIndex), ...segments.slice(localeIndex + 1)];
	if (rest.at(-1) === 'index') rest.pop();
	// Every locale carries a prefix, so the slug is never empty: the index of a locale directory
	// becomes the locale itself ('ja'), which is the slug Starlight gives that locale's root.
	return [locale, ...rest].join('/');
}

/**
 * Derives the locale of a page from the slug `generateDocsId` produced (its inverse).
 * Every slug starts with its locale directory; anything else falls back to the default locale.
 *
 * e.g. 'ja/a' -> 'ja'  /  'en/a' -> 'en'
 */
export function localeOfDocsId(id: string): Locale {
	const first = id.split('/')[0];
	return first !== undefined && first in locales ? (first as Locale) : defaultLocale;
}
