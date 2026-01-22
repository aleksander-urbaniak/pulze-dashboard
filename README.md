*NOTE: This application is still partly under development. You may encounter bugs or errors. If so please create an issue.*

# PulZe Monitoring Dashboard

PulZe is a unified monitoring dashboard that aggregates alerts from Prometheus/Alertmanager, Zabbix, and Uptime Kuma into a single, fast Next.js UI. It includes user management, role-based access, data source configuration, and appearance controls, backed by a local SQLite database.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white) ![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white) ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css&logoColor=white) ![SQLite](https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white) ![Node.js](https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white) ![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)

<img src="images/dashboard.png" alt="Pulze Dashboard Demo Screenshot" width="800">

## Features

- Centralized alert view with cards, table, and split modes
- Cross-source search and filtering
- Bulk acknowledge/resolve actions with audit trail
- Role-based access (admin/viewer)
- Customizable appearance (theme, colors, background, branding)
- Analytics dashboards and alert trends

## Tech Stack

- Next.js (App Router) + React
- TypeScript
- Tailwind CSS
- SQLite (better-sqlite3)

## Getting Started

### Local Development

Prerequisites:
- Node.js 20+ (LTS recommended)
- npm

Install and run:
```bash
npm install
npm run dev
```

Build and start:
```bash
npm run build
npm start
```

Open `http://localhost:3000`.

### Docker (Compose)

```bash
docker compose up -d --build
```

PulZe runs on `http://localhost:3000` and stores its SQLite database in a named Docker volume.

### Docker (Command)

```bash
docker build -t pulze-dashboard .
docker run -d --name pulze-dashboard -p 3000:3000 -v pulze-data:/app/data pulze-dashboard
```

## First Run

On first launch, the app prompts you to create the initial admin account. After login:
- Configure data sources in Settings -> Data Sources.
- Manage users and profile in Settings -> Users.
- Adjust appearance and branding in Settings -> Appearance (admin only).

## Data Sources

Each source supports multiple instances with labels:
- Prometheus/Alertmanager: base URL only; `/api/v2/alerts` is appended automatically.
- Zabbix: base URL only; `/zabbix/api_jsonrpc.php` is appended automatically.
- Uptime Kuma: base URL + mode (status page or API key).

## Database

The SQLite database lives at `data/pulze.db`. It is created automatically on first run.

## Environment

No environment variables are required by default.

## Troubleshooting

If `better-sqlite3` fails to build on Windows, use Node.js LTS and ensure Visual Studio Build Tools are installed.
