import React, {useState} from 'react';
import {Box, Text} from 'ink';
import TextInput from 'ink-text-input';
import {parseGitHubUrl} from '../utils/github.js';

type Props = {
	onSubmit: (owner: string, repo: string) => void;
};

export default function CommandInput({onSubmit}: Props) {
	const [value, setValue] = useState('');
	const [error, setError] = useState('');

	const handleSubmit = (input: string) => {
		const parsed = parseGitHubUrl(input.trim());
		if (!parsed) {
			setError('Invalid GitHub URL. Use: https://github.com/owner/repo');
			return;
		}

		setError('');
		onSubmit(parsed.owner, parsed.repo);
	};

	return (
		<Box flexDirection="column">
			<Box>
				<Text bold color="magenta">
					{'❯ '}
				</Text>
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
					<Text color="red">{error}</Text>
				</Box>
			)}
		</Box>
	);
}
