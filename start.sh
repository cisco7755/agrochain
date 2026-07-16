#!/bin/bash

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Pass --fresh (or --reset) to wipe the local chain and redeploy from
# scratch. Without it, an already-running Hardhat node is reused as-is —
# registered actors, products, etc. survive restarting the backend/frontend.
RESET_CHAIN=false
if [ "$1" = "--fresh" ] || [ "$1" = "--reset" ]; then
  RESET_CHAIN=true
fi

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ══════════════════════════════════════════════════════════════════════════════
#  ADD ANY WALLET ADDRESSES YOU WANT AUTO-FUNDED WITH 10 TEST ETH BELOW
#  These receive Hardhat local ETH every time you run ./start.sh
# ══════════════════════════════════════════════════════════════════════════════
FUND_ADDRESSES=(
  "0x5d56b575bb0ec230f19655defd548a50d00bb8c0"
  # "0xYourSecondAddressHere"
)
# ══════════════════════════════════════════════════════════════════════════════

HARDHAT_PID=""
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo -e "\n${YELLOW}Shutting down AgroChain...${RESET}"
  [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null
  [ -n "$HARDHAT_PID" ]  && kill "$HARDHAT_PID"  2>/dev/null
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
echo -e "${CYAN}  Powered by Ethereum Smart Contracts${RESET}"
echo ""

# ── Detect local IP ────────────────────────────────────────────────────────────
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null \
  || ipconfig getifaddr en1 2>/dev/null \
  || hostname -I 2>/dev/null | awk '{print $1}' \
  || echo "localhost")

FRONTEND_URL="http://${LOCAL_IP}:5173"

# ══════════════════════════════════════════════════════════════════════════════
# [0/5] Kill existing processes
# ══════════════════════════════════════════════════════════════════════════════
echo -e "${BOLD}[0/5] Killing existing processes...${RESET}"

# Detect whether a healthy Hardhat node is already on 8545 so we can leave it
# (and its chain state — registered actors, products, pending requests…)
# alone. Backend/frontend always restart fresh; only the chain is precious.
CHAIN_ALIVE=false
if curl -s -X POST http://localhost:8545 \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  2>/dev/null | grep -q '"result"'; then
  CHAIN_ALIVE=true
fi

PORTS_TO_CLEAR=(5173 8000)
if [ "$RESET_CHAIN" = true ] || [ "$CHAIN_ALIVE" = false ]; then
  PORTS_TO_CLEAR+=(8545)
fi

for PORT in "${PORTS_TO_CLEAR[@]}"; do
  PIDS=$(lsof -ti tcp:$PORT 2>/dev/null)
  if [ -n "$PIDS" ]; then
    echo -e "${YELLOW}  ⚙ Stopping process on port $PORT...${RESET}"
    echo "$PIDS" | xargs kill -9 2>/dev/null
  fi
done

pkill -f "uvicorn app.main:app" 2>/dev/null
[[ " ${PORTS_TO_CLEAR[*]} " == *" 8545 "* ]] && pkill -f "hardhat node" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 1

if [ "$CHAIN_ALIVE" = true ] && [ "$RESET_CHAIN" = false ]; then
  echo -e "  ${GREEN}✓ Ports cleared (5173, 8000) — reusing existing chain on 8545${RESET}"
else
  echo -e "  ${GREEN}✓ Ports cleared (5173, 8000, 8545)${RESET}"
fi
echo ""

# ══════════════════════════════════════════════════════════════════════════════
# [1/5] Dependency checks
# ══════════════════════════════════════════════════════════════════════════════
echo -e "${BOLD}[1/5] Checking dependencies...${RESET}"

for cmd in python3 node npm curl; do
  if ! command -v "$cmd" &>/dev/null; then
    echo -e "${RED}  ✗ '$cmd' not installed. Please install it and re-run.${RESET}"
    exit 1
  fi
done
echo -e "  ${GREEN}✓ System tools OK (python3, node, npm, curl)${RESET}"

