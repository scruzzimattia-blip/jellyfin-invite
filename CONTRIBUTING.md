# Contributing

Danke, dass du zu Jellyfin Invite beitragen moechtest.

## Lokales Setup

1. Dependencies installieren:

```bash
cd backend
npm install
```

```bash
cd frontend
npm install
```

2. Umgebung konfigurieren:

```bash
cp .env.example .env
```

3. Backend starten:

```bash
cd backend
npm run dev
```

4. Frontend starten:

```bash
cd frontend
npm run dev
```

## Checks

Vor Pull Requests bitte lokal ausfuehren:

```bash
cd backend
npm run build
npm run lint
npm test
```

```bash
cd frontend
npm run build
npm run lint
npm test
```

## Branching

- `main` ist der stabile Hauptbranch.
- Feature-Branches: `feat/<kurze-beschreibung>`
- Bugfix-Branches: `fix/<kurze-beschreibung>`
- Dokumentation/CI/Chores: `chore/<kurze-beschreibung>` oder `docs/<kurze-beschreibung>`

## Commit-Konvention

Dieses Projekt nutzt Conventional Commits:

```text
feat: add invitation email system
fix: handle expired invitation tokens
docs: update setup instructions
test: add auth middleware tests
ci: add docker publish workflow
```

Erlaubte Typen:

- `feat`
- `fix`
- `docs`
- `style`
- `refactor`
- `perf`
- `test`
- `build`
- `ci`
- `chore`
- `revert`

## Secrets

Keine Secrets committen. Nutze `.env` lokal und `.env.example` nur fuer Platzhalter.
