# Queralyth — Database Design

**Document:** Database Design  
**Project:** Queralyth  
**Version:** 1.0  
**Status:** Consolidated logical design baseline  
**Database:** MySQL 8.x  
**Storage engine:** InnoDB  
**Character set:** utf8mb4  
**Timestamp convention:** UTC

---

## 1. Introduction

### 1.1 Purpose

This document defines the logical database design for Queralyth's application database. It records table responsibilities, important columns and data types, relationships, integrity rules, indexing, retention, deletion, security, and transaction requirements.

It is the authoritative logical design baseline. Physical details that are explicitly marked as deferred must be finalized before the corresponding SQL migration is written.

### 1.2 Database technology

Queralyth uses MySQL 8.x with InnoDB.

| Property | Decision |
|---|---|
| DBMS | MySQL 8.x |
| Storage engine | InnoDB |
| Character set | utf8mb4 |
| Collation | Selected deliberately for each text field |
| Isolation level | REPEATABLE READ, with explicit locking where required |
| Timestamp convention | UTC |
| Foreign-key enforcement | Enabled |
| Transaction support | InnoDB transactions |

The Queralyth application database is separate from external MySQL databases that users connect to.

### 1.3 Design principles

1. Enforce referential integrity with foreign keys.
2. Use database constraints for durable data invariants.
3. Encrypt saved database credentials; never expose them to the frontend.
4. Keep operational execution tracking separate from optional query history.
5. Preserve historical records where the retention policy requires them.
6. Use transactions for related application-database changes.
7. Add indexes for demonstrated access patterns rather than speculatively.
8. Enforce ownership and authorization in the backend, supported by transactional validation.
9. Store and interpret timestamps consistently in UTC.
10. Keep schema changes in version-controlled migrations.

---

## 2. Database overview

The logical application schema contains eight domain tables:

| Table | Responsibility |
|---|---|
| `users` | User identity, account state, role, and preferences |
| `sessions` | Hashed authentication-session tokens and lifecycle |
| `connections` | User-owned external MySQL connection configurations |
| `query_history` | Optional durable metadata for individual execution attempts |
| `email_verification_tokens` | Single-use registration and email-change verification tokens |
| `account_status_history` | History of account-status transitions |
| `admin_audit_logs` | Administrative action audit records |
| `execution_requests` | Operational execution claims, idempotency, and lifecycle tracking |

The first seven tables have a logical schema described below. `execution_requests` has finalized logical behavior, but its exact physical column layout, key representation, lease fields, constraints, and indexes remain deferred.

The built-in sample database is deployment infrastructure. It is not a user-owned `connections` row.

---

## 3. Entity relationship overview

The principal relationships are:

- One user has many sessions.
- One user has many saved connections.
- One user has many query-history records.
- One user has many email-verification tokens.
- One user has many account-status-history records.
- One user may be referenced by many administrative audit records as administrator or target.
- One user has many execution requests.
- One saved connection may be referenced by many query-history records.
- Deleting a saved connection preserves query history and clears its connection foreign key.

### 3.1 Relationship and deletion summary

| Parent | Child | Logical deletion behavior |
|---|---|---|
| `users` | `sessions` | `ON DELETE CASCADE` |
| `users` | `connections` | `ON DELETE CASCADE` |
| `users` | `query_history` | `ON DELETE CASCADE` |
| `users` | `email_verification_tokens` | `ON DELETE CASCADE` |
| `users` | `account_status_history` | `ON DELETE CASCADE` |
| `users` | `admin_audit_logs.admin_user_id` | `ON DELETE SET NULL` |
| `users` | `admin_audit_logs.target_user_id` | `ON DELETE SET NULL` |
| `users` | `execution_requests` | Logical behavior finalized as `ON DELETE CASCADE`, subject to the account-deletion gate |
| `connections` | `query_history` | `ON DELETE SET NULL` |

The `execution_requests` relationship's physical foreign-key DDL is deferred. Permanent user deletion is not allowed until all associated execution requests are confirmed terminal.

The ER relationship description is conceptual, not executable DDL. It does not replace the detailed nullability, constraint, and deletion rules in this document.

---

## 4. Table design

### 4.1 `users`

**Purpose:** Stores application user identity, account status, role, and query-history preference.

