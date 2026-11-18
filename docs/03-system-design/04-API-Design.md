# Queralyth — API Design

**Document:** API Design  
**Project:** Queralyth  
**Version:** 1.0  
**Status:** Consolidated API contract baseline  
**API Style:** REST  
**Communication:** HTTPS + JSON  
**Backend:** Node.js + Express  
**Frontend:** React (JavaScript)

---

## 1. Introduction

### 1.1 Purpose

This document defines the API contract between the Queralyth frontend and backend.

It establishes:

- API structure and naming conventions.
- Endpoint organization.
- HTTP methods and status codes.
- Request and response formats.
- Authentication and authorization requirements.
- Validation and error-handling standards.
- Query-execution lifecycle communication.
- Pagination and filtering conventions.
- API security requirements.
- Temporary query-result availability behavior.

### 1.2 API Architecture

Queralyth uses a REST-based API.

The frontend communicates with the backend through HTTP requests containing JSON data where appropriate.

The backend is responsible for:

1. Receiving and validating requests.
2. Authenticating users.
3. Authorizing requested operations.
4. Applying business rules.
5. Communicating with the application database.
6. Coordinating the query engine.
7. Communicating with external MySQL databases when authorized.
8. Managing execution lifecycle and recovery.
9. Returning structured responses.

The frontend never connects directly to the application database or external MySQL databases.

### 1.3 API Versioning

Initial API base path:

`/api/v1`

All application endpoints will be organized beneath this path.

Future breaking API changes may introduce a new version, such as `/api/v2`.

Non-breaking additions should remain compatible with the current version.

---

## 2. General API Conventions

### 2.1 HTTP Methods

| Method | Purpose |
|---|---|
| GET | Retrieve resources |
| POST | Create resources or initiate operations |
| PATCH | Partially update resources |
| PUT | Replace a resource where appropriate |
| DELETE | Delete resources |

The API will use methods according to their intended HTTP semantics.

### 2.2 Data Format

- Request bodies: JSON where a body is required.
- Response bodies: JSON.
- Character encoding: UTF-8.
- Timestamps: ISO 8601 UTC.
- Identifiers: serialized as strings in API responses where necessary to avoid JavaScript integer precision issues.

### 2.3 Naming Conventions

- Endpoint paths use lowercase kebab-case where multiple words are needed.
- JSON properties use camelCase.
- Resource identifiers are included in paths when operating on a specific resource.
- Collection endpoints return consistent pagination metadata.

Example:

`GET /api/v1/connections`

Example response:

```json
{
  "data": [
    {
      "connectionId": "104",
      "connectionName": "Development Database",
      "host": "db.example.com",
      "port": 3306,
      "databaseName": "application",
      "lastTestStatus": "successful"
    }
  ]
}
```

Sensitive connection credentials are never included in responses.

### 2.4 Common Response Structure

Successful responses generally use:

```json
{
  "data": {},
  "meta": {}
}
```

`meta` is optional and used when additional information is necessary, such as pagination or execution status.

