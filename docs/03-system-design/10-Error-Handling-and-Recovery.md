# Queralyth — Error Handling and Recovery

**Document:** Error Handling and Recovery  
**Project:** Queralyth  
**Version:** 1.0  
**Status:** Initial design baseline  
**Backend:** Node.js + Express  
**Application Database:** MySQL 8.x  
**External Database:** MySQL 8.x

---

## 1. Introduction

### 1.1 Purpose

This document defines how Queralyth detects, classifies, communicates, logs, and recovers from application and infrastructure failures.

It establishes consistent behavior across the frontend, backend, application database, external MySQL connections, query execution engine, and background processes.

### 1.2 Objectives

The error-handling strategy must:

1. Provide predictable API error responses.
2. Prevent sensitive information from leaking.
3. Distinguish application failures from external database failures.
4. Preserve execution-state correctness.
5. Support recovery from interrupted operations.
6. Prevent accidental duplicate query execution.
7. Provide useful diagnostic information for developers.
8. Ensure failures do not silently corrupt application data.
9. Communicate actionable errors to users.

### 1.3 Core Principles

Queralyth follows these principles:

- Fail safely.
- Never report an unconfirmed operation as successful.
- Never automatically replay an uncertain external query.
- Separate internal diagnostics from user-facing messages.
- Use consistent error codes.
- Preserve unresolved execution states.
- Make recovery explicit and controlled.
- Avoid exposing credentials, tokens, SQL parameters, or internal infrastructure details.

---

## 2. Error Classification

### 2.1 Main Categories

Errors are divided into the following categories:

| Category | Examples |
|---|---|
| Validation | Invalid input, unsupported SQL |
| Authentication | Invalid credentials, expired session |
| Authorization | Missing permission, resource not owned |
| Account state | Suspended account, pending deletion |
| Application | Unexpected internal exception |
| Application database | Connection failure, constraint violation |
| External database | Connection refused, authentication failure |
| SQL parsing | Syntax error, unsupported syntax |
| SQL validation | Prohibited SQL construct |
| Query execution | MySQL execution failure |
| Plan analysis | EXPLAIN or plan interpretation failure |
| Resource limits | Concurrency limit, result-size limit |
| Timeout | Database connection or operation timeout |
| Cancellation | Query termination failure |
| Recovery | Execution outcome cannot be confirmed |
| Infrastructure | Hosting or network failure |

### 2.2 Error Ownership

Each error should be handled by the component responsible for the failed operation.

For example:

- Authentication errors belong to authentication services.
- SQL parsing errors belong to the query engine.
- External MySQL failures belong to external connection or execution services.
- Application database failures belong to the application data-access layer.
- Execution recovery belongs to the execution coordinator.

Controllers should not independently reinterpret low-level errors throughout the application.

---

## 3. Standard API Error Format

### 3.1 Response Structure

All API errors should follow a consistent JSON structure.

Conceptual example:

```json
{
  "error": {
    "code": "QUERY_VALIDATION_FAILED",
    "message": "The submitted query contains an unsupported operation.",
    "requestId": "example-request-id",
    "details": null
  }
}
```

### 3.2 Fields

| Field | Purpose |
|---|---|
| `error.code` | Stable machine-readable error identifier |
| `error.message` | Safe, user-facing explanation |
| `error.requestId` | Identifier for support and diagnostic correlation |
| `error.details` | Optional safe validation information |

### 3.3 Error-Code Stability

Error codes are part of the API contract.

They must remain stable across frontend and backend releases unless a documented breaking API change is introduced.

User-facing messages may improve without changing the underlying code.

### 3.4 Error Details

Details may contain safe information such as:

- Invalid field names.
- Supported input constraints.
- Approximate SQL error position.
- Current execution state.
- Pagination constraints.

They must not contain:

- Passwords.
- Session tokens.
- Encryption keys.
- Decrypted database credentials.
- Internal stack traces.
- Raw connection strings.
- Sensitive SQL parameter values.

