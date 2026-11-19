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
11. Preserve the exact saved-connection configuration accepted for an execution independently of later connection updates or deletion.
12. Keep request-fingerprint key material outside the application database and associate each stored fingerprint with a non-secret key-version identifier.
13. Keep execution lifecycle records independent of optional query-history records.

---

## 2. Database overview

The logical application schema contains nine domain tables:

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
| `execution_connection_snapshots` | Immutable, protected configuration snapshots for accepted saved-connection executions |

The first seven tables have a logical schema described below. `execution_requests` and `execution_connection_snapshots` have finalized logical responsibilities and behavior, but their exact physical column layouts, key representations, lease fields, constraints, and indexes remain subject to the physical-design requirements in this document.

The built-in sample database is deployment infrastructure. It is not a user-owned `connections` row and does not require a user-owned connection snapshot.

### 2.1 Execution data separation

The database separates three responsibilities:

- `connections` stores the user's current saved connection configuration.
- `execution_connection_snapshots` preserves the immutable configuration accepted for a particular saved-connection execution.
- `execution_requests` tracks the operational execution lifecycle, idempotency, and recovery.

`query_history` is optional user-facing execution metadata. It is not the source of truth for execution lifecycle or recovery.

Deleting a saved connection or a query-history record must not invalidate an already accepted execution request.

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
- One execution request may have one optional query-history record.
- One execution request targeting a saved connection has one immutable execution-configuration snapshot.
- Deleting a saved connection preserves query history and clears its connection foreign key.
- Deleting a query-history record does not delete or alter its execution request.
- Deleting a saved connection does not delete an accepted execution's configuration snapshot.

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
| `execution_requests` | `query_history` association | Optional association; deleting history sets the association to NULL |
| `execution_requests` | `execution_connection_snapshots` | One-to-one logical relationship; snapshot is removed when its execution request is permanently removed |

The `execution_requests` and `execution_connection_snapshots` physical foreign-key DDL is deferred. Permanent user deletion is not allowed until all associated execution requests are confirmed terminal.

The execution-configuration snapshot does not depend on a foreign key to the original saved connection. It must survive deletion of that connection.

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
- Email verification is required before protected product functionality is available.
- An unverified user may establish an authenticated session after successful login. This session is restricted to verification and account-related operations.
- An authenticated but unverified user may access the current-session endpoint, verification-status information, registration email-verification functionality, and verification-email resend functionality subject to rate limits.
- An unverified user must not access protected product functionality, including saved connections, SQL analysis requiring protected account functionality, query execution, execution results, query history, or other protected workspace resources.
- Verification restrictions must be enforced by the backend on every protected request. Hiding frontend navigation or controls is not sufficient authorization.
- Successful email verification enables the normal protected functionality allowed by the account's status and role.
- A suspended or pending-deletion account remains subject to its account-status restrictions regardless of email-verification state.
- `suspended_at` is populated when an account becomes suspended and cleared when it is restored.
- Valid transitions are:
  - `active` → `suspended` or `pending_deletion`
  - `suspended` → `active` or `pending_deletion`
  - `pending_deletion` → `active` only when deletion is cancelled before permanent deletion
- Permanent user deletion cascades the user's sessions, connections, query history, verification tokens, account-status history, and eligible execution requests.
- Administrative audit references to a deleted user are retained with the relevant user foreign key set to NULL.
- Permanent account deletion is blocked while any associated execution request remains `claimed`, `running`, or `recovery_required`.

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
- An authenticated session does not imply that the associated account is verified or authorized to access protected product functionality.
- Every protected request must check the current account status and email-verification state in addition to session validity.
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
- A connection update request supplies the version the client expects to be current. The backend must compare that expected version against the stored version before applying the update.
- A stale update must fail with HTTP 409 rather than silently overwriting newer configuration.
- A successful update increments the stored version by exactly one in the same transaction as the configuration change.
- A connection-test result is persisted only if the configuration version is unchanged from the version tested.
- `config_version` must never wrap or reset. If incrementing would overflow, reject the update and require operator intervention.
- The user foreign key uses `ON DELETE CASCADE`.
- Deleting a saved connection removes its current configuration and encrypted credentials. Existing query-history rows remain, with `connection_id` set to NULL and `connection_name_snapshot` preserved.
- Deleting a saved connection must not delete or invalidate an already accepted execution's immutable configuration snapshot.
- An execution that has already acquired its required snapshot may complete under the execution lifecycle rules. Deletion prevents new operations from using the deleted connection.

