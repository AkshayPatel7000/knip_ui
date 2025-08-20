import * as vscode from "vscode";

export class IntroWebview {
  constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly context: vscode.ExtensionContext
  ) {
    this.panel.webview.html = this.getWebviewContent();
  }

  private getWebviewContent(): string {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Knip UI</title>
      <style>
        body {
          font-family: var(--vscode-font-family);
          background: var(--vscode-editor-background);
          color: var(--vscode-editor-foreground);
          margin: 0;
          padding: 0;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        .container {
          text-align: center;
          max-width: 600px;
          padding: 40px;
        }
        .logo {
          font-size: 48px;
          margin-bottom: 20px;
        }
        .title {
          font-size: 32px;
          font-weight: bold;
          margin-bottom: 16px;
          color: var(--vscode-textLink-foreground);
        }
        .description {
          font-size: 18px;
          margin-bottom: 40px;
          color: var(--vscode-descriptionForeground);
          line-height: 1.6;
        }
        .feature-list {
          text-align: left;
          margin: 30px 0;
          display: inline-block;
        }
        .feature {
          display: flex;
          align-items: center;
          margin: 12px 0;
          font-size: 16px;
        }
        .feature-icon {
          margin-right: 12px;
          font-size: 20px;
        }
        .start-button {
          background: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          border-radius: 4px;
          padding: 16px 32px;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          transition: background 0.2s;
        }
        .start-button:hover {
          background: var(--vscode-button-hoverBackground);
        }
        .start-button:active {
          transform: translateY(1px);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="logo">🔍</div>
        <h1 class="title">Knip UI</h1>
        <p class="description">
          Find and remove unused files, exports, and dependencies in your JavaScript/TypeScript projects.
          Powered by Knip with a beautiful VS Code interface.
        </p>
        
        <div class="feature-list">
          <div class="feature">
            <span class="feature-icon">📄</span>
            <span>Detect unused files and dead code</span>
          </div>
          <div class="feature">
            <span class="feature-icon">🔗</span>
            <span>Find unused exports and imports</span>
          </div>
          <div class="feature">
            <span class="feature-icon">📦</span>
            <span>Identify unused dependencies</span>
          </div>
          <div class="feature">
            <span class="feature-icon">🗑️</span>
            <span>Delete or ignore with one click</span>
          </div>
        </div>

        <button class="start-button" onclick="startScan()">
          🚀 Start Scanning
        </button>
      </div>

      <script>
        const vscode = acquireVsCodeApi();
        
        function startScan() {
          vscode.postMessage({ command: 'startScan' });
        }
      </script>
    </body>
    </html>
    `;
  }
}
