# Anagu Land Registry

Anagu is a cross-platform land-administration system designed for Nigeria's
statutory and customary tenure environment. It combines GIS parcel validation,
community attestation, legally controlled approval workflows, restricted digital
land-title tokens, and offline field-data capture.

The project implements the architecture and workflows described in Chapters 1 and
3 of the accompanying research document.

> **Project status:** research and evaluation prototype. The application is suitable
> for development, demonstration, controlled testing, and dissertation evaluation.
> It is not a legally authoritative land registry until the production requirements
> described below have been completed.

## Table of contents

- [System overview](#system-overview)
- [Technology stack](#technology-stack)
- [Repository structure](#repository-structure)
- [Domain workflow](#domain-workflow)
- [Prerequisites](#prerequisites)
- [Environment configuration](#environment-configuration)
- [Database setup](#database-setup)
- [Installation](#installation)
- [Running the system](#running-the-system)
- [Smart-contract deployment](#smart-contract-deployment)
- [API documentation](#api-documentation)
- [Testing and verification](#testing-and-verification)
- [Offline synchronization](#offline-synchronization)
- [Security model](#security-model)
- [Troubleshooting](#troubleshooting)
- [Production requirements](#production-requirements)

## System overview

Anagu uses two client applications and one authoritative backend:

```text
┌────────────────────┐       ┌────────────────────┐
│ Next.js web portal │       │ React Native mobile│
│ Admin and citizens │       │ Field/offline work │
└─────────┬──────────┘       └──────────┬─────────┘
          │ HTTPS / REST                │ HTTPS / REST + MQTT
          └──────────────┬──────────────┘
                         ▼
              ┌─────────────────────┐
              │ NestJS shared API   │
              │ Workflow authority  │
              └───────┬─────────────┘
                      │
       ┌──────────────┼───────────────┬────────────────┐
       ▼              ▼               ▼                ▼
 PostgreSQL/PostGIS  Redis        MinIO/S3       Hyperledger Besu
 Parcels and records Jobs/cache    Documents      Solidity contracts
```

Web and mobile clients do not communicate directly with PostGIS, document storage,
or blockchain nodes. All validation and state changes pass through the NestJS API.

### Main capabilities

- Citizen and institutional user accounts
- Role-based land-registration workflow
- Statutory and customary tenure records
- PostGIS parcel geometry storage
- Invalid-geometry and parcel-overlap detection
- Community-representative attestations
- Legal and registrar approval stages
- Immutable application audit history
- Restricted ERC-721 land-title issuance
- Registry-controlled ownership transfer
- Dispute-based title locking
- Multi-layer revocation with judicial oversight
- Offline mobile outbox and idempotent synchronization
- Public title-verification interface

## Technology stack

| Layer | Technology |
|---|---|
| Administrative web application | Next.js, React, TypeScript |
| Field mobile application | React Native, Expo, TypeScript |
| Shared backend | NestJS, TypeScript |
| ORM | Prisma |
| Operational database | PostgreSQL |
| Spatial database | PostGIS |
| Mobile offline database | SQLite |
| Blockchain | Hyperledger Besu |
| Ledger consensus for production | QBFT |
| Smart contracts | Solidity |
| Token standard | Restricted ERC-721 |
| Contract libraries and tests | OpenZeppelin, Hardhat, ethers.js |
| Messaging | MQTT/EMQX |
| Cache and job infrastructure | Redis |
| Document storage | MinIO/S3-compatible object storage |
| Local orchestration | Docker Compose |

QBFT is the base-ledger consensus mechanism. The community DPoS concept described
in the study is implemented as representative voting and attestation logic, not as
a competing blockchain consensus protocol.

## Repository structure

```text
anagu/
├── apps/
│   ├── api/                    # NestJS API and Prisma schema
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migration.sql
│   │   └── src/
│   │       ├── applications/   # Registration workflow and attestations
│   │       ├── auth/           # Registration, login and JWT issuance
│   │       ├── common/         # Prisma and validation infrastructure
│   │       ├── parcels/        # PostGIS parcel operations
│   │       └── sync/           # Idempotent offline operations
│   ├── web/                    # Next.js portal
│   └── mobile/                 # React Native/Expo field application
├── packages/
│   ├── contracts/              # Solidity contracts and Hardhat tests
│   └── shared/                 # Shared types, enums and Zod schemas
├── docs/
│   └── production.md           # Production controls and deployment gates
├── infrastructure/
├── docker-compose.yml
├── .env.example
└── package.json
```

This is an npm-workspaces monorepo. Install dependencies once from the repository
root.

## Domain workflow

### Registration application

```text
DRAFT
  → SUBMITTED
  → SPATIAL_REVIEW
  → COMMUNITY_REVIEW       # required for customary claims
  → LEGAL_REVIEW
  → REGISTRAR_REVIEW
  → BLOCKCHAIN_PENDING
  → MINTED
```

An application can also enter `REJECTED` or `CANCELLED` where permitted.

### Parcel/title lifecycle

```text
UNREGISTERED → PENDING → SPATIALLY_VERIFIED → COMMUNITY_VALIDATED
             → APPROVED → ACTIVE → TRANSFERRED
                                  → DISPUTED
                                  → SUSPENDED
                                  → REVOKED
```

Important enforced rules:

- An intersecting parcel is rejected before creation.
- Geometry must be valid and non-overlapping before spatial review can pass.
- Customary claims require the configured community-attestation threshold.
- Only permitted roles can execute each workflow transition.
- Concurrent updates are protected with an application version number.
- Every accepted transition creates an audit record.
- Owners cannot freely transfer title NFTs from their wallets.
- Disputed or revoked titles cannot be transferred.
- Revocation requires a governor request, judiciary approval, and registrar
  execution.

## Prerequisites

Install the following:

- Node.js 20 or later
- npm 11 or a compatible recent npm release
- PostgreSQL with PostGIS
- Docker Desktop or Docker Engine with Compose
- Android Studio or Xcode when running native mobile builds

Check the main development tools:

```bash
node --version
npm --version
docker --version
psql --version
```

## Environment configuration

The root `.env` and `apps/api/.env` are ignored by Git. `.env.example` documents
the required values.

The current local PostgreSQL connection is configured for user `apple` without a
password:

```env
DATABASE_URL=postgresql://apple@localhost:5432/anagu?schema=public
```

Main variables:

| Variable | Description | Development value |
|---|---|---|
| `PORT` | NestJS API port | `4000` |
| `DATABASE_URL` | Prisma PostgreSQL connection | `postgresql://apple@localhost:5432/anagu?schema=public` |
| `JWT_SECRET` | JWT signing secret | Replace before shared deployment |
| `WEB_ORIGIN` | Allowed browser origin | `http://localhost:3000` |
| `RPC_URL` | Besu JSON-RPC endpoint | `http://localhost:8545` |
| `LAND_REGISTRY_ADDRESS` | Deployed registry contract | Set after deployment |
| `TITLE_NFT_ADDRESS` | Deployed title contract | Set after deployment |
| `BLOCKCHAIN_SIGNER_PRIVATE_KEY` | Backend signer | Never commit this value |
| `MQTT_URL` | MQTT broker connection | `mqtt://localhost:1883` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `S3_ENDPOINT` | MinIO/S3 API | `http://localhost:9000` |
| `S3_ACCESS_KEY` | Object-storage access key | Development only |
| `S3_SECRET_KEY` | Object-storage secret | Replace before deployment |
| `S3_BUCKET` | Evidence bucket | `land-documents` |

The mobile application can use:

```env
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:4000/api/v1
```

Do not use `localhost` from a physical phone; it refers to the phone itself. Use
the development computer's LAN address instead.

## Database setup

### 1. Start PostgreSQL

If PostgreSQL was installed with Homebrew:

```bash
brew services start postgresql@17
```

Confirm that the server is accepting connections:

```bash
pg_isready -h localhost -p 5432 -U apple
```

### 2. Create the database

```bash
createdb -U apple anagu
```

If it already exists, PostgreSQL will report that fact and no recreation is needed.

### 3. Enable PostGIS

```bash
psql -U apple -d anagu -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

PostGIS is required because `LandParcel.geometry` uses
`geometry(Polygon, 4326)`.

### 4. Generate the Prisma client

```bash
npm run db:generate
```

### 5. Apply the schema

For development:

```bash
npm run db:migrate
```

Choose a descriptive migration name such as `initial_land_registry` when Prisma
prompts for one.

Prisma does not provide complete first-class PostGIS query support. The schema
therefore declares geometry as `Unsupported("geometry(Polygon, 4326)")`, while
the parcel service uses parameterized PostGIS SQL for spatial operations.

## Installation

From the repository root:

```bash
npm install
npm run db:generate
```

To start Redis, MQTT, MinIO, and the local Besu node:

```bash
docker compose up -d redis mqtt minio besu
```

The Compose file also contains a PostGIS service using Docker credentials. Do not
start the Docker `postgres` service if your passwordless local PostgreSQL server is
already using port `5432`.

Inspect service state:

```bash
docker compose ps
```

Stop the infrastructure:

```bash
npm run infra:down
```

## Running the system

Use separate terminal windows.

### Shared API

```bash
npm run dev:api
```

Available at:

- API: `http://localhost:4000/api/v1`
- Swagger documentation: `http://localhost:4000/docs`
- Health check: `http://localhost:4000/api/v1/health`

### Web portal

```bash
npm run dev:web
```

Open `http://localhost:3000`.

### Mobile application

```bash
npm run dev:mobile
```

Then use the Expo terminal to start an Android emulator, iOS simulator, development
build, or supported Expo client.

Native capabilities such as background processing, secure storage, advanced maps,
and MQTT may require an Expo development build rather than Expo Go.

## Smart-contract deployment

### Contracts

- `LandTitleNFT.sol` implements the restricted ERC-721 title.
- `LandRegistry.sol` implements issuance, controlled transfers, disputes, and
  multi-stage revocation.

Compile and test:

```bash
npm run build -w @anagu/contracts
npm run test -w @anagu/contracts
```

Start the local Besu node:

```bash
docker compose up -d besu
```

Deploy:

```bash
npm run deploy:local -w @anagu/contracts
```

The deployment command prints the `titleNFT` and `landRegistry` addresses. Copy
them into the environment:

```env
TITLE_NFT_ADDRESS=0x...
LAND_REGISTRY_ADDRESS=0x...
```

The Compose Besu service runs a single-node developer network. It must never be
represented as production QBFT consensus.

## API documentation

Interactive OpenAPI documentation is generated by NestJS:

```text
http://localhost:4000/docs
```

Main endpoint groups:

| Route | Purpose |
|---|---|
| `/api/v1/health` | Service health |
| `/api/v1/auth/register` | Citizen registration |
| `/api/v1/auth/login` | Authentication and JWT issuance |
| `/api/v1/parcels` | Parcel creation and listing |
| `/api/v1/parcels/:id` | Parcel details |
| `/api/v1/parcels/:id/validate-spatial` | PostGIS spatial validation |
| `/api/v1/applications` | Application creation and listing |
| `/api/v1/applications/:id/transition` | Controlled workflow transition |
| `/api/v1/applications/:id/attest` | Community attestation |
| `/api/v1/sync/operations` | Idempotent offline operation intake |

GeoJSON parcel creation uses WGS 84 (`EPSG:4326`) polygon coordinates:

```json
{
  "parcelCode": "AN-LA-001",
  "state": "Lagos",
  "lga": "Ikeja",
  "address": "Example cadastral location",
  "tenureType": "CUSTOMARY",
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [
        [3.3500, 6.6000],
        [3.3510, 6.6000],
        [3.3510, 6.6010],
        [3.3500, 6.6010],
        [3.3500, 6.6000]
      ]
    ]
  }
}
```

## Testing and verification

Run all configured tests:

```bash
npm test
```

Run production builds:

```bash
npm run build
```

Run the mobile TypeScript check:

```bash
npx tsc -p apps/mobile/tsconfig.json --noEmit
```

Verified during initial implementation:

- Shared package compilation
- Prisma schema validation and client generation
- NestJS production compilation
- Next.js production build
- React Native TypeScript validation
- Solidity compilation
- Restricted-transfer contract behavior
- Multi-stage revocation contract behavior

Run a dependency review before releases:

```bash
npm audit
```

Some advisories can originate in Expo/React Native development tooling and may
require a coordinated Expo SDK upgrade rather than an automatic forced update.

## Offline synchronization

The mobile application stores pending field actions in SQLite:

```text
Local capture → SQLite outbox → HTTPS synchronization → API acknowledgement
```

Each operation has a client-generated UUID. The API stores that UUID in
`SyncOperation`, so retrying an acknowledged operation does not create duplicate
records.

Synchronization rules:

- Save locally before attempting network access.
- Keep operations queued until server acknowledgement.
- Use HTTPS for authoritative record and evidence upload.
- Use MQTT for lightweight status and wake-up events.
- Do not assume a permanent MQTT connection while a phone is suspended.
- Send conflicting versions to a human-resolution workflow.

## Security model

The prototype establishes these security boundaries:

- Passwords are hashed with bcrypt.
- Authentication uses signed JWTs.
- Workflow transitions are role constrained.
- Parcel SQL uses parameterized queries.
- Spatial conflicts stop title-registration progression.
- Audit records capture accepted transitions.
- NFT transfers are restricted to the registry contract.
- Disputed and revoked titles are locked.
- Revocation requires separate institutional approvals.
- Sensitive evidence is designed for private object storage, not blockchain.

Before production:

- Replace every development secret.
- Use an identity provider with MFA for privileged roles.
- Place signing keys in an HSM or managed key vault.
- Add API-wide authentication and fine-grained authorization enforcement.
- Enable TLS for API, MQTT, database, storage, and validator communications.
- Perform application, infrastructure, and smart-contract security audits.
- Define backup, recovery, retention, privacy, and incident-response procedures.

## Troubleshooting

### PostgreSQL reports “no response”

Start PostgreSQL and verify port `5432`:

```bash
brew services start postgresql@17
pg_isready -h localhost -p 5432 -U apple
```

### Database `anagu` does not exist

```bash
createdb -U apple anagu
```

### PostGIS type does not exist

```bash
psql -U apple -d anagu -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

### Prisma cannot connect

Confirm `apps/api/.env` contains:

```env
DATABASE_URL=postgresql://apple@localhost:5432/anagu?schema=public
```

Then run:

```bash
npm run db:generate
npm run db:migrate
```

### Docker PostgreSQL conflicts with local PostgreSQL

Both attempt to bind port `5432`. Use only one database instance. For the current
configuration, use the local PostgreSQL account `apple` and start only:

```bash
docker compose up -d redis mqtt minio besu
```

### A physical mobile device cannot reach the API

Use the computer's LAN IP:

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:4000/api/v1
```

Ensure the phone and computer use the same network and the local firewall allows
port `4000`.

## Production requirements

A national or state deployment requires work beyond application source code:

- Formal validation of workflows against the Land Use Act and applicable state law
- Authoritative cadastral data and agreed spatial tolerances
- Identity proofing for every institutional and community role
- Independent security and smart-contract audits
- Hardware-backed organizational signing keys
- Private, encrypted evidence storage
- At least four independently operated Besu QBFT validators
- Node and account permissioning
- Monitoring, backup, disaster recovery, and key-compromise exercises
- SMS, email, and push-notification provider accounts
- Accessibility, local-language, low-connectivity, and field-usability testing
- Evaluation against the security, fraud, transparency, latency, throughput,
  availability, and synchronization metrics defined in Chapter 3

See [production deployment requirements](docs/production.md) for the condensed
deployment checklist.
