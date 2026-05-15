# 🚀 Guida al Deploy Risto Loyalty

Questa guida riassume i passaggi e i percorsi corretti per aggiornare l'intero ecosistema sul server **Oracle Cloud** (Frontend e Multiplayer) e sul server **Netsons** (WordPress).

---

## 1. Frontend: React PWA (Dashboard)
**Destinazione:** Server Oracle (`130.110.6.128`)
**Percorso Remoto:** `/var/www/html/`

### Metodo Rapido (Script Automatizzato):
Se vuoi fare tutto in un colpo solo (Build + Upload), usa lo script salvato nella cartella:
1. Apri il terminale nella cartella `risto-loyalty-app`.
2. (Solo la prima volta) Rendi lo script eseguibile: `chmod +x build_and_deploy.sh`
3. Lancia il deploy:
   ```bash
   ./build_and_deploy.sh
   ```

### Metodo Manuale (Passaggi Singoli):
1. Apri il terminale nella cartella `risto-loyalty-app`.
2. Esegui la build:
   ```bash
   npm run build
   ```
3. Trasferisci i file estratti nella cartella `dist`:
   ```bash
   scp -i ssh-key-2026-04-03.key -r dist/* ubuntu@130.110.6.128:/var/www/html/
   ```

> [!TIP]
> Puoi usare lo script automatizzato che abbiamo creato: `./build_and_deploy.sh`

---

## 2. Server Multiplayer: Node.js
**Destinazione:** Server Oracle (`130.110.6.128`)
**Percorso Remoto:** `/home/ubuntu/multiplayer-server/` (o la tua cartella di installazione)

### Passaggi:
1. **Trasferimento file**: Dalla cartella `App-Multiplayer`, invia il file `server.js` e la cartella `public`:
   ```bash
   scp -i ssh-key-2026-04-03.key server.js ubuntu@130.110.6.128:/home/ubuntu/App-Multiplayer/

   ```
2. **Accesso SSH**: Collegate al server:
   ```bash
   ssh -i ssh-key-2026-04-03.key ubuntu@130.110.6.128
   ```
3. **Riavvio Server**: Una volta dentro, entra nella cartella e riavvia il processo (usando `pm2` ):
   ```bash
   cd /home/ubuntu/multiplayer-server
   npm install  # Solo se hai aggiunto nuove dipendenze
   pm2 restart server.js   # Oppure pm2 restart risto-multiplayer
   ```

---

## 3. Backend: WordPress Plugin
**Destinazione:** Server Netsons (Hosting WordPress)
**Percorso Remoto:** `/wp-content/plugins/ristorante-loyalty/`

### Passaggi:
1. Usa il tuo client FTP (FileZilla o simili) o il File Manager di Netsons.
2. Carica il file `loyalty-system.php` aggiornato nella cartella del plugin sopra indicata.
3. Se necessario, vai in **WordPress > Impostazioni > Permalink** e clicca su "Salva modifiche" per resettare le rotte API.

---

## 📋 Riepilogo Indirizzi
- **Dashboard Web**: `http://130.110.6.128/`
- **Socket Multiplayer**: `http://130.110.6.128:3000`
- **WordPress API**: `https://soundframes.netsons.org/wp-json/risto-loyalty/v1`

---
> [!IMPORTANT]
> Ricorda di verificare sempre che la chiave SSH (`ssh-key-2026-04-03.key`) abbia i permessi corretti (`chmod 600`) prima di usarla per il trasferimento.
