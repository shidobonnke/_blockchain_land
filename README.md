# Anagu Land Registry

Anagu is a cross-platform land-administration system designed for Nigeria's
statutory and customary tenure environment. It combines GIS parcel validation,
community attestation, legally controlled approval workflows, restricted digital
land-title tokens, and offline field-data capture.

The project implements the architecture and workflows described in Chapters 1 and
3 of the accompanying research document.

See the [objectives and methodology completion audit](docs/objectives-methodology-audit.md)
for the objective-by-objective evidence, required Chapter 4 experiments, and
contradictions that must be corrected in the dissertation text.

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

| Layer                           | Technology                         |
| ------------------------------- | ---------------------------------- |
| Administrative web application  | Next.js, React, TypeScript         |
| Field mobile application        | React Native, Expo, TypeScript     |
| Shared backend                  | NestJS, TypeScript                 |
| ORM                             | Prisma                             |
| Operational database            | PostgreSQL                         |
| Spatial database                | PostGIS                            |
| Mobile offline database         | SQLite                             |
| Blockchain                      | Hyperledger Besu                   |
| Ledger consensus for production | QBFT                               |
| Smart contracts                 | Solidity                           |
| Token standard                  | Restricted ERC-721                 |
| Contract libraries and tests    | OpenZeppelin, Hardhat, ethers.js   |
| Messaging                       | MQTT/EMQX                          |
| Cache and job infrastructure    | Redis                              |
| Document storage                | MinIO/S3-compatible object storage |
| Local orchestration             | Docker Compose                     |

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

| Variable                        | Description                  | Development value                                       |
| ------------------------------- | ---------------------------- | ------------------------------------------------------- |
| `PORT`                          | NestJS API port              | `4000`                                                  |
| `DATABASE_URL`                  | Prisma PostgreSQL connection | `postgresql://apple@localhost:5432/anagu?schema=public` |
| `JWT_SECRET`                    | JWT signing secret           | Replace before shared deployment                        |
| `WEB_ORIGIN`                    | Allowed browser origin       | `http://localhost:3000`                                 |
| `RPC_URL`                       | Besu JSON-RPC endpoint       | `http://localhost:8545`                                 |
| `LAND_REGISTRY_ADDRESS`         | Deployed registry contract   | Set after deployment                                    |
| `TITLE_NFT_ADDRESS`             | Deployed title contract      | Set after deployment                                    |
| `BLOCKCHAIN_SIGNER_PRIVATE_KEY` | Backend signer               | Never commit this value                                 |
| `MQTT_URL`                      | MQTT broker connection       | `mqtt://localhost:1883`                                 |
| `REDIS_URL`                     | Redis connection             | `redis://localhost:6379`                                |
| `S3_ENDPOINT`                   | MinIO/S3 API                 | `http://localhost:9000`                                 |
| `S3_ACCESS_KEY`                 | Object-storage access key    | Development only                                        |
| `S3_SECRET_KEY`                 | Object-storage secret        | Replace before deployment                               |
| `S3_BUCKET`                     | Evidence bucket              | `land-documents`                                        |

The mobile application can use:

```env
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_LAN_IP:4000/api/v1
```

Do not use `localhost` from a physical phone; it refers to the phone itself. Use
the development computer's LAN address instead.

## Database setup

### 1. Start PostgreSQL with PostGIS

The recommended development database is the Compose service. It includes PostGIS
and uses the passwordless local-development account `apple`. On Apple Silicon,
Compose runs the official AMD64 PostGIS image through Docker Desktop emulation:

```bash
brew services stop postgresql@15
docker compose up -d postgres
```

Before starting it, ensure another Docker container is not already publishing port
`5432`:

```bash
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

Confirm that the server is accepting connections:

```bash
pg_isready -h localhost -p 5432 -U apple
```

### 2. Verify PostGIS

```bash
psql -h localhost -U apple -d anagu \
  -c "SELECT current_user, public.PostGIS_Version();"
