# Queralyth — Database Design

**Document:** Database Design  
**Project:** Queralyth  
**Version:** 1.0  
**Status:** Consolidated design baseline  
**Database:** MySQL 8.x  
**Storage Engine:** InnoDB  
**Character Set:** utf8mb4  
**Timestamp Convention:** UTC

---

## 1. Introduction

### 1.1 Purpose

This document defines the logical and physical database design for Queralyth's application database.

It specifies:

- Database tables and their responsibilities.
- Columns, data types, and nullability.
- Primary and foreign keys.
- Relationships and deletion behavior.
- Constraints and validation requirements.
- Indexing strategy.
- Data retention and deletion policies.
- Transaction and integrity requirements.

### 1.2 Database Technology

Queralyth will use MySQL 8.x with the InnoDB storage engine.

Initial database configuration:

| Property | Decision |
|---|---|
| DBMS | MySQL 8.x |
| Storage engine | InnoDB |
| Character set | utf8mb4 |
| Collation | Appropriate MySQL 8.x collation, selected per field |
| Isolation level | REPEATABLE READ |
| Timestamp convention | UTC |
| Foreign-key enforcement | Enabled |
| Transaction support | InnoDB transactions |

The application database is separate from the external MySQL databases users connect to.

### 1.3 Database Design Principles

1. Enforce referential integrity through foreign keys.
2. Use appropriate database constraints.
3. Keep sensitive credentials encrypted.
4. Separate operational execution tracking from optional query history.
5. Preserve historical records where required.
6. Use transactions for related data modifications.
7. Avoid unnecessary indexes.
8. Enforce user ownership through backend authorization and transactional validation.
9. Use UTC consistently.
10. Keep database migrations version-controlled.

---

## 2. Database Overview

The application database contains eight logical tables:

| No. | Table | Responsibility |
|---:|---|---|
| 1 | `users` | User accounts and account preferences |
| 2 | `sessions` | Server-managed authentication sessions |
| 3 | `connections` | Saved external MySQL connection configurations |
| 4 | `query_history` | Records of actual query execution attempts |
| 5 | `email_verification_tokens` | Registration and email-change verification |
| 6 | `account_status_history` | Account-status transition history |
| 7 | `admin_audit_logs` | Administrator action audit records |
| 8 | `execution_requests` | Execution idempotency and operational lifecycle tracking |

The first seven tables have detailed logical schemas finalized in the preceding design discussions. The exact physical column layout of `execution_requests` (including lease/heartbeat fields and supporting indexes) will be finalized in its implementation-level design before creating its migration. Its user foreign key deletion behavior is finalized as `ON DELETE CASCADE`, subject to the deletion gate defined below.

---

