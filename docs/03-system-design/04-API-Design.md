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
- Execution idempotency and fingerprint-version handling.
- Immutable saved-connection configuration snapshots.
- Execution cancellation and recovery coordination.
- Independence of execution lifecycle from optional query history.

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
9. Preserving accepted execution configuration.
10. Returning structured responses.

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
      "configVersion": "3",
      "lastTestStatus": "successful"
    }
  ]
}
```

Sensitive connection credentials are never included in responses.

`configVersion` is serialized as a string to avoid JavaScript integer precision problems.

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
- Immutable snapshot credential material.

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

Registration does not grant access to protected product functionality.

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

#### Unverified account behavior

A user whose email is not yet verified may establish an authenticated session after successful login.

This session is a limited authenticated session.

The user may access only verification and account-related functionality explicitly permitted for unverified accounts.

The user must not access protected product functionality, including:

- Saved database connections.
- Protected SQL analysis operations.
- Query execution.
- Execution results.
- Query history.
- Protected workspace resources.
- Administrative functionality.

The backend must enforce these restrictions on every protected request.

Frontend navigation restrictions alone are insufficient.

Email verification does not change the user's account status. An unverified user may still have `accountStatus: "active"`.

Normal protected functionality becomes available only after successful verification, provided the account is otherwise active and authorized.

### 3.3 Logout

**Endpoint:** `POST /api/v1/auth/logout`

Purpose: Revokes the current session.

Expected behavior:

- Identify the current authenticated session.
- Revoke it.
- Clear the browser session cookie.
- Return a successful response.

Logout must work for both fully verified and limited authenticated sessions.

### 3.4 Current Session

**Endpoint:** `GET /api/v1/auth/session`

Purpose: Retrieves the current authentication state.

This endpoint is available to both verified and unverified authenticated users.

Example response for a verified account:

```json
{
  "data": {
    "authenticated": true,
    "user": {
      "userId": "104",
      "email": "user@example.com",
      "emailVerified": true,
      "accountStatus": "active",
      "role": "user"
    }
  }
}
```

Example response for an unverified account:

```json
{
  "data": {
    "authenticated": true,
    "user": {
      "userId": "105",
      "email": "user@example.com",
      "emailVerified": false,
      "accountStatus": "active",
      "role": "user"
    },
    "accessLevel": "verification_only"
  }
}
```

The `accessLevel` property communicates the current access restriction.

No password hashes, raw tokens, or private credential information are returned.

The backend remains responsible for enforcing the actual access restrictions.

### 3.5 Password Change

**Endpoint:** `POST /api/v1/auth/change-password`

Purpose: Changes the authenticated user's password.

Expected behavior:

- Require current-password verification.
- Require an eligible authenticated account.
- Validate the new password.
- Generate a new Argon2id hash.
- Update the password and revoke all active sessions transactionally.
- Require the user to log in again.
- Send a security notification to the verified email address.

An unverified account cannot use protected account-management functionality through this endpoint.

### 3.6 Email Verification

**Endpoint:** `POST /api/v1/auth/verify-email`

Example request:

```json
{
  "token": "verification-token"
}
```

Expected behavior:

- Accept a valid registration-verification token.
- Validate the token hash.
- Verify its purpose and expiry.
- Enforce single-use behavior.
- Update the account verification timestamp.
- Mark the token as used transactionally.

This endpoint must be accessible to an unverified authenticated session.

The backend must not require email verification before allowing the operation that establishes email verification.

After successful verification, the backend may return the updated session/account state.

### 3.7 Resend Verification Email

**Endpoint:** `POST /api/v1/auth/resend-verification`

Purpose: Requests another registration verification email.

This endpoint is accessible to an eligible unverified authenticated session.

Expected behavior:

- Identify the authenticated user.
- Check current verification status.
- Apply resend rate limits.
- Invalidate the previous unused registration-verification token when issuing a replacement.
- Create a new single-use token.
- Initiate email delivery.

Rate limits and generic responses must prevent email enumeration and abuse.

The endpoint must not allow an already verified account to create unnecessary registration-verification tokens.

---

## 4. Account API

Base path:

`/api/v1/account`

All endpoints require authentication unless explicitly stated otherwise.

Protected account operations require a verified account.

Verification-related operations remain available through the authentication endpoints described in Section 3.

### 4.1 Retrieve Account

**Endpoint:** `GET /api/v1/account`

Returns the authenticated user's account information and relevant preferences.

This endpoint requires a verified account because it belongs to the protected account-management API.

The current-session endpoint remains available for unverified users who need their authentication and verification status.

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

Requires a verified and otherwise eligible account.

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

Requires a verified account and appropriate reauthentication where required by the security policy.

### 4.4 Confirm Email Change

**Endpoint:** `POST /api/v1/account/email-change/confirm`

Example request:

```json
{
  "token": "email-change-token"
}
```

The backend validates the token and updates the email transactionally.

Registration verification and email-change verification are separate token purposes and must not be interchangeable.

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

Session-management endpoints require authentication and a verified account.

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

All connection endpoints require a verified, authenticated account.

### 6.1 List Connections

**Endpoint:** `GET /api/v1/connections`

Returns saved connection metadata.

Passwords and encrypted credential material are never returned.

The response includes the current `configVersion` for each connection.

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

Credentials and encrypted credential material must never be returned.

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
  "configVersion": "2"
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

#### Interaction with accepted executions

A connection update affects the current saved connection configuration only.

It must not modify an immutable configuration snapshot already associated with an accepted execution.

An execution accepted against configuration version 2 must continue to use that accepted version even if the user later updates the saved connection to version 3.

A new execution must validate and capture the latest valid saved-connection configuration.

### 6.5 Delete Connection

**Endpoint:** `DELETE /api/v1/connections/:connectionId`

Requires explicit user confirmation through the frontend workflow.

The backend permanently deletes the connection's current configuration and encrypted credentials.

Historical query records remain preserved.

The associated `query_history.connection_id` is set to NULL, while the connection-name snapshot remains available.

#### Interaction with accepted executions

Deleting a saved connection prevents new operations from using that connection.

However, deletion must not invalidate an already accepted execution.

When an execution is accepted, the backend preserves the exact saved-connection configuration in an immutable, encrypted execution-configuration snapshot.

The snapshot is independent of the original connection row.

An accepted execution may continue, be cancelled, or be recovered using its snapshot even after the original saved connection is deleted.

The snapshot must remain available until the associated execution request is eligible for cleanup.

Deleting the connection must not delete its accepted execution snapshots.

### 6.6 Test Connection

**Endpoint:** `POST /api/v1/connections/:connectionId/test`

Purpose: Tests connectivity and authentication for a saved connection.

Expected behavior:

1. Validate ownership.
2. Capture and validate the current configuration version.
3. Acquire the required credentials.
4. Attempt a connection.
5. Apply a 10-second connection-establishment timeout.
6. Close or release the test connection.
7. Save the test result only if the configuration version has not changed.

A stale test result must not overwrite a newer configuration's status.

Connection testing is not an execution request and does not create a query-history record.

---

## 7. SQL Analysis API

Base path:

`/api/v1/analysis`

All analysis endpoints require a verified authenticated account.

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

All execution endpoints require a verified, authenticated account.

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

The backend generates the fingerprint using a secure keyed cryptographic HMAC.

The HMAC key material remains exclusively in backend-controlled secret configuration.

The application database stores:

- The generated request fingerprint.
- The non-secret `fingerprintKeyVersion` identifier associated with that fingerprint.

The `fingerprintKeyVersion` identifies which backend-held HMAC key version generated the stored fingerprint.

It is not the key itself and must never contain key material.

HMAC key material must never be returned to the frontend, stored in the application database, or included in logs.

The database stores the fingerprint, not the original SQL statement in `execution_requests`. The original SQL may separately be stored in `query_history` when the user's history preference permits it.

The fingerprint is bound to the authenticated user's execution-request UUID through the corresponding `execution_requests` record. It is not an authentication credential or a replacement for authorization.

#### Fingerprint key rotation

The backend supports HMAC key rotation using versioned keys.

Rules:

- New execution requests use the currently active HMAC key version.
- New request fingerprints are stored with their corresponding `fingerprintKeyVersion`.
- A retry of an existing request must use the original request's stored key version.
- The backend must retain access to old HMAC key versions while retained execution requests still depend on them.
- Active, unresolved, and retained terminal requests must remain verifiable.
- Old keys must not be retired merely because a newer key has become active.
- Key retirement requires verifying that no retained execution request depends on the retiring key version.

The frontend never chooses the fingerprint key version.

The backend never accepts a client-supplied fingerprint or key version as authoritative.

#### Expected backend workflow

1. Authenticate the user.
2. Verify the account is eligible for protected execution functionality, including email verification.
3. Validate the request structure and `executionRequestId` UUID.
4. Check account status and permissions.
5. Validate and canonicalize the execution request.
6. Look up an existing request using the authenticated user and `executionRequestId`.
7. If an existing request is found:
   - Read its stored `fingerprintKeyVersion`.
   - Retrieve the corresponding backend-held HMAC key version.
   - Generate the retry fingerprint using that original key version.
   - Compare it with the stored fingerprint.
   - If the fingerprints match, return the existing execution resource as an idempotent replay without starting another execution.
   - If the fingerprints differ, reject the request with HTTP 409 Conflict.
8. If no existing request exists:
   - Use the currently active HMAC key version.
   - Generate the new request fingerprint.
   - Validate the selected target.
   - For a saved connection, validate ownership and current configuration.
9. Parse and validate the SQL against the supported allowlist before accepting the operation.
10. Begin an application-database transaction.
11. For a saved-connection target, lock and revalidate the selected connection row.
12. Capture the exact accepted connection configuration and its current `configVersion`.
13. Create an immutable, encrypted execution-configuration snapshot associated with the execution request.
14. Atomically register the execution claim, persist its fingerprint and `fingerprintKeyVersion`, and enforce the applicable concurrency limits.
15. If query-history recording is enabled, create the corresponding `running` query-history record in the same transaction.
16. Commit the transaction before beginning external query execution.
17. The worker must atomically transition the request from `claimed` to `running`.
18. Only after successfully winning that transition may the worker begin external query execution.
19. Execute through the query engine outside the application-database transaction, using the accepted immutable configuration snapshot.
20. Record the terminal execution state and update the associated query-history record when one still exists.
21. Return the appropriate execution information.

The execution claim, request fingerprint, key-version identifier, required configuration snapshot, and required query-history record must be created atomically when applicable.

For built-in sample database requests, no user-owned saved-connection snapshot is required. The backend resolves the built-in target through its deployment-managed configuration.

If history recording is disabled, execution-request tracking and lifecycle management remain active without creating a query-history record.

The history preference is evaluated when the execution is accepted. If history was enabled at that point, its record remains associated with that attempt even if the preference changes while execution is running.

If claim creation, fingerprint persistence, snapshot creation, or required query-history creation fails, roll back the transaction. Do not start external execution.

A failure to persist the terminal outcome must be handled through the execution recovery mechanism. The backend must not falsely report a confirmed successful or failed outcome when the actual outcome is uncertain.

#### Connection snapshot consistency

For a saved-connection execution:

- The backend must validate the connection belongs to the authenticated user.
- The backend must lock the connection while capturing its configuration.
- The captured configuration must correspond to one exact `configVersion`.
- The execution request must reference the immutable snapshot.
- The snapshot must include the accepted connection details and encrypted credential material where applicable.
- The snapshot must not contain plaintext credentials.
- The snapshot must remain independent of later updates or deletion of the saved connection.
- The worker must use the accepted snapshot rather than reading the current mutable connection row again.

The connection's `configVersion` and the snapshot must represent the same accepted configuration.

A new execution must use the latest valid connection configuration at its own acceptance time.

A retry of an existing execution request must not silently switch to a newer configuration version.

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

A replay never changes the original accepted target, SQL, relevant execution options, configuration snapshot, or fingerprint key version.

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

#### Idempotency behavior

- The idempotency key is scoped to the authenticated user.
- The logical uniqueness rule is `(user_id, execution_request_id)`.
- A request fingerprint is generated from the canonical target, SQL, and relevant execution options.
- Repeating the same UUID with the same fingerprint returns the existing execution resource.
- An existing request is verified using its original stored `fingerprintKeyVersion`.
- Reusing the same UUID with a different fingerprint returns HTTP 409 Conflict with error code `IDEMPOTENCY_KEY_REUSED`.
- A conflicting reuse must not overwrite the original fingerprint, key version, accepted request details, or configuration snapshot.
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

The backend must distinguish between a request that has not yet started external execution and one that is already running.

#### Cancellation before external execution

A request in `claimed` state has been accepted but has not yet won the worker-start transition.

The backend may atomically transition:

`claimed` → `cancelled`

The cancellation operation must use a conditional state transition or equivalent row-locking mechanism.

If the transition succeeds:

- The execution is considered cancelled before external execution began.
- The worker must not start the external query.
- The request is terminal.
- Resources may be released once the transition guarantees no worker can start the request.
- The associated query-history record, if it still exists, is updated to `cancelled`.

If the worker has already successfully transitioned the request to `running`, the claimed-state cancellation operation must not succeed.

#### Cancellation during external execution

A request in `running` state follows the normal external cancellation process.

Expected behavior:

1. Request cancellation from the query-execution worker.
2. Attempt to terminate the external query through the supported driver/database mechanism.
3. Confirm external termination.
4. Record `cancelled` only after termination is confirmed.
5. Update the associated query-history record if it still exists.

If external termination cannot be confirmed, the execution must remain unresolved or enter `recovery_required`.

Resources must not be released merely because a cancellation request was received.

#### Cancellation and worker-start race

The cancellation operation and worker-start operation compete for the same execution state.

The worker must atomically transition:

`claimed` → `running`

before starting external execution.

The cancellation operation must atomically transition:

`claimed` → `cancelled`

Only one conditional transition may win.

- If cancellation wins, the worker must not execute the query.
- If the worker wins, cancellation must follow the running-execution cancellation process.
- A worker must not start an external query based only on an earlier read showing `claimed`.
- A worker must verify that its conditional transition to `running` succeeded.
- A cancelled request must never be started by a worker.

Return 202 Accepted while running-execution termination is pending.

If the request is already terminal, return 200 with its actual state.

If cancellation cannot be performed because of the current state, return the appropriate conflict response without modifying the execution outcome.

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

All operations require a verified authenticated account and are scoped to the authenticated user.

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

Ordering: newest first, using `acceptedAt` and `historyId` for deterministic cursor pagination.

For built-in sample database executions:

- `connectionId` is NULL.
- The connection-name snapshot is `Built-in Sample Database`.

History records are retained for 90 days from `acceptedAt`, subject to the separate backup-retention policy.

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

The backend must validate ownership before deletion.

#### Independence from execution lifecycle

Query history is optional user-facing metadata. It is not the source of truth for operational execution state.

Deleting a history record must not:

- Cancel its associated execution.
- Change the execution state.
- Modify the execution request fingerprint.
- Remove the execution request.
- Delete an execution-configuration snapshot.
- Trigger external query termination.
- Prevent execution recovery.
- Recreate the deleted history record later.

An execution may still be `claimed`, `running`, or `recovery_required` when its associated history record is deleted.

The execution request remains independently available for status retrieval, idempotency, cancellation, and recovery.

If the execution request maintains an optional association with the history record, deleting the history row must clear that association rather than delete the execution request.

Execution completion and recovery must tolerate the absence of the history row.

If the history row no longer exists, the backend updates the execution request only.

A deleted history record must never be recreated automatically.

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
| 403 | Forbidden | Authenticated but not authorized, including an unverified account attempting protected functionality |
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
- Fingerprint key-version selection.
- Target-object structure.
- Relevant execution-option validation.
- Saved-connection configuration-version consistency.
- Account verification state.
- Execution state-transition validity.

### 13.2 Authentication

- Server-managed sessions.
- Secure session cookies.
- HttpOnly and Secure flags.
- Appropriate SameSite policy.
- Session expiry enforcement.
- Session revocation.
- Account-status checks.
- Email-verification checks for protected functionality.
- Limited authenticated sessions for unverified accounts.

Authentication and authorization are separate decisions.

A valid session does not automatically grant access to every API endpoint.

### 13.3 Authorization

Every user-owned resource must be checked against the authenticated user.

The backend must never trust a client-supplied `userId` as proof of ownership.

Administrator endpoints require separate role-based authorization.

Protected product functionality requires a verified account.

Unverified users may access only explicitly permitted verification and account-related endpoints.

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

### 13.6 Connection Snapshot Protection

For accepted saved-connection executions:

- Capture the exact configuration version validated at acceptance.
- Store the snapshot independently of the mutable saved connection.
- Encrypt credential material using AES-256-GCM.
- Never store plaintext passwords in the snapshot.
- Keep encryption keys outside the database and source repository.
- Restrict decryption to authorized backend execution code.
- Never return snapshot contents or credentials to the frontend.
- Never include credentials, ciphertext, encryption keys, or authentication tags in logs.
- Preserve old credential-encryption key versions while retained snapshots depend on them.
- Do not allow a connection update or deletion to modify an accepted snapshot.

### 13.7 Request Fingerprint Protection

- Generate fingerprints only in the backend.
- Use a secure keyed HMAC.
- Store the non-secret key-version identifier with the fingerprint.
- Keep HMAC key material outside the database.
- Use the original stored key version when verifying retries.
- Keep old keys available while retained requests depend on them.
- Do not accept a frontend-supplied fingerprint or key version as authoritative.
- Never expose HMAC key material through errors, API responses, or logs.

### 13.8 Rate Limiting

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

`(accepted_at, history_id) DESC`

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

### 15.1 Execution startup

An accepted execution initially enters `claimed`.

Before beginning external execution, a worker must atomically transition:

`claimed` → `running`

Only the worker that successfully performs this transition may start the external query.

A previous read of the `claimed` state is insufficient.

### 15.2 Cancellation

A cancellation request may atomically transition a request from:

`claimed` → `cancelled`

This is permitted only when the worker has not already won the transition to `running`.

Cancellation and worker startup must use coordinated conditional state transitions so that only one can win.

If cancellation wins, the worker must not start external execution.

If worker startup wins, cancellation follows the running-execution termination process.

A running execution is terminally cancelled only after external termination has been confirmed.

If termination is uncertain, the request must remain unresolved or enter `recovery_required`.

### 15.3 Recovery

The backend must distinguish a genuinely terminated external query from an execution whose status is merely unknown.

Recovery may reconcile a `recovery_required` request to `successful`, `failed`, or `cancelled` only after sufficient evidence establishes the actual outcome.

An expired lease, missing heartbeat, worker crash, or lost connection is not sufficient proof of external termination.

### 15.4 Query-history independence

Execution lifecycle is independent of query history.

Deleting a query-history record does not cancel or modify an associated execution.

Completion, cancellation, and recovery must tolerate a missing history record.

A deleted history record must not be recreated automatically.

### 15.5 Account deletion

The account-deletion coordinator must block permanent deletion while any associated execution request remains in `claimed`, `running`, or `recovery_required`.

An execution's immutable saved-connection snapshot must remain available while the execution is active or unresolved.

---

## 16. API Error Handling

Errors must use stable machine-readable error codes.

Initial error-code categories include:

| Category | Example codes |
|---|---|
| Authentication | `AUTHENTICATION_REQUIRED`, `INVALID_CREDENTIALS`, `EMAIL_VERIFICATION_REQUIRED` |
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
| 403 | `EMAIL_VERIFICATION_REQUIRED` | Account is authenticated but email verification is required for the requested operation |
| 404 | `RESOURCE_NOT_FOUND` | Resource is missing or not owned by the caller |
| 409 | `EXECUTION_NOT_CANCELLABLE` | Cancellation is incompatible with the current state |
| 409 | `IDEMPOTENCY_KEY_REUSED` | Existing UUID was submitted with a different request fingerprint |
| 422 | `VALIDATION_ERROR` | Invalid input, UUID, target, or SQL request shape |
| 429 | `CONCURRENCY_LIMIT_REACHED` | Applicable concurrency limit reached |
| 503 | `SERVICE_UNAVAILABLE` | Required execution service unavailable |

The final error registry will be maintained alongside the implementation.

The frontend should use stable error codes rather than parsing human-readable messages.

A rejected execution request does not create an accepted execution resource.

A conflicting idempotency-key reuse does not modify the original request, its fingerprint, key version, snapshot, or execution state.

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
- Non-sensitive execution state transitions.
- Non-sensitive connection configuration version metadata where operationally justified.

Logs must not contain:

- Passwords.
- Session tokens.
- Encryption keys.
- Raw connection credentials.
- Full SQL statements by default.
- Sensitive request payloads.
- HMAC key material.
- Sensitive canonical request contents.
- Plaintext or encrypted execution-snapshot credential material.
- Encryption nonces or authentication tags.

A request fingerprint may be logged only if operationally justified and safe under the logging policy. It is not required for ordinary request logging.

The non-secret fingerprint key-version identifier may be recorded where necessary for operational diagnostics, but it must not be confused with key material.

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
19. Verification that new requests use the active HMAC key version.
20. Verification that retries use the original stored HMAC key version after rotation.
21. Verification that old HMAC keys cannot be retired while retained requests depend on them.
22. Concurrent execution limits.
23. Stale connection configuration updates.
24. Connection snapshot creation against the exact accepted `configVersion`.
25. Prevention of snapshot changes after acceptance.
26. Execution continuation after the original saved connection is updated.
27. Execution continuation after the original saved connection is deleted.
28. Prevention of new executions using a deleted connection.
29. Snapshot credential encryption and backend-only decryption.
30. Prevention of plaintext credential exposure.
31. Cancellation and recovery behavior.
32. Atomic cancellation of a `claimed` request.
33. Atomic worker transition from `claimed` to `running`.
34. Race testing between claimed-state cancellation and worker startup.
35. Prevention of external execution when cancellation wins.
36. Prevention of false cancellation when worker startup wins.
37. Confirmation of external termination before cancelling a running request.
38. Query-history opt-out.
39. Query-history deletion while an execution is active.
40. Confirmation that deleting history does not alter execution state.
41. Completion and recovery when the associated history record no longer exists.
42. Prevention of automatic recreation of deleted history.
43. Administrator authorization.
44. Consistent error responses.
45. Integration with MySQL.
46. Atomic execution-claim and query-history creation.
47. Atomic execution-claim and configuration-snapshot creation.
48. Failure to create required query history before execution.
49. Failure to create a required configuration snapshot before execution.
50. Prevention of external execution when the required transaction rolls back.
51. Result availability after cache expiry.
52. Result availability after cache eviction.
53. Result availability after backend restart.
54. Correct distinction between restart, expiry, eviction, and generic unavailability.
55. Prevention of automatic query re-execution when cached results are missing.
56. Execution lifecycle preservation when result data is unavailable.
57. Result ownership isolation between authenticated users.
58. Enforcement of result-cache TTL and capacity limits.
59. Account-deletion blocking while execution requests remain unresolved.
60. Preservation of administrative audit records after account deletion.
61. Correct built-in sample target resolution.
62. Rejection of client-supplied built-in sample connection credentials or destination overrides.
63. Query-history retention based on `accepted_at`.
64. Deterministic query-history cursor pagination.
65. Correct mapping of database `rows_returned` to API `returnedRows`.
66. Confirmation that `rows_returned` represents the bounded returned result window, not the total matching row count.
67. Confirmation that `rows_affected` remains independent of `rows_returned` and `returnedRows`.
68. Successful verification through an unverified authenticated session.
69. Access to the current-session endpoint for an unverified account.
70. Successful verification-email resend within configured limits.
71. Rejection of protected product endpoints for an unverified account.
72. Confirmation that email verification enables normal protected functionality without changing `accountStatus`.
73. Confirmation that suspended accounts remain restricted even after email verification.

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
13. Exact physical representation of the immutable execution-configuration snapshot association.
14. Exact physical representation of the optional query-history association.
15. Exact response metadata for accepted connection configuration versions where needed for operational diagnostics.

These details must not contradict the security and lifecycle rules already established.

The following are finalized logical API requirements, not optional implementation choices:

- Execution lifecycle states and transitions.
- Per-user execution idempotency.
- Canonical request fingerprinting for accepted execution requests.
- Same UUID and matching fingerprint means replay of the existing request.
- Existing requests are verified using their original stored HMAC key version.
- Same UUID and different fingerprint means HTTP 409 Conflict with `IDEMPOTENCY_KEY_REUSED`.
- Original-request preservation during replay.
- No duplicate execution or query-history record on replay.
- No execution or query-history record on conflicting UUID reuse.
- Atomic execution-claim, request-fingerprint, fingerprint-key-version, and required query-history creation.
- Atomic creation of the required saved-connection execution snapshot.
- Prevention of external execution if the required transaction fails.
- Immutable accepted connection configuration.
- Independence of accepted executions from later connection updates or deletion.
- Atomic worker transition from `claimed` to `running` before external execution.
- Atomic cancellation transition from `claimed` to `cancelled`.
- The winner of the cancellation-versus-worker-start transition determines whether external execution may begin.
- Confirmation of external termination before terminal cancellation of a running request.
- Result-availability semantics.
- Cache-generation association for distinguishing backend restart from same-process cache loss.
- Bounded expiry and eviction metadata.
- No automatic query re-execution to reconstruct missing results.
- Execution tracking when query-history recording is disabled.
- Independence of execution lifecycle from query-history deletion.
- Tolerance of missing history records during completion and recovery.
- No automatic recreation of deleted history records.
- Account-deletion blocking while associated executions remain unresolved.
- Query-history retention of 90 days from `accepted_at`.
- Mapping of database `rows_returned` to API `returnedRows`.
- Separation of `rows_returned` from `rows_affected`.
- Limited authenticated sessions for unverified accounts.
- Backend enforcement of email-verification restrictions on protected functionality.
- Verification-related endpoints remaining accessible to eligible unverified sessions.

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