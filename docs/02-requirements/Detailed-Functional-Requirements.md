# 5. Detailed Functional Requirements

## 5.1 User Account Management

**FR-001: User Registration**

The system shall allow new users to create individual Queralyth accounts by providing the required registration information.

**FR-002: User Authentication**

The system shall authenticate registered users before granting access to their personal Queralyth workspace and account-specific resources.

**FR-003: User Session Management**

The system shall manage authenticated user sessions and provide users with the ability to securely log out of their accounts.

**FR-004: User-Specific Data Access**

The system shall ensure that users can access only the data and resources associated with their own accounts, unless explicitly authorized otherwise.

## 5.2 Database Connection Management

**FR-005: Database Connection**

The system shall allow authenticated users to connect to a supported MySQL database using valid connection credentials.

**FR-006: Connection Validation**

The system shall validate the supplied connection details and inform users whether the connection was successful.

**FR-007: Connection Error Handling**

The system shall display understandable error messages when a connection fails due to invalid credentials, unavailable servers, or incorrect configuration.

**FR-008: Sample Database**

The system shall provide a built-in sample database so users can explore Queralyth without configuring an external database.

**FR-009: Secure Credential Handling**

The system shall store persisted database credentials in encrypted form at rest, with encryption keys managed separately from the stored credentials. Credentials shall remain on the backend, shall not be exposed to the frontend, and shall only be accessible to authorized backend operations when establishing database connections. Sensitive credentials shall not be included in application logs or error messages.

**FR-010: User-Specific Connection Management**

The system shall associate saved external database connection configurations with their respective user accounts and provide authenticated users with the ability to create, view, update, and delete their own saved connections.

The system shall validate connection details before presenting an external connection as successfully established and available for use.

The system shall enforce backend ownership checks for all connection-management operations and prevent users from accessing, modifying, or deleting another user's connections.

When a saved connection is updated, the system shall securely handle any associated credential changes and maintain the required encryption-at-rest protections.

When a saved connection is deleted, the system shall remove its associated stored configuration and persisted credentials from the application's active storage.

The built-in sample database shall remain available without requiring users to create or persist an external database connection configuration.

## 5.3 SQL Query Editor

**FR-011: Query Input**

The system shall allow users to write and edit SQL queries through a dedicated query editor.

**FR-012: Query Validation**

The system shall validate supported SQL syntax and query structure before attempting query execution.

**FR-013: Query Execution**

The system shall execute supported SELECT queries against the selected MySQL database, subject to the system's query validation and execution restrictions.

**FR-014: Query Results**

The system shall display query results in a structured and readable format.

**FR-015: Query History**

The system shall maintain a history of actual query execution attempts associated with the authenticated user's account, including successful, failed, and cancelled attempts.

History records shall primarily contain query text and relevant execution metadata rather than complete result datasets by default. Analysis-only activities, including SQL parsing, logical query representation generation, and EXPLAIN plan retrieval, shall not create query history entries in the MVP.

**FR-016: Query History Retrieval**

The system shall allow users to retrieve and review their own previously recorded query execution attempts.

**FR-017: Query History Management**

The system shall allow users to manage their query history, including removing individual history entries.

**FR-018: Execution Feedback**

The system shall provide appropriate feedback when a query execution succeeds, fails, is cancelled, or exceeds its execution limit.

**FR-019: Query Execution Safeguards**

The system shall perform server-side SQL parsing and enforce an allowlist of supported query structures. It shall reject multiple statements, unsupported statement types, locking clauses, file-output operations, and other query forms excluded by the system's execution policy.

**FR-020: Execution Limits and Cancellation**

The system shall enforce configurable query execution time limits and provide users with the ability to cancel supported running queries.

**FR-021: Query Result Limits**

The system shall enforce configurable result-size limits and provide pagination or an equivalent mechanism when displaying larger result sets.

## 5.4 SQL Query Understanding

**FR-022: Query Structure Analysis**

The system shall analyze supported SQL queries and identify their major structural components.

**FR-023: Table and Column Identification**

The system shall identify referenced tables and columns when they can be resolved from the query and available schema information.

**FR-024: Operation Identification**

The system shall recognize supported operations such as filtering, projection, joining, sorting, and grouping.

**FR-025: Logical Query Representation**

The system shall generate a basic logical operator tree or equivalent logical representation of supported queries. This representation shall describe the logical structure of a query and remain distinct from MySQL's physical execution plan.

**FR-026: Query Explanation**

The system shall explain the identified query components in understandable language.

## 5.5 Execution Plan Analysis

**FR-027: Execution Plan Retrieval**

