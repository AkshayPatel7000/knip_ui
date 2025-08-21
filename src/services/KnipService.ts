import * as vscode from "vscode";
import { exec } from "child_process";
import { promisify } from "util";
import { KnipResult, KnipIssue } from "../types/KnipTypes";
import { ConfigService } from "./ConfigService";

const execAsync = promisify(exec);

export class KnipService {
  static async checkInstallation(): Promise<boolean> {
    try {
      await execAsync("knip --version");
      return true;
    } catch (error) {
      return false;
    }
  }

  static async runScan(): Promise<KnipResult | null> {
    if (!vscode.workspace.workspaceFolders) {
      throw new Error(
        "No workspace folder found. Please open a project folder."
      );
    }

    const workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
    let knipOutput = "";

    try {
      // Try with JSON reporter first
      const result = await execAsync("knip --reporter json", {
        cwd: workspaceRoot,
      });
      knipOutput = result.stdout;
    } catch (error: any) {
      // Knip returns non-zero exit code when issues are found
      knipOutput = error.stdout || error.stderr || "";
    }

    if (knipOutput) {
      try {
        return JSON.parse(knipOutput);
      } catch (parseError) {
        // Fallback to standard knip command
        try {
          const fallbackResult = await execAsync("knip", {
            cwd: workspaceRoot,
          });
          return this.parseKnipOutput(fallbackResult.stdout);
        } catch (fallbackError: any) {
          const fallbackOutput =
            fallbackError.stdout || fallbackError.stderr || "";
          if (fallbackOutput) {
            return this.parseKnipOutput(fallbackOutput);
          }
        }
      }
    }

    return null;
  }

  static filterIgnoredItems(data: KnipResult | null): KnipResult | null {
    if (!data) return null;

    const ignoredItems = ConfigService.getIgnoredItems();

    // Filter ignored files
    const filteredFiles = data.files.filter(
      (file) => !ignoredItems.includes(file)
    );

    // Filter ignored dependencies from issues
    const filteredIssues = data.issues.map((issue) => ({
      ...issue,
      dependencies: issue.dependencies.filter(
        (dep) => !ignoredItems.includes(dep.name)
      ),
      devDependencies: issue.devDependencies.filter(
        (dep) => !ignoredItems.includes(dep.name)
      ),
      unlisted: issue.unlisted.filter(
        (dep) => !ignoredItems.includes(dep.name)
      ),
    }));

    return {
      files: filteredFiles,
      issues: filteredIssues,
    };
  }

  static getTotalIssues(data: KnipResult | null): number {
    if (!data) return 0;

    let total = data.files.length;

    data.issues.forEach((issue) => {
      total += issue.dependencies.length;
      total += issue.devDependencies.length;
      total += issue.unlisted.length;
      total += issue.exports.length;
      total += issue.types.length;
      total += issue.unresolved.length;
      total += issue.duplicates.length;
    });

    return total;
  }

  private static parseKnipOutput(output: string): KnipResult {
    // Fallback parser for non-JSON output
    const result: KnipResult = {
      files: [],
      issues: [],
    };

    const lines = output.split("\n");
    let currentSection = "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.includes("unused files")) {
        currentSection = "files";
        continue;
      }

      if (currentSection === "files" && trimmed.includes(".")) {
        const cleanedLine = trimmed
          .replace(/\u001b\[[0-9;]*m/g, "")
          .replace(/[│├└─]/g, "")
          .trim();
        if (cleanedLine && !cleanedLine.includes("files)")) {
          result.files.push(cleanedLine);
        }
      }
    }

    return result;
  }
}
