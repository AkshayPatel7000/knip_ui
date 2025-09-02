# Knip UI - Unused Code Scanner

Beautiful VS Code extension that provides a clean UI for [Knip](https://knip.dev/) - the ultimate tool for finding unused files, exports, and dependencies in JavaScript/TypeScript projects.

## Features

- 🔍 **Find Unused Files**: Scan your project for files that aren't imported anywhere
- 🔗 **Detect Unused Exports**: Identify exported functions/variables that aren't used
- 📦 **Unused Dependencies**: Find dependencies in package.json that aren't actually used
- 🏷️ **Unused Types**: Locate TypeScript types that are no longer referenced
- ⚠️ **Missing Dependencies**: Detect imports that aren't listed in package.json
- ❓ **Unresolved Modules**: Find imports that can't be resolved
- 👥 **Duplicates**: Identify duplicate code patterns
- 🗑️ **One-Click Actions**: Delete, ignore, or uninstall with intuitive UI controls
- 🚀 **Easy Installation**: Auto-detects and helps install Knip globally
- 💾 **Persistent Results**: Your scan results stay available when switching panels
- 🔄 **Smart Refresh**: Maintains UI state while updating with fresh data

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "Knip UI"
4. Click "Install"

## Usage

1. **Install Knip globally**

- Open VS Code: `npm install -g knip`

2. **Install the Extension:**

- Search for "Knip UI" in VS Code Extensions
- Or install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=akshay7000.knip-ui-extension)

3. **Open Your Project:**

- Open a JavaScript/TypeScript project in VS Code
- Look for the Knip UI icon in the Activity Bar

4. **Start Scanning:**

- Click the Knip UI panel to open the sidebar
- Click "Start Scanning" to analyze your project
- Review categorized results with expandable sections

5. **Take Action:**

- Use context menu options to delete, ignore, or uninstall items
- Filter results using the search box
- Collapse/expand sections as needed
- Results persist when you switch to other VS Code panels

## Requirements

- Node.js 14+
- Knip installed globally (`npm install -g knip`)

## Release Notes

### 0.3.0 (Current Release)

**🎉 Major Update: Persistent State & Modern UI**

#### ✨ New Features

- **Persistent Scan Results**: Results now survive panel switches and VS Code restarts
- **Modern React UI**: Complete sidebar redesign with web-like interactions
- **Enhanced Search**: Improved filtering with real-time results
- **Visual State Indicators**: Clear feedback when state is restored or saved
- **Smart Collapse/Expand**: Fixed toggle controls with proper state tracking

#### 🐛 Bug Fixes

- Fixed scan results disappearing when switching VS Code panels
- Resolved batch operations affecting unintended items
- Fixed collapse/expand all button functionality
- Eliminated UI flickering and unwanted state resets
- Corrected null pointer errors in section toggles

#### 🚀 Technical Improvements

- React-powered webview for better performance
- Robust state management with persistence
- Enhanced error handling and graceful degradation
- Optimized memory usage and rendering performance

### 0.2.0

- Enhanced UI and functionality improvements
- Resolved search and enrollment issues
- Fixed course assignment bugs
- Updated deployment configuration

### 0.1.0

- Initial release with full Knip integration
- Tree view UI with categorized results
- Context menu actions for cleanup

## Configuration

The extension works out of the box with minimal configuration. Knip will automatically detect your project's configuration based on your framework and tooling.

### Custom Knip Configuration

You can customize Knip's behavior by creating a `knip.json` file in your project root:
