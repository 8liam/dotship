import {access, mkdir, stat, writeFile} from 'node:fs/promises';
import {dirname, join, resolve} from 'node:path';
import {homedir} from 'node:os';
import {parse as parseYaml} from 'yaml';

export type RepoItem = {
	name: string;
	type: 'file' | 'dir';
	path: string;
};

export function parseGitHubUrl(
	url: string,
): {owner: string; repo: string} | undefined {
	const match = url.match(/github\.com\/([^/\s]+)\/([^/\s]+)/);
	if (!match?.[1] || !match[2]) return undefined;
	return {owner: match[1], repo: match[2].replace(/\.git$/, '')};
}

export async function fetchRepoContents(
	owner: string,
	repo: string,
	path = '',
): Promise<RepoItem[]> {
	const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
	const response = await fetch(url, {
		headers: {Accept: 'application/vnd.github.v3+json'},
	});

	if (!response.ok) {
		throw new Error(`GitHub API error: ${response.status}`);
	}

	const data = (await response.json()) as Array<{
		name: string;
		type: string;
		path: string;
	}>;

	return data
		.map(item => ({
			name: item.name,
			type: item.type === 'dir' ? ('dir' as const) : ('file' as const),
			path: item.path,
		}))
		.sort((a, b) => {
			if (a.type === b.type) return a.name.localeCompare(b.name);
			return a.type === 'dir' ? -1 : 1;
		});
}

export async function fetchFileContent(
	owner: string,
	repo: string,
	path: string,
): Promise<string> {
	const url = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${path}`;
	const response = await fetch(url);
	if (!response.ok) {
		throw new Error(`Failed to fetch file: ${response.status}`);
	}

	return response.text();
}

export async function fileExists(filePath: string): Promise<boolean> {
	try {
		await access(filePath);
		return true;
	} catch {
		return false;
	}
}

export function expandTilde(p: string): string {
	if (p === '~') return homedir();
	if (p.startsWith('~/') || p.startsWith('~\\')) {
		return join(homedir(), p.slice(2));
	}

	return p;
}

export async function resolveDestination(
	dest: string,
	fileName: string,
): Promise<string> {
	const expanded = expandTilde(dest);
	const endsWithSep = dest.endsWith('/') || dest.endsWith('\\');
	const resolved = resolve(expanded);

	if (endsWithSep) {
		return join(resolved, fileName);
	}

	try {
		const stats = await stat(resolved);
		if (stats.isDirectory()) {
			return join(resolved, fileName);
		}
	} catch {
		// Path doesn't exist yet — treat as a file path
	}

	return resolved;
}

export async function writeFileToPath(
	destPath: string,
	content: string,
): Promise<void> {
	await mkdir(dirname(destPath), {recursive: true});
	await writeFile(destPath, content, 'utf8');
}

export type ManifestFile = {
	files: Record<string, string>;
};

export function parseManifest(content: string): ManifestFile | undefined {
	try {
		const parsed = parseYaml(content) as unknown;
		if (
			typeof parsed !== 'object' ||
			parsed === null ||
			!('files' in parsed)
		) {
			return undefined;
		}

		const {files} = parsed as {files: unknown};
		if (typeof files !== 'object' || files === null || Array.isArray(files)) {
			return undefined;
		}

		for (const [key, value] of Object.entries(files)) {
			if (typeof key !== 'string' || typeof value !== 'string') {
				return undefined;
			}
		}

		return {files: files as Record<string, string>};
	} catch {
		return undefined;
	}
}

export async function fetchManifest(
	owner: string,
	repo: string,
): Promise<ManifestFile | undefined> {
	const url = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/.dotship.yml`;
	try {
		const response = await fetch(url);
		if (!response.ok) {
			return undefined;
		}

		const content = await response.text();
		return parseManifest(content);
	} catch {
		return undefined;
	}
}
