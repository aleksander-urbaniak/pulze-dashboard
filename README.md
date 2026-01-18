# PulZe Monitoring Dashboard

PulZe is a unified monitoring dashboard that aggregates alerts from Prometheus/Alertmanager, Zabbix, and Uptime Kuma into a single Next.js UI. It includes user management, role-based access, and configurable data sources, all backed by a local SQLite database.

## Tech Overview
- Next.js (App Router) + React
- TypeScript
- Tailwind CSS
- SQLite (better-sqlite3)

## Local Setup
Prereqs:
- Node.js 20+ (LTS recommended)
- npm

Install and run:
```
npm install
npm run dev
```

Build and start:
```
npm run build
npm start
```

Open `http://localhost:3000`.

## First Run
On first launch, the app prompts you to create the initial admin account. After login:
- Configure data sources in Settings -> Data Sources.
- Manage users and profile in Settings -> Users.

## Data Sources
Each source supports multiple instances with labels:
- Prometheus/Alertmanager: base URL only; `/api/v2/alerts` is appended automatically.
- Zabbix: base URL only; `/zabbix/api_jsonrpc.php` is appended automatically.
- Uptime Kuma: base URL + mode (status page or API key).

## Database
SQLite database lives at `data/pulze.db`. It is created automatically on first run.

## Troubleshooting
If `better-sqlite3` fails to build on Windows, use Node.js LTS and ensure Visual Studio Build Tools are installed.
