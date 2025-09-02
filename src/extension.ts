import * as vscode from "vscode";
import { KnipWebviewProvider } from "./providers/KnipWebviewProvider";

export function activate(context: vscode.ExtensionContext) {
  console.log("Knip Scanner extension is now active!");

  const provider = new KnipWebviewProvider(context.extensionUri, context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("knip-webview", provider)
  );

  // Register commands
  const commands = [
    vscode.commands.registerCommand("knip.refresh", () => provider.rescan()),
    vscode.commands.registerCommand("knip.collapseAll", () =>
      provider.collapseAll()
    ),
    vscode.commands.registerCommand("knip.clearResults", () =>
      provider.clearState()
    ),
  ];

  context.subscriptions.push(...commands);
}

export function deactivate() {}
