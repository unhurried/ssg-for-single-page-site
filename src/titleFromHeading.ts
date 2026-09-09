import { parseFrontmatter } from '@astrojs/markdown-remark';
import type { Root } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { toString } from 'mdast-util-to-string';

/**
 * Index of the leading H1 in a Markdown tree, or -1 if there is none.
 *
 * Shared by the two sides of "the H1 is the page title": the title extraction below, which
 * parses the file, and src/remarkStripLeadingHeading.ts, which removes the same heading from
 * the tree Astro renders. Both pick the heading the same way, so the title can never be taken
 * from one heading while another is removed from the body.
 */
export function leadingHeadingIndex(tree: Root): number {
	return tree.children.findIndex((node) => node.type === 'heading' && node.depth === 1);
}

/**
 * Extracts the leading H1 of a Markdown body (e.g. `# Title`) as the page title.
 * Returns undefined if there is none (the caller falls back to the `title` frontmatter).
 *
 * The body is parsed as Markdown rather than searched with a regular expression, so a `#` line
 * that is not a heading (a comment in a code block or in the frontmatter, a shebang) is not
 * mistaken for one, and the title is the text of the heading rather than its source (`# *a*`
 * gives "a"). The frontmatter is removed the way Astro removes it before parsing a document.
 */
export function extractTitleFromMarkdown(markdown: string): string | undefined {
	const tree = fromMarkdown(parseFrontmatter(markdown).content);
	const index = leadingHeadingIndex(tree);
	if (index === -1) return undefined;
	// An empty heading (`#` on a line of its own) is no title; fall back to the frontmatter.
	return toString(tree.children[index]!) || undefined;
}
