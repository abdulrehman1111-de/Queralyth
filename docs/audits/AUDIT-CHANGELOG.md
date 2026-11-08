# Queralyth Cross-Document Audit Change Log

**Baseline:** Original `zip file.zip` supplied on 2026-11-08.
**Method:** Preserve original folder structure and filenames; apply approved clarifications as additions or narrowly scoped corrections to existing Markdown files.
**Scope:** Product Definition, Product Requirements, and System Design documentation.

## Approved findings incorporated

| Finding | Decision | Principal changes |
|---|---|---|
| AUD-01 | Centrally managed, read-only sample database; logically separate schema; dedicated backend-managed least-privilege connection; writable isolated experiments deferred | Product Scope, FRs, MVP, Acceptance Criteria, Workflows, Architecture, Components, Database Design, API, Query Engine, Deployment, Testing, ADR-025 |
| AUD-02 | Backend bounded result window; row and response-size limits; frontend pagination over returned rows; explicit truncation metadata | FRs, MVP, Acceptance Criteria, NFRs, Components, API, Query Engine, Testing, ADR-026 |
| AUD-03 | Deterministic rule/template-based Query Explanation Generator and frontend panel; AI deferred | FRs, Core Features, Acceptance Criteria, Components, Query Engine, Testing, ADR-027 |
| AUD-04 | `connections.config_version` standardized to `BIGINT UNSIGNED NOT NULL DEFAULT 1`; safe overflow behavior | Database Design, TDR-D17, ADR-028 |
| AUD-05 | 24-hour normal terminal retention; permanent account deletion may cascade-delete execution requests only after all are confirmed terminal; unresolved requests block deletion | Database Design, Concurrency, Error Handling, Testing, ADR-029 |
| AUD-06 | Basic frontend SQL syntax highlighting in MVP; exact SQL preserved; not a security control; editor library deferred to prototype | Product requirements, MVP, Acceptance Criteria, Components, Testing, ADR-030 |
| AUD-07 | Explicit async execution contract: 202 acceptance, idempotent UUID replay, polling, cancellation acknowledgement, distinct rejection statuses | API, Query Engine, Concurrency, Error Handling, Testing, ADR-031 |
| AUD-08 | Process-local bounded result cache; 15-minute default TTL; user/request scoping; explicit unavailable state after expiry/eviction/restart; no automatic rerun; single-instance MVP assumption | API, Query Engine, Architecture, Deployment, Database Design, Concurrency, Error Handling, Testing, ADR-032 |

## Important retained boundaries

- React with JavaScript (not TypeScript); Node.js/Express; modular monolith; MySQL 8.x only for the initial lifecycle.
- Application DB, external user DBs, and built-in sample schema remain distinct logical targets.
- SQL parsing/analysis is distinct from actual execution; only actual execution attempts enter query history when history is enabled.
- Result datasets are not persisted in query-history or execution-request tables.
- Server-side SQL validation, least privilege, timeouts, concurrency limits, cancellation confirmation, and SSRF protections remain authoritative.
- Zero-cost initial hosting remains a constraint; no paid provider is assumed.

## Verification notes

This is a documentation consistency audit, not an implementation, penetration, or live-provider verification. Provider-specific support for schema/user grants, actual cache memory budgets, SQL parser/editor libraries, and production RPO/RTO remain implementation/deployment validation items.

## Final package contents

The final archive preserves all 29 original Markdown documents and adds this changelog plus `FINAL-AUDIT-REPORT.md`. The final report records the disposition of AUD-01 through AUD-08, cross-document checks, mechanical validation, deferred decisions, and audit limitations.
