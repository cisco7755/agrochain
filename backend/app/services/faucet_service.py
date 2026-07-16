import os

from web3 import Web3

# Defaults are safe only for local Hardhat dev — Account #0's key is
# publicly known. If FAUCET_RPC_URL is pointed at anything other than
# localhost, FAUCET_PRIVATE_KEY must be set explicitly or sending refuses.
DEFAULT_LOCAL_RPC_URL = "http://127.0.0.1:8545"
DEFAULT_LOCAL_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"

FAUCET_RPC_URL = os.getenv("FAUCET_RPC_URL", DEFAULT_LOCAL_RPC_URL)
FAUCET_AMOUNT_ETH = float(os.getenv("FAUCET_AMOUNT_ETH", "1"))
_is_local = FAUCET_RPC_URL in (DEFAULT_LOCAL_RPC_URL, "http://localhost:8545")
FAUCET_PRIVATE_KEY = os.getenv("FAUCET_PRIVATE_KEY") or (DEFAULT_LOCAL_PRIVATE_KEY if _is_local else None)


class FaucetService:
    def __init__(self):
        self._w3 = None

    @property
    def w3(self) -> Web3:
        if self._w3 is None:
            self._w3 = Web3(Web3.HTTPProvider(FAUCET_RPC_URL))
        return self._w3

    def send(self, to_address: str) -> str:
        if not FAUCET_PRIVATE_KEY:
            raise RuntimeError(
                "Faucet is not configured for this network — set FAUCET_PRIVATE_KEY."
            )
        if not self.w3.is_connected():
            raise RuntimeError(f"Cannot reach chain RPC at {FAUCET_RPC_URL}.")

        account = self.w3.eth.account.from_key(FAUCET_PRIVATE_KEY)
        to_address = Web3.to_checksum_address(to_address)
        value = self.w3.to_wei(FAUCET_AMOUNT_ETH, "ether")

        tx = {
            "from": account.address,
            "to": to_address,
            "value": value,
            "nonce": self.w3.eth.get_transaction_count(account.address),
            "gas": 21000,
            "chainId": self.w3.eth.chain_id,
        }
        # EIP-1559 fee fields — Hardhat's local node supports them.
        latest = self.w3.eth.get_block("latest")
        base_fee = latest.get("baseFeePerGas", self.w3.to_wei(1, "gwei"))
        tx["maxPriorityFeePerGas"] = self.w3.to_wei(1, "gwei")
        tx["maxFeePerGas"] = base_fee + tx["maxPriorityFeePerGas"] * 2

        signed = account.sign_transaction(tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed.raw_transaction)
        self.w3.eth.wait_for_transaction_receipt(tx_hash, timeout=30)
        hex_hash = tx_hash.hex()
        return hex_hash if hex_hash.startswith("0x") else f"0x{hex_hash}"


faucet_service = FaucetService()