| Column | Logical type | Null? | Default / rule |
|---|---|---:|---|
| `user_id` | `BIGINT UNSIGNED` | No | Auto-increment primary key |
| `email` | `VARCHAR(255)` | No | Unique; normalized for comparison |
| `password_hash` | `VARCHAR(255)` | No | Argon2id password hash |
| `email_verified_at` | `DATETIME` | Yes | NULL until verified |
| `account_status` | `VARCHAR(20)` | No | `active` |
| `role` | `VARCHAR(20)` | No | `user` |
| `query_history_enabled` | `BOOLEAN` | No | `TRUE` |
| `suspended_at` | `DATETIME` | Yes | Set while suspended; otherwise NULL |
| `created_at` | `DATETIME` | No | UTC creation time |
| `updated_at` | `DATETIME` | No | UTC last-update time |

Allowed account statuses:

- `active`
- `suspended`
- `pending_deletion`

Allowed roles:

- `user`
- `admin`

Rules:

- Public registration always creates a `user`; public input cannot assign the `admin` role.
- Email addresses are normalized consistently before uniqueness checks. Gmail dots and plus-addressing are not stripped.
- The exact case-insensitive uniqueness implementation (collation or normalized column) remains a physical-design decision.
- Passwords are stored only as Argon2id hashes. Plaintext passwords are never stored.
- Email verification is required before protected account functionality is available.
- `suspended_at` is populated when an account becomes suspended and cleared when it is restored.
- Valid transitions are:
  - `active` → `suspended` or `pending_deletion`
  - `suspended` → `active` or `pending_deletion`
  - `pending_deletion` → `active` only when deletion is cancelled before permanent deletion
- Permanent user deletion cascades the user's sessions, connections, query history, verification tokens, account-status history, and eligible execution requests.
- Administrative audit references to a deleted user are retained with the relevant user foreign key set to NULL.

### 4.2 `sessions`

**Purpose:** Stores server-side session records. Only a cryptographic digest of the session token is persisted.

| Column | Logical type | Null? | Default / rule |
|---|---|---:|---|
| `session_id` | `BIGINT UNSIGNED` | No | Auto-increment primary key |
| `user_id` | `BIGINT UNSIGNED` | No | FK to `users.user_id` |
| `token_hash` | `BINARY(32)` | No | Unique SHA-256 digest |
| `created_at` | `DATETIME` | No | UTC |
| `last_activity_at` | `DATETIME` | No | UTC |
| `idle_expires_at` | `DATETIME` | No | Seven-day idle expiry |
| `absolute_expires_at` | `DATETIME` | No | Thirty-day absolute expiry |
| `revoked_at` | `DATETIME` | Yes | NULL until revoked |
| `revocation_reason` | `VARCHAR(40)` | Yes | Required when revoked |

Rules:

- Multiple active sessions per user are allowed.
- The raw session token is returned to the client only through the secure cookie flow; only its SHA-256 digest is stored.
- Cookies must use `HttpOnly`, `Secure` in production, and an appropriate `SameSite` policy. CSRF protection is required for state-changing requests.
- Idle expiry is seven days. Absolute expiry is thirty days. Activity may refresh idle expiry but never extends absolute expiry.
- Password changes revoke all sessions, including the current session.
- Account suspension revokes all sessions.
- Supported revocation reasons are `logout`, `password_change`, `account_suspended`, `admin_action`, and `security_event`.
- Revocation timestamp and reason must either both be NULL or both be populated.
- Expiration and revocation timestamps must satisfy their relevant chronological constraints.
- The user foreign key uses `ON DELETE CASCADE`.
- Expired or revoked session rows may be removed by scheduled cleanup only after their original absolute expiry has passed.

Recommended indexes:

- Primary key on `session_id`
- Unique index on `token_hash`
- Index on `user_id`
- Index on `absolute_expires_at`

### 4.3 `connections`

**Purpose:** Stores user-owned connection configuration for external MySQL databases.

| Column | Logical type | Null? | Default / rule |
|---|---|---:|---|
| `connection_id` | `BIGINT UNSIGNED` | No | Auto-increment primary key |
| `user_id` | `BIGINT UNSIGNED` | No | FK to `users.user_id` |
| `connection_name` | `VARCHAR(100)` | No | User-facing name |
| `host` | `VARCHAR(255)` | No | Valid DNS name, IPv4, or IPv6 |
| `port` | `SMALLINT UNSIGNED` | No | `3306`; valid range 1–65535 |
| `database_name` | `VARCHAR(255)` | Yes | Optional default database |
| `username` | `VARCHAR(255)` | No | Trimmed; case preserved |
| `encrypted_password` | `BLOB` | Yes | AES-256-GCM ciphertext |
| `encryption_nonce` | `BINARY(12)` | Yes | GCM nonce |
| `encryption_auth_tag` | `BINARY(16)` | Yes | GCM authentication tag |
| `encryption_key_version` | `VARCHAR(50)` | Yes | Key-version identifier |
| `last_tested_at` | `DATETIME` | Yes | UTC |
| `last_test_status` | `VARCHAR(20)` | Yes | `successful` or `failed` |
| `config_version` | `BIGINT UNSIGNED` | No | Default `1`; optimistic concurrency version |
| `created_at` | `DATETIME` | No | UTC |
| `updated_at` | `DATETIME` | No | UTC |

