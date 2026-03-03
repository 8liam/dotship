import React from 'react';
import {Box, Text} from 'ink';
import theme from '../theme.js';

type Props = {
	keys: Array<{key: string; label: string}>;
};

export default function StatusBar({keys}: Props) {
	return (
		<Box marginTop={1}>
			{keys.map((k) => (
				<Box key={k.key} marginRight={2}>
					<Text dimColor>
						<Text color={theme.key} bold>{k.key}</Text>
						{' '}
						{k.label}
					</Text>
				</Box>
			))}
		</Box>
	);
}
