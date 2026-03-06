import React from 'react';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {EventEmitter} from 'node:events';
import test from 'ava';
import {render as inkRender} from 'ink';
import {
	parseGitHubUrl,
	resolveDestination,
	parseManifest,
} from './source/utils/github.js';
import RepoBrowser from './source/components/RepoBrowser.js';
import FileConfirm from './source/components/FileConfirm.js';
import DestinationInput from './source/components/DestinationInput.js';
import CommandInput from './source/components/CommandInput.js';
import ManifestReview from './source/components/ManifestReview.js';
import ManifestDone from './source/components/ManifestDone.js';
import ManifestPrompt from './source/components/ManifestPrompt.js';
import type {RepoItem} from './source/utils/github.js';
import type {ReactElement} from 'react';

// ── Custom render helper ────────────────────────────────────────────────
// ink-testing-library@3's mock stdin is missing ref/unref/read that ink@4
// needs when useInput enables raw mode. This helper provides them.

class MockStdout extends EventEmitter {
	frames: string[] = [];
	columns = 100;
	rows = 40;

	write = (frame: string) => {
		this.frames.push(frame);
	};

	lastFrame = () => this.frames[this.frames.length - 1];
}

class MockStdin extends EventEmitter {
	isTTY = true;
	private buffer: string[] = [];

	write = (data: string) => {
		this.buffer.push(data);
		this.emit('readable');
	};

	read = () => this.buffer.shift() ?? null;
	setEncoding() {}
	setRawMode() {}
	resume() {}
	pause() {}
	ref() {}
	unref() {}
}

function render(tree: ReactElement) {
	const stdout = new MockStdout();
	const stderr = new MockStdout();
	const stdin = new MockStdin();

	const instance = inkRender(tree, {
		stdout: stdout as any,
		stderr: stderr as any,
		stdin: stdin as any,
		debug: true,
		exitOnCtrlC: false,
		patchConsole: false,
	});

	return {
		rerender: instance.rerender,
		unmount: instance.unmount,
		cleanup: instance.cleanup,
		stdout,
		stderr,
		stdin,
		frames: stdout.frames,
		lastFrame: stdout.lastFrame,
	};
}

// ── Helpers ─────────────────────────────────────────────────────────────

const noop = () => {
	/* no-op */
};

const ARROW_DOWN = '\u001B[B';
const ENTER = '\r';
const BACKSPACE = '\u007F';

const delay = (ms = 50) =>
	new Promise<void>(resolve => {
		setTimeout(resolve, ms);
	});

// ── parseGitHubUrl ──────────────────────────────────────────────────────

test('parseGitHubUrl — parses a standard https URL', t => {
	const result = parseGitHubUrl('https://github.com/user/repo');
	t.deepEqual(result, {owner: 'user', repo: 'repo'});
});

test('parseGitHubUrl — strips .git suffix', t => {
	const result = parseGitHubUrl('https://github.com/user/repo.git');
	t.deepEqual(result, {owner: 'user', repo: 'repo'});
});

test('parseGitHubUrl — works with nested path after repo', t => {
	const result = parseGitHubUrl('https://github.com/user/repo/tree/main/src');
	t.deepEqual(result, {owner: 'user', repo: 'repo'});
});

test('parseGitHubUrl — returns undefined for non-GitHub URL', t => {
	t.is(parseGitHubUrl('https://gitlab.com/user/repo'), undefined);
});

test('parseGitHubUrl — returns undefined for empty string', t => {
	t.is(parseGitHubUrl(''), undefined);
});

test('parseGitHubUrl — returns undefined for incomplete URL', t => {
	t.is(parseGitHubUrl('https://github.com/user'), undefined);
});

test('parseGitHubUrl — returns undefined for random text', t => {
	t.is(parseGitHubUrl('not a url at all'), undefined);
});

// ── resolveDestination ──────────────────────────────────────────────────

