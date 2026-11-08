# Queralyth — Performance and Scalability

**Document:** Performance and Scalability  
**Project:** Queralyth  
**Version:** 1.0  
**Status:** Consolidated design baseline  
**Application Database:** MySQL 8.x  
**Backend:** Node.js + Express  
**Initial Hosting Budget:** $0/month

---

## 1. Introduction

### 1.1 Purpose

This document defines the performance, resource-management, monitoring, and scalability strategy for Queralyth.

It establishes how the application manages database connections, query execution capacity, data retrieval, indexing, operational monitoring, backups, and infrastructure limitations.

### 1.2 Objectives

The primary objectives are:

1. Maintain predictable application performance.
2. Prevent uncontrolled resource consumption.
3. Isolate application database activity from external query execution.
4. Support efficient query-history retrieval.
5. Establish measurable performance baselines.
6. Detect resource exhaustion and database failures.
7. Preserve data integrity as the application grows.
8. Keep the initial architecture compatible with a strict zero-cost hosting strategy.

### 1.3 Design Philosophy

Queralyth will initially use a resource-conscious modular monolith.

It will prioritize:

- Efficient database access.
- Bounded concurrency.
- Short transactions.
- Indexed queries.
- Controlled result sizes.
- Lightweight monitoring.
- Measured optimization.
- Infrastructure portability.

Premature microservices, distributed caching, and complex infrastructure are outside the initial MVP requirements.

---

## 2. Performance Architecture

### 2.1 Resource Separation

Queralyth uses separate database connection pools for:

1. The application database.
2. External MySQL databases connected by users.

These pools must remain independent.

External database activity must not consume the application database pool.

### 2.2 Application Database Responsibilities

The application database stores:

- User accounts.
- Sessions.
- Saved connections.
- Query history.
- Email verification tokens.
- Account status history.
- Administrative audit logs.
- Execution requests.

Application database operations should remain short and predictable.

### 2.3 External Database Responsibilities

External MySQL connections support:

- Connection testing.
- SQL execution.
- EXPLAIN retrieval.
- Required metadata retrieval.

External query activity is controlled independently through execution limits and connection lifecycle management.

---

## 3. Application Database Connection Pool

### 3.1 Initial Configuration

The initial application database pool configuration is:

| Setting | Initial value |
|---|---:|
| Minimum connections | 2 |
| Maximum connections | 10 |
| Connection acquisition timeout | 5 seconds |
| Idle timeout | 60 seconds |
| Maximum connection lifetime | 30 minutes |

These are initial engineering values, not universal performance guarantees.

They must remain configurable and may be adjusted after load testing and hosting-provider evaluation.

### 3.2 Pool Management

The backend must:

- Reuse healthy connections.
- Release connections after operations.
- Handle connection acquisition failures.
- Discard broken connections.
- Avoid leaking connections.
- Monitor pool utilization.
- Prevent operations from waiting indefinitely.

### 3.3 Pool Exhaustion

If the pool reaches capacity:

1. New operations wait within the configured acquisition timeout.
2. If no connection becomes available, the operation fails in a controlled manner.
3. The API returns an appropriate temporary-service error.
4. The backend records the resource-exhaustion event.
5. The system must not create unlimited replacement connections.

### 3.4 Transaction Interaction

A connection used by a transaction remains occupied until that transaction commits or rolls back.

Long-running external query execution must never retain an application database transaction connection.

---

## 4. External MySQL Connection Management

### 4.1 Independent Pooling

External MySQL connections use a separate resource-management mechanism.

They must not share the application database pool.

### 4.2 Initial Lifecycle Configuration

| Setting | Initial value |
|---|---:|
| Connection establishment timeout | 10 seconds |
| Maximum idle time | 60 seconds |
| Maximum connection lifetime | 15 minutes |
| Maximum active executions per user | 3 |
| Maximum active executions per connection | 2 |
| Global execution capacity | Configurable |

### 4.3 Active Connection Handling

- Active connections remain allocated until execution resolves.
- Idle connections may be closed after the configured idle period.
- Connections reaching their maximum lifetime are retired safely.
- Broken or stale connections are discarded.
- Active queries are not interrupted merely because an idle timeout is reached.

### 4.4 Failure Handling

If an external connection becomes unavailable:

- Return a controlled connection or execution error.
- Avoid automatic query replay when the outcome is uncertain.
- Release resources when their lifecycle is resolved.
- Preserve unresolved execution state for recovery.

