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

Customizations are deliberately kept as CSS wherever possible: a stylesheet applied to Starlight's default output survives an upgrade, while an overridden component has to be re-checked against upstream every time. Only two components (`Sidebar`, `TwoColumnContent`) are wholesale replacements of a default, and `SiteTitle` is a small one; the TOC (`PageToc`) is rendered by components of our own rather than by overriding Starlight's, so upstream changes cannot silently break it. The few places that do depend on Starlight internals are listed in `tests/unit/upstream-assumptions.test.ts`, which fails when an upgrade invalidates one of them.

### Structure

- `src/pages/index.astro`, `src/pages/en/index.astro` — top page per locale, a generated list of the titles of every document in that locale (add one file per locale); both render `src/components/DocumentIndex.astro`
- `src/components/DocumentIndex.astro` — builds that list from the `docs` collection and wraps it in Starlight's `<StarlightPage>` so it keeps the normal page chrome (header, sidebar, search index)
- `src/content/docs/{a,b}/{ja,en}/index.md` — demo documents (including images, math, tables, and code; no links between documents), each with a Japanese and an English version kept side by side
- `src/i18n.ts` — single source of truth for the supported locales (`ja` default / `en`) and `generateDocsId`/`localeOfDocsId`, which remap a content path like `a/en/index.md` to the Starlight slug `en/a` so the doc-then-locale directory layout above still produces Starlight's expected locale-prefixed URLs (`/a/` for the default locale, `/en/a/` otherwise)
- `src/content.config.ts` — wires `generateDocsId` into the loader below
- `src/docsLoaderWithTitleFromHeading.ts` — wraps Starlight's `docsLoader` so a page title comes from the leading H1 of the body instead of a `title` frontmatter field (the H1 lookup itself lives in `src/titleFromHeading.ts`, which skips fenced code blocks so a `#` comment isn't mistaken for a heading); `src/remarkStripLeadingHeading.ts` then removes that H1 from the rendered body so it isn't shown twice
- `astro.config.mjs` — Starlight/Pagefind/KaTeX/`base`/i18n (`locales: starlightLocales` from `src/i18n.ts`) configuration
- `src/remarkBreaks.ts` — renders a plain line break inside a paragraph as `<br>` instead of collapsing it into a space, so a document reads the way it was written (only `text` nodes are touched, so code blocks, inline code, and math are left alone)
- `src/remarkHtmlImage.ts` — turns a raw `<img>` tag written in Markdown into the same mdast node as `![]()`, so it goes through Astro's image pipeline (relative path resolution, hashed output filenames) instead of being passed through untouched
- `src/imageService.ts` — the image service used in place of `passthroughImageService()`: every image is served at the URL Vite emitted for it (`_astro/<hashed name>`) instead of being copied to a further hashed name at build time. Astro's built-in services find the file to copy by stripping `base` off that URL as it is written in the config, which stops matching as soon as URLs percent-encode the base, so a `base` containing non-ASCII characters would fail the build. Neither way optimizes anything, since this site does not resize or re-encode images
- `src/asciiDevBase.ts` — integration that lets `astro dev` run with such a `base` as well: the dev server also matches the raw `base` against the percent-encoded request path, so every page would answer 404. It serves the site at the root instead (with a warning at startup); `astro build` keeps the configured `base`
- `src/starlightEncodedBase.ts` — integration for the same mismatch inside Starlight: two of its helpers strip `base` off the path of the current page by comparing it with the raw `base`, so with a percent-encoded one the language switcher would link to `/en/<base>/…` (the locale in front of the base, a 404) and a page rendered by `<StarlightPage>` — the top page of each locale — would not be recognised as being in its locale. A Vite plugin rewrites how those two read `base`, and does nothing for a `base` that URLs leave as it is
- `src/components/Sidebar.astro` — override that shows a table of contents (TOC) in the left sidebar instead of a page list
- `src/components/TwoColumnContent.astro` — override that removes the right sidebar (originally the TOC column) to produce a two-pane layout
- `src/components/SiteTitle.astro` — override that puts the current page title where the site title normally goes, doubling as a back-to-top link; the header itself is left to the theme
- `src/components/PageToc.astro`, `src/components/PageTocList.astro` — the TOC itself, rendered from the route data (`Astro.locals.starlightRoute.toc`) instead of using Starlight's `<TableOfContents />`. Starlight's component ships its highlighting script with its markup and the two cannot be separated, so the markup is kept here as well (it mirrors the upstream one)
- `src/components/page-toc.ts` — custom element that keeps the TOC highlight in sync while scrolling: it feeds heading positions, scroll state, and the URL hash into the rule below and writes the result to `aria-current`
- `src/activeTocIndex.ts` — the highlighting rule itself: the active entry is the *last heading above the threshold*, the threshold being the anchor landing position (`scroll-padding-top`) read from the page, so clicking a TOC entry always highlights exactly that entry. Starlight's own rule (whichever element happens to intersect a 53px band below the header, first match wins) makes the highlight jump to the entry above or below depending on browser zoom, window size, and heading spacing. Scrolling to the very bottom highlights the last entry (VitePress-style), and a heading too close to the bottom to reach the threshold is honoured through the URL hash when it is clicked
- `src/styles/toc.css` — TOC styling: the list/indent/current-entry rules that Starlight's own TOC component carried in its scoped styles, plus the tweaks of this repository (no underline on links, and only the first heading level shown by default, expanding child headings for the currently displayed item, VuePress-style)
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
| `tests/unit/` | The pure logic this project adds on top of Starlight: `generateDocsId` / `localeOfDocsId` slug mapping and locale-config consistency (`i18n.test.ts`), H1 title extraction including the code-fence exclusion (`titleFromHeading.test.ts`), the remark plugins (`remarkStripLeadingHeading.test.ts`, `remarkHtmlImage.test.ts`, `remarkBreaks.test.ts`), and the TOC highlighting rule at its boundary values (`activeTocIndex.test.ts`). `upstream-assumptions.test.ts` is different in kind: it reads the installed Starlight / theme sources and asserts that the internals the customizations lean on are still there. A failure there means an upgrade needs following up on, not that something is broken. |
| `tests/content/` | The documents actually sitting in `src/content/docs/`: every file maps to a slug, slugs don't collide, every file has a title, and every relative image reference resolves. Useful as an intake check after swapping in your own documents. |
| `tests/e2e/` | A real `astro build`. `build.test.ts` builds a temporary project whose `src/content/docs/` is replaced by `tests/fixtures/docs/` and asserts on the generated HTML — URLs, titles, no duplicated `<h1>`, line breaks kept as `<br>` (but not inside code blocks), hashed image assets from both `![]()` and raw `<img>`, KaTeX output, the per-locale document list, `lang` attributes, the TOC sidebar, and the Pagefind index. `build-errors.test.ts` checks that misplaced documents fail the build with a message that names the offending file. `build-nonascii-base.test.ts` builds with a Japanese `base` and checks what percent-encoding it breaks: image URLs, the language switcher, and the locale of a page rendered by `<StarlightPage>`. |

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

A `base` containing non-ASCII characters, such as `/日本語ディレクトリ/`, builds and deploys as well (URLs then carry it percent-encoded; see `src/imageService.ts` and `src/starlightEncodedBase.ts` for what that takes). Only the local servers of Astro are affected, because they match the request path against `base` as it is written while a browser sends it encoded: `npm run dev` serves the site at the root instead and says so at startup (see `src/asciiDevBase.ts`), and `npm run preview` cannot serve it at all — check the build output with the static server above, symlinking `dist` under the directory name of the base.

Once the production origin is known, also set the `site` option in `astro.config.mjs` (e.g. `site: 'https://example.com'`). Without it, canonical URLs, `og:url`, and the sitemap are skipped.