Rules:

- A user owns their saved connections. Multiple users may independently connect to the same external database.
- Connection names contain 1–100 non-whitespace characters after trimming and are unique per user using case-insensitive comparison. Display capitalization is preserved.
- The exact normalized-name implementation and collation remain physical-design decisions.
- Hosts must be valid DNS names, IPv4, or IPv6 values. Reject URL schemes, paths, malformed hosts, and unsupported destination forms.
- Port values must be between 1 and 65535.
- Backend connection testing must enforce destination/network restrictions to reduce server-side request forgery and access to prohibited internal destinations.
- Empty passwords are normalized to passwordless connections.
- A connection may be saved without testing. Manual testing verifies connectivity and authentication; it does not run arbitrary SQL. Use a ten-second connection-test timeout.
- Password encryption uses AES-256-GCM. Store ciphertext, a 12-byte nonce, a 16-byte authentication tag, and a key-version identifier. Encryption keys remain outside the database and are accessible only to the backend.
- Credentials must never be returned to the frontend or written to application logs or error messages.
- The four encryption fields (`encrypted_password`, `encryption_nonce`, `encryption_auth_tag`, `encryption_key_version`) must be either all NULL or all populated.
- `last_tested_at` and `last_test_status` must either both be NULL or both be populated.
- `config_version` is finalized as `BIGINT UNSIGNED NOT NULL DEFAULT 1`.
- Every successful update to connection details or credentials increments `config_version`.
- A stale update must fail with HTTP 409 rather than silently overwriting newer configuration.
- A connection-test result is persisted only if the configuration version is unchanged from the version tested.
- `config_version` must never wrap or reset. If incrementing would overflow, reject the update and require operator intervention.
- The user foreign key uses `ON DELETE CASCADE`.
- Deleting a saved connection removes its configuration and encrypted credentials. Existing query-history rows remain, with `connection_id` set to NULL and `connection_name_snapshot` preserved.
- An execution that has already acquired the required resources may complete under the execution lifecycle rules. Deletion prevents new operations from using the deleted connection.

Recommended indexes:

- Primary key on `connection_id`
- Index on `user_id`
- Unique composite index on `(user_id, normalized_connection_name)`; exact normalized representation is deferred.

### 4.4 `query_history`

**Purpose:** Stores optional metadata for each actual SQL execution attempt. It is not the operational execution coordinator.

| Column | Logical type | Null? | Default / rule |
|---|---|---:|---|
| `history_id` | `BIGINT UNSIGNED` | No | Auto-increment primary key |
| `user_id` | `BIGINT UNSIGNED` | No | FK to `users.user_id` |
| `connection_id` | `BIGINT UNSIGNED` | Yes | FK to `connections.connection_id` |
| `connection_name_snapshot` | `VARCHAR(100)` | No | Name at execution time |
| `sql_statement` | `LONGTEXT` | No | Original submitted SQL |
| `status` | `VARCHAR(20)` | No | `running`, `successful`, `failed`, `cancelled` |
| `execution_time_ms` | `DECIMAL(12,3)` | Yes | Non-negative duration |
| `rows_returned` | `BIGINT UNSIGNED` | Yes | Number of rows included in the returned result window |
| `rows_affected` | `BIGINT UNSIGNED` | Yes | Affected-row count |
| `error_code` | `VARCHAR(100)` | Yes | Sanitized database/application code |
| `error_message` | `TEXT` | Yes | Sanitized error summary |
| `executed_at` | `DATETIME` | No | UTC attempt start |
| `completed_at` | `DATETIME` | Yes | UTC terminal completion |

Rules:

