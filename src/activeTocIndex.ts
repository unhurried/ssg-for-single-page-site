/**
 * Decides which table-of-contents entry is highlighted as the current one, from scroll
 * position alone.
 *
 * Starlight's highlighting uses an IntersectionObserver to find the element crossing a 53px
 * band at the top of the viewport. Since a clicked anchor lands near the top of that band and
 * the first of several intersecting entries wins (their order is not guaranteed), the
 * highlight swings to the entry above or below with small differences in zoom or window size.
 *
 * Here the rule is "the last heading above the threshold", the threshold being the anchor
 * landing position (scroll-padding-top), so clicking a TOC entry always selects that entry.
 * Having no band width, it is unaffected by heading spacing or section length too.
 */

/** Tolerance for rounded heading positions (browser zoom makes the values fractional). */
const TOLERANCE_PX = 2;

export interface ActiveTocIndexInput {
	/** Position of each entry's heading from the top of the viewport (px), in TOC (= document) order. */
	headingTops: number[];
	/** Boundary at which a heading becomes current; the anchor landing position (scroll-padding-top). */
	threshold: number;
	/** Whether the page cannot scroll down any further (true for a page too short to scroll, too). */
	atScrollEnd: boolean;
	/** Whether the page can scroll at all. */
	scrollable: boolean;
	/** Index of the TOC entry the URL hash points at, or -1. */
	hintedIndex?: number;
}

/**
 * Returns the index of the TOC entry to highlight, or -1 if there is none.
 */
export function activeTocIndex({
	headingTops,
	threshold,
	atScrollEnd,
	scrollable,
	hintedIndex = -1,
}: ActiveTocIndexInput): number {
	const lastIndex = headingTops.length - 1;
	if (lastIndex < 0) return -1;

	// The last heading above the threshold; the first entry if all are below it (= top of the page).
	let index = 0;
	for (let i = 0; i < headingTops.length; i++) {
		if (headingTops[i]! > threshold + TOLERANCE_PX) break;
		index = i;
	}
	if (!atScrollEnd) return index;

	// Below: the page is scrolled to the end and no heading can be brought to the threshold.

	// If an unreachable heading was picked from the TOC (= the hash points at it), prefer
	// that choice over the entry the scroll position implies.
	if (hintedIndex > index && hintedIndex <= lastIndex) return hintedIndex;

	// Once read down to the bottom, the last entry is the current one (as in VitePress).
	// A page that cannot scroll was not "read to the end", so keep the normal rule.
	return scrollable ? lastIndex : index;
}
