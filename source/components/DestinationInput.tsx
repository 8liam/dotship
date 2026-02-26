import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import TextInput from 'ink-text-input';

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
					Selected: <Text bold color="cyan">{fileName}</Text>
				</Text>
				<Text dimColor>{filePath}</Text>
			</Box>

			<Box marginBottom={1}>
				<Text>Where should this file be saved?</Text>
			</Box>

			<Box>
				<Text bold color="magenta">
					{'❯ '}
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
					<Text color="red">{error}</Text>
				</Box>
			)}

			<Box marginTop={1}>
				<Text dimColor>Enter a file path or directory • backspace when empty to go back</Text>
			</Box>
		</Box>
	);
}
