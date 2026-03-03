import React, {useState, useEffect} from 'react';
import {Text} from 'ink';
import theme from '../theme.js';

const frames = ['◒', '◐', '◓', '◑'];
const interval = 120;

export default function Spinner() {
	const [frame, setFrame] = useState(0);

	useEffect(() => {
		const timer = setInterval(() => {
			setFrame(prev => (prev + 1) % frames.length);
		}, interval);

		return () => clearInterval(timer);
	}, []);

	return <Text color={theme.spinner}>{frames[frame]}</Text>;
}