test('resolveDestination — expands tilde to home directory', async t => {
	const result = await resolveDestination('~/myfile.txt', 'fallback.txt');
	t.is(result, join(homedir(), 'myfile.txt'));
});

test('resolveDestination — tilde with subdirectory', async t => {
	const result = await resolveDestination(
		'~/.config/ghostty/config',
		'fallback.txt',
	);
	t.is(result, join(homedir(), '.config', 'ghostty', 'config'));
});

test('resolveDestination — trailing slash appends filename', async t => {
	const result = await resolveDestination('/tmp/mydir/', 'config');
	t.is(result, join('/tmp/mydir', 'config'));
});

test('resolveDestination — tilde with trailing slash appends filename', async t => {
	const result = await resolveDestination('~/.config/ghostty/', 'config');
	t.is(result, join(homedir(), '.config', 'ghostty', 'config'));
});

test('resolveDestination — existing directory appends filename', async t => {
	const tmpDir = await mkdtemp(join(tmpdir(), 'dotship-test-'));
	try {
		const result = await resolveDestination(tmpDir, 'myfile.txt');
		t.is(result, join(tmpDir, 'myfile.txt'));
	} finally {
		await rm(tmpDir, {recursive: true});
	}
});

test('resolveDestination — non-existent path treated as file', async t => {
	const result = await resolveDestination(
		'/tmp/nonexistent-dotship-path/custom-name.conf',
		'fallback.txt',
	);
	t.is(result, '/tmp/nonexistent-dotship-path/custom-name.conf');
});

test('resolveDestination — bare tilde with slash resolves to home + filename', async t => {
	const result = await resolveDestination('~/', 'config');
	t.is(result, join(homedir(), 'config'));
});

// ── RepoBrowser ─────────────────────────────────────────────────────────

const sampleItems: RepoItem[] = [
	{name: 'src', type: 'dir', path: 'src'},
	{name: 'docs', type: 'dir', path: 'docs'},
	{name: 'README.md', type: 'file', path: 'README.md'},
	{name: 'package.json', type: 'file', path: 'package.json'},
];

test('RepoBrowser — renders owner/repo and path', t => {
	const {lastFrame, unmount} = render(
		<RepoBrowser
			owner="acme"
			repo="dotfiles"
			path={[]}
			items={sampleItems}
			onSelectDir={noop}
			onSelectFile={noop}
			onBack={noop}
		/>,
	);
	const frame = lastFrame()!;
	t.true(frame.includes('acme/dotfiles'));
	t.true(frame.includes('/'));
	unmount();
});

test('RepoBrowser — renders nested path', t => {
	const {lastFrame, unmount} = render(
		<RepoBrowser
			owner="acme"
			repo="dotfiles"
			path={['src', 'components']}
			items={sampleItems}
			onSelectDir={noop}
			onSelectFile={noop}
			onBack={noop}
		/>,
	);
	t.true(lastFrame()!.includes('src/components'));
	unmount();
});

test('RepoBrowser — renders all items', t => {
	const {lastFrame, unmount} = render(
		<RepoBrowser
			owner="acme"
			repo="dotfiles"
			path={[]}
			items={sampleItems}
			onSelectDir={noop}
			onSelectFile={noop}
			onBack={noop}
		/>,
	);
	const frame = lastFrame()!;
	for (const item of sampleItems) {
		t.true(frame.includes(item.name), `should contain ${item.name}`);
	}

	unmount();
});

test('RepoBrowser — first item is selected by default', t => {
	const {lastFrame, unmount} = render(
		<RepoBrowser
			owner="acme"
			repo="dotfiles"
			path={[]}
			items={sampleItems}
			onSelectDir={noop}
			onSelectFile={noop}
			onBack={noop}
		/>,
	);
	const frame = lastFrame()!;
	t.true(frame.includes('> '));
	const lines = frame.split('\n');
	const selectedLine = lines.find(l => l.includes('> '));
	t.truthy(selectedLine);
	t.true(selectedLine!.includes('src'));
	unmount();
});

