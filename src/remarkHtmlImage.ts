import type { Image, Root } from 'mdast';
import { visit } from 'unist-util-visit';

/**
 * Matches a raw HTML mdast node whose content is exactly one `<img>` tag, capturing the
 * attribute string (the `src="..." alt="..."` part). Matches both inline and block tags.
 */
const IMG_TAG_RE = /^<img\s+([^>]*?)\/?>$/i;

/** Matches one HTML attribute in `name="value"` / `name='value'` / `name=value` form. */
const ATTR_RE = /([a-zA-Z][a-zA-Z0-9:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/g;

function parseAttributes(source: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	for (const [, name, doubleQuoted, singleQuoted, unquoted] of source.matchAll(ATTR_RE)) {
		attrs[name.toLowerCase()] = doubleQuoted ?? singleQuoted ?? unquoted ?? '';
	}
	return attrs;
}

/**
 * Remark plugin that turns an `<img>` tag written as raw HTML in a Markdown body into the same
 * mdast `image` node as the standard image syntax (`![alt](src)`).
 *
 * Astro's Markdown processing (`remarkCollectImages` / `rehypeImages` of
 * `@astrojs/markdown-remark`) only looks at mdast `image` / `imageReference` nodes when it
 * collects relative images for optimization and hashed output filenames; a raw `<img>` tag
 * passes through untouched and is left out. Converting it up front puts it on the same path
 * as `![]()`. Attributes other than `src`/`alt`/`title` (e.g. `width`) are carried over as
 * `data.hProperties` and emitted on the resulting HTML element.
 *
 * Only a raw HTML node whose content is exactly one `<img>` tag is handled (inline or block).
 * More complex cases mixed with other HTML are out of scope.
 */
export function remarkHtmlImage() {
	return (tree: Root) => {
		visit(tree, 'html', (node, index, parent) => {
			if (!parent || index === undefined) return;

			const match = node.value.trim().match(IMG_TAG_RE);
			if (!match) return;

			const { src, alt, title, ...rest } = parseAttributes(match[1]);
			if (!src) return;

			const image: Image = {
				type: 'image',
				url: src,
				alt: alt ?? null,
				title: title ?? null,
				data: { hProperties: rest },
			};
			parent.children[index] = image;
		});
	};
}