- Every actual execution attempt receives its own record when history is enabled. Duplicate SQL submissions are separate attempts.
- Create the history record when execution starts, then update it to a terminal state.
- Analysis-only, parse-only, and EXPLAIN-only operations are not execution attempts and do not create query-history records.
- Supported statuses are `running`, `successful`, `failed`, and `cancelled`.
- A running record has `completed_at = NULL`; a terminal record has a completion timestamp.
- `completed_at` must not precede `executed_at`. Duration must be NULL or non-negative.
- Measure duration using a server-side monotonic timer. The measurement includes the application/driver/network overhead represented by the execution path; it is not a pure MySQL server execution measurement.
- `rows_returned` represents the number of rows actually included in the returned result window. It does not represent or promise the total number of rows matching the SQL statement.
- Result truncation is communicated separately through the API's `truncated` and `truncationReason` fields. The history row count must not be interpreted as a total matching-row count when a result is truncated.
- `rows_returned` and `rows_affected` are independent and may be NULL when not applicable or unavailable.
- Store the original SQL statement when history is enabled. Warn users not to place secrets in SQL literals. Do not log full SQL by default in general application logs.
- Sanitize error messages and avoid storing credentials, secrets, or sensitive connection details.
- Full result datasets are not stored in query history by default.
- `users.query_history_enabled` controls whether new attempts are persisted. It defaults to TRUE. Disabling it stops new history persistence but does not delete existing history. Re-enabling resumes persistence.
- If history was enabled when an execution began, its record remains associated with that attempt even if the preference changes while it is running.
- The user foreign key uses `ON DELETE CASCADE`.
- The connection foreign key uses `ON DELETE SET NULL`.
- The backend must transactionally verify that the selected connection belongs to the executing user before starting an operation.
- For the built-in sample database, `connection_id` is NULL and `connection_name_snapshot` may contain the stable value `Built-in Sample Database`. The sample database is not represented by a user-owned `connections` row.
- Retain records for 90 days from `executed_at`, subject to the separate backup-retention policy.
- Individual history deletion requires ownership validation.

Recommended indexes:

- Primary key on `history_id`
- Composite index on `(user_id, executed_at, history_id)`
- Composite index on `(user_id, status, executed_at)`
- Composite index on `(user_id, connection_id, executed_at)`
- Index on `connection_id`
- Index on `executed_at`

History pagination uses a deterministic cursor ordered by `(executed_at, history_id)`, newest first. Both fields must be included in cursor comparisons and ordering. Default page size is 20; minimum is 1 and maximum is 100. Filtering and search must use parameterized queries.

### 4.5 `email_verification_tokens`

**Purpose:** Stores one-time verification-token digests for registration and email changes.

| Column | Logical type | Null? | Default / rule |
|---|---|---:|---|
| `token_id` | `BIGINT UNSIGNED` | No | Auto-increment primary key |
| `user_id` | `BIGINT UNSIGNED` | No | FK to `users.user_id` |
| `token_hash` | `BINARY(32)` | No | Unique SHA-256 digest |
| `purpose` | `VARCHAR(20)` | No | `registration` or `email_change` |
| `pending_email` | `VARCHAR(255)` | Yes | Required for email change |
| `expires_at` | `DATETIME` | No | UTC expiry |
| `used_at` | `DATETIME` | Yes | NULL until consumed |
| `created_at` | `DATETIME` | No | UTC creation time |

Rules:

- Generate tokens using a cryptographically secure random generator. Store only a SHA-256 digest, never the raw token.
- Tokens are single-use and expire after 30 minutes.
- A new token invalidates previous unused tokens for the same user and purpose.
- Registration verification applies to the account's registered email.
- Email-change verification stores the proposed address in `pending_email`. The current verified email remains active until the new address is successfully verified.
- Only one active email-change flow per user is allowed.
- Serialize concurrent email-change operations using a user-row lock.
- Replacing a token must atomically invalidate the previous unused token and insert the new token.
- Apply a 60-second resend interval and a maximum of five resends per hour per user and purpose. Also apply IP-based rate limiting.
- Use generic responses that do not disclose whether an account or email exists.
- `pending_email` must be NULL for registration and populated for email change.
- `expires_at` must be later than `created_at`; `used_at`, when populated, must not precede `created_at`.
- The user foreign key uses `ON DELETE CASCADE`.
- Used tokens are retained until their original expiry; expired and superseded tokens may be removed by scheduled cleanup.

Recommended indexes:

- Primary key on `token_id`
- Unique index on `token_hash`
- Composite index on `(user_id, purpose, created_at)`
- Index on `expires_at`

### 4.6 `account_status_history`

**Purpose:** Records each account-status transition.

