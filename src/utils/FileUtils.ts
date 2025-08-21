import * as vscode from "vscode";
import * as path from "path";

export class FileUtils {
  static async openFile(filePath: string): Promise<void> {
    try {
      // Handle relative paths from workspace root
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      let fullPath = filePath;

      if (workspaceRoot && !path.isAbsolute(filePath)) {
        fullPath = path.join(workspaceRoot, filePath);
      }

      const uri = vscode.Uri.file(fullPath);
      await vscode.window.showTextDocument(uri);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open file: ${error}`);
    }
  }

  static async deleteFile(filePath: string): Promise<boolean> {
    const choice = await vscode.window.showWarningMessage(
      `Are you sure you want to delete ${path.basename(filePath)}?`,
      "Delete",
      "Cancel"
    );

    if (choice === "Delete") {
      try {
        const workspaceRoot =
          vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        let fullPath = filePath;

        if (workspaceRoot && !path.isAbsolute(filePath)) {
          fullPath = path.join(workspaceRoot, filePath);
        }

        const uri = vscode.Uri.file(fullPath);
        await vscode.workspace.fs.delete(uri);
        vscode.window.showInformationMessage(
          `Deleted ${path.basename(filePath)}`
        );
        return true;
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to delete file: ${error}`);
      }
    }
    return false;
  }
}
