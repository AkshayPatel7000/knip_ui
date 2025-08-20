import * as vscode from "vscode";
import * as path from "path";
import { KnipService, KnipResults } from "../services/knipService";

export class KnipTreeProvider implements vscode.TreeDataProvider<TreeItem> {
  private hasScannedBefore = false;
  private _onDidChangeTreeData = new vscode.EventEmitter<
    TreeItem | undefined | null | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private results: KnipResults | null = null;
  private currentFolder: vscode.WorkspaceFolder | null = null;
  private state: "install" | "intro" | "scanning" | "results" | "error" =
    "install";
  private errorMessage = "";

  constructor(private knipService: KnipService) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  showInstallPrompt(): void {
    this.state = "install";
    this.refresh();
  }
  showIntroScreen(): void {
    this.state = "intro";
    this.refresh();
  }
  setScanning(scanning: boolean): void {
    this.state = scanning ? "scanning" : "results";
    this.refresh();
  }

  setResults(results: KnipResults): void {
    this.results = results;
    this.state = "results";
    this.hasScannedBefore = true;
    // Enable rescan button context
    vscode.commands.executeCommand("setContext", "knipUI:hasResults", true);
    this.refresh();
  }

  setError(message: string): void {
    this.errorMessage = message;
    this.state = "error";
    this.refresh();
  }

  getCurrentFolder(): vscode.WorkspaceFolder | null {
    return this.currentFolder;
  }
  setCurrentFolder(folder: vscode.WorkspaceFolder): void {
    this.currentFolder = folder;
  }

