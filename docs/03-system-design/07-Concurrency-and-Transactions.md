# Queralyth — Concurrency and Transactions

**Document:** Concurrency and Transactions  
**Project:** Queralyth  
**Version:** 1.0  
**Status:** Consolidated design baseline  
**Application Database:** MySQL 8.x  
**Storage Engine:** InnoDB  
**Default Isolation Level:** REPEATABLE READ

---

## 1. Introduction

### 1.1 Purpose

This document defines how Queralyth manages concurrent operations, database transactions, record locking, race conditions, and recovery from transaction failures.

It establishes consistent rules for protecting application data when multiple requests, users, background processes, or execution workers interact with shared resources.

### 1.2 Scope

This document covers:

- Transaction management.
- Isolation and locking.
- Global lock-order conventions.
- Deadlock and lock-timeout handling.
- Duplicate-request prevention.
- Execution-request idempotency.
- Concurrent query execution.
- Connection editing, testing, and deletion.
- Account suspension and deletion.
- Session and authentication-related concurrency.
- Email verification and email-change concurrency.
- Administrative operations.
- Background cleanup and recovery.

### 1.3 Design Principles

Queralyth follows these principles:

1. Keep transactions short.
2. Never hold application database transactions open during external database execution.
3. Protect shared state using appropriate locks and constraints.
4. Use consistent lock ordering where practical.
5. Make retry behavior explicit.
6. Never assume an uncertain external operation has stopped.
7. Enforce important invariants in the backend and database.
8. Make state transitions conditional and controlled.
9. Prefer recoverable failure states over incorrectly reporting success or completion.

---

## 2. Transaction Environment

### 2.1 Storage Engine

All transactional application tables must use MySQL InnoDB.

InnoDB provides the transactional behavior and row-level locking required by Queralyth.

### 2.2 Isolation Level

The initial application database isolation level is:

`REPEATABLE READ`

This is the standard MySQL InnoDB default.

The implementation must explicitly understand the effects of:

- Consistent reads.
- Locking reads.
- Row-level locks.
- Next-key and gap locks where applicable.
- Unique constraints.
- Foreign-key checks.
- Transaction commit and rollback.

The design must not assume that every ordinary SELECT statement automatically protects a record against concurrent modification.

### 2.3 Transaction Duration

Transactions should contain only the database operations necessary to maintain an application invariant.

Transactions must not remain open while the backend performs:

- Email delivery.
- External HTTP requests.
- External MySQL query execution.
- Long-running computation.
- User interaction.
- Unbounded background work.

### 2.4 Transaction Ownership

The backend service responsible for an operation owns its transaction boundaries.

Controllers should not independently create overlapping transactions for the same business operation.

Transaction coordination should be implemented in the relevant service or repository layer.

---

## 3. Locking Strategy

### 3.1 Pessimistic Locking

Queralyth uses explicit row locking when concurrent modifications could violate important application rules.

Examples include:

- Account status changes.
- Account deletion initiation.
- Execution claims.
- Connection deletion.
- Email changes.
- Administrative role changes.

Where appropriate, the implementation should use locking reads such as:

`SELECT ... FOR UPDATE`

The actual SQL must use indexes that allow the intended records to be locked efficiently.

### 3.2 Optimistic Concurrency

Optimistic concurrency is used for saved connection configuration updates.

Each connection contains a `config_version`.

The version starts at 1 and increments whenever connection details or credentials change.

An update succeeds only if the submitted version matches the current version.

Conceptually:

```sql
UPDATE connections
SET
    host = ?,
    config_version = config_version + 1,
    updated_at = CURRENT_TIMESTAMP
WHERE
    connection_id = ?
    AND user_id = ?
    AND config_version = ?;
```

If no record is updated, the backend determines whether the connection is missing, unauthorized, or has a stale version.

A stale configuration update returns:

`409 Conflict`

The physical SQL type is finalized as `BIGINT UNSIGNED NOT NULL DEFAULT 1`. Increment operations must fail safely at the maximum value; the version must never wrap or reset.

### 3.3 Database Constraints

Application-level checks must be reinforced by database constraints wherever practical.

Examples:

- Unique normalized email.
- Unique session token hash.
- Unique connection name per user.
- Unique execution request UUID per user.
- Valid execution states.
- Foreign-key ownership relationships where structurally appropriate.

A prior application-level availability check is not a replacement for a unique constraint.

---

## 4. Global Lock-Order Convention

### 4.1 Purpose

Concurrent operations can deadlock when transactions acquire shared locks in inconsistent orders.

Queralyth establishes a common lock-order convention to reduce this risk.

### 4.2 Preferred Order

When an operation requires multiple record types, the preferred order is:

1. User.
2. Connection.
3. Session.
4. Email verification token.
5. Query history.
6. Administrative audit record.

When multiple records of the same type must be locked, acquire them in ascending primary-key order.

### 4.3 Important Qualification

This is a design convention, not a guarantee that deadlocks cannot occur.

Actual lock acquisition can also depend on:

- SQL statement structure.
- Selected indexes.
- Query execution plans.
- Foreign-key checks.
- Unique-index checks.
- InnoDB internal locking behavior.

The implementation must inspect actual SQL and test concurrent transactions.

### 4.4 Transaction Design Rule

A transaction should acquire only the locks necessary for its operation.

It should not lock unrelated records simply to follow the convention.

---

## 5. Deadlock and Lock-Timeout Handling

### 5.1 Deadlock Detection

MySQL may detect a deadlock and roll back one of the involved transactions.

Queralyth must handle this explicitly.

### 5.2 Deadlock Error

For MySQL deadlock error:

`1213 — Deadlock found when trying to get lock`

The backend should:

1. Treat the transaction as rolled back.
2. Discard the failed transaction context.
3. Retry the entire transaction when the operation is safe to repeat.
4. Use a small randomized delay before retrying.
5. Stop after a maximum of three total attempts.

The retry count includes the original attempt.

### 5.3 Lock-Wait Timeout

For MySQL error:

`1205 — Lock wait timeout exceeded`

Initial policy:

- Roll back the entire transaction.
- Do not automatically retry.
- Return a controlled application error.
- Log the failure without exposing sensitive data.

The application must not assume that a lock-wait timeout always rolls back every preceding statement in every transaction configuration. It must explicitly roll back the transaction.

### 5.4 Other Database Errors

Other transaction errors must not be automatically retried by default.

They should be classified according to their cause.

### 5.5 Retry Safety

Retries are permitted only when the complete operation is safe to repeat.

A transaction retry must not duplicate external side effects.

Examples of external side effects include:

- Sending an email.
- Starting an external SQL query.
- Triggering an external HTTP request.
- Sending a notification through another service.

External actions must be coordinated separately through idempotency or controlled post-commit processing.

---

## 6. Transaction Specifications

### 6.1 User Registration

**Transaction responsibilities:**

1. Normalize and validate the email.
2. Hash the password using Argon2id before storing it.
3. Insert the user record.
4. Insert the email verification token record.
5. Commit.

Email delivery occurs after the transaction commits.

If email delivery fails:

- The account remains pending verification.
- The verification token remains available until expiration.
- The user can request another verification email subject to rate limits.

The registration process must handle concurrent attempts using the normalized email unique constraint.

A duplicate registration must not create multiple accounts.

### 6.2 Email Verification

The verification workflow must:

1. Locate the token using its stored hash.
2. Begin a transaction.
3. Lock the token record.
4. Validate its purpose, expiration, and unused status.
5. Lock or safely update the associated user.
6. Set `email_verified_at`.
7. Set the token's `used_at`.
8. Commit.

The token must be single-use.

Concurrent verification requests must not both successfully consume the same token.

### 6.3 Email Change

The email-change workflow must:

1. Validate the requested new email.
2. Create a verification request for the pending email.
3. Send verification to the new address after the relevant database transaction commits.
4. On verification, lock the user and verification token.
5. Verify that the token is valid and unused.
6. Confirm that the pending email is still the active request.
7. Check normalized email uniqueness.
8. Update the user's email.
9. Update `email_verified_at`.
10. Mark the token as used.
11. Invalidate other outstanding email-change tokens for that user.
12. Commit.

