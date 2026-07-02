**# Lucina Id - Project Design Document**

## Overview
The Lucina Id project establishes a centralized, stable identifier system that decouples client-provided patient primary keys from all downstream data pipelines and analytical tables. By introducing a persistent Lucina ID as the canonical surrogate key, the solution eliminates the need for mass updates across the data estate whenever a client changes its source identifier. The project will deliver a dedicated mapping table, a service bundle (API/interface layer) for ID resolution and creation, a one-time migration of existing identifiers, and supporting documentation and governance processes. Project ID: b310881c-b2af-4f55-b994-12c865511ba2.

## Problem Statement
Client patient identifiers are currently written directly into every downstream pipeline table. When a client alters its primary key definition or values, every dependent table must be updated, creating high operational cost, risk of data inconsistency, and lengthy remediation cycles. The absence of an intermediate, client-agnostic identifier prevents stable joins, historical tracking, and reliable analytics across data refreshes.

## Project Objectives

### In Scope
- Design and implement a Lucina ID mapping table with supporting metadata (client ID, source system, original key, creation timestamp, status).
- Build a reusable service bundle that accepts a client identifier, returns an existing Lucina ID if present, or generates and persists a new mapping.
- Perform a one-time migration that maps and replaces all existing client identifiers in downstream tables with the corresponding Lucina IDs.
- Implement audit logging, versioning, and basic access controls for the mapping service.
- Provide integration patterns and sample code for pipeline teams to consume the bundle.
- Establish initial operational runbooks and monitoring for the new components.

### Out of Scope
- Re-architecture of upstream source systems or client ETL processes.
- Historical data lineage reconstruction beyond the mapping table itself.
- Client-specific business rule engines or validation logic.
- Full production rollout of downstream reporting or BI layer changes.
- Ongoing maintenance or enhancement of the bundle after Phase 4 handoff.

### Guiding Principles
- **Cutover Strategy**: Execute a controlled, phased migration with parallel-run validation windows to minimize production impact.
- **Composable by Design**: The service bundle must be callable from any pipeline technology (Spark, dbt, Python, SQL) via standardized interfaces.
- **Enterprise Alignment**: Solution must conform to existing data platform standards for surrogate keys, naming conventions, and security controls.
- **Standards-Driven**: Adopt UUIDv4 for Lucina IDs, follow internal data modeling and API versioning guidelines, and use approved logging and secrets-management patterns.
- **Testability**: All components must include automated unit, integration, and regression tests with measurable coverage targets.

## Target Architecture (High-Level)
The architecture consists of three core layers:
1. **Persistence Layer**: A dedicated mapping table (e.g., `lucina_patient_map`) stored in the enterprise data platform with columns for Lucina ID (UUID PK), client ID, source system, original patient key, effective dates, and audit fields.
2. **Interface Layer**: A lightweight service bundle exposing two primary operations—`resolveOrCreate(clientId, sourceSystem, originalKey)` and `getLucinaId(...)`—implemented as a reusable library or microservice with idempotent behavior.
3. **Consumption Layer**: Updated downstream pipelines that call the bundle early in ingestion and persist only the Lucina ID.

The bundle will be deployed alongside existing data services, leveraging current secrets management and observability tooling. A migration job will backfill the mapping table and rewrite historical records in a controlled batch process.

## Phased Approach (Proposed)

### Phase 1: Architecture & Design
- Finalize logical and physical data model for the mapping table.
- Produce interface specification (OpenAPI/contract) and sequence diagrams.
- Define cutover and rollback procedures.
- Establish development, test, and production environments and CI/CD pipelines.
- Complete security review and data classification assessment.

### Phase 2: Build
- Implement mapping table and associated indexes/constraints.
- Develop the service bundle with caching, retry logic, and comprehensive logging.
- Build migration scripts for existing identifier replacement.
- Create automated test suites and synthetic data generators.
- Perform internal code reviews and static analysis.

### Phase 3: Validation & Cutover
- Execute integration testing across representative pipelines.
- Run parallel validation comparing old and new identifier flows.
- Perform production migration in staged waves with data-quality gates.
- Monitor performance and error rates during cutover.
- Obtain sign-off from data governance and pipeline owners.

### Phase 4: Enterprise Enablement
- Deliver training sessions and self-service documentation.
- Hand over operational runbooks, monitoring dashboards, and on-call procedures.
- Archive project artifacts and close change records.

## Success Criteria
- 100% of new and existing client patient records mapped to Lucina IDs with zero data loss.
- Average bundle response time ≤ 15 ms (p95) under expected load.
- Reduction of client key change remediation effort from days to < 4 hours.
- Pipeline teams achieve 95% adoption of the bundle within 60 days of Phase 4 completion.
- All automated test suites maintain ≥ 85% code coverage with zero critical defects at go-live.

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Performance degradation of the bundle under high-volume ingestion | Medium | High | Implement caching layer and load testing; design for horizontal scaling |
| Data inconsistency during migration of large historical tables | Medium | High | Use staged migration with checksum validation and automated rollback scripts |
| Client identifier collisions or duplicates across source systems | Low | Medium | Enforce composite unique constraint on (clientId, sourceSystem, originalKey) |
| Delayed adoption by downstream teams | Medium | Medium | Provide early integration support and clear documentation; include adoption metrics in Phase 4 |

## Dependencies
- Access to current patient identifier schemas across all source systems.
- Enterprise data platform team for table provisioning and compute resources.
- Security and compliance approval for new data classification.
- Pipeline owners for integration testing windows and change windows.
- Existing secrets-management and observability platforms.

## Governance, Staffing & Timeline

### Team
- **Project Lead**: Overall coordination, stakeholder management, and milestone tracking.
- **Technical Lead**: Architecture decisions, bundle design, and code review ownership.
- **Development Team**: Two backend/data engineers responsible for table, bundle, and migration scripts.
- **QA Team**: Test strategy, automation framework, and validation execution.

### Timeline
- Phase 1: 3 weeks (architecture sign-off milestone).
- Phase 2: 5 weeks (code-complete milestone).
- Phase 3: 4 weeks (production cutover and validation complete).
- Phase 4: 3 weeks (documentation and handoff).
- Target project duration: 15 weeks from kickoff, with key delivery gates at the end of each phase.

## Next Steps
- Schedule architecture review workshop with data platform and security teams within 5 business days.
- Confirm resource allocation and obtain budget approval for compute and storage.
- Finalize and circulate interface contract for stakeholder feedback.
- Establish project governance cadence (weekly steering meetings) and obtain formal project charter sign-off.