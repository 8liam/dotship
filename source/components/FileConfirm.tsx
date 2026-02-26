import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';

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
			<Box marginBottom={1} flexDirection="column">
				<Text>
					File:{' '}
					<Text bold color="cyan">
						{fileName}
					</Text>
				</Text>
				<Text>
					From: <Text dimColor>{sourcePath}</Text>
				</Text>
				<Text>
					To:{'   '}
					<Text bold>{destPath}</Text>
				</Text>
			</Box>

			{willOverwrite && (
				<Box marginBottom={1}>
					<Text color="yellow">
						⚠ A file already exists at this path. It will be overwritten.
					</Text>
				</Box>
			)}

			{options.map((option, i) => (
				<Box key={option}>
					<Text
						color={i === cursor ? 'magenta' : undefined}
						bold={i === cursor}
					>
						{i === cursor ? '❯ ' : '  '}
						{option}
					</Text>
				</Box>
			))}
		</Box>
	);
}