Only one active email-change request is allowed per user.

Concurrent email-change requests are serialized using the user-row lock. The latest committed pending request becomes authoritative.

A uniqueness conflict must be handled without partially updating the account.

### 6.4 Password Change

The password-change workflow must:

1. Authenticate the user.
2. Verify the current password.
3. Compute the new Argon2id password hash.
4. Begin a transaction.
5. Lock the user record.
6. Update `password_hash`.
7. Revoke all active sessions, including the current session.
8. Set the revocation reason to `password_change`.
9. Commit.
10. Send a security notification after commit.

The user must authenticate again after the password change.

The application must not hold the user-row lock while performing password hashing or email delivery.

### 6.5 Account Suspension

The suspension workflow must:

1. Begin a transaction.
2. Lock the target user.
3. Verify the current account state.
4. Set `account_status = suspended`.
5. Set `suspended_at`.
6. Revoke all active sessions.
7. Insert an `account_status_history` event.
8. Insert an `admin_audit_logs` event.
9. Commit.

The account status change, session revocation, status-history event, and audit event must be atomic.

The backend must prevent new protected operations after suspension.

### 6.6 Account Restoration

The restoration workflow must:

1. Begin a transaction.
2. Lock the target user.
3. Confirm that restoration is permitted.
4. Set `account_status = active`.
5. Clear `suspended_at`.
6. Insert the status-history event.
7. Insert the administrative audit event where applicable.
8. Commit.

Previously revoked sessions remain revoked.

The restored user must establish new authenticated sessions.

### 6.7 Account Deletion Initiation

The account-deletion workflow must:

1. Require an authenticated user.
2. Require recent password confirmation.
3. Require explicit final confirmation.
4. Begin a transaction.
5. Lock the user record.
6. Verify that permanent deletion has not begun.
7. Set `account_status = pending_deletion`.
8. Record the status-history event.
9. Revoke active sessions.
10. Commit.

After commit, the deletion coordinator handles active execution cancellation and final deletion eligibility.

The user must not be allowed to start new protected operations after deletion is initiated.

### 6.8 Account Deletion Cancellation and Recovery

Before permanent deletion begins, an eligible account may be restored.

The workflow must:

1. Verify the user's identity.
2. Require recent password confirmation where applicable.
3. Begin a transaction.
4. Lock the user.
5. Verify the account is still pending deletion.
6. Confirm permanent deletion has not started.
7. Restore the account to active.
8. Record the status-history event.
9. Record an administrative audit event if applicable.
10. Commit.

Previously revoked sessions remain revoked.

If permanent deletion has already begun, ordinary cancellation is no longer permitted.

### 6.9 Connection Deletion

The workflow must:

1. Begin a transaction.
2. Lock the connection record.
3. Verify ownership.
4. Delete the saved connection and encrypted credentials.
5. Allow foreign-key behavior to set historical `connection_id` references to NULL.
6. Commit.

The `connection_name_snapshot` in query history preserves the historical connection label.

Active executions that already acquired their required resources may finish.

No new execution claim may be created after deletion wins the connection-row lock.

### 6.10 Query Execution and History

The execution workflow uses separate short transactions.

**Initial transaction:**

1. Validate user and connection state.
2. Lock required records.
3. Enforce concurrency limits.
4. Register the execution request.
5. Create a `running` query-history record if history is enabled.
6. Commit.

**External execution:**

The actual query runs outside the application database transaction.

**Final transaction:**

1. Update the execution-request state.
2. Update query history if a history record exists.
3. Record confirmed terminal information.
4. Commit.

If the final transaction fails, the execution request must remain available for reconciliation.

The system must not claim a successful final state merely because the external driver returned an ambiguous result.

---

## 7. Execution Idempotency and Duplicate Requests

### 7.1 Execution Request Identity

Every actual execution request has a client-generated UUID.