Recommended indexes:

- Primary key on `connection_id`
- Index on `user_id`
- Unique composite index on `(user_id, normalized_connection_name)`; exact normalized representation is deferred.

### 4.4 `query_history`

**Purpose:** Stores optional metadata for each accepted SQL execution attempt. It is not the operational execution coordinator.

| Column | Logical type | Null? | Default / rule |
|---|---|---:|---|
| `history_id` | `BIGINT UNSIGNED` | No | Auto-increment primary key |
| `user_id` | `BIGINT UNSIGNED` | No | FK to `users.user_id` |
| `connection_id` | `BIGINT UNSIGNED` | Yes | FK to `connections.connection_id` |
| `connection_name_snapshot` | `VARCHAR(100)` | No | Name at execution acceptance |
| `sql_statement` | `LONGTEXT` | No | Original submitted SQL |
| `status` | `VARCHAR(20)` | No | `running`, `successful`, `failed`, `cancelled` |
| `execution_time_ms` | `DECIMAL(12,3)` | Yes | Non-negative duration |
| `rows_returned` | `BIGINT UNSIGNED` | Yes | Number of rows included in the returned result window |
| `rows_affected` | `BIGINT UNSIGNED` | Yes | Affected-row count |
| `error_code` | `VARCHAR(100)` | Yes | Sanitized database/application code |
| `error_message` | `TEXT` | Yes | Sanitized error summary |
| `accepted_at` | `DATETIME` | No | UTC time the execution request and history record were accepted |
| `executed_at` | `DATETIME` | Yes | UTC time external SQL execution begins |
| `completed_at` | `DATETIME` | Yes | UTC terminal completion |

Rules:

- Every accepted execution attempt receives its own history record when history is enabled. Duplicate SQL submissions are separate attempts.
- Create the history record in the same application-database transaction that establishes the execution claim. This is the execution acceptance boundary.
- `accepted_at` records when the execution request is accepted and the optional history record is created.
- `executed_at` records when the worker successfully transitions the request from `claimed` to `running` and is about to begin external SQL execution.
- `executed_at` remains NULL if the accepted request is cancelled or fails before external SQL execution starts.
- `completed_at` records when the attempt reaches a terminal outcome. It may be populated even when `executed_at` is NULL, such as when cancellation wins before external execution begins.
- `accepted_at` must not be NULL. When `executed_at` is populated, it must not precede `accepted_at`. When `completed_at` is populated, it must not precede `accepted_at` or a populated `executed_at`.
- The initial history status is `running` when the request is accepted. In this table, `running` means the attempt has been accepted and remains nonterminal; it does not by itself prove that external SQL execution has started. The operational execution state in `execution_requests` remains authoritative.
- Supported history statuses are `running`, `successful`, `failed`, and `cancelled`.
- A nonterminal history record has `completed_at = NULL`; a terminal record has a completion timestamp.
- Analysis-only, parse-only, and EXPLAIN-only operations are not execution attempts and do not create query-history records.
- Measure execution duration using a server-side monotonic timer when external execution starts. The measurement includes the application/driver/network overhead represented by the execution path; it is not a pure MySQL server execution measurement.
- `execution_time_ms` remains NULL when external execution never starts. Otherwise it is non-negative and represents the measured execution interval.
- `rows_returned` represents the number of rows actually included in the returned result window. It does not represent or promise the total number of rows matching the SQL statement.
- Result truncation is communicated separately through the API's `truncated` and `truncationReason` fields. The history row count must not be interpreted as a total matching-row count when a result is truncated.
- `rows_returned` and `rows_affected` are independent and may be NULL when not applicable or unavailable.
- Store the original SQL statement when history is enabled. Warn users not to place secrets in SQL literals. Do not log full SQL by default in general application logs.
- Sanitize error messages and avoid storing credentials, secrets, or sensitive connection details.
- Full result datasets are not stored in query history by default.
- `users.query_history_enabled` controls whether new attempts are persisted. It defaults to TRUE. Disabling it stops new history persistence but does not delete existing history. Re-enabling resumes persistence.
- The history preference is evaluated when the execution is accepted. If history is enabled at acceptance, its record remains associated with that attempt even if the preference changes while it is running.
- The user foreign key uses `ON DELETE CASCADE`.
- The connection foreign key uses `ON DELETE SET NULL`.
- The backend must transactionally verify that the selected connection belongs to the executing user before accepting an operation.
- For the built-in sample database, `connection_id` is NULL and `connection_name_snapshot` may contain the stable value `Built-in Sample Database`. The sample database is not represented by a user-owned `connections` row.
- Retain records for 90 days from `accepted_at`, subject to the separate backup-retention policy. This ensures accepted attempts that never reach external execution are still eligible for cleanup.
- Individual history deletion requires ownership validation.
- Deleting an individual history record must not cancel, fail, or otherwise change its associated execution request.
- The execution request remains independently available for status retrieval, idempotency, cancellation, and recovery after its optional history record is deleted.
- If an execution request maintains an association to its history record, deletion of the history row clears that association rather than deleting the execution request.
- A deleted history record must never be automatically recreated by later execution completion, cancellation, or recovery processing.
- If the history record no longer exists when execution completion is recorded, the backend updates the execution request only.

Recommended indexes:

- Primary key on `history_id`
- Composite index on `(user_id, accepted_at, history_id)`
- Composite index on `(user_id, status, accepted_at)`
- Composite index on `(user_id, connection_id, accepted_at)`
- Index on `connection_id`
- Index on `accepted_at`

History pagination uses a deterministic cursor ordered by `(accepted_at, history_id)`, newest first. Both fields must be included in cursor comparisons and ordering. Default page size is 20; minimum is 1 and maximum is 100. Filtering and search must use parameterized queries.

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
- A non-secret fingerprint key-version identifier
- Lifecycle state
- Creation and completion timestamps
- Lease and heartbeat information
- Cancellation coordination information
- Recovery/reconciliation information
- Optional association with a query-history record
- Association with an immutable execution-configuration snapshot when the target is a saved connection
- Optionally, a non-sensitive result-cache generation identifier

#### Request fingerprint and key version

The request fingerprint must be deterministic for the same canonical request and must allow the backend to detect reuse of an existing execution-request UUID with a different payload.

A keyed cryptographic HMAC is used for fingerprint generation. The HMAC key must remain outside the application database and must be accessible only to the backend.

Each stored fingerprint must be associated with a `fingerprint_key_version` identifier.

`fingerprint_key_version` is a non-secret identifier that selects the HMAC key version used to generate the stored fingerprint. It is not the HMAC key and must not contain key material.

The original key version is retained with the execution request so that a retry can be verified against the same key version that generated the original fingerprint.

Key-rotation rules:

- New execution requests use the currently active HMAC key version.
- Each new fingerprint is stored with its corresponding key-version identifier.
- A retry of an existing execution request is canonicalized and fingerprinted using the original request's stored key version.
- The backend must retain access to old HMAC key versions for at least as long as any retained execution request depends on them.
- Old keys must not be retired while active, unresolved, or retained terminal execution requests still require them for idempotency verification.
- Key retirement requires a controlled process that verifies no retained record depends on the retiring key version.
- HMAC key material must never be stored in the application database, frontend, logs, or execution-request records.

