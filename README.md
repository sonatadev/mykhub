# mykhub

Il tuo spazio di studio personale — una PWA self-hosted per organizzare appunti in spazi di lavoro con pagine annidate.

## Funzionalità

- **Spaces & Pages** — organizza il materiale in spazi di lavoro con pagine annidate
- **Editor ricco** — basato su TipTap/ProseMirror (tabelle, task list, immagini, link)
- **Matematica** — formule LaTeX inline e in display rese con KaTeX, ambienti tipo teorema numerati
- **Menu «/»** — palette di blocchi e modelli di formula richiamabile digitando `/`
- **Stampa ed export** — stampa/PDF con impaginazione dedicata ed esportazione LaTeX della pagina
- **Collaborazione real-time** — sincronizzazione via Yjs su WebSocket
- **Condivisione pubblica** — pubblica una pagina o uno spazio tramite link
- **Backup** — esporta/importa un dump completo di spazi e pagine
- **Installabile** — PWA con manifest e icone

## Stack

| Livello | Tecnologia |
|---------|-----------|
| Frontend | React + TypeScript (Vite), TipTap, Yjs, KaTeX, Tailwind + shadcn/ui |
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

### 2. Build del frontend

```bash
cd frontend
npm install
npm run build     # typecheck + bundle Vite in frontend/dist
```

Il `Dockerfile` del frontend esegue già questi passaggi, quindi il build locale
serve solo per lo sviluppo.

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
  src/components/editor/            editor TipTap, toolbar, export
  src/components/editor/extensions/ matematica (KaTeX), ambienti, menu «/»
  src/lib/latex.ts                  serializzatore TipTap → LaTeX
  src/pages/                        route dell'app e pagine pubbliche
```

## Appunti di matematica

| Azione | Come |
|--------|------|
| Formula inline | `Ctrl+M`, oppure scrivi `$…$` direttamente nel testo |
| Formula in display | `Ctrl+Shift+M`, oppure `$$` seguito da spazio |
| Modelli (limite, integrale, matrice, sistema…) | menu `/` |
| Ambienti (Definizione, Teorema, Dimostrazione…) | menu `/` o pulsante in toolbar |
| Uscire da un ambiente | `Ctrl+Invio` |
| Stampa / PDF | menu Esporta nella barra superiore |
| Export LaTeX | menu Esporta → `.tex` (preambolo con `amsmath`/`amsthm` incluso) |

Le formule inline restano nel documento come testo `$…$`: la resa KaTeX è una
decorazione, quindi la sincronizzazione Yjs e i backup non cambiano formato. Il
sorgente riappare solo quando il cursore entra nella formula.

### Da telefono

Non servono scorciatoie: tutto passa dalla toolbar (una riga sola, scorrevole,
con pulsanti da 44px) e dal menu `/`. Quando il cursore entra in una formula —
inline o in display — compare sopra la tastiera una **barra di simboli LaTeX**
(`\`, `^`, `_`, `{}`, `frac`, `sqrt`, `int`, `sum`, `lim`, operatori, lettere
greche): serve a non dover cambiare layout di tastiera a ogni carattere. La
barra si posiziona sul *visual viewport*, quindi resta sopra la tastiera
virtuale, e sparisce appena si esce dalla formula. Su desktop non compare.

Gli ambienti sono numerati da un contatore CSS condiviso (Definizione 1,
Teorema 2, …): il numero non viene salvato nel documento e si aggiorna da solo
quando si riordina il testo.

> Attenzione: da ora due `$` sulla stessa riga vengono interpretati come una
> formula anche in appunti vecchi (ad esempio «costa $5 o $10»).

## Note

- Il database SQLite e la cartella `uploads/` non sono versionati: vengono creati al primo avvio.
- Il file `.env` è escluso dal repository — non committare mai le credenziali.