# Install contracts npm deps if needed
cd "$ROOT/contracts"
if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}  ⚙ Installing contract dependencies...${RESET}"
  npm install --quiet
  echo -e "  ${GREEN}✓ Contract dependencies installed${RESET}"
else
  echo -e "  ${GREEN}✓ Contract dependencies OK${RESET}"
fi
echo ""

# ══════════════════════════════════════════════════════════════════════════════
# [2/5] Blockchain — Start Hardhat node + Deploy + Fund
# ══════════════════════════════════════════════════════════════════════════════
echo -e "${BOLD}[2/5] Starting Blockchain (Hardhat Local)...${RESET}"

cd "$ROOT/contracts"

REUSE_CHAIN=false
if [ "$CHAIN_ALIVE" = true ] && [ "$RESET_CHAIN" = false ]; then
  # Verify deployments/latest.json actually points at live bytecode on the
  # already-running chain before trusting it — falls through to a fresh
  # deploy below if the file is stale, missing, or the code isn't there.
  EXISTING_ADDRESS=$(node -e "
    try { console.log(require('./deployments/latest.json').contractAddress); } catch {}
  " 2>/dev/null)
  if [ -n "$EXISTING_ADDRESS" ]; then
    CODE=$(curl -s -X POST http://localhost:8545 \
      -H "Content-Type: application/json" \
      -d "{\"jsonrpc\":\"2.0\",\"method\":\"eth_getCode\",\"params\":[\"$EXISTING_ADDRESS\",\"latest\"],\"id\":1}")
    if echo "$CODE" | grep -qv '"result":"0x"'; then
      REUSE_CHAIN=true
      CONTRACT_ADDRESS="$EXISTING_ADDRESS"
    fi
  fi
fi

if [ "$REUSE_CHAIN" = true ]; then
  echo -e "  ${GREEN}✓ Reusing already-running Hardhat node${RESET}  →  http://localhost:8545"
  echo -e "  ${GREEN}✓ Reusing existing contract${RESET}  →  ${CONTRACT_ADDRESS}  ${CYAN}(actors/products preserved — pass --fresh to reset)${RESET}"
else
  # Start Hardhat node in background
  npx hardhat node > "$ROOT/hardhat.log" 2>&1 &
  HARDHAT_PID=$!

  # Wait for node to be ready
  echo -n "  Waiting for Hardhat node"
  for i in $(seq 1 30); do
    sleep 0.5
    if curl -s -X POST http://localhost:8545 \
      -H "Content-Type: application/json" \
      -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
      > /dev/null 2>&1; then
      echo -e "\r  ${GREEN}✓ Hardhat node running${RESET}  →  http://localhost:8545"
      break
    fi
    echo -n "."
    if [ "$i" -eq 30 ]; then
      echo -e "\n  ${RED}✗ Hardhat node failed to start.${RESET}"
      tail -5 "$ROOT/hardhat.log"
      cleanup
    fi
  done

  # Deploy contract
  echo -e "  ${YELLOW}⚙ Deploying AgroChain contract...${RESET}"
  DEPLOY_OUTPUT=$(npx hardhat run scripts/deploy.js --network localhost 2>&1)
  if [ $? -ne 0 ]; then
    echo -e "  ${RED}✗ Deployment failed:${RESET}"
    echo "$DEPLOY_OUTPUT" | tail -10
    cleanup
  fi

  # Read contract address from deployments/latest.json
  CONTRACT_ADDRESS=$(node -e "
    const f = require('./deployments/latest.json');
    console.log(f.contractAddress);
  " 2>/dev/null)

  if [ -z "$CONTRACT_ADDRESS" ]; then
    echo -e "  ${RED}✗ Could not read contract address from deployments/latest.json${RESET}"
    cleanup
  fi

  echo -e "  ${GREEN}✓ Contract deployed${RESET}  →  ${CONTRACT_ADDRESS}"
fi

# Update frontend .env with the contract address (creating it if missing —
# without it, the app silently falls back to Amoy/empty-address defaults)
ENV_FILE="$ROOT/frontend/.env"
if [ ! -f "$ENV_FILE" ]; then
  cat > "$ENV_FILE" <<EOF
VITE_AGROCHAIN_ADDRESS=${CONTRACT_ADDRESS}
VITE_CHAIN_ID=31337
VITE_NETWORK_NAME=localhost
EOF
  echo -e "  ${GREEN}✓ frontend/.env created${RESET}"
else
  sed -i '' "s|^VITE_AGROCHAIN_ADDRESS=.*|VITE_AGROCHAIN_ADDRESS=${CONTRACT_ADDRESS}|" "$ENV_FILE" 2>/dev/null \
    || sed -i "s|^VITE_AGROCHAIN_ADDRESS=.*|VITE_AGROCHAIN_ADDRESS=${CONTRACT_ADDRESS}|" "$ENV_FILE"
  echo -e "  ${GREEN}✓ frontend/.env updated with contract address${RESET}"
fi

# Fund addresses (skip if reusing a chain — they were already funded)
if [ "$REUSE_CHAIN" = false ] && [ ${#FUND_ADDRESSES[@]} -gt 0 ]; then
  echo -e "  ${YELLOW}⚙ Funding wallet addresses with test ETH...${RESET}"
  for ADDR in "${FUND_ADDRESSES[@]}"; do
    FUND_RESULT=$(node -e "
      const { ethers } = require('hardhat');
      async function main() {
        const [deployer] = await ethers.getSigners();
        const tx = await deployer.sendTransaction({
          to: '${ADDR}',
          value: ethers.parseEther ? ethers.parseEther('10.0') : ethers.utils.parseEther('10.0'),
        });
        await tx.wait();
        const bal = await ethers.provider.getBalance('${ADDR}');
        const fmt = ethers.formatEther ? ethers.formatEther : ethers.utils.formatEther;
        console.log(fmt(bal));
      }
      main().catch(e => { console.error(e.message); process.exit(1); });
    " 2>/dev/null)
    if [ $? -eq 0 ]; then
      echo -e "  ${GREEN}✓ Funded ${ADDR::10}…${ADDR: -4}  →  ${FUND_RESULT} ETH${RESET}"
    else
      echo -e "  ${YELLOW}⚠ Could not fund ${ADDR::10}…${ADDR: -4} (may already have balance)${RESET}"
    fi
  done
fi

echo ""

# ══════════════════════════════════════════════════════════════════════════════
# [3/5] Backend (FastAPI)
# ══════════════════════════════════════════════════════════════════════════════
echo -e "${BOLD}[3/5] Setting up Backend (FastAPI)...${RESET}"

VENV="$ROOT/backend/venv/bin/activate"
if [ ! -f "$VENV" ]; then
  echo -e "${YELLOW}  ⚙ Creating virtual environment...${RESET}"
  python3 -m venv "$ROOT/backend/venv"
  if [ $? -ne 0 ]; then
    echo -e "${RED}  ✗ Failed to create venv.${RESET}"
    exit 1
  fi
  echo -e "  ${GREEN}✓ Virtual environment created${RESET}"
fi

source "$VENV"

if [ -f "$ROOT/backend/requirements.txt" ]; then
  if ! pip freeze 2>/dev/null | grep -qi "fastapi"; then
    echo -e "${YELLOW}  ⚙ Installing Python dependencies...${RESET}"
    pip install -r "$ROOT/backend/requirements.txt" --quiet
    echo -e "  ${GREEN}✓ Python dependencies installed${RESET}"
  else
    echo -e "  ${GREEN}✓ Python dependencies OK${RESET}"
  fi
fi

cd "$ROOT/backend"
FRONTEND_URL="$FRONTEND_URL" uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload \
  > "$ROOT/backend.log" 2>&1 &
BACKEND_PID=$!

echo -n "  Waiting for backend"
for i in $(seq 1 20); do
  sleep 0.5
  if curl -s http://localhost:8000/ > /dev/null 2>&1; then
    echo -e "\r  ${GREEN}✓ Backend ready${RESET}  →  http://localhost:8000"
    break
  fi
  echo -n "."
  if [ "$i" -eq 20 ]; then
    echo -e "\n  ${RED}✗ Backend failed to start. Check backend.log${RESET}"
    tail -5 "$ROOT/backend.log"
    cleanup
  fi
done
echo ""

# ══════════════════════════════════════════════════════════════════════════════
# [4/5] Frontend (React + Vite)
# ══════════════════════════════════════════════════════════════════════════════
echo -e "${BOLD}[4/5] Setting up Frontend (React + Vite)...${RESET}"

cd "$ROOT/frontend"

if [ ! -d "node_modules" ]; then
  echo -e "${YELLOW}  ⚙ Installing npm dependencies...${RESET}"
  npm install --quiet
  echo -e "  ${GREEN}✓ Node dependencies installed${RESET}"
else
  echo -e "  ${GREEN}✓ Node dependencies OK${RESET}"
fi

npm run dev > "$ROOT/frontend.log" 2>&1 &
FRONTEND_PID=$!

echo -n "  Waiting for frontend"
for i in $(seq 1 30); do
  sleep 0.5
  if curl -s http://localhost:5173/ > /dev/null 2>&1; then
    echo -e "\r  ${GREEN}✓ Frontend ready${RESET}  →  http://localhost:5173"
    break
  fi
  echo -n "."
  if [ "$i" -eq 30 ]; then
    echo -e "\n  ${RED}✗ Frontend failed to start. Check frontend.log${RESET}"
    tail -5 "$ROOT/frontend.log"
    cleanup
  fi
done

echo ""

# ══════════════════════════════════════════════════════════════════════════════
# [5/5] Ready
# ══════════════════════════════════════════════════════════════════════════════
echo -e "${BOLD}${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}  AgroChain is running!${RESET}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "  ${BOLD}App:${RESET}        http://localhost:5173"
echo -e "  ${BOLD}Network:${RESET}    ${FRONTEND_URL}  ${CYAN}← share with phone${RESET}"
echo -e "  ${BOLD}API:${RESET}        http://localhost:8000"
echo -e "  ${BOLD}Blockchain:${RESET} http://localhost:8545  (chainId: 31337)"
echo -e "  ${BOLD}Contract:${RESET}   ${CONTRACT_ADDRESS}"
echo -e ""
echo -e "  ${BOLD}Funded wallets:${RESET}"
for ADDR in "${FUND_ADDRESSES[@]}"; do
  echo -e "    ${CYAN}${ADDR}${RESET}"
done
echo -e ""
ADMIN_ADDRESS=$(grep -A1 "^Account #0:" "$ROOT/hardhat.log" | head -1 | sed -E 's/^Account #0: ([^ ]+).*/\1/')
ADMIN_PRIVATE_KEY=$(grep -A1 "^Account #0:" "$ROOT/hardhat.log" | sed -n '2p' | sed -E 's/^Private Key: //')
echo -e "  ${BOLD}Admin wallet:${RESET} Import this key into MetaMask for admin access"
if [ -n "$ADMIN_PRIVATE_KEY" ]; then
  echo -e "    ${CYAN}Address:${RESET}     ${ADMIN_ADDRESS}"
  echo -e "    ${CYAN}Private Key:${RESET} ${ADMIN_PRIVATE_KEY}"
else
  echo -e "  ${CYAN}  (Check hardhat.log for Account #0 private key)${RESET}"
fi
echo -e ""
echo -e "  ${BOLD}Logs:${RESET}       tail -f hardhat.log backend.log frontend.log"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${YELLOW}  Press Ctrl+C to stop all services${RESET}"
echo ""

wait
