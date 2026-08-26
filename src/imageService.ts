// Image service that leaves every image exactly as Vite emitted it.
//
// Astro's built-in services (sharp and passthroughImageService alike) are "local" services:
// during the build Astro re-emits each image under a new hashed name, locating the source file
// by stripping `base` off the URL of the imported asset. Vite percent-encodes that URL while
// Astro compares it against the raw `base`, so a `base` containing non-ASCII characters (e.g.
// a Japanese directory name) never matches. The build then fails looking for the file under
// dist/<base>/_astro/, and the src of every <img> ends up with the base twice, the second one
// double-encoded.
//
// A service without `transform` is an "external" service, which Astro does not process at build
// time: the file Vite already wrote to _astro/ is used directly, through the URL Vite generated
// for it (hashed, with the base correctly encoded). Since this site does not resize or re-encode
// images anyway (that is why passthroughImageService was used), nothing is lost by that.
import type { ExternalImageService } from 'astro';
import { isESMImportedImage } from 'astro/assets/utils';
import noopService from 'astro/assets/services/noop';

const imageService: ExternalImageService = {
	// Validation and the HTML attributes (width/height/loading/...) stay Astro's own behaviour.
	validateOptions: noopService.validateOptions,
	getHTMLAttributes: noopService.getHTMLAttributes,
	// An imported image already carries its final URL in `src`. Anything else (a remote URL or a
	// file under public/) is used as it was written.
	getURL: (options) => (isESMImportedImage(options.src) ? options.src.src : options.src),
	// No variants are generated, so srcset has nothing to list.
	getSrcSet: () => [],
};

export default imageService;
