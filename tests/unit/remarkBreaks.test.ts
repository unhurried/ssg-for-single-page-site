import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { InlineCode, Paragraph, Root, RootContent, Text } from 'mdast';
import { remarkBreaks } from '../../src/remarkBreaks.ts';

function text(value: string): Text {
	return { type: 'text', value };
}

function inlineCode(value: string): InlineCode {
	return { type: 'inlineCode', value };
}

function paragraph(...children: Paragraph['children']): Paragraph {
	return { type: 'paragraph', children };
}

function root(...children: RootContent[]): Root {
	return { type: 'root', children };
}

function transform(tree: Root): Root {
	remarkBreaks()(tree);
	return tree;
}

/** Renders an inline node list as text values, with `<br>` for breaks, to compare easily. */
function inline(tree: Root): string[] {
	const node = tree.children[0];
	assert.equal(node?.type, 'paragraph');
	return (node as Paragraph).children.map((child) => {
		if (child.type === 'text') return child.value;
		if (child.type === 'break') return '<br>';
		if (child.type === 'inlineCode') return `code:${child.value}`;
		return child.type;
	});
}

describe('remarkBreaks', () => {
	it('converts a line break in a paragraph into a break node (<br>)', () => {
		const tree = transform(root(paragraph(text('1行目\n2行目'))));
		assert.deepEqual(inline(tree), ['1行目', '<br>', '2行目']);
	});

	it('converts every line break when there are several', () => {
		const tree = transform(root(paragraph(text('1行目\n2行目\n3行目'))));
		assert.deepEqual(inline(tree), ['1行目', '<br>', '2行目', '<br>', '3行目']);
	});

	it('strips spaces and tabs around a line break, so no line appears to start with a space', () => {
		const tree = transform(root(paragraph(text('1行目 \t\n \t2行目'))));
		assert.deepEqual(inline(tree), ['1行目', '<br>', '2行目']);
	});

	it('converts CRLF and CR line breaks too', () => {
		assert.deepEqual(inline(transform(root(paragraph(text('あ\r\nい'))))), ['あ', '<br>', 'い']);
		assert.deepEqual(inline(transform(root(paragraph(text('あ\rい'))))), ['あ', '<br>', 'い']);
	});

	it('creates no empty text node for a leading or trailing line break', () => {
		const tree = transform(root(paragraph(text('\n本文\n'))));
		assert.deepEqual(inline(tree), ['<br>', '本文', '<br>']);
	});

	it('leaves text without a line break unchanged', () => {
		const tree = transform(root(paragraph(text('1行だけ'))));
		assert.deepEqual(inline(tree), ['1行だけ']);
	});

	// Only text nodes are visited, so line breaks inside code blocks, inline code, and math
	// (inlineMath / math) stay as they are.
	it('does not convert a line break inside inline code', () => {
		const tree = transform(root(paragraph(text('前\n'), inlineCode('a\nb'), text('\n後'))));
		assert.deepEqual(inline(tree), ['前', '<br>', 'code:a\nb', '<br>', '後']);
	});

	it('does not convert a line break inside a code block', () => {
		const tree = transform(root({ type: 'code', lang: 'js', value: 'let x;\nlet y;' }));
		const node = tree.children[0];
		assert.equal(node?.type, 'code');
		assert.equal((node as { value: string }).value, 'let x;\nlet y;');
	});

	it('processes every text node in the same paragraph', () => {
		const tree = transform(
			root(paragraph(text('あ\nい'), { type: 'strong', children: [text('強調')] }, text('う\nえ'))),
		);
		assert.deepEqual(inline(tree), ['あ', '<br>', 'い', 'strong', 'う', '<br>', 'え']);
	});
});
