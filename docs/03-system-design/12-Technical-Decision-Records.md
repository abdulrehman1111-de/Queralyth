# Queralyth — Technical Decision Records

**Document:** Technical Decision Records  
**Project:** Queralyth  
**Version:** 1.0  
**Status:** Initial decision baseline  
**Architecture:** Modular Monolith  
**Frontend:** React with JavaScript  
**Backend:** Node.js + Express  
**Database:** MySQL 8.x

---

## 1. Introduction

### 1.1 Purpose

This document records the important technical and architectural decisions made during Queralyth's system design.

It provides a traceable explanation of:

- What was decided.
- Why the decision was made.
- Which alternatives were considered.
- What consequences the decision introduces.
- Which decisions remain subject to technical validation.

### 1.2 Why Decision Records Matter

Queralyth has multiple interacting components, security requirements, database workflows, and execution-state constraints.

Without documented decisions, future implementation changes could unintentionally:

- Contradict earlier requirements.
- Introduce unnecessary complexity.
- Weaken security controls.
- Duplicate existing functionality.
- Create inconsistent architecture.
- Increase hosting costs.

Decision records help preserve architectural consistency as the project evolves.

### 1.3 Decision Statuses

| Status | Meaning |
|---|---|
| Accepted | Decision approved as the current project baseline |
| Provisional | Direction selected, but technical validation remains |
| Deferred | No final decision; revisit at the appropriate implementation stage |
| Superseded | Replaced by a later decision |

An accepted decision may still be revised if new evidence justifies a change. Such changes must be documented rather than silently introduced.

---

# 2. Architectural Decisions

## ADR-001: Modular Monolith Architecture

**Status:** Accepted

### Context

Queralyth needs several logically distinct components:

- Authentication and account management.
- Database connection management.
- SQL parsing and validation.
- Query execution.
- Execution-plan interpretation.
- Query history.
- Optimization analysis.

Deploying each component as a separate microservice would introduce unnecessary infrastructure and operational complexity during initial development.

### Decision

Use a modular monolith.

The initial system will consist of:

- One React frontend.
- One Node.js + Express backend.
- Logically separated backend modules.
- A separately organized query-engine package.
- One MySQL application database.
- External MySQL connections managed by the backend.

### Alternatives Considered

1. Microservices architecture.
2. Serverless functions for individual components.
3. A single unstructured backend codebase.

### Rationale

A modular monolith offers:

- Simpler deployment.
- Lower operational overhead.
- Easier local development.
- Clear module boundaries.
- Easier debugging.
- A potential path toward future service extraction.

### Consequences

The backend must maintain clear module boundaries and avoid tightly coupling unrelated responsibilities.

Microservices may be reconsidered only if actual scaling or organizational requirements justify them.

---

## ADR-002: React with JavaScript Instead of TypeScript

**Status:** Accepted

### Context

The frontend requires a component-based architecture and a maintainable development workflow.

### Decision

Use React with JavaScript and JSX.

TypeScript will not be used in the initial frontend implementation.

### Alternatives Considered

1. React with TypeScript.
2. React with JavaScript.
3. Another frontend framework.

### Rationale

JavaScript is the explicitly selected implementation language for Queralyth's frontend.

The architecture should not introduce TypeScript simply because it is common in larger React applications.

### Consequences

- Frontend source files use JavaScript.
- React components use JSX.
- Runtime validation remains necessary at important boundaries.
- API request and response structures must be documented.
- JSDoc may be used where additional type documentation is helpful.

A future migration to TypeScript would require a deliberate project decision.

---

## ADR-003: Node.js and Express Backend

**Status:** Accepted

### Context

Queralyth requires a backend capable of handling authentication, REST APIs, SQL processing, external MySQL connections, and background operations.

### Decision

Use Node.js with Express.

### Alternatives Considered

1. Node.js with Express.
2. Python-based backend.
3. Java-based backend.
4. Other Node.js frameworks.

### Rationale

Node.js provides a consistent JavaScript ecosystem across the application and supports the asynchronous network operations required by the product.

Express provides a lightweight foundation for REST API development.

### Consequences

The backend must enforce clear separation between:

