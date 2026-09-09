// Builds the site under an ASCII placeholder base and rewrites the output to the real `base`.
//
// Astro compares `base` as it is written in the config against paths that are percent-encoded
// (a request path, the URL Vite emitted for an asset, the path of the page being rendered), so a
// `base` such as '/日本語ディレクトリ/' never matches: the build fails, the dev server answers
// 404, and Starlight builds broken links. Writing the base percent-encoded in the config does not
// help either — route matching compares it against the decoded path and fails the other way
// around.
//
// Since `base` only decides which subdirectory of the web server the built site is deployed
// under, nothing has to know it while the site is being built. So the build runs under a plain
// ASCII base (BUILD_BASE), which Astro and Starlight handle as they always have, and the last
// step of the build replaces that placeholder with the configured base in the output. Everything
// that puts a base into a file — page links, asset URLs, the CSS `url()`s, `import.meta.env
// .BASE_URL` inlined into scripts, the sitemap — is covered by that one replacement.
//
// This integration has to be the LAST one in `integrations`: Starlight inserts its own (Pagefind,
// sitemap, …) right after itself, and the output is only complete once those have run.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';

/**
 * The base the site is built under. Deliberately unlikely to occur in a document: a file that
 * still contains it after the rewrite (an image, a compressed search index) fails the build.
 */
export const BUILD_BASE = '/__base__/';

/** File types the base is rewritten in. Anything else must not contain BUILD_BASE. */
export const REWRITTEN_EXTENSIONS = ['.html', '.css', '.js', '.json', '.map', '.svg', '.txt', '.xml'];

/** How `base` appears in a URL: percent-encoded, which is how a browser sends it back. */
export function urlBase(base: string): string {
	return encodeURI(base);
}

/** Replaces the placeholder base of built output with the base the site is deployed under. */
export function rewriteBase(content: string, base: string): string {
	return content.replaceAll(BUILD_BASE, urlBase(base));
}

/** Rewrites every file under `dir` that carries the placeholder base. Returns how many. */
export async function rewriteBaseInDir(dir: string, base: string): Promise<number> {
	let rewritten = 0;
	for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
		if (!entry.isFile()) continue;
		const file = path.join(entry.parentPath, entry.name);
		// Read as bytes: a file that turns out not to be text is reported rather than rewritten.
		const content = await readFile(file);
		if (!content.includes(BUILD_BASE)) continue;
		if (!REWRITTEN_EXTENSIONS.includes(path.extname(file).toLowerCase())) {
			throw new Error(
				`${path.relative(dir, file)} contains the placeholder base "${BUILD_BASE}" but is not a ` +
					'file type it is rewritten in, so the built site would point at a path that does not ' +
					'exist. Add the extension to REWRITTEN_EXTENSIONS in src/portableBase.ts if the file ' +
					'is text, or keep the placeholder out of it.'
			);
		}
		await writeFile(file, rewriteBase(content.toString('utf-8'), base));
		rewritten++;
	}
	return rewritten;
}

export function portableBase(): AstroIntegration {
	// The base as configured (astro.config.mjs or `--base`), i.e. where the site is deployed.
	let base = BUILD_BASE;
	return {
		name: 'portable-base',
		hooks: {
			'astro:config:setup': ({ command, config, updateConfig, logger }) => {
				base = config.base;
				// `astro preview` serves the output of a finished build, which carries the real base
				// already. (A base URLs encode is as unservable there as it is anywhere else in Astro;
				// serve dist with a static server instead.)
				if (command === 'preview') return;
				updateConfig({ base: BUILD_BASE });
				if (command === 'dev') {
					logger.info(
						`serving under "${BUILD_BASE}"; the configured base ("${base}") is applied to the ` +
							'output of `astro build`.'
					);
				}
			},
			'astro:build:done': async ({ dir, logger }) => {
				const rewritten = await rewriteBaseInDir(fileURLToPath(dir), base);
				logger.info(`base "${urlBase(base)}" written into ${rewritten} file(s).`);
			},
		},
	};
}
