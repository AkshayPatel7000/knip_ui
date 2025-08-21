import * as vscode from "vscode";

export class ConfigService {
  private static readonly CONFIG_SECTION = "knipScanner";

  static getIgnoredItems(): string[] {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    return config.get<string[]>("ignoredItems", []);
  }

  static async addIgnoredItem(item: string): Promise<void> {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    const ignoredItems = this.getIgnoredItems();

    if (!ignoredItems.includes(item)) {
      ignoredItems.push(item);
      await config.update(
        "ignoredItems",
        ignoredItems,
        vscode.ConfigurationTarget.Workspace
      );
    }
  }

  static getDefaultPackageManager(): string {
    const config = vscode.workspace.getConfiguration(this.CONFIG_SECTION);
    return config.get<string>("packageManager", "npm");
  }
}
