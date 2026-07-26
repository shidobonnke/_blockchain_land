# Chapters 1 and 3 implementation traceability

This matrix prevents the prototype from claiming research outcomes that have not
been implemented or empirically measured.

Status definitions:

- **Implemented and verified** — source exists and compilation or automated tests pass.
- **Implemented; runtime validation required** — source exists but needs the configured
  infrastructure, identities, or evaluation dataset.
- **External research activity** — cannot be achieved by source code alone and must
  be reported from executed experiments or stakeholder/legal validation.

## Chapter 1 objectives

| Requirement                                                     | Implementation evidence                                                                                           | Status                                                  |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Integrated GIS, NFT, MQTT and social-oracle architecture        | PostGIS parcel service, Solidity registry/NFT, MQTT event publisher, mobile SQLite outbox, community attestations | Implemented and verified                                |
| Prototype explicitly aligned with the Land Use Act              | Role workflow and multi-layer Section 28 revocation path                                                          | Implemented; Nigerian legal validation required         |
| Evaluate data security, fraud reduction and network performance | Evaluation data model, metrics API, reporting view and `npm run evaluate` runner                                  | Implemented; experiments required                       |
| Compare with conventional/partially digitised registry          | Evaluation protocol supports measurements                                                                         | External baseline data and executed comparison required |

## Use-case diagram

| Actor/function           | Evidence                                                                   | Status      |
| ------------------------ | -------------------------------------------------------------------------- | ----------- |
| Citizen                  | Registration/login, application, dispute and transfer APIs; mobile capture | Implemented |
| Surveyor                 | Spatial validation role and PostGIS gate                                   | Implemented |
| Community representative | Authenticated unique attestation                                           | Implemented |
| Land administrator       | Workflow and validator permissions                                         | Implemented |
| Legal officer            | Legal transition, dispute resolution and transfer approval                 | Implemented |
| Registrar                | Final workflow, title issuance, transfer and revocation execution          | Implemented |
| Governor                 | Revocation request permission                                              | Implemented |
| Judiciary                | Separate revocation approval and dispute permission                        | Implemented |
| Auditor                  | Evaluation API and revocation validator permission                         | Implemented |
| Reporting                | Evaluation service and web report                                          | Implemented |

## Activity and sequence diagrams

| Required interaction            | Evidence                                       | Status                                              |
| ------------------------------- | ---------------------------------------------- | --------------------------------------------------- |
| Offline application capture     | Mobile SQLite outbox                           | Implemented and TypeScript verified                 |
| Later synchronization           | Idempotent `/sync/operations` intake           | Implemented                                         |
| GIS spatial validation          | `ST_IsValid` and overlap query                 | Implemented                                         |
| Failed overlap stops processing | Parcel rejection and prevention metric         | Implemented                                         |
| Social-oracle validation        | Unique representative votes and threshold gate | Implemented                                         |
| Legal and registrar approvals   | Role-constrained state machine                 | Implemented                                         |
| Smart-contract invocation       | NestJS blockchain orchestration service        | Implemented; deployed addresses and signer required |
| NFT minting to owner wallet     | Restricted ERC-721 issuance                    | Implemented and contract tested                     |
| Blockchain transaction recorded | `BlockchainTransaction` and `LandTitle`        | Implemented                                         |
| MQTT event delivery             | QoS 1 user event publisher                     | Implemented; broker validation required             |

## State diagram

The Prisma application and parcel enums implement pending, spatial validation,
community validation, approval, active/minted, rejected, disputed, suspended,
transferred and revoked states. Solidity independently implements active, suspended,
disputed, transferred, revocation-pending and revoked title states.

## Class diagram

| Class/entity               | Prisma or contract representation     |
| -------------------------- | ------------------------------------- |
| User and role              | `User`, `Role`                        |
| Land parcel and GIS data   | `LandParcel.geometry`, PostGIS        |
| Claim/application          | `LandApplication`                     |
| Community validation       | `Attestation`                         |
| Workflow event             | `WorkflowTransition`                  |
| Land-title NFT             | `LandTitle`, `LandTitleNFT.sol`       |
| Smart-contract transaction | `BlockchainTransaction`               |
| Transfer                   | `TransferRequest`                     |
| Dispute                    | `Dispute`                             |
| Revocation                 | `RevocationRequest`, `RevocationVote` |
| Evidence/document          | `Document`, MinIO/S3 service          |
| Offline operation          | `SyncOperation`                       |
| Audit log                  | `AuditLog`                            |
| Evaluation result          | `EvaluationMetric`                    |

## Deployment diagram

| Node/service                | Local implementation   | Production requirement                           |
| --------------------------- | ---------------------- | ------------------------------------------------ |
| Web client                  | Next.js                | TLS, CDN/reverse proxy and access controls       |
| Mobile client               | React Native/Expo      | Signed Android/iOS builds and device policy      |
| Backend server              | NestJS                 | Redundant private instances                      |
| Spatial database            | PostgreSQL/PostGIS     | Backups, replication and encryption              |
| MQTT                        | EMQX Compose service   | TLS, per-device credentials and topic ACLs       |
| Document storage            | MinIO                  | Private redundant storage and retention policy   |
| Blockchain                  | Besu developer node    | At least four independent QBFT validators        |
| External government systems | Configuration boundary | Agency agreements and integration specifications |

## Revocation and consensus

- Besu QBFT is the base ledger consensus for production.
- Community voting is the hybrid social-oracle layer.
- The Solidity revocation process requires a governor request.
- Validators can vote only once.
- At least four validators must exist.
- Approval must be strictly greater than 75%.
- A judiciary role must separately approve.
- A registrar must execute the final revocation.

The study's term “Erdos Consensus Algorithm” is represented by the special
high-impact governance state path above. It is not falsely presented as a built-in
Besu consensus plugin.

## Evaluation metrics

| Chapter 3 metric               | Instrumentation                                 | Remaining activity                                                 |
| ------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------ |
| Throughput                     | `scripts/evaluate.mjs`                          | Run at defined concurrency/load                                    |
| Validation latency             | Blockchain service metric and runner            | Execute against configured network                                 |
| Energy per transaction         | No fabricated value                             | Measure validator host energy and divide by confirmed transactions |
| Data integrity rate            | Evaluation dashboard                            | Run tamper corpus                                                  |
| Availability                   | Evaluation runner success rate                  | Run sustained monitoring period                                    |
| Security incidents detected    | Fraud-prevention events and failed transactions | Execute attack test set                                            |
| Multiple-allocation prevention | PostGIS rejection metric                        | Execute controlled conflicting parcels                             |
| Audit completeness             | Audit and blockchain transaction counts         | Compare every test transaction                                     |
| Provenance traceability        | Geometry/document hashes and chain transaction  | Execute record reconstruction tests                                |
| Offline reliability            | Processed/total sync operations                 | Run disconnect/reconnect experiments                               |
| Smart-contract exposure        | Contract tests                                  | Add static analysis and independent audit                          |

## Verification record

The following passed after the implementation audit:

- Prisma client generation
- NestJS production compilation
- Next.js production compilation
- React Native TypeScript validation
- Solidity compilation
- Restricted NFT-transfer test
- Greater-than-75% validator plus judiciary revocation test

## Claims that must not be made yet

Do not report measured fraud reduction, throughput, availability, energy efficiency,
security improvement, or conventional-registry superiority until the Chapter 4
experiments have been executed and their raw results retained. Do not report legal
compliance as validated until qualified Nigerian land-law stakeholders review the
encoded workflow.