The fingerprint is stored instead of storing the original SQL statement in `execution_requests`. It must cover the original target, submitted SQL, and relevant execution options so that a retry cannot silently change the meaning of an existing request.

The table must not store plaintext SQL statements, result datasets, plaintext passwords, plaintext connection credentials, or HMAC key material.

Encrypted connection credentials belong to the protected execution-configuration snapshot, not to the execution-request record itself.

#### Idempotency

- A request UUID is unique per user.
- The logical uniqueness rule is `(user_id, execution_request_id)`.
- A retry with the same UUID and a matching request fingerprint is an idempotent replay of the existing request.
- Reuse of the same UUID with a different request fingerprint must be rejected without starting another execution.
- The backend must not change the original target, SQL statement, or relevant execution options when replaying an existing request.
- A matching replay returns or observes the existing request and must not start a duplicate execution.
- An intentional rerun uses a new UUID.
- Execution tracking remains active even when query history is disabled.
- A deleted query-history record does not invalidate the execution request or its idempotency record.

#### Lifecycle states

Supported states:

- `claimed`
- `running`
- `successful`
- `failed`
- `cancelled`
- `recovery_required`

Permitted transitions:

- `claimed` → `running`, `failed`, or `cancelled`
- `running` → `successful`, `failed`, `cancelled`, or `recovery_required`
- `recovery_required` → `successful`, `failed`, or `cancelled`, but only after reconciliation
- Terminal states cannot transition back to active states.

The `claimed` → `cancelled` transition supports cancellation before an external query begins.

#### Claim and cancellation race

The worker must atomically transition a request from `claimed` to `running` before starting external query execution.

A cancellation request and a worker's transition to `running` may race. Both operations must use a database-coordinated conditional state transition so that only one can win.

- If cancellation wins the transition from `claimed` to `cancelled`, the worker must not start external query execution.
- If the worker wins the transition from `claimed` to `running`, cancellation follows the normal running-execution cancellation process.
- A worker must not start the external query merely because it previously read the request as `claimed`. It must first successfully establish the `running` state.
- A request already in `cancelled` must never be started by a worker.
- A request already in `running` cannot be treated as cancelled solely because a cancellation request was received.
- For a running request, the backend must confirm actual external-query termination before recording `cancelled`.
- If external termination cannot be confirmed, the request remains unresolved or enters `recovery_required`.
- Resources associated with a claimed request cancelled before execution may be released once the winning transition guarantees that no worker can start it.
- Resources associated with a running request must not be released until termination is confirmed or recovery has established a safe terminal outcome.

Terminal cancellation must never be inferred merely from an expired lease, missing heartbeat, lost connection, or cancellation-request receipt.

#### Concurrency and coordination

- Initial per-user maximum: three active execution requests.
- Initial per-saved-connection maximum: two active execution requests.
- A global concurrency limit is configurable.
- `claimed`, `running`, and `recovery_required` count as active for concurrency limits.
- Claims must be made atomically while holding the necessary user and connection locks.
- The transition from `claimed` to `running` must be atomic and conditional on the current state.
- The external database query runs outside the application-database transaction.
- An expired lease does not prove that the external MySQL operation has stopped.
- Cancellation is terminal only after termination has been confirmed. If termination is uncertain, the request must remain unresolved or enter `recovery_required`.
- Do not hold a long-running application-database transaction while waiting for an external query.

#### Query-history association

- A request may be associated with one query-history record when history recording was enabled at acceptance.
- If history recording was disabled at acceptance, the request has no query-history association.
- The execution request remains fully tracked regardless of whether a history record exists.
- The history record is created at acceptance, not at the later start of external SQL execution.
- Its `accepted_at` timestamp records the acceptance boundary. Its `executed_at` timestamp remains NULL until external execution begins.
- Deleting the associated query-history record clears the optional association but does not delete or modify the execution request.
- Execution completion, cancellation, and recovery must tolerate a missing history record.
- A deleted history record must not be recreated automatically.
- The execution request's lifecycle and confirmed outcome remain independent of history-record availability.

