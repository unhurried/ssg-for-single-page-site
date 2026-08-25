/** Supported locales. Keys are the locale directory name in content (= URL prefix, except the default). */
export const locales = {
	ja: { label: '日本語', lang: 'ja' },
	en: { label: 'English', lang: 'en' },
} as const;

export type Locale = keyof typeof locales;

/** Default locale. Only this one has no URL prefix. */
export const defaultLocale: Locale = 'ja';

/** Starlight's `locales` config (the default locale becomes the root locale). */
export const starlightLocales = Object.fromEntries(
	Object.entries(locales).map(([locale, config]) => [
		locale === defaultLocale ? 'root' : locale,
		config,
	])
);

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
 * e.g. a/ja/index.md -> 'a'  /  a/en/index.md -> 'en/a'
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
	const prefix = locale === defaultLocale ? [] : [locale];
	// Starlight normalizes the root index to an empty slug, so return 'index'.
	return [...prefix, ...rest].join('/') || 'index';
}

/**
 * Derives the locale of a page from the slug `generateDocsId` produced (its inverse).
 * Pages in the default locale have no prefix, so a path not starting with a locale directory
 * is taken as the default locale.
 *
 * e.g. 'a' -> 'ja'  /  'en/a' -> 'en'
 */
export function localeOfDocsId(id: string): Locale {
	const first = id.split('/')[0];
	return first !== undefined && first !== defaultLocale && first in locales
		? (first as Locale)
		: defaultLocale;
}