- HTTP controllers.
- Business services.
- Data-access logic.
- Query-engine logic.
- Background processes.

Framework-specific implementation details may evolve without changing the overall architectural direction.

---

## ADR-004: REST API Communication

**Status:** Accepted

### Context

The React frontend needs a predictable interface for communicating with the backend.

### Decision

Use REST APIs with JSON request and response bodies.

The API will initially use:

`/api/v1`

### Alternatives Considered

1. REST.
2. GraphQL.
3. Direct database communication from the frontend.
4. A custom communication protocol.

### Rationale

REST provides a straightforward interface for the initial product scope.

It also keeps database access and security enforcement on the backend.

### Consequences

- API contracts must be documented.
- Request validation must occur on the backend.
- Authorization must be checked for protected resources.
- API errors must follow the standardized response structure.
- HTTPS must be used in deployed environments.

The frontend must never connect directly to the application database or user databases.

---

# 3. Database Decisions

## ADR-005: MySQL 8.x as the Primary DBMS

**Status:** Accepted

### Context

Queralyth is designed around MySQL query analysis and optimization.

Supporting multiple database systems would significantly expand the parser, execution, metadata, and plan-interpretation requirements.

### Decision

MySQL 8.x is the only supported DBMS for the initial product lifecycle.

This applies to:

- Queralyth's application database.
- User-supplied external database connections.
- Query execution.
- EXPLAIN plan interpretation.

### Alternatives Considered

1. MySQL only.
2. MySQL and PostgreSQL simultaneously.
3. A database-agnostic architecture from the beginning.

### Rationale

A focused DBMS scope allows deeper MySQL-specific functionality and reduces initial engineering complexity.

### Consequences

- SQL support is MySQL-focused.
- MySQL-specific EXPLAIN behavior is expected.
- Application database features must remain compatible with the selected MySQL 8.x version.
- Other DBMS support is deferred.

---

## ADR-006: Separate Application and External Database Connections

**Status:** Accepted

### Context

Queralyth stores its own accounts, connections, sessions, and query history while also connecting to user-supplied databases.

Mixing these responsibilities would create unnecessary security and resource-management risks.

### Decision

Maintain separate database connection responsibilities:

1. Application database pool.
2. External MySQL connection pools.

### Rationale

This separation supports:

- Independent connection management.
- Better resource isolation.
- Clearer failure handling.
- Easier monitoring.
- Stronger security boundaries.

### Consequences

Application database failures and external database failures must be handled separately.

External database credentials must never be used to access Queralyth's own application data.

---

## ADR-007: InnoDB as the Application Storage Engine

**Status:** Accepted

### Context

Queralyth requires transactions, foreign keys, row-level locking, and reliable state transitions.

### Decision

Use InnoDB for application tables.

### Alternatives Considered

Other MySQL storage engines.

### Rationale

InnoDB supports the transactional and relational behavior required by the application.

### Consequences

Transaction boundaries, isolation behavior, row locks, deadlocks, and foreign-key constraints must be considered during implementation.

---

## ADR-008: Server-Managed Sessions Instead of JWT-Based Authentication

**Status:** Accepted

### Context

Queralyth requires individual accounts, session revocation, account suspension, and password-change invalidation.

### Decision

Use server-managed sessions with secure cookies.

The browser receives an opaque random session token. The application database stores its SHA-256 digest rather than the raw token.

### Alternatives Considered

1. Server-managed sessions.
2. JWT authentication with browser storage.
3. Long-lived access tokens with refresh tokens.

### Rationale

Server-managed sessions provide straightforward centralized revocation and account-state enforcement.

### Consequences

- Session records are stored in MySQL.
- Cookies use appropriate HttpOnly, Secure, and SameSite settings.
- CSRF protection is required.
- Session expiration is enforced by the backend.
- Password changes and account suspension revoke relevant sessions.

Initial session limits:

- Idle expiration: 7 days.
- Absolute expiration: 30 days.

---

## ADR-009: Argon2id for Password Hashing

**Status:** Accepted

### Context

User passwords must be stored in a form that does not permit recovery of the original password.

### Decision

Use Argon2id for password hashing.

### Alternatives Considered

1. Argon2id.
2. bcrypt.
3. scrypt.
4. PBKDF2.

