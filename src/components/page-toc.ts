/**
 * Drives the table-of-contents highlight (src/components/PageToc.astro) from scroll position.
 * The rule for picking an entry lives in src/activeTocIndex.ts; this element only gathers the
 * browser inputs (heading positions, scroll amount, hash) and reflects the result in
 * aria-current, keeping the rule itself unit-testable.
 */
import { activeTocIndex } from '../activeTocIndex.ts';

/** Tolerance for detecting the bottom of the page (zoom makes the scroll amount fractional). */
const SCROLL_END_TOLERANCE_PX = 2;

/** Normalizes a link hash so encoding differences don't matter. */
function normalizeHash(hash: string): string {
	try {
		return decodeURIComponent(hash);
	} catch {
		return hash;
	}
}

class PageToc extends HTMLElement {
	/** TOC links and the headings they point at, in the same order; only headings that exist. */
	private links: HTMLAnchorElement[] = [];
	private headings: HTMLElement[] = [];
	private currentLink: HTMLAnchorElement | null = null;
	private frame = 0;
	private resizeObserver: ResizeObserver | null = null;

	/**
	 * Boundary at which a heading becomes the current one. It should match where an anchor lands
	 * when a TOC entry is clicked, so the effective scroll-padding-top is read as-is.
	 * (Measuring instead of trusting Starlight's value means nothing to follow up if it changes.)
	 */
	private get threshold(): number {
		const value = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop);
		return Number.isFinite(value) ? value : 0;
	}

	private hintedIndex(): number {
		const hash = normalizeHash(location.hash);
		if (!hash) return -1;
		return this.links.findIndex((link) => normalizeHash(link.hash) === hash);
	}

	private update = (): void => {
		const maxScrollY = document.documentElement.scrollHeight - window.innerHeight;
		const index = activeTocIndex({
			headingTops: this.headings.map((heading) => heading.getBoundingClientRect().top),
			threshold: this.threshold,
			atScrollEnd: window.scrollY >= maxScrollY - SCROLL_END_TOLERANCE_PX,
			scrollable: maxScrollY > SCROLL_END_TOLERANCE_PX,
			hintedIndex: this.hintedIndex(),
		});
		const link = this.links[index];
		if (!link || link === this.currentLink) return;
		this.currentLink?.removeAttribute('aria-current');
		link.setAttribute('aria-current', 'true');
		this.currentLink = link;
	};

	/** Coalesce recalculation into one per animation frame while scrolling. */
	private schedule = (): void => {
		if (this.frame) return;
		this.frame = requestAnimationFrame(() => {
			this.frame = 0;
			this.update();
		});
	};

	connectedCallback(): void {
		for (const link of this.querySelectorAll('a')) {
			const heading = document.getElementById(normalizeHash(link.hash).slice(1));
			if (!heading) continue;
			this.links.push(link);
			this.headings.push(heading);
		}
		this.currentLink = this.querySelector('a[aria-current="true"]');

		window.addEventListener('scroll', this.schedule, { passive: true });
		window.addEventListener('resize', this.schedule);
		window.addEventListener('hashchange', this.schedule);
		// Loading images or fonts changes the height of the body, which moves the headings even
		// without scrolling. Observe the size change itself and follow it.
		this.resizeObserver = new ResizeObserver(this.schedule);
		this.resizeObserver.observe(document.documentElement);
		this.update();
	}

	disconnectedCallback(): void {
		window.removeEventListener('scroll', this.schedule);
		window.removeEventListener('resize', this.schedule);
		window.removeEventListener('hashchange', this.schedule);
		this.resizeObserver?.disconnect();
		if (this.frame) cancelAnimationFrame(this.frame);
	}
}

customElements.define('page-toc', PageToc);
