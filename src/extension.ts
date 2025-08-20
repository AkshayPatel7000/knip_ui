import * as vscode from "vscode";

import { KnipService } from "./services/knipService";
import { KnipTreeProvider } from "./ui/knipTreeProvider";

export async function activate(context: vscode.ExtensionContext) {
  console.log("🚀 Knip UI Extension activated");

  const knipService = new KnipService();
  const treeProvider = new KnipTreeProvider(knipService);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const treeView = vscode.window.createTreeView("knipView", {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });

  const checkAndShowState = async () => {
    const isInstalled = await knipService.isGloballyInstalled();
    if (!isInstalled) {
      treeProvider.showInstallPrompt();
    } else {
      treeProvider.showIntroScreen(); // Show intro in tree instead of webview
    }
  };

  const selectWorkspaceFolder = async (): Promise<
    vscode.WorkspaceFolder | undefined
  > => {
    const folders = vscode.workspace.workspaceFolders;

    if (!folders || folders.length === 0) {
      const folderUris = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        canSelectFiles: false,
        canSelectMany: false,
        openLabel: "Select Project Folder",
      });

      if (folderUris && folderUris.length > 0) {
        return { uri: folderUris[0], name: "Selected Project", index: 0 };
      }
      return undefined;
    } else if (folders.length === 1) {
      return folders[0];
    } else {
      const items = folders.map((folder) => ({
        label: folder.name,
        description: folder.uri.fsPath,
        folder: folder,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: "Select a workspace folder to scan",
      });

      return selected?.folder;
    }
  };

  const performScan = async (folder: vscode.WorkspaceFolder) => {
    try {
      treeProvider.setCurrentFolder(folder);
      treeProvider.setScanning(true);

      const results = await knipService.scanProject(folder.uri.fsPath);
      treeProvider.setResults(results);

      const totalIssues =
        results.unusedFiles.length +
        results.unusedExports.length +
        results.unusedDependencies.length +
        results.missingDependencies.length;

      vscode.window.setStatusBarMessage(
        `$(check) Scan complete: ${totalIssues} issues found`,
        5000
      );
    } catch (error) {
      treeProvider.setError(
        error instanceof Error ? error.message : String(error)
      );
    }
  };

  // Register commands
  context.subscriptions.push(
    // Open file and navigate to specific line
    vscode.commands.registerCommand("knipUI.openExport", (item) => {
      if (item.resourceUri) {
        vscode.window.showTextDocument(item.resourceUri).then((editor) => {
          // Extract line info from tooltip or item data
          const lineMatch = item.tooltip.match(/line (\d+)/);
          if (lineMatch) {
            const line = parseInt(lineMatch[1]) - 1; // VS Code uses 0-based indexing
            const position = new vscode.Position(line, 0);
            editor.selection = new vscode.Selection(position, position);
            editor.revealRange(new vscode.Range(position, position));
          }
        });
      }
    }),

    // Comment out unused export
    vscode.commands.registerCommand("knipUI.deleteExport", async (item) => {
      if (!item.resourceUri) return;

      const result = await vscode.window.showWarningMessage(
        `Comment out unused export: ${item.label.split(" (line")[0]}?`,
        { modal: true },
        "Comment Out"
      );

      if (result === "Comment Out") {
        try {
          const document = await vscode.workspace.openTextDocument(
            item.resourceUri
          );
          const edit = new vscode.WorkspaceEdit();

          // Extract export name and line from item
          const exportName = item.label.split(" (line")[0];
          const lineMatch = item.tooltip.match(/line (\d+)/);

          console.log("activate ~ lineMatch:", lineMatch);

          if (lineMatch) {
            const startLine = parseInt(lineMatch[1]) - 1; // Convert to 0-based index
            console.log("🚀 ~ activate ~ startLine:", startLine);

            // Find the end of the export block by counting braces
            let braceCount = 0;
            let endLine = startLine;
            let foundOpenBrace = false;

            for (let i = startLine; i < document.lineCount; i++) {
              const lineText = document.lineAt(i).text;

              // Count opening and closing braces
              const openBraces = (lineText.match(/\{/g) || []).length;
              const closeBraces = (lineText.match(/\}/g) || []).length;

              braceCount += openBraces;
              braceCount -= closeBraces;

              if (openBraces > 0) foundOpenBrace = true;

              // If we found braces and count reaches 0, we've found the end
              if (foundOpenBrace && braceCount <= 0) {
                endLine = i;
                break;
              }

              // For single-line exports without braces, stop at semicolon
              if (!foundOpenBrace && lineText.includes(";")) {
                endLine = i;
                break;
              }
            }

            console.log("🚀 ~ endLine:", endLine);

            // Create range from start to end of export
            const range = new vscode.Range(
              document.lineAt(startLine).range.start,
              document.lineAt(endLine).range.end
            );

            // Get the text and comment each line
            const textToComment = document.getText(range);
            const commentedText = textToComment
              .split("\n")
              .map((line) => "// " + line)
              .join("\n");

            console.log("🚀 ~ Original text:", textToComment);
            console.log("🚀 ~ Commented text:", commentedText);

            edit.replace(item.resourceUri, range, commentedText);

            await vscode.workspace.applyEdit(edit);
            vscode.window.showInformationMessage(
              `Commented out: ${exportName}`
            );
            vscode.commands.executeCommand("knipUI.rescan");
          }
        } catch (error) {
          console.error("❌ Error commenting out export:", error);
          vscode.window.showErrorMessage(
            `Failed to comment out export: ${error}`
          );
        }
      }
    }),
    // Install Knip
    vscode.commands.registerCommand("knipUI.install", async () => {
      await knipService.installGlobally();
      vscode.window.showInformationMessage("Knip installed successfully!");
      treeProvider.showIntroScreen();
    }),

    // Start scan
    vscode.commands.registerCommand("knipUI.scan", async () => {
      const folder = await selectWorkspaceFolder();
      if (folder) await performScan(folder);
    }),

    // Rescan
    vscode.commands.registerCommand("knipUI.rescan", async () => {
      const folder = treeProvider.getCurrentFolder();
      console.log("🚀 ~ activate ~ folder:", folder);
      if (!folder) {
        vscode.window.showWarningMessage(
          "No project folder selected. Please start a scan first."
        );
        return;
      }

      // Show progress notification
      vscode.window.setStatusBarMessage(
        "$(loading~spin) Rescanning project...",
        2000
      );

      try {
        treeProvider.setScanning(true);
        const results = await knipService.scanProject(folder.uri.fsPath);
        treeProvider.setResults(results);

        const totalIssues =
          results.unusedFiles.length +
          results.unusedExports.length +
          results.unusedDependencies.length +
          results.missingDependencies.length;

        vscode.window.setStatusBarMessage(
          `$(check) Rescan complete: ${totalIssues} issues found`,
          3000
        );
      } catch (error) {
        vscode.window.showErrorMessage(`Rescan failed: ${error}`);
        treeProvider.setError(
          error instanceof Error ? error.message : String(error)
        );
      }
    }),

    // Open file🚀 ~
    vscode.commands.registerCommand("knipUI.openFile", (item) => {
      if (item.resourceUri) {
        vscode.window.showTextDocument(item.resourceUri);
      }
    }),
    // Open file🚀 ~
    vscode.commands.registerCommand("knipUI.openType", (item) => {
      if (item.resourceUri) {
        vscode.window.showTextDocument(item.resourceUri);
      }
    }),
    // Delete file
    vscode.commands.registerCommand("knipUI.deleteFile", async (item) => {
      const config = vscode.workspace.getConfiguration("knipUI");
      const confirmDeletes = config.get<boolean>("confirmDeletes", true);

      if (confirmDeletes) {
        const result = await vscode.window.showWarningMessage(
          `Delete ${item.label}?`,
          { modal: true },
          "Delete"
        );
        if (result !== "Delete") return;
      }

      await vscode.workspace.fs.delete(item.resourceUri, { useTrash: true });
      vscode.window.showInformationMessage(`Deleted ${item.label}`);

      // Refresh
      vscode.commands.executeCommand("knipUI.rescan");
    }),

    // Ignore file
    vscode.commands.registerCommand("knipUI.ignoreFile", async (item) => {
      // Add to knip config ignore list
      vscode.window.showInformationMessage(
        `Added ${item.label} to ignore list`
      );
      // TODO: Implement knip config modification
    }),

    // Delete export (add comment or remove line)

    // Uninstall dependency with package manager selection
    vscode.commands.registerCommand("knipUI.uninstallDep", async (item) => {
      const packageManager = await vscode.window.showQuickPick(
        [
          { label: "npm", description: "npm uninstall" },
          { label: "yarn", description: "yarn remove" },
          { label: "pnpm", description: "pnpm remove" },
        ],
        { placeHolder: `Select package manager to uninstall ${item.label}` }
      );

      if (packageManager) {
        const commands = {
          npm: `npm uninstall ${item.label}`,
          yarn: `yarn remove ${item.label}`,
          pnpm: `pnpm remove ${item.label}`,
        };

        const terminal = vscode.window.createTerminal({
          name: `Uninstall ${item.label}`,
        });

        terminal.show();
        terminal.sendText(
          commands[packageManager.label as keyof typeof commands]
        );

        setTimeout(() => vscode.commands.executeCommand("knipUI.rescan"), 3000);
      }
    }),

    // Install missing dependency
    vscode.commands.registerCommand("knipUI.installMissing", async (item) => {
      const packageManager = await vscode.window.showQuickPick(
        [
          { label: "npm", description: "npm install" },
          { label: "yarn", description: "yarn add" },
          { label: "pnpm", description: "pnpm add" },
        ],
        { placeHolder: `Select package manager to install ${item.label}` }
      );

      if (packageManager) {
        const commands = {
          npm: `npm install ${item.label}`,
          yarn: `yarn add ${item.label}`,
          pnpm: `pnpm add ${item.label}`,
        };

        const terminal = vscode.window.createTerminal({
          name: `Install ${item.label}`,
        });

        terminal.show();
        terminal.sendText(
          commands[packageManager.label as keyof typeof commands]
        );

        setTimeout(() => vscode.commands.executeCommand("knipUI.rescan"), 3000);
      }
    })
  );

  // Initialize
  await checkAndShowState();
}

export function deactivate() {}
