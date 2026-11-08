# Queralyth — Testing and Quality Strategy

**Document:** Testing and Quality Strategy  
**Project:** Queralyth  
**Version:** 1.0  
**Status:** Initial design baseline  
**Frontend:** React with JavaScript  
**Backend:** Node.js + Express  
**Application Database:** MySQL 8.x  
**External Database:** MySQL 8.x

---

## 1. Introduction

### 1.1 Purpose

This document defines the testing strategy and quality standards for Queralyth.

It establishes how individual components, integrated workflows, security boundaries, database behavior, and complete user journeys will be tested.

### 1.2 Objectives

The testing strategy aims to:

1. Verify functional requirements from the PRD.
2. Detect defects early during implementation.
3. Protect application and external database operations.
4. Verify SQL parsing and validation behavior.
5. Confirm execution-state and transaction correctness.
6. Test authentication and authorization boundaries.
7. Verify accurate execution-plan interpretation.
8. Validate error handling and recovery.
9. Detect performance bottlenecks.
10. Maintain confidence as the codebase evolves.

### 1.3 Quality Principles

Queralyth follows these principles:

- Test behavior, not merely implementation details.
- Test security boundaries explicitly.
- Prefer automated regression tests for repeatable behavior.
- Test failure scenarios as seriously as successful workflows.
- Use real MySQL integration tests for database-specific behavior.
- Never rely exclusively on frontend validation.
- Keep tests deterministic and isolated.
- Require evidence before declaring a feature complete.

---

## 2. Testing Levels

### 2.1 Unit Testing

Unit tests verify individual functions and isolated modules.

Examples:

- Email normalization.
- Input validation.
- Password policy validation.
- SQL parsing helpers.
- SQL allowlist decisions.
- Logical operator-tree construction.
- Execution-plan interpretation.
- Error-code mapping.
- Pagination parameter validation.
- Connection configuration validation.

Unit tests should avoid unnecessary network and database dependencies.

### 2.2 Integration Testing

Integration tests verify that multiple components work correctly together.

Examples:

- Express routes with authentication middleware.
- Services with the application database.
- Session creation and revocation.
- Connection ownership verification.
- SQL parser and validation pipeline.
- Execution coordinator and external MySQL driver.
- Query-history updates.
- Transaction rollback.
- Execution-request idempotency.

### 2.3 End-to-End Testing

End-to-end tests verify complete user journeys through the frontend and backend.

Examples:

- Registration and email verification.
- Login and logout.
- Creating and testing a database connection.
- Submitting SQL for analysis.
- Viewing a logical operator tree.
- Viewing a MySQL EXPLAIN plan.
- Executing an accepted query.
- Viewing query results.
- Reviewing query history.
- Deleting a saved connection.
- Updating account settings.

### 2.4 Security Testing

Security testing verifies that application controls cannot be bypassed through direct API requests or manipulated inputs.

Examples:

- Unauthorized resource access.
- Session manipulation.
- Cross-user data access.
- SQL validation bypass attempts.
- Credential exposure.
- CSRF protection.
- SSRF protection.
- Rate-limit enforcement.
- Administrative authorization.

### 2.5 Performance Testing

Performance tests evaluate:

- API response times.
- Application database pool behavior.
- External connection behavior.
- Concurrent execution limits.
- Query-history pagination.
- SQL parsing performance.
- Result processing.
- Memory consumption.

Performance testing must use representative workloads and document the test environment.

### 2.6 Recovery Testing

Recovery tests verify behavior when an operation fails midway.

Examples:

- Backend restart during execution.
- Application database outage.
- External database disconnection.
- Failed history update.
- Cancellation uncertainty.
- Recovery-required execution reconciliation.
- Failed cleanup jobs.

---

## 3. Testing Environments

### 3.1 Local Development

The local environment is the primary environment for day-to-day implementation and debugging.

It should include:

- React frontend.
- Node.js + Express backend.
- Local MySQL 8.x application database.
- A separate MySQL database for external-connection testing.
- Test email mechanism.
- Local environment configuration.

### 3.2 Automated Test Environment

The automated test environment should provide isolated resources for repeatable testing.

It should use:

- Dedicated test database.
- Dedicated test users.
- Controlled external MySQL instances.
- Test credentials.
- Predictable seed data.
- Test-specific environment variables.

Production data must not be copied into test environments without appropriate sanitization.

