// Tests for the TOC highlighting rule (src/activeTocIndex.ts).
//
// The rule is uniformly "the last heading above the threshold", so these boundary values check
// that the entry above or below is not selected right after a TOC entry is clicked (i.e. when
// the clicked heading sits exactly at the threshold).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { activeTocIndex } from '../../src/activeTocIndex.ts';

/** Anchor landing position (scroll-padding-top). The rule has the same shape for any value. */
const THRESHOLD = 104;

/** The rule in the middle of a page (still scrollable downwards). */
function whileScrolling(headingTops: number[], hintedIndex = -1): number {
	return activeTocIndex({
		headingTops,
		threshold: THRESHOLD,
		atScrollEnd: false,
		scrollable: true,
		hintedIndex,
	});
}

/** The rule when the page cannot scroll down any further. */
function atScrollEnd(headingTops: number[], hintedIndex = -1, scrollable = true): number {
	return activeTocIndex({
		headingTops,
		threshold: THRESHOLD,
		atScrollEnd: true,
		scrollable,
		hintedIndex,
	});
}

describe('activeTocIndex', () => {
	it('returns -1 for an empty TOC', () => {
		assert.equal(whileScrolling([]), -1);
	});

	it('selects the first entry at the top of the page (every heading below the threshold)', () => {
		assert.equal(whileScrolling([THRESHOLD + 40, THRESHOLD + 300, THRESHOLD + 900]), 0);
	});

	it('selects the last heading above the threshold', () => {
		assert.equal(whileScrolling([-800, -300, THRESHOLD - 10, THRESHOLD + 200]), 2);
	});

	it('selects the clicked entry when its heading lands exactly on the threshold', () => {
		assert.equal(whileScrolling([-500, -200, THRESHOLD, THRESHOLD + 400]), 2);
	});

	it('keeps the clicked entry when the landing position is off by a fraction', () => {
		// Browser zoom makes the scroll amount fractional, moving the landing position by about 1px.
		for (const landing of [THRESHOLD - 1.5, THRESHOLD - 0.5, THRESHOLD + 0.5, THRESHOLD + 1.5]) {
			assert.equal(whileScrolling([-500, -200, landing, landing + 400]), 2, `landing=${landing}`);
		}
	});

	it('does not fall back to the entry above when the preceding heading is close by', () => {
		// A "### subheading" right after a "## heading": both are above the threshold, but the
		// latter is the current one. Starlight's band-based rule was unstable here.
		assert.equal(whileScrolling([-900, THRESHOLD - 16, THRESHOLD]), 2);
	});

	it('does not select the entry below when a short section puts the next heading just underneath', () => {
		assert.equal(whileScrolling([-900, THRESHOLD, THRESHOLD + 30, THRESHOLD + 60]), 1);
	});

	it('selects the last entry once scrolled to the very bottom', () => {
		// Headings near the end cannot reach the threshold, so scroll position alone would give 1.
		assert.equal(atScrollEnd([-900, THRESHOLD - 10, THRESHOLD + 200, THRESHOLD + 400]), 3);
	});

	it('honours a click on a heading that cannot reach the threshold at the bottom', () => {
		assert.equal(atScrollEnd([-900, THRESHOLD - 10, THRESHOLD + 200, THRESHOLD + 400], 2), 2);
	});

	it('ignores a stale hash pointing above the current entry at the bottom', () => {
		assert.equal(atScrollEnd([-900, THRESHOLD - 10, THRESHOLD + 200, THRESHOLD + 400], 0), 3);
	});

	it('does not jump to the last entry on a page that cannot scroll', () => {
		const tops = [THRESHOLD - 10, THRESHOLD + 100, THRESHOLD + 200];
		assert.equal(atScrollEnd(tops, -1, false), 0);
	});

	it('still honours the clicked entry on a page that cannot scroll', () => {
		const tops = [THRESHOLD - 10, THRESHOLD + 100, THRESHOLD + 200];
		assert.equal(atScrollEnd(tops, 2, false), 2);
	});
});
