# Objectives and methodology completion audit

Audit source: `Anagu Work 1&3.docx` (Chapters 1 and 3).

Audit date: 10 August 2026.

## Executive finding

The repository implements the proposed research artefact at prototype level. The
four technology strands are integrated: PostGIS spatial validation, restricted
ERC-721 titles on an EVM/Besu-compatible ledger, community attestations, and an
offline mobile outbox with idempotent server-side execution and MQTT status events.

The development objectives are achieved as software deliverables. The empirical
evaluation objective is **instrumented but not yet achieved as a research result**.
It requires controlled experiments, retained raw data, a defined conventional or
partially digitised baseline, and analysis in Chapter 4. Legal alignment is encoded
as a design interpretation; legal compliance cannot be claimed until qualified
Nigerian land-law stakeholders validate it.

## Objective-level decision

| Document objective                                                                                                                 | Evidence                                                                                                                                                                                           | Decision                                                  | Work still required outside source code                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Integrate GIS, NFT tokenisation, MQTT/offline support, and hybrid social oracles                                                   | `ParcelsService`, mobile SQLite outbox, `SyncService`, `EventPublisher`, application attestations, `LandRegistry.sol`, and `LandTitleNFT.sol`                                                      | Prototype achieved and compilation/tests verified         | Demonstrate all components together on configured infrastructure                                         |
| Implement a prototype aligned with the Land Use Act (1978)                                                                         | Role-constrained statutory/customary workflow, owner-controlled transfer request, dispute lock, governor request, strict >75% validator approval, separate judiciary approval, registrar execution | Design/prototype achieved                                 | Review by qualified Nigerian land-law stakeholders; document the legal interpretation and any amendments |
| Evaluate data security, fraud reduction, transparency, and network performance against conventional/partially digitised registries | Evaluation data model/dashboard, spatial rejection events, blockchain latency records, sync results, and evaluation runner                                                                         | Instrumentation exists; objective result not yet achieved | Execute the protocol below against both systems and retain raw results                                   |

## Methodology-to-implementation trace

| Methodology requirement                      | Implemented evidence                                                                                                                                                     | Verification state                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| GIS validity and conflicting-allocation gate | Closed/bounded polygon input validation; PostGIS `ST_IsValid`; area-intersection rejection while permitting shared cadastral boundaries; geometry hash                   | Compiled; runtime PostGIS experiment required                           |
| Customary social-oracle gate                 | Customary claims must enter `COMMUNITY_REVIEW`; two unique representative approvals are required                                                                         | Automated routing tests pass; database integration experiment required  |
| Statutory route                              | Statutory claims proceed from spatial to legal review without an artificial community-vote requirement                                                                   | Automated routing tests pass                                            |
| Immutable NFT title                          | Registry-only mint/transfer and unique parcel title                                                                                                                      | Solidity tests pass                                                     |
| Offline capture and later synchronization    | Complete parcel/claim payload stored in SQLite; atomic parcel plus draft-application creation; operation-ID idempotency; rejected overlaps retained as processed results | TypeScript compilation passes; disconnect/reconnect experiment required |
| MQTT support                                 | QoS 1 per-user title events                                                                                                                                              | Source compiled; broker delivery/reconnect experiment required          |
| Ownership transfer                           | Current recorded owner request, matched recipient identity/wallet, legal approval, registrar execution, dispute lock                                                     | Source compiled; end-to-end chain/database test required                |
| Section 28 high-impact path                  | Governor request, unique validator votes, strict >75%, judiciary approval, registrar execution                                                                           | Solidity tests pass; legal validation required                          |
| Documents and provenance                     | Private object-store upload/download URLs; SHA-256 content hashes committed into title metadata                                                                          | Source compiled; tamper corpus/reconstruction test required             |

## Required evaluation protocol

Do not use application dashboard counts as proof of improvement. Run and retain a
dated, reproducible dataset for each item.

1. Freeze the tested commit, infrastructure versions, validator topology, hardware,
   dataset, concurrency, duration, and network conditions.
2. Define two baselines precisely: the conventional paper workflow and the selected
   partially digitised registry. Use the same transaction scenarios and observation
   window where comparison is meaningful.
3. Security: attempt geometry/document/database tampering, unauthorized role actions,
   duplicate submissions, direct NFT transfer, duplicate validator votes, and
   revocation without each required authority. Record attempted, detected, blocked,
   and undetected counts.
4. Fraud: submit controlled duplicate/contained/partially overlapping parcels and
   adjacent parcels sharing only a boundary. Report prevention rate and false-positive
   rate. Reconstruct title provenance from application, audit, hashes, and chain data.
5. Transparency: sample completed transactions and calculate the proportion for
   which actor, time, state transition, supporting hash, and chain confirmation can
   be independently reconstructed.
6. Performance: measure confirmed blockchain transactions per second and submission-
   to-confirmation latency at increasing concurrency. API GET throughput is a separate
   measure and must not be labelled blockchain throughput.
7. Availability: run sustained monitoring over a declared period; do not infer uptime
   from a short request burst.
8. Offline reliability: repeat capture-disconnect-reconnect tests, including retries,
   duplicate delivery, invalid geometry, and parcel conflict. Report accepted,
   rejected, duplicated, lost, and corrupted operations.
9. Energy: measure validator-host joules over a defined interval and divide by
   confirmed blockchain transactions. Do not estimate this from latency.
10. Smart-contract exposure: retain automated test results plus static-analysis and
    independent-review findings.

## Document corrections required before submission

The DOCX contains internal contradictions that should be corrected in the source
document:

- Section 1.3 lists three objectives, section 3.1 says there are five, and Table 3.1
  contains four. Use one numbering scheme throughout. The current implementation
  maps cleanly to three Chapter 1 objectives; Table 3.1 can instead use four DSR
  activities without calling them four objectives.
- Chapter 3 mixes completed-study past tense ("was conducted") with proposal future
  tense ("will be embodied"). Use past tense only after the experiments are run.
- Section numbering is out of order (`3.6`, `3.7`, `3.8`, then `3.2.4`, `3.4`,
  `3.5`, and another `3.6`). Renumber headings and all figure/table cross-references.
- The deployment description says IPFS, while the prototype uses private MinIO/S3
  object storage with content hashes. Either change the methodology to that accurate
  design or implement and evaluate IPFS; do not claim both.
- DPoS is implemented as delegated community attestation at the social-oracle layer,
  not as a second base-ledger consensus engine. Besu QBFT is the ledger consensus.
- “Erdos Consensus Algorithm” is not implemented as a Besu consensus plugin. In this
  artefact it is the named high-impact governance state path above QBFT. State this
  explicitly or rename it to avoid an unsupported algorithmic claim.
- Claims such as “legally compliant,” “high availability,” “near-perfect
  immutability,” “efficient,” or superiority to conventional registries must be
  written as design goals until supported by the legal review and Chapter 4 results.

## Completion gate

The study can be described as fully completed only when all of the following exist:

- passing source tests and builds;
- an end-to-end configured demonstration;
- raw and analysed experimental results for every declared metric;
- comparable baseline observations;
- static analysis/security review evidence;
- Nigerian legal/stakeholder validation; and
- a corrected Chapter 3 whose tense, objective count, technologies, and claims match
  the implemented and evaluated artefact.
