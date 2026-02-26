import React from 'react';
import Gradient from 'ink-gradient';
import BigText from 'ink-big-text';
import {Box} from 'ink';

export default function Header() {
	return (
		<Box marginBottom={1}>
			<Gradient name="vice">
				<BigText text="dotship" font="block" />
			</Gradient>
		</Box>
	);
}
