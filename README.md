# Knip UI - Unused Code Scanner

Beautiful VS Code extension that provides a clean UI for [Knip](https://knip.dev/) - the ultimate tool for finding unused files, exports, and dependencies in JavaScript/TypeScript projects.

## Features

- 🔍 **Find Unused Files**: Scan your project for files that aren't imported anywhere
- 🔗 **Detect Unused Exports**: Identify exported functions/variables that aren't used
- 📦 **Unused Dependencies**: Find dependencies in package.json that aren't actually used
- 🗑️ **One-Click Actions**: Delete, ignore, or uninstall with context menu actions
- 🚀 **Easy Installation**: Auto-detects and helps install Knip globally

## Usage

1. Install Knip globally: `npm install -g knip`
2. Open a JavaScript/TypeScript project in VS Code
3. Open the Knip UI panel from the Activity Bar
4. Click "Start Scanning" to analyze your project
5. Review results and take actions on unused code

## Requirements

- Node.js 14+
- Knip installed globally (`npm install -g knip`)

## Release Notes

### 1.0.0

- Initial release with full Knip integration
- Tree view UI with categorized results
- Context menu actions for cleanup
