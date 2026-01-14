#!/bin/bash
set -e

WORKSPACE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PARENT_DIR="$(dirname "$WORKSPACE_DIR")"

echo "Setting up DefiLlama workspace..."

# Copy .env from sibling workspace if it exists and we don't have one
if [ ! -f "$WORKSPACE_DIR/.env" ]; then
	echo "Looking for .env file to copy..."

	# Find first sibling workspace with .env
	for sibling in "$PARENT_DIR"/*/; do
		if [ "$sibling" != "$WORKSPACE_DIR/" ] && [ -f "${sibling}.env" ]; then
			echo "Copying .env from $(basename "$sibling")..."
			cp "${sibling}.env" "$WORKSPACE_DIR/.env"
			break
		fi
	done

	if [ ! -f "$WORKSPACE_DIR/.env" ]; then
		echo "Warning: No .env file found. You may need to create one manually."
		echo "Required environment variables:"
		echo "  - SERVER_URL"
		echo "  - COINS_SERVER_URL"
		echo "  - YIELDS_SERVER_URL"
		echo "  - (see .env.example or ask team for full list)"
	fi
else
	echo ".env file already exists, skipping copy."
fi

# Install dependencies
echo "Installing dependencies..."
yarn install

# Pull metadata for build
echo "Pulling metadata..."
yarn build:metadata

echo "Setup complete!"
