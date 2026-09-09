# ssg-for-single-page-site

Static Site Generator for a website which has multiple isolated single pages

## Usage

1. Install the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) for VS Code.
2. Run `Dev Containers: Reopen in Container` from the command palette.

On first creation, the Node.js / Python / Docker-in-Docker / Claude Code features are set up. The egress firewall, which only allows traffic to GitHub's public IP ranges and the domains listed in `.devcontainer/scripts/allowed-domains.txt`, is disabled by default.

- To enable the firewall, set `INIT_FIREWALL=true` on the host before opening (or rebuilding) the container. Once enabled, it is (re)applied every time the container starts.
- To add or change allowed domains, edit `.devcontainer/scripts/allowed-domains.txt` and rebuild the container. This file is installed outside the workspace by `onCreateCommand`, so changes only take effect after a rebuild.

## Astro Starlight demo site

This repository includes a demo documentation site built with [Astro Starlight](https://starlight.astro.build/). It is configured via `astro.config.mjs`, plus a small number of component overrides in `src/components/` and stylesheets in `src/styles/`, featuring Japanese/English content with local search and a two-pane layout with no page list and a table of contents shown in the left sidebar.

Customizations avoid component overrides where possible: CSS and route-middleware changes survive an upgrade, while overridden components need re-checking against upstream every time. Only `Sidebar` and `SiteTitle` are replaced. Places that do depend on Starlight internals are listed in `tests/unit/upstream-assumptions.test.ts`, which fails when an upgrade invalidates one of them.

### Structure

- `src/pages/ja/index.astro`, `src/pages/en/index.astro` — top page per locale, a generated list of the titles of every document in that locale (add one file per locale); both render `src/components/DocumentIndex.astro`
- `src/components/DocumentIndex.astro` — builds that list from the `docs` collection and wraps it in Starlight's `<StarlightPage>` so it keeps the normal page chrome (header, sidebar, search index)
- `src/content/docs/{a,b}/{ja,en}/index.md` — demo documents (including images, math, tables, and code; no links between documents), each with a Japanese and an English version kept side by side
- `src/i18n.ts` — supported locales (`ja` default / `en`) and `generateDocsId`/`localeOfDocsId`, which remap a content path like `a/en/index.md` to the Starlight slug `en/a` so URLs stay locale-prefixed (`/ja/a/`, `/en/a/`), including for the default locale
- `src/content.config.ts` — wires `generateDocsId` into the loader below
- `src/docsLoaderWithTitleFromHeading.ts` — wraps Starlight's `docsLoader` so a page title comes from the body's leading H1 instead of `title` frontmatter. `src/titleFromHeading.ts` parses the body as Markdown (not a regex), so a `#` inside a code block or frontmatter isn't mistaken for a heading. `src/remarkStripLeadingHeading.ts` then removes that same heading from the rendered body so it isn't shown twice
- `remark-breaks` (a dependency, wired up in `astro.config.mjs`) — renders a plain line break inside a paragraph as `<br>` instead of collapsing it into a space (code, inline code, and math are left alone; checked by `tests/e2e/build.test.ts`)
- `astro.config.mjs` — Starlight/Pagefind/KaTeX/`base`/i18n configuration (locales from `src/i18n.ts`), plus a `redirects` entry sending the site root to the default locale's top page (`/ja/`) — a static `<meta refresh>` page, or a real 3xx with an adapter that supports redirects
- `src/remarkHtmlImage.ts` — turns a raw `<img>` tag written in Markdown into the same mdast node as `![]()`, so it goes through Astro's image pipeline (relative path resolution, hashed output filenames) instead of being passed through untouched
- `src/portableBase.ts` — integration that lets the built site be placed under any directory, including one with non-ASCII characters in its name. Astro can't build directly with such a `base` (percent-encoding mismatches break links and asset paths), so the build runs under a placeholder ASCII base (`/__base__/`) and a final step rewrites it to the real `base` everywhere in the output (links, assets, inlined `BASE_URL`, canonical URLs, sitemap). It runs last among `integrations` so it sees what others (Pagefind, sitemap, …) wrote; a non-text file still carrying the placeholder fails the build
- `src/components/Sidebar.astro` — override that shows a table of contents (TOC) in the left sidebar instead of a page list
- `src/routeData.ts` — Starlight route middleware that moves the TOC off the route data into `Astro.locals.pageToc` for the left sidebar; clearing `starlightRoute.toc` removes Starlight's right sidebar without overriding the layout component
- `src/components/SiteTitle.astro` — override that puts the current page title where the site title normally goes, doubling as a back-to-top link; the header itself is left to the theme
- `src/components/PageToc.astro`, `src/components/PageTocList.astro` — the TOC itself, rendered from `Astro.locals.pageToc` instead of Starlight's `<TableOfContents />` (whose highlighting script can't be separated from its markup, so the markup — mirroring upstream — lives here too)
- `src/components/page-toc.ts` — custom element that keeps the TOC highlight in sync while scrolling: it feeds heading positions, scroll state, and the URL hash into the rule below and writes the result to `aria-current`
- `src/activeTocIndex.ts` — the highlighting rule: the active entry is the *last heading above the threshold* (the anchor landing position, `scroll-padding-top`), unlike Starlight's own intersection-band rule, which can jump depending on zoom and window size. Scrolling to the bottom highlights the last entry (VitePress-style)
- `src/styles/toc.css` — TOC styling: list/indent/current-entry rules (moved out of Starlight's scoped styles), plus this repo's tweaks — no underline on links, and only the first heading level shown by default, expanding for the currently displayed item (VuePress-style)
- `src/styles/page-title.css` — visually hides the page title Starlight renders in the body (it is shown in the header instead) while keeping the `<h1>` for the skip link and the heading hierarchy, and collapses the now-empty panel it sits in
- `src/styles/table.css` — table tweaks: cells boxed in with borders and zebra striping, where the Starlight default is row underlines only
- `src/styles/katex.css` — a file that only loads the KaTeX CSS needed for math rendering (no design customization)
- `tests/` — the test suite (see [Tests](#tests))

Everything else is left at the Starlight defaults (with `starlight-theme-nova` applied on top of them).

### Development

```sh
npm install
npm run dev
```

### Tests

The point of this repository is that you can drop in your own documents in place of `src/content/docs/` and get a site. The tests exist to keep that promise from silently breaking, so none of them depend on the demo documents.

```sh
npm test          # everything
npm run test:unit # unit tests + document checks (fast, no build)
npm run test:e2e  # real `astro build` against fixture documents
```

They run on Node's built-in test runner (`node --test`), so there are no test dependencies to install. Test files are TypeScript and are executed directly via Node's native type stripping.

| Path | What it covers |
| --- | --- |
| `tests/unit/` | The pure logic this project adds on top of Starlight: slug mapping (`i18n.test.ts`), the base-path rewrite (`portableBase.test.ts`), H1 title extraction (`titleFromHeading.test.ts`), the remark plugins (`remarkStripLeadingHeading.test.ts`, `remarkHtmlImage.test.ts`), and TOC highlighting (`activeTocIndex.test.ts`). `upstream-assumptions.test.ts` instead checks that the Starlight/theme internals the customizations rely on are still present — a failure means an upgrade needs following up, not that something is broken. |
| `tests/content/` | The documents actually sitting in `src/content/docs/`: every file maps to a slug, slugs don't collide, every file has a title, and every relative image reference resolves. Useful as an intake check after swapping in your own documents. |
| `tests/e2e/` | A real `astro build` against `tests/fixtures/docs/`. `build.test.ts` asserts on the generated HTML — URLs, titles, `<br>` line breaks, hashed images, KaTeX, the document list, TOC sidebar, Pagefind index, and the deployment path written into the output. `build-errors.test.ts` checks that misplaced documents fail with a message naming the offending file. `build-nonascii-base.test.ts` builds with a Japanese `base` and checks every place percent-encoding could break it. Both assert no file is left carrying the placeholder base. |

The E2E build runs with `--base /test-base/`, deliberately different from the configured `base`, so a hardcoded path anywhere would fail the test. Temporary projects are built under `tests/.tmp/` (gitignored).

When you swap in your own documents, `tests/content/` keeps working as-is; `tests/unit/` and `tests/e2e/` are independent of your content.

### Build

```sh
npm run build
```

Static HTML is output to `dist/`. The search index (Pagefind) is also generated automatically at build time.

### Deploying to a specific directory

The `base` option in `astro.config.mjs` specifies which subdirectory on the web server the site is deployed to. The default is `/starlight-demo/`.

```js
const base = '/starlight-demo/';
```

For example, to deploy under `https://example.com/starlight-demo/`, build as-is and place the contents of `dist/` directly into the web server's `starlight-demo/` directory (a subdirectory under the document root, not the document root itself). To deploy to a different path, change the value of `base` to that path before running `npm run build` (don't forget the trailing slash). To deploy at the root, change it to `base: '/'`.

To check it locally, serve `dist/` with any static server and access it under the same subpath as `base`. Run this from the repository root (running it inside `dist/` would create a symlink loop):

```sh
mkdir -p /tmp/webroot && ln -s "$(pwd)/dist" /tmp/webroot/starlight-demo
cd /tmp/webroot && python3 -m http.server 8080
# Access http://localhost:8080/starlight-demo/
```

`base` itself holds no page: it is an HTML page that redirects to the top page of the default locale (`/starlight-demo/ja/`, see the `redirects` entry in `astro.config.mjs`), which every static server serves as the directory index. A host that can redirect on its own can be pointed at that URL directly instead.

A `base` containing non-ASCII characters, such as `/日本語ディレクトリ/`, builds and deploys too (URLs carry it percent-encoded) — see `src/portableBase.ts`. One caveat: `npm run dev` serves under the ASCII placeholder (`http://localhost:4321/__base__/`, printed at startup) rather than `base`, and `npm run preview` can't serve a non-ASCII `base` at all (Astro's dev servers match the raw request path); check that case with the static server above instead.

Once the production origin is known, also set the `site` option in `astro.config.mjs` (e.g. `site: 'https://example.com'`). Without it, canonical URLs, `og:url`, and the sitemap are skipped.
