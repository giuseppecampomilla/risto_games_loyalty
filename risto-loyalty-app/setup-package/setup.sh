#!/bin/bash

# --- Risto Loyalty Installer ---
# Script per l'installazione automatizzata dell'ecosistema Loyalty

echo "🚀 Avvio installazione Risto Loyalty..."

# 1. Verifica Requisiti
command -v node >/dev/null 2>&1 || { echo >&2 "❌ Errore: Node.js non è installato."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo >&2 "❌ Errore: NPM non è installato."; exit 1; }
command -v pm2 >/dev/null 2>&1 || { echo "⚠️ PM2 non trovato. Lo installo..."; sudo npm install -g pm2; }

# 2. Configurazione Variabili
if [ ! -f .env ]; then
    echo "📄 Creazione file .env..."
    cp .env.example .env
    echo "⚠️ Modifica il file .env con i dati del cliente prima di continuare."
    # Potremmo aggiungere una lettura interattiva qui
fi

source .env

# 3. Setup Backend (WP Plugin)
echo "📦 Il plugin WordPress si trova nella cartella /backend. Caricalo manualmente su WP."

# 4. Setup Multiplayer Server
echo "🎮 Configurazione Server Multiplayer..."
cd multiplayer
npm install
# Creazione .env per il server multiplayer
echo "WP_API_URL=$WP_API_URL" > .env
echo "API_SECRET_KEY=$API_SECRET_KEY" >> .env
echo "MONGO_URI=$MONGO_URI" >> .env
echo "PORT=$MULTIPLAYER_PORT" >> .env

pm2 start server.js --name "risto-multiplayer"
cd ..

# 5. Setup Frontend
echo "💻 Configurazione Frontend React..."
cd frontend
npm install
# Inserisce l'URL delle API nel file .env di build
echo "VITE_API_BASE_URL=$WP_API_URL" > .env
echo "VITE_MULTIPLAYER_URL=$VITE_MULTIPLAYER_URL" >> .env

npm run build

# 6. Configurazione Nginx (Opzionale/Template)
echo "🌐 Generazione configurazione Nginx..."
cat <<EOF > ../scripts/nginx_loyalty.conf
server {
    listen 80;
    server_name _; # Inserire qui il dominio

    root $(pwd)/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /socket.io/ {
        proxy_pass http://localhost:$MULTIPLAYER_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
    }
}
EOF

echo "✅ Installazione completata!"
echo "👉 Prossimi passi:"
echo "1. Carica il plugin WP da /backend"
echo "2. Copia scripts/nginx_loyalty.conf in /etc/nginx/sites-available/ e abilitalo"
echo "3. Riavvia Nginx: sudo systemctl reload nginx"
