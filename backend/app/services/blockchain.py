import random
import secrets


class BlockchainService:
    """Simulates blockchain interactions for the AgroChain supply chain system."""

    CONTRACT_ADDRESS = "0x742d35Cc6634C0532925a3b8D4C9C0B4C9C0B4C9"
    NETWORK_NAME = "Polygon Amoy Testnet"
    CHAIN_ID = 80002
    GAS_PRICE_GWEI = 0.001

    def generate_tx_hash(self) -> str:
        """Generate a simulated transaction hash."""
        return "0x" + secrets.token_hex(32)

    def generate_block_number(self) -> int:
        """Generate a simulated block number in a realistic range."""
        return random.randint(18_000_000, 20_000_000)

    def simulate_contract_id(self, product_id: int) -> int:
        """Return a mock on-chain product ID (mirrors the DB id)."""
        return product_id

    def get_network_info(self) -> dict:
        """Return simulated network / contract metadata."""
        return {
            "network": self.NETWORK_NAME,
            "chain_id": self.CHAIN_ID,
            "contract_address": self.CONTRACT_ADDRESS,
            "block_number": self.generate_block_number(),
            "gas_price_gwei": self.GAS_PRICE_GWEI,
        }


blockchain_service = BlockchainService()