| Column | Logical type | Null? | Default / rule |
|---|---|---:|---|
| `event_id` | `BIGINT UNSIGNED` | No | Auto-increment primary key |
| `user_id` | `BIGINT UNSIGNED` | No | FK to `users.user_id` |
| `previous_status` | `VARCHAR(20)` | Yes | NULL for initial state |
| `new_status` | `VARCHAR(20)` | No | Valid account status |
| `reason` | `VARCHAR(500)` | Yes | Optional, non-sensitive explanation |
| `changed_by` | `BIGINT UNSIGNED` | Yes | Admin user; NULL for system action |
| `created_at` | `DATETIME` | No | UTC event time |

Rules:

- Valid statuses are `active`, `suspended`, and `pending_deletion`.
- `previous_status` is NULL for an initial state. Otherwise it must be a valid status and differ from `new_status`.
- `changed_by` identifies an administrator when an administrator initiated the change; NULL identifies a system-initiated change.
- Reasons must not contain passwords, tokens, credentials, or other secrets. A populated reason must not be whitespace-only.
- The backend validates permitted transitions.
- Updating `users.account_status` and inserting the corresponding history row must occur in the same transaction.
- Lock the user row while validating and applying a transition to prevent concurrent conflicting updates.
- The user foreign key uses `ON DELETE CASCADE`.
- The `changed_by` foreign key uses `ON DELETE SET NULL`.
- Status history is retained until permanent deletion of the associated user.

Recommended indexes:

- Primary key on `event_id`
- Composite index on `(user_id, created_at)`
- Index on `changed_by`

### 4.7 `admin_audit_logs`

**Purpose:** Records administrative actions for accountability and security review.

| Column | Logical type | Null? | Default / rule |
|---|---|---:|---|
| `log_id` | `BIGINT UNSIGNED` | No | Auto-increment primary key |
| `admin_user_id` | `BIGINT UNSIGNED` | Yes | FK to `users.user_id` |
| `action` | `VARCHAR(100)` | No | Backend action registry |
| `target_user_id` | `BIGINT UNSIGNED` | Yes | FK to `users.user_id` |
| `details` | `JSON` | Yes | Structured, action-specific metadata |
| `ip_address` | `VARCHAR(45)` | Yes | IPv4 or IPv6 text |
| `created_at` | `DATETIME` | No | UTC event time |

Initial action registry:

- `suspend_user`
- `restore_user`
- `change_user_role`
- `initiate_account_deletion`
- `cancel_account_deletion`

Additional actions may be added through the backend registry. The database does not hard-code this list as a closed enum.

Rules:

- Store structured JSON details with an action-specific schema.
- Never store passwords, session tokens, verification tokens, connection credentials, encryption keys, or other secrets in audit details.
- Normal application operations are append-only: the admin interface must not edit or delete audit events.
- Database permissions must restrict direct modification. Application-level append-only behavior is not protection against a privileged database administrator.
- The successful administrative change and its audit record must commit in the same transaction.
- Trust client IP information only when supplied through correctly configured trusted proxies; do not blindly trust arbitrary forwarding headers.
- Retain audit records for at least 365 days, independently of query-history retention.
- Both administrator and target-user foreign keys use `ON DELETE SET NULL`, so audit events survive deletion of either account.

Recommended indexes:

- Primary key on `log_id`
- Composite index on `(admin_user_id, created_at)`
- Composite index on `(target_user_id, created_at)`
- Index on `created_at`

### 4.8 `execution_requests`

**Purpose:** Provides operational execution claiming, idempotency, lifecycle coordination, and recovery independently of optional query-history recording.

The logical design is finalized. The exact physical schema is deliberately deferred.

Logical data requirements include:

- User association
- Per-user execution request UUID
- A request fingerprint representing the canonical original execution request, including its target, SQL statement, and relevant execution options
- Lifecycle state
- Creation and completion timestamps
- Lease and heartbeat information
- Cancellation coordination information
- Recovery/reconciliation information
- Optionally, a non-sensitive result-cache generation identifier

The request fingerprint must be deterministic for the same canonical request and must allow the backend to detect reuse of an existing execution-request UUID with a different payload.

A keyed cryptographic HMAC is preferred for fingerprint generation. The HMAC key must remain outside the application database and must be accessible only to the backend. Any key-version information required for safe verification or rotation must be handled by the implementation.

The fingerprint is stored instead of storing the original SQL statement in `execution_requests`. It must cover the original target, submitted SQL, and relevant execution options so that a retry cannot silently change the meaning of an existing request.

