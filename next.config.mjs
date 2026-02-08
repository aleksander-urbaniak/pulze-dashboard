import { execSync } from "node:child_process";

function resolveRepoVersion() {
  try {
    return execSync("git describe --tags --abbrev=0", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "";
  }
}

const appVersion =
  process.env.APP_VERSION ||
  process.env.NEXT_PUBLIC_APP_VERSION ||
  resolveRepoVersion() ||
  process.env.npm_package_version ||
  "v1.0.0";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion
  }
};

export default nextConfig;
