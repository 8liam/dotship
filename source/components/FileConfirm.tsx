import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import StatusBar from './StatusBar.js';
import theme from '../theme.js';

type Props = {
	fileName: string;
	sourcePath: string;
	destPath: string;
	willOverwrite: boolean;
	onConfirm: () => void;
	onBack: () => void;
};

const options = ['Confirm', 'Go back'] as const;

export default function FileConfirm({
	fileName,
	sourcePath,
	destPath,
	willOverwrite,
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

	return (
		<Box flexDirection="column">
			<Box
				flexDirection="column"
				borderStyle="round"
				borderColor={theme.border}
				paddingX={1}
				width="100%"
			>
				<Text>
					<Text dimColor>File: </Text>
					<Text bold>{fileName}</Text>
				</Text>
				<Text>
					<Text dimColor>From: </Text>
					<Text>{sourcePath}</Text>
				</Text>
				<Text>
					<Text dimColor>To:   </Text>
					<Text bold color={theme.accent}>{destPath}</Text>
				</Text>

				{willOverwrite && (
					<Box marginTop={1}>
						<Text color={theme.warning}>
							! File exists and will be overwritten.
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
								{option}
							</Text>
						</Box>
					))}
				</Box>
			</Box>

			<StatusBar keys={[
				{key: '↑↓', label: 'select'},
				{key: 'enter', label: 'confirm'},
				{key: 'backspace', label: 'back'},
			]} />
		</Box>
	);
}
