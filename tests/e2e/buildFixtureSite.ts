// Helper that reproduces the situation of swapping in different documents.
// It creates a temporary project with the config and sources of the repository as-is and only
// src/content/docs replaced by a fixture, then runs `astro build` there.
import { execFile } from 'node:child_process';
import { cp, mkdir, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

/** What is copied into the temporary project. node_modules resolves from the parent (the repo). */
const PROJECT_FILES = ['astro.config.mjs', 'package.json', 'tsconfig.json', 'public', 'src'];

export interface BuildResult {
	/** Whether the build succeeded. */
	ok: boolean;
	/** Absolute path of the output directory (dist). */
	distDir: string;
	/** stdout and stderr of astro build, concatenated. */
	output: string;
}

export interface BuildOptions {
	/** Fixture directory to put at content/docs, given as a path relative to tests/. */
	docsFixture: string;
	/** Name of the temporary project directory (different per test). */
	name: string;
	/** Astro base. Differing from the production config also proves base is not hardcoded. */
	base: string;
}

/**
 * Builds the site for real with the fixture documents.
 * A failed build is returned as `ok: false` rather than thrown, since some tests expect one.
 */
export async function buildFixtureSite({ docsFixture, name, base }: BuildOptions): Promise<BuildResult> {
	const projectDir = path.join(repoRoot, 'tests/.tmp', name);
	await rm(projectDir, { recursive: true, force: true });
	await mkdir(projectDir, { recursive: true });

	for (const entry of PROJECT_FILES) {
		await cp(path.join(repoRoot, entry), path.join(projectDir, entry), { recursive: true });
	}
	// Build with the fixtures only, not the demo documents.
	await rm(path.join(projectDir, 'src/content/docs'), { recursive: true, force: true });
	await cp(path.join(repoRoot, 'tests', docsFixture), path.join(projectDir, 'src/content/docs'), {
		recursive: true,
	});

	const astroBin = path.join(repoRoot, 'node_modules/.bin/astro');
	try {
		const { stdout, stderr } = await execFileAsync(
			astroBin,
			['build', '--root', projectDir, '--base', base],
			{ cwd: repoRoot, env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' }, maxBuffer: 32 * 1024 * 1024 }
		);
		return { ok: true, distDir: path.join(projectDir, 'dist'), output: `${stdout}\n${stderr}` };
	} catch (error) {
		const { stdout = '', stderr = '', message = '' } = error as {
			stdout?: string;
			stderr?: string;
			message?: string;
		};
		return {
			ok: false,
			distDir: path.join(projectDir, 'dist'),
			output: `${stdout}\n${stderr}\n${message}`,
		};
	}
}

/** Assumes the build succeeds; fails with the build log otherwise. */
export async function buildFixtureSiteOrThrow(options: BuildOptions): Promise<BuildResult> {
	const result = await buildFixtureSite(options);
	if (!result.ok) {
		throw new Error(`failed to build the fixture site:\n${result.output}`);
	}
	return result;
}

/** Lists the files under dist, as paths relative to dist. */
export async function listFiles(dir: string, prefix = ''): Promise<string[]> {
	const found: string[] = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
		if (entry.isDirectory()) {
			found.push(...(await listFiles(path.join(dir, entry.name), relative)));
		} else {
			found.push(relative);
		}
	}
	return found.sort();
}