#### Execution-configuration snapshot association

- An execution targeting a saved connection must be associated with an immutable configuration snapshot.
- The snapshot must represent the exact saved-connection configuration version validated and accepted for that execution.
- The execution request must retain a reference to its snapshot for its entire active and recovery lifecycle.
- Later updates to the saved connection must not alter the snapshot used by an already accepted execution.
- Deleting the saved connection must not delete the snapshot or invalidate an accepted execution.
- A new execution must validate and snapshot the latest valid saved-connection configuration.
- The snapshot must preserve the original connection name and configuration version for traceability.
- The execution request must not silently switch to a newer connection configuration during retry, replay, or recovery.
- Built-in sample database requests use the deployment's sample-database configuration and do not require a user-owned saved-connection snapshot.

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
- An execution-configuration snapshot must be retained for at least the lifetime of its associated active or unresolved execution request.
- A snapshot may be removed when its associated execution request is eligible for permanent cleanup, subject to the backup-retention policy.
- The logical user foreign key uses `ON DELETE CASCADE` for permanent account deletion.
- This cascade is permitted only after the account-deletion coordinator confirms every associated request is terminal (`successful`, `failed`, or `cancelled`) and none remains `claimed`, `running`, or `recovery_required`.
- An uncertain or unresolved request blocks permanent account deletion.
- Permanent account deletion is an explicit exception to normal 24-hour terminal-request retention.
- Backup expiry remains governed by the separate backup-retention policy.

#### Physical design status

Before creating this table, finalize its exact columns and types, primary-key and UUID representation, request-fingerprint representation, lease and heartbeat fields, cancellation and recovery fields, optional history association, snapshot association, constraints, indexes, and migration strategy.

The logical requirement for `fingerprint_key_version` is finalized and is not deferred.

Do not create a speculative physical schema merely to make the table appear complete in an early migration.

### 4.9 `execution_connection_snapshots`

**Purpose:** Preserves an immutable, protected copy of the saved-connection configuration accepted for an execution.

The logical design is finalized. The exact physical schema is deliberately deferred.

A snapshot is created for each accepted execution that targets a user-owned saved connection. It is associated with exactly one execution request.

Logical data requirements include:

- Snapshot identity
- Associated execution-request identity
- User association
- Original saved-connection identifier as a historical reference, not a deletion-dependent foreign key
- Original connection name
- Accepted `config_version`
- Host
- Port
- Database name, when configured
- Username
- Encrypted password ciphertext, when the connection is not passwordless
- Encryption nonce
- Encryption authentication tag
- Encryption key-version identifier
- Snapshot creation timestamp

#### Snapshot integrity

- The snapshot captures the exact configuration version validated when the execution is accepted.
- Snapshot creation and execution-claim creation must occur in the same application-database transaction.
- The backend must lock and validate the saved connection while capturing the snapshot so that a concurrent connection update or deletion cannot produce a partially mixed configuration.
- The snapshot must be immutable after acceptance.
- A retry or replay must use the original accepted snapshot. It must not capture a newer connection configuration.
- A new execution receives a new snapshot of the latest valid configuration.
- The original connection identifier is retained as historical context but must not be a foreign key that prevents connection deletion or causes snapshot deletion.
- The snapshot must not depend on the continued existence of the original `connections` row.
- The original connection name and configuration version remain available for execution traceability after connection deletion.

#### Credential protection

- Password credentials must be copied only as encrypted credential material.
- The snapshot must never store a plaintext password.
- AES-256-GCM protection uses the same logical credential-encryption requirements as saved connections.
- The snapshot stores the ciphertext, nonce, authentication tag, and encryption-key-version identifier required for backend decryption.
- The encryption key remains outside the application database and source repository.
- Credential decryption is restricted to backend execution code that needs the accepted configuration.
- Snapshot credential material must never be returned to the frontend, written to logs, or included in error responses.
- The four encryption fields must be either all NULL for a passwordless connection or all populated for a connection with an encrypted password.
- Credential-encryption key rotation must preserve the ability to decrypt snapshots that still belong to active or unresolved execution requests.
- Old credential-encryption keys must not be retired while retained snapshots still depend on them.

