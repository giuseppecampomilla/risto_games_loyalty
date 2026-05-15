#!/bin/bash
set -e

PROJECT="/Users/guy/Downloads/Test_App/risto-loyalty-app"
KEY="/Users/guy/Downloads/Test_App/risto-loyalty-app/ssh-key-2026-04-03.key"
REMOTE="ubuntu@130.110.6.128"
REMOTE_PATH="/var/www/html/"

echo "📦 Installazione dipendenze..."
cd "$PROJECT"
npm install

echo "🔨 Build in corso..."
npm run build

echo "🚀 Deploy via SCP..."
chmod 600 "$KEY"
scp -i "$KEY" -r "$PROJECT/dist/"* "$REMOTE:$REMOTE_PATH"

echo "✅ Deploy completato!"