---

## 4. HTTP Status-Code Strategy

### 4.1 Standard Mapping

| HTTP status | Meaning | Typical cases |
|---|---|---|
| 400 | Bad Request | Malformed request |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not permitted |
| 404 | Not Found | Missing resource |
| 409 | Conflict | Stale connection version, conflicting state |
| 413 | Content Too Large | Request body exceeds limit |
| 415 | Unsupported Media Type | Unsupported request content type |
| 422 | Unprocessable Content | Validation or unsupported operation |
| 429 | Too Many Requests | Rate or concurrency limit |
| 500 | Internal Server Error | Unexpected application failure |
| 502 | Bad Gateway | External dependency returned an unusable response |
| 503 | Service Unavailable | Application database or required service unavailable |
| 504 | Gateway Timeout | An upstream operation exceeded its permitted time |

### 4.2 Status-Code Consistency

The same logical failure should use a consistent HTTP status and application error code.

For example, a stale connection configuration update should consistently return:

`409 Conflict`

A concurrency-limit rejection should return a controlled rate/resource-limit response rather than an unexpected server error.

### 4.3 Security Considerations

The API must avoid revealing whether a sensitive resource exists when doing so would enable resource enumeration.

For example, unauthorized access to another user's connection should not disclose its details.

---

## 5. Application-Wide Error Handling

### 5.1 Centralized Middleware

Express should use centralized error-handling middleware.

It is responsible for:

1. Receiving errors passed through the request pipeline.
2. Identifying known application errors.
3. Mapping them to stable error codes.
4. Selecting appropriate HTTP statuses.
5. Producing safe JSON responses.
6. Logging permitted diagnostic context.
7. Avoiding accidental information disclosure.

### 5.2 Typed Application Errors

The backend should use consistent application error types or equivalent structured error objects.

Examples include:

- ValidationError.
- AuthenticationError.
- AuthorizationError.
- ResourceNotFoundError.
- ConflictError.
- RateLimitError.
- ExternalDatabaseError.
- QueryExecutionError.
- ResourceLimitError.
- ServiceUnavailableError.
- InternalError.

### 5.3 Unexpected Exceptions

Unexpected exceptions must be treated as internal failures.

The user receives a generic message and request identifier.

Detailed stack traces remain restricted to protected operational logs.

### 5.4 Asynchronous Errors

Asynchronous route handlers and background tasks must have explicit error handling.

Unhandled promise rejections must not be treated as normal application behavior.

Critical process-level failures may require controlled process termination and restart, followed by execution-state reconciliation.

---

## 6. Validation and Authentication Errors

### 6.1 Input Validation

Invalid user input must produce clear validation errors.

Examples:

- Missing required fields.
- Invalid email format.
- Invalid connection port.
- Invalid UUID.
- Unsupported pagination parameters.
- Oversized SQL submission.

### 6.2 Authentication Failures

Authentication errors include:

- Missing session.
- Invalid session.
- Expired session.
- Revoked session.
- Invalid login credentials.

Login responses should avoid disclosing whether an email address is registered.

### 6.3 Authorization Failures

Authorization errors include:

- Access to another user's connection.
- Access to another user's query history.
- Unauthorized administrative action.
- Operation against an account in an ineligible state.

Backend authorization must be enforced on every protected operation.

### 6.4 Account-State Errors

The backend must distinguish between:

- Active account.
- Suspended account.
- Pending-deletion account.

Protected operations must not proceed when the account is in an ineligible state.

---

## 7. Application Database Errors

### 7.1 Error Categories

Application database failures include:

- Connection failure.
- Connection-pool exhaustion.
- Query timeout.
- Deadlock.
- Lock-wait timeout.
- Duplicate-key violation.
- Foreign-key violation.
- Unexpected schema mismatch.
- Transaction failure.

### 7.2 Connection Failure

When the application database is unavailable:

- Database-dependent requests fail safely.
- The API returns a controlled service-unavailable response.
- The frontend displays a temporary service message.
- The application must not claim that the requested change succeeded.

