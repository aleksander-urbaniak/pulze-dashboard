import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export function getRepoVersion() {
  const explicitVersion = process.env.APP_VERSION?.trim();
  if (explicitVersion) {
    return explicitVersion;
  }

  try {
    const gitVersion = execSync("git describe --tags --abbrev=0", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();

    if (gitVersion) {
      return gitVersion;
    }
  } catch {
    // Fall through to package version.
  }

  return process.env.npm_package_version ?? "v1.0.0";
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.stdout.write(getRepoVersion());
}
