import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Html, Image, Paragraph, Root, RootContent } from 'mdast';
import { remarkHtmlImage } from '../../src/remarkHtmlImage.ts';

function html(value: string): Html {
	return { type: 'html', value };
}

function root(...children: RootContent[]): Root {
	return { type: 'root', children };
}

function transform(tree: Root): Root {
	remarkHtmlImage()(tree);
	return tree;
}

/** Transforms a single root-level node and returns it, asserting it became an image node. */
function transformOne(value: string): Image {
	const tree = transform(root(html(value)));
	const node = tree.children[0];
	assert.equal(node?.type, 'image', `not converted into an image node: ${value}`);
	return node as Image;
}

/** Asserts the node is left untouched as an html node. */
function assertUntouched(value: string): void {
	const tree = transform(root(html(value)));
	assert.equal(tree.children[0]?.type, 'html', `should not be converted: ${value}`);
	assert.equal((tree.children[0] as Html).value, value);
}

describe('remarkHtmlImage', () => {
	it('converts a raw HTML <img> into an mdast image node (to put it on the image pipeline)', () => {
		const image = transformOne('<img src="./index.assets/a.svg" alt="図">');
		assert.equal(image.url, './index.assets/a.svg');
		assert.equal(image.alt, '図');
		assert.equal(image.title, null);
	});

	it('carries attributes other than src/alt/title over as hProperties', () => {
		const image = transformOne('<img src="./a.svg" alt="図" width="160" height="90">');
		assert.deepEqual(image.data?.hProperties, { width: '160', height: '90' });
	});

	it('maps the title attribute to the title of the image node', () => {
		const image = transformOne('<img src="./a.svg" title="説明">');
		assert.equal(image.title, '説明');
		assert.deepEqual(image.data?.hProperties, {});
	});

	it('sets alt to null when there is no alt attribute', () => {
		const image = transformOne('<img src="./a.svg">');
		assert.equal(image.alt, null);
	});

	it('accepts self-closing tags and single-quoted or unquoted attributes', () => {
		assert.equal(transformOne('<img src="./a.svg" />').url, './a.svg');
		assert.equal(transformOne("<img src='./a.svg' alt='図'/>").alt, '図');
		const unquoted = transformOne('<img src=./a.svg width=160>');
		assert.equal(unquoted.url, './a.svg');
		assert.deepEqual(unquoted.data?.hProperties, { width: '160' });
	});

	it('is case-insensitive about attribute names', () => {
		const image = transformOne('<IMG SRC="./a.svg" ALT="図" WIDTH="160">');
		assert.equal(image.url, './a.svg');
		assert.equal(image.alt, '図');
		assert.deepEqual(image.data?.hProperties, { width: '160' });
	});

	it('converts a tag surrounded by whitespace or line breaks', () => {
		assert.equal(transformOne('\n  <img src="./a.svg">  \n').url, './a.svg');
	});

	it('converts an inline <img> inside a paragraph', () => {
		const inline: Paragraph = {
			type: 'paragraph',
			children: [{ type: 'text', value: '図: ' }, html('<img src="./a.svg" alt="図">')],
		};
		const tree = transform(root(inline));
		const paragraph = tree.children[0] as Paragraph;
		assert.equal(paragraph.children[1]?.type, 'image');
		assert.equal((paragraph.children[1] as Image).url, './a.svg');
	});

	it('does not convert an <img> with a missing or empty src', () => {
		assertUntouched('<img alt="図">');
		assertUntouched('<img src="" alt="図">');
	});

	it('does not convert HTML other than <img>', () => {
		assertUntouched('<div>text</div>');
		assertUntouched('<br>');
	});

	it('skips an <img> mixed with other HTML, handling a standalone tag only', () => {
		assertUntouched('<figure><img src="./a.svg"></figure>');
		assertUntouched('<img src="./a.svg"><img src="./b.svg">');
	});
});