The system shall retrieve estimated execution-plan information from MySQL using EXPLAIN for supported queries.

**FR-028: Execution Plan Interpretation**

The system shall interpret available execution-plan properties and identify relevant operations, access methods, and optimizer estimates.

**FR-029: Execution Plan Visualization**

The system shall represent execution-plan information through a basic visual structure in the MVP. Advanced interactive exploration and manipulation of execution-plan visualizations may be introduced in later releases.

**FR-030: Potential Bottleneck Identification**

The system shall highlight operations that may deserve further performance investigation based on available execution-plan information.

**FR-031: Execution Plan Explanation**

The system shall explain important execution-plan operations and properties in understandable language.

**FR-032: Estimated and Actual Performance Distinction**

The system shall distinguish estimated execution-plan information obtained through EXPLAIN from actual execution measurements. It shall not present optimizer estimates as measured runtime performance.

## 5.6 Query Optimization Guidance

**FR-033: Inefficient Pattern Detection**

The system shall identify supported SQL patterns that may negatively affect query performance.

**FR-034: Index Opportunity Detection**

The system shall identify potential indexing opportunities using the minimum required table, column, index, and execution-plan metadata available in the MVP.

**FR-035: Optimization Recommendations**

The system shall provide contextual recommendations for improving supported queries.

**FR-036: Recommendation Explanation**

The system shall explain the reasoning behind each recommendation and identify relevant trade-offs.

**FR-037: Recommendation Transparency**

The system shall distinguish evidence-based findings from possible optimization opportunities that require further testing.

## 5.7 Future Functional Requirements

The following requirements are planned for later development and are not mandatory for the initial MVP:

**FR-038: Optimization Experiments**

The system shall allow users to create controlled optimization experiments in an isolated environment.

**FR-039: Query Version Comparison**

The system shall allow users to compare alternative SQL query versions.

**FR-040: Query Benchmarking**

The system shall support repeated query benchmark runs under controlled conditions.

**FR-041: Benchmark Statistics**

The system shall calculate median execution times and provide relevant performance comparison statistics from benchmark runs.

**FR-042: Advanced Schema Intelligence**

The system shall provide advanced database schema visualization, including tables and relationships, along with additional schema analysis capabilities.

**FR-043: Advanced Relational Algebra Visualization**

The system shall support formal relational algebra representations and interactive exploration of logical query transformations.

**FR-044: Advanced Execution Plan Exploration**

The system shall provide advanced interactive execution-plan visualization and exploration capabilities.

**FR-045: Saved Analysis Results**

The system shall allow users to save and revisit detailed query analysis results.

**FR-046: Analysis Reports**

The system shall generate reports containing query analysis and optimization findings.

**FR-047: AI-Assisted Explanations**

The system may provide AI-assisted explanations based on available query analysis and execution-plan information.

## 5.8 Requirement Priority

Functional requirements shall be prioritized as follows:

- **MVP:** FR-001 through FR-037, with the scope and limitations defined in the Product Scope document.
- **Post-MVP:** FR-038 through FR-046.
- **Future Enhancement:** FR-047.

Implementation shall follow the agreed development roadmap rather than treating every requirement as an immediate development task.

### Audit clarification — FR-008 built-in sample database

The built-in sample database shall be a centrally managed, read-only MySQL 8.x sample schema logically separate from the Queralyth application schema. It shall be accessed through a backend-managed connection using a dedicated least-privilege account. Users shall not need to create a saved connection or supply credentials for this source. The backend shall treat the built-in sample database as a distinct connection target and shall enforce the same SQL allowlist, execution timeouts, result bounds, authorization, and concurrency safeguards as other query targets. The MVP sample data shall be synthetic and version-controlled. Per-user writable sample copies and isolated optimization environments are post-MVP.

### Audit clarification — FR-021 bounded result presentation

The backend shall retrieve and return a bounded result window, enforcing both a configurable maximum row count and maximum serialized response size. The frontend shall paginate the rows already returned by the backend; changing frontend pages shall not re-execute the SQL query or imply that additional database rows were retrieved. The API shall identify the number of returned rows and whether the result was truncated, including the applicable reason (`row_limit` or `response_size_limit`). The MVP shall not calculate an expensive total-row count, keep database cursors open between page requests, or persist complete result datasets.

### Audit clarification — FR-026 query explanations

Explanations shall be generated deterministically from supported parsed SQL structures and the logical query representation using predefined rules/templates. The explanation generator shall describe only components and semantics supported by the parser and available metadata; it shall not invent performance conclusions. AI-assisted explanation generation remains outside the MVP.

