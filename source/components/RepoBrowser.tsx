import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import type {RepoItem} from '../utils/github.js';

type Props = {
	owner: string;
	repo: string;
	path: string[];
	items: RepoItem[];
	onSelectDir: (dirPath: string) => void;
	onSelectFile: (filePath: string, fileName: string) => void;
	onBack: () => void;
};

const VISIBLE_ITEMS = 15;

export default function RepoBrowser({
	owner,
	repo,
	path,
	items,
	onSelectDir,
	onSelectFile,
	onBack,
}: Props) {
	const [cursor, setCursor] = useState(0);

	useInput((_input, key) => {
		if (key.upArrow) {
			setCursor(prev => Math.max(0, prev - 1));
		} else if (key.downArrow) {
			setCursor(prev => Math.min(items.length - 1, prev + 1));
		} else if (key.return) {
			const item = items[cursor];
			if (!item) return;
			if (item.type === 'dir') {
				setCursor(0);
				onSelectDir(item.path);
			} else {
				onSelectFile(item.path, item.name);
			}
		} else if (key.backspace || key.delete) {
			onBack();
		}
	});

	const currentPath = path.length > 0 ? path.join('/') : '/';

	const scrollStart = Math.max(
		0,
		Math.min(cursor - Math.floor(VISIBLE_ITEMS / 2), items.length - VISIBLE_ITEMS),
	);
	const visibleItems = items.slice(scrollStart, scrollStart + VISIBLE_ITEMS);

	return (
		<Box flexDirection="column">
			<Box marginBottom={1}>
				<Text dimColor>
					{owner}/{repo}
				</Text>
				<Text bold color="cyan">
					{' '}
					{currentPath}
				</Text>
			</Box>

			{visibleItems.map((item, i) => {
				const realIndex = scrollStart + i;
				const isSelected = realIndex === cursor;
				const icon = item.type === 'dir' ? '📁' : '📄';

				return (
					<Box key={item.path}>
						<Text color={isSelected ? 'magenta' : undefined} bold={isSelected}>
							{isSelected ? '❯ ' : '  '}
							{icon} {item.name}
							{item.type === 'dir' ? '/' : ''}
						</Text>
					</Box>
				);
			})}

			{items.length > VISIBLE_ITEMS && (
				<Box marginTop={1}>
					<Text dimColor>
						{cursor + 1}/{items.length}
					</Text>
				</Box>
			)}

			<Box marginTop={1}>
				<Text dimColor>
					↑↓ navigate • enter select • backspace back
				</Text>
			</Box>
		</Box>
	);
}