### Rationale

Argon2id is a modern password-hashing choice designed to resist brute-force attacks.

### Consequences

Password-hashing parameters must be configured using current security guidance and tested against available server resources.

Passwords must never be stored in plaintext or reversible encrypted form.

---

## ADR-010: AES-256-GCM for External Database Credential Encryption

**Status:** Accepted

### Context

Queralyth needs to persist external database credentials for saved connections.

Plaintext credential storage is unacceptable.

### Decision

Use AES-256-GCM authenticated encryption.

Store:

- Ciphertext.
- Unique nonce.
- Authentication tag.
- Encryption key-version identifier.

Keep encryption keys separate from the application database.

### Alternatives Considered

1. Plaintext credential storage.
2. Reversible encryption without authentication.
3. AES-256-GCM with separately protected keys.
4. External managed key-management service.

### Rationale

AES-256-GCM provides confidentiality and integrity verification.

The initial design can work with protected hosting environment secrets without requiring a paid KMS.

### Consequences

- Encryption and decryption happen only on the backend.
- Encryption keys must not be committed to Git.
- Key rotation must be supported.
- Key backup and recovery procedures are necessary.
- Loss of the required encryption key can make stored credentials unrecoverable.
- A dedicated KMS may be considered in a future production architecture.

---

## ADR-011: Application-Level Query History Retention

**Status:** Accepted

### Context

Users need to review previous query execution attempts.

However, SQL statements may contain sensitive values, and indefinite retention creates unnecessary privacy risks.

### Decision

Store actual query execution attempts in query history by default.

Default retention:

**90 days from execution start.**

Users may disable future history recording through an account-level preference.

### Alternatives Considered

1. No query history.
2. Permanent history.
3. Time-limited history with user opt-out.
4. Store only query metadata without SQL.

### Rationale

Time-limited history provides useful functionality while establishing a defined retention period.

### Consequences

- Original SQL is stored for recorded execution attempts.
- Analysis-only submissions are excluded.
- Successful, failed, and confirmed-cancelled execution attempts are recorded.
- Existing records remain when the user disables future recording.
- Re-enabling history resumes future recording.
- Backup expiration is handled separately.
- Users must be informed that SQL statements may contain sensitive literal values.

---

## ADR-012: Separate Execution Requests from Query History

**Status:** Accepted

### Context

Query history is optional, but execution idempotency and recovery must remain reliable even when users disable history recording.

### Decision

Maintain a separate `execution_requests` registry.

### Rationale

Execution lifecycle management is a reliability requirement, not merely a history feature.

### Consequences

- Execution requests are stored independently of query history.
- UUID-based idempotency is enforced per user.
- Active and unresolved requests remain available for recovery.
- Terminal requests are retained for 24 hours.
- Query-history opt-out does not disable execution recovery.

---

# 4. Query Engine Decisions

## ADR-013: SQL Parsing Before Validation and Execution

**Status:** Accepted

### Context

Simple string matching is insufficient for reliably understanding SQL structure or enforcing supported statement rules.

### Decision

Use a SQL parser that produces an abstract syntax tree (AST).

The query-engine pipeline will distinguish:

1. Parsing.
2. Validation.
3. Logical representation.
4. Plan retrieval.
5. Plan interpretation.
6. Execution where permitted.

### Rationale

An AST provides structural information that supports safer validation and meaningful query analysis.

### Consequences

- The parser must support the required MySQL syntax.
- Unsupported syntax must fail safely.
- The frontend cannot determine execution permission.
- Parser selection requires a technical evaluation.

The exact parser library remains undecided.

---

## ADR-014: SELECT-Focused MVP with Strict Backend Safeguards

**Status:** Accepted

### Context

Executing arbitrary user SQL creates significant security and data-integrity risks.

### Decision

The MVP uses a SELECT-focused execution policy with strict backend validation.

A SELECT statement is not automatically considered safe.

The backend must use:

- AST-based allowlisting.
- Rejection of multiple statements.
- Rejection of prohibited clauses and constructs.
- Least-privilege external MySQL accounts.
- Execution timeouts.
- Result limits.
- Concurrency controls.
- Cancellation and recovery handling.
- External destination restrictions.

