import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import { KnipResult, WebviewMessage } from "../types/KnipTypes";
import { KnipService } from "../services/KnipService";
import { ConfigService } from "../services/ConfigService";
import { FileUtils } from "../utils/FileUtils";
import { PackageManagerUtils } from "../utils/PackageManagerUtils";

export class KnipWebviewProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private knipData: KnipResult | null = null;
  private _context: vscode.ExtensionContext; // ✅ Add context for state persistence

  constructor(
    private readonly _extensionUri: vscode.Uri,
    context: vscode.ExtensionContext // ✅ Accept context in constructor
  ) {
    this._context = context;
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    // ✅ Handle visibility changes to restore state
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible && this.knipData) {
        this.updateWebview();
      }
    });

    // ✅ Restore state on initialization
    this.restoreState();

    webviewView.webview.onDidReceiveMessage(async (data: WebviewMessage) => {
      await this.handleMessage(data);
    });

    // Send initial state
    this.updateWebview();
  }

  public async rescan(): Promise<void> {
    await this.startKnipScan();
  }

  public collapseAll(): void {
    this._view?.webview.postMessage({
      type: "collapseAll",
    });
  }

  public refresh(): void {
    if (this._view) {
      this._view.webview.html = this._getHtmlForWebview(this._view.webview);
      this.updateWebview();
    }
  }

  // ✅ Add clearState method
  public clearState(): void {
    this._context.workspaceState.update("knipScanResults", undefined);
    this.knipData = null;
    this.updateWebview();
    vscode.window.showInformationMessage("Cleared previous scan results");
  }

  private async handleMessage(data: WebviewMessage): Promise<void> {
    switch (data.type) {
      case "getStarted":
        await this.handleGetStarted();
        break;
      case "startScan":
        await this.startKnipScan();
        break;
      case "installKnip":
        await this.installKnip(data.packageManager);
        break;
      case "openFile":
        await FileUtils.openFile(data.filePath);
        break;
      case "deleteFile":
        await this.deleteFile(data.filePath);
        break;
      case "installDep":
        await PackageManagerUtils.installDependency(data.dependency);
        break;
      case "uninstallDep":
        await PackageManagerUtils.uninstallDependency(data.dependency);
        break;
      case "ignoreDep":
        await this.ignoreDependency(data.dependency);
        break;
      case "ignoreFile":
        await this.ignoreFile(data.filePath);
        break;
      case "rescan":
        await this.rescan();
        break;
      // ✅ Handle clear results message
      case "clearResults":
        this.clearState();
        break;
    }
  }

  private updateWebview(): void {
    if (this._view) {
      this._view.webview.postMessage({
        type: "updateData",
        data: this.knipData,
      });
    }
  }

  private async handleGetStarted(): Promise<void> {
    const isInstalled = await KnipService.checkInstallation();
    this._view?.webview.postMessage({
      type: "knipInstallStatus",
      installed: isInstalled,
    });
    if (!isInstalled) {
      this._view?.webview.postMessage({
        type: "showInstallPrompt",
      });
    }
  }

  private async installKnip(packageManager: string): Promise<void> {
    await PackageManagerUtils.installKnip(packageManager);
    setTimeout(async () => {
      const isInstalled = await KnipService.checkInstallation();
      this._view?.webview.postMessage({
        type: "knipInstallStatus",
        installed: isInstalled,
      });
    }, 5000);
  }

  private async startKnipScan(): Promise<void> {
    const isInstalled = await KnipService.checkInstallation();
    if (!isInstalled) {
      vscode.window.showErrorMessage(
        "Knip is not installed. Please install it first."
      );
      return;
    }

    this._view?.webview.postMessage({
      type: "scanStarted",
    });

    try {
      const rawData = await KnipService.runScan();
      this.knipData = KnipService.filterIgnoredItems(rawData);

      // ✅ Save state after successful scan
      this.saveState();

      this._view?.webview.postMessage({
        type: "scanCompleted",
        data: this.knipData,
      });

      const totalIssues = KnipService.getTotalIssues(this.knipData);
      vscode.window.showInformationMessage(
        `Knip scan completed! Found ${totalIssues} items to review.`
      );
    } catch (error) {
      console.error("Knip scan error:", error);
      this._view?.webview.postMessage({
        type: "scanError",
        error:
          "Unable to run Knip scan. Please check that your project has a package.json file.",
      });
      vscode.window.showErrorMessage(`Knip scan failed: ${error}`);
    }
  }

  private async deleteFile(filePath: string): Promise<void> {
    const deleted = await FileUtils.deleteFile(filePath);
    if (deleted && this.knipData) {
      this.knipData.files = this.knipData.files.filter((f) => f !== filePath);

      // ✅ Save state after changes
      this.saveState();
      this.updateWebview();
    }
  }

  private async ignoreDependency(dependency: string): Promise<void> {
    await ConfigService.addIgnoredItem(dependency);
    vscode.window.showInformationMessage(`Added ${dependency} to ignore list`);

    // Re-filter and update the view
    this.knipData = KnipService.filterIgnoredItems(this.knipData);

    // ✅ Save state after changes
    this.saveState();
    this.updateWebview();
  }

  private async ignoreFile(filePath: string): Promise<void> {
    await ConfigService.addIgnoredItem(filePath);
    vscode.window.showInformationMessage(
      `Added ${path.basename(filePath)} to ignore list`
    );

    // Re-filter and update the view
    this.knipData = KnipService.filterIgnoredItems(this.knipData);

    // ✅ Save state after changes
    this.saveState();
    this.updateWebview();
  }

  // ✅ Save state using extension context
  private saveState(): void {
    if (this.knipData) {
      this._context.workspaceState.update("knipScanResults", {
        data: this.knipData,
        timestamp: Date.now(),
        workspaceFolder: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
      });
    }
  }

  // ✅ Restore state using extension context
  private async restoreState(): Promise<void> {
    const saved = this._context.workspaceState.get("knipScanResults") as any;
    console.log("🚀 ~ KnipWebviewProvider ~ restoreState ~ saved:", saved);

    if (saved?.data) {
      const currentWorkspace =
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

      // Only restore if same workspace and recent (within 1 hour)
      const isRecent = Date.now() - saved.timestamp < 60 * 60 * 1000;
      const isSameWorkspace = saved.workspaceFolder === currentWorkspace;

      if (isRecent && isSameWorkspace) {
        this.knipData = saved.data;
        this.updateWebview();

        vscode.window.setStatusBarMessage(
          "Restored previous Knip scan results",
          3000
        );
      }
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    // Read the HTML file
    const htmlPath = path.join(
      this._extensionUri.fsPath,
      "src",
      "webview",
      "webview.html"
    );
    return fs.readFileSync(htmlPath, "utf8");
  }
}
