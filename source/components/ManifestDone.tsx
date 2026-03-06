import React from 'react';
import {Box, Text} from 'ink';
import theme from '../theme.js';

type ManifestResult = {
	source: string;
	dest: string;
	success: boolean;
};

type Props = {
	results: ManifestResult[];
};

export default function ManifestDone({results}: Props) {
	const successCount = results.filter(r => r.success).length;
	const failCount = results.length - successCount;

	return (
		<Box flexDirection="column">
			<Box
				flexDirection="column"
				borderStyle="round"
				borderColor={failCount > 0 ? theme.warning : theme.success}
				paddingX={1}
				width="100%"
			>
				<Box marginBottom={1}>
					<Text color={theme.success} bold>
						done
					</Text>
					<Text dimColor> — installed </Text>
					<Text bold>{successCount}</Text>
					<Text dimColor> file{successCount !== 1 ? 's' : ''}</Text>
					{failCount > 0 && (
						<>
							<Text dimColor>, </Text>
							<Text color={theme.error}>{failCount} failed</Text>
						</>
					)}
				</Box>

				{results.map(result => (
					<Box key={result.source}>
						<Text color={result.success ? theme.success : theme.error}>
							{result.success ? 'ok' : '! '}
						</Text>
						<Text dimColor>
							{' '}
							{result.source} -{'>'}{' '}
						</Text>
						{result.success ? (
							<Text>{result.dest}</Text>
						) : (
							<Text color={theme.error}>failed to write</Text>
						)}
					</Box>
				))}
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
	);
}