### Alternatives Considered

1. Arbitrary SQL execution.
2. Frontend-only restrictions.
3. Backend AST validation and restricted execution.

### Rationale

A constrained execution model is more appropriate for an initial product that connects to user-supplied databases.

### Consequences

Unsupported SQL must be rejected consistently, regardless of whether the request originates from the UI or a direct API call.

---

## ADR-015: Logical Operator Tree in the MVP

**Status:** Accepted

### Context

Queralyth aims to help users understand query structure rather than merely display raw SQL.

### Decision

Provide a basic logical operator tree in the MVP.

### Rationale

A logical representation supports educational understanding and provides a foundation for future optimization analysis.

### Consequences

The initial tree should cover supported operations such as:

- Table scans.
- Filters.
- Projections.
- Joins.
- Aggregations.
- Sorting.
- Limits.

Formal relational algebra and interactive logical transformations are deferred.

---

## ADR-016: MySQL EXPLAIN as the Initial Execution-Plan Source

**Status:** Accepted

### Context

Queralyth must explain how MySQL intends to execute a query.

### Decision

Use MySQL EXPLAIN for estimated execution plans in the MVP.

EXPLAIN ANALYZE and detailed actual runtime investigation are deferred.

### Rationale

EXPLAIN provides optimizer estimates without requiring the additional execution and measurement workflow associated with actual runtime analysis.

### Consequences

- Plan fields must be interpreted according to MySQL behavior.
- Estimated rows must not be presented as actual returned rows.
- Cost and cardinality estimates must be explained carefully.
- The product must distinguish estimated plans from measured execution behavior.

---

## ADR-017: Minimum Schema Metadata for MVP Optimization

**Status:** Accepted

### Context

Basic recommendations require information about tables, columns, and indexes.

A full schema-intelligence subsystem would increase initial scope.

### Decision

Retrieve and use only the minimum metadata required for basic optimization analysis.

### Rationale

This supports useful recommendations without requiring a complete schema-management product.

### Consequences

Full Schema Intelligence UI, advanced schema exploration, and broader metadata analysis are deferred.

Recommendations must clearly identify when insufficient metadata limits their reliability.

---

# 5. Execution and Concurrency Decisions

## ADR-018: UUID-Based Execution Idempotency

**Status:** Accepted

### Context

Network interruptions and duplicate submissions can result in repeated execution requests.

### Decision

Every execution request receives a UUID.

The backend enforces uniqueness using:

`(user_id, execution_request_id)`

### Rationale

A repeated request with the same UUID must not start a second execution.

### Consequences

- Duplicate requests return the existing request state.
- Intentional reruns receive new UUIDs.
- Execution status retrieval uses the original UUID.
- Idempotency remains active even when query history is disabled.

---

## ADR-019: Controlled Execution Concurrency

**Status:** Accepted

### Context

Unrestricted simultaneous external queries could exhaust application resources or overwhelm connected databases.

### Decision

Initial limits:

- Maximum 3 active executions per user.
- Maximum 2 active executions per saved connection.
- Global execution limit configurable according to deployment capacity.

### Rationale

Controlled concurrency protects both Queralyth and external database resources.

### Consequences

Concurrency enforcement must be atomic.

The backend uses a short transaction to register execution claims and enforce user and connection limits.

Execution itself happens outside that transaction.

---

## ADR-020: Recovery-Required State for Uncertain Execution Outcomes

**Status:** Accepted

### Context

A network failure or backend restart may occur while an external query is still executing.

The backend cannot safely assume that the query stopped.

### Decision

Use a dedicated `recovery_required` execution state.

### Rationale

An uncertain execution must remain distinguishable from a confirmed success, failure, or cancellation.

### Consequences

- Expired worker leases do not prove external termination.
- Unresolved requests remain active for concurrency accounting.
- The backend must reconcile the outcome.
- No automatic replay is allowed.
- Cancellation is recorded only after termination is confirmed.

---

## ADR-021: Short Application Transactions Around External Execution

**Status:** Accepted

### Context

External query execution may take significantly longer than an ordinary application database operation.

Holding application database locks throughout execution would create unnecessary contention.

### Decision

