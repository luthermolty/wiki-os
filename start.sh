#!/bin/bash
# WikiOS Startup Script
# Starts WikiOS with your LLM Wiki at ~/wiki

WIKI_PATH="/home/excel/wiki"
WIKIOS_PATH="/home/excel/wiki-os"
PORT="${WIKIOS_PORT:-5211}"

echo "🚀 Starting WikiOS..."
echo "📁 Wiki path: $WIKI_PATH"
echo "🌐 Will be available at: http://localhost:$PORT"

# Check if WikiOS is already running
if pgrep -f "wiki-os.*node.*server" > /dev/null; then
    echo "⚠️  WikiOS is already running!"
    echo "📍 Access it at: http://localhost:$PORT"
    exit 1
fi

# Start WikiOS
cd "$WIKIOS_PATH"
export WIKI_ROOT="$WIKI_PATH"
export PORT="$PORT"

npm start &
WIKIOS_PID=$!

echo "✅ WikiOS started (PID: $WIKIOS_PID)"
echo "🌐 Access your wiki at: http://localhost:$PORT"
echo ""
echo "Press Ctrl+C to stop WikiOS"

# Wait for user to stop it
wait $WIKIOS_PID
