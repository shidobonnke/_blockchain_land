# Anagu PureChain API

This small Python service is the blockchain boundary for Anagu. It keeps
`purechainlib` out of the web/mobile clients and exposes only the contract
operations required by the NestJS application API.

Run it with:

```bash
python -m venv .venv && . .venv/bin/activate
pip install -r api/requirements.txt
PURECHAIN_PRIVATE_KEY=... LAND_REGISTRY_ADDRESS=... python api/main.py
```

The Solidity source is supplied through `LAND_REGISTRY_SOURCE` (or loaded from
`packages/contracts/contracts/LandRegistry.sol` when run from the repository
root). The service defaults to PureChain `testnet` and listens on port 8100.

