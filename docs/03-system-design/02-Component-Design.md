# Queralyth — Component Design

**Document:** Component Design  
**Project:** Queralyth  
**Version:** 1.0  
**Status:** Initial design baseline  
**Category:** Software Design Document (SDD)

---

## 1. Introduction

### 1.1 Purpose

This document defines the logical components of Queralyth and establishes their responsibilities, boundaries, and interactions.

It translates the high-level architecture into a more detailed component-level design.

### 1.2 Design Principles

The component architecture follows these principles:

1. Single responsibility: each component has a clearly defined primary responsibility.
2. Separation of concerns: presentation, business logic, database access, and query processing remain separate.
3. Controlled dependencies: components interact through defined interfaces.
4. Security by design: sensitive operations remain under backend control.
5. Reusability: shared functionality should not be unnecessarily duplicated.
6. Testability: components should be independently testable where practical.
7. Maintainability: avoid unnecessary abstraction and premature complexity.

---

## 2. Component Overview

Queralyth consists of three major logical areas:

1. Frontend components.
2. Backend components.
3. Query-engine components.

The application database and external MySQL databases are supporting data systems rather than application components.

---

## 3. Frontend Components

**Technology:** React with JavaScript (JSX).

The frontend is responsible for user interaction, presentation, and communicating with the backend.

### 3.1 Authentication Interface

Responsibilities:

- Registration interface.
- Login and logout interface.
- Email verification interface.
- Password-change interface.
- Session-related feedback.
- Account status messages.

The frontend does not independently authenticate users or determine authorization.

### 3.2 Account Management Interface

Responsibilities:

- Display account information.
- Update supported account settings.
- Manage query-history preferences.
- Initiate supported account-management workflows.
- Present account deletion and recovery interfaces where applicable.

### 3.3 Database Connection Manager

Responsibilities:

- Display saved database connections.
- Create and edit connection configurations.
- Initiate connection tests.
- Display connection-test status.
- Delete saved connections.
- Display configuration-version conflicts.

Passwords must never be returned to the frontend.

### 3.4 SQL Workspace

Responsibilities:

- Provide the SQL editor.
- Accept SQL submissions.
- Display analysis and validation feedback.
- Present logical operator-tree information.
- Initiate supported query executions.
- Display execution progress and final status.

The frontend may provide basic input validation for usability, but the backend remains authoritative.

### 3.5 Execution-Plan Visualization

Responsibilities:

- Display MySQL execution-plan information.
- Present supported plan operators and relationships.
- Communicate estimated execution information clearly.
- Distinguish estimates from actual runtime measurements.

The initial MVP focuses on basic execution-plan visualization.

Advanced interactive plan exploration is outside the initial MVP scope.

### 3.6 Query Results Interface

Responsibilities:

- Display returned query data.
- Present execution status.
- Display execution timing and available row statistics.
- Handle loading, failure, and cancellation states.
- Provide suitable feedback when results cannot be retrieved.

### 3.7 Query History Interface

Responsibilities:

- Display recorded execution attempts.
- Support newest-first ordering.
- Support cursor-based pagination.
- Filter by execution status and connection.
- Search SQL statements by substring.
- Delete individual history records.

Analysis-only submissions do not appear in execution history.

### 3.8 Optimization and Recommendation Interface

Responsibilities:

- Present supported optimization recommendations.
- Display the reasoning behind recommendations.
- Show relevant execution-plan evidence.
- Distinguish recommendations from guaranteed performance improvements.

Advanced optimization experimentation and benchmarking are future enhancements.

### 3.9 Shared Frontend Infrastructure

Shared responsibilities include:

- REST API communication.
- Session-state handling.
- Error presentation.
- Reusable UI components.
- Form validation.
- Loading and empty states.
- Protected-route presentation.

Frontend route protection is a usability mechanism, not a replacement for backend authorization.

---

## 4. Backend Components

**Technology:** Node.js and Express.

The backend will be organized into functional modules within one modular monolithic application.

### 4.1 API Layer

Responsibilities:

- Define REST API routes.
- Parse incoming requests.
- Apply request-level validation.
- Invoke appropriate backend services.
- Format consistent responses.
- Apply relevant middleware.

The API layer should not contain large amounts of business logic.

### 4.2 Authentication Module

Responsibilities:

- Registration.
- Login and logout.
- Password verification.
- Argon2id password hashing.
- Session creation and validation.
- Session revocation.
- Password-change workflows.
- Authentication-related rate limiting.

### 4.3 Account Management Module

Responsibilities:

- Account information management.
- Email verification.
- Email-change workflows.
- Account status management.
- Account deletion initiation and recovery.
- Query-history preference management.

### 4.4 Authorization Module

Responsibilities:

- Validate authenticated user identity.
- Enforce resource ownership.
- Check account status.
- Enforce role-based access.
- Protect administrator-only operations.
- Apply authorization rules consistently across API endpoints.

The backend must never trust frontend-supplied ownership identifiers without verification.

### 4.5 Database Connection Management Module

Responsibilities:

- Create saved connection configurations.
- Retrieve user-owned connections.
- Update connection configurations.
- Manage configuration versions.
- Encrypt and decrypt saved credentials.
- Test external database connectivity.
- Delete connection configurations.
- Coordinate connection ownership and access.

The module must enforce destination restrictions to mitigate SSRF and other unauthorized network access.

### 4.6 Query Execution Coordinator

Responsibilities:

- Receive validated execution requests.
- Verify connection ownership.
- Coordinate execution-request idempotency.
- Enforce concurrency limits.
- Acquire the required external connection and credentials.
- Coordinate query execution.
- Track execution lifecycle states.
- Handle cancellation requests.
- Coordinate recovery of uncertain executions.
- Update query history when history recording is enabled.

Actual SQL execution must not occur inside a long-running application-database transaction.

### 4.7 Query History Module

Responsibilities:

- Record actual query execution attempts.
- Maintain execution status and timing.
- Store sanitized error information.
- Retrieve user-specific history.
- Implement cursor-based pagination.
- Support filtering and substring search.
- Delete individual history records.
- Enforce user ownership.
- Apply the 90-day retention policy.

Analysis-only submissions are excluded from query history.

### 4.8 Execution Request Module

Responsibilities:

- Register execution-request UUIDs.
- Prevent duplicate execution attempts.
- Return existing execution state for duplicate requests.
- Maintain execution lifecycle state.
- Manage heartbeat and lease information.
- Coordinate cancellation and recovery.
- Preserve idempotency records independently of query-history preferences.

Terminal execution requests have a 24-hour initial retention period. Active or unresolved records remain until safely resolved.

### 4.9 Query Engine Integration Module

Responsibilities:

- Coordinate interactions with the query-engine package.
- Provide parsed SQL information to relevant backend workflows.
- Receive logical representations.
- Support execution-plan interpretation.
- Provide analysis results to the application layer.

The integration module coordinates query-engine functionality but does not replace its internal processing logic.

### 4.10 Administrator Module

Responsibilities:

- Support authorized administrative operations.
- Manage supported account-status actions.
- Manage permitted role changes.
- Enforce administrator authorization.
- Coordinate account-status history.
- Generate administrator audit records.
- Prevent removal of the last active administrator.

Administrative actions and corresponding audit records must be handled transactionally.

### 4.11 Notification Module

Responsibilities:

- Send registration verification emails.
- Send email-change verification emails.
- Send password-change security notifications.
- Send security-related account notifications where required.

External email delivery must occur outside database transactions.

Failed email delivery must not silently invalidate an otherwise committed account workflow.

### 4.12 Application Database Access Layer

Responsibilities:

- Manage application database access.
- Execute parameterized queries.
- Manage database transactions.
- Apply consistent error handling.
- Support repository-level data access.
- Coordinate connection-pool usage.

The application database pool must remain separate from external query-execution connections.

### 4.13 Background Job and Maintenance Module

Responsibilities include:

- Expired session cleanup.
- Verification-token cleanup.
- Query-history retention cleanup.
- Terminal execution-request cleanup.
- Scheduled backup coordination where supported.
- Maintenance tasks and controlled retries.
- Operational cleanup logging.

Cleanup operations must use bounded batches and must not remove active or unresolved execution records.

---

## 5. Query Engine Components

The query engine is a separate logical package maintained within the project.

Its internal implementation will be specified in greater detail in `06-Query-Execution-Engine.md`.

### 5.1 SQL Parsing Component

Responsibilities:

- Parse supported MySQL SQL statements.
- Produce a structured representation.
- Identify relevant SQL statement characteristics.
- Report parsing errors.

### 5.2 SQL Validation Support

Responsibilities:

- Support identification of permitted statement structures.
- Identify unsupported or prohibited constructs.
- Provide structural information required by backend validation.

The backend remains responsible for enforcing execution permissions and security restrictions.

### 5.3 Logical Representation Component

Responsibilities:

- Convert supported SQL structures into a logical representation.
- Generate a basic logical operator tree for the MVP.
- Provide structured output for frontend visualization.

Formal relational algebra transformations are outside the initial MVP scope.

### 5.4 Execution-Plan Interpretation Component

Responsibilities:

- Interpret supported MySQL EXPLAIN output.
- Extract relevant execution-plan information.
- Identify operators and relationships.
- Provide structured plan information.
- Support contextual optimization analysis.

The MVP focuses on estimated MySQL execution plans.

