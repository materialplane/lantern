#!/bin/bash

# Configuration
PROJECT_ROOT="/home/drew/Documents/lantern"
API_DIR="$PROJECT_ROOT/gdd-studio/server"
UI_DIR="$PROJECT_ROOT/gdd-studio/client"
LOG_DIR="$PROJECT_ROOT/logs"
RESTORE_LOG="$LOG_DIR/restore_points.txt"

API_PORT=3001
UI_PORT=3000

# Ensure log directory exists
mkdir -p "$LOG_DIR"
touch "$RESTORE_LOG"

status() {
    API_PID=$(lsof -t -sTCP:LISTEN -i:$API_PORT)
    UI_PID=$(lsof -t -sTCP:LISTEN -i:$UI_PORT)

    if [ ! -z "$API_PID" ]; then echo "API is RUNNING (PID: $API_PID)"; else echo "API is STOPPED"; fi
    if [ ! -z "$UI_PID" ]; then echo "UI is RUNNING (PID: $UI_PID)"; else echo "UI is STOPPED"; fi
}

deploy() {
    echo "--------------------------------------------------"
    echo "DEPLOYING TO GITHUB (BRANCH: dev)..."
    echo "--------------------------------------------------"
    
    # Ensure we are on the dev branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    if [ "$CURRENT_BRANCH" != "dev" ]; then
        echo "ERROR: Not on 'dev' branch. Current branch: $CURRENT_BRANCH"
        exit 1
    fi

    git add .
    COMMIT_MSG="Auto-deploy via manager.sh: $(date '+%Y-%m-%d %H:%M:%S')"
    git commit -m "$COMMIT_MSG"
    
    echo "Pushing to origin dev..."
    git push origin dev
    
    echo "--------------------------------------------------"
    echo "DEPLOY COMPLETE"
    echo "--------------------------------------------------"
}

stop() {
    echo "Stopping Lantern Ecosystem..."
    
    API_PID=$(lsof -t -sTCP:LISTEN -i:$API_PORT)
    if [ ! -z "$API_PID" ]; then
        kill -9 $API_PID
        echo "Killed API Server (PID: $API_PID)"
    fi

    UI_PID=$(lsof -t -sTCP:LISTEN -i:$UI_PORT)
    if [ ! -z "$UI_PID" ]; then
        kill -9 $UI_PID
        echo "Killed UI Server (PID: $UI_PID)"
    fi
}

start() {
    stop
    echo "Starting Lantern GDD API..."
    cd "$API_DIR"
    setsid nohup node server.js > "$LOG_DIR/api.log" 2>&1 &
    
    echo "Starting Lantern GDD UI..."
    cd "$UI_DIR"
    setsid nohup npx vite --port $UI_PORT --host --force > "$LOG_DIR/ui.log" 2>&1 &
    
    echo "Verifying ecosystem startup (waiting 5s)..."
    sleep 5
    status

    echo "--------------------------------------------------"
    echo "SAFETY CHECK: Creating Chat Restore Point Reminders..."
    echo "$(date '+%Y-%m-%d %H:%M:%S') - RESTART EVENT" >> "$RESTORE_LOG"
    echo "--------------------------------------------------"
}

case "$1" in
    start) start ;;
    stop) stop ;;
    restart) start ;;
    status) status ;;
    deploy) deploy ;;
    *) echo "Usage: $0 {start|stop|restart|status|deploy}"; exit 1 ;;
esac
