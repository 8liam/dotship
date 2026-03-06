import React, {useState, useCallback} from 'react';
import {Box, Text, useApp, useInput} from 'ink';
import Header from './components/Header.js';
import Spinner from './components/Spinner.js';
import CommandInput from './components/CommandInput.js';
import theme from './theme.js';
import RepoBrowser from './components/RepoBrowser.js';
import DestinationInput from './components/DestinationInput.js';
import FileConfirm from './components/FileConfirm.js';
import ManifestPrompt from './components/ManifestPrompt.js';
import ManifestReview from './components/ManifestReview.js';
import ManifestDone from './components/ManifestDone.js';
import {
	fetchRepoContents,
	fetchFileContent,
	fileExists,
	resolveDestination,
	writeFileToPath,
	fetchManifest,
	expandTilde,
	type RepoItem,
} from './utils/github.js';

type BrowseState = {
	owner: string;
	repo: string;
	path: string[];
	items: RepoItem[];
};

type FileSelection = {
	filePath: string;
	fileName: string;
};

type ManifestEntry = {
	source: string;
	dest: string;
	willOverwrite: boolean;
};

type ManifestResult = {
	source: string;
	dest: string;
	success: boolean;
};

type Screen =
	| {type: 'url-input'}
	| {type: 'loading'; message: string}
	| ({type: 'browsing'} & BrowseState)
	| ({type: 'path-input'} & BrowseState & FileSelection)
	| ({type: 'final-confirm'} & BrowseState &
			FileSelection & {destPath: string; willOverwrite: boolean})
	| {type: 'writing'}
	| {type: 'done'; destPath: string}
	| {type: 'error'; message: string}
	| {
			type: 'manifest-prompt';
			owner: string;
			repo: string;
			entries: ManifestEntry[];
	  }
	| {
			type: 'manifest-review';
			owner: string;
			repo: string;
			entries: ManifestEntry[];
	  }
	| {
			type: 'manifest-done';
			owner: string;
			repo: string;
			results: ManifestResult[];
	  };

