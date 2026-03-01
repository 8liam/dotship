import React, {useState} from 'react';
import {Box, Text} from 'ink';
import TextInput from 'ink-text-input';
import {parseGitHubUrl} from '../utils/github.js';
import StatusBar from './StatusBar.js';
import theme from '../theme.js';

type Props = {
	onSubmit: (owner: string, repo: string) => void;
};

export default function CommandInput({onSubmit}: Props) {
	const [value, setValue] = useState('');
	const [error, setError] = useState('');

	const handleSubmit = (input: string) => {
		const parsed = parseGitHubUrl(input.trim());
		if (!parsed) {
			setError('Invalid URL — use https://github.com/owner/repo');
			return;
		}

		setError('');
		onSubmit(parsed.owner, parsed.repo);
	};

	return (
		<Box flexDirection="column">
			<Box
				borderStyle="round"
				borderColor={theme.border}
				paddingX={1}
				width="100%"
			>
				<Text color={theme.prompt} bold>{'> '}</Text>
				<TextInput
					value={value}
					onChange={setValue}
					onSubmit={handleSubmit}
					placeholder="Paste a GitHub repo URL..."
					showCursor
				/>
			</Box>
			{error && (
				<Box marginTop={1}>
					<Text color={theme.error}> {error}</Text>
				</Box>
			)}
			<StatusBar keys={[
				{key: 'enter', label: 'submit'},
				{key: 'esc', label: 'exit'},
			]} />
		</Box>
	);
}
