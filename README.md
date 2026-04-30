# Jellyfin Invite

Professionelles Einladungssystem fuer Jellyfin-Server. Jellyfin-Admins koennen sich mit ihren bestehenden Jellyfin-Zugangsdaten anmelden, Einladungslinks erstellen und neue Nutzer sicher zum Server einladen.

## Ziele

- Authentifizierung gegen die Jellyfin API ohne separates Login-System
- Zugriff nur fuer Jellyfin-Admins
- Erstellung, Verwaltung und Widerruf von Einladungslinks
- Optionaler E-Mail-Versand per SMTP
- SQLite-Datenhaltung mit Prisma ORM
- Deployment per Docker und Docker Compose

## Tech Stack

- Backend: Node.js, Express, TypeScript
- Frontend: React, Vite, TypeScript
- Datenbank: SQLite via Prisma ORM
- Auth: Jellyfin API und JWT
- E-Mail: Nodemailer ueber SMTP
- Deployment: Docker, Docker Compose

## Repository-Struktur

```text
.
├── .github/
│   └── workflows/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   └── src/
│       ├── middleware/
│       ├── routes/
│       ├── services/
│       └── index.ts
├── frontend/
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── pages/
│       └── main.tsx
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
└── README.md
```

## Setup

### Voraussetzungen

- Node.js 20 oder neuer
- npm 10 oder neuer
- Docker und Docker Compose
- Zugriff auf einen Jellyfin-Server mit Admin-Benutzer
- SMTP-Zugangsdaten fuer den E-Mail-Versand

### Lokale Konfiguration

1. Repository klonen.
2. Umgebungsvariablen vorbereiten:

```bash
cp .env.example .env
```

3. Werte in `.env` anpassen:

```env
JELLYFIN_URL=https://jellyfin.example.com
INVITE_BASE_URL=https://invite.example.com
DATABASE_URL=file:./dev.db
```

4. Backend und Frontend installieren und starten:

```bash
cd backend
npm install
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

### Docker Compose

Nach Abschluss der Docker-Konfiguration kann die Anwendung mit folgendem Befehl gestartet werden:

```bash
docker compose up --build
```

## Umgebungsvariablen

| Variable | Beschreibung |
| --- | --- |
| `JELLYFIN_URL` | Basis-URL des Jellyfin-Servers |
| `JWT_SECRET` | Signatur-Secret fuer interne JWTs |
| `SMTP_HOST` | SMTP-Server |
| `SMTP_PORT` | SMTP-Port |
| `SMTP_USER` | SMTP-Benutzer |
| `SMTP_PASS` | SMTP-Passwort |
| `SMTP_FROM` | Absenderadresse fuer Einladungen |
| `INVITE_BASE_URL` | Oeffentliche Basis-URL fuer Einladungslinks |
| `DATABASE_URL` | Prisma-Datenbank-URL fuer SQLite |

## Screenshots

### Login

Platzhalter fuer Screenshot der Jellyfin-Admin-Anmeldung.

### Dashboard

Platzhalter fuer Screenshot des Admin-Dashboards.

### Einladung

Platzhalter fuer Screenshot der oeffentlichen Einladungsseite.

## Status

Dieses Repository wird schrittweise aufgebaut. Schritt 1 enthaelt die Projektstruktur und Basiskonfiguration.