The table must not store SQL statements, result datasets, passwords, connection credentials, or encryption keys.

#### Idempotency

- A request UUID is unique per user.
- The logical uniqueness rule is `(user_id, execution_request_id)`.
- A retry with the same UUID and a matching request fingerprint is an idempotent replay of the existing request.
- Reuse of the same UUID with a different request fingerprint must be rejected without starting another execution.
- The backend must not change the original target, SQL statement, or relevant execution options when replaying an existing request.
- A matching replay returns or observes the existing request and must not start a duplicate execution.
- An intentional rerun uses a new UUID.
- Execution tracking remains active even when query history is disabled.

#### Lifecycle states

Supported states:

- `claimed`
- `running`
- `successful`
- `failed`
- `cancelled`
- `recovery_required`

Permitted transitions:

- `claimed` → `running` or `failed`
- `running` → `successful`, `failed`, `cancelled`, or `recovery_required`
- `recovery_required` → `successful`, `failed`, or `cancelled`, but only after reconciliation
- Terminal states cannot transition back to active states.

#### Concurrency and coordination

- Initial per-user maximum: three active execution requests.
- Initial per-saved-connection maximum: two active execution requests.
- A global concurrency limit is configurable.
- `recovery_required` counts as active for concurrency limits.
- Claims must be made atomically while holding the necessary user and connection locks.
- The external database query runs outside the application-database transaction.
- An expired lease does not prove that the external MySQL operation has stopped.
- Cancellation is terminal only after termination has been confirmed. If termination is uncertain, the request must remain unresolved or enter `recovery_required`.
- Do not hold a long-running application-database transaction while waiting for an external query.

#### Result-cache association

- Query result datasets are ephemeral and are not stored in `query_history` or `execution_requests`.
- Result data is held temporarily in a bounded backend-process result cache.
- Cache entries are scoped to the authenticated user and `executionRequestId`.
- A non-sensitive cache-generation identifier may be stored with the execution request to associate it with a particular result-cache generation.
- The cache-generation identifier must allow the backend to distinguish a backend-process restart from result loss within the same process.
- Bounded in-memory tombstone metadata may be used to distinguish same-process expiry or eviction from other forms of result unavailability.
- Result-cache expiry, eviction, or process loss does not change the durable execution outcome recorded by the execution lifecycle.
- The cache is not a substitute for durable execution metadata.
- Cache lifetime and capacity are runtime policies defined by the query-execution design, not persistent database retention guarantees.

#### Retention and deletion

- Terminal requests are retained for 24 hours after completion during normal operation.
- Active requests remain until resolved.
- `recovery_required` requests remain until reconciled.
- The logical user foreign key uses `ON DELETE CASCADE` for permanent account deletion.
- This cascade is permitted only after the account-deletion coordinator confirms every associated request is terminal (`successful`, `failed`, or `cancelled`) and none remains `claimed`, `running`, or `recovery_required`.
- An uncertain or unresolved request blocks permanent account deletion.
- Permanent account deletion is an explicit exception to normal 24-hour terminal-request retention.
- Backup expiry remains governed by the separate backup-retention policy.

#### Physical design status

Before creating this table, finalize its exact columns and types, primary-key and UUID representation, request-fingerprint representation and key-version handling, lease and heartbeat fields, cancellation and recovery fields, constraints, indexes, and migration strategy. Do not create a speculative physical schema merely to make the table appear complete in an early migration.

---

## 5. Relationships and deletion behavior

### 5.1 Saved connection deletion

Deleting a saved connection requires explicit user confirmation and ownership validation.

- Remove the saved connection configuration and encrypted credentials.
- Preserve query-history records.
- Set historical `connection_id` values to NULL through the foreign-key behavior.
- Preserve `connection_name_snapshot` so the history remains understandable.
- Prevent new operations from using the deleted connection.
- An execution that has already acquired the required resources follows the execution coordinator's lifecycle and recovery rules.

### 5.2 Account deletion

Account deletion is a coordinated workflow, not an immediate unguarded DELETE.

1. Require an authenticated user and recent password confirmation.
2. Require explicit confirmation.
3. Transition the account to `pending_deletion`.
4. Revoke the user's sessions and block new protected operations.
5. Ask the execution coordinator to cancel or resolve active requests.
6. Wait until all execution requests are confirmed terminal.
7. If termination is uncertain, keep deletion pending and use controlled recovery; do not permanently delete the account.
8. Once the deletion gate is satisfied, permanently delete the user and dependent records according to the foreign-key rules.
9. Preserve administrative audit records with deleted-user references set to NULL.

Backup copies are governed by the separate backup-retention and expiry policy.

---

## 6. Data integrity and validation

### 6.1 Database-enforced rules

Use database constraints for durable invariants wherever supported and appropriate:

- Primary keys and foreign keys
- Unique constraints
- Required/non-null fields
- Allowed status and purpose values
- Numeric ranges
- Timestamp ordering
- Paired nullable fields
- Encryption-field consistency
- Verification-token purpose consistency

Use MySQL 8.x CHECK constraints where appropriate. The exact DDL and enforcement behavior must be verified against the deployed MySQL version.

### 6.2 Backend-enforced rules

The backend remains responsible for rules requiring authorization, workflow context, or coordination:

- User ownership of connections and history
- Authentication and authorization
- Permitted account-status transitions
- Session lifecycle
- Email-verification workflows
- Execution lifecycle and idempotency
- Request-fingerprint generation and comparison
- Concurrency limits and recovery
- Connection configuration-version checks
- Administrative permissions
- Transaction coordination

A foreign key does not replace authorization checks.

---

## 7. Transaction requirements

Related application-database changes must be atomic.

| Operation | Required transactional behavior |
|---|---|
| Registration | Create user and initial verification token consistently |
| Email verification | Consume token and update verification state atomically |
| Email change | Lock user, validate pending address, consume token, and update email atomically |
| Password change | Update password hash and revoke sessions atomically |
| Suspend / restore | Update account, revoke sessions when required, insert status history, and write audit event atomically |
| Role change | Update role and write audit event atomically |
| Deletion initiation | Update account state, revoke sessions, and record status/audit events atomically |
| Connection deletion | Validate ownership and delete the saved connection atomically |
| Execution claim | Claim/idempotency record and optional initial history record are coordinated atomically |
| Execution completion | Persist the final operational state and optional history outcome consistently |
| Administrative action | Apply the change and write its audit event in the same transaction |

### 7.1 External execution boundary

The application must establish an execution claim in a short application-database transaction. It then performs the external MySQL operation outside that transaction. The application must not hold an application-database transaction open for the duration of an arbitrary external query.

Completion, cancellation, and recovery are recorded in later short transactions.

### 7.2 Locking

Use explicit row locks where needed to serialize account transitions, email changes, connection configuration updates, and execution claims. Keep transactions short. Do not perform external network calls or email delivery while holding database locks.

The detailed lock order and concurrency procedures belong in `07-Concurrency-and-Transactions.md`.

---

## 8. Indexing strategy

Indexes must support actual application access patterns.

Principles:

- Every table has a primary key.
- Unique constraints support required uniqueness and idempotency.
- Foreign-key columns receive suitable indexes.
- Composite indexes follow the filtering and ordering patterns used by application queries.
- Avoid redundant indexes that increase write and storage costs.
- Validate important queries with `EXPLAIN`.
- Add further indexes only when representative workloads and measurements justify them.

The index lists in the table sections are logical recommendations. Final physical indexes must be checked against actual query patterns and the final column definitions.

---

## 9. Data retention and cleanup

| Data | Retention policy |
|---|---|
| Query history | 90 days from `executed_at` |
| Terminal execution requests | 24 hours after completion during normal operation |
| Active execution requests | Until resolved |
| `recovery_required` requests | Until reconciled |
| Email-verification tokens | Until expiry; cleanup may remove expired/superseded tokens |
| Sessions | Cleanup after original absolute expiry |
| Admin audit logs | At least 365 days |
| Account-status history | Until permanent deletion of the associated user |
| Deleted connection configuration | Remove on connection deletion |
| Historical connection snapshot | Retain with query history |

Backup and replica retention is a separate policy. Backup expiry, deletion propagation, and restoration procedures must be designed so that backup copies do not silently defeat the intended retention and deletion policies.

---

## 10. Security requirements

- Encrypt saved external database credentials using AES-256-GCM.
- Keep encryption keys outside the application database and source repository.
- Restrict credential decryption to backend code that needs it.
- Use least-privilege database accounts.
- Use parameterized SQL for application queries.
- Never log passwords, raw session tokens, verification tokens, encryption keys, or saved connection credentials.
- Avoid logging full SQL statements by default.
- Sanitize database errors before returning or persisting them.
- Enforce user ownership on every user-scoped resource operation.
- Protect session cookies and state-changing requests against CSRF.
- Rate-limit authentication and verification workflows.
- Encrypt backups and restrict access to them.
- Warn users not to include secrets in SQL literals that may be saved to query history.
- Keep request-fingerprint HMAC keys outside the application database and source repository.
- Never expose request-fingerprint key material to the frontend or include it in logs.

---

## 11. Backup and recovery policy

Initial target policy:

- Perform daily database backups.
- Retain the initial backup set for seven days.
- Encrypt backups at rest.
- Restrict backup access.
- Test restoration regularly.
- Document recovery procedures.
- Back up the credential-encryption key separately using an appropriately protected process.
- Define production recovery-point objective (RPO) and recovery-time objective (RTO) before production use.

These are target policies, not claims that a production backup system is already implemented. The deployment design must define the actual backup mechanism, key recovery, retention, and restore verification.

---

## 12. Migration strategy

All schema changes must be represented by ordered, version-controlled SQL migration files.

Migration requirements:

- Use sequential numeric prefixes and descriptive filenames.
- Track applied migrations in `schema_migrations`.
- Record a SHA-256 checksum for each applied migration.
- Apply pending migrations in order.
- Reject missing or modified previously applied migrations.
- Reject an applied migration history that is not a continuous prefix of the migration sequence.
- Serialize migration execution with a database advisory lock.
- Verify migrations in development and test environments before production.
- Back up production before risky schema changes.
- Treat applied migrations as immutable; use a new forward migration to correct a prior change.
- Record migration execution duration and outcome.

The current migration runner uses a dedicated migration connection with multi-statement execution for trusted migration files. The normal application pool must not enable multi-statement SQL execution.

MySQL DDL may cause implicit commits. Do not assume that a group of DDL statements can always be rolled back as one transaction. Design migration recovery accordingly.

`schema_migrations` is migration infrastructure, not one of the eight domain tables.

---

## 13. Environment separation

Maintain separate configuration and credentials for development, testing, and production.

- Do not use production credentials in development.
- Do not copy production user data into development or testing without appropriate sanitization.
- Keep secrets out of source control.
- Use environment-specific database users with least privilege.
- Keep the built-in sample database separate from the Queralyth application schema and use a dedicated read-only account for sample access.

---

## 14. Performance and operational health

### 14.1 Connection-pool targets

The following are initial design targets, not assertions about currently implemented runtime settings:

| Setting | Target |
|---|---:|
| Minimum pool connections | 2 |
| Maximum pool connections | 10 |
| Connection acquisition timeout | 5 seconds |
| Idle timeout | 60 seconds |
| Maximum connection lifetime | 30 minutes |

Actual pool settings must be verified against the implementation and hosting capacity before being described as active configuration.

### 14.2 Operational targets

- Initial lock-wait timeout target: 10 seconds.
- Initial slow-query threshold target: 500 ms.
- Use separate connection pools for the application database and external user databases.
- Paginate potentially large history and audit views.
- Run cleanup jobs in bounded batches.
- Provide database health checks.
- Return an appropriate service-unavailable response when the application database is unavailable.
- Do not blindly replay writes whose outcome is uncertain.
- Use `EXPLAIN` to inspect important application queries and revisit indexes when measurements justify it.

---

## 15. Database design decisions still requiring physical specification

The following items must be finalized before the corresponding SQL migrations are created:

1. Exact physical column layout for `execution_requests`.
2. Exact primary-key and UUID storage representation for `execution_requests`.
3. Exact lease, heartbeat, cancellation, and recovery fields for `execution_requests`.
4. Final normalized connection-name representation and its uniqueness implementation.
5. Exact MySQL 8.x collations for individual text fields, including email and connection-name comparison.
6. Final DDL for CHECK constraints and foreign keys.
7. Verification of indexes against representative application queries and actual query plans.
8. Exact request-fingerprint storage representation and key-version handling for `execution_requests`.

These are implementation-level specifications. They do not reopen the logical behavior already finalized in this document.

The `connections.config_version` type and behavior are finalized and are not deferred.

---

## 16. Related documents

- `01-System-Architecture.md`
- `02-Component-Design.md`
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

## 17. Document maintenance

This document is the consolidated logical database design baseline.

Actual SQL migrations, ER diagrams, API contracts, and implementation details must remain consistent with it. Where a physical detail is explicitly deferred, the corresponding migration must wait until that detail is resolved.

Changes to finalized database decisions must be justified and reflected in this document and the relevant technical decision records.
