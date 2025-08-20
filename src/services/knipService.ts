import { exec } from "child_process";
import { promisify } from "util";
import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";

const execAsync = promisify(exec);

export interface KnipResults {
  unusedFiles: Array<{ path: string; relativePath: string }>;
  unusedExports: Array<{
    file: string;
    export: string;
    line?: number;
    col?: number;
    pos?: number;
  }>;
  unusedDependencies: Array<{ line?: number; col?: number; name: string }>;
  unusedDevDependencies: Array<{ line?: number; col?: number; name: string }>;
  unusedOptionalPeerDependencies: string[];
  missingDependencies: string[];
  unresolvedModules: Array<{ file: string; module: string }>;
  duplicates: Array<{ file: string; duplicate: string }>;
  unusedTypes: Array<{
    file: string;
    type: string;
    line?: number;
    col?: number;
  }>;
  unusedBinaries: string[];
}

export class KnipService {
  async isGloballyInstalled(): Promise<boolean> {
    try {
      await execAsync("knip --version", { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }

  async installGlobally(): Promise<void> {
    const terminal = vscode.window.createTerminal("Install Knip");
    terminal.show();
    terminal.sendText("npm install -g knip");

    return new Promise((resolve) => {
      const disposable = vscode.window.onDidCloseTerminal((closedTerminal) => {
        if (closedTerminal === terminal) {
          disposable.dispose();
          resolve();
        }
      });
    });
  }

  async scanProject(projectPath: string): Promise<KnipResults> {
    try {
      // Validate project structure
      await this.validateProject(projectPath);

      // Try with better error reporting
      console.log("🔍 Running Knip scan in:", projectPath);

      const { stdout, stderr } = await execAsync(
        "knip --reporter json --no-exit-code",
        {
          cwd: projectPath,
          maxBuffer: 10 * 1024 * 1024,
          timeout: 300000,
          env: { ...process.env, NODE_ENV: "development" },
        }
      );

      console.log("📤 Knip stderr:", stderr);
      console.log("📥 Knip stdout length:", stdout.length);

      if (!stdout.trim()) {
        throw new Error(
          "Knip returned empty output. The project might have no issues or no analyzable files."
        );
      }

      let knipOutput;
      try {
        knipOutput = JSON.parse(stdout);
      } catch (parseError) {
        console.error("❌ Failed to parse Knip JSON output:", stdout);
        throw new Error(`Invalid JSON output from Knip: ${parseError}`);
      }

      console.log("📊 Knip output structure:", Object.keys(knipOutput));

      return this.transformKnipOutput(knipOutput, projectPath);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error("❌ Knip scan error:", error);

      // Provide more specific error messages
      if (error.code === "ENOENT") {
        throw new Error(
          "Knip command not found. Make sure Knip is installed globally."
        );
      }

      if (error.message.includes("timeout")) {
        throw new Error(
          "Knip scan timed out. Try scanning a smaller directory."
        );
      }

      if (error.stderr) {
        const stderr = error.stderr.toString();
        if (stderr.includes("No entry files found")) {
          throw new Error(
            "No entry files found. Make sure your project has proper entry points (index.js, main.ts, etc.)"
          );
        }
        if (stderr.includes("package.json")) {
          throw new Error(
            "Invalid package.json. Make sure your project has a valid package.json file."
          );
        }
        throw new Error(`Knip error: ${stderr}`);
      }

      throw new Error(`Knip scan failed: ${error.message || error}`);
    }
  }

  private async validateProject(projectPath: string): Promise<void> {
    // Check if package.json exists
    const packageJsonPath = path.join(projectPath, "package.json");
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(
        "No package.json found in the selected directory. Please select a valid Node.js project."
      );
    }

    // Check if there are any JS/TS files
    const hasSourceFiles = this.hasSourceFiles(projectPath);
    if (!hasSourceFiles) {
      throw new Error(
        "No JavaScript or TypeScript files found in the project."
      );
    }
  }

  private hasSourceFiles(projectPath: string): boolean {
    const extensions = [".js", ".jsx", ".ts", ".tsx", ".vue", ".svelte"];
    const commonDirs = ["src", "lib", "app", "pages", "components"];

    // Check root level
    const rootFiles = fs.readdirSync(projectPath);
    if (
      rootFiles.some((file) => extensions.some((ext) => file.endsWith(ext)))
    ) {
      return true;
    }

    // Check common source directories
    for (const dir of commonDirs) {
      const dirPath = path.join(projectPath, dir);
      if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
        return true;
      }
    }

    return false;
  }

  private transformKnipOutput(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    knipOutput: any,
    projectPath: string
  ): KnipResults {
    const results: KnipResults = {
      unusedFiles: [],
      unusedExports: [],
      unusedDependencies: [],
      unusedDevDependencies: [],
      unusedOptionalPeerDependencies: [],
      missingDependencies: [],
      unresolvedModules: [],
      duplicates: [],
      unusedTypes: [],
      unusedBinaries: [],
    };

    // Handle issues array from Knip
    if (knipOutput.issues && Array.isArray(knipOutput.issues)) {
      for (const issue of knipOutput.issues) {
        const filePath = path.resolve(projectPath, issue.file);

        // Parse unused exports
        if (issue.exports && Array.isArray(issue.exports)) {
          for (const exp of issue.exports) {
            results.unusedExports.push({
              file: filePath,
              export: exp.name,
              line: exp.line,
              col: exp.col,
              pos: exp.pos,
            });
          }
        }
        // Parse unused types
        if (issue.types && Array.isArray(issue.types)) {
          for (const type of issue.types) {
            results.unusedTypes.push({
              file: filePath,
              type: type.name,
              line: type.line,
              col: type.col,
            });
          }
        }
        // Parse dependencies
        if (issue.dependencies)
          results.unusedDependencies.push(...issue.dependencies);

        if (issue.devDependencies.length > 0)
          results.unusedDevDependencies.push(...issue.devDependencies);
        if (issue.optionalPeerDependencies)
          results.unusedOptionalPeerDependencies.push(
            ...issue.optionalPeerDependencies
          );
        // Parse unresolved modules
        if (issue.unresolved && Array.isArray(issue.unresolved)) {
          for (const unresolved of issue.unresolved) {
            results.unresolvedModules.push({
              file: filePath,
              module: unresolved.name || unresolved,
            });
          }
        }
        // Parse missing dependencies
        if (issue.unlisted && Array.isArray(issue.unlisted)) {
          for (const dep of issue.unlisted) {
            const depName = typeof dep === "string" ? dep : dep.name;
            if (!results.missingDependencies.includes(depName)) {
              results.missingDependencies.push(depName);
            }
          }
        }
        // Parse duplicates
        if (issue.duplicates && Array.isArray(issue.duplicates)) {
          for (const dup of issue.duplicates) {
            results.duplicates.push({
              file: filePath,
              duplicate: dup.name || dup,
            });
          }
        }

        // Parse binaries
        if (issue.binaries) results.unusedBinaries.push(...issue.binaries);
      }
    }

    // Handle unused files (if in root level)
    if (knipOutput.files) {
      results.unusedFiles = knipOutput.files.map((file: string) => ({
        path: path.resolve(projectPath, file),
        relativePath: file,
      }));
    }

    // Handle dependencies (if in root level)

    return results;
  }
}
