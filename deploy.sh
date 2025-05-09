#!/bin/bash

set -e

REPO_NAME="ProPENs-DAC"  # <-- passe das ggf. an

echo "🧹 Lösche alte Ordner..."
rm -rf dist
rm -rf docs

echo "📦 Baue Projekt..."
dotnet publish -c Release -o dist

echo "📁 Erstelle docs Ordner..."
mkdir docs
cp -r dist/wwwroot/* docs/

echo "📄 Verschiebe index.html..."
mv docs/index.html docs/index.original.html 2>/dev/null || true
cp dist/wwwroot/index.html docs/index.html

touch docs/.nojekyll

echo "✏️ Setze base href..."
sed -i '' "s|<base href=\"/\"|<base href=\"/$REPO_NAME/\"|g" docs/index.html

echo "✅ Füge Änderungen zu Git hinzu..."
git add .
git commit -m "Deploy GitHub Pages via deploy.sh"
git push origin main

echo "🚀 Deployment abgeschlossen!"