### 4.5 Provider Considerations

The hosting provider must support the outbound connectivity and protected configuration required for external MySQL access.

Network restrictions, connection quotas, and outbound access limitations must be evaluated before selecting a provider.

---

## 5. Query Execution Resource Limits

### 5.1 Concurrency Limits

Initial limits:

| Scope | Maximum active executions |
|---|---:|
| Per user | 3 |
| Per saved connection | 2 |
| Global | Configurable |

The execution coordinator enforces these limits atomically.

The limits are intended to prevent a small number of users or expensive queries from exhausting shared resources.

### 5.2 Additional Limits

The backend must enforce:

- Query request-size limits.
- SQL complexity limits where practical.
- Execution-duration limits.
- Maximum returned rows.
- Maximum response payload size.
- Connection establishment timeout.
- Request rate limits.

The exact execution timeout and result-size thresholds remain implementation decisions pending testing.

### 5.3 Recovery Capacity

An execution in `recovery_required` continues consuming active execution capacity.

The system must not release capacity while an external query may still be running.

### 5.4 Resource Isolation

The query execution engine must isolate external query activity from:

- Authentication requests.
- Account management.
- Connection management.
- Query-history browsing.
- Administrative operations.

The initial modular monolith achieves this through separate pools, bounded concurrency, controlled request handling, and short application transactions.

---

## 6. Query History Performance

### 6.1 Retrieval Requirements

Query history supports:

- Newest-first ordering.
- Pagination.
- Execution-status filtering.
- Connection filtering.
- SQL substring search.
- Individual record deletion.
- User-scoped access.

Every history query must enforce authenticated user ownership.

### 6.2 Pagination Strategy

The MVP uses cursor-based pagination.

The ordering is:

`executed_at DESC, history_id DESC`

The cursor contains the last returned ordering values.

The next-page query retrieves records older than that cursor using the combined ordering condition.

This avoids the increasing scan cost associated with large OFFSET values.

### 6.3 Page Size

Initial configuration:

| Setting | Value |
|---|---:|
| Default page size | 20 |
| Minimum page size | 1 |
| Maximum page size | 100 |

The backend enforces the maximum regardless of frontend input.

### 6.4 SQL Search

SQL substring search uses parameterized `LIKE` conditions.

Search must always be scoped to the authenticated user.

The MVP does not require a dedicated full-text search engine.

Performance must be evaluated against realistic history volumes.

### 6.5 Query History Indexes

The initial index strategy includes:

| Index | Columns | Purpose |
|---|---|---|
| `idx_history_user_time` | `(user_id, executed_at)` | User history ordered by time |
| `idx_history_user_status_time` | `(user_id, execution_status, executed_at)` | Status filtering |
| `idx_history_user_connection_time` | `(user_id, connection_id, executed_at)` | Connection filtering |
| `idx_history_connection_id` | `(connection_id)` | Connection relationship operations |
| `idx_history_executed_at` | `(executed_at)` | Retention cleanup |

The final implementation must review actual query patterns and index behavior.

### 6.6 Index Maintenance

Indexes must not be added automatically merely because a column exists.

Before adding an index:

1. Identify the actual query pattern.
2. Inspect the existing indexes.
3. Evaluate the query with MySQL EXPLAIN.
4. Measure the expected benefit.
5. Consider write and storage overhead.
6. Test the change.

Redundant indexes should be avoided.

---

## 7. Database Monitoring

### 7.1 Application Database Metrics

The backend should monitor:

- Query duration.
- Connection acquisition duration.
- Pool utilization.
- Pool exhaustion.
- Database connection errors.
- Database timeouts.
- Deadlock frequency.
- Lock-wait timeout frequency.

### 7.2 Slow Query Threshold

The initial application database slow-operation threshold is:

`500 milliseconds`

This is a monitoring threshold, not a hard query timeout.

It should be configurable and adjusted using real operational observations.

### 7.3 Structured Logging

Operational logs should contain useful diagnostic information, such as:

- Timestamp.
- Severity.
- Request or correlation identifier.
- Component.
- Operation category.
- Duration.
- Error category.
- Relevant resource status.

Logs must not expose:

- Database passwords.
- Session tokens.
- Encryption keys.
- Raw credential material.
- Unnecessary SQL statements or parameter values.
- Sensitive personal information.

### 7.4 External Database Monitoring

External database metrics should be separated from application database metrics.

Examples include:

- Connection establishment failures.
- External execution duration.
- External query timeouts.
- External database errors.
- External connection-pool usage.

Monitoring must not require collecting complete SQL statements by default.

### 7.5 Monitoring Scope

The MVP uses lightweight operational monitoring.

A full observability stack, distributed tracing platform, or dedicated metrics infrastructure is not mandatory initially.

---

## 8. Backup and Recovery Strategy

### 8.1 Backup Objectives

Backups protect important application data against:

- Accidental deletion.
- Application defects.
- Database corruption.
- Infrastructure failure.
- Deployment mistakes.

### 8.2 Initial Backup Policy

| Setting | Initial policy |
|---|---|
| Backup frequency | Daily |
| Retention | 7 days |
| Backup protection | Encrypted and access-restricted |
| Recovery testing | Periodic restore tests |

These are target policies subject to hosting-provider capabilities and the zero-cost constraint.

If a free provider cannot support reliable automated backups, the limitation must be documented rather than silently treating backups as guaranteed.

### 8.3 Encryption-Key Protection

The external database credential encryption key must be backed up separately and securely.

Database backups containing encrypted credentials are not sufficient on their own.

If the encryption key is lost, stored credential ciphertext may become unrecoverable.

Key backup and recovery procedures must therefore be documented.

### 8.4 Restore Testing

The team must periodically verify that:

- Backup files can be accessed.
- Database data can be restored.
- Schema and migration versions remain consistent.
- Encryption keys are available through the approved recovery process.
- Restored application functionality works correctly.

A backup that has never been tested is not a verified recovery mechanism.

### 8.5 RPO and RTO

Recovery Point Objective and Recovery Time Objective must be defined before production readiness.

They depend on actual backup frequency, infrastructure capabilities, and restoration procedures.

No unsupported recovery-time guarantee should be published.

### 8.6 Retention and Backups

Deleting a record from the primary database does not immediately erase copies stored in backups.

Backup expiration must be included in the data-retention and privacy policy.

---

## 9. Database Migration Strategy

### 9.1 Migration Management

Database schema changes must use version-controlled SQL migrations.

Each migration must have a unique, sequential identifier.

A migration tracking table records which migrations have been applied.

### 9.2 Migration Rules

1. Migrations execute in a controlled order.
2. Applied migrations are treated as immutable.
3. Changes are tested before production deployment.
4. Risky migrations require an appropriate backup.
5. Destructive changes require explicit review.
6. Migration failures must be recorded.
7. Database schema changes must remain synchronized with the system design documentation.

### 9.3 Rollback Strategy

A migration should include a rollback strategy where safe and practical.

However, not every schema or data migration can be safely reversed.

When rollback is unsafe, a forward-fix migration may be necessary.

### 9.4 Migration Testing

Test migrations against:

- A clean database.
- A representative existing database.
- Relevant production-like data volumes where available.

The application must not start operating against an incompatible schema version.

---

## 10. Environment Separation

### 10.1 Environments

Queralyth should maintain separate environments:

- Development.
- Testing.
- Production.

### 10.2 Isolation Requirements

Each environment must use separate:

- Application database credentials.
- Database instances or databases.
- Session configuration.
- Encryption secrets.
- External service credentials.
- Environment-specific configuration.

### 10.3 Production Data

Production data must not be copied into development or testing environments without appropriate sanitization.

Production credentials and encryption keys must never be committed to source control.

### 10.4 Configuration Management

Environment-specific configuration must be injected through protected environment variables or an equivalent hosting-provider secret-management facility.

The application must fail safely when mandatory configuration is missing or invalid.

---

## 11. Health Checks and Availability

### 11.1 Health-Check Responsibilities

The backend should expose lightweight health-check capabilities.

Health checks distinguish between:

- Application process health.
- Application database connectivity.
- External user database connectivity.

### 11.2 Application Health

Application health verifies that the backend process is operational.

It should not expose internal secrets, database details, or sensitive infrastructure information.

### 11.3 Application Database Health

Application database readiness checks verify that the application can access its required database resources.

A failed database readiness check must prevent the application from incorrectly reporting itself as ready.

### 11.4 External Connection Health

External user database connectivity is evaluated per saved connection.

An unavailable user database must not automatically make the entire Queralyth application unhealthy.

### 11.5 Readiness Versus Liveness

Liveness determines whether the backend process is functioning.

Readiness determines whether it can safely accept operations that require its dependencies.

These checks must remain distinct.

---

