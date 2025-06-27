#!/bin/bash
set -e

cd /root/Food4All

# Make sure we're on prod branch
git checkout prod

echo "📥 Pulling latest code from prod branch..."
git pull origin prod

echo "✅ Deployment complete."
