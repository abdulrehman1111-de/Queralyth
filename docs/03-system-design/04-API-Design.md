# Queralyth — API Design

**Document:** API Design  
**Project:** Queralyth  
**Version:** 1.0  
**Status:** Initial API contract baseline  
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
8. Returning structured responses.

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

### 6.5 Delete Connection

**Endpoint:** `DELETE /api/v1/connections/:connectionId`

Requires explicit user confirmation through the frontend workflow.

The backend permanently deletes the connection configuration and encrypted credentials.

Historical query records remain preserved.

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

Example request:

```json
{
  "connectionId": "104",
  "sql": "SELECT id, name FROM users WHERE id = 10"
}
```

The backend validates access to the selected connection and applies the supported SQL grammar.

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
- Validate connection ownership.
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

Example request:

```json
{
  "target": { "type": "saved_connection", "connectionId": "104" },
  "executionRequestId": "550e8400-e29b-41d4-a716-446655440000",
  "sql": "SELECT id, name FROM users LIMIT 100"
}
```

The `executionRequestId` is a client-generated UUID.

Expected backend workflow:

1. Authenticate the user.
2. Validate the request and UUID.
3. Check account status and permissions.
4. Check for an existing request with the same UUID; if found, return that existing resource without changing its original target or SQL.
5. Validate the selected target and, for a saved connection, verify ownership.
6. Parse and validate the SQL against the supported allowlist before accepting the operation.
7. Atomically register the execution claim and enforce concurrency limits.
8. Begin execution only after the claim is committed.
10. Create a `running` query-history record if history recording is enabled.
11. Execute through the query engine outside the application database transaction.
12. Record the terminal execution state.
13. Return the appropriate execution information.

Duplicate requests with the same UUID must not initiate another execution.

An intentional rerun must use a new UUID. The `target` object has exactly one supported target form: `{ "type": "saved_connection", "connectionId": "..." }` or `{ "type": "builtin_sample" }`. The built-in target accepts no client-supplied host or credentials.

A newly accepted request returns 202 Accepted, for example:

```json
{
  "data": {
    "executionRequestId": "550e8400-e29b-41d4-a716-446655440000",
    "state": "claimed",
    "statusUrl": "/api/v1/executions/550e8400-e29b-41d4-a716-446655440000",
    "cancelUrl": "/api/v1/executions/550e8400-e29b-41d4-a716-446655440000/cancel"
  },
  "meta": { "replayed": false }
}
```

A duplicate request returns the same resource with `meta.replayed: true`; active requests return 202 and terminal requests return 200. A replay never changes the original accepted target or SQL.

### 8.2 Retrieve Execution Status

**Endpoint:** `GET /api/v1/executions/:executionRequestId`

Returns the current state of an execution request owned by the authenticated user.

Example response:

```json
{
  "data": {
    "executionRequestId": "550e8400-e29b-41d4-a716-446655440000",
    "state": "running",
    "createdAt": "2026-11-08T14:00:00Z",
    "resultAvailable": false
  }
}
```

### 8.3 Cancel Execution

**Endpoint:** `POST /api/v1/executions/:executionRequestId/cancel`

Purpose: Requests cancellation of an active execution.

Cancellation is not considered successful merely because the request was received. Return 202 Accepted while termination is pending. If the request is already terminal, return 200 with its actual state.

The backend must confirm actual termination before setting the execution state to `cancelled`.

If termination cannot be confirmed, the execution may enter `recovery_required`.

### 8.4 Execution Results

Execution results are returned only to the authorized owner.

The response should contain the available execution metadata and bounded result data according to the query-execution limits.

The MVP does not persist complete query-result datasets by default.

---

## 9. Query History API

Base path:

`/api/v1/history`

All operations are scoped to the authenticated user.

### 9.1 List History

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

### 9.2 Retrieve History Record

**Endpoint:** `GET /api/v1/history/:historyId`

Returns one record after ownership validation.

### 9.3 Delete History Record

**Endpoint:** `DELETE /api/v1/history/:historyId`

Deletes one history record belonging to the authenticated user.

### 9.4 History Recording Preference

History recording is controlled through the account preference endpoint.

When disabled, new execution attempts are not persisted to query history. Operational execution-request tracking remains active.

---

## 10. Administrator API

Base path:

`/api/v1/admin`

Every endpoint requires:

- Authentication.
- Verified account.
- Administrator role.
- Backend authorization.
- Appropriate audit logging.

### 10.1 List Users

**Endpoint:** `GET /api/v1/admin/users`

Provides authorized administrative account listing and filtering.

### 10.2 Suspend User

**Endpoint:** `POST /api/v1/admin/users/:userId/suspend`

Updates account status, revokes sessions, records account-status history, and writes an administrator audit event transactionally.

### 10.3 Restore User

**Endpoint:** `POST /api/v1/admin/users/:userId/restore`

Restores an eligible suspended account.

Previously revoked sessions remain revoked.

### 10.4 Change User Role

**Endpoint:** `PATCH /api/v1/admin/users/:userId/role`

Changes a user's role through an authorized administrative workflow.

The backend must prevent removal of the last active administrator.

### 10.5 Account Deletion Administration

**Endpoint:** `POST /api/v1/admin/users/:userId/deletion`

Initiates an authorized account-deletion workflow.

**Endpoint:** `POST /api/v1/admin/users/:userId/deletion/cancel`

Cancels an eligible pending deletion where permanent deletion has not begun.

All privileged operations must create corresponding audit records.

---

## 11. HTTP Status Codes

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
| 409 | Conflict | Stale configuration or conflicting operation |
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

## 12. Validation and Security

### 12.1 Backend Validation

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

### 12.2 Authentication

- Server-managed sessions.
- Secure session cookies.
- HttpOnly and Secure flags.
- Appropriate SameSite policy.
- Session expiry enforcement.
- Session revocation.
- Account-status checks.

### 12.3 Authorization

Every user-owned resource must be checked against the authenticated user.

The backend must never trust a client-supplied `userId` as proof of ownership.

Administrator endpoints require separate role-based authorization.

### 12.4 CSRF and CORS

- Apply CSRF protection to cookie-authenticated state-changing requests.
- Restrict CORS to explicitly approved origins.
- Do not use unrestricted credentialed cross-origin access.
- Configure SameSite cookie behavior appropriately for the deployment.

### 12.5 SQL Execution Protection

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

### 12.6 Rate Limiting

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

## 13. Pagination and Filtering

Collection endpoints should use a consistent pagination approach.

For query history, cursor-based pagination is the selected strategy.

History ordering uses:

`(executed_at, history_id) DESC`

This avoids relying solely on timestamps when multiple records share the same timestamp.

Backend validation enforces page-size limits and validates cursor values.

Filtering is performed only within the authenticated user's authorized dataset.

---

## 14. Asynchronous Operations

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

---

## 15. API Error Handling

Errors must use stable machine-readable error codes.

Initial error-code categories include:

| Category | Example codes |
|---|---|
| Authentication | `AUTHENTICATION_REQUIRED`, `INVALID_CREDENTIALS` |
| Authorization | `FORBIDDEN`, `RESOURCE_NOT_FOUND` |
| Validation | `VALIDATION_ERROR`, `INVALID_REQUEST` |
| Connections | `CONNECTION_NOT_FOUND`, `CONNECTION_TEST_FAILED` |
| Concurrency | `CONCURRENCY_LIMIT_REACHED`, `STALE_CONFIGURATION` |
| Execution | `EXECUTION_REJECTED`, `EXECUTION_FAILED`, `EXECUTION_RECOVERY_REQUIRED` |
| Rate limiting | `RATE_LIMIT_EXCEEDED` |
| Infrastructure | `SERVICE_UNAVAILABLE`, `INTERNAL_ERROR` |

The final error registry will be maintained alongside the implementation.

The frontend should use stable error codes rather than parsing human-readable messages.

---

## 16. API Observability

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

Operational logs and user-visible query history are separate systems.

---

## 17. Testing Requirements

API testing will cover:

