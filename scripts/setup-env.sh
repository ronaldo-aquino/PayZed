#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$PROJECT_ROOT/.env.local"
FRONTEND_ENV_FILE="$PROJECT_ROOT/frontend/.env.local"

if [ ! -f "$ENV_FILE" ]; then
  echo "⚠️  .env.local not found in project root."
  echo "Please create it by copying env.example:"
  echo "  cp env.example .env.local"
  exit 1
fi

if [ -L "$FRONTEND_ENV_FILE" ] || [ -f "$FRONTEND_ENV_FILE" ]; then
  if [ -L "$FRONTEND_ENV_FILE" ]; then
    echo "✓ Link symlink already exists: frontend/.env.local"
  else
    echo "⚠️  frontend/.env.local already exists as a regular file."
    echo "   Remove it first if you want to create a symlink:"
    echo "   rm frontend/.env.local"
    exit 1
  fi
else
  ln -sf ../.env.local "$FRONTEND_ENV_FILE"
  echo "✓ Created symlink: frontend/.env.local -> ../.env.local"
fi

echo ""
echo "✓ Environment setup complete!"
echo "   Next.js will now be able to read variables from .env.local"


