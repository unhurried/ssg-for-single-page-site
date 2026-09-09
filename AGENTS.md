# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Astro Starlight-based static site generator for standalone single-page documents (Japanese/English). See `README.md` for the full architecture writeup, per-file responsibilities, and the `base`-path deployment mechanics — read it before touching `src/portableBase.ts`, `src/i18n.ts`, or anything under `src/components/`.

## Commands

```sh
npm run dev          # dev server (serves under the placeholder base __base__, not the configured base)
npm run build         # astro build -> dist/, includes Pagefind index
npm run preview       # serve the built dist/ (uses the configured base as-is)
npm test              # test:unit + test:e2e
npm run test:unit     # tests/unit + tests/content, fast, no build
npm run test:e2e      # tests/e2e, real astro build against fixtures, run serially
```

Run a single test file directly with Node's built-in runner (no test deps to install; `.ts` files run via native type stripping):

```sh
node --test tests/unit/activeTocIndex.test.ts
node --test --test-concurrency=1 tests/e2e/build.test.ts
node --test --test-name-pattern="<name>" tests/unit/i18n.test.ts
```

`tests/e2e/*` build temporary projects under `tests/.tmp/` (gitignored) with `--base /test-base/`, deliberately different from `astro.config.mjs`'s configured base, to catch hardcoded paths.

## Architecture notes

- Content lives at `src/content/docs/{docName}/{locale}/index.md`; `src/i18n.ts` remaps that doc-then-locale layout to Starlight's expected locale-prefixed slugs (`generateDocsId`/`localeOfDocsId`). Changing the locale list or the directory convention means updating that file and the loader wiring in `src/content.config.ts`.
- Page titles come from the document's leading H1 (`src/titleFromHeading.ts` + `src/docsLoaderWithTitleFromHeading.ts`), not frontmatter; `src/remarkStripLeadingHeading.ts` strips that same heading from the rendered body using the identical `leadingHeadingIndex` so title and body can't disagree.
- Left-sidebar TOC (VitePress-style, replacing Starlight's right-sidebar TOC) flows through `src/routeData.ts` (route middleware) → `Astro.locals.pageToc` → `src/components/PageToc.astro`/`PageTocList.astro`. Scroll-highlighting logic is isolated in `src/activeTocIndex.ts` (pure function, unit-tested at its boundary values) and wired up by the custom element in `src/components/page-toc.ts`.
- Customizations prefer CSS-on-default-output or route-middleware over component overrides, specifically to survive Starlight upgrades; only `Sidebar.astro` and `SiteTitle.astro` are actual overrides. `tests/unit/upstream-assumptions.test.ts` pins the Starlight/theme internals the rest of the code depends on — a failure there means an upstream upgrade needs follow-up, not that app code is broken.
- `src/portableBase.ts` lets the built site deploy under any `base`, including non-ASCII paths: the build always runs under an ASCII placeholder base and this integration rewrites it to the real `base` as the last build step (must stay last in `astro.config.mjs`'s `integrations`). `npm run dev` therefore serves under the placeholder, not the configured `base`.
- `tests/content/` validates whatever documents currently sit in `src/content/docs/` (slugs, titles, image references) and is meant to keep working unmodified when real content replaces the demo docs; `tests/unit/` and `tests/e2e/` test the framework code itself and are content-independent.
