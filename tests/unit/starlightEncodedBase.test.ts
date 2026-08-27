// The source rewrite that makes Starlight strip a percent-encoded `base` off the current path
// (see src/starlightEncodedBase.ts). The rewrite is a string replacement in upstream code, so it
// has to be loud when the code it looks for is gone; tests/unit/upstream-assumptions.test.ts
// checks the installed Starlight still contains it.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { patchBaseExpression, patchedModuleOf, PATCHED_MODULES } from '../../src/starlightEncodedBase.ts';

describe('patchBaseExpression', () => {
	it('encodes the base the module compares against the path', () => {
		const code = "const base = stripTrailingSlash(import.meta.env.BASE_URL);\nif (p.startsWith(base)) {}";
		assert.equal(
			patchBaseExpression(code, 'upstream.ts'),
			"const base = stripTrailingSlash(encodeURI(import.meta.env.BASE_URL));\nif (p.startsWith(base)) {}"
		);
	});

	it('throws with the name of the module when the expression is gone', () => {
		assert.throws(
			() => patchBaseExpression('const base = getBase();', 'upstream.ts'),
			/upstream\.ts.*src\/starlightEncodedBase\.ts/s
		);
	});
});

describe('patchedModuleOf', () => {
	it('matches the upstream modules wherever node_modules is resolved from', () => {
		for (const modulePath of PATCHED_MODULES) {
			assert.equal(patchedModuleOf(`/repo/node_modules/${modulePath}`), modulePath);
			assert.equal(patchedModuleOf(`/repo/node_modules/${modulePath}?astro&type=script`), modulePath);
		}
	});

	it('matches nothing else', () => {
		assert.equal(patchedModuleOf('/repo/src/i18n.ts'), undefined);
		assert.equal(patchedModuleOf('/repo/node_modules/@astrojs/starlight/utils/base.ts'), undefined);
		assert.equal(patchedModuleOf('/repo/node_modules/other/utils/slugs.ts'), undefined);
	});
});
