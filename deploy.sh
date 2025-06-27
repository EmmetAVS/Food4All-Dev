#!/bin/bash

cd /root/Food4All

echo "=== Backing up database.json to prod branch ==="

# Configure git (only needed once on this server)
git config --global user.email "backup@food4all.com"
git config --global user.name "Food4All Auto Backup"

# Stash changes just in case
git stash

# Ensure latest prod branch
git checkout prod
git pull origin prod

# Save current database.json before updating code
cp database.json database_backup.json

# Commit and push backup
git add database.json
git commit -m "Server backup of database.json: $(date)"
git push origin prod

echo "=== Deploying new code ==="

# Pull latest prod branch
git pull origin prod

# Restore server’s version of database.json after pull (if overwritten)
git checkout -- database_backup.json
mv database_backup.json database.json

echo "=== Deployment complete ==="
