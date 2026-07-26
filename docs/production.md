# Production deployment and controls

## Besu

Replace the local developer chain with at least four QBFT validators. Allocate
validators to independent institutions and keep account keys in an HSM or managed
vault. Expose JSON-RPC only to the API's private network. Enable node and account
permissioning, TLS at the gateway, monitoring, backups and a documented validator
replacement vote.

Community voting is application/smart-contract attestation, not a competing
base-layer consensus algorithm. QBFT is the ledger consensus.

## Data protection

Personal information and full geometry remain in PostgreSQL/PostGIS. Evidence files
remain in private S3-compatible storage. Only stable identifiers, SHA-256 hashes,
approval events and title state transitions belong on-chain. Encrypt database,
object-storage and mobile-device data at rest.

## Mobile synchronization

The device outbox is authoritative until the API acknowledges an operation.
Every operation has a UUID idempotency key. Upload large evidence separately with
resumable HTTPS. MQTT provides wake-up/status events; it is not the sole record
transport. Conflicting versions enter a human resolution queue.

## Required production gates

- Nigerian counsel validates Land Use Act workflow and Section 28 rules.
- Survey authority confirms coordinate systems, tolerances and topology rules.
- Smart contracts receive independent audit and invariant/fuzz testing.
- Penetration testing covers APIs, devices, storage and validator network.
- Disaster recovery and key-compromise exercises are completed.
- Accessibility, local-language, field usability and low-bandwidth trials pass.
- Performance and security metrics in Chapter 3 are collected against a baseline.
