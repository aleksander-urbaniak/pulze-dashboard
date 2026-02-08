<div align="center" width="100%">
  <img src="./app/icon.svg" width="128" alt="PulZe Logo" />
</div>

# PulZe Dashboard

PulZe is an easy-to-use self-hosted monitoring dashboard that aggregates alerts from Prometheus/Alertmanager, Zabbix, and Uptime Kuma in one place.

<img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white" />
<img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
<img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" />
<img src="https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css&logoColor=white" />
<img src="https://img.shields.io/badge/SQLite-3-003B57?logo=sqlite&logoColor=white" />
<img src="https://img.shields.io/badge/Node.js-20-339933?logo=node.js&logoColor=white" />

<img src="./public/images/dashboard.png" width="900" alt="PulZe Dashboard Screenshot" />

## ⭐ Features

- Unified alert view (cards, table, split view)
- Cross-source search and filtering
- Bulk acknowledge and resolve actions with audit trail
- Role-based access (admin/viewer)
- Appearance and branding customization
- Analytics and alert trend views

## 🔧 How to Run

### 🐳 Docker Compose (Published Image)

Compose file uses:
- `aleksanderurbaniak/pulze-dashboard:latest`

```bash
docker compose pull
docker compose up -d
```

PulZe runs on `http://localhost:3000`.

### 🐳 Docker Compose (Build Local Source)

```bash
npm run docker:up
```

Stop containers:

```bash
npm run docker:down
```

### 🐳 Docker Command

Run published image directly:

```bash
docker run -d --name pulze-dashboard -p 3000:3000 -v pulze-data:/app/data aleksanderurbaniak/pulze-dashboard:latest
```

Build locally, then run:

`bash`
```bash
APP_VERSION=$(npm run --silent version:repo)
docker build --build-arg APP_VERSION="$APP_VERSION" -t aleksanderurbaniak/pulze-dashboard:latest .
docker run -d --name pulze-dashboard -p 3000:3000 -v pulze-data:/app/data aleksanderurbaniak/pulze-dashboard:latest
```

`PowerShell`
```powershell
$env:APP_VERSION = npm run --silent version:repo
docker build --build-arg APP_VERSION=$env:APP_VERSION -t aleksanderurbaniak/pulze-dashboard:latest .
docker run -d --name pulze-dashboard -p 3000:3000 -v pulze-data:/app/data aleksanderurbaniak/pulze-dashboard:latest
```

### 💪 Local Development

Requirements:

- Node.js 20+ (LTS recommended)
- npm

```bash
npm install
npm run dev
```

Production build locally:

```bash
npm run build
npm start
```

## 🆙 Versioning

- App version is resolved from latest local Git tag: `git describe --tags --abbrev=0`
- Fallback is `package.json` version (`v1.0.0`) when Git metadata is unavailable
- Check resolved version:

```bash
npm run version:repo
```

## 🆕 First Run

On first launch, create the initial admin account. After login:

- Configure data sources in `Settings -> Data Sources`
- Manage users in `Settings -> Users`
- Adjust look and branding in `Settings -> Appearance` (admin only)

## 🔌 Data Sources

Each source supports multiple instances with labels:

- Prometheus/Alertmanager: base URL only, `/api/v2/alerts` is appended automatically
- Zabbix: base URL only, `/zabbix/api_jsonrpc.php` is appended automatically
- Uptime Kuma: base URL + mode (status page or API key)

## 💾 Data Persistence

- Local (non-Docker): SQLite file at `data/pulze.db`
- Docker: named volume `pulze-data` mounted to `/app/data`

## 🛠 Troubleshooting

If `better-sqlite3` fails to build on Windows, use Node.js LTS and ensure Visual Studio Build Tools are installed.