#### Snapshot creation and connection deletion

- The backend must verify the authenticated user's ownership of the saved connection.
- The backend must lock the connection row while validating its current configuration version and capturing the snapshot.
- The snapshot and execution claim must commit atomically.
- If snapshot creation or execution-claim creation fails, the transaction must roll back and external execution must not start.
- Connection updates and deletions must coordinate through the same saved-connection row so that acceptance cannot capture an inconsistent configuration.
- After the snapshot and execution claim commit, the original saved connection may be updated or deleted without changing the accepted execution.
- Deleting the saved connection must not cascade to the snapshot.
- The snapshot remains until the associated execution request is eligible for cleanup and no longer needs it for execution, cancellation, or recovery.

#### Built-in sample database

The built-in sample database is not represented by a user-owned saved connection.

- Sample-database execution requests do not require a user-owned execution-configuration snapshot.
- The sample database configuration is deployment-managed.
- Its credentials, if any, remain protected backend configuration and are not stored in user-owned connection records or execution snapshots.

#### Physical design status

Before creating this table, finalize its exact columns and types, primary key, unique execution-request association, foreign-key behavior, original connection identifier representation, encrypted credential representation, indexes, constraints, and migration strategy.

The logical requirements for immutable snapshots, credential protection, and independence from saved-connection deletion are finalized and are not deferred.

---

## 5. Relationships and deletion behavior

### 5.1 Saved connection deletion

Deleting a saved connection requires explicit user confirmation and ownership validation.

- Remove the saved connection configuration and encrypted credentials.
- Preserve query-history records.
- Set historical `connection_id` values to NULL through the foreign-key behavior.
- Preserve `connection_name_snapshot` so the history remains understandable.
- Prevent new operations from using the deleted connection.
- An accepted execution retains its immutable execution-configuration snapshot independently of the saved connection.
- Deleting a saved connection must not delete the execution snapshot or prevent an accepted execution from completing, being cancelled, or being recovered.
- An execution that has already acquired the required snapshot follows the execution coordinator's lifecycle and recovery rules.

### 5.2 Query-history deletion

Individual query-history deletion is independent of operational execution lifecycle.

- Require authentication and ownership validation.
- Delete only the selected history record.
- Do not cancel, fail, or modify the associated execution request.
- Do not delete the associated execution-configuration snapshot.
- If an execution request maintains an optional history-record reference, clear that reference through the defined deletion behavior.
- Allow execution status, cancellation, idempotency, and recovery operations to continue normally.
- Execution completion or recovery must not recreate a history record that the user deleted.

### 5.3 Account deletion

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

Permanent deletion may remove terminal execution requests and their associated execution snapshots as part of the account-deletion exception to normal retention.

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
- Timestamp ordering, including `accepted_at`, `executed_at`, and `completed_at` semantics
- Paired nullable fields
- Encryption-field consistency
- Verification-token purpose consistency
- Unique per-user execution-request UUID
- Valid fingerprint-key-version association
- One-to-one execution-request and execution-snapshot association
- Optional query-history association that does not make execution lifecycle dependent on history existence

Use MySQL 8.x CHECK constraints where appropriate. The exact DDL and enforcement behavior must be verified against the deployed MySQL version.

### 6.2 Backend-enforced rules

The backend remains responsible for rules requiring authorization, workflow context, or coordination:

- User ownership of connections and history
- Authentication and authorization
- Email-verification restrictions on protected functionality
- Permitted account-status transitions
- Session lifecycle
- Email-verification workflows
- Execution lifecycle and idempotency
- Request-fingerprint generation and comparison
- Selection of the original HMAC key version for retries
- Concurrency limits and recovery
- Connection configuration-version checks
- Atomic execution-configuration snapshot creation
- Snapshot immutability and credential decryption authorization
- Atomic cancellation and worker-claim coordination
- History deletion independence
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
| Connection deletion | Validate ownership and delete the saved connection atomically without deleting accepted execution snapshots |
| Connection update | Lock the connection, compare expected `configVersion`, apply changes, and increment the version atomically |
| Execution claim | Validate target, create execution claim, persist fingerprint and key version, create any required configuration snapshot, and create an optional initial history record with `accepted_at` atomically |
| Claimed cancellation | Atomically transition `claimed` to `cancelled` only if the worker has not already transitioned it to `running` |
| Worker start | Atomically transition `claimed` to `running` before starting external execution and record the actual start time in an associated history record, if present |
| Execution completion | Persist the final operational state and update the optional history outcome when its record still exists |
| History deletion | Delete only the owned history record and clear its optional execution association without changing execution lifecycle |
| Administrative action | Apply the change and write its audit event in the same transaction |

### 7.1 External execution boundary

The application must establish an execution claim in a short application-database transaction. For a saved-connection target, the transaction must also create the immutable configuration snapshot.

The application then transitions the claim from `claimed` to `running` before performing the external MySQL operation. The successful transition establishes the execution-start boundary represented by `executed_at` in an associated history record.

If cancellation wins while the request is still `claimed`, external execution must not start. In that case, the history record remains without an `executed_at` timestamp and is finalized as cancelled.

The external operation runs outside the application-database transaction. The application must not hold an application-database transaction open for the duration of an arbitrary external query.

Completion, cancellation, and recovery are recorded in later short transactions.

### 7.2 Locking

Use explicit row locks where needed to serialize account transitions, email changes, connection configuration updates, and execution claims.

For saved-connection execution acceptance:

- Lock the selected connection row.
- Validate ownership and current configuration.
- Capture the exact configuration and credential-encryption metadata.
- Create the execution request and immutable snapshot in the same transaction.
- Create the optional history record with its acceptance timestamp in that transaction.
- Commit before any external query is started.

Connection updates and deletions must use compatible locking so that a concurrent operation cannot alter or remove the connection between validation and snapshot creation.

For cancellation:

- Use a conditional state transition or row lock to serialize the cancellation request against the worker's `claimed` → `running` transition.
- Only one transition may win.
- A worker must confirm that its transition to `running` succeeded before starting external execution.

Keep transactions short. Do not perform external network calls or email delivery while holding database locks.

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

The physical index design for `execution_requests` must support at least:

- Lookup by authenticated user and execution-request UUID.
- Active execution lookup and recovery.
- Lease and heartbeat cleanup or reconciliation.
- Concurrency-limit enforcement.
- Fingerprint-key-version inspection for controlled key retirement.

The physical index design for `execution_connection_snapshots` must support:

- Lookup by its associated execution request.
- User-scoped authorization and retention processing.
- Controlled cleanup after the associated execution request is eligible for deletion.

---

## 9. Data retention and cleanup

| Data | Retention policy |
|---|---|
| Query history | 90 days from `accepted_at` |
| Terminal execution requests | 24 hours after completion during normal operation |
| Active execution requests | Until resolved |
| `recovery_required` requests | Until reconciled |
| Execution-configuration snapshots | At least as long as their associated execution request remains active, unresolved, or retained |
| Email-verification tokens | Until expiry; cleanup may remove expired/superseded tokens |
| Sessions | Cleanup after original absolute expiry |
| Admin audit logs | At least 365 days |
| Account-status history | Until permanent deletion of the associated user |
| Deleted connection configuration | Remove on connection deletion |
| Historical connection snapshot | Retain with query history |
| HMAC key versions | Retain while any retained execution request depends on them |
| Credential-encryption key versions | Retain while any retained saved connection or execution snapshot depends on them |

Query-history retention is measured from acceptance rather than external execution start. This gives every accepted attempt a defined retention period, including attempts cancelled before external SQL begins.