Error responses use a consistent structure:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The submitted information is invalid.",
    "details": [
      {
        "field": "connectionName",
        "message": "A connection name is required."
      }
    ],
    "requestId": "request-identifier"
  }
}
```

Error details must not expose:

- Passwords or credentials.
- Session tokens.
- Encryption keys.
- Internal filesystem paths.
- Database connection strings containing secrets.
- Sensitive infrastructure details.
- Unnecessary SQL or internal stack traces.
- HMAC key material or other fingerprint-generation secrets.

---

## 3. Authentication API

All authentication endpoints are under:

`/api/v1/auth`

### 3.1 Register

**Endpoint:** `POST /api/v1/auth/register`

Purpose: Creates an individual user account.

Example request:

```json
{
  "email": "user@example.com",
  "password": "user-provided-password"
}
```

Expected behavior:

1. Validate and normalize the email.
2. Validate the password against the configured password policy.
3. Hash the password using Argon2id.
4. Create a user with the `user` role.
5. Create a registration verification token.
6. Commit account and token creation transactionally.
7. Initiate verification email delivery.

The account remains unverified until the verification process succeeds.

### 3.2 Login

**Endpoint:** `POST /api/v1/auth/login`

Purpose: Authenticates a user and establishes a server-managed session.

Example request:

```json
{
  "email": "user@example.com",
  "password": "user-provided-password"
}
```

Expected behavior:

- Normalize the email.
- Validate credentials.
- Check account status.
- Apply login rate limits.
- Create a secure session.
- Set the session cookie.
- Avoid returning the raw session token in JSON.

Generic authentication errors must not reveal whether an email address is registered.

### 3.3 Logout

**Endpoint:** `POST /api/v1/auth/logout`

Purpose: Revokes the current session.

Expected behavior:

- Identify the current authenticated session.
- Revoke it.
- Clear the browser session cookie.
- Return a successful response.

### 3.4 Current Session

**Endpoint:** `GET /api/v1/auth/session`

Purpose: Retrieves the current authentication state.

Example response:

```json
{
  "data": {
    "authenticated": true,
    "user": {
      "userId": "104",
      "email": "user@example.com",
      "emailVerified": true,
      "role": "user"
    }
  }
}
```

No password hashes, raw tokens, or private credential information are returned.

### 3.5 Password Change

**Endpoint:** `POST /api/v1/auth/change-password`

Purpose: Changes the authenticated user's password.

Expected behavior:

- Require current-password verification.
- Validate the new password.
- Generate a new Argon2id hash.
- Update the password and revoke all active sessions transactionally.
- Require the user to log in again.
- Send a security notification to the verified email address.

### 3.6 Email Verification

**Endpoint:** `POST /api/v1/auth/verify-email`

Example request:

```json
{
  "token": "verification-token"
}
```

Expected behavior:

- Validate the token hash.
- Verify its purpose and expiry.
- Enforce single-use behavior.
- Update the account verification timestamp.
- Mark the token as used transactionally.

### 3.7 Resend Verification Email

**Endpoint:** `POST /api/v1/auth/resend-verification`

Purpose: Requests another registration verification email.

Rate limits and generic responses must prevent email enumeration and abuse.

---

## 4. Account API

Base path:

`/api/v1/account`

All endpoints require authentication unless explicitly stated otherwise.

### 4.1 Retrieve Account

**Endpoint:** `GET /api/v1/account`

Returns the authenticated user's account information and relevant preferences.

### 4.2 Update Account Preferences

**Endpoint:** `PATCH /api/v1/account/preferences`

Example request:

```json
{
  "queryHistoryEnabled": false
}
```

Purpose: Updates account-level preferences.

The backend validates each supported preference and applies ownership automatically through the authenticated session.

### 4.3 Request Email Change

**Endpoint:** `POST /api/v1/account/email-change`

Purpose: Starts an email-change workflow.

Example request:

```json
{
  "newEmail": "new-address@example.com"
}
```

The existing verified email remains active until the proposed address is verified.

### 4.4 Confirm Email Change

**Endpoint:** `POST /api/v1/account/email-change/confirm`

Example request:

```json
{
  "token": "email-change-token"
}
```

The backend validates the token and updates the email transactionally.

### 4.5 Delete Account

**Endpoint:** `DELETE /api/v1/account`

Purpose: Initiates the authenticated user's account-deletion workflow.

Requirements:

- Recent password confirmation.
- Explicit confirmation.
- Session revocation.
- Blocking new account operations.
- Coordinated cancellation and resolution of active executions.
- Controlled permanent deletion.

Example request:

```json
{
  "password": "current-password",
  "confirmation": "DELETE_ACCOUNT"
}
```

The endpoint must not immediately delete account data while an external execution may still be active.

The response should communicate that deletion has been initiated or remains pending.

Permanent deletion is permitted only after the account-deletion coordinator confirms that all associated execution requests are terminal.

Requests in `claimed`, `running`, or `recovery_required` states block permanent deletion until their outcomes are resolved.

The deletion coordinator must not treat an expired execution lease as proof that an external database query has stopped.

Administrative audit records must survive account deletion. References to deleted administrators or target users must not prevent preservation of those records.

---

## 5. Session Management API

Base path:

`/api/v1/sessions`

### 5.1 List Sessions

**Endpoint:** `GET /api/v1/sessions`

Returns the authenticated user's session information.

Raw session tokens are never returned.

### 5.2 Revoke a Session

**Endpoint:** `DELETE /api/v1/sessions/:sessionId`

Revokes one session owned by the authenticated user.

### 5.3 Revoke Other Sessions

**Endpoint:** `POST /api/v1/sessions/revoke-others`

Revokes other active sessions while preserving the current session, subject to the security policy.

All operations require backend ownership validation.

---

## 6. Database Connection API

Base path:

`/api/v1/connections`

All connection resources are user-owned.

### 6.1 List Connections

**Endpoint:** `GET /api/v1/connections`

Returns saved connection metadata.

Passwords and encrypted credential material are never returned.

### 6.2 Create Connection

**Endpoint:** `POST /api/v1/connections`

Example request:

```json
{
  "connectionName": "Development Database",
  "host": "db.example.com",
  "port": 3306,
  "databaseName": "application",
  "username": "app_user",
  "password": "user-provided-password"
}
```

Password may be omitted for a passwordless connection.

Expected behavior:

1. Validate connection fields.
2. Normalize the connection name.
3. Validate name uniqueness for the authenticated user.
4. Validate the destination according to backend network restrictions.
5. Encrypt a supplied password.
6. Save the configuration.
7. Initialize `configVersion` to 1.
8. Return non-sensitive connection metadata.

Saving a connection does not automatically establish that it works.

### 6.3 Retrieve Connection

**Endpoint:** `GET /api/v1/connections/:connectionId`

Returns connection metadata for the specified user-owned connection.

### 6.4 Update Connection

**Endpoint:** `PATCH /api/v1/connections/:connectionId`

Example request:

```json
{
  "connectionName": "Updated Development DB",
  "host": "db.example.com",
  "port": 3307,
  "databaseName": "application",
  "username": "app_user",
  "password": "new-password",
  "configVersion": 2
}
```

The password field may be omitted when the existing credential should remain unchanged. An explicitly empty password is normalized to a passwordless configuration.

Expected behavior:

- Validate ownership.
- Validate the submitted configuration version.
- Reject stale updates with HTTP 409.
- Encrypt any replacement password.
- Increment `configVersion`.
- Reset previous connection-test information.
- Update configuration atomically.

`configVersion` must increment on every successful configuration update. It must never wrap or reset. An update that would exceed the supported integer range must fail rather than reuse an earlier version.

The database representation is `BIGINT UNSIGNED NOT NULL DEFAULT 1`.

### 6.5 Delete Connection

**Endpoint:** `DELETE /api/v1/connections/:connectionId`

Requires explicit user confirmation through the frontend workflow.

The backend permanently deletes the connection configuration and encrypted credentials.

Historical query records remain preserved.

The associated `query_history.connection_id` is set to NULL, while the connection-name snapshot remains available.

An execution that has already acquired the required resources may complete under the execution lifecycle rules. Deletion prevents new operations from using the deleted connection.

### 6.6 Test Connection

**Endpoint:** `POST /api/v1/connections/:connectionId/test`

Purpose: Tests connectivity and authentication for a saved connection.

Expected behavior:

1. Validate ownership.
2. Capture the current configuration version.
3. Acquire the required credentials.
4. Attempt a connection.
5. Apply a 10-second connection-establishment timeout.
6. Close or release the test connection.
7. Save the test result only if the configuration version has not changed.

A stale test result must not overwrite a newer configuration's status.

---

## 7. SQL Analysis API

Base path:

`/api/v1/analysis`

These endpoints perform analysis without executing the submitted SQL as a normal query-execution request.

Analysis-only submissions are not stored in query history.

### 7.1 Parse SQL

**Endpoint:** `POST /api/v1/analysis/parse`

Purpose:

- Parse supported SQL.
- Detect syntax errors.
- Return a structured representation when parsing succeeds.

Example request using a saved connection:

```json
{
  "target": {
    "type": "saved_connection",
    "connectionId": "104"
  },
  "sql": "SELECT id, name FROM users WHERE id = 10"
}
```

The backend validates access to the selected connection and applies the supported SQL grammar.

The target may alternatively identify the built-in sample database:

```json
{
  "target": {
    "type": "builtin_sample"
  },
  "sql": "SELECT id, name FROM users WHERE id = 10"
}
```

### 7.2 Generate Logical Representation

**Endpoint:** `POST /api/v1/analysis/logical-plan`

Purpose: Generates the supported logical representation of a parsed query.

The MVP provides a basic logical operator tree.

Formal relational algebra transformations and advanced interactive manipulation are outside the initial scope.

### 7.3 Retrieve MySQL Execution Plan

**Endpoint:** `POST /api/v1/analysis/explain`

Purpose: Retrieves and interprets MySQL's estimated execution plan for a supported query.

Expected behavior:

- Validate the request.
- Validate the selected target.
- Validate saved-connection ownership when applicable.
- Apply the SQL validation policy.
- Obtain the relevant execution-plan information.
- Return a structured interpretation.
- Avoid storing an ordinary query-execution history record.

The MVP focuses on MySQL EXPLAIN.

EXPLAIN ANALYZE and deeper actual-runtime investigation are deferred.

### 7.4 Optimization Analysis

**Endpoint:** `POST /api/v1/analysis/optimization`

Purpose: Produces contextual optimization observations and recommendations based on supported query and database metadata.

Recommendations must be evidence-grounded and must not guarantee performance improvements.

---

## 8. Query Execution API

Base path:

`/api/v1/executions`

This API coordinates actual query execution through the backend query engine.

### 8.1 Start Execution

**Endpoint:** `POST /api/v1/executions`

Example request using a saved connection:

```json
{
  "target": {
    "type": "saved_connection",
    "connectionId": "104"
  },
  "executionRequestId": "550e8400-e29b-41d4-a716-446655440000",
  "sql": "SELECT id, name FROM users LIMIT 100"
}
```

Example request using the built-in sample database:

```json
{
  "target": {
    "type": "builtin_sample"
  },
  "executionRequestId": "550e8400-e29b-41d4-a716-446655440001",
  "sql": "SELECT id, name FROM users LIMIT 100"
}
```

The `executionRequestId` is a client-generated UUID.

The `target` object must match exactly one supported target format:

- `{ "type": "saved_connection", "connectionId": "..." }`
- `{ "type": "builtin_sample" }`

The built-in sample target accepts no client-supplied host, port, database name, username, or credentials.

#### Request fingerprint

Every accepted execution request must have a deterministic canonical request representation and a corresponding request fingerprint.

The fingerprint covers all input that determines the meaning of the execution request, including:

- Target type.
- Saved connection identifier when applicable.
- Submitted SQL statement.
- Relevant execution options.

The canonicalization process must be deterministic: semantically identical request payloads represented with different JSON property ordering must produce the same canonical representation and fingerprint.

The backend generates the fingerprint using a secure keyed cryptographic HMAC. HMAC key material remains exclusively in backend-controlled secret configuration and must never be returned to the frontend, stored in the application database, or included in logs.

The database stores the fingerprint, not the original SQL statement in `execution_requests`. The original SQL may separately be stored in `query_history` when the user's history preference permits it.

The fingerprint is bound to the authenticated user's execution-request UUID through the corresponding `execution_requests` record. It is not an authentication credential or a replacement for authorization.

The fingerprint must be calculated from validated, canonical request data before an existing request is classified as a matching replay or a conflicting reuse.

#### Expected backend workflow

1. Authenticate the user.
2. Validate the request structure and `executionRequestId` UUID.
3. Check account status and permissions.
4. Validate and canonicalize the execution request.
5. Generate its request fingerprint using the backend-held HMAC key.
6. Look up an existing request using the authenticated user and `executionRequestId`.
7. If an existing request has a matching fingerprint, return the existing execution resource as an idempotent replay without starting another execution.
8. If an existing request has a different fingerprint, reject the request with HTTP 409 Conflict. Do not modify the original request, start another execution, or create another query-history record.
9. If no existing request exists, validate the selected target and, for a saved connection, verify ownership.
10. Parse and validate the SQL against the supported allowlist before accepting the operation.
11. Begin an application-database transaction.
12. Atomically register the execution claim, persist its fingerprint, and enforce the applicable concurrency limits.
13. If query-history recording is enabled, create the corresponding `running` query-history record in the same transaction.
14. Commit the transaction before beginning external query execution.
15. If claim creation, fingerprint persistence, or required query-history creation fails, roll back the transaction. Do not start external execution.
16. Execute through the query engine outside the application-database transaction.
17. Record the terminal execution state and update the associated query-history record when one exists.
18. Return the appropriate execution information.

The execution claim, request fingerprint, and required query-history record must be created atomically when history recording is enabled.

If history recording is disabled, execution-request tracking and lifecycle management remain active without creating a query-history record.

The history preference is evaluated when the execution is accepted. If history was enabled at that point, its record remains associated with the attempt even if the preference changes while execution is running.

Duplicate requests with the same UUID and matching fingerprint must not initiate another execution or create another query-history record.

Reusing a UUID with a different fingerprint is a conflict, not a new execution and not a valid replay.

An intentional rerun must use a new UUID.

A failure to persist the terminal outcome must be handled through the execution recovery mechanism. The backend must not falsely report a confirmed successful or failed outcome when the actual outcome is uncertain.

#### Acceptance response

A newly accepted request returns 202 Accepted:

```json
{
  "data": {
    "executionRequestId": "550e8400-e29b-41d4-a716-446655440000",
    "state": "claimed",
    "statusUrl": "/api/v1/executions/550e8400-e29b-41d4-a716-446655440000",
    "cancelUrl": "/api/v1/executions/550e8400-e29b-41d4-a716-446655440000/cancel"
  },
  "meta": {
    "replayed": false
  }
}
```

A duplicate request with the same UUID and matching fingerprint returns the same resource with `meta.replayed: true`.

Active requests return 202 and terminal requests return 200.

A replay never changes the original accepted target, SQL, or relevant execution options.

A UUID reuse conflict returns HTTP 409 Conflict:

```json
{
  "error": {
    "code": "IDEMPOTENCY_KEY_REUSED",
    "message": "This execution request identifier has already been used with a different request."
  }
}
```

The conflicting request does not change the original execution resource and does not initiate another execution.

Validation, authorization, and concurrency rejections are returned as errors. A rejected request must not be represented as an accepted execution.

#### Idempotency behavior

- The idempotency key is scoped to the authenticated user.
- The logical uniqueness rule is `(user_id, execution_request_id)`.
- A request fingerprint is generated from the canonical target, SQL, and relevant execution options.
- Repeating the same UUID with the same fingerprint returns the existing execution resource.
- Reusing the same UUID with a different fingerprint returns HTTP 409 Conflict with error code `IDEMPOTENCY_KEY_REUSED`.
- A conflicting reuse must not overwrite the original fingerprint or accepted request details.
- A replay must not initiate another execution.
- A replay must not create another query-history record.
- A conflicting reuse must not initiate an execution or create another query-history record.
- Concurrent submissions with the same user and UUID must resolve to one accepted request. The database uniqueness rule and transaction/locking strategy must prevent duplicate claims.
- If concurrent submissions carry different fingerprints, at most one may establish the original request. The other must receive the idempotency conflict response.
- An intentional rerun requires a new UUID.
- The frontend must retain the original UUID when retrying the same logical submission after a network interruption. It must generate a new UUID only for an intentional new execution.

### 8.2 Retrieve Execution Status

**Endpoint:** `GET /api/v1/executions/:executionRequestId`

Returns the current execution state for a request owned by the authenticated user.

The response includes:

- `executionRequestId`
- `state`
- `createdAt`
- `startedAt`, when available
- `completedAt`, when available
- `resultAvailable`
- `resultUnavailableReason`
- Result metadata and bounded result data when available

The state must be one of:

- `claimed`
- `running`
- `successful`
- `failed`
- `cancelled`
- `recovery_required`

`resultAvailable` is always a boolean.

#### Result availability rules

`resultUnavailableReason` follows these rules:

- `null` when `resultAvailable` is true.
- `null` while an execution is non-terminal and has not produced a result.
- `expired` when the result cache entry expired.
- `evicted` when the result cache entry was evicted during the current backend process lifetime.
- `backend_restart` when the result cache was lost because the backend process restarted.
- `unavailable` when a terminal execution has no retrievable result and a more specific reason cannot be established.

Example response when results are available:

```json
{
  "data": {
    "executionRequestId": "550e8400-e29b-41d4-a716-446655440000",
    "state": "successful",
    "createdAt": "2026-11-18T14:00:00Z",
    "startedAt": "2026-11-18T14:00:01Z",
    "completedAt": "2026-11-18T14:00:03Z",
    "resultAvailable": true,
    "resultUnavailableReason": null,
    "result": {
      "columns": ["id", "name"],
      "rows": [
        [1, "Example"]
      ],
      "returnedRows": 1,
      "truncated": false,
      "truncationReason": null
    }
  }
}
```

Example response while execution is still running:

```json
{
  "data": {
    "executionRequestId": "550e8400-e29b-41d4-a716-446655440000",
    "state": "running",
    "createdAt": "2026-11-18T14:00:00Z",
    "startedAt": "2026-11-18T14:00:01Z",
    "resultAvailable": false,
    "resultUnavailableReason": null
  }
}
```

Example response when results are unavailable after a backend restart:

```json
{
  "data": {
    "executionRequestId": "550e8400-e29b-41d4-a716-446655440000",
    "state": "successful",
    "createdAt": "2026-11-18T14:00:00Z",
    "completedAt": "2026-11-18T14:00:03Z",
    "resultAvailable": false,
    "resultUnavailableReason": "backend_restart"
  }
}
```

The confirmed execution outcome remains available independently of temporary result availability.

The backend must never re-execute SQL automatically to reconstruct missing results.

Execution status retrieval must not change the execution lifecycle state.

### 8.3 Cancel Execution

**Endpoint:** `POST /api/v1/executions/:executionRequestId/cancel`

Purpose: Requests cancellation of an active execution.

Cancellation is not considered successful merely because the request was received.

Return 202 Accepted while termination is pending.

If the request is already terminal, return 200 with its actual state.

The backend must confirm actual termination before setting the execution state to `cancelled`.

If termination cannot be confirmed, the execution may enter `recovery_required`.

An expired execution lease does not independently prove that the external database query has stopped.

### 8.4 Execution Results

Execution results are returned through the execution-status resource:

`GET /api/v1/executions/:executionRequestId`

Results are available only to the authenticated owner of the execution request.

When available, the response includes the bounded result window and its metadata.

Result metadata includes:

- `returnedRows`
- `truncated`
- `truncationReason`

`truncationReason` is `null` when the result was not truncated. Otherwise, it identifies `row_limit` or `response_size_limit`.

`returnedRows` represents the number of rows actually included in the returned result window. It does not promise the total number of rows matching the SQL statement.

The API does not promise a total row count.

The initial MVP does not persist complete query-result datasets.

Result windows are maintained in a bounded process-local cache and may become unavailable after expiry, eviction, or backend restart.

The execution lifecycle state and confirmed outcome remain available independently of result data.

The frontend must not automatically re-execute SQL to recover unavailable results.

---

## 9. Temporary Result Availability

### 9.1 Cache Behavior

The initial MVP uses a bounded process-local in-memory cache for query-result windows.

The default time-to-live (TTL) is 15 minutes.

The cache is temporary and is not a durable source of execution truth.

Complete query-result datasets are not persisted in `query_history` or `execution_requests`.

Result cache entries are scoped to both:

- Authenticated user.
- `executionRequestId`.

The backend must enforce result ownership before returning cached data.

### 9.2 Cache-Generation Association

Each execution request that may produce a cached result must be associated with a non-sensitive cache-generation identifier or an equivalent durable logical reference.

This association is a required logical part of the execution/result relationship.

The backend uses it to distinguish:

- Result loss because the backend process restarted.
- Result loss within the same backend process lifetime.

The generation association must remain available independently of the process-local result cache.

Its exact physical representation may be finalized during implementation, but the logical association is mandatory.

### 9.3 Expiry and Eviction Metadata

Bounded in-memory metadata or tombstones must distinguish expiry and eviction during the current process lifetime.

- `expired` means the result entry reached its TTL.
- `evicted` means the result entry was removed to satisfy cache capacity or resource-management requirements.
- `backend_restart` means the process-local cache was lost because the backend process restarted.
- `unavailable` is used when the backend cannot reliably establish a more specific reason.

Tombstone metadata must itself be bounded and must not become an unbounded storage mechanism.

### 9.4 Backend Restart

If the backend restarts, its previous process-local result cache is considered lost.

Status polling reports:

```json
{
  "resultAvailable": false,
  "resultUnavailableReason": "backend_restart"
}
```

for affected results when the generation association establishes that the cache belonged to a previous process lifetime.

The durable execution outcome remains unchanged.

### 9.5 Result Navigation

Frontend result navigation operates only over the currently available bounded result window.

It must not submit another execution request to retrieve missing result data.

The backend must never re-execute SQL automatically because a cached result is unavailable.

### 9.6 Metadata Restrictions

Cache-generation identifiers and tombstone metadata must not contain:

- SQL statements.
- Query-result datasets.
- Passwords or credentials.
- Session tokens.
- Encryption keys.

---

## 10. Query History API

Base path:

`/api/v1/history`

All operations are scoped to the authenticated user.

### 10.1 List History

**Endpoint:** `GET /api/v1/history`

Supported query parameters:

| Parameter | Purpose |
|---|---|
| `limit` | Number of records per page |
| `cursor` | Pagination cursor |
| `status` | Filter by execution status |
| `connectionId` | Filter by connection |
| `search` | SQL substring search |

Default page size: 20.

Maximum page size: 100.

Ordering: newest first, using `executedAt` and `historyId` for deterministic cursor pagination.

For built-in sample database executions:

- `connectionId` is NULL.
- The connection-name snapshot is `Built-in Sample Database`.

History records are retained for 90 days from `executedAt`, subject to the separate backup-retention policy.

### 10.2 Retrieve History Record

**Endpoint:** `GET /api/v1/history/:historyId`

Returns one record after ownership validation.

#### History row-count semantics

The database history field `rows_returned` maps to the API's `returnedRows` property.

`returnedRows` represents the number of rows actually included in the bounded result window returned by the execution. It does not represent the total number of rows matching the submitted SQL statement.

The database field `rows_affected` represents a separate execution metric and must not be treated as equivalent to `rows_returned` or `returnedRows`.

If the API exposes the affected-row metric, it must use a separate property named `affectedRows`, mapped to `rows_affected`.

The API must never derive `returnedRows` from `rows_affected`, or imply that either field represents the total number of rows matching a query.

When result data is unavailable, the history record must retain its recorded metadata without implying that the original result dataset can be retrieved.

### 10.3 Delete History Record

**Endpoint:** `DELETE /api/v1/history/:historyId`

Deletes one history record belonging to the authenticated user.

### 10.4 History Recording Preference

History recording is controlled through:

`PATCH /api/v1/account/preferences`

When `queryHistoryEnabled` is false, new execution attempts are not persisted to query history.

Operational execution-request tracking remains active regardless of this preference.

Existing history records are not affected by changing this preference.

The preference is evaluated when an execution is accepted. If history was enabled when an execution began, its history record remains associated with that attempt even if the preference changes while execution is running.

Analysis-only, parse-only, and EXPLAIN-only operations do not create query-history records.

---

## 11. Administrator API

Base path:

`/api/v1/admin`

Every endpoint requires:

- Authentication.
- Verified account.
- Administrator role.
- Backend authorization.
- Appropriate audit logging.

### 11.1 List Users

**Endpoint:** `GET /api/v1/admin/users`

Provides authorized administrative account listing and filtering.

### 11.2 Suspend User

**Endpoint:** `POST /api/v1/admin/users/:userId/suspend`

Updates account status, revokes sessions, records account-status history, and writes an administrator audit event transactionally.

### 11.3 Restore User

**Endpoint:** `POST /api/v1/admin/users/:userId/restore`

Restores an eligible suspended account.

Previously revoked sessions remain revoked.

### 11.4 Change User Role

**Endpoint:** `PATCH /api/v1/admin/users/:userId/role`

Changes a user's role through an authorized administrative workflow.

The backend must prevent removal of the last active administrator.

### 11.5 Account Deletion Administration

**Endpoint:** `POST /api/v1/admin/users/:userId/deletion`

Initiates an authorized account-deletion workflow.

**Endpoint:** `POST /api/v1/admin/users/:userId/deletion/cancel`

Cancels an eligible pending deletion where permanent deletion has not begun.

All privileged operations must create corresponding audit records.

Administrative audit records must survive account deletion. References to deleted administrators or target users must not prevent preservation of those records.

---

## 12. HTTP Status Codes

The API will use standard HTTP status codes consistently.

| Status | Meaning | Typical use |
|---:|---|---|
| 200 | OK | Successful retrieval or update |
| 201 | Created | Resource successfully created |
| 202 | Accepted | Asynchronous operation accepted |
| 204 | No Content | Successful deletion without response body |
| 400 | Bad Request | Malformed request |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Authenticated but not authorized |
| 404 | Not Found | Resource unavailable or not visible to caller |
| 409 | Conflict | Stale configuration, idempotency-key reuse with a different payload, or conflicting operation |
| 413 | Content Too Large | Request exceeds permitted size |
| 415 | Unsupported Media Type | Unsupported request content type |
| 422 | Unprocessable Content | Valid JSON but invalid operation or input |
| 429 | Too Many Requests | Rate or concurrency limit exceeded |
| 500 | Internal Server Error | Unexpected internal failure |
| 502 | Bad Gateway | External database communication failure |
| 503 | Service Unavailable | Required application service unavailable |
| 504 | Gateway Timeout | Operation exceeded its applicable timeout |

The API must not expose sensitive internal diagnostic information in error responses.

---

## 13. Validation and Security

### 13.1 Backend Validation

Every request must be validated by the backend.

Frontend validation improves usability but is not a security boundary.

Validation includes:

- Required fields.
- Data types.
- Field lengths.
- Identifier formats.
- Email normalization.
- SQL request limits.
- Connection ownership.
- Supported SQL grammar.
- Allowed execution operations.
- Pagination limits.
- Request size limits.
- Execution idempotency identifiers.
- Canonical execution-request fingerprint generation.
- Target-object structure.
- Relevant execution-option validation.

### 13.2 Authentication

- Server-managed sessions.
- Secure session cookies.
- HttpOnly and Secure flags.
- Appropriate SameSite policy.
- Session expiry enforcement.
- Session revocation.
- Account-status checks.

### 13.3 Authorization

Every user-owned resource must be checked against the authenticated user.

The backend must never trust a client-supplied `userId` as proof of ownership.

Administrator endpoints require separate role-based authorization.

### 13.4 CSRF and CORS

- Apply CSRF protection to cookie-authenticated state-changing requests.
- Restrict CORS to explicitly approved origins.
- Do not use unrestricted credentialed cross-origin access.
- Configure SameSite cookie behavior appropriately for the deployment.

### 13.5 SQL Execution Protection

SQL execution endpoints must enforce backend safeguards.

These include:

- Parser-based validation.
- Supported-statement allowlisting.
- Rejection of multiple statements.
- Rejection of unsupported or prohibited statement forms.
- Restricted external database privileges.
- Query timeouts and result limits.
- Cancellation handling.
- Connection and concurrency limits.
- Destination validation to prevent SSRF.

A frontend-only check or a simple keyword filter is insufficient.

The built-in sample database must be resolved exclusively by the backend to its deployment-configured, read-only sample database connection.

Clients cannot override its host, port, database name, username, or credentials.

### 13.6 Rate Limiting

Apply rate limits to sensitive operations, including:

- Registration.
- Login.
- Verification email requests.
- Password-related operations.
- Connection testing.
- Query execution.
- Administrative operations.

Rate limits should be configurable and enforced by the backend.

---

## 14. Pagination and Filtering

Collection endpoints should use a consistent pagination approach.

For query history, cursor-based pagination is the selected strategy.

History ordering uses:

`(executed_at, history_id) DESC`

This avoids relying solely on timestamps when multiple records share the same timestamp.

Both fields must be included in cursor comparisons and ordering.

Default page size is 20. The minimum is 1 and the maximum is 100.

Backend validation enforces page-size limits and validates cursor values.

Filtering is performed only within the authenticated user's authorized dataset.

Search and filtering must use parameterized database queries.

---

## 15. Asynchronous Operations

Some operations may take longer than a typical API request.

Examples:

- Query execution.
- Execution cancellation.
- Account deletion.
- Recovery of uncertain executions.

For these operations, the API may return HTTP 202 Accepted with an operation identifier and current state.

The frontend can retrieve the latest state through the corresponding status endpoint.

The backend must distinguish between:

- Request accepted.
- Operation started.
- Operation completed.
- Operation failed.
- Operation requiring recovery.

An accepted request must never be presented as a completed operation.

An expired execution lease does not independently prove that an external database query has stopped.

The backend must use its execution recovery process to establish the actual outcome before treating an uncertain execution as terminal.

Cancellation is terminal only after external termination has been confirmed. If termination remains uncertain, the execution must remain unresolved or enter `recovery_required`.

The account-deletion coordinator must block permanent deletion while any associated execution request remains in `claimed`, `running`, or `recovery_required`.

---

## 16. API Error Handling

Errors must use stable machine-readable error codes.

Initial error-code categories include:

| Category | Example codes |
|---|---|
| Authentication | `AUTHENTICATION_REQUIRED`, `INVALID_CREDENTIALS` |
| Authorization | `FORBIDDEN`, `RESOURCE_NOT_FOUND` |
| Validation | `VALIDATION_ERROR`, `INVALID_REQUEST` |
| Connections | `CONNECTION_NOT_FOUND`, `CONNECTION_TEST_FAILED` |
| Concurrency | `CONCURRENCY_LIMIT_REACHED`, `STALE_CONFIGURATION` |
| Execution | `EXECUTION_REJECTED`, `EXECUTION_FAILED`, `EXECUTION_RECOVERY_REQUIRED`, `EXECUTION_NOT_CANCELLABLE`, `IDEMPOTENCY_KEY_REUSED` |
| Rate limiting | `RATE_LIMIT_EXCEEDED` |
| Infrastructure | `SERVICE_UNAVAILABLE`, `INTERNAL_ERROR` |

Recommended execution rejection mapping:

| Status | Error code | Meaning |
|---|---|---|
| 401 | `AUTHENTICATION_REQUIRED` | Authentication is missing or invalid |
| 404 | `RESOURCE_NOT_FOUND` | Resource is missing or not owned by the caller |
| 409 | `EXECUTION_NOT_CANCELLABLE` | Cancellation is incompatible with the current state |
| 409 | `IDEMPOTENCY_KEY_REUSED` | Existing UUID was submitted with a different request fingerprint |
| 422 | `VALIDATION_ERROR` | Invalid input, UUID, target, or SQL request shape |
| 429 | `CONCURRENCY_LIMIT_REACHED` | Applicable concurrency limit reached |
| 503 | `SERVICE_UNAVAILABLE` | Required execution service unavailable |

The final error registry will be maintained alongside the implementation.

The frontend should use stable error codes rather than parsing human-readable messages.

A rejected execution request does not create an accepted execution resource.

A conflicting idempotency-key reuse does not modify the original request, its fingerprint, or its execution state.

Existing API-wide error envelope conventions apply to all endpoint-specific errors.

---

## 17. API Observability

The backend will record structured operational logs.

Logs may include:

- Request identifier.
- HTTP method.
- Endpoint.
- Response status.
- Request duration.
- Authenticated user identifier where appropriate.
- Error category.
- Relevant execution-request identifier.

Logs must not contain:

- Passwords.
- Session tokens.
- Encryption keys.
- Raw connection credentials.
- Full SQL statements by default.
- Sensitive request payloads.
- HMAC key material.
- Sensitive canonical request contents.

A request fingerprint may be logged only if operationally justified and safe under the logging policy. It is not required for ordinary request logging.

Operational logs and user-visible query history are separate systems.

The API must not rely on query-history records as its only source of operational execution state because history recording is optional.

---

## 18. Testing Requirements

API testing will cover:

1. Successful request and response behavior.
2. Invalid request bodies.
3. Missing authentication.
4. Unauthorized resource access.
5. User ownership isolation.
6. Session expiration and revocation.
7. Rate-limit enforcement.
8. Duplicate execution requests.
9. Matching-fingerprint idempotent retries.
10. Reuse of an existing UUID with a different fingerprint.
11. HTTP 409 and `IDEMPOTENCY_KEY_REUSED` for conflicting UUID reuse.
12. Preservation of the original request after a conflicting reuse.
13. Prevention of another execution when a UUID is reused with a different payload.
14. Concurrent submissions using the same UUID and matching payload.
15. Concurrent submissions using the same UUID and different payloads.
16. Canonical fingerprint stability when JSON property ordering differs.
17. Fingerprint changes when target, SQL, or relevant execution options change.
18. Protection of HMAC key material and fingerprint-generation secrets.
19. Concurrent execution limits.
20. Stale connection configuration updates.
21. Cancellation and recovery behavior.
22. Query-history opt-out.
23. Administrator authorization.
24. Consistent error responses.
25. Integration with MySQL.
26. Atomic execution-claim and query-history creation.
27. Failure to create required query history before execution.
28. Prevention of external execution when the required transaction rolls back.
29. Result availability after cache expiry.
30. Result availability after cache eviction.
31. Result availability after backend restart.
32. Correct distinction between restart, expiry, eviction, and generic unavailability.
33. Prevention of automatic query re-execution when cached results are missing.
34. Execution lifecycle preservation when result data is unavailable.
35. Result ownership isolation between authenticated users.
36. Enforcement of result-cache TTL and capacity limits.
37. Account-deletion blocking while execution requests remain unresolved.
38. Preservation of administrative audit records after account deletion.
39. Correct built-in sample target resolution.
40. Rejection of client-supplied built-in sample connection credentials or destination overrides.
41. Query-history retention based on `executed_at`.
42. Deterministic query-history cursor pagination.
43. Correct mapping of database `rows_returned` to API `returnedRows`.
44. Confirmation that `rows_returned` represents the bounded returned result window, not the total matching row count.
45. Confirmation that `rows_affected` remains independent of `rows_returned` and `returnedRows`.

Automated tests must verify that one user cannot retrieve, modify, or delete another user's resources.

---

## 19. API Decisions to Validate During Implementation

The REST resource structure and major operation boundaries are established as the initial API design.

The following details will be finalized during implementation and API contract testing:

1. Exact request and response schemas for each endpoint.
2. Whether execution status polling is sufficient for the MVP or another notification mechanism is justified.
3. Exact result pagination and size limits.
4. Final SQL request size limits and validation rules.
5. Final rate-limit thresholds.
6. Whether account deletion returns a dedicated operation resource.
7. Exact error-code registry.
8. Final cookie and CSRF configuration for the selected deployment topology.
9. Exact serialization format for execution results and column metadata.
10. Exact physical representation of cache-generation tracking and bounded tombstone metadata.
11. Exact canonical serialization procedure for execution-request fingerprint generation.
12. HMAC algorithm, key provisioning, key-version representation, and rotation procedure.

These details must not contradict the security and lifecycle rules already established.

The following are finalized logical API requirements, not optional implementation choices:

- Execution lifecycle states and transitions.
- Per-user execution idempotency.
- Canonical request fingerprinting for accepted execution requests.
- Same UUID and matching fingerprint means replay of the existing request.
- Same UUID and different fingerprint means HTTP 409 Conflict with `IDEMPOTENCY_KEY_REUSED`.
- Original-request preservation during replay.
- No duplicate execution or query-history record on replay.
- No execution or query-history record on conflicting UUID reuse.
- Atomic execution-claim, request-fingerprint, and required query-history creation.
- Prevention of external execution if the required transaction fails.
- Result-availability semantics.
- Cache-generation association for distinguishing backend restart from same-process cache loss.
- Bounded expiry and eviction metadata.
- No automatic query re-execution to reconstruct missing results.
- Execution tracking when query-history recording is disabled.
- Account-deletion blocking while associated executions remain unresolved.
- Query-history retention of 90 days from `executed_at`.
- Mapping of database `rows_returned` to API `returnedRows`.
- Separation of `rows_returned` from `rows_affected`.

---

## 20. Related Documents

- `01-System-Architecture.md`
- `02-Component-Design.md`
- `03-Database-Design.md`
- `05-Authentication-and-Security.md`
- `06-Query-Execution-Engine.md`
- `07-Concurrency-and-Transactions.md`
- `08-Performance-and-Scalability.md`
- `09-Deployment-and-Infrastructure.md`
- `10-Error-Handling-and-Recovery.md`
- `11-Testing-and-Quality-Strategy.md`
- `12-Technical-Decision-Records.md`

---

## 21. Document Maintenance

This document defines the consolidated API contract baseline.

Implemented routes, validation schemas, response types, and error codes must remain consistent with this document.

Changes to API behavior must be reflected in this document and relevant technical decision records.

The API contract must remain consistent with the Database Design, Authentication and Security, Query Execution Engine, Concurrency and Transactions, and Error Handling and Recovery documents.