The database enforces uniqueness using:

`UNIQUE(user_id, execution_request_id)`

The request registry is independent of query history.

### 7.2 Duplicate Request Behavior

If a request with the same UUID already exists:

- Do not start another external query.
- Return the existing request state.
- Do not create another execution attempt.
- Do not increment active execution counts again.

### 7.3 Intentional Reruns

An intentional rerun must use a new UUID.

The same SQL statement does not imply the same execution request.

### 7.4 Idempotency Retention

Terminal execution requests remain available for 24 hours after completion.

Active and unresolved requests remain until reconciled.

This retention supports duplicate detection and recovery even when query history is disabled.

---

## 8. Concurrent Execution Control

### 8.1 Limits

Initial limits:

| Scope | Maximum active executions |
|---|---:|
| Per user | 3 |
| Per saved connection | 2 |
| Global | Configurable |

`claimed`, `running`, and `recovery_required` requests count as active.

### 8.2 Atomic Claim Procedure

The backend must enforce execution limits atomically.

The initial claim procedure is:

1. Begin a short application database transaction.
2. Lock the user row.
3. Confirm the account is eligible.
4. Lock the connection row.
5. Confirm connection ownership and availability.
6. Count active execution requests for the user.
7. Count active execution requests for the connection.
8. Check the global capacity controller.
9. Reject if a limit has been reached.
10. Insert the execution-request claim.
11. Commit.

The external query starts only after the claim transaction commits.

### 8.3 Global Capacity

The global limit is configurable.

It may be enforced through a dedicated concurrency controller or equivalent atomic coordination mechanism.

A process-local counter alone is insufficient when multiple backend instances are deployed.

### 8.4 Recovery Capacity

An execution in `recovery_required` continues to count toward active limits.

Capacity is released only after the execution has been reconciled into a terminal state.

---

## 9. Execution State Transitions

### 9.1 Supported States

- `claimed`
- `running`
- `successful`
- `failed`
- `cancelled`
- `recovery_required`

### 9.2 Valid Transitions

| Current state | Allowed next states |
|---|---|
| claimed | running, failed |
| running | successful, failed, cancelled, recovery_required |
| recovery_required | successful, failed, cancelled |
| successful | None |
| failed | None |
| cancelled | None |

### 9.3 Transition Enforcement

The backend must enforce valid transitions.

State updates should use conditional updates or equivalent transactional checks.

For example, a terminal execution state must not be overwritten by a delayed worker response.

### 9.4 Heartbeat and Lease

Active workers maintain heartbeat or lease information.

If a heartbeat expires:

- The system identifies the request as potentially abandoned.
- It investigates whether the external query is still active.
- It does not automatically assume that execution stopped.
- It moves to `recovery_required` when the outcome is uncertain.

The exact heartbeat interval and lease duration remain implementation decisions.

---

## 10. Concurrent Connection Operations

### 10.1 Connection Update

Connection updates use optimistic concurrency through `config_version`.

If the submitted version is stale:

- Reject the update.
- Return HTTP 409.
- Require the client to reload the latest configuration.

### 10.2 Connection Testing

A connection test must:

1. Capture the current configuration version.
2. Validate ownership and destination.
3. Perform the external connection test outside the application transaction.
4. Use the 10-second connection-establishment timeout.
5. Recheck the current configuration version.
6. Save the result only if the version is unchanged.

If the configuration changed during testing, the test result is discarded.

### 10.3 Concurrent Testing

Multiple tests may be initiated, but a result must never overwrite a newer configuration's test status.

The final implementation should also ensure that concurrent test requests cannot create uncontrolled resource usage.

### 10.4 Update Versus Delete

Connection update and deletion must coordinate through the connection record.

- If update commits first, deletion may subsequently remove the updated record.
- If deletion commits first, the update must fail.
- No update may recreate a deleted connection implicitly.

---

## 11. Concurrent Email and Registration Operations

### 11.1 Duplicate Registration

Concurrent registration attempts for the same normalized email are controlled by the unique email constraint.

The backend must handle duplicate-key errors safely.

