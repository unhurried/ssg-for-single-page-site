import type { Root } from 'mdast';

// The page title comes from the leading H1 of the body instead of frontmatter (see
// docsLoaderWithTitleFromHeading.ts), and Starlight's PageTitle component renders that title
// as a heading of its own. Leaving the H1 in the body would show the heading twice, so it is
// removed from the mdast tree at render time.
export function remarkStripLeadingHeading() {
	return (tree: Root) => {
		const index = tree.children.findIndex((node) => node.type === 'heading' && node.depth === 1);
		if (index !== -1) {
			tree.children.splice(index, 1);
		}
	};
}
