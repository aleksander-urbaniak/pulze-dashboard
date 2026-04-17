#!/usr/bin/env node

import bcrypt from "bcryptjs";
import Database from "better-sqlite3";
import crypto from "node:crypto";
import path from "node:path";
import process from "node:process";

const dbPath = process.env.PULZE_DB_PATH || path.join(process.cwd(), "data", "pulze.db");
const db = new Database(dbPath);

const validRoles = new Set(["admin", "manager", "operator", "auditor", "viewer"]);

function print(message = "") {
  process.stdout.write(`${message}\n`);
}

function fail(message, code = 1) {
  process.stderr.write(`Error: ${message}\n`);
  process.exit(code);
}

function usage() {
  print(`Pulze container CLI

Usage:
  pulze help
  pulze info
  pulze passwd <username> <new-password>
  pulze users ls
  pulze users create --username <name> --password <password> [--role <role>] [--first-name <value>] [--last-name <value>] [--email <value>]
  pulze users passwd <username> <new-password>
  pulze users delete <username> [--force]

Roles:
  admin | manager | operator | auditor | viewer`);
}

function getArgsMap(args) {
  const result = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const next = args[index + 1];
    if (!next || next.startsWith("--")) {
      result.set(key, "true");
      continue;
    }
    result.set(key, next);
    index += 1;
  }
  return result;
}

function listUsers() {
  const rows = db
    .prepare(
      `SELECT username, first_name, last_name, email, role, two_factor_enabled, auth_provider, created_at
       FROM users
       ORDER BY username COLLATE NOCASE`
    )
    .all();

  if (rows.length === 0) {
    print("No users found.");
    return;
  }

  const data = rows.map((row) => ({
    username: row.username,
    name: `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim() || "-",
    email: row.email || "-",
    role: row.role,
    twoFactor: row.two_factor_enabled ? "enabled" : "disabled",
    provider: row.auth_provider || "local",
    createdAt: row.created_at
  }));

  console.table(data);
}

function setPassword(username, password) {
  const normalizedUsername = String(username ?? "").trim();
  const normalizedPassword = String(password ?? "");

  if (!normalizedUsername) {
    fail("Username is required.");
  }
  if (normalizedPassword.trim().length < 8) {
    fail("Password must be at least 8 characters long.");
  }

  const existing = db
    .prepare("SELECT id, username FROM users WHERE username = ?")
    .get(normalizedUsername);
  if (!existing) {
    fail(`User "${normalizedUsername}" not found.`);
  }

  db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(
    bcrypt.hashSync(normalizedPassword, 10),
    new Date().toISOString(),
    existing.id
  );

  print(`Password updated for "${existing.username}".`);
}

function createUser(args) {
  const flags = getArgsMap(args);
  const username = (flags.get("username") || "").trim();
  const password = flags.get("password") || "";
  const role = (flags.get("role") || "viewer").trim().toLowerCase();
  const firstName = (flags.get("first-name") || "").trim();
  const lastName = (flags.get("last-name") || "").trim();
  const email = (flags.get("email") || "").trim();

  if (!username) {
    fail("Missing required --username.");
  }
  if (password.trim().length < 8) {
    fail("Missing required --password or password is shorter than 8 characters.");
  }
  if (!validRoles.has(role)) {
    fail(`Invalid role "${role}".`);
  }

  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
  if (existing) {
    fail(`User "${username}" already exists.`);
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO users (
      id,
      username,
      first_name,
      last_name,
      email,
      avatar_url,
      password_hash,
      role,
      two_factor_enabled,
      two_factor_secret,
      external_subject,
      auth_provider,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, ?, '', ?, ?, 0, '', '', 'local', ?, ?)`
  ).run(id, username, firstName, lastName, email, bcrypt.hashSync(password, 10), role, now, now);

  print(`Created user "${username}" with role "${role}".`);
}

function deleteUser(args) {
  const username = String(args[0] ?? "").trim();
  const force = args.includes("--force");

  if (!username) {
    fail("Username is required.");
  }

  const existing = db
    .prepare("SELECT id, username FROM users WHERE username = ?")
    .get(username);
  if (!existing) {
    fail(`User "${username}" not found.`);
  }

  const totalUsers = Number(db.prepare("SELECT COUNT(*) AS count FROM users").get().count ?? 0);
  if (totalUsers <= 1) {
    fail("Refusing to delete the last remaining user.");
  }
  if (!force) {
    fail('Delete is blocked without --force.');
  }

  db.prepare("DELETE FROM users WHERE id = ?").run(existing.id);
  print(`Deleted user "${existing.username}".`);
}

function info() {
  const userCount = Number(db.prepare("SELECT COUNT(*) AS count FROM users").get().count ?? 0);
  const settingsCount = Number(db.prepare("SELECT COUNT(*) AS count FROM settings").get().count ?? 0);
  print(`db: ${dbPath}`);
  print(`users: ${userCount}`);
  print(`settings rows: ${settingsCount}`);
}

function main() {
  const args = process.argv.slice(2);
  const [command, subcommand, ...rest] = args;

  if (!command || command === "help" || command === "--help" || command === "-h") {
    usage();
    return;
  }

  if (command === "info") {
    info();
    return;
  }

  if (command === "passwd") {
    setPassword(subcommand, rest[0]);
    return;
  }

  if (command === "users" && subcommand === "ls") {
    listUsers();
    return;
  }

  if (command === "users" && subcommand === "create") {
    createUser(rest);
    return;
  }

  if (command === "users" && subcommand === "passwd") {
    setPassword(rest[0], rest[1]);
    return;
  }

  if (command === "users" && subcommand === "delete") {
    deleteUser(rest);
    return;
  }

  usage();
  process.exitCode = 1;
}

try {
  main();
} finally {
  db.close();
}
