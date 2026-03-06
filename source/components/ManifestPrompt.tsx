import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import StatusBar from './StatusBar.js';
import theme from '../theme.js';

type Props = {
	owner: string;
	repo: string;
	fileCount: number;
	onUseManifest: () => void;
	onBrowseManually: () => void;
};

const options = ['Install from manifest', 'Browse manually'] as const;

export default function ManifestPrompt({
	owner,
	repo,
	fileCount,
	onUseManifest,
	onBrowseManually,
}: Props) {
	const [cursor, setCursor] = useState(0);

	useInput((_input, key) => {
		if (key.upArrow || key.downArrow) {
			setCursor(prev => (prev === 0 ? 1 : 0));
		} else if (key.return) {
			if (cursor === 0) {
				onUseManifest();
			} else {
				onBrowseManually();
			}
		}
	});

	return (
		<Box flexDirection="column">
			<Box
				flexDirection="column"
				borderStyle="round"
				borderColor={theme.border}
				paddingX={1}
				width="100%"
			>
				<Box marginBottom={1}>
					<Text>
						<Text dimColor>Found </Text>
						<Text bold color={theme.accent}>.dotship.yml</Text>
						<Text dimColor> in </Text>
						<Text bold>{owner}/{repo}</Text>
					</Text>
				</Box>

				<Text dimColor>
					This repo has a manifest with {fileCount} file{fileCount > 1 ? 's' : ''} configured.
				</Text>

				<Box marginTop={1} flexDirection="column">
					{options.map((option, i) => (
						<Box key={option}>
							<Text
								color={i === cursor ? theme.accent : undefined}
								bold={i === cursor}
								dimColor={i !== cursor}
							>
								{i === cursor ? '> ' : '  '}
								{option}
							</Text>
						</Box>
					))}
				</Box>
			</Box>

			<StatusBar
				keys={[
					{key: '↑↓', label: 'select'},
					{key: 'enter', label: 'confirm'},
					{key: 'esc', label: 'exit'},
				]}
			/>
		</Box>
	);
}