### 7.3 Pool Exhaustion

If no application database connection becomes available within the configured five-second acquisition timeout:

- Stop waiting.
- Return a controlled resource-unavailable error.
- Log pool utilization and request context.
- Avoid unlimited connection creation.

### 7.4 Deadlocks

MySQL deadlock error:

`1213`

Handling:

- Roll back the entire transaction.
- Retry the full transaction only if safe.
- Use a randomized delay.
- Permit at most three total attempts.

### 7.5 Lock-Wait Timeouts

MySQL lock-wait timeout error:

`1205`

Initial policy:

- Roll back the entire transaction.
- Do not automatically retry.
- Return a controlled error.
- Record the operational event.

### 7.6 Constraint Violations

Constraint violations must be interpreted according to the operation.

Examples:

- Duplicate normalized email.
- Duplicate connection name.
- Duplicate execution request.
- Invalid foreign-key relationship.

The backend must not expose raw SQL or database diagnostics to the user.

### 7.7 Transaction Integrity

A failed transaction must not be reported as successful.

The backend must explicitly roll back when necessary and release the associated database connection safely.

---

## 8. External MySQL Connection Errors

### 8.1 Connection Errors

Possible failures include:

- DNS resolution failure.
- Connection refused.
- Connection timeout.
- Network interruption.
- Authentication failure.
- TLS or certificate failure.
- Database unavailable.
- Permission denied.

### 8.2 User-Facing Behavior

The frontend should display a clear explanation without exposing unnecessary infrastructure information.

For example:

"The database connection could not be established. Verify the connection details and try again."

### 8.3 Credential Protection

External connection errors must never expose:

- Stored passwords.
- Decrypted credentials.
- Full connection strings.
- Encryption material.
- Internal network addresses where their disclosure is unnecessary.

### 8.4 Connection Test Status

A failed manual connection test records:

- Test timestamp.
- Failed status.

If a saved connection's configuration changes, its previous test status is reset.

A previous successful test must not be presented as proof that the current configuration is still valid.

### 8.5 Connection Deletion

A deleted connection must not be recreated by a delayed test or execution response.

Configuration-version checks and connection-state coordination protect against stale updates.

---

## 9. SQL Parsing and Validation Errors

### 9.1 Parsing Errors

Parsing errors include:

- Invalid syntax.
- Malformed expressions.
- Unsupported grammar.
- Incomplete statements.

The API should return a safe parsing error and an approximate location when available.

### 9.2 Validation Errors

Validation errors include:

- Unsupported statement type.
- Multiple statements.
- Prohibited clauses.
- Unsupported functions.
- Disallowed execution constructs.
- SQL complexity or size limit violations.

### 9.3 Error Separation

The system must distinguish between:

- SQL that cannot be parsed.
- SQL that can be parsed but is unsupported.
- SQL that is supported for analysis but not execution.
- SQL that is accepted but fails during actual MySQL execution.

This distinction is essential to Queralyth's user experience.

---

## 10. Execution Errors

### 10.1 Execution Failure

An external MySQL execution failure is recorded as `failed` only when failure is sufficiently confirmed.

The error information should include:

- Safe application error code.
- Sanitized message.
- Execution request identifier.
- Relevant timing information.

### 10.2 Execution Timeout

An execution exceeding its configured limit must trigger controlled cancellation handling.

A timeout does not automatically prove that the external database stopped processing the query.

If termination cannot be confirmed, the execution must move to `recovery_required`.

### 10.3 Result Normalization Failure

If the query succeeds externally but the result cannot be normalized:

- Do not claim that the full result was successfully delivered.
- Record the failure accurately.
- Preserve the execution outcome separately from result-delivery failure where necessary.
- Avoid automatically executing the SQL again.

The implementation must distinguish database execution outcome from subsequent application processing failures.

### 10.4 Result-Size Limit

If a result exceeds the configured limit:

