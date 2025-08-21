import * as vscode from "vscode";
import { ConfigService } from "../services/ConfigService";

export class PackageManagerUtils {
  static async choosePackageManager(): Promise<string | undefined> {
    const defaultPM = ConfigService.getDefaultPackageManager();

    const selection = await vscode.window.showQuickPick(
      [{ label: "npm" }, { label: "yarn" }],
      {
        placeHolder: "Choose package manager",
      }
    );

    return selection?.label;
  }

  static async installDependency(dependency: string): Promise<void> {
    const pm = await this.choosePackageManager();
    if (!pm) return;

    const terminal = vscode.window.createTerminal("Install Dependency");
    const installCommand =
      pm === "yarn" ? `yarn add ${dependency}` : `npm install ${dependency}`;

    terminal.show();
    terminal.sendText(installCommand);

    vscode.window.showInformationMessage(
      `Installing ${dependency} with ${pm}...`
    );
  }

  static async uninstallDependency(dependency: string): Promise<void> {
    const choice = await vscode.window.showWarningMessage(
      `Are you sure you want to uninstall ${dependency}?`,
      "Uninstall",
      "Cancel"
    );

    if (choice !== "Uninstall") return;

    const pm = await this.choosePackageManager();
    if (!pm) return;

    const terminal = vscode.window.createTerminal("Uninstall Dependency");
    const uninstallCommand =
      pm === "yarn"
        ? `yarn remove ${dependency}`
        : `npm uninstall ${dependency}`;

    terminal.show();
    terminal.sendText(uninstallCommand);

    vscode.window.showInformationMessage(
      `Uninstalling ${dependency} with ${pm}...`
    );
  }

  static async installKnip(packageManager: string): Promise<void> {
    const terminal = vscode.window.createTerminal("Knip Installation");
    const installCommand =
      packageManager === "yarn"
        ? "yarn global add knip"
        : "npm install -g knip";

    vscode.window.showInformationMessage(
      `Installing Knip globally with ${packageManager}...`
    );
    terminal.show();
    terminal.sendText(installCommand);
  }
}
