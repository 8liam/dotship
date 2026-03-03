const theme = {
	accent: '#ff6690',
	border: 'gray',
	borderSuccess: 'green',
	prompt: '#ff6690',
	error: 'red',
	warning: 'yellow',
	success: 'green',
	muted: 'gray',
	key: 'white',
	spinner: '#ff6690',
} as const;

export type Theme = typeof theme;

export default theme;
