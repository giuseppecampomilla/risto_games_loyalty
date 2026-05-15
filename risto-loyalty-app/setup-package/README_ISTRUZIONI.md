# 📦 Istruzioni per Finalizzare il Pacchetto di Setup

Ho preparato l'infrastruttura di automazione (script, Docker, configurazioni). Per rendere il pacchetto pronto alla consegna al cliente, segui questi ultimi passaggi manuali di copia:

## 1. Backend (WordPress)
Copia i file del plugin WordPress nella cartella `backend/`:
- `loyalty-system.php`
- `ristorante-loyalty.php`
- Eventuali file `.zip` già pronti.

## 2. Frontend (React)
Copia il contenuto della cartella `risto-loyalty-app` nella cartella `frontend/`, **escludendo** la cartella `node_modules`.

## 3. Multiplayer (Node.js)
Copia il contenuto della cartella `App-Multiplayer` nella cartella `multiplayer/`, **escludendo** la cartella `node_modules`.

---

## 🚀 Come installare sul server del cliente

Una volta completata la copia, puoi zippare l'intera cartella `setup-package` e inviarla al cliente. Sul server di destinazione:

### Metodo A: Script Bash (Tradizionale)
1. Estrai il pacchetto.
2. Rendi eseguibile lo script: `chmod +x setup.sh`.
3. Esegui: `./setup.sh`.
4. Segui le istruzioni a video per configurare Nginx.

### Metodo B: Docker (Consigliato)
1. Assicurati che Docker e Docker Compose siano installati.
2. Crea il file `.env` partendo da `.env.example` e configuralo.
3. Esegui: `docker-compose up -d --build`.
4. Tutto l'ambiente (DB, Multiplayer, Frontend) sarà attivo e collegato.