## 12. Graceful Degradation

### 12.1 Application Database Outage

If the application database becomes unavailable:

- Authentication and database-dependent operations fail safely.
- The API returns a controlled service-unavailable response where appropriate.
- The frontend displays a clear temporary-unavailability message.
- The application must not report false success.
- Normal operations resume only after readiness is restored.

### 12.2 External Database Outage

If a user's external MySQL database becomes unavailable:

- The affected connection operation fails.
- Other application functionality remains available where possible.
- The user receives a clear connection or execution error.
- The system does not automatically replay an uncertain query.

### 12.3 Pool Exhaustion

If application database connections are exhausted:

- Requests are bounded by the acquisition timeout.
- Excess requests fail in a controlled way.
- The system avoids unlimited connection creation.
- Resource-exhaustion events are recorded.

### 12.4 Partial Service Degradation

Queralyth should avoid making unrelated features unavailable because one external database connection fails.

For example, a user should still be able to browse previously stored query history when an external MySQL server is offline, provided the application database remains available.

---

## 13. Resource and Capacity Constraints

### 13.1 Initial Resource Limits

The initial design uses:

| Resource | Initial constraint |
|---|---|
| Application DB connections | Maximum 10 |
| Application DB acquisition wait | 5 seconds |
| External connection establishment | 10 seconds |
| External idle timeout | 60 seconds |
| External maximum lifetime | 15 minutes |
| Application DB idle timeout | 60 seconds |
| Application DB maximum lifetime | 30 minutes |
| Application DB lock wait | 10 seconds |
| Slow-operation monitoring threshold | 500 ms |
| Query-history default page size | 20 |
| Query-history maximum page size | 100 |
| User execution concurrency | 3 |
| Per-connection execution concurrency | 2 |

These values are initial design parameters, not final performance guarantees.

### 13.2 Request Protection

The backend must apply suitable limits to:

- Request body size.
- SQL submission size.
- Authentication attempts.
- Connection testing.
- Query execution.
- Query-history retrieval.
- Concurrent resource usage.

### 13.3 Parameterized Queries

All application database queries involving user-provided values must use parameterized queries or an equivalent safe query-building mechanism.

This applies independently of external SQL validation.

### 13.4 Short Transactions

Application transactions must remain short and must not include external query execution or network calls.

Detailed rules are maintained in `07-Concurrency-and-Transactions.md`.

---

## 14. Data Integrity and Consistency

### 14.1 Layered Integrity

Queralyth enforces integrity through three layers:

1. Database constraints.
2. Backend validation and business rules.
3. Transactional workflows and integration tests.

Frontend validation improves usability but is not a security or integrity boundary.

### 14.2 Referential Integrity

Foreign keys must reflect the intended deletion behavior.

Examples:

- User-owned sessions are deleted with the user.
- User-owned connections are deleted with the user.
- Query-history connection references become NULL when a saved connection is deleted.
- Administrative audit records remain available after account deletion, with nullable actor and target references.

### 14.3 State Consistency

The backend must enforce valid state transitions for:

- Account status.
- Session revocation.
- Query-history execution status.
- Execution-request lifecycle.
- Connection test status.

### 14.4 Consistency Under Failure

A partial failure must not leave the application claiming that an operation completed successfully when its final state is uncertain.

Uncertain execution outcomes must remain recoverable.

---

## 15. Character Encoding, Collation, and Time

### 15.1 Character Encoding

The application database uses:

`utf8mb4`

This supports the required Unicode character range.

### 15.2 Collation

MySQL 8.x collations must be selected deliberately.

Field comparisons must reflect the intended semantics.

Examples:

- Emails use normalized, case-insensitive uniqueness.
- Connection names use normalized, case-insensitive uniqueness per user.
- Display capitalization is preserved.
- Tokens and binary identifiers use appropriate binary comparison behavior.

The implementation must not rely on a database's default collation without verifying its behavior.

### 15.3 Time Handling

Application timestamps are stored in UTC.

The backend should use UTC consistently for:

- Session expiration.
- Query execution timestamps.
- Account events.
- Verification-token expiration.
- Audit records.
- Retention cleanup.

Local display conversion belongs to the frontend or presentation layer.

---

## 16. Scalability Strategy

### 16.1 Initial Architecture

The initial architecture remains a modular monolith.

No microservice decomposition is required for the MVP.

### 16.2 Scaling Priorities

As usage grows, investigate these areas in order:

1. Application database query performance.
2. Connection-pool utilization.
3. External execution concurrency.
4. Query-history volume.
5. Background cleanup duration.
6. Backend CPU and memory consumption.
7. Hosting-provider resource limitations.

### 16.3 Future Scaling Options

Potential future improvements include:

- Separate execution-worker processes.
- Dedicated job queues.
- Horizontal backend scaling.
- Stronger global concurrency coordination.
- Dedicated metrics and tracing infrastructure.
- More advanced caching where justified.
- Database capacity upgrades.

These are future options, not MVP dependencies.

### 16.4 Scaling Evidence

Infrastructure complexity must be introduced in response to measured bottlenecks.

The project must not adopt distributed systems solely in anticipation of hypothetical traffic.

---

## 17. Initial Hosting and Cost Constraints

### 17.1 Budget

Initial hosting target:

**$0/month**

A paid option around $1/month may be considered if genuinely necessary, but it is not the default.

### 17.2 Provider Independence

The architecture must avoid unnecessary dependency on one hosting provider.

The application should use portable technologies and standard configuration practices.

### 17.3 Free-Tier Evaluation

Before selecting a provider, verify:

- Node.js runtime support.
- MySQL compatibility.
- Connection limits.
- Outbound network connectivity.
- Persistent storage availability.
- Environment secret support.
- Backup capabilities.
- Free-tier usage restrictions.
- Sleep or suspension behavior.
- Deployment and build limitations.

### 17.4 Reliability Qualification

A zero-cost deployment may impose limitations on uptime, resources, network access, backups, or availability.

Queralyth must not promise reliable always-on production service merely because a free hosting provider is available.

Local development and testing must remain possible independently of the final hosting decision.

---

## 18. Performance Testing

### 18.1 Application Database Testing

Measure:

- Query duration.
- Pool acquisition time.
- Pool exhaustion.
- Transaction duration.
- Deadlock frequency.
- Lock-wait frequency.

### 18.2 External Execution Testing

Measure:

- Connection establishment duration.
- Execution duration.
- Result transfer duration.
- Result payload size.
- Concurrent execution behavior.
- Timeout handling.
- Resource release.

### 18.3 Query History Testing

Test retrieval with increasing record counts.

Verify:

- Cursor correctness.
- Stable ordering.
- Index utilization.
- Filtering behavior.
- Retention cleanup performance.

### 18.4 Load Testing

Load testing must evaluate realistic usage patterns, including:

- Multiple concurrent users.
- Simultaneous query executions.
- Repeated history requests.
- Connection testing.
- Authentication activity.
- Background cleanup.

Testing must not use uncontrolled workloads against external databases.

### 18.5 Performance Acceptance

The project must establish measurable performance targets before production readiness.

Targets must be based on actual test results and hosting constraints rather than unsupported estimates.

---

## 19. Operational Documentation

The project must maintain:

- Application database setup instructions.
- Database migration procedures.
- Backup and restore procedures.
- Encryption-key recovery procedures.
- Environment configuration documentation.
- Health-check documentation.
- Resource-limit configuration.
- Performance testing results.
- Incident and recovery procedures.

Operational documentation must be updated when infrastructure or deployment decisions change.

---

## 20. Related Documents

- `01-System-Architecture.md`
- `02-Component-Design.md`
- `03-Database-Design.md`
- `04-API-Design.md`
- `05-Authentication-and-Security.md`
- `06-Query-Execution-Engine.md`
- `07-Concurrency-and-Transactions.md`
- `09-Deployment-and-Infrastructure.md`
- `10-Error-Handling-and-Recovery.md`
- `11-Testing-and-Quality-Strategy.md`
- `12-Technical-Decision-Records.md`

---

## 21. Document Maintenance

This document defines the initial performance and scalability baseline for Queralyth.

All initial resource limits must remain configurable where practical.

Changes must be based on measured application behavior, load testing, hosting-provider constraints, and documented technical decisions.

## Audit-approved temporary result-cache resource policy

The MVP result cache is process-local and bounded, with a 15-minute default TTL. It must enforce both a total memory budget and a maximum entry size; these numeric budgets are deployment-tunable and must be selected from measured host memory and representative result payloads before release. Cache memory is separate from the application database pool and must not be allowed to exhaust the Node.js process. Expired entries are removed opportunistically and by bounded cleanup. The cache is not shared between backend instances; horizontal scaling requires a shared ephemeral store or a validated affinity design before deployment.

