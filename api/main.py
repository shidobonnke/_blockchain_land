"""Minimal HTTP gateway around purechainlib for Anagu's NestJS API."""

import asyncio
import json
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from purechainlib import PureChain


# Keep the gateway ABI-only. The deployed registry may import OpenZeppelin
# sources, but PureChain only needs this local interface to attach to it.
SOURCE = os.getenv("LAND_REGISTRY_SOURCE") or """
pragma solidity ^0.8.19;
contract LandRegistryGateway {
    function issueTitle(bytes32, bytes32, bytes32, address) external returns (uint256) {}
    function transferTitle(bytes32, address) external {}
    function setDisputed(bytes32, bool, bytes32) external {}
    function requestRevocation(bytes32, bytes32) external {}
    function voteRevocation(bytes32) external {}
    function approveRevocation(bytes32) external {}
    function executeRevocation(bytes32) external {}
}
"""
NETWORK = os.getenv("PURECHAIN_NETWORK", "testnet")
ADDRESS = os.getenv("LAND_REGISTRY_ADDRESS")
PRIVATE_KEY = os.getenv("PURECHAIN_PRIVATE_KEY")

METHODS = {
    "issueTitle": ("issueTitle",),
    "transferTitle": ("transferTitle",),
    "setDisputed": ("setDisputed",),
    "requestRevocation": ("requestRevocation",),
    "voteRevocation": ("voteRevocation",),
    "approveRevocation": ("approveRevocation",),
    "executeRevocation": ("executeRevocation",),
}


async def execute(operation: str, args: list[object]) -> dict[str, object]:
    if not ADDRESS or not PRIVATE_KEY:
        raise RuntimeError("PURECHAIN_PRIVATE_KEY and LAND_REGISTRY_ADDRESS are required")
    if operation not in METHODS:
        raise ValueError(f"Unsupported blockchain operation: {operation}")

    chain = PureChain(NETWORK)
    chain.connect(PRIVATE_KEY.removeprefix("0x"))
    factory = await chain.contract(SOURCE)
    contract = factory.attach(ADDRESS)
    transaction = await chain.execute(contract, METHODS[operation][0], *args)
    tx_hash = getattr(transaction, "hash", None)
    if isinstance(transaction, dict):
        tx_hash = transaction.get("hash") or transaction.get("transactionHash")
    receipt = await transaction.wait() if hasattr(transaction, "wait") else None
    block_number = getattr(receipt, "blockNumber", None) if receipt else None
    if isinstance(receipt, dict):
        block_number = receipt.get("blockNumber")
    return {"transactionHash": tx_hash, "blockNumber": block_number}


class Handler(BaseHTTPRequestHandler):
    def _json(self, status: int, payload: object) -> None:
        body = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            self._json(200, {"ok": True, "network": NETWORK})
        else:
            self._json(404, {"message": "Not found"})

    def do_POST(self) -> None:  # noqa: N802
        if not self.path.startswith("/v1/transactions/"):
            self._json(404, {"message": "Not found"})
            return
        try:
            size = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(size) or b"{}")
            result = asyncio.run(execute(self.path.rsplit("/", 1)[-1], payload.get("args", [])))
            self._json(200, result)
        except Exception as error:  # gateway converts chain errors into API errors
            self._json(502, {"message": str(error)})


if __name__ == "__main__":
    port = int(os.getenv("PURECHAIN_API_PORT", "8100"))
    ThreadingHTTPServer((os.getenv("PURECHAIN_API_HOST", "0.0.0.0"), port), Handler).serve_forever()