Use short application database transactions for:

- Execution claiming.
- Initial history creation.
- State transitions.
- Final result persistence.
- Recovery coordination.

Run external query execution outside application database transactions.

### Rationale

This minimizes lock duration and prevents long-running external queries from unnecessarily blocking application data operations.

### Consequences

Execution state must be persisted before external execution begins and reconciled afterward.

---

# 6. Infrastructure and Deployment Decisions

## ADR-022: Zero-Cost Initial Hosting Strategy

**Status:** Accepted

### Context

Queralyth is being developed under a strict initial hosting budget.

### Decision

Target an initial hosting cost of:

**$0 per month.**

A cost of approximately $1 per month may be considered if genuinely necessary and explicitly evaluated.

### Alternatives Considered

1. Paid infrastructure from the beginning.
2. Strict free-tier deployment.
3. Local-only development until a suitable hosting option is available.

### Rationale

The project should prioritize functionality and architectural correctness without creating unnecessary financial obligations.

### Consequences

- Local development and testing come first.
- Deployment remains provider-independent.
- Free-tier limitations must be evaluated honestly.
- No promise of reliable always-on production operation at zero cost.
- Provider-specific choices are deferred until deployment evaluation.

---

## ADR-023: Provider-Independent Deployment Architecture

**Status:** Accepted

### Context

Choosing a hosting provider too early may introduce avoidable infrastructure constraints or costs.

### Decision

Keep the architecture portable.

The frontend, backend, and application database must have clear deployment boundaries.

### Rationale

Provider independence allows the project to evaluate hosting options based on actual requirements.

### Consequences

The implementation must avoid unnecessary dependence on proprietary hosting features.

Provider-specific deployment decisions will be recorded separately when a provider is selected.

---

## ADR-024: Version-Controlled Database Migrations

**Status:** Accepted

### Context

The application database schema will evolve throughout development.

Manual schema changes are difficult to reproduce and audit.

### Decision

Use ordered, version-controlled SQL migrations.

### Rationale

Migrations provide reproducible database changes and make deployment safer.

### Consequences

- Each migration receives a unique sequential identifier.
- Applied migrations remain immutable.
- Migration history is tracked.
- Fresh installations must be tested.
- Risky migrations require appropriate backups.
- Rollback or forward-fix behavior must be documented.

The exact migration tooling remains open for implementation evaluation.

---


# 7. Audit-approved technical decisions

## ADR-025: Centrally Managed Read-Only Built-in Sample Database

**Status:** Accepted

### Context

The MVP must let users explore Queralyth without configuring an external database, while preserving the zero-cost hosting target and protecting application data.

### Decision

Provide one centrally managed synthetic MySQL 8.x sample schema, logically separate from the application schema, accessed through a dedicated backend-managed connection pool and a database account with read-only privileges limited to the sample schema. The sample schema may share the physical MySQL server only when distinct schemas and grants are enforceable. It is not a user-saved connection. Writable per-user copies and isolated experiment databases are post-MVP.

### Consequences

The backend owns sample connection configuration and credentials. The frontend selects a built-in target identifier and cannot supply connection details. If the host cannot enforce schema/user separation, the sample target must not be exposed.

## ADR-026: Bounded Result Window with Frontend Pagination

**Status:** Accepted

### Context

The PRD requires controlled handling of large result sets, but the MVP should avoid persistent result storage and long-lived database cursors.

### Decision

The backend returns a bounded result window, enforcing both maximum row count and maximum serialized response size. The frontend paginates only the returned window. The API reports `returnedRows`, `truncated`, and `truncationReason` (`row_limit` or `response_size_limit`). No expensive total count, cursor held across requests, or query re-execution on page changes is required.

## ADR-027: Deterministic Rule-Based Query Explanation Generator

**Status:** Accepted

### Context

MVP requirements call for understandable explanations of supported query components, while AI-assisted explanations are deferred.

### Decision

Generate explanations from supported AST/logical representation using deterministic rules and predefined templates. Explanations must be grounded in available structures and must not invent semantics or performance conclusions. Add a frontend explanation panel. AI-assisted explanations remain post-MVP.

## ADR-028: BIGINT UNSIGNED Connection Configuration Version

**Status:** Accepted

### Context

The ER diagram and detailed connection schema used inconsistent SQL types for `config_version`.

### Decision

Use `BIGINT UNSIGNED NOT NULL DEFAULT 1` consistently. Increment on every connection configuration or credential change. Never wrap or reset on overflow; fail safely and require operator intervention.

## ADR-029: Execution-Request Retention Exception for Permanent Account Deletion

**Status:** Accepted

### Context

Execution requests are normally retained for 24 hours after terminal completion, but unresolved requests must survive account-deletion attempts until their outcome is known.

### Decision

Block permanent account deletion while any request is claimed, running, or recovery_required. Once all requests are confirmed terminal, permanent deletion may cascade-delete the user's execution-request rows using `ON DELETE CASCADE`. Normal 24-hour retention is overridden by permanent account deletion. Backup retention remains separate.

## ADR-030: Basic SQL Syntax Highlighting in the MVP

**Status:** Accepted

### Context

The MVP requires a usable SQL editor with basic syntax highlighting.

### Decision

Provide basic frontend syntax highlighting in the SQL Workspace. It is presentation-only, preserves the exact SQL text, and is not a parser, validator, sanitizer, or security boundary. Select the editor library during frontend prototyping.

## ADR-031: Explicit Asynchronous Execution API Contract

**Status:** Accepted

### Context

The execution API needs an unambiguous contract for acceptance, idempotent replay, status polling, cancellation acknowledgement, and rejected requests.

### Decision

Newly accepted executions return 202 with request ID, `claimed` state, status/cancel URLs, and `replayed: false`. Duplicate UUIDs scoped to a user return the existing request without re-execution or request mutation (202 while active, 200 when terminal, `replayed: true`). Status polling returns durable state and bounded result data only when available. Cancellation returns 202 while termination is pending and never marks `cancelled` before confirmed termination. Validation, authorization, concurrency, and unavailable-service errors use distinct standard HTTP statuses and error codes.

## ADR-032: Temporary Process-Local Cache for Bounded Query Results

**Status:** Accepted

### Context

The asynchronous API must return bounded query results after execution completes, but complete result datasets must not be persisted in application tables or backups.

### Decision

Keep the bounded result window in a backend-managed process-local in-memory cache, keyed by authenticated user ID and execution-request ID, with a 15-minute default TTL and enforced per-entry and total-memory limits. Cache contents are ephemeral and are not the source of execution truth. On expiry, eviction, or restart, polling returns the durable execution outcome with `resultAvailable: false` and an explicit reason. A non-sensitive process cache-generation identifier distinguishes restart; bounded in-memory tombstones distinguish expiry and eviction, with generic `unavailable` when the reason cannot be established. SQL is never re-executed automatically. The MVP assumes one backend instance. Before horizontal scaling, introduce a shared ephemeral store or validated request-affinity strategy.

### Consequences

A successful execution may remain successful even when its result window is unavailable. Result availability and execution status are separate. Cache ownership checks are mandatory.

---

# 8. Deferred Technical Decisions

The following items have intentionally not been finalized.

They must be resolved through implementation research, prototypes, compatibility tests, or deployment evaluation.

| ID | Decision area | Current position | When to resolve |
|---|---|---|---|
| TDR-D01 | SQL parser library | No library selected | Before query-engine implementation |
| TDR-D02 | MySQL Node.js driver | Must support required execution and cancellation behavior | Before external execution implementation |
| TDR-D03 | React Flow | Tentative plan visualization choice | During plan visualization prototype |
| TDR-D04 | Recharts | Tentative metrics visualization choice | During metrics implementation |
| TDR-D05 | Email delivery provider | Not selected | Before email verification deployment |
| TDR-D06 | Session storage implementation | MySQL-backed session records selected; library details open | During authentication implementation |
| TDR-D07 | Migration tooling | Versioned SQL migrations selected; tool open | Before database implementation |
| TDR-D08 | Physical schema details | Logical schema established; certain implementation details remain | During migration design |
| TDR-D09 | Global execution limit | Configurable; initial numeric value open | During deployment/load testing |
| TDR-D10 | External execution timeout | Required; exact threshold open | During execution prototype |
| TDR-D11 | Result-size and row limits | Required; exact thresholds open | During execution prototype |
| TDR-D12 | Hosting provider | Provider-independent | Before first hosted deployment |
| TDR-D13 | Domain and subdomain | Free or zero-cost option preferred | During deployment |
| TDR-D14 | Production backup recovery targets | RPO/RTO not finalized | Before production operation |
| TDR-D15 | Dedicated key-management service | Protected environment secret initially; KMS deferred | If production requirements justify it |
| TDR-D16 | Connection-name normalization | Case-insensitive uniqueness required; physical implementation open | During schema implementation |
| TDR-D18 | Exact API error registry | Standard error contract established; complete code registry to maintain during implementation | During API implementation |

