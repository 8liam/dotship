import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import TextInput from 'ink-text-input';
import StatusBar from './StatusBar.js';
import theme from '../theme.js';

type Props = {
	fileName: string;
	filePath: string;
	onSubmit: (destinationPath: string) => void;
	onBack: () => void;
};

export default function DestinationInput({
	fileName,
	filePath,
	onSubmit,
	onBack,
}: Props) {
	const [value, setValue] = useState('');
	const [error, setError] = useState('');

	useInput((_input, key) => {
		if ((key.backspace || key.delete) && value === '') {
			onBack();
		}
	});

	const handleSubmit = (input: string) => {
		const trimmed = input.trim();
		if (!trimmed) {
			setError('Please enter a destination path.');
			return;
		}

		setError('');
		onSubmit(trimmed);
	};

	return (
		<Box flexDirection="column">
			<Box marginBottom={1} flexDirection="column">
				<Text>
					<Text dimColor>File: </Text>
					<Text bold>{fileName}</Text>
				</Text>
				<Text dimColor>{filePath}</Text>
			</Box>

			<Text dimColor>Save to:</Text>
			<Box borderStyle="round" borderColor={theme.border} paddingX={1} width="100%">
				<Text color={theme.prompt} bold>
					{'> '}
				</Text>
				<TextInput
					value={value}
					onChange={val => {
						setValue(val);
						if (error) setError('');
					}}
					onSubmit={handleSubmit}
					placeholder={`~/${fileName}`}
					showCursor
				/>
			</Box>

			{error && (
				<Box marginTop={1}>
					<Text color={theme.error}> {error}</Text>
				</Box>
			)}

			<StatusBar
				keys={[
					{key: 'enter', label: 'submit'},
					{key: 'backspace', label: 'back'},
					{key: 'esc', label: 'exit'},
				]}
			/>
		</Box>
	);
}
