#!/bin/bash
set -e

# === CONFIGURATION ===
PROJECT_DIR="/root/Food4All"
DATABASE_PATH="database.json"
DEPLOY_SCRIPT="deploy.sh"
PUBLIC_REPO="git@github.com:EmmetAVS/Food4All.git"
SERVICE_NAME="fastapi"  # Replace with your actual service name

echo "[+] === Deploy Script Started ==="

# === STEP 1: Go to project and update from prod branch ===
echo "[+] Switching to project directory: $PROJECT_DIR"
cd "$PROJECT_DIR"

echo "[+] Fetching latest changes from origin/prod"
git fetch origin
git checkout prod
git reset --hard origin/prod

# === STEP 2: Backup DB to prod branch ===
echo "[+] Backing up $DATABASE_PATH to prod branch"
git add "$DATABASE_PATH"
git commit -m "Auto backup of database before deploy ($(date))" || echo "[i] No changes to commit"
git push origin prod

# === STEP 3: Restart backend FastAPI service ===
echo "[+] Restarting backend service: $SERVICE_NAME"
sudo systemctl restart "$SERVICE_NAME"
echo "[+] Service restarted successfully"

# === STEP 4: Push stripped code to public repo ===
echo "[+] Preparing code for public repo (excluding database and deploy script)"

TEMP_PUBLIC_DIR="/tmp/public_export"
rm -rf "$TEMP_PUBLIC_DIR"
mkdir "$TEMP_PUBLIC_DIR"

# Copy project excluding .git, database.json, and deploy.sh
rsync -av --exclude='.git' --exclude="$DATABASE_PATH" --exclude="$DEPLOY_SCRIPT" . "$TEMP_PUBLIC_DIR/"

cd "$TEMP_PUBLIC_DIR"

# Use alternate SSH key for public repo
export GIT_SSH_COMMAND="ssh -i /root/.ssh/id_ed25519_public"

git init
git remote add origin "$PUBLIC_REPO"
git checkout -b main
git add .
git commit -m "Public deploy from prod ($(date))"
git push -f origin main

echo "[✓] Deployment complete and public repo updated."