### 11.2 Email Normalization

The same normalization procedure must be applied during:

- Registration.
- Login.
- Email change.
- Verification completion.

The system must not rely on frontend normalization.

### 11.3 Verification Token Resend

When a new token is generated for the same user and purpose:

- Previous unused tokens for that purpose are invalidated.
- Tokens for another purpose remain independent.
- Token generation and invalidation are coordinated transactionally.

### 11.4 Email-Change Race Conditions

Concurrent email-change requests must be serialized through the user record.

A verification token from an older pending request must not change the account email after a newer request has become authoritative.

---

## 12. Session Concurrency

### 12.1 Multiple Sessions

A user may maintain multiple active sessions.

Each session has independent expiration and revocation state.

### 12.2 Session Revocation

Revocation is irreversible for that session record.

Examples include:

- Logout.
- Password change.
- Account suspension.
- Administrator action.
- Security event.

### 12.3 Concurrent Authenticated Requests

The backend must validate:

- Session validity.
- Session expiration.
- Session revocation.
- Account status.
- Authorization for the requested resource.

A request that started before a suspension or revocation must not be assumed to retain authorization indefinitely.

Critical state-changing operations must revalidate account and ownership state within their relevant transaction.

---

## 13. Administrative Concurrency

### 13.1 Role Changes

Administrative role changes must:

1. Lock the target user.
2. Validate the requested role.
3. Update the role.
4. Insert an audit event.
5. Commit.

The backend must prevent a user from changing their own role through public account functionality.

### 13.2 Last Active Administrator Protection

The system must not permit removal or disabling of the last active administrator.

The check and role/status change must be protected by transaction-level coordination.

The final implementation must use a concurrency-safe strategy, not merely count administrators before beginning a transaction.

### 13.3 Concurrent Administrative Actions

Conflicting actions against the same user must be serialized through the target user's row lock.

For example, suspension and restoration cannot both independently assume the same starting state.

The actual state at transaction time determines whether the requested transition is valid.

### 13.4 Audit Atomicity

Successful privileged changes and their corresponding audit events must be committed atomically.

A successful state change must not silently lack its required audit record.

---

## 14. Background Jobs and Cleanup

### 14.1 General Requirements

Background cleanup must:

- Operate in bounded batches.
- Use indexed selection conditions.
- Avoid long-running transactions.
- Be safe to run repeatedly.
- Tolerate partial failure.
- Log operational failures.
- Avoid deleting active or unresolved execution records.

### 14.2 Eligible Cleanup

Examples include:

- Expired session records.
- Expired email verification tokens.
- Query-history records older than the retention period.
- Terminal execution requests older than 24 hours.
- Other expired temporary records.

### 14.3 Execution Request Protection

The cleanup process must never delete:

- `claimed` requests.
- `running` requests.
- `recovery_required` requests.

Only eligible terminal records may be removed.

### 14.4 Query History Retention

The default query-history retention period is 90 days from `executed_at`.

Cleanup must account for the fact that deletion from the primary database does not immediately remove historical copies from backups.

---

## 15. Failure and Recovery Strategy

### 15.1 Application Database Failure

If an application database transaction fails:

- Roll back the transaction.
- Do not report success.
- Classify the error.
- Apply the defined retry policy only when safe.

### 15.2 External Query Failure

External MySQL execution occurs independently of application database transactions.

An application database failure must not be confused with an external query failure.

The engine may need to reconcile a query that completed externally but whose final state update was not persisted.

### 15.3 Uncertain Execution Outcome

If the backend cannot determine whether an external query completed:

- Do not blindly replay it.
- Keep the execution request.
- Mark it `recovery_required` where appropriate.
- Investigate the external connection and query state.
- Record a terminal result only when sufficiently confirmed.

### 15.4 Partial Failure

The system must distinguish between:

- Transaction failure before external execution.
- External execution failure.
- External execution success followed by application database update failure.
- Cancellation failure.
- Worker failure.
- Recovery failure.

These cases have different recovery requirements.

---

## 16. Concurrency and Transaction Testing