Backup and replica retention is a separate policy. Backup expiry, deletion propagation, and restoration procedures must be designed so that backup copies do not silently defeat the intended retention and deletion policies.

Cleanup must not remove an execution snapshot while its execution request remains active or unresolved.

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
- Enforce email-verification restrictions on every protected product request.
- Do not treat an authenticated session as proof that the account is verified.
- Protect session cookies and state-changing requests against CSRF.
- Rate-limit authentication and verification workflows.
- Encrypt backups and restrict access to them.
- Warn users not to include secrets in SQL literals that may be saved to query history.
- Keep request-fingerprint HMAC keys outside the application database and source repository.
- Never expose request-fingerprint key material to the frontend or include it in logs.
- Store the non-secret HMAC key-version identifier with each request fingerprint.
- Retain old HMAC keys for as long as retained execution requests require them for retry verification.
- Preserve accepted saved-connection configurations in immutable execution snapshots.
- Encrypt snapshot credentials using AES-256-GCM and protect them with the same backend-only access rules as saved connection credentials.
- Never store plaintext connection passwords in execution snapshots.
- Preserve the ability to decrypt retained snapshots when rotating credential-encryption keys.
- Do not allow connection deletion or history deletion to invalidate an accepted execution.
- Ensure that a worker cannot start an execution after cancellation has successfully won the `claimed` state transition.

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
- Back up request-fingerprint HMAC keys separately using an appropriately protected process.
- Preserve the ability to recover the HMAC and credential-encryption key versions required by retained execution records and snapshots.
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

`schema_migrations` is migration infrastructure, not one of the nine domain tables.

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
- Keep execution-claim, snapshot-creation, and cancellation transactions short.
- Avoid holding application-database locks while external queries are running.
- Monitor unresolved execution requests and snapshots retained by recovery-required requests.

---

## 15. Database design decisions still requiring physical specification

The following items must be finalized before the corresponding SQL migrations are created:

1. Exact physical column layout for `execution_requests`.
2. Exact primary-key and UUID storage representation for `execution_requests`.
3. Exact lease, heartbeat, cancellation, and recovery fields for `execution_requests`.
4. Exact physical representation of the optional query-history association.
5. Exact physical representation of the execution-configuration snapshot association.
6. Exact physical column layout for `execution_connection_snapshots`.
7. Exact primary key, unique constraints, and foreign-key behavior for execution snapshots.
8. Final normalized connection-name representation and its uniqueness implementation.
9. Exact MySQL 8.x collations for individual text fields, including email and connection-name comparison.
10. Final DDL for CHECK constraints and foreign keys.
11. Verification of indexes against representative application queries and actual query plans.
12. Exact request-fingerprint storage representation and the physical representation of `fingerprint_key_version`.
13. Exact encrypted credential snapshot representation and its constraints.

The following logical decisions are finalized and are not deferred:

- `connections.config_version` is `BIGINT UNSIGNED NOT NULL DEFAULT 1`, incremented exactly once for each successful configuration update and never allowed to wrap.
- Each stored execution fingerprint is associated with a non-secret `fingerprint_key_version`.
- A retry verifies the original request using its stored HMAC key version.
- An accepted saved-connection execution uses an immutable configuration snapshot.
- Snapshot credentials are encrypted and accessible only to the backend.
- An accepted execution snapshot survives updates and deletion of its original saved connection.
- The execution lifecycle is independent of optional query history.
- Deleting a history record does not change its execution request.
- Query-history acceptance and external execution start are represented by separate timestamps: `accepted_at` and nullable `executed_at`.
- Query-history retention is measured from `accepted_at`.
- `claimed` may transition to `cancelled`.
- A worker must atomically transition `claimed` to `running` before external execution begins.
- The winner of the cancellation-versus-worker-start transition determines whether external execution may begin.
- An unverified authenticated session is restricted to verification and account-related functionality.

These physical specifications must not reopen the logical behavior already finalized in this document.

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