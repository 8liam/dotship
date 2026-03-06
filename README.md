# dotship

A cli-based tool for managing dotfiles. Browse any public GitHub repository, pick the config files you need, and save them exactly where they belong on your machine.

![demo](assets/demo.gif)

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later

## Installation

### Global install

```bash
npm install -g dotship@latest
```

Then run it anywhere:

```bash
dotship
```

### One-off execution

```bash
npx dotship@latest
```

## How it works

1. Paste a GitHub repo URL (e.g. `https://github.com/user/dotfiles`)
2. Browse the repository's files and folders
3. Select a file you want
4. Enter the destination path on your machine (supports `~` expansion)
5. Confirm — dotship downloads the file and saves it

If a file already exists at the destination, you'll see a warning before anything is overwritten.

## Manifest file (for repo authors)

If a repository contains a `.dotship.yml` at its root, dotship will detect it automatically and offer to install all files at once — no manual browsing required.

### Example `.dotship.yml`

```yaml
files:
  ghostty/config: ~/.config/ghostty/config
  .zshrc: ~/.zshrc
  starship.toml: ~/.config/starship.toml
  nvim/init.lua: ~/.config/nvim/init.lua
```

- **Keys** are paths relative to the repo root
- **Values** are destination paths on the user's machine (`~` is expanded to the home directory)

When a user runs `dotship` on your repo, they'll see a summary of all file mappings with an option to install everything in one go. Files that would overwrite existing files are marked with a warning.

## Controls

| Key         | Action           |
| ----------- | ---------------- |
| `↑` `↓`     | Navigate items   |
| `Enter`     | Select / confirm |
| `Backspace` | Go back          |
| `Esc`       | Exit             |

## Contributing

1. Fork the repo and clone it
2. Install dependencies:

```bash
npm install
```

3. Start the dev watcher (recompiles on file changes):

```bash
npm run dev
```

4. In a separate terminal, run the CLI:

```bash
npm start
```

5. Run tests:

```bash
npm test
```

### Project structure

```
source/
  cli.tsx              Entry point
  app.tsx              Main app state machine
  theme.ts             Color tokens for theming
  components/
    Header.tsx         Gradient ASCII header
    CommandInput.tsx   GitHub URL input
    RepoBrowser.tsx    File/folder browser
    DestinationInput.tsx  Save path input
    FileConfirm.tsx    Single file confirmation
    ManifestReview.tsx Manifest batch install review
    ManifestDone.tsx   Batch install results
    Spinner.tsx        Loading animation
    StatusBar.tsx      Keyboard shortcut hints
  utils/
    github.ts          GitHub API, manifest parsing, file system helpers
```

### Submitting changes

1. Create a branch for your change
2. Make sure `npm test` passes
3. Open a pull request against `develop`

## License

MIT