export default function App() {
	const {exit} = useApp();
	const [screen, setScreen] = useState<Screen>({type: 'url-input'});
	const [error, setError] = useState('');

	useInput((input, key) => {
		if (
			input === 'q' &&
			(screen.type === 'done' || screen.type === 'manifest-done')
		) {
			exit();
		}

		if (key.escape) {
			exit();
		}
	});

	const loadContents = useCallback(
		async (owner: string, repo: string, path: string[], fallback: Screen) => {
			setError('');
			setScreen({type: 'loading', message: 'Loading repository...'});
			try {
				const items = await fetchRepoContents(owner, repo, path.join('/'));

				if (items.length === 0) {
					setError('This folder is empty.');
					setScreen(fallback);
					return;
				}

				setScreen({type: 'browsing', owner, repo, path, items});
			} catch {
				setError('Failed to fetch repo contents. Check the URL and try again.');
				setScreen({type: 'url-input'});
			}
		},
		[],
	);

	const handleUrlSubmit = useCallback(
		async (owner: string, repo: string) => {
			setError('');
			setScreen({type: 'loading', message: 'Checking for manifest...'});

			try {
				const manifest = await fetchManifest(owner, repo);

				if (manifest) {
					const entries: ManifestEntry[] = await Promise.all(
						Object.entries(manifest.files).map(async ([source, dest]) => {
							const resolvedDest = expandTilde(dest);
							const willOverwrite = await fileExists(resolvedDest);
							return {source, dest: resolvedDest, willOverwrite};
						}),
					);

					setScreen({
						type: 'manifest-prompt',
						owner,
						repo,
						entries,
					});
					return;
				}
			} catch {
				// Manifest fetch failed, fall through to browse mode
			}

			void loadContents(owner, repo, [], {type: 'url-input'});
		},
		[loadContents],
	);

	const handleSelectDir = useCallback(
		(dirPath: string) => {
			if (screen.type !== 'browsing') return;
			void loadContents(screen.owner, screen.repo, dirPath.split('/'), screen);
		},
		[screen, loadContents],
	);

	const handleSelectFile = useCallback(
		(filePath: string, fileName: string) => {
			if (screen.type !== 'browsing') return;
			setScreen({
				...screen,
				type: 'path-input',
				filePath,
				fileName,
			});
		},
		[screen],
	);

	const handleBrowseBack = useCallback(() => {
		if (screen.type !== 'browsing') return;
		if (screen.path.length === 0) {
			setScreen({type: 'url-input'});
			return;
		}

		const parentPath = screen.path.slice(0, -1);
		void loadContents(screen.owner, screen.repo, parentPath, screen);
	}, [screen, loadContents]);

	const handleDestinationSubmit = useCallback(
		async (dest: string) => {
			if (screen.type !== 'path-input') return;
			setScreen({type: 'loading', message: 'Checking destination...'});

			try {
				const destPath = await resolveDestination(dest, screen.fileName);
				const willOverwrite = await fileExists(destPath);

				setScreen({
					type: 'final-confirm',
					owner: screen.owner,
					repo: screen.repo,
					path: screen.path,
					items: screen.items,
					filePath: screen.filePath,
					fileName: screen.fileName,
					destPath,
					willOverwrite,
				});
			} catch {
				setError('Failed to check destination path.');
				setScreen({
					...screen,
					type: 'path-input',
				});
			}
		},
		[screen],
	);

	const handleDestinationBack = useCallback(() => {
		if (screen.type !== 'path-input') return;
		setScreen({
			type: 'browsing',
			owner: screen.owner,
			repo: screen.repo,
			path: screen.path,
			items: screen.items,
		});
	}, [screen]);

	const handleConfirm = useCallback(async () => {
		if (screen.type !== 'final-confirm') return;
		setScreen({type: 'writing'});
		setError('');

		try {
			const content = await fetchFileContent(
				screen.owner,
				screen.repo,
				screen.filePath,
			);
			await writeFileToPath(screen.destPath, content);
			setScreen({type: 'done', destPath: screen.destPath});
		} catch {
			setError('Failed to download or write the file.');
			setScreen({
				...screen,
				type: 'final-confirm',
			});
		}
	}, [screen]);

	const handleConfirmBack = useCallback(() => {
		if (screen.type !== 'final-confirm') return;
		setScreen({
			...screen,
			type: 'path-input',
		});
	}, [screen]);

	const handleManifestConfirm = useCallback(async () => {
		if (screen.type !== 'manifest-review') return;
		setScreen({type: 'loading', message: 'Installing files...'});
		setError('');

		const results: ManifestResult[] = [];

		for (const entry of screen.entries) {
			try {
				const content = await fetchFileContent(
					screen.owner,
					screen.repo,
					entry.source,
				);
				await writeFileToPath(entry.dest, content);
				results.push({source: entry.source, dest: entry.dest, success: true});
			} catch {
				results.push({source: entry.source, dest: entry.dest, success: false});
			}
		}

		setScreen({
			type: 'manifest-done',
			owner: screen.owner,
			repo: screen.repo,
			results,
		});
	}, [screen]);

	const handleManifestBack = useCallback(() => {
		if (screen.type !== 'manifest-review') return;
		setScreen({
			type: 'manifest-prompt',
			owner: screen.owner,
			repo: screen.repo,
			entries: screen.entries,
		});
	}, [screen]);

	const handleUseManifest = useCallback(() => {
		if (screen.type !== 'manifest-prompt') return;
		setScreen({
			type: 'manifest-review',
			owner: screen.owner,
			repo: screen.repo,
			entries: screen.entries,
		});
	}, [screen]);

	const handleBrowseManually = useCallback(() => {
		if (screen.type !== 'manifest-prompt') return;
		void loadContents(screen.owner, screen.repo, [], {type: 'url-input'});
	}, [screen, loadContents]);

	const showHeader = screen.type === 'url-input';

	return (
		<Box flexDirection="column">
			{showHeader && <Header showDescription />}

			{error && (
				<Box marginBottom={1}>
					<Text color={theme.error}> {error}</Text>
				</Box>
			)}

			{screen.type === 'url-input' && (
				<CommandInput onSubmit={handleUrlSubmit} />
			)}

			{(screen.type === 'loading' || screen.type === 'writing') && (
				<Box
					borderStyle="round"
					borderColor={theme.border}
					paddingX={1}
					width="100%"
				>
					<Spinner />
					<Text dimColor>
						{screen.type === 'writing'
							? ' Downloading and saving file...'
							: ` ${screen.message}`}
					</Text>
				</Box>
			)}

			{screen.type === 'browsing' && (
				<RepoBrowser
					owner={screen.owner}
					repo={screen.repo}
					path={screen.path}
					items={screen.items}
					onSelectDir={handleSelectDir}
					onSelectFile={handleSelectFile}
					onBack={handleBrowseBack}
				/>
			)}

			{screen.type === 'path-input' && (
				<DestinationInput
					fileName={screen.fileName}
					filePath={screen.filePath}
					onSubmit={dest => void handleDestinationSubmit(dest)}
					onBack={handleDestinationBack}
				/>
			)}

			{screen.type === 'final-confirm' && (
				<FileConfirm
					fileName={screen.fileName}
					sourcePath={screen.filePath}
					destPath={screen.destPath}
					willOverwrite={screen.willOverwrite}
					onConfirm={() => void handleConfirm()}
					onBack={handleConfirmBack}
				/>
			)}

			{screen.type === 'done' && (
				<Box flexDirection="column">
					<Box
						borderStyle="round"
						borderColor={theme.success}
						paddingX={1}
						width="100%"
					>
						<Text>
							<Text color={theme.success} bold>
								done
							</Text>
							<Text dimColor> — saved to </Text>
							<Text bold>{screen.destPath}</Text>
						</Text>
					</Box>
					<Box marginTop={1}>
						<Text dimColor> press </Text>
						<Text color={theme.key} bold>
							q
						</Text>
						<Text dimColor> or </Text>
						<Text color={theme.key} bold>
							esc
						</Text>
						<Text dimColor> to exit</Text>
					</Box>
				</Box>
			)}

		{screen.type === 'manifest-prompt' && (
			<ManifestPrompt
				owner={screen.owner}
				repo={screen.repo}
				fileCount={screen.entries.length}
				onUseManifest={handleUseManifest}
				onBrowseManually={handleBrowseManually}
			/>
		)}

		{screen.type === 'manifest-review' && (
			<ManifestReview
				owner={screen.owner}
				repo={screen.repo}
				entries={screen.entries}
				onConfirm={() => void handleManifestConfirm()}
				onBack={handleManifestBack}
			/>
		)}

			{screen.type === 'manifest-done' && (
				<ManifestDone results={screen.results} />
			)}
		</Box>
	);
}