### 3.3 Staging Environment

Staging should resemble the intended production deployment as closely as the available infrastructure allows.

It is used for:

- Release-candidate testing.
- Migration verification.
- Authentication and cookie checks.
- Deployment verification.
- Integration testing.
- Manual acceptance testing.

### 3.4 Production Environment

Production testing must be controlled.

Only safe health checks, monitoring, and explicitly approved diagnostic operations should run against production.

Automated tests must not execute destructive operations against production databases.

---

## 4. Testing Technology Strategy

The following tools are proposed as the initial testing stack.

| Area | Proposed tool | Purpose |
|---|---|---|
| Frontend unit/component tests | Vitest | JavaScript and React testing |
| Frontend component rendering | React Testing Library | User-visible behavior |
| Backend unit tests | Node.js test runner or Vitest | Service and utility tests |
| API integration tests | Supertest | Express API testing |
| Browser end-to-end tests | Playwright | Complete user journeys |
| Database integration tests | MySQL 8.x test instance | Real database behavior |
| Code quality | ESLint | Static code analysis |
| Formatting | Prettier | Consistent formatting |
| Dependency review | npm audit and appropriate tooling | Known dependency vulnerabilities |
| CI | GitHub Actions | Automated validation |

Final library and version choices will be confirmed during implementation and compatibility testing.

The testing stack should remain lightweight and compatible with the zero-cost initial development constraint.

---

## 5. Frontend Testing Strategy

### 5.1 Component Tests

Test individual React components for:

- Correct rendering.
- User interactions.
- Loading states.
- Empty states.
- Error states.
- Disabled states.
- Form validation.
- Responsive behavior.

### 5.2 Authentication Tests

Verify:

- Login form validation.
- Registration form validation.
- Email verification feedback.
- Session-expiration behavior.
- Logout behavior.
- Protected-route behavior.

The frontend must not be treated as the authorization boundary.

### 5.3 Database Connection Tests

Verify:

- Required-field validation.
- Port validation.
- Passwordless configuration handling.
- Connection test feedback.
- Failed connection feedback.
- Stale connection-version handling.
- Connection deletion confirmation.

### 5.4 SQL Workspace Tests

Verify:

- SQL editor input.
- Submission handling.
- Loading indicators.
- Analysis results.
- Logical operator-tree rendering.
- EXPLAIN visualization.
- Query-result rendering.
- Empty results.
- Error presentation.
- Cancellation status.

### 5.5 Query History Tests

Verify:

- Correct history listing.
- Pagination.
- Filtering.
- Search behavior.
- Empty history.
- History opt-out behavior.
- Deleted-connection snapshot display.
- Unauthorized history access handling.

### 5.6 Accessibility and Usability

Verify:

- Keyboard navigation.
- Clear labels.
- Accessible form errors.
- Sufficiently understandable status indicators.
- Appropriate contrast.
- Usable loading and error feedback.

---

## 6. Backend Testing Strategy

### 6.1 API Tests

Test every endpoint for:

- Valid requests.
- Invalid requests.
- Missing authentication.
- Insufficient authorization.
- Missing resources.
- Duplicate requests.
- Invalid state transitions.
- Rate-limit behavior.
- Unexpected failures.

### 6.2 Authentication Tests

Verify:

- Password hashing.
- Login verification.
- Session creation.
- Session expiration.
- Session revocation.
- Multiple active sessions.
- Password-change session invalidation.
- Account suspension.
- Generic login failure responses.

### 6.3 Authorization Tests

Verify that users cannot access or modify:

- Another user's connections.
- Another user's query history.
- Another user's account information.
- Another user's execution requests.
- Administrative resources without authorization.

Every protected operation must enforce authorization on the backend.

### 6.4 Service Tests

Test business rules independently of HTTP routing.

Examples:

- Connection ownership.
- Account status transitions.
- Email verification.
- Email changes.
- Account deletion coordination.
- Query-history preferences.
- Execution concurrency.
- Administrative actions.

### 6.5 Error Handling Tests

Verify:

- Stable error codes.
- Correct HTTP statuses.
- Safe error messages.
- Request identifiers.
- No stack traces in API responses.
- No credentials or tokens in logs.
- Correct handling of unknown exceptions.

---

## 7. Database Testing Strategy

### 7.1 Schema Tests

Verify:

- All eight logical tables.
- Primary keys.
- Foreign keys.
- Unique constraints.
- Check constraints.
- Required columns.
- Default values.
- Index definitions.
- Column types.
- Deletion behavior.

### 7.2 Migration Tests

Every migration must be tested for:

- Successful fresh installation.
- Correct migration ordering.
- Correct resulting schema.
- Compatibility with application code.
- Failure behavior.
- Recovery or forward-fix procedure.

Applied migrations must not be silently modified.

### 7.3 Transaction Tests

Verify transactional behavior for:

- Registration.
- Email verification.
- Email changes.
- Password changes.
- Account suspension.
- Account restoration.
- Account deletion initiation.
- Connection deletion.
- Query-history creation and completion.
- Administrative changes.

A failure halfway through an atomic operation must not leave an invalid partial state.

### 7.4 Concurrency Tests

Test:

- Concurrent login and session revocation.
- Concurrent connection updates.
- Concurrent connection deletion and execution claims.
- Concurrent email changes.
- Duplicate registration attempts.
- Duplicate execution submissions.
- Simultaneous execution-limit checks.
- Concurrent cancellation and execution completion.

### 7.5 Data Integrity Tests

Verify:

- Ownership relationships.
- Nullable historical connection references.
- Connection-name snapshots.
- Query-history retention.
- Account-deletion cascades.
- Administrative audit preservation.
- Encryption-field consistency.

---

## 8. Query Engine Testing Strategy

### 8.1 SQL Parser Tests

Test supported SQL syntax against the selected parser.

Test categories should include:

- Basic SELECT.
- SELECT with WHERE.
- JOIN operations.
- GROUP BY.
- HAVING.
- ORDER BY.
- LIMIT.
- Subqueries.
- Common expressions.
- Supported aggregate functions.

The exact supported syntax must follow the approved parser and MVP scope.

### 8.2 Unsupported SQL Tests

Verify that unsupported or prohibited statements are rejected.

Test categories include:

- INSERT.
- UPDATE.
- DELETE.
- DDL statements.
- Multiple statements.
- Prohibited locking constructs.
- File-output constructs.
- Unsupported statement combinations.

These tests must verify both parser behavior and backend enforcement.

### 8.3 Logical Representation Tests

Verify that supported SQL produces a logically correct operator representation.

Test:

- Table scans.
- Filters.
- Projections.
- Joins.
- Aggregations.
- Sorting.
- Limits.

The generated representation must not invent operations unsupported by the parsed query.

### 8.4 EXPLAIN Interpretation Tests

Use controlled MySQL 8.x schemas and known query examples.

Verify interpretation of available plan fields, including:

- Access type.
- Selected table.
- Possible keys.
- Selected key.
- Estimated rows.
- Filtered estimate.
- Join order.
- Additional plan information.

The visualized plan must preserve the distinction between optimizer estimates and measured runtime behavior.

### 8.5 Optimization Recommendation Tests

Verify that recommendations:

- Are based on available evidence.
- Explain their reasoning.
- Identify uncertainty.
- Avoid guaranteed performance claims.
- Do not recommend unsupported operations.
- Respect available schema metadata.

### 8.6 Regression Fixtures

Maintain a collection of representative SQL statements, schemas, and expected parser or plan-interpretation outcomes.

These fixtures should be rerun whenever parser, logical representation, or plan interpretation code changes.

---

## 9. Query Execution Testing Strategy

### 9.1 Execution Lifecycle

Verify all supported transitions:

- `claimed` → `running`
- `claimed` → `failed`
- `running` → `successful`
- `running` → `failed`
- `running` → `cancelled`
- `running` → `recovery_required`
- `recovery_required` → a confirmed terminal state

Terminal states must never transition back to active states.

### 9.2 Idempotency Tests

Verify:

- Same user and UUID do not execute twice.
- Duplicate submissions return the existing request state.
- Intentional reruns use a new UUID.
- Idempotency works when query history is disabled.
- Terminal request retention is respected.

### 9.3 Concurrency Tests

Verify:

- Maximum three active executions per user.
- Maximum two active executions per saved connection.
- Global limit is enforced.
- Concurrent claims cannot bypass limits.
- `recovery_required` counts toward active capacity.
- Capacity is released only after confirmed resolution.

### 9.4 Cancellation Tests

Verify:

- Cancellation request acceptance.
- Confirmed termination.
- Cancellation racing with successful completion.
- Cancellation racing with failure.
- Unconfirmed termination.
- Recovery-required behavior.

