import { spawnSync } from "node:child_process";
import { getRepoVersion } from "./git-version.mjs";

const command = process.argv[2] ?? "up";
const extraArgs = process.argv.slice(3);

const commandMap = {
  build: ["compose", "build"],
  up: ["compose", "up", "-d", "--build"],
  "up-fg": ["compose", "up", "--build"]
};

if (!commandMap[command]) {
  process.stderr.write(
    `Unknown command "${command}". Use one of: ${Object.keys(commandMap).join(", ")}.\n`
  );
  process.exit(1);
}

const appVersion = getRepoVersion();
process.stdout.write(`Using APP_VERSION=${appVersion}\n`);

const result = spawnSync("docker", [...commandMap[command], ...extraArgs], {
  stdio: "inherit",
  env: {
    ...process.env,
    APP_VERSION: appVersion
  },
  shell: process.platform === "win32"
});

if (result.error) {
  process.stderr.write(`${result.error.message}\n`);
}

process.exit(result.status ?? 1);
