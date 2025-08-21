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

  constructor(private readonly _extensionUri: vscode.Uri) {}

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

    webviewView.webview.onDidReceiveMessage(async (data: WebviewMessage) => {
      await this.handleMessage(data);
    });

    // Send initial welcome state
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
      this.updateWebview();
    }
  }

  private async ignoreDependency(dependency: string): Promise<void> {
    await ConfigService.addIgnoredItem(dependency);
    vscode.window.showInformationMessage(`Added ${dependency} to ignore list`);

    // Re-filter and update the view
    this.knipData = KnipService.filterIgnoredItems(this.knipData);
    this.updateWebview();
  }

  private async ignoreFile(filePath: string): Promise<void> {
    await ConfigService.addIgnoredItem(filePath);
    vscode.window.showInformationMessage(
      `Added ${path.basename(filePath)} to ignore list`
    );

    // Re-filter and update the view
    this.knipData = KnipService.filterIgnoredItems(this.knipData);
    this.updateWebview();
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