```

PostGIS is required because `LandParcel.geometry` uses
`geometry(Polygon, 4326)`. The initial Prisma migration also enables the
extension automatically. Do not run `createdb`: the Compose service creates the
`anagu` database during initialization.

### 3. Generate the Prisma client

```bash
npm run db:generate
```

### 4. Apply the schema

For development:

```bash
npm run db:migrate
```

Prisma does not provide complete first-class PostGIS query support. The schema
therefore declares geometry as `Unsupported("geometry(Polygon, 4326)")`, while
the parcel service uses parameterized PostGIS SQL for spatial operations.

## Installation

From the repository root:

```bash
npm install
npm run db:generate
```

To start all local infrastructure:

```bash
docker compose up -d postgres redis mqtt minio besu
```

The Docker PostgreSQL service and a local Homebrew PostgreSQL server cannot both
bind host port `5432`; use only one at a time.

Inspect service state:

```bash
docker compose ps
```

Development service addresses:

| Service        | Address                  |
| -------------- | ------------------------ |
| PostgreSQL     | `localhost:5432`         |
| Redis          | `localhost:6379`         |
| MQTT           | `localhost:1883`         |
| EMQX dashboard | `http://localhost:18083` |
| MinIO API      | `http://localhost:9000`  |
| MinIO console  | `http://localhost:9001`  |
| Besu JSON-RPC  | `http://localhost:8545`  |

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

| Route                                  | Purpose                             |
| -------------------------------------- | ----------------------------------- |
| `/api/v1/health`                       | Service health                      |
| `/api/v1/auth/register`                | Citizen registration                |
| `/api/v1/auth/login`                   | Authentication and JWT issuance     |
| `/api/v1/parcels`                      | Parcel creation and listing         |
| `/api/v1/parcels/:id`                  | Parcel details                      |
| `/api/v1/parcels/:id/validate-spatial` | PostGIS spatial validation          |
| `/api/v1/applications`                 | Application creation and listing    |
| `/api/v1/applications/:id/transition`  | Controlled workflow transition      |
| `/api/v1/applications/:id/attest`      | Community attestation               |
| `/api/v1/sync/operations`              | Idempotent offline operation intake |

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
        [3.35, 6.6],
        [3.351, 6.6],
        [3.351, 6.601],
        [3.35, 6.601],
        [3.35, 6.6]
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

Start the Compose database and verify port `5432`:

```bash
docker compose up -d postgres
pg_isready -h localhost -p 5432 -U apple
```

### Database `anagu` does not exist

The Compose database creates it automatically. Confirm that the correct container
is running:

```bash
docker compose ps postgres
```

### PostGIS type does not exist

The PostgreSQL server does not have PostGIS installed. Use the included PostGIS
container:

```bash
brew services stop postgresql@15
docker compose up -d postgres
psql -h localhost -U apple -d anagu \
  -c "SELECT public.PostGIS_Version();"
```

The `public.` qualification is intentional because some PostgreSQL installations
use a customized schema search path.

### PostgreSQL reports `role "apple" does not exist`

This normally means another PostgreSQL container owns port `5432`. Find it:

```bash
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Ports}}"
lsof -nP -iTCP:5432 -sTCP:LISTEN
```

Stop only the conflicting container, then start Anagu PostgreSQL:

```bash
docker stop <conflicting-container-name>
docker compose up -d postgres
```

Do not remove its volume unless its data is disposable.

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

Both attempt to bind port `5432`. Use only one database instance. To use the
recommended Compose database:

```bash
brew services stop postgresql@15
docker compose up -d postgres
```

### Docker reports a missing manifest on Apple Silicon

The Compose file pins the official PostGIS image to `platform: linux/amd64`.
Docker Desktop must have x86/AMD64 emulation enabled. Pull it explicitly if
necessary:

```bash
docker pull --platform linux/amd64 postgis/postgis:17-3.5
docker compose up -d postgres
```

### Docker Hub reports a TLS handshake or context deadline timeout

This is a registry/network timeout rather than a Compose configuration error.
Restart Docker Desktop if needed, then retry; downloaded layers are reused:

```bash
docker compose pull
docker compose up -d
```

### Web frontend cannot bind port `3000`

Check for another process using the port:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

After freeing the port, run `npm run dev:web` and open
`http://localhost:3000`.

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

The complete mapping from Chapters 1 and 3 to source code, tests, runtime checks,
and external research activities is maintained in
[the requirements traceability matrix](docs/chapter-1-3-traceability.md).