### 16.1 Transaction Tests

Test:

- Registration atomicity.
- Email verification atomicity.
- Email-change atomicity.
- Password-change session revocation.
- Suspension and restoration.
- Account deletion initiation.
- Connection deletion.
- Execution-history state updates.
- Administrative audit atomicity.

### 16.2 Race-Condition Tests

Test:

- Two registrations with the same normalized email.
- Two email verification requests using the same token.
- Two concurrent email changes.
- Concurrent connection update and deletion.
- Connection testing while configuration changes.
- Duplicate execution requests.
- Concurrent execution claims.
- Cancellation racing with completion.
- Account suspension during execution.
- Account deletion during execution.
- Concurrent administrative state changes.
- Concurrent attempts to remove the last active administrator.

### 16.3 Deadlock Tests

Test transactions that lock overlapping resources.

Verify:

- Deadlock detection.
- Full rollback.
- Retry behavior.
- Maximum retry count.
- Safe handling of non-retryable operations.

### 16.4 Recovery Tests

Test:

- Worker disappearing during execution.
- Heartbeat expiration.
- External query continuing after worker loss.
- Final history update failure.
- Final execution-state update failure.
- Recovery from `recovery_required`.
- Cleanup skipping unresolved requests.

---

## 17. Final Design Rules

The following rules are mandatory implementation principles:

1. Application transactions remain short.
2. External SQL execution occurs outside application database transactions.
3. All critical shared-state changes use appropriate transaction coordination.
4. The backend enforces valid state transitions.
5. Database uniqueness constraints protect against duplicate records.
6. Deadlock retries are limited to three total attempts.
7. Lock-wait timeout errors are rolled back and not automatically retried initially.
8. External side effects are never blindly repeated during transaction retries.
9. Execution requests are idempotent through user-scoped UUIDs.
10. Execution concurrency is enforced atomically.
11. Uncertain external execution outcomes remain recoverable.
12. `recovery_required` requests continue consuming active execution capacity.
13. Connection updates use optimistic version checking.
14. Connection testing cannot persist stale results.
15. Account deletion cannot permanently remove an account while its execution outcome remains unresolved.
16. Query-history retention and execution-request retention remain separate.
17. Administrative changes and audit events are atomic.
18. Background cleanup must never remove active or unresolved execution records.

---

## 18. Related Documents

- `01-System-Architecture.md`
- `02-Component-Design.md`
- `03-Database-Design.md`
- `04-API-Design.md`
- `05-Authentication-and-Security.md`
- `06-Query-Execution-Engine.md`
- `08-Performance-and-Scalability.md`
- `09-Deployment-and-Infrastructure.md`
- `10-Error-Handling-and-Recovery.md`
- `11-Testing-and-Quality-Strategy.md`
- `12-Technical-Decision-Records.md`

---

## 19. Document Maintenance

This document defines Queralyth's initial concurrency and transaction baseline.

Implementation must preserve its transaction boundaries, locking requirements, idempotency behavior, and recovery guarantees.

Any change to these rules must be reflected in the relevant database, API, query-engine, and technical decision documentation.

## Audit-approved concurrency and lifecycle clarifications

### Permanent account deletion and execution requests

Terminal `execution_requests` are normally retained for 24 hours after completion. Permanent account deletion is an explicit exception: after all associated execution requests have been confirmed terminal and none remain `claimed`, `running`, or `recovery_required`, the account deletion workflow may permanently delete the user and cascade-delete their execution-request rows through `ON DELETE CASCADE`. The coordinator must lock/recheck the user and associated active/unresolved requests at the deletion boundary so a new request cannot race with deletion. If any outcome remains uncertain, keep the account in `pending_deletion` and retain the unresolved request until reconciliation. Backup retention is independent.

### Result cache is not execution state

Temporary result-cache expiry, eviction, or loss during restart must not change an execution-request state. The durable request record remains authoritative. Result retrieval verifies both user ownership and execution-request identity. Missing result data is reported as unavailable; it is never a reason to retry or replay SQL.

