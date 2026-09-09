import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Heading, Paragraph, Root, RootContent } from 'mdast';
import { remarkStripLeadingHeading } from '../../src/remarkStripLeadingHeading.ts';

function heading(depth: Heading['depth'], text: string): Heading {
	return { type: 'heading', depth, children: [{ type: 'text', value: text }] };
}

function paragraph(text: string): Paragraph {
	return { type: 'paragraph', children: [{ type: 'text', value: text }] };
}

function root(...children: RootContent[]): Root {
	return { type: 'root', children };
}

/** Renders nodes as h<depth>:text for headings and p:text for paragraphs, to compare easily. */
function outline(tree: Root): string[] {
	return tree.children.map((node) => {
		if (node.type === 'heading') return `h${node.depth}:${(node.children[0] as { value: string }).value}`;
		if (node.type === 'paragraph') return `p:${(node.children[0] as { value: string }).value}`;
		return node.type;
	});
}

function transform(tree: Root): Root {
	remarkStripLeadingHeading()(tree);
	return tree;
}

describe('remarkStripLeadingHeading', () => {
	it('removes the leading H1, which is displayed separately as the title', () => {
		const tree = transform(root(heading(1, 'タイトル'), paragraph('本文')));
		assert.deepEqual(outline(tree), ['p:本文']);
	});

	it('keeps H2 and lower', () => {
		const tree = transform(root(heading(2, '見出し2'), heading(3, '見出し3')));
		assert.deepEqual(outline(tree), ['h2:見出し2', 'h3:見出し3']);
	});

	it('removes only the first of two H1s', () => {
		const tree = transform(root(heading(1, '最初'), paragraph('本文'), heading(1, '次')));
		assert.deepEqual(outline(tree), ['p:本文', 'h1:次']);
	});

	// The title extraction side (extractTitleFromMarkdown) also takes the first `# ` in the file,
	// so the first H1 is removed regardless of position and both refer to the same heading.
	it('removes the H1 even when it is not the first node', () => {
		const tree = transform(root(paragraph('前書き'), heading(1, 'タイトル'), paragraph('本文')));
		assert.deepEqual(outline(tree), ['p:前書き', 'p:本文']);
	});

	it('leaves a tree without an H1 unchanged', () => {
		const tree = transform(root(paragraph('本文'), heading(2, '見出し2')));
		assert.deepEqual(outline(tree), ['p:本文', 'h2:見出し2']);
	});

	it('does not throw on an empty tree', () => {
		const tree = transform(root());
		assert.deepEqual(tree.children, []);
	});
});