  getTreeItem(element: TreeItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeItem): TreeItem[] {
    if (this.state === "install") {
      return [
        new TreeItem("📦 Knip Not Installed", "info", "warning"),
        new TreeItem(
          "Install Knip globally to get started",
          "install-desc",
          "info"
        ),
        new TreeItem(
          "🚀 Install Knip Now",
          "install-action",
          "cloud-download",
          vscode.TreeItemCollapsibleState.None,
          {
            command: "knipUI.install",
            title: "Install Knip",
            arguments: [],
          }
        ),
        new TreeItem(
          "🔄 Reload Extension",
          "reload-action",
          "refresh",
          vscode.TreeItemCollapsibleState.None,
          {
            command: "workbench.action.reloadWindow",
            title: "Reload Window",
            arguments: [],
          }
        ),
      ];
    }
    if (this.state === "intro") {
      return [
        new TreeItem(
          "🔍 Knip UI - Unused Code Scanner",
          "intro-title",
          "search"
        ),
        new TreeItem("", "spacer", "blank"), // Empty spacer
        new TreeItem("✨ Features:", "intro-features", "star"),
        new TreeItem("  📄 Find unused files", "feature", "file"),
        new TreeItem("  🔗 Detect unused exports", "feature", "symbol-method"),
        new TreeItem("  📦 Identify unused dependencies", "feature", "package"),
        new TreeItem(
          "  🗑️ Delete or ignore with one click",
          "feature",
          "trash"
        ),
        new TreeItem("", "spacer", "blank"), // Empty spacer
        new TreeItem(
          "🚀 Start Scanning Your Project",
          "start-scan",
          "play",
          vscode.TreeItemCollapsibleState.None,
          {
            command: "knipUI.scan",
            title: "Start Scan",
            arguments: [],
          }
        ),
      ];
    }
    if (this.state === "scanning") {
      return [
        new TreeItem(
          "🔍 Scanning project with Knip...",
          "scanning",
          "loading~spin"
        ),
        new TreeItem("Please wait...", "scanning-desc", "clock"),
        new TreeItem(
          "🔄 Cancel Scan",
          "cancel-scan",
          "stop-circle",
          vscode.TreeItemCollapsibleState.None,
          {
            command: "knipUI.cancelScan",
            title: "Cancel",
            arguments: [],
          }
        ),
      ];
    }
    // Error State
    if (this.state === "error") {
      return [
        new TreeItem("❌ Scan Failed", "error", "error"),
        new TreeItem(this.errorMessage, "error-detail", "info"),
        new TreeItem(
          "🔄 Try Again",
          "retry",
          "refresh",
          vscode.TreeItemCollapsibleState.None,
          {
            command: "knipUI.scan",
            title: "Retry Scan",
            arguments: [],
          }
        ),
      ];
    }
    if (!this.results || !element) {
      if (!this.results) {
        return [
          new TreeItem(
            "🔄 Refresh",
            "refresh",
            "refresh",
            vscode.TreeItemCollapsibleState.None,
            {
              command: "knipUI.rescan",
              title: "Refresh",
              arguments: [],
            }
          ),
          new TreeItem("No scan results", "empty", "search"),
        ];
      }

      // Root level categories with counts
      const categories: TreeItem[] = [];

      if (this.results.unusedFiles.length > 0) {
        categories.push(
          new TreeItem(
            `📄 Unused Files (${this.results.unusedFiles.length})`,
            "filesCategory",
            "file",
            vscode.TreeItemCollapsibleState.Expanded
          )
        );
      }

      if (this.results.unusedExports.length > 0) {
        categories.push(
          new TreeItem(
            `🔗 Unused Exports (${this.results.unusedExports.length})`,
            "exportsCategory",
            "symbol-method",
            vscode.TreeItemCollapsibleState.Expanded
          )
        );
      }

      if (this.results.unusedTypes.length > 0) {
        categories.push(
          new TreeItem(
            `🏷️ Unused Types (${this.results.unusedTypes.length})`,
            "typesCategory",
            "symbol-interface",
            vscode.TreeItemCollapsibleState.Expanded
          )
        );
      }

      if (this.results.unusedDependencies.length > 0) {
        categories.push(
          new TreeItem(
            `📦 Unused Dependencies (${this.results.unusedDependencies.length})`,
            "depsCategory",
            "package",
            vscode.TreeItemCollapsibleState.Expanded
          )
        );
      }

      if (this.results.unusedDevDependencies.length > 0) {
        categories.push(
          new TreeItem(
            `🔧 Unused Dev Dependencies (${this.results.unusedDevDependencies.length})`,
            "devDepsCategory",
            "tools",
            vscode.TreeItemCollapsibleState.Expanded
          )
        );
      }

      if (this.results.missingDependencies.length > 0) {
        categories.push(
          new TreeItem(
            `⚠️ Missing Dependencies (${this.results.missingDependencies.length})`,
            "missingCategory",
            "warning",
            vscode.TreeItemCollapsibleState.Expanded
          )
        );
      }

      if (this.results.unresolvedModules.length > 0) {
        categories.push(
          new TreeItem(
            `❓ Unresolved Modules (${this.results.unresolvedModules.length})`,
            "unresolvedCategory",
            "question",
            vscode.TreeItemCollapsibleState.Expanded
          )
        );
      }

      if (this.results.duplicates.length > 0) {
        categories.push(
          new TreeItem(
            `👥 Duplicates (${this.results.duplicates.length})`,
            "duplicatesCategory",
            "copy",
            vscode.TreeItemCollapsibleState.Expanded
          )
        );
      }

      return categories.length > 0
        ? categories
        : [new TreeItem("✅ No issues found! 🎉", "success", "check")];
    }

    // Category children
    switch (element.type) {
      case "filesCategory":
        return this.results.unusedFiles.map((file) => {
          const item = new TreeItem(
            path.basename(file.relativePath),
            "unusedFile",
            "file"
          );
          item.resourceUri = vscode.Uri.file(file.path);
          item.tooltip = file.relativePath;
          item.contextValue = "unusedFile";
          return item;
        });

      case "exportsCategory":
        return this.results.unusedExports.map((exp) => {
          const fileName = path.basename(exp.file);
          const lineInfo = exp.line ? ` (line ${exp.line})` : "";
          const item = new TreeItem(
            `${exp.export}${lineInfo} in ${fileName}`,
            "unusedExport",
            "symbol-method"
          );
          item.resourceUri = vscode.Uri.file(exp.file);
          item.tooltip = `${exp.export} at line ${exp.line || "?"}, col ${
            exp.col || "?"
          } in ${exp.file}`;
          item.contextValue = "unusedExport";
          return item;
        });

      case "typesCategory":
        return this.results.unusedTypes.map((type) => {
          const fileName = path.basename(type.file);
          const lineInfo = type.line ? ` (line ${type.line})` : "";
          const item = new TreeItem(
            `${type.type}${lineInfo} in ${fileName}`,
            "unusedType",
            "symbol-interface"
          );
          item.resourceUri = vscode.Uri.file(type.file);
          item.tooltip = `${type.type} at line ${type.line || "?"} in ${
            type.file
          }`;
          item.contextValue = "unusedType";
          return item;
        });

      case "depsCategory":
        return this.results.unusedDependencies.map((dep) => {
          const item = new TreeItem(dep.name, "unusedDep", "package");
          item.contextValue = "unusedDep";
          item.tooltip = `Unused dependency: ${dep.name}`;
          return item;
        });

      case "devDepsCategory":
        return this.results.unusedDevDependencies.map((dep) => {
          const item = new TreeItem(dep.name, "unusedDevDep", "tools");
          item.contextValue = "unusedDevDep";
          item.tooltip = `Unused dev dependency: ${dep.name}`;
          return item;
        });

      case "missingCategory":
        return this.results.missingDependencies.map((dep) => {
          const item = new TreeItem(dep, "missingDep", "warning");
          item.contextValue = "missingDep";
          item.tooltip = `Missing dependency: ${dep}`;
          return item;
        });

      case "unresolvedCategory":
        return this.results.unresolvedModules.map((unresolved) => {
          const fileName = path.basename(unresolved.file);
          const item = new TreeItem(
            `${unresolved.module} in ${fileName}`,
            "unusedFile",
            "question"
          );
          item.resourceUri = vscode.Uri.file(unresolved.file);
          item.tooltip = `Unresolved module: ${unresolved.module} in ${unresolved.file}`;
          item.contextValue = "unusedFile";
          return item;
        });

      case "duplicatesCategory":
        return this.results.duplicates.map((dup) => {
          const fileName = path.basename(dup.file);
          const item = new TreeItem(
            `${dup.duplicate} in ${fileName}`,
            "duplicate",
            "copy"
          );
          item.resourceUri = vscode.Uri.file(dup.file);
          item.tooltip = `Duplicate: ${dup.duplicate} in ${dup.file}`;
          item.contextValue = "duplicate";
          return item;
        });

      default:
        return [];
    }
  }
}
class TreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly type: string,
    public readonly iconName: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState = vscode
      .TreeItemCollapsibleState.None,
    command?: vscode.Command
  ) {
    super(label, collapsibleState);

    this.contextValue = type;
    this.iconPath = new vscode.ThemeIcon(iconName);
    this.command = command;
  }
}
