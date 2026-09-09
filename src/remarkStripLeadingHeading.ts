import type { Root } from 'mdast';
import { leadingHeadingIndex } from './titleFromHeading.ts';

// The page title comes from the leading H1 of the body instead of frontmatter (see
// docsLoaderWithTitleFromHeading.ts), and Starlight's PageTitle component renders that title
// as a heading of its own. Leaving the H1 in the body would show the heading twice, so it is
// removed from the mdast tree at render time. The heading is located the same way the title was
// extracted (leadingHeadingIndex), so the two cannot disagree.
export function remarkStripLeadingHeading() {
	return (tree: Root) => {
		const index = leadingHeadingIndex(tree);
		if (index !== -1) {
			tree.children.splice(index, 1);
		}
	};
}
