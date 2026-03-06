import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import StatusBar from './StatusBar.js';
import theme from '../theme.js';

type ManifestEntry = {
	source: string;
	dest: string;
	willOverwrite: boolean;
};

type Props = {
	owner: string;
	repo: string;
	entries: ManifestEntry[];
	onConfirm: () => void;
	onBack: () => void;
};

const options = ['Install all', 'Go back'] as const;

export default function ManifestReview({
	owner,
	repo,
	entries,
	onConfirm,
	onBack,
}: Props) {
	const [cursor, setCursor] = useState(0);

	useInput((_input, key) => {
		if (key.upArrow || key.downArrow) {
			setCursor(prev => (prev === 0 ? 1 : 0));
		} else if (key.return) {
			if (cursor === 0) {
				onConfirm();
			} else {
				onBack();
			}
		} else if (key.backspace || key.delete) {
			onBack();
		}
	});

	const overwriteCount = entries.filter(e => e.willOverwrite).length;

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
					<Text dimColor>
						Installing {entries.length} file{entries.length > 1 ? 's' : ''} from{' '}
					</Text>
					<Text bold>{owner}/{repo}</Text>
				</Box>

				{entries.map(entry => (
					<Box key={entry.source}>
						<Text dimColor>{entry.source}</Text>
						<Text dimColor> -{'>'} </Text>
						<Text>{entry.dest}</Text>
						{entry.willOverwrite && (
							<Text color={theme.warning}> [!]</Text>
						)}
					</Box>
				))}

				{overwriteCount > 0 && (
					<Box marginTop={1}>
						<Text color={theme.warning}>
							! {overwriteCount} file{overwriteCount > 1 ? 's' : ''} will be overwritten
						</Text>
					</Box>
				)}

				<Box marginTop={1} flexDirection="column">
					{options.map((option, i) => (
						<Box key={option}>
							<Text
								color={i === cursor ? theme.accent : undefined}
								bold={i === cursor}
								dimColor={i !== cursor}
							>
								{i === cursor ? '> ' : '  '}
								{option === 'Install all'
									? `Install all (${entries.length} file${entries.length > 1 ? 's' : ''})`
									: option}
							</Text>
						</Box>
					))}
				</Box>
			</Box>

			<StatusBar
				keys={[
					{key: '↑↓', label: 'select'},
					{key: 'enter', label: 'confirm'},
					{key: 'backspace', label: 'back'},
					{key: 'esc', label: 'exit'},
				]}
			/>
		</Box>
	);
}