### 8.1 Rules for Resolving Deferred Decisions

Every deferred decision must:

1. Have a clear owner or implementation stage.
2. Be evaluated against existing requirements.
3. Consider security and operational consequences.
4. Avoid unnecessary financial commitments.
5. Be recorded when finalized.
6. Update related design documents where necessary.

A deferred decision must not silently become an implementation assumption.

---

# 9. Technical Decisions That Must Not Be Reversed Accidentally

The following decisions are especially important to Queralyth's current identity and architecture:

1. React with JavaScript, not TypeScript.
2. MySQL 8.x as the sole supported DBMS for the initial lifecycle.
3. Modular monolith rather than premature microservices.
4. Backend-controlled database access.
5. Server-managed sessions with secure cookies.
6. Argon2id password hashing.
7. AES-256-GCM encryption for persisted external credentials.
8. Strict backend SQL validation and execution safeguards.
9. Query history records actual execution attempts only.
10. Analysis-only submissions do not enter query history.
11. Execution requests remain separate from optional query history.
12. UUID-based execution idempotency.
13. Uncertain execution outcomes require reconciliation.
14. Query-history default retention is 90 days.
15. Initial hosting target is $0 per month.
16. Logical operator tree and MySQL EXPLAIN estimates are part of the MVP.
17. Advanced interactive optimization and EXPLAIN ANALYZE are deferred.
18. The built-in sample database is centrally managed and read-only; writable isolated experiments are post-MVP.
19. Query results are bounded and temporarily cached; result availability is separate from execution status.
20. The asynchronous execution API uses UUID idempotency, status polling, and confirmed cancellation.

Changes to these decisions require an explicit review of their consequences.

---

# 10. Decision Review and Change Process

### 10.1 When a Decision Needs Review

Review a decision when:

- Implementation evidence contradicts its assumptions.
- A security issue is discovered.
- A performance bottleneck requires architectural change.
- A dependency becomes unsuitable.
- Hosting constraints make the approach impractical.
- Product scope changes.
- A new requirement cannot be met with the existing design.

### 10.2 Review Procedure

1. Identify the existing decision.
2. Describe the problem or new evidence.
3. Evaluate alternatives.
4. Explain technical and financial consequences.
5. Select the preferred approach.
6. Record the new decision.
7. Update affected system-design documents.
8. Update implementation and tests where necessary.

### 10.3 Superseded Decisions

A replaced decision must not simply disappear.

Its record should remain available with:

- Superseded status.
- Replacement decision reference.
- Reason for replacement.
- Date of the change.

This preserves the project's architectural history.

---

# 11. Related Documents

- `01-System-Architecture.md`
- `02-Component-Design.md`
- `03-Database-Design.md`
- `04-API-Design.md`
- `05-Authentication-and-Security.md`
- `06-Query-Execution-Engine.md`
- `07-Concurrency-and-Transactions.md`
- `08-Performance-and-Scalability.md`
- `09-Deployment-and-Infrastructure.md`
- `10-Error-Handling-and-Recovery.md`
- `11-Testing-and-Quality-Strategy.md`

---

# 12. Final Statement

These technical decision records establish the current architectural baseline for Queralyth.

They distinguish established project decisions from implementation details that still require evidence.

The purpose is not to freeze the architecture permanently. It is to ensure that changes are deliberate, justified, documented, and consistent with the product's goals.

**Queralyth's architecture should evolve through validated engineering decisions, not accidental complexity.**