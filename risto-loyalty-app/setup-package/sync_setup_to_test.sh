#!/bin/bash
# --- Risto Loyalty Sync & Test ---
# Sincronizza le modifiche dal pacchetto di setup al server Oracle di test

KEY="../ssh-key-2026-04-03.key"
USER="ubuntu"
HOST="130.110.6.128"
REMOTE_FRONTEND="/var/www/html"
REMOTE_MULTI="~/App-Multiplayer"

echo "------------------------------------------"
echo "🚀 AVVIO SINCRONIZZAZIONE SETUP -> TEST"
echo "------------------------------------------"

# 1. Build Frontend
echo "💻 1/4 Build del Frontend (React)..."
cd frontend
npm install --silent
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Errore durante il build del frontend. Operazione annullata."
    exit 1
fi
cd ..

# 2. Upload Frontend
echo "📤 2/4 Upload file statici su Oracle (/var/www/html)..."
scp -i "$KEY" -r frontend/dist/* $USER@$HOST:$REMOTE_FRONTEND/

# 3. Upload Multiplayer
echo "🎮 3/4 Sincronizzazione Server Multiplayer..."
rsync -avz -e "ssh -i $KEY" --exclude 'node_modules' multiplayer/ $USER@$HOST:$REMOTE_MULTI/

# 4. Riavvio Servizi Remoti
echo "🔄 4/4 Riavvio servizi su Oracle (PM2)..."
ssh -i "$KEY" $USER@$HOST "cd $REMOTE_MULTI && npm install --production --silent && pm2 restart all && pm2 save"

echo "------------------------------------------"
echo "✅ TUTTO PRONTO! L'app è aggiornata su:"
echo "👉 http://$HOST"
echo "------------------------------------------"
