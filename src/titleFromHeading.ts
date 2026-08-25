// Strip fenced code blocks before searching for a heading, so a `# ...` line inside one
// (a Python comment, a shebang) isn't mistaken for a heading.
// Both ``` and ~~~ are handled because the side that removes the H1 from the body
// (src/remarkStripLeadingHeading.ts) recognizes both through the Markdown parser. Handling
// only one would make "the H1 used as the title" and "the H1 removed from the body" disagree,
// turning a line of code into the title and dropping the real H1.
export function stripCodeFences(markdown: string): string {
	return markdown.replace(/^(```|~~~)[\s\S]*?^\1[ \t]*$/gm, '');
}

/**
 * Extracts the leading H1 of a Markdown body (e.g. `# Title`) as the page title.
 * Returns undefined if there is none (the caller falls back to the `title` frontmatter).
 */
export function extractTitleFromMarkdown(markdown: string): string | undefined {
	const match = stripCodeFences(markdown).match(/^#\s+(.+?)\s*$/m);
	return match?.[1];
}
