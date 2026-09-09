import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { toString } from 'mdast-util-to-string';
import { remarkStripLeadingHeading } from '../../src/remarkStripLeadingHeading.ts';
import { extractTitleFromMarkdown } from '../../src/titleFromHeading.ts';

describe('extractTitleFromMarkdown', () => {
	it('takes the leading H1 of the body as the title', () => {
		assert.equal(extractTitleFromMarkdown('# タイトル\n\n本文\n'), 'タイトル');
	});

	it('trims the whitespace around the H1', () => {
		assert.equal(extractTitleFromMarkdown('#    タイトル   \n\n本文\n'), 'タイトル');
	});

	it('looks only at the first H1 and ignores later ones', () => {
		assert.equal(extractTitleFromMarkdown('# 最初\n\n# 次\n'), '最初');
	});

	it('finds the H1 even after a preceding paragraph', () => {
		assert.equal(extractTitleFromMarkdown('前書き\n\n# タイトル\n'), 'タイトル');
	});

	it('works with CRLF line endings', () => {
		assert.equal(extractTitleFromMarkdown('# タイトル\r\n\r\n本文\r\n'), 'タイトル');
	});

	it('does not accept H2 or lower as the title', () => {
		assert.equal(extractTitleFromMarkdown('## 見出し2\n\n### 見出し3\n'), undefined);
	});

	it('does not treat `#` without a following space as a heading', () => {
		assert.equal(extractTitleFromMarkdown('#タイトル\n\n本文\n'), undefined);
	});

	it('returns undefined when there is no heading', () => {
		assert.equal(extractTitleFromMarkdown('本文だけ\n'), undefined);
	});

	it('returns undefined for an empty heading, so the frontmatter title is used', () => {
		assert.equal(extractTitleFromMarkdown('#\n\n本文\n'), undefined);
	});

	// The body is parsed as Markdown, so the title is the text of the heading, not its source.
	describe('heading forms', () => {
		it('takes an underlined (setext) H1 as the title too', () => {
			assert.equal(extractTitleFromMarkdown('タイトル\n===\n\n本文\n'), 'タイトル');
		});

		it('drops the inline markup of the heading', () => {
			assert.equal(extractTitleFromMarkdown('# `コード` と *強調*\n'), 'コード と 強調');
		});

		it('drops the closing hashes of a closed ATX heading', () => {
			assert.equal(extractTitleFromMarkdown('# タイトル #\n'), 'タイトル');
		});
	});

	// A requirement specific to this project: never mistake a Python comment or a shebang for a
	// heading. Parsing the body handles this the same way the renderer does.
	describe('`#` lines that are not headings', () => {
		it('returns the real H1 after a leading code fence, not the `#` line inside it', () => {
			const markdown = [
				'```python',
				'# これはコメントであってタイトルではない',
				'print("hello")',
				'```',
				'',
				'# 本物のタイトル',
				'',
				'本文',
				'',
			].join('\n');
			assert.equal(extractTitleFromMarkdown(markdown), '本物のタイトル');
		});

		it('ignores a fence containing a shebang', () => {
			const markdown = ['```sh', '#!/bin/sh', 'echo hi', '```', '', '# 本物のタイトル', ''].join(
				'\n'
			);
			assert.equal(extractTitleFromMarkdown(markdown), '本物のタイトル');
		});

		it('excludes every fence when there are several', () => {
			const markdown = [
				'```',
				'# ひとつめ',
				'```',
				'',
				'```',
				'# ふたつめ',
				'```',
				'',
				'# 本物のタイトル',
				'',
			].join('\n');
			assert.equal(extractTitleFromMarkdown(markdown), '本物のタイトル');
		});

		it('returns undefined when the only H1 is inside a code fence', () => {
			const markdown = ['```python', '# コメント', '```', '', '## 見出し2', ''].join('\n');
			assert.equal(extractTitleFromMarkdown(markdown), undefined);
		});

		it('is unaffected by the body following a fence', () => {
			const markdown = ['# タイトル', '', '```python', '# コメント', '```', ''].join('\n');
			assert.equal(extractTitleFromMarkdown(markdown), 'タイトル');
		});

		it('ignores a ~~~ fence', () => {
			const markdown = ['~~~python', '# コメント', '~~~', '', '# 本物のタイトル', ''].join('\n');
			assert.equal(extractTitleFromMarkdown(markdown), '本物のタイトル');
		});

		it('closes a fence only with the same character when fences of different characters nest', () => {
			const markdown = ['~~~', '```', '# コメント', '```', '~~~', '', '# 本物のタイトル', ''].join(
				'\n'
			);
			assert.equal(extractTitleFromMarkdown(markdown), '本物のタイトル');
		});

		// An unclosed fence runs to the end of the document, so what follows is code, not a heading —
		// which is how the document is rendered as well.
		it('ignores a heading inside an unclosed fence', () => {
			const markdown = ['```js', 'const a = 1;', '', '# タイトル', ''].join('\n');
			assert.equal(extractTitleFromMarkdown(markdown), undefined);
		});

		it('ignores an indented code block', () => {
			assert.equal(extractTitleFromMarkdown('    # コメント\n\n# 本物のタイトル\n'), '本物のタイトル');
		});

		// A `#` line in the frontmatter is a YAML comment. The frontmatter is removed before parsing.
		it('ignores a comment in the frontmatter', () => {
			const markdown = ['---', '# 下書き中', 'draft: true', '---', '', '# 本物のタイトル', ''].join(
				'\n'
			);
			assert.equal(extractTitleFromMarkdown(markdown), '本物のタイトル');
		});
	});
});

// The title extraction and the removal of the H1 from the body must always refer to the same
// heading: they share leadingHeadingIndex, so a document that has a title has exactly that
// heading removed, and one that has none keeps its body intact.
describe('agreement with remarkStripLeadingHeading', () => {
	const documents = [
		'# タイトル\n\n本文\n',
		'前書き\n\n# タイトル\n\n本文\n',
		'タイトル\n===\n\n本文\n',
		'```python\n# コメント\n```\n\n# 本物のタイトル\n',
		'```js\nconst a = 1;\n\n# タイトル\n',
		'## 見出し2\n\n本文\n',
	];

	for (const markdown of documents) {
		it(`removes exactly the heading used as the title: ${JSON.stringify(markdown)}`, () => {
			const title = extractTitleFromMarkdown(markdown);
			const tree = fromMarkdown(markdown);
			const before = tree.children.length;
			remarkStripLeadingHeading()(tree);
			const removed = before - tree.children.length;

			if (title === undefined) {
				assert.equal(removed, 0, 'a heading was removed although no title was extracted');
			} else {
				assert.equal(removed, 1, 'the heading used as the title was not removed');
				assert.ok(
					!tree.children.some((node) => node.type === 'heading' && toString(node) === title),
					'the heading used as the title is still in the body'
				);
			}
		});
	}
});
