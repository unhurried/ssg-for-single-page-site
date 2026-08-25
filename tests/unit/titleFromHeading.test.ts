import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractTitleFromMarkdown, stripCodeFences } from '../../src/titleFromHeading.ts';

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

	// A requirement specific to this project: never mistake a Python comment or a shebang for a heading.
	describe('code fence exclusion', () => {
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

		// ~~~ is a Markdown code fence too. The side that removes the H1 from the body recognizes it
		// through the parser, so missing it here would make the title and the removed heading disagree.
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
	});
});

describe('stripCodeFences', () => {
	it('removes the fenced range and keeps the rest', () => {
		const markdown = ['前', '```js', 'const a = 1;', '```', '後', ''].join('\n');
		const stripped = stripCodeFences(markdown);
		assert.ok(stripped.includes('前'));
		assert.ok(stripped.includes('後'));
		assert.ok(!stripped.includes('const a = 1;'));
	});

	it('removes nothing when a fence is unclosed, so no body is lost', () => {
		const markdown = ['```js', 'const a = 1;', '', '# タイトル', ''].join('\n');
		assert.equal(stripCodeFences(markdown), markdown);
	});

	it('removes a ~~~ fence the same way', () => {
		const markdown = ['前', '~~~js', 'const a = 1;', '~~~', '後', ''].join('\n');
		const stripped = stripCodeFences(markdown);
		assert.ok(stripped.includes('前'));
		assert.ok(stripped.includes('後'));
		assert.ok(!stripped.includes('const a = 1;'));
	});
});