- Stop or bound further result collection according to the driver and execution design.
- Return a clear result-limit response.
- Record the actual execution outcome accurately.
- Do not silently truncate and imply that the returned dataset is complete.

The precise behavior must be validated against the selected MySQL driver.

---

## 11. Cancellation Errors

### 11.1 Cancellation Request

Cancellation is a request, not proof of termination.

The API and frontend must distinguish between a cancellation request being accepted and the external query actually stopping.

### 11.2 Confirmed Cancellation

Only after external query termination is confirmed may the execution transition to:

`cancelled`

### 11.3 Unconfirmed Cancellation

If termination cannot be confirmed:

- Preserve the execution request.
- Mark it `recovery_required` where appropriate.
- Continue counting it against concurrency limits.
- Prevent duplicate execution under the same request UUID.
- Reconcile it before releasing execution capacity.

### 11.4 Concurrent Completion

If execution completes while cancellation is being processed:

- The confirmed terminal state takes precedence.
- The execution must not be overwritten by a delayed cancellation response.
- Conditional state transitions protect terminal records.

---

## 12. Execution Recovery

### 12.1 Recovery Purpose

The recovery mechanism handles situations where an execution may have continued externally even though Queralyth lost reliable knowledge of its state.

Examples:

- Backend restart.
- Worker crash.
- Network interruption.
- Final application database update failure.
- Cancellation uncertainty.
- Expired worker heartbeat.

### 12.2 Execution States

The execution-request registry supports:

- `claimed`
- `running`
- `successful`
- `failed`
- `cancelled`
- `recovery_required`

### 12.3 Recovery Workflow

1. Identify an active request that requires investigation.
2. Inspect its last persisted state and heartbeat.
3. Determine whether the worker is still active.
4. Investigate the external execution outcome where possible.
5. Reconcile the execution state.
6. Update query history if recording is enabled.
7. Release active concurrency capacity only after a terminal state is confirmed.

### 12.4 Recovery Restrictions

The system must not:

- Assume an expired lease means the query stopped.
- Automatically replay an uncertain query.
- Delete unresolved execution requests.
- Mark an uncertain operation successful without evidence.
- Mark an unconfirmed cancellation as cancelled.

### 12.5 Recovery Retention

Active and unresolved execution requests remain stored until resolved.

Terminal execution requests are retained for 24 hours after completion.

---

## 13. Query History Error Handling

### 13.1 History Creation

When history recording is enabled, an execution attempt creates an initial history record with status:

`running`

### 13.2 History Completion

The record transitions to one confirmed terminal state:

- `successful`
- `failed`
- `cancelled`

### 13.3 History Update Failure

If external execution completes but the history update fails:

- Preserve the execution-request record.
- Reconcile the history state.
- Avoid creating a duplicate execution.
- Do not overwrite an existing terminal state.

### 13.4 History Opt-Out

When `query_history_enabled` is false at execution start:

- Do not create a query-history record.
- Continue maintaining the execution-request record.
- Preserve idempotency and recovery behavior.

### 13.5 History Retention

Query-history records follow the 90-day retention policy from `executed_at`.

Backup retention is handled separately.

---

## 14. Credential Encryption Errors

### 14.1 Encryption Failure

If encryption fails while saving a connection:

- Do not persist incomplete credential data.
- Roll back the connection operation.
- Return a safe error.
- Log a protected diagnostic event.

### 14.2 Decryption Failure

If decryption fails:

- Do not attempt to use incomplete or corrupted credentials.
- Do not expose ciphertext or key information.
- Stop the connection operation.
- Record a protected operational event.
- Require controlled investigation or credential replacement.

### 14.3 Key Version Mismatch

If a required key version is unavailable:

- Do not silently substitute another key.
- Do not discard encrypted credentials automatically.
- Report a controlled operational failure.
- Preserve the encrypted record for recovery.

### 14.4 Key Rotation Failure

A failed credential re-encryption must not leave credentials in an ambiguous mixed state.