## 3. Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o{ sessions : owns
    users ||--o{ connections : saves
    users ||--o{ query_history : generates
    users ||--o{ email_verification_tokens : receives
    users ||--o{ account_status_history : has
    users ||--o{ admin_audit_logs : administers
    users ||--o{ admin_audit_logs : targeted_by
    users ||--o{ execution_requests : initiates
    connections o|--o{ query_history : referenced_by

    users {
        BIGINT UNSIGNED user_id PK
        VARCHAR email UK
        VARCHAR password_hash
        DATETIME email_verified_at
        VARCHAR account_status
        VARCHAR role
        BOOLEAN query_history_enabled
        DATETIME suspended_at
        DATETIME created_at
        DATETIME updated_at
    }

    sessions {
        BIGINT UNSIGNED session_id PK
        BIGINT UNSIGNED user_id FK
        BINARY session_token_hash UK
        DATETIME created_at
        DATETIME last_activity_at
        DATETIME idle_expires_at
        DATETIME absolute_expires_at
        DATETIME revoked_at
        VARCHAR revocation_reason
    }

    connections {
        BIGINT UNSIGNED connection_id PK
        BIGINT UNSIGNED user_id FK
        VARCHAR connection_name
        VARCHAR host
        SMALLINT UNSIGNED port
        VARCHAR database_name
        VARCHAR username
        BLOB encrypted_password
        BINARY encryption_nonce
        BINARY encryption_auth_tag
        VARCHAR encryption_key_version
        DATETIME last_tested_at
        VARCHAR last_test_status
        BIGINT UNSIGNED config_version
        DATETIME created_at
        DATETIME updated_at
    }

    query_history {
        BIGINT UNSIGNED history_id PK
        BIGINT UNSIGNED user_id FK
        BIGINT UNSIGNED connection_id FK
        VARCHAR connection_name_snapshot
        LONGTEXT sql_statement
        VARCHAR execution_status
        DECIMAL execution_time_ms
        BIGINT rows_returned
        BIGINT rows_affected
        VARCHAR error_code
        TEXT error_message
        DATETIME executed_at
        DATETIME completed_at
    }

    email_verification_tokens {
        BIGINT UNSIGNED token_id PK
        BIGINT UNSIGNED user_id FK
        BINARY token_hash UK
        VARCHAR purpose
        VARCHAR pending_email
        DATETIME expires_at
        DATETIME used_at
        DATETIME created_at
    }

    account_status_history {
        BIGINT UNSIGNED event_id PK
        BIGINT UNSIGNED user_id FK
        VARCHAR previous_status
        VARCHAR new_status
        VARCHAR reason
        BIGINT changed_by FK
        DATETIME created_at
    }

    admin_audit_logs {
        BIGINT UNSIGNED log_id PK
        BIGINT admin_user_id FK
        VARCHAR action
        BIGINT target_user_id FK
        JSON details
        VARCHAR ip_address
        DATETIME created_at
    }

    execution_requests {
        BIGINT UNSIGNED execution_request_record_id PK
        BIGINT UNSIGNED user_id FK
        UUID execution_request_id
        VARCHAR state
        DATETIME created_at
    }
```

**Diagram qualification:** The `execution_requests` entity is shown conceptually. Its exact physical schema, including lease/heartbeat fields, result-cache generation metadata, and supporting indexes, remains to be finalized. Its `user_id` foreign key uses `ON DELETE CASCADE`, subject to the permanent-deletion gate documented below. The diagram is not executable DDL.

---

## 4. Table Design

### 4.1 `users`

**Purpose:** Stores individual user accounts, authentication information, account status, and account-level preferences.

| Column | Data type | Nullability / default |
|---|---|---|
| `user_id` | BIGINT UNSIGNED | NOT NULL, AUTO_INCREMENT, PK |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE |
| `password_hash` | VARCHAR(255) | NOT NULL |
| `email_verified_at` | DATETIME | NULL |
| `account_status` | VARCHAR(20) | NOT NULL, DEFAULT 'active' |
| `role` | VARCHAR(20) | NOT NULL, DEFAULT 'user' |
| `query_history_enabled` | BOOLEAN | NOT NULL, DEFAULT TRUE |
| `suspended_at` | DATETIME | NULL |
| `created_at` | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP, ON UPDATE CURRENT_TIMESTAMP |

**Allowed values**

`account_status`:
- `active`
- `suspended`
- `pending_deletion`

`role`:
- `user`
- `admin`

**Important rules**

- Passwords are stored as Argon2id password hashes, never plaintext.
- Email addresses are normalized before storage.
- Email uniqueness is case-insensitive.
- The same normalization applies during registration, login, and email changes.
- Gmail dots and plus-addressing are not removed.
- Public registration always assigns the `user` role.
- Users cannot modify their own roles.
- Protected administrator workflows handle role changes.
- Email verification is required before protected product functionality.
- `query_history_enabled` defaults to TRUE.
- `suspended_at` is set when an account is suspended and cleared when restored.
- All timestamps use UTC.

**Account status transitions**

| Current status | Permitted next status |
|---|---|
| active | suspended |
| active | pending_deletion |
| suspended | active |
| suspended | pending_deletion |
| pending_deletion | active, if recovered before permanent deletion |

Permanent deletion is a separate workflow.

**Indexes**

- `PRIMARY KEY (user_id)`
- `UNIQUE (email)`

**Deletion behavior**

Deleting a user cascades deletion to their sessions, saved connections, query history, verification tokens, and account-status history.

Administrator audit records are preserved, with their user references set to NULL.

---

### 4.2 `sessions`

**Purpose:** Stores server-managed authentication sessions.

| Column | Data type | Nullability / default |
|---|---|---|
| `session_id` | BIGINT UNSIGNED | NOT NULL, AUTO_INCREMENT, PK |
| `user_id` | BIGINT UNSIGNED | NOT NULL, FK |
| `session_token_hash` | BINARY(32) | NOT NULL, UNIQUE |
| `created_at` | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `last_activity_at` | DATETIME | NOT NULL |
| `idle_expires_at` | DATETIME | NOT NULL |
| `absolute_expires_at` | DATETIME | NOT NULL |
| `revoked_at` | DATETIME | NULL |
| `revocation_reason` | VARCHAR(30) | NULL |

**Important rules**

- Multiple active sessions per user are permitted.
- The browser receives an opaque, securely generated session token.
- Only its SHA-256 digest is stored in the database.
- The raw token is never stored.
- Individual and global session revocation are supported.
- Session cookies use appropriate HttpOnly, Secure, and SameSite settings.
- CSRF protection is required.
- Idle expiration: 7 days.
- Absolute expiration: 30 days after login.
- Activity refreshes idle expiration only.
- Activity never extends absolute expiration.
- Password changes revoke all existing sessions, including the current session.
- Account suspension revokes all active sessions.
- Server-side authentication checks session validity and account status.

**Allowed revocation reasons**

- `logout`
- `password_change`
- `account_suspended`
- `admin_action`
- `security_event`

**Constraints**

- `last_activity_at >= created_at`
- `idle_expires_at > last_activity_at`
- `absolute_expires_at > created_at`
- `revoked_at` and `revocation_reason` must either both be NULL or both be populated.

**Indexes**

- `PRIMARY KEY (session_id)`
- `UNIQUE (session_token_hash)`
- `INDEX idx_sessions_user_id (user_id)`
- `INDEX idx_sessions_cleanup (absolute_expires_at)`

**Foreign key**

`user_id` references `users.user_id` with `ON DELETE CASCADE`.

**Cleanup**

Revoked and expired session records are retained temporarily until their original absolute expiration has passed, then removed by scheduled cleanup.

---

### 4.3 `connections`

**Purpose:** Stores user-owned external MySQL connection configurations and encrypted credentials.

| Column | Data type | Nullability / default |
|---|---|---|
| `connection_id` | BIGINT UNSIGNED | NOT NULL, AUTO_INCREMENT, PK |
| `user_id` | BIGINT UNSIGNED | NOT NULL, FK |
| `connection_name` | VARCHAR(100) | NOT NULL |
| `host` | VARCHAR(255) | NOT NULL |
| `port` | SMALLINT UNSIGNED | NOT NULL, DEFAULT 3306 |
| `database_name` | VARCHAR(255) | NULL |
| `username` | VARCHAR(255) | NOT NULL |
| `encrypted_password` | BLOB | NULL |
| `encryption_nonce` | BINARY(12) | NULL |
| `encryption_auth_tag` | BINARY(16) | NULL |
| `encryption_key_version` | VARCHAR(50) | NULL |
| `last_tested_at` | DATETIME | NULL |
| `last_test_status` | VARCHAR(20) | NULL |
| `config_version` | BIGINT UNSIGNED | NOT NULL, DEFAULT 1 |
| `created_at` | DATETIME | NOT NULL |
| `updated_at` | DATETIME | NOT NULL |

**Important rules**

- Connections belong to individual users.
- Multiple saved connections may point to the same external MySQL server.
- Database name is optional.
- Default port is 3306.
- Valid TCP ports are 1–65535.
- Host validation supports DNS hostnames, IPv4, and IPv6.
- URL schemes, paths, and malformed host values are rejected.
- Backend destination restrictions protect against SSRF and unauthorized internal network access.
- Usernames are required, trimmed, and preserve case.
- Connection names contain 1–100 non-whitespace characters after trimming.
- Connection names are unique per user, case-insensitively.
- Original display capitalization is preserved.
- Empty passwords are normalized to passwordless connections.
- A connection can be saved without testing.
- Connection testing checks connectivity and authentication, not arbitrary SQL.
- Connection establishment timeout: 10 seconds.
- Testing is manually initiated, not automatically periodic.

**Credential encryption**

Saved passwords use AES-256-GCM.

The database stores:

- Ciphertext.
- Unique 12-byte nonce.
- 16-byte authentication tag.
- Encryption key-version identifier.

The encryption key is stored separately from the database.

Only authorized backend operations can decrypt credentials. Credentials must never be returned to the frontend or included in logs and error responses.

**Passwordless connection constraint**

The four encryption-related fields must be either:

- All NULL, or
- All populated.

**Connection-test constraint**

`last_tested_at` and `last_test_status` must both be NULL or both be populated.

Allowed test statuses:

- `successful`
- `failed`

A successful test only establishes that the connection worked at the time of testing.

**Optimistic concurrency**

`config_version` starts at 1 and increments whenever connection configuration or credentials change.

Updates must include the version previously loaded by the client.

A stale version results in HTTP 409 Conflict.

Connection-test results are saved only if the configuration version remains unchanged during testing.

**Indexes**

- `PRIMARY KEY (connection_id)`
- `INDEX idx_connections_user_id (user_id)`
- `UNIQUE uq_connections_user_name (user_id, normalized_connection_name)`

The normalized-name implementation must preserve the approved case-insensitive uniqueness behavior. The exact generated-column or collation implementation will be finalized during DDL design.

**Foreign key**

`user_id` references `users.user_id` with `ON DELETE CASCADE`.

**Deletion behavior**

Deleting a saved connection permanently removes its configuration and encrypted credentials.

Associated query-history records remain, with:

- `connection_id` set to NULL.
- `connection_name_snapshot` preserved.

Active executions that already acquired the resources required to finish may complete. Deleted credentials cannot be used for new operations.

---

### 4.4 `query_history`

**Purpose:** Records actual query execution attempts for a user's saved MySQL connections.

| Column | Data type | Nullability / default |
|---|---|---|
| `history_id` | BIGINT UNSIGNED | NOT NULL, AUTO_INCREMENT, PK |
| `user_id` | BIGINT UNSIGNED | NOT NULL, FK |
| `connection_id` | BIGINT UNSIGNED | NULL, FK |
| `connection_name_snapshot` | VARCHAR(100) | NOT NULL |
| `sql_statement` | LONGTEXT | NOT NULL |
| `execution_status` | VARCHAR(20) | NOT NULL |
| `execution_time_ms` | DECIMAL(12,3) | NULL |
| `rows_returned` | BIGINT UNSIGNED | NULL |
| `rows_affected` | BIGINT UNSIGNED | NULL |
| `error_code` | VARCHAR(100) | NULL |
| `error_message` | TEXT | NULL |
| `executed_at` | DATETIME | NOT NULL |
| `completed_at` | DATETIME | NULL |

**Allowed execution statuses**

- `running`
- `successful`
- `failed`
- `cancelled`

**Important rules**

- Every actual execution attempt receives its own history record.
- Identical SQL executed multiple times produces separate records.
- A history record is created when execution starts if history recording is enabled.
- The initial status is `running`.
- The final status is updated after execution resolves.
- Terminal statuses cannot transition back to `running`.
- Parsing-only submissions and analysis-only operations are excluded.
- EXPLAIN-only analysis is excluded from query history.
- Query history stores the original SQL statement.
- SQL statements may contain sensitive literal values, so users must be warned not to include passwords, API keys, or secrets.
- Full SQL statements are not logged by default.
- Error messages are sanitized.
- Complete query-result datasets are not stored by default.

**Timing and row statistics**

`executed_at` records execution start time.

`completed_at` records the time a terminal status is reached.

`execution_time_ms` is measured server-side using a monotonic timer. It represents the Queralyth-observed execution interval and may include driver and network overhead.

`rows_returned` and `rows_affected` are independent nullable fields.

**Constraints**

- Status must be one of the four permitted values.
- `completed_at` must be NULL while status is `running`.
- `completed_at` must be populated for terminal statuses.
- `completed_at >= executed_at`.
- `execution_time_ms` must be NULL or non-negative.

**Indexes**

- `PRIMARY KEY (history_id)`
- `INDEX idx_history_user_time (user_id, executed_at)`
- `INDEX idx_history_user_status_time (user_id, execution_status, executed_at)`
- `INDEX idx_history_user_connection_time (user_id, connection_id, executed_at)`
- `INDEX idx_history_connection_id (connection_id)`
- `INDEX idx_history_executed_at (executed_at)`

Cursor pagination uses `(executed_at, history_id)` for deterministic newest-first ordering.

Additional indexes will only be added where testing demonstrates a benefit.

**Query-history features**

- Newest-first ordering.
- Cursor-based pagination.
- Default page size of 20.
- Minimum page size of 1.
- Maximum page size of 100.
- Filtering by execution status and connection.
- SQL substring search using parameterized `LIKE`.
- Individual record deletion.
- Backend ownership checks.

**Retention**

Default retention is 90 days from `executed_at`, regardless of connection deletion.

Retention cleanup must also account for backups and replicas.

**Account-level opt-out**

`users.query_history_enabled` controls persistence of subsequent execution attempts.

- Default: TRUE.
- Disabling prevents persistence of subsequent attempts.
- Existing history remains.
- Re-enabling resumes persistence.
- If recording was enabled when execution started, its history record remains even if the preference changes while execution is running.

**Foreign keys**

- `user_id` references `users.user_id` with `ON DELETE CASCADE`.
- `connection_id` references `connections.connection_id` with `ON DELETE SET NULL`.

The backend must transactionally validate that a referenced connection belongs to the same user before recording the execution.

---

### 4.5 `email_verification_tokens`

**Purpose:** Stores hashed verification tokens for account registration and email changes.

| Column | Data type | Nullability / default |
|---|---|---|
| `token_id` | BIGINT UNSIGNED | NOT NULL, AUTO_INCREMENT, PK |
| `user_id` | BIGINT UNSIGNED | NOT NULL, FK |
| `token_hash` | BINARY(32) | NOT NULL, UNIQUE |
| `purpose` | VARCHAR(30) | NOT NULL |
| `pending_email` | VARCHAR(255) | NULL |
| `expires_at` | DATETIME | NOT NULL |
| `used_at` | DATETIME | NULL |
| `created_at` | DATETIME | NOT NULL |

**Allowed purposes**

- `registration`
- `email_change`

**Important rules**

- Tokens are generated using secure randomness.
- Only SHA-256 token digests are stored.
- Raw verification tokens are never stored.
- Tokens are single-use.
- Both purposes have a 30-minute expiry.
- New tokens invalidate previous unused tokens for the same user and purpose.
- Registration tokens use the user's existing account email.
- Email-change tokens store the proposed address in `pending_email`.
- The existing verified email remains active until the new address is verified.
- Only one active email-change request is allowed per user.
- Concurrent email-change requests are serialized through the user-row lock.

**Rate limits**

- Minimum 60 seconds between resend requests for the same user and purpose.
- Maximum five requests per hour for the same user and purpose.
- Additional IP-based rate limiting.
- Generic responses help prevent email account enumeration.

**Constraints**

- Purpose must be `registration` or `email_change`.
- `pending_email` must be NULL for registration.
- `pending_email` must be populated for email changes.
- `expires_at > created_at`.
- `used_at` must be NULL or greater than or equal to `created_at`.

**Indexes**

- `PRIMARY KEY (token_id)`
- `UNIQUE (token_hash)`
- `INDEX (user_id, purpose, created_at)`
- `INDEX (expires_at)`

**Foreign key**

`user_id` references `users.user_id` with `ON DELETE CASCADE`.

Used tokens remain until their original expiration time. Expired and superseded tokens are cleaned up through scheduled maintenance.

---

### 4.6 `account_status_history`

**Purpose:** Records changes to user account status.

| Column | Data type | Nullability / default |
|---|---|---|
| `event_id` | BIGINT UNSIGNED | NOT NULL, AUTO_INCREMENT, PK |
| `user_id` | BIGINT UNSIGNED | NOT NULL, FK |
| `previous_status` | VARCHAR(20) | NULL |
| `new_status` | VARCHAR(20) | NOT NULL |
| `reason` | VARCHAR(500) | NULL |
| `changed_by` | BIGINT UNSIGNED | NULL, FK |
| `created_at` | DATETIME | NOT NULL |

**Allowed statuses**

- `active`
- `suspended`
- `pending_deletion`

**Important rules**

- Each account-status transition creates a history event.
- `previous_status` is NULL for the initial status event.
- `new_status` must always contain a valid account status.
- `changed_by` identifies the administrator when an administrator initiates a change.
- `changed_by = NULL` represents a system-initiated change.
- Reason is optional and must not contain secrets.
- Allowed transitions are enforced by the backend account-status service.
- The account update and history insertion occur in the same transaction.

**Constraints**

- Previous status must be NULL or valid.
- New status must be valid.
- Previous and new statuses must differ when previous status is populated.
- Reason must be NULL or non-whitespace text.

**Indexes**

- `PRIMARY KEY (event_id)`
- `INDEX idx_status_history_user_time (user_id, created_at)`
- `INDEX idx_status_history_changed_by (changed_by)`

**Foreign keys**

- `user_id` references `users.user_id` with `ON DELETE CASCADE`.
- `changed_by` references `users.user_id` with `ON DELETE SET NULL`.

Permanent account deletion removes the user's account-status history.

---

### 4.7 `admin_audit_logs`

**Purpose:** Maintains audit records of privileged administrator actions.

| Column | Data type | Nullability / default |
|---|---|---|
| `log_id` | BIGINT UNSIGNED | NOT NULL, AUTO_INCREMENT, PK |
| `admin_user_id` | BIGINT UNSIGNED | NULL, FK |
| `action` | VARCHAR(50) | NOT NULL |
| `target_user_id` | BIGINT UNSIGNED | NULL, FK |
| `details` | JSON | NULL |
| `ip_address` | VARCHAR(45) | NULL |
| `created_at` | DATETIME | NOT NULL |

**Initial action identifiers**

- `suspend_user`
- `restore_user`
- `change_user_role`
- `initiate_account_deletion`
- `cancel_account_deletion`

Additional actions may be introduced through the backend's supported action registry without requiring a fixed action-value database constraint.

**Important rules**

- Audit logs use structured JSON details.
- Each action has a defined details schema.
- Secrets, passwords, tokens, and sensitive credentials must never be recorded.
- Logs are append-only through normal application operations.
- The administrative interface cannot edit or delete audit records.
- Privileged database access remains restricted.
- Corresponding successful administrator changes and audit events must be committed transactionally.
- Audit records are retained for at least 365 days.
- Audit retention is independent of query-history retention.
- The administrator's client IP is stored when reliably available.
- Arbitrary client-supplied IP headers are not trusted.
- Trusted-proxy configuration determines how client IPs are obtained.

**Indexes**

- `PRIMARY KEY (log_id)`
- `INDEX idx_audit_admin_time (admin_user_id, created_at)`
- `INDEX idx_audit_target_time (target_user_id, created_at)`
- `INDEX idx_audit_created_at (created_at)`

**Foreign keys**

- `admin_user_id` references `users.user_id` with `ON DELETE SET NULL`.
- `target_user_id` references `users.user_id` with `ON DELETE SET NULL`.

Audit records remain after administrator or target-account deletion. The corresponding user references become NULL.

**Integrity qualification**

Application-level append-only behavior does not make audit records tamper-proof against a sufficiently privileged database administrator. Stronger tamper resistance may be considered in a future version.

---

### 4.8 `execution_requests`

**Purpose:** Maintains operational execution-request idempotency and lifecycle tracking independently of optional query-history recording.

This table prevents duplicate execution attempts caused by repeated client submissions or retries.

**Finalized logical requirements**

The table must store:

- User association.
- Execution-request UUID.
- Execution lifecycle state.
- Creation and completion information.
- Heartbeat or lease information needed for operational recovery.
- Cancellation and recovery information where required.

It must not store:

- The SQL statement.
- Query result datasets.
- Database passwords.
- Encryption keys.

**Idempotency**

- Each execution request receives a UUID.
- The UUID is unique within a user account.
- The uniqueness constraint is `UNIQUE(user_id, execution_request_id)`.
- Repeated submissions with the same UUID return the existing request state.
- An intentional rerun receives a new UUID.
- Idempotency remains active even when query-history recording is disabled.

**Allowed states**

| State | Meaning |
|---|---|
| `claimed` | Request has been atomically registered |
| `running` | External query execution has started |
| `successful` | Execution completed successfully |
| `failed` | Execution failed |
| `cancelled` | Execution termination was confirmed |
| `recovery_required` | Execution outcome or termination requires reconciliation |

**Allowed transitions**

- `claimed` → `running` or `failed`
- `running` → `successful`, `failed`, `cancelled`, or `recovery_required`
- `recovery_required` → `successful`, `failed`, or `cancelled` after reconciliation
- Terminal states cannot transition back to active states.

**Concurrency**

- Maximum three simultaneous queries per user.
- Maximum two simultaneous queries per saved connection.
- Global execution capacity is configurable.
- `recovery_required` counts as active for concurrency limits.
- Claims are registered atomically under appropriate user and connection locks.
- Execution occurs outside the application database transaction.
- Expired leases require investigation; they do not prove that an external MySQL query has stopped.
- Cancellation only becomes terminal after termination is confirmed.

**Retention**

- Terminal records: 24 hours after completion.
- Active records: retained until resolved.
- `recovery_required` records: retained until reconciled.

**Physical schema status**

The logical behavior is finalized, but exact column names, data types, primary-key representation, timestamps, lease fields, cancellation fields, constraints, and indexes must be specified in the detailed execution-request schema before its migration is created.

---

## 5. Database Relationships and Deletion Policies

### 5.1 Relationship Summary

| Parent | Child | Relationship | Deletion behavior |
|---|---|---|---|
| users | sessions | 1:N | CASCADE |
| users | connections | 1:N | CASCADE |
| users | query_history | 1:N | CASCADE |
| users | email_verification_tokens | 1:N | CASCADE |
| users | account_status_history | 1:N | CASCADE |
| users | admin_audit_logs | 1:N, two roles | SET NULL |
| users | execution_requests | 1:N | Pending physical FK definition |
| connections | query_history | 1:N | SET NULL |

### 5.2 Connection Deletion

Deleting a connection:

1. Requires explicit user confirmation.
2. Permanently removes the saved connection configuration.
3. Removes its encrypted credentials.
4. Preserves query history.
5. Sets associated `query_history.connection_id` values to NULL.
6. Preserves `connection_name_snapshot`.
7. Prevents new operations from using the deleted connection.

An already-claimed execution may finish using resources it acquired before deletion, subject to execution recovery and cancellation policies.

### 5.3 Account Deletion

Account deletion follows a controlled workflow:

1. Require an authenticated session.
2. Require recent password confirmation.
3. Require explicit final confirmation.
4. Set the account to `pending_deletion`.
5. Revoke active sessions.
6. Block new operations.
7. Request cancellation of active executions.
8. Wait for confirmed execution termination or completion.
9. Permanently delete account-owned data through the deletion workflow.
10. Preserve administrator audit records.

If execution termination cannot be confirmed, permanent deletion remains pending until controlled recovery.

Backup copies are handled separately according to the backup-retention policy.

---

## 6. Data Integrity and Constraints

### 6.1 Database-Level Enforcement

Where supported and appropriate, MySQL constraints enforce:

- Primary-key uniqueness.
- Foreign-key integrity.
- Unique field requirements.
- NOT NULL requirements.
- Allowed enumerated values.
- Valid numeric ranges.
- Timestamp relationships.
- Encryption-field consistency.
- Token-purpose consistency.

MySQL CHECK constraints will be used for suitable row-level rules.

### 6.2 Backend-Level Enforcement

The backend remains responsible for:

- User ownership validation.
- Authentication and authorization.
- Account-status transitions.
- Session lifecycle.
- Email-verification workflows.
- Query-execution state transitions.
- Idempotency.
- Connection configuration versions.
- Administrative permissions.
- Transaction coordination.

The database cannot replace complete business-workflow enforcement.

### 6.3 Transaction Isolation

The application database will initially use InnoDB `REPEATABLE READ`.

Explicit row locking will be used where shared records must be modified safely.

Transactions must remain short. External network calls and email delivery must not occur while holding unnecessary database locks.

---

## 7. Transaction Requirements

The following workflows require atomic transaction handling:

| Workflow | Required consistency |
|---|---|
| Registration | User and verification-token creation |
| Email verification | Token use and account verification |
| Email change | Email update and token consumption |
| Password change | Password update and session revocation |
| Account suspension | Status update, session revocation, history, audit |
| Account restoration | Status update, history, audit |
| Deletion initiation | Status transition, history, session revocation |
| Connection deletion | Ownership validation and deletion |
| Query execution start | Execution claim and optional history insertion |
| Execution completion | Consistent terminal state updates |
| Administrator role change | Role update and audit event |

Detailed transaction sequences and lock-ordering rules belong in `07-Concurrency-and-Transactions.md`.

---

## 8. Indexing Strategy

Indexes are designed according to actual access patterns.

The approved indexes are specified in their respective table definitions.

General rules:

1. Primary keys identify records.
2. Unique indexes enforce uniqueness requirements.
3. Foreign-key columns receive appropriate supporting indexes.
4. Composite indexes reflect important filtering and ordering patterns.
5. Redundant indexes are avoided.
6. Application queries are inspected using MySQL EXPLAIN.
7. Index modifications are validated through performance testing.

Additional indexes must be justified by measured query behavior.

---

## 9. Data Retention Policies

| Data | Initial retention policy |
|---|---|
| Query history | 90 days from execution start |
| Terminal execution requests | 24 hours after completion |
| Active execution requests | Until resolved |
| Verification tokens | Until original expiration; then cleanup |
| Sessions | Until absolute expiration and cleanup |
| Administrator audit logs | At least 365 days |
| Account-status history | Until permanent account deletion |
| Deleted connection configuration | Permanently removed |
| Historical connection snapshot | Retained with query history |

Backup retention and deletion are handled independently from primary database retention.

---

## 10. Database Security and Privacy

### 10.1 Credential Protection

Saved external database passwords use AES-256-GCM authenticated encryption.

Encryption keys remain separate from application database storage.

### 10.2 Query-History Privacy

Stored SQL statements may contain sensitive literal values.

Queralyth will:

- Avoid logging full SQL statements by default.
- Sanitize error messages.
- Restrict history access to its owner.
- Support account-level history opt-out.
- Support individual history deletion.
- Apply the 90-day retention policy.
- Warn users not to include credentials or secrets in SQL statements.

### 10.3 Database Access

- Use dedicated application database credentials.
- Apply least-privilege access.
- Restrict production database access.
- Use parameterized queries.
- Keep environment secrets outside source control.
- Encrypt backups and restrict their access.

---

## 11. Backup and Recovery

Initial backup policy:

- Daily automated backups.
- Seven-day initial retention.
- Encrypted backup storage.
- Restricted access.
- Periodic restoration testing.
- Documented recovery procedures.
- Separate secure backup of the credential-encryption key.

RPO and RTO targets will be finalized before production deployment.

The backup implementation must respect the initial zero-cost hosting constraint.

---

## 12. Migration Strategy

All database schema changes will be maintained through version-controlled SQL migration files.

Rules:

1. Unique sequential migration identifiers.
2. Migration-tracking table.
3. Ordered execution.
4. Immutable applied migrations.
5. Development and testing verification.
6. Backups before risky production changes.
7. Safe rollback scripts where possible.
8. Forward-fix migrations when rollback is unsafe.

---

## 13. Environment Separation

Three environments will be maintained:

- Development.
- Testing.
- Production.

Each environment has separate credentials and configuration.

Production data must not be copied into development or testing without appropriate sanitization.

---

## 14. Database Performance and Health

Initial application database pool:

| Setting | Value |
|---|---:|
| Minimum connections | 2 |
| Maximum connections | 10 |
| Acquisition timeout | 5 seconds |
| Idle timeout | 60 seconds |
| Maximum connection lifetime | 30 minutes |

Additional policies:

- Lock-wait timeout: 10 seconds.
- Slow-query monitoring threshold: 500 ms.
- Separate external query connection pools.
- Backend-enforced pagination.
- Bounded cleanup batches.
- Lightweight health checks.
- Controlled outage handling using appropriate HTTP 503 responses.
- No blind replay of uncertain database writes.

---

## 15. Database Design Decisions Still Requiring Physical Specification

The following items must be resolved before final SQL migrations:

1. Exact physical column layout for `execution_requests`.
2. Exact primary-key and UUID storage representation for `execution_requests`.
3. Exact lease, heartbeat, cancellation, and recovery fields.
4. Exact physical primary-key and lease-field details for `execution_requests`; `config_version` is finalized as `BIGINT UNSIGNED`.
5. Final normalized connection-name implementation.
6. Exact MySQL 8.x collations for individual text fields.
7. Final DDL for all CHECK constraints and foreign keys.
8. Index verification against representative application queries.

These are implementation-level specifications, not reasons to reopen the already-approved logical behavior.

---

## 16. Related Documents

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

## 17. Document Maintenance

This document is the consolidated database design baseline.

Actual SQL migrations, ERDs, and implementation details must remain consistent with it.

Any changes to finalized database decisions must be justified and reflected in the relevant design documentation and technical decision records.

## Audit-approved database design clarifications

### Connection configuration version

`connections.config_version` is standardized as `BIGINT UNSIGNED NOT NULL DEFAULT 1`. It increments on every successful update to connection details or credentials. The ER diagram, detailed column definition, API optimistic-concurrency contract, and migration design must use this same type. Overflow must be handled as a failed update requiring operator intervention; the value must never wrap or reset. This decision is finalized and is no longer deferred.

### Built-in sample database is not a user connection row

The centrally managed sample database is deployment infrastructure, not a user-owned saved connection. It does not require a row in `connections`, does not store per-user sample credentials in that table, and does not change the ownership/FK model for user-saved connections. Query history may retain a stable `connection_name_snapshot` such as `Built-in Sample Database`; its `connection_id` is NULL for this system-provided target. Backend authorization and execution-request ownership still apply.

### Execution request deletion and account deletion

`execution_requests.user_id` uses `ON DELETE CASCADE` for permanent account deletion. This cascade is permitted only after the account-deletion coordinator has confirmed that every associated request is terminal (`successful`, `failed`, or `cancelled`) and no request remains `claimed`, `running`, or `recovery_required`. An uncertain or unresolved request blocks permanent deletion. During normal operation, terminal request rows are retained for 24 hours after completion; permanent account deletion is an explicit retention exception. Backup expiry remains governed by the separate backup-retention policy.

### Query result data is ephemeral

Complete result datasets are not persisted in `query_history` or `execution_requests`. The bounded result window is held temporarily in the backend process result cache described in `06-Query-Execution-Engine.md`. A non-sensitive cache-generation identifier may be stored with the execution request to distinguish backend restart from same-process cache loss; result rows themselves are never stored. Cache loss does not alter the durable execution outcome.

