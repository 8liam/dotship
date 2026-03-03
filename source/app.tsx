import React, {useState, useCallback} from 'react';
import {Box, Text, useApp, useInput} from 'ink';
import Header from './components/Header.js';
import Spinner from './components/Spinner.js';
import CommandInput from './components/CommandInput.js';
import theme from './theme.js';
import RepoBrowser from './components/RepoBrowser.js';
import DestinationInput from './components/DestinationInput.js';
import FileConfirm from './components/FileConfirm.js';
import {
	fetchRepoContents,
	fetchFileContent,
	fileExists,
	resolveDestination,
	writeFileToPath,
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

type Screen =
	| {type: 'url-input'}
	| {type: 'loading'; message: string}
	| ({type: 'browsing'} & BrowseState)
	| ({type: 'path-input'} & BrowseState & FileSelection)
	| ({type: 'final-confirm'} & BrowseState &
			FileSelection & {destPath: string; willOverwrite: boolean})
	| {type: 'writing'}
	| {type: 'done'; destPath: string}
	| {type: 'error'; message: string};

export default function App() {
	const {exit} = useApp();
	const [screen, setScreen] = useState<Screen>({type: 'url-input'});
	const [error, setError] = useState('');

	useInput((input, key) => {
		if (input === 'q' && screen.type === 'done') {
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
		(owner: string, repo: string) => {
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

	return (
		<Box flexDirection="column">
			<Header showDescription={screen.type === 'url-input'} />

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
							<Text color={theme.success} bold>done</Text>
							<Text dimColor> — saved to </Text>
							<Text bold>{screen.destPath}</Text>
						</Text>
					</Box>
					<Box marginTop={1}>
						<Text dimColor>  press </Text>
						<Text color={theme.key} bold>q</Text>
						<Text dimColor> or </Text>
						<Text color={theme.key} bold>esc</Text>
						<Text dimColor> to exit</Text>
					</Box>
				</Box>
			)}
		</Box>
	);
}