### 9.5 Result Tests

Verify:

- Correct column metadata.
- Correct row normalization.
- Empty results.
- NULL values.
- Numeric values.
- Date/time values.
- Binary or unsupported value handling.
- Result-size boundaries.
- Pagination or bounded-result behavior where implemented.

### 9.6 Timing Tests

Verify that execution duration is measured using a monotonic server-side clock.

The recorded duration represents Queralyth's observed execution interval, not a claim of pure MySQL internal execution time.

---

## 10. Security Testing Strategy

### 10.1 Authentication Security

Test:

- Password hashing and verification.
- Session-token unpredictability.
- Stored token hashes.
- Cookie flags.
- Idle and absolute expiration.
- Session revocation.
- Login rate limiting.
- Password-change behavior.

### 10.2 Authorization Security

Test:

- Cross-user access attempts.
- Direct API requests.
- Resource identifier manipulation.
- Admin endpoint protection.
- Suspended-account restrictions.
- Pending-deletion restrictions.

### 10.3 SQL Safety

Test:

- Multiple-statement rejection.
- Unsupported statement rejection.
- Prohibited clause rejection.
- Parser bypass attempts.
- Backend validation independent of frontend controls.
- Execution under a least-privilege MySQL account.

### 10.4 SSRF Protection

Test connection destinations against the application's network-access policy.

Verify that user-controlled connection details cannot be used to access prohibited internal infrastructure or unintended services.

### 10.5 Credential Protection

Verify:

- AES-256-GCM encryption.
- Unique nonces.
- Authentication-tag validation.
- Key-version handling.
- Backend-only decryption.
- No plaintext credentials in frontend responses.
- No credentials in logs.
- Controlled key rotation.

### 10.6 Web Security

Test:

- CSRF protection.
- CORS restrictions.
- Secure cookies.
- HTTPS behavior.
- Security headers.
- Request-size limits.
- Rate limits.
- Input validation.

### 10.7 Dependency Security

Review dependencies for:

- Known vulnerabilities.
- Unmaintained packages.
- Unnecessary permissions.
- Incompatible licenses.
- Unneeded transitive dependencies.

Security tools provide signals, not proof that the application is secure.

---

## 11. Performance Testing Strategy

### 11.1 API Performance

Measure:

- Response time.
- Throughput.
- Error rate.
- Resource utilization.

### 11.2 Application Database Performance

Measure:

- Pool utilization.
- Pool acquisition time.
- Query duration.
- Deadlocks.
- Lock-wait timeouts.
- Slow queries.
- Connection failures.

### 11.3 Query Engine Performance

Measure:

- Parsing duration.
- Validation duration.
- Logical representation generation.
- EXPLAIN retrieval.
- Plan interpretation.
- Result normalization.

### 11.4 Execution Performance

Measure:

- External connection establishment.
- Query execution duration.
- Result retrieval.
- Cancellation responsiveness.
- Memory usage.
- Concurrency behavior.

### 11.5 Initial Performance Targets

The following are provisional engineering targets, not guaranteed product claims.

| Area | Initial target |
|---|---|
| Ordinary API response | p95 under 500 ms, excluding long-running operations |
| Application DB pool acquisition | Within configured 5-second timeout |
| External DB connection establishment | Within configured 10-second timeout |
| Query-history page size | Default 20, maximum 100 |
| Active executions per user | Maximum 3 |
| Active executions per connection | Maximum 2 |

Targets must be reviewed using measurements from realistic test environments.

The 500 ms monitoring threshold is not a hard timeout for all application operations.

### 11.6 Load Testing

Load tests should gradually increase:

- Concurrent authenticated users.
- API request volume.
- Query-history reads.
- Connection-test requests.
- Active external executions.

The system must reject excess work predictably rather than exhaust available resources.

---

## 12. Recovery and Failure-Injection Testing

### 12.1 Application Database Failure

Simulate:

- Database unavailable.
- Database restart.
- Connection-pool exhaustion.
- Transaction interruption.

Verify controlled errors and data consistency.

### 12.2 External Database Failure

Simulate:

- External MySQL restart.
- Network interruption.
- Query timeout.
- Connection loss during execution.

Verify that uncertain execution outcomes are preserved and reconciled.

### 12.3 Backend Restart

Restart the backend during:

- Connection testing.
- Query execution.
- Query-history completion.
- Account deletion coordination.

Verify recovery behavior and ensure unresolved execution requests are not incorrectly discarded.

### 12.4 Encryption Failure

Test:

- Missing encryption key.
- Wrong key.
- Invalid authentication tag.
- Unsupported key version.
- Interrupted key rotation.

### 12.5 Background Job Failure

Test:

- Interrupted cleanup.
- Repeated cleanup execution.
- Partial batch completion.
- Recovery-job restart.
- Email delivery failure.

---

## 13. Test Data and Fixtures

### 13.1 Test Users

Maintain controlled accounts representing:

- Ordinary user.
- Another independent user.
- Administrator.
- Suspended user.
- Pending-deletion user.
- Unverified user.

### 13.2 Database Fixtures

Maintain separate schemas for:

- Application database tests.
- External query execution tests.
- SQL parser and plan interpretation tests.

### 13.3 SQL Fixtures

Maintain representative SQL examples covering:

- Supported statements.
- Unsupported statements.
- Syntax errors.
- Complex queries.
- Different join patterns.
- Aggregations.
- Sorting and filtering.

### 13.4 Sensitive Data

Use synthetic test data.

Never place real passwords, production credentials, or private user data in committed fixtures.

---

## 14. Continuous Integration and Quality Gates

### 14.1 Pull-Request Checks

Every relevant pull request should run:

1. Dependency installation.
2. Formatting checks.
3. ESLint.
4. Frontend unit/component tests.
5. Backend unit tests.
6. Relevant integration tests.
7. Build verification.

Security and database integration checks should run in the CI workflow where the required services are available.

### 14.2 Main-Branch Protection

The main branch should only accept changes that pass the project's required checks.

### 14.3 Regression Testing

Existing tests must remain active as new features are introduced.

A change to a shared component should trigger the relevant tests across dependent modules.

### 14.4 Migration Quality Gate

Database migrations must be validated before deployment.

A migration must not be deployed merely because the application code compiles.

### 14.5 Release Candidate Gate

Before a release candidate is accepted:

- Critical functional tests pass.
- Security tests pass.
- Database migrations succeed.
- Execution-state tests pass.
- Recovery tests pass.
- No unresolved critical defects remain.
- Deployment health checks succeed.

---

## 15. Defect Classification

### 15.1 Critical

A defect is critical if it causes or enables:

- Unauthorized data access.
- Credential exposure.
- Unsafe SQL execution.
- Cross-user data modification.
- Serious data corruption.
- Incorrect execution-state reporting that can cause duplicate operations.

Critical defects block release.

### 15.2 High

Examples:

- Major feature unavailable.
- Authentication workflow broken.
- Execution recovery unreliable.
- Query history materially incorrect.
- Significant data-integrity failure.

High-severity defects block the affected release until resolved or explicitly accepted through a documented risk decision.

### 15.3 Medium

Examples:

- Non-critical workflow failure.
- Incorrect secondary visualization.
- Recoverable usability issue.
- Inaccurate non-essential diagnostic information.

### 15.4 Low

Examples:

- Minor visual inconsistency.
- Non-blocking copy issue.
- Small layout defect.

### 15.5 Defect Tracking

Each defect should record:

- Description.
- Reproduction steps.
- Expected behavior.
- Actual behavior.
- Severity.
- Affected component.
- Related requirement.
- Resolution status.
- Regression test where appropriate.

---

## 16. Feature Completion Criteria

A feature is not complete merely because its primary workflow works.

A feature should be considered complete when:

1. Its functional requirements are implemented.
2. Its acceptance criteria pass.
3. Relevant unit tests pass.
4. Relevant integration tests pass.
5. Security boundaries are verified.
6. Error states are handled.
7. Relevant failure scenarios are tested.
8. Documentation is updated.
9. No unresolved critical defects remain.
10. The feature is integrated without breaking existing behavior.

Testing depth should be proportional to the feature's risk.

---

## 17. Testing Workflow During Development

The implementation workflow will follow this order:

1. Review the relevant requirement and system-design decisions.
2. Define expected behavior and edge cases.
3. Write or identify the necessary tests.
4. Implement the smallest functional unit.
5. Run unit tests.
6. Integrate the component.
7. Run integration tests.
8. Perform manual verification where useful.
9. Run regression tests.
10. Update documentation and mark acceptance criteria.