test('RepoBrowser — down arrow moves cursor', async t => {
	const {lastFrame, stdin, unmount} = render(
		<RepoBrowser
			owner="acme"
			repo="dotfiles"
			path={[]}
			items={sampleItems}
			onSelectDir={noop}
			onSelectFile={noop}
			onBack={noop}
		/>,
	);

	await delay();
	stdin.write(ARROW_DOWN);
	await delay();

	const lines = lastFrame()!.split('\n');
	const selectedLine = lines.find(l => l.includes('> '));
	t.truthy(selectedLine);
	t.true(selectedLine!.includes('docs'));
	unmount();
});

test('RepoBrowser — enter on dir calls onSelectDir', async t => {
	t.plan(1);
	const {stdin, unmount} = render(
		<RepoBrowser
			owner="acme"
			repo="dotfiles"
			path={[]}
			items={sampleItems}
			onSelectDir={dirPath => {
				t.is(dirPath, 'src');
			}}
			onSelectFile={noop}
			onBack={noop}
		/>,
	);

	await delay();
	stdin.write(ENTER);
	await delay();
	unmount();
});

test('RepoBrowser — enter on file calls onSelectFile', async t => {
	t.plan(2);
	const {stdin, unmount} = render(
		<RepoBrowser
			owner="acme"
			repo="dotfiles"
			path={[]}
			items={sampleItems}
			onSelectDir={noop}
			onSelectFile={(filePath, fileName) => {
				t.is(filePath, 'README.md');
				t.is(fileName, 'README.md');
			}}
			onBack={noop}
		/>,
	);

	await delay();
	stdin.write(ARROW_DOWN);
	await delay();
	stdin.write(ARROW_DOWN);
	await delay();
	stdin.write(ENTER);
	await delay();
	unmount();
});

test('RepoBrowser — backspace calls onBack', async t => {
	t.plan(1);
	const {stdin, unmount} = render(
		<RepoBrowser
			owner="acme"
			repo="dotfiles"
			path={[]}
			items={sampleItems}
			onSelectDir={noop}
			onSelectFile={noop}
			onBack={() => {
				t.pass();
			}}
		/>,
	);

	await delay();
	stdin.write(BACKSPACE);
	await delay();
	unmount();
});

test('RepoBrowser — shows help text', t => {
	const {lastFrame, unmount} = render(
		<RepoBrowser
			owner="acme"
			repo="dotfiles"
			path={[]}
			items={sampleItems}
			onSelectDir={noop}
			onSelectFile={noop}
			onBack={noop}
		/>,
	);
	t.true(lastFrame()!.includes('navigate'));
	t.true(lastFrame()!.includes('backspace'));
	unmount();
});

// ── FileConfirm ─────────────────────────────────────────────────────────

test('FileConfirm — renders file info', t => {
	const {lastFrame, unmount} = render(
		<FileConfirm
			fileName="config"
			sourcePath=".config/ghostty/config"
			destPath="/home/user/.config/ghostty/config"
			willOverwrite={false}
			onConfirm={noop}
			onBack={noop}
		/>,
	);
	const frame = lastFrame()!;
	t.true(frame.includes('config'));
	t.true(frame.includes('.config/ghostty/config'));
	t.true(frame.includes('/home/user/.config/ghostty/config'));
	unmount();
});

test('FileConfirm — shows overwrite warning when willOverwrite is true', t => {
	const {lastFrame, unmount} = render(
		<FileConfirm
			fileName="config"
			sourcePath="config"
			destPath="/tmp/config"
			willOverwrite={true}
			onConfirm={noop}
			onBack={noop}
		/>,
	);
	t.true(lastFrame()!.includes('overwritten'));
	unmount();
});

test('FileConfirm — hides overwrite warning when willOverwrite is false', t => {
	const {lastFrame, unmount} = render(
		<FileConfirm
			fileName="config"
			sourcePath="config"
			destPath="/tmp/config"
			willOverwrite={false}
			onConfirm={noop}
			onBack={noop}
		/>,
	);
	t.false(lastFrame()!.includes('overwritten'));
	unmount();
});

test('FileConfirm — renders Confirm and Go back options', t => {
	const {lastFrame, unmount} = render(
		<FileConfirm
			fileName="config"
			sourcePath="config"
			destPath="/tmp/config"
			willOverwrite={false}
			onConfirm={noop}
			onBack={noop}
		/>,
	);
	const frame = lastFrame()!;
	t.true(frame.includes('Confirm'));
	t.true(frame.includes('Go back'));
	unmount();
});

test('FileConfirm — enter on Confirm calls onConfirm', async t => {
	t.plan(1);
	const {stdin, unmount} = render(
		<FileConfirm
			fileName="config"
			sourcePath="config"
			destPath="/tmp/config"
			willOverwrite={false}
			onConfirm={() => {
				t.pass();
			}}
			onBack={noop}
		/>,
	);

	await delay();
	stdin.write(ENTER);
	await delay();
	unmount();
});

test('FileConfirm — navigate to Go back and press enter calls onBack', async t => {
	t.plan(1);
	const {stdin, unmount} = render(
		<FileConfirm
			fileName="config"
			sourcePath="config"
			destPath="/tmp/config"
			willOverwrite={false}
			onConfirm={noop}
			onBack={() => {
				t.pass();
			}}
		/>,
	);

	await delay();
	stdin.write(ARROW_DOWN);
	await delay();
	stdin.write(ENTER);
	await delay();
	unmount();
});

test('FileConfirm — backspace calls onBack', async t => {
	t.plan(1);
	const {stdin, unmount} = render(
		<FileConfirm
			fileName="config"
			sourcePath="config"
			destPath="/tmp/config"
			willOverwrite={false}
			onConfirm={noop}
			onBack={() => {
				t.pass();
			}}
		/>,
	);

	await delay();
	stdin.write(BACKSPACE);
	await delay();
	unmount();
});

// ── DestinationInput ────────────────────────────────────────────────────

test('DestinationInput — renders selected file info', t => {
	const {lastFrame, unmount} = render(
		<DestinationInput
			fileName="config"
			filePath=".config/ghostty/config"
			onSubmit={noop}
			onBack={noop}
		/>,
	);
	const frame = lastFrame()!;
	t.true(frame.includes('config'));
	t.true(frame.includes('.config/ghostty/config'));
	t.true(frame.includes('Save to:'));
	unmount();
});

test('DestinationInput — renders prompt character', t => {
	const {lastFrame, unmount} = render(
		<DestinationInput
			fileName="config"
			filePath="config"
			onSubmit={noop}
			onBack={noop}
		/>,
	);
	t.true(lastFrame()!.includes('> '));
	unmount();
});

// ── CommandInput ────────────────────────────────────────────────────────

test('CommandInput — renders prompt', t => {
	const {lastFrame, unmount} = render(<CommandInput onSubmit={noop} />);
	t.true(lastFrame()!.includes('> '));
	unmount();
});

test('CommandInput — calls onSubmit with owner and repo for valid URL', async t => {
	t.plan(2);
	const {stdin, unmount} = render(
		<CommandInput
			onSubmit={(owner, repo) => {
				t.is(owner, 'user');
				t.is(repo, 'dotfiles');
			}}
		/>,
	);

	await delay();
	stdin.write('https://github.com/user/dotfiles');
	await delay();
	stdin.write(ENTER);
	await delay();
	unmount();
});

test('CommandInput — shows error for invalid URL', async t => {
	const {stdin, lastFrame, unmount} = render(<CommandInput onSubmit={noop} />);

	await delay();
	stdin.write('not-a-url');
	await delay();
	stdin.write(ENTER);
	await delay();

	t.true(lastFrame()!.includes('Invalid URL'));
	unmount();
});

// ── parseManifest ────────────────────────────────────────────────────────

test('parseManifest — parses valid YAML with files object', t => {
	const yaml = `files:
  config: ~/.config/ghostty/config
  .zshrc: ~/.zshrc`;
	const result = parseManifest(yaml);
	t.deepEqual(result, {
		files: {
			config: '~/.config/ghostty/config',
			'.zshrc': '~/.zshrc',
		},
	});
});

test('parseManifest — returns undefined for empty content', t => {
	t.is(parseManifest(''), undefined);
});

test('parseManifest — returns undefined for missing files key', t => {
	const yaml = `other: value`;
	t.is(parseManifest(yaml), undefined);
});

test('parseManifest — returns undefined for files as array', t => {
	const yaml = `files:
  - item1
  - item2`;
	t.is(parseManifest(yaml), undefined);
});

test('parseManifest — returns undefined for files as string', t => {
	const yaml = `files: "not an object"`;
	t.is(parseManifest(yaml), undefined);
});

test('parseManifest — returns undefined for invalid YAML syntax', t => {
	const yaml = `files: {unclosed`;
	t.is(parseManifest(yaml), undefined);
});

// ── ManifestReview ───────────────────────────────────────────────────────

const sampleEntries = [
	{source: 'config', dest: '~/.config/ghostty/config', willOverwrite: false},
	{source: '.zshrc', dest: '~/.zshrc', willOverwrite: true},
	{
		source: 'starship.toml',
		dest: '~/.config/starship.toml',
		willOverwrite: false,
	},
];

test('ManifestReview — renders owner/repo info', t => {
	const {lastFrame, unmount} = render(
		<ManifestReview
			owner="acme"
			repo="dotfiles"
			entries={sampleEntries}
			onConfirm={noop}
			onBack={noop}
		/>,
	);
	const frame = lastFrame()!;
	t.true(frame.includes('Installing'));
	t.true(frame.includes('acme/dotfiles'));
	unmount();
});

test('ManifestReview — renders all entries', t => {
	const {lastFrame, unmount} = render(
		<ManifestReview
			owner="acme"
			repo="dotfiles"
			entries={sampleEntries}
			onConfirm={noop}
			onBack={noop}
		/>,
	);
	const frame = lastFrame()!;
	t.true(frame.includes('config'));
	t.true(frame.includes('.zshrc'));
	t.true(frame.includes('starship.toml'));
	unmount();
});

test('ManifestReview — shows overwrite warning marker', t => {
	const {lastFrame, unmount} = render(
		<ManifestReview
			owner="acme"
			repo="dotfiles"
			entries={sampleEntries}
			onConfirm={noop}
			onBack={noop}
		/>,
	);
	const frame = lastFrame()!;
	t.true(frame.includes('[!]'));
	t.true(frame.includes('will be overwritten'));
	unmount();
});

test('ManifestReview — shows install count', t => {
	const {lastFrame, unmount} = render(
		<ManifestReview
			owner="acme"
			repo="dotfiles"
			entries={sampleEntries}
			onConfirm={noop}
			onBack={noop}
		/>,
	);
	t.true(lastFrame()!.includes('3 files'));
	unmount();
});

test('ManifestReview — enter on Install all calls onConfirm', async t => {
	t.plan(1);
	const {stdin, unmount} = render(
		<ManifestReview
			owner="acme"
			repo="dotfiles"
			entries={sampleEntries}
			onConfirm={() => {
				t.pass();
			}}
			onBack={noop}
		/>,
	);

	await delay();
	stdin.write(ENTER);
	await delay();
	unmount();
});

test('ManifestReview — navigate to Go back and press enter calls onBack', async t => {
	t.plan(1);
	const {stdin, unmount} = render(
		<ManifestReview
			owner="acme"
			repo="dotfiles"
			entries={sampleEntries}
			onConfirm={noop}
			onBack={() => {
				t.pass();
			}}
		/>,
	);

	await delay();
	stdin.write(ARROW_DOWN);
	await delay();
	stdin.write(ENTER);
	await delay();
	unmount();
});

// ── ManifestDone ─────────────────────────────────────────────────────────

