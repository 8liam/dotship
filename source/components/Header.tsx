import React from 'react';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import {Box, Text} from 'ink';

type Props = {
	showDescription?: boolean;
};

export default function Header({showDescription = false}: Props) {
	return (
		<Box flexDirection="column">
			<Gradient name="vice">
				<BigText text="dotship" font="block" />
			</Gradient>
			{showDescription && (
				<Box marginBottom={1}>
					<Text dimColor>
						Browse a GitHub repo, pick config files, save them locally.
					</Text>
				</Box>
			)}
		</Box>
	);
}