The goal is to catch defects close to where they are introduced.

### 17.1 Learning-Oriented Implementation

Queralyth is also a learning project.

The implementation process should explain:

- Why a test is necessary.
- What behavior it protects.
- How the test is structured.
- What a failure indicates.
- How to investigate and fix the underlying issue.

The user should understand the system rather than simply copy completed implementations.

---

## 18. Testing Limitations and Deferred Work

The following are not required to be fully implemented in the initial MVP:

- Large-scale distributed load testing.
- Dedicated security operations infrastructure.
- Formal penetration-testing certification.
- Multi-region disaster recovery.
- Advanced chaos engineering.
- Dedicated performance-testing infrastructure.
- Automated benchmarking across many MySQL versions.

These may become relevant as Queralyth matures.

The MVP must still undergo meaningful functional, security, database, execution, and recovery testing.

---

## 19. Final Quality Rules

The following rules are mandatory:

1. Frontend validation never replaces backend validation.
2. Every protected operation requires backend authorization.
3. SQL safety is tested independently of the UI.
4. Real MySQL 8.x integration tests verify database-specific behavior.
5. Execution idempotency is tested under duplicate submissions.
6. Concurrency limits are tested under simultaneous requests.
7. Uncertain execution outcomes are tested explicitly.
8. Cancellation must be confirmed before recording `cancelled`.
9. Sensitive information must not leak through errors or logs.
10. Database transactions must preserve integrity.
11. Migrations must be tested before deployment.
12. Recovery behavior must be tested after process interruption.
13. Regression tests must protect previously completed features.
14. Critical defects block release.
15. Every completed feature must satisfy its acceptance criteria.

---

## 20. Related Documents

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
- `12-Technical-Decision-Records.md`

---

## 21. Document Maintenance

This document should evolve alongside implementation.

New features must introduce appropriate tests, and changes to existing behavior must update relevant regression tests.

Testing requirements should remain aligned with the PRD, acceptance criteria, and system-design decisions.

## Audit-approved additional acceptance tests

### Built-in sample database tests

- The built-in sample target is available without a user-saved connection or user-supplied credentials.
- Its dedicated database account can read the sample schema but cannot read or modify the application schema.
- INSERT, UPDATE, DELETE, DDL, and other non-allowlisted operations are rejected by backend validation and denied by database privileges.
- Sample schema and synthetic seed data can be provisioned repeatably from version-controlled assets.

### Bounded results, syntax highlighting, and explanations

- Row and serialized-response-size limits are enforced independently.
- Truncation metadata accurately identifies `row_limit` versus `response_size_limit`.
- Frontend page changes do not trigger another execution request.
- Syntax highlighting preserves exact submitted SQL and never bypasses backend parsing/validation.
- Query explanations are deterministic for supported fixtures, grounded in AST/logical operators, and do not invent unsupported semantics or performance conclusions.

### Asynchronous execution API tests

- New accepted execution returns 202 and initial state `claimed`.
- Duplicate UUID requests by the same user return the existing resource and never execute twice; a replay cannot alter the original target or SQL.
- A terminal duplicate returns 200; an active duplicate returns 202.
- Validation and concurrency rejections return the defined error status and do not create an accepted execution.
- Polling returns the durable lifecycle state and only returns results when available to the authenticated owner.
- Cancellation acknowledgement does not mark the request cancelled before termination is confirmed.

### Temporary result-cache tests

- Results are scoped to both user ID and execution-request ID; another user cannot retrieve them.
- The default TTL is 15 minutes and expiry produces `resultAvailable: false` with reason `expired`.
- Eviction produces an explicit unavailable response and does not alter terminal execution state.
- Simulated backend restart changes the process cache-generation identifier, clears result cache, preserves execution state, and reports `backend_restart`.
- Expiry and eviction tombstones produce their corresponding reasons; missing tombstones produce generic `unavailable` rather than an incorrect diagnosis.
- Tombstone count and lifetime are bounded.
- Missing cached results never cause automatic SQL re-execution.
- Per-entry and total cache-memory limits are enforced under load.

### Account deletion tests

- Permanent deletion is blocked while any request is `claimed`, `running`, or `recovery_required`.
- Once all requests are confirmed terminal, permanent deletion cascades the associated execution-request rows.
- Normal terminal retention remains 24 hours unless permanent account deletion occurs first.