const sampleResults = [
	{source: 'config', dest: '~/.config/ghostty/config', success: true},
	{source: '.zshrc', dest: '~/.zshrc', success: true},
	{source: 'starship.toml', dest: '~/.config/starship.toml', success: false},
];

test('ManifestDone — renders success count', t => {
	const {lastFrame, unmount} = render(<ManifestDone results={sampleResults} />);
	const frame = lastFrame()!;
	t.true(frame.includes('done'));
	t.true(frame.includes('2'));
	unmount();
});

test('ManifestDone — renders failure count', t => {
	const {lastFrame, unmount} = render(<ManifestDone results={sampleResults} />);
	const frame = lastFrame()!;
	t.true(frame.includes('1 failed'));
	unmount();
});

test('ManifestDone — renders each result', t => {
	const {lastFrame, unmount} = render(<ManifestDone results={sampleResults} />);
	const frame = lastFrame()!;
	t.true(frame.includes('config'));
	t.true(frame.includes('.zshrc'));
	t.true(frame.includes('starship.toml'));
	unmount();
});

test('ManifestDone — shows ok indicator for success', t => {
	const {lastFrame, unmount} = render(<ManifestDone results={sampleResults} />);
	t.true(lastFrame()!.includes('ok'));
	unmount();
});

test('ManifestDone — shows failed to write for failure', t => {
	const {lastFrame, unmount} = render(<ManifestDone results={sampleResults} />);
	t.true(lastFrame()!.includes('failed to write'));
	unmount();
});

test('ManifestDone — shows exit instructions', t => {
	const {lastFrame, unmount} = render(<ManifestDone results={sampleResults} />);
	const frame = lastFrame()!;
	t.true(frame.includes('q'));
	t.true(frame.includes('esc'));
	unmount();
});

// ── ManifestPrompt ──────────────────────────────────────────────────────

test('ManifestPrompt — renders owner/repo info', t => {
	const {lastFrame, unmount} = render(
		<ManifestPrompt
			owner="acme"
			repo="dotfiles"
			fileCount={3}
			onUseManifest={noop}
			onBrowseManually={noop}
		/>,
	);
	const frame = lastFrame()!;
	t.true(frame.includes('.dotship.yml'));
	t.true(frame.includes('acme/dotfiles'));
	unmount();
});

test('ManifestPrompt — renders file count', t => {
	const {lastFrame, unmount} = render(
		<ManifestPrompt
			owner="acme"
			repo="dotfiles"
			fileCount={5}
			onUseManifest={noop}
			onBrowseManually={noop}
		/>,
	);
	const frame = lastFrame()!;
	t.true(frame.includes('5 files'));
	unmount();
});

test('ManifestPrompt — renders both options', t => {
	const {lastFrame, unmount} = render(
		<ManifestPrompt
			owner="acme"
			repo="dotfiles"
			fileCount={3}
			onUseManifest={noop}
			onBrowseManually={noop}
		/>,
	);
	const frame = lastFrame()!;
	t.true(frame.includes('Install from manifest'));
	t.true(frame.includes('Browse manually'));
	unmount();
});

test('ManifestPrompt — enter on Install calls onUseManifest', async t => {
	t.plan(1);
	const {unmount, stdin} = render(
		<ManifestPrompt
			owner="acme"
			repo="dotfiles"
			fileCount={3}
			onUseManifest={() => {
				t.pass();
			}}
			onBrowseManually={noop}
		/>,
	);

	await delay();
	stdin.write(ENTER);
	await delay();
	unmount();
});

test('ManifestPrompt — navigate and select Browse manually', async t => {
	t.plan(1);
	const {unmount, stdin} = render(
		<ManifestPrompt
			owner="acme"
			repo="dotfiles"
			fileCount={3}
			onUseManifest={noop}
			onBrowseManually={() => {
				t.pass();
			}}
		/>,
	);

	await delay();
	stdin.write(ARROW_DOWN);
	await delay();
	stdin.write(ENTER);
	await delay();
	unmount();
});
