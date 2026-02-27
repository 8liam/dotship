#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import App from './app.js';

console.clear();
const {waitUntilExit} = render(<App />);
waitUntilExit().then(() => {
	process.exit(0);
});
