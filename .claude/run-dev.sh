#!/bin/sh
export PATH="$HOME/.local/node/bin:$PATH"
cd "$(dirname "$0")/../app" || exit 1
exec npm run dev