1. Successful request and response behavior.
2. Invalid request bodies.
3. Missing authentication.
4. Unauthorized resource access.
5. User ownership isolation.
6. Session expiration and revocation.
7. Rate-limit enforcement.
8. Duplicate execution requests.
9. Concurrent execution limits.
10. Stale connection configuration updates.
11. Cancellation and recovery behavior.
12. Query-history opt-out.
13. Administrator authorization.
14. Consistent error responses.
15. Integration with MySQL.

Automated tests must verify that one user cannot retrieve, modify, or delete another user's resources.

---

## 18. API Decisions to Validate During Implementation

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

These details must not contradict the security and lifecycle rules already established.

---

## 19. Related Documents

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

## 20. Document Maintenance

This document defines the initial API contract baseline.

Implemented routes, validation schemas, response types, and error codes must remain consistent with this document.

Changes to API behavior must be reflected in this document and relevant technical decision records.

## Audit-approved API contract clarifications

### Built-in sample database target

Execution requests identify their target explicitly (for example, a saved `connectionId` or a system-provided `targetType: "builtin_sample"`). A built-in sample target is resolved only by the backend to its deployment-configured read-only sample connection. Clients cannot submit or override its host, port, username, or password. It is not represented as a user-owned saved connection. The backend still performs authentication, SQL validation, concurrency enforcement, and execution safeguards.

### Bounded result response

The execution-status resource returns the execution lifecycle state and, while available, the bounded result window. Result metadata includes `returnedRows`, `truncated`, and nullable `truncationReason` (`row_limit` or `response_size_limit`). The API does not promise a total row count. Frontend page navigation operates over the returned rows and does not call the execution endpoint again.

### Asynchronous execution contract (AUD-07)

`POST /api/v1/executions` accepts an authenticated request containing a client-generated UUID `executionRequestId`, a target identifier, and the SQL statement. A newly accepted request returns **202 Accepted** with `executionRequestId`, initial state `claimed`, `statusUrl`, `cancelUrl`, and `meta.replayed: false`. Acceptance means the backend has registered the request; it does not mean SQL has completed. Validation, authorization, and concurrency rejections are returned as errors and must not be represented as accepted executions.

The idempotency key is scoped to the authenticated user. Repeating the same UUID returns the existing request and never starts a second execution. A replay returns `meta.replayed: true`; it returns 202 while the request is non-terminal and 200 when terminal. The original accepted request is authoritative: a replay cannot replace its target or SQL. An intentional rerun requires a new UUID.

`GET /api/v1/executions/:executionRequestId` returns 200 for an existing request owned by the caller and reports its current state (`claimed`, `running`, `successful`, `failed`, `cancelled`, or `recovery_required`). It includes bounded result data only when that data remains available in the temporary result cache. The response always reports `resultAvailable`; when false, it reports `resultUnavailableReason` as `expired`, `evicted`, `backend_restart`, or generic `unavailable`. A durable cache-generation identifier distinguishes restart from same-process cache loss; bounded in-memory tombstones distinguish expiry and eviction. The confirmed execution outcome is retained regardless.

`POST /api/v1/executions/:executionRequestId/cancel` acknowledges an accepted cancellation request with 202 while termination is pending. If the execution is already terminal, return 200 with its actual state. The backend must not set `cancelled` until termination is confirmed; uncertain termination is represented as `recovery_required`.

Recommended rejection mapping: 401 `AUTHENTICATION_REQUIRED`; 404 `RESOURCE_NOT_FOUND` for missing or non-owned resources; 409 `EXECUTION_NOT_CANCELLABLE` for an incompatible cancellation state; 422 `VALIDATION_ERROR` for malformed input/UUID/SQL request shape; 429 `CONCURRENCY_LIMIT_REACHED`; and 503 `SERVICE_UNAVAILABLE`. Existing API-wide error envelope conventions apply. A rejected request does not create an accepted execution resource.

### Temporary result availability

The initial MVP uses a bounded process-local in-memory cache for result windows, with a 15-minute default TTL. The cache is not durable and is not a source of execution truth. On expiry, eviction, or backend restart, status polling continues to return the durable execution state with `resultAvailable: false`; it never re-executes SQL automatically. Result cache entries are scoped to both authenticated user and execution-request ID.

