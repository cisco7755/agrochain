#!/bin/bash

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo -e "\n${YELLOW}Shutting down AgroChain...${RESET}"
  [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null
  wait 2>/dev/null
  echo -e "${GREEN}All services stopped.${RESET}"
  exit 0
}
trap cleanup SIGINT SIGTERM

echo -e "${BOLD}${GREEN}"
echo "  █████╗  ██████╗ ██████╗  ██████╗  ██████╗██╗  ██╗ █████╗ ██╗███╗   ██╗"
echo " ██╔══██╗██╔════╝ ██╔══██╗██╔═══██╗██╔════╝██║  ██║██╔══██╗██║████╗  ██║"
echo " ███████║██║  ███╗██████╔╝██║   ██║██║     ███████║███████║██║██╔██╗ ██║"
echo " ██╔══██║██║   ██║██╔══██╗██║   ██║██║     ██╔══██║██╔══██║██║██║╚██╗██║"
echo " ██║  ██║╚██████╔╝██║  ██║╚██████╔╝╚██████╗██║  ██║██║  ██║██║██║ ╚████║"
echo " ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝"
echo -e "${RESET}"
echo -e "${CYAN}  Decentralized Organic Food Supply Chain Traceability${RESET}"
echo -e "${CYAN}  Powered by Ethereum Smart Contracts + Polygon Amoy Testnet${RESET}"
echo ""

# ── Detect local IP ────────────────────────────────────────────────────────────
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null \
  || ipconfig getifaddr en1 2>/dev/null \
  || hostname -I 2>/dev/null | awk '{print $1}' \
  || echo "localhost")

FRONTEND_URL="http://${LOCAL_IP}:5173"
BACKEND_URL="http://${LOCAL_IP}:8000"

# ── Dependency checks ──────────────────────────────────────────────────────────
echo -e "${BOLD}[0/2] Checking dependencies...${RESET}"

# Check required system tools
for cmd in python3 node npm curl; do
  if ! command -v "$cmd" &>/dev/null; then
    echo -e "${RED}  ✗ '$cmd' is not installed. Please install it and re-run.${RESET}"
    exit 1
  fi
done
echo -e "  ${GREEN}✓ System tools OK (python3, node, npm, curl)${RESET}"

# ── Backend setup ──────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}[1/2] Setting up Backend (FastAPI)...${RESET}"

VENV="$ROOT/backend/venv/bin/activate"
if [ ! -f "$VENV" ]; then
  echo -e "${YELLOW}  ⚙ venv not found — creating virtual environment...${RESET}"
  python3 -m venv "$ROOT/backend/venv"
  if [ $? -ne 0 ]; then
    echo -e "${RED}  ✗ Failed to create venv. Check your Python installation.${RESET}"
    exit 1
  fi
  echo -e "  ${GREEN}✓ Virtual environment created${RESET}"
fi

source "$VENV"

# Install / sync Python packages
if [ -f "$ROOT/backend/requirements.txt" ]; then
  INSTALLED=$(pip freeze 2>/dev/null | wc -l | tr -d ' ')
  REQUIRED=$(grep -c . "$ROOT/backend/requirements.txt" 2>/dev/null || echo 0)
  if [ "$INSTALLED" -lt 2 ] || ! pip freeze 2>/dev/null | grep -qi "fastapi"; then
    echo -e "${YELLOW}  ⚙ Installing Python dependencies...${RESET}"
    pip install -r "$ROOT/backend/requirements.txt" --quiet
    if [ $? -ne 0 ]; then
      echo -e "${RED}  ✗ pip install failed. Check backend/requirements.txt.${RESET}"
      exit 1
    fi
    echo -e "  ${GREEN}✓ Python dependencies installed${RESET}"
  else
    echo -e "  ${GREEN}✓ Python dependencies already installed${RESET}"
  fi
fi

cd "$ROOT/backend"

FRONTEND_URL="$FRONTEND_URL" uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload \
  > "$ROOT/backend.log" 2>&1 &
BACKEND_PID=$!

# Wait for backend to be ready
echo -n "  Waiting for backend"
for i in $(seq 1 20); do
  sleep 0.5
  if curl -s http://localhost:8000/ > /dev/null 2>&1; then
    echo -e "\r  ${GREEN}✓ Backend ready${RESET}  →  http://localhost:8000"
    echo -e "    ${CYAN}API Docs:${RESET}  http://localhost:8000/docs"
    break
  fi
  echo -n "."
  if [ "$i" -eq 20 ]; then
    echo -e "\n  ${RED}✗ Backend failed to start. Check backend.log for details.${RESET}"
    cat "$ROOT/backend.log" | tail -10
    cleanup
  fi
done

echo ""

# ── Frontend ───────────────────────────────────────────────────────────────────
echo -e "${BOLD}[2/2] Setting up Frontend (React + Vite)...${RESET}"

cd "$ROOT/frontend"

if [ ! -d "node_modules" ] || [ ! -f "node_modules/.package-lock.json" ] && [ ! -f "node_modules/.modules.yaml" ]; then
  echo -e "${YELLOW}  ⚙ node_modules not found — installing npm dependencies...${RESET}"
  npm install
  if [ $? -ne 0 ]; then
    echo -e "${RED}  ✗ npm install failed. Check frontend/package.json.${RESET}"
    cleanup
  fi
  echo -e "  ${GREEN}✓ Node dependencies installed${RESET}"
else
  echo -e "  ${GREEN}✓ Node dependencies already installed${RESET}"
fi

npm run dev \
  > "$ROOT/frontend.log" 2>&1 &
FRONTEND_PID=$!

echo -n "  Waiting for frontend"
for i in $(seq 1 20); do
  sleep 0.5
  if curl -s http://localhost:5173/ > /dev/null 2>&1; then
    echo -e "\r  ${GREEN}✓ Frontend ready${RESET} →  http://localhost:5173"
    break
  fi
  echo -n "."
  if [ "$i" -eq 20 ]; then
    echo -e "\n  ${RED}✗ Frontend failed to start. Check frontend.log for details.${RESET}"
    cat "$ROOT/frontend.log" | tail -10
    cleanup
  fi
done

echo ""
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}  AgroChain is running!${RESET}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "  ${BOLD}Local:${RESET}    http://localhost:5173"
echo -e "  ${BOLD}Network:${RESET}  ${FRONTEND_URL}  ${CYAN}← scan QR from phone${RESET}"
echo -e "  ${BOLD}API:${RESET}      http://localhost:8000"
echo -e "  ${BOLD}API Docs:${RESET} http://localhost:8000/docs"
echo -e ""
echo -e "  ${BOLD}Logs:${RESET}     tail -f backend.log frontend.log"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${YELLOW}  Press Ctrl+C to stop all services${RESET}"
echo ""

wait