The migration must preserve recoverability and record which key version applies to each successfully migrated credential.

---

## 15. Frontend Error Handling

### 15.1 Error Presentation

The frontend should display clear, actionable messages.

Messages should explain:

- What operation failed.
- Whether the operation may still be running.
- Whether retrying is safe.
- What action the user can take next.

### 15.2 Request Identifiers

The frontend should preserve the request identifier returned by the backend.

It may display or expose the identifier in an appropriate support/debugging context.

### 15.3 Authentication Errors

If the session expires or is revoked:

- Stop protected actions.
- Clear authenticated application state.
- Redirect to or display the login workflow.
- Avoid repeatedly retrying unauthorized requests.

### 15.4 Network Errors

If the frontend loses connectivity:

- Display a connection interruption message.
- Do not assume a submitted execution failed.
- Query the existing execution request state using its original UUID when connectivity returns.
- Do not generate a new UUID merely to retry status retrieval.

### 15.5 Duplicate Submission Protection

The frontend should prevent accidental duplicate execution submissions.

The backend remains authoritative through execution-request idempotency.

### 15.6 Loading and Pending States

Long-running operations must display their current known state.

Examples:

- Submitting.
- Queued or claimed.
- Running.
- Cancellation requested.
- Recovering.
- Completed.
- Failed.

The frontend must not display a terminal success state before the backend confirms it.

---

## 16. Logging and Diagnostics

### 16.1 Structured Logs

Operational logs should contain:

- Timestamp.
- Severity.
- Request identifier.
- Execution request identifier where applicable.
- Component.
- Operation category.
- Error code.
- Duration.
- Relevant non-sensitive context.

### 16.2 Sensitive Information Restrictions

Logs must not contain:

- Passwords.
- Session tokens.
- Encryption keys.
- Decrypted database credentials.
- Unnecessary raw SQL.
- SQL parameter values.
- Sensitive user information.

### 16.3 Stack Traces

Stack traces may be recorded in restricted server-side diagnostic logs.

They must never be returned in ordinary production API responses.

### 16.4 Error Correlation

Request identifiers and execution-request identifiers must help connect:

- API requests.
- Backend logs.
- Execution state changes.
- Recovery operations.
- Query-history records where applicable.

### 16.5 Log Retention

Operational log retention must be configured according to available infrastructure and privacy requirements.

Logs must not become an unintended permanent copy of sensitive SQL or credentials.

---

## 17. Background Job Failures

### 17.1 Cleanup Failure

If a cleanup job fails:

- Record the failure.
- Preserve affected records.
- Retry according to a controlled schedule.
- Avoid unbounded retry loops.

### 17.2 Partial Batch Failure

A partially completed cleanup batch must not cause already processed records to be recreated or incorrectly deleted.

Cleanup operations should be repeatable and idempotent.

### 17.3 Execution Recovery Job

The recovery process must inspect unresolved execution requests.

It must never delete active or unresolved requests merely because they are old.

### 17.4 Email Delivery Failure

Email delivery occurs outside the main account transaction.

If email delivery fails:

- Preserve the underlying account or token state where appropriate.
- Return a controlled response.
- Allow a rate-limited resend or retry.
- Do not duplicate account records.

---

## 18. Graceful Degradation

### 18.1 Application Database Unavailable

If the application database is unavailable:

- Database-dependent operations become temporarily unavailable.
- The backend returns a controlled service error.
- The frontend explains the interruption.
- The application does not report false success.

### 18.2 External MySQL Unavailable

If one external database becomes unavailable:

- The affected connection operation fails.
- Other application features remain available when possible.
- Existing query history remains accessible if the application database is healthy.

### 18.3 Backend Resource Exhaustion

If the backend reaches its resource limits:

- Reject excess work safely.
- Preserve already accepted execution state.
- Avoid unbounded queue growth.
- Release resources when operations resolve.

### 18.4 Hosting Restart

After a hosting restart:

- Re-establish application database connectivity.
- Reinitialize services.
- Perform readiness checks.
- Inspect active execution requests.
- Reconcile uncertain external executions.
- Resume normal operations only when required dependencies are available.

---

## 19. Error and Recovery Testing

### 19.1 API Error Tests

Test:

- Standard error response structure.
- HTTP status consistency.
- Stable error codes.
- Safe error messages.
- Request identifiers.
- Unknown exception handling.

### 19.2 Application Database Tests

Test:

- Database unavailable.
- Pool exhausted.
- Deadlock.
- Lock-wait timeout.
- Duplicate-key violation.
- Foreign-key violation.
- Transaction rollback.
- Migration mismatch.

### 19.3 External Database Tests

Test:

- DNS failure.
- Connection refusal.
- Authentication failure.
- Timeout.
- Network interruption.
- Query failure.
- Result-size limit.
- Connection loss during execution.

### 19.4 Execution Recovery Tests

Test:

- Worker crash.
- Backend restart.
- Heartbeat expiration.
- Cancellation uncertainty.
- External query completion followed by history-update failure.
- Execution-state update failure.
- Duplicate request after network interruption.
- Recovery from `recovery_required`.

### 19.5 Security Tests

Test:

- No credentials in API errors.
- No credentials in logs.
- No raw encryption keys in diagnostics.
- No stack traces in production responses.
- No unauthorized access to execution state.
- No cross-user query-history access.

---

## 20. Final Error-Handling Rules

The following rules are mandatory:

1. All API errors use a consistent response structure.
2. Error codes remain stable.
3. Internal diagnostics are separated from user-facing messages.
4. Credentials and secrets never appear in ordinary logs or API responses.
5. Application database errors and external database errors remain distinguishable.
6. Transactions are rolled back explicitly when necessary.
7. Deadlock retries are limited to three total attempts and only used for safe operations.
8. Lock-wait timeouts are not automatically retried initially.
9. Uncertain external queries are never blindly replayed.
10. Cancellation is not considered successful until termination is confirmed.
11. Uncertain execution requests remain in `recovery_required`.
12. Recovery-required requests continue consuming active capacity.
13. Terminal execution states cannot be overwritten by delayed updates.
14. Query-history and execution-request lifecycles remain separate.
15. Frontend network failures do not imply execution failure.
16. Background cleanup never removes active or unresolved execution requests.
17. All recovery procedures must be tested.

---

## 21. Related Documents

- `01-System-Architecture.md`
- `02-Component-Design.md`
- `03-Database-Design.md`
- `04-API-Design.md`
- `05-Authentication-and-Security.md`
- `06-Query-Execution-Engine.md`
- `07-Concurrency-and-Transactions.md`
- `08-Performance-and-Scalability.md`
- `09-Deployment-and-Infrastructure.md`
- `11-Testing-and-Quality-Strategy.md`
- `12-Technical-Decision-Records.md`

---

## 22. Document Maintenance

This document defines the initial error-handling and recovery baseline.

Changes to error codes, execution-state transitions, recovery procedures, or failure behavior must be reflected in the API, query-engine, concurrency, and database design documents.

## Audit-approved recovery clarifications

### Result unavailable after execution

The execution outcome and result availability are separate facts. A request may be `successful` even when its temporary result window is no longer available. If the process-local cache entry expires, is evicted, or is lost during a backend restart, return the durable execution state and `resultAvailable: false` with a reason (`expired`, `evicted`, or `backend_restart`). Do not convert a successful execution into a failed execution solely because the cache entry disappeared, and never automatically execute the SQL again to reconstruct the result.

### Account deletion and unresolved execution requests

Permanent account deletion must wait until all execution requests are confirmed terminal. A `recovery_required` request blocks permanent deletion and remains available to the recovery process. Only after reconciliation to `successful`, `failed`, or `cancelled` may the deletion workflow cascade-delete the user's execution-request rows. Normal 24-hour terminal retention does not override this explicit permanent-deletion exception.