### 5.5 Optimization Analysis Component

Responsibilities:

- Analyze available SQL and execution-plan information.
- Identify potential performance concerns.
- Generate evidence-based optimization guidance.
- Communicate limitations and uncertainty.

The component must not guarantee that a recommendation will improve performance.

---

## 6. Application Database Components

The application database is accessed through the backend data-access layer.

Its logical tables are:

1. `users`
2. `sessions`
3. `connections`
4. `query_history`
5. `email_verification_tokens`
6. `account_status_history`
7. `admin_audit_logs`
8. `execution_requests`

Detailed schemas, relationships, constraints, and indexes belong in `03-Database-Design.md`.

---

## 7. Component Interaction Rules

The following interaction rules apply throughout the application:

1. Frontend components communicate with backend components through REST APIs.
2. Frontend components never access either application or external databases directly.
3. Authentication and authorization are enforced by the backend.
4. Database credentials are decrypted only within authorized backend workflows.
5. The query execution coordinator manages external query execution.
6. The query engine performs supported SQL analysis and execution-plan interpretation.
7. Query history and execution-request tracking remain logically separate.
8. Application database transactions remain short.
9. External network calls and query execution must not occur while holding unnecessary application database locks.
10. Administrator operations use dedicated authorization and audit workflows.

---

## 8. Error and Result Ownership

Each component is responsible for handling errors within its own boundaries and returning meaningful information to its caller.

Examples:

| Component | Responsibility |
|---|---|
| Authentication | Authentication and session errors |
| Connection management | Invalid configuration and connection-test failures |
| Query engine | Parsing and analysis errors |
| Query execution coordinator | Execution lifecycle and cancellation errors |
| Query history | History retrieval and persistence errors |
| Authorization | Ownership and permission failures |
| Database access | Database connectivity and transaction errors |

Sensitive implementation details, credentials, and internal infrastructure information must not be exposed through frontend-facing error responses.

---

## 9. Component Testing Boundaries

Each component should be testable at an appropriate level.

- Frontend components: UI and interaction tests.
- Backend services: unit tests.
- API layer: integration tests.
- Database access: repository and transaction tests.
- Query engine: parser and analysis tests.
- Query execution coordinator: lifecycle, concurrency, and recovery tests.
- Authentication and authorization: security-focused tests.

The complete testing strategy will be documented in `11-Testing-and-Quality-Strategy.md`.

---

## 10. Scope and Future Evolution

The component structure describes the logical design of the initial MVP.

It does not require every component to be implemented as an independent package or deployment unit.

Internal module boundaries may be refined during implementation as long as the established architectural responsibilities and security boundaries remain intact.

Future features may introduce additional components, but new abstractions must be justified by actual product or technical requirements.

---

## 11. Related Documents

- `01-System-Architecture.md`
- `03-Database-Design.md`
- `04-API-Design.md`
- `05-Authentication-and-Security.md`
- `06-Query-Execution-Engine.md`
- `07-Concurrency-and-Transactions.md`
- `08-Performance-and-Scalability.md`
- `09-Deployment-and-Infrastructure.md`
- `10-Error-Handling-and-Recovery.md`
- `11-Testing-and-Quality-Strategy.md`
- `12-Technical-Decision-Records.md`

---

## 12. Document Maintenance

This document defines logical component responsibilities and interaction boundaries.

Implementation-level refinements must remain consistent with the approved system architecture and detailed design specifications.

## Audit-approved component clarifications

### SQL Workspace syntax highlighting

The SQL Workspace provides basic SQL syntax highlighting as a presentation/usability responsibility. Highlighting must preserve the exact SQL text submitted by the user. It is not validation, parsing, sanitization, or a security boundary; the backend parser and allowlist remain authoritative. The specific editor library is selected during frontend prototyping.

### Query Explanation Generator

Add a deterministic Query Explanation Generator to the query-engine component group. It consumes the supported parsed SQL representation and logical operator tree and produces explanations using predefined rules/templates. It explains only supported components and known relationships, identifies when a component cannot be explained, and does not fabricate optimizer behavior or performance claims. AI-generated explanations are deferred. The frontend SQL Workspace/Query Understanding presentation includes an explanation panel alongside the logical representation.

### Built-in sample database target

The Database Connection Manager/SQL Workspace exposes the built-in sample source as a distinct system-provided target, not as a user-owned saved connection. The backend Query Execution Coordinator routes it to a dedicated sample connection pool configured by deployment. That pool uses a distinct MySQL account with read-only privileges limited to the sample schema.

### Bounded result presentation

The Query Results Interface paginates the bounded result rows returned by the backend and displays truncation metadata. Page changes are client-side over the returned window and do not cause query re-execution. The backend owns row and serialized-response-size limits.

