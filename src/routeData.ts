// Starlight route middleware: moves the table of contents out of the route data.
//
// Starlight renders the right sidebar (the TOC column) only when `starlightRoute.toc` is set —
// TwoColumnContent, PageSidebar and the `data-has-toc` attribute of Page.astro all check it.
// This site shows the TOC in the left sidebar instead (see src/components/Sidebar.astro), so the
// TOC is taken off the route data here: the right column then disappears without overriding any
// component, and the layout of Starlight (and of the theme, which overrides TwoColumnContent as
// well) is left untouched.
//
// The TOC itself is still needed, so it is handed to src/components/PageToc.astro through a local
// of our own.
import { defineRouteMiddleware, type StarlightRouteData } from '@astrojs/starlight/route-data';

declare global {
	namespace App {
		interface Locals {
			/** Table of contents of the current page, for the left sidebar to render. */
			pageToc: StarlightRouteData['toc'];
		}
	}
}

export const onRequest = defineRouteMiddleware((context) => {
	const { starlightRoute } = context.locals;
	context.locals.pageToc = starlightRoute.toc;
	starlightRoute.toc = undefined;
});
