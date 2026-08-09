# mykhub

Il tuo spazio di studio personale — una PWA self-hosted per organizzare appunti, flashcard e sessioni d'esame.

## Funzionalità

- **Spaces & Pages** — organizza il materiale in spazi di lavoro con pagine annidate
- **Editor ricco** — basato su TipTap/ProseMirror (tabelle, task list, immagini, link)
- **Collaborazione real-time** — sincronizzazione via Yjs su WebSocket
- **Flashcard & Esami** — crea mazzi di carte e simula sessioni di verifica
- **Condivisione pubblica** — pubblica una pagina tramite link
- **Export** — esporta i contenuti di studio
- **Installabile** — PWA con manifest e icone

## Stack

| Livello | Tecnologia |
|---------|-----------|
| Frontend | HTML/CSS/JS vanilla, TipTap, Yjs, Sortable.js (bundle esbuild) |
| Backend | Node.js + Express, WebSocket (`ws`) |
| Auth | JWT |
| Database | SQLite |
| Deploy | Docker Compose + Nginx, DuckDNS per il DNS dinamico |

## Setup

### 1. Variabili d'ambiente

Copia il file di esempio e compila i valori:

```bash
cp .env.example .env
```

Genera un segreto JWT robusto:

```bash
openssl rand -base64 48
```

### 2. Build del bundle frontend

Le dipendenze JS vengono impacchettate con esbuild in `frontend/libs/`:

```bash
cd frontend/build
npm install
npm run build     # oppure lo script esbuild definito nel progetto
```

### 3. Avvio

```bash
docker compose up -d
```

L'app risponde sulla porta configurata nel `docker-compose.yml`; `GET /api/health` restituisce `{ ok: true }`.

## Struttura

```
backend/
  routes/      auth, cards, collab, export, pages, public, spaces, upload, users
  middleware/  autenticazione JWT
  db/          schema SQL e inizializzazione SQLite
  server.js    entrypoint Express + WebSocket
frontend/
  pages/       dashboard, library, study, exam, settings
  build/       sorgenti del bundler esbuild
  css/  js/    stili e logica client
```

## Note

- Il database SQLite e la cartella `uploads/` non sono versionati: vengono creati al primo avvio.
- Il file `.env` è escluso dal repository — non committare mai le credenziali.
