import type { PhrasingContent, Root } from 'mdast';
import { visit } from 'unist-util-visit';

/**
 * Matches a single line break (soft break) inside a paragraph, swallowing the surrounding
 * spaces and tabs (CommonMark strips trailing spaces, but just in case).
 */
const SOFT_BREAK_RE = /[\t ]*(?:\r?\n|\r)[\t ]*/;

/**
 * Remark plugin that outputs a plain line break (one without two trailing spaces or a
 * backslash) as `<br>`.
 *
 * CommonMark collapses a line break inside a paragraph into a single space, but the documents
 * this repository targets are usually written expecting the lines to stay as written, so it
 * follows the "line break = <br>" behaviour of e.g. GitHub comments.
 *
 * Only mdast `text` nodes are converted, so line breaks inside code blocks, inline code,
 * math (`inlineMath` / `math`), and raw HTML are unaffected.
 */
export function remarkBreaks() {
	return (tree: Root) => {
		visit(tree, 'text', (node, index, parent) => {
			if (!parent || index === undefined) return;

			const parts = node.value.split(SOFT_BREAK_RE);
			if (parts.length === 1) return;

			const replacement: PhrasingContent[] = [];
			for (const [i, part] of parts.entries()) {
				if (i > 0) replacement.push({ type: 'break' });
				// Don't create empty text nodes, e.g. for consecutive line breaks.
				if (part) replacement.push({ type: 'text', value: part });
			}
			(parent.children as PhrasingContent[]).splice(index, 1, ...replacement);

			// The replaced nodes are already converted, so continue after them.
			return index + replacement.length;
		});
	};
}
