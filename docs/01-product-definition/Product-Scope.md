# Queralyth: Product Scope

## 1. Introduction

This document defines the functional boundaries, initial capabilities, development priorities, and future expansion opportunities of Queralyth.

Queralyth aims to become a MySQL-focused Database Intelligence and Optimization Platform that helps users understand SQL queries, investigate execution behavior, identify optimization opportunities, and validate performance improvements.

The initial development will prioritize a focused and reliable Minimum Viable Product (MVP), followed by progressive expansion into more advanced database intelligence capabilities.

## 2. Product Scope Strategy

Queralyth will follow an incremental development strategy.

Instead of implementing every proposed capability simultaneously, the platform will be developed through clearly defined stages.

Each stage will introduce capabilities that build upon the previous implementation.

The initial focus will be on MySQL 8.x.

The platform will provide separate user accounts, with individual ownership of database connections, query histories, and other user-specific resources.

## 3. Minimum Viable Product (MVP)

The MVP will establish the core workflow for understanding and analyzing MySQL queries within a unified workspace.

### 3.1 User Account Management

- Allow users to register individual accounts.
- Provide secure login and logout functionality.
- Maintain authenticated user sessions.
- Associate user-specific resources with their respective accounts.
- Enforce ownership and access restrictions on the backend.
- Prevent users from accessing another user's database connections or query history.

### 3.2 Database Connectivity

- Connect to a MySQL database.
- Provide a sample database for users who do not have an existing database.
- Allow users to manage their own database connection configurations.
- Validate database connections.
- Store saved database connection configurations securely on the backend.
- Persist saved database credentials in encrypted form at rest.
- Ensure encryption keys are managed separately from stored credentials.
- Allow credentials to be accessed only by authorized backend operations when establishing database connections.
- Ensure saved connection configurations are accessible only to their respective owners.

### 3.3 SQL Workspace

- Provide an SQL editor.
- Allow users to write and submit supported SQL queries.
- Support basic SQL syntax highlighting.
- Validate query syntax.
- Display query results in a structured format.
- Maintain individual query execution histories.
- Record actual query execution attempts, including successful, failed, and cancelled attempts.
- Exclude analysis-only operations, such as SQL parsing, logical query representation generation, and MySQL `EXPLAIN` retrieval, from query history.
- Associate query history entries with the authenticated user.
- Initially store query text and relevant execution metadata rather than complete result datasets by default.

### 3.4 Query Understanding

- Analyze supported SQL query structures.
- Identify tables, columns, joins, filters, and other supported operations.
- Explain the structure of a query in understandable language.
- Provide an initial representation of logical query operations.

The initial implementation will support a defined subset of SQL rather than claiming complete SQL language coverage.

The MVP will focus on basic logical query representations. Formal relational algebra expressions and interactive transformations will be introduced in subsequent development stages.

### 3.5 Execution Plan Analysis

- Integrate MySQL `EXPLAIN`.
- Retrieve execution-plan information.
- Present execution information in a structured interface.
- Explain important execution-plan fields.
- Identify potential performance concerns.
- Provide an initial visual representation of execution operations.

The MVP will focus on estimated execution-plan information. Actual execution analysis through `EXPLAIN ANALYZE` will be introduced after the initial release.

### 3.6 Basic Optimization Guidance

- Identify potential indexing opportunities.
- Highlight potentially inefficient query patterns.
- Explain why a particular optimization may be worth investigating.
- Present suggestions with supporting execution-plan evidence where available.
- Retrieve the minimum required table, column, and index metadata to support relevant recommendations.

Recommendations will be advisory and will not automatically modify database structures.

### 3.7 Basic Security and Execution Controls

- Restrict initial interactive query analysis to supported SELECT statements.
- Validate submitted SQL using server-side parsing and validation rather than relying exclusively on frontend checks.
- Reject multiple statements and unsupported operations, including locking and file-output clauses.
- Use database accounts with the minimum privileges required for the intended operations.
- Apply query execution timeouts and result limits.
- Support appropriate query cancellation and connection-management controls.
- Keep database credentials on the backend and never expose them through frontend responses.
- Encrypt persisted database credentials at rest and manage encryption keys separately from stored credentials.
- Restrict access to saved credentials to authorized backend operations.
- Prevent credentials and other sensitive connection information from appearing in application logs or error messages.
- Enforce authenticated access and ownership checks for user-specific resources.
- Apply appropriate outbound connection restrictions when supporting connections to external databases in a hosted environment.

## 4. Post-MVP Development

The following capabilities are planned for subsequent development stages.

### 4.1 Advanced Query Visualization

- More detailed logical query-plan visualization.
- Relational algebra representation for supported SQL operations.
- Interactive exploration of query transformations.
- Better connections between logical operations and MySQL execution plans.

### 4.2 Advanced Execution Analysis

- More detailed execution-plan visualization.
- Integration with MySQL `EXPLAIN ANALYZE`.
- Investigation of actual execution behavior.
- Improved identification of performance bottlenecks.

### 4.3 Optimization Experimentation Lab

- Create controlled optimization experiments.
- Compare alternative SQL query structures.
- Investigate different indexing strategies.
- Preserve experiment configurations.
- Compare execution plans and performance measurements.

### 4.4 Performance Benchmarking

- Execute controlled performance comparisons.
- Record execution measurements.
- Support repeated benchmark runs.
- Compare median execution times.
- Distinguish estimated costs from actual measurements.
- Present performance changes through visual reports.

### 4.5 Advanced Schema Intelligence

- Visualize database schemas.
- Explore table relationships.
- Analyze indexes and constraints.
- Identify potentially useful schema improvements.

### 4.6 AI-Assisted Database Intelligence

- Explain complex execution plans.
- Provide contextual explanations of query behavior.
- Help users understand optimization recommendations.
- Assist with alternative query exploration.

AI-generated suggestions will be treated as recommendations requiring validation, not as guaranteed improvements.

## 5. Future Enhancements

Potential future capabilities include:

- Advanced database performance reports.
- Saved optimization experiments.
- Query performance history and trends.
- More comprehensive schema analysis.
- Advanced educational learning experiences.
- Collaboration and project-based workspaces.
- Additional database integrations, subject to a future product decision.

These capabilities are not commitments for the initial release.

## 6. Out of Scope for the Initial Release

To maintain a manageable development scope, the following will not be included in the initial MVP:

- PostgreSQL, SQLite, and other database integrations.
- Complete support for every MySQL SQL statement and dialect feature.
- Automatic modification of production database indexes or schemas.
- Unrestricted execution of destructive SQL operations.
- Fully autonomous query optimization.
- Enterprise-scale database monitoring infrastructure.
- Distributed database management.
- Complex team collaboration features.
- AI-dependent core query analysis.
- Formal relational algebra visualization and interactive transformations.
- Advanced schema visualization and comprehensive schema intelligence.

## 7. Initial Safety and Execution Boundaries

Queralyth must handle database operations carefully.

The initial MVP will prioritize controlled query analysis and read-only workflows.

Key boundaries include:

- Support validated SELECT queries for initial interactive analysis.
- Use server-side SQL parsing and validation to enforce supported query restrictions.
- Reject multiple statements, locking clauses, file-output operations, and unsupported query constructs.
- Use appropriately restricted database accounts.
- Apply query execution timeouts, result limits, and connection-management safeguards.
- Keep database credentials on the backend, encrypt persisted credentials at rest, and restrict access to authorized backend operations.
- Prevent unauthorized access to database connections and query histories.
- Use a centrally managed, read-only sample database for MVP learning and query exploration; defer isolated writable sample databases for experimentation to the post-MVP Optimization Lab.
- Clearly distinguish estimated execution information from actual measurements.
- Treat `EXPLAIN ANALYZE` carefully because it executes the analyzed query.
- Never automatically apply optimization recommendations to a user's database.

## 8. MVP Success Criteria

The MVP should be considered successful when a user can:

1. Register and access an individual Queralyth account.
2. Connect to a supported MySQL database or use a sample database.
3. Manage their own database connection configuration.
4. Write and submit a supported SELECT query.
5. View the query results.
6. Understand the query's basic structure.
7. Inspect its MySQL execution plan.
8. Explore an understandable representation of execution operations.
9. Identify potential performance concerns.
10. Receive contextual optimization suggestions.
11. Access their individual query execution history without accessing another user's records.

The MVP should prioritize correctness, reliability, usability, and technical transparency over the number of available features.

## 9. Scope Management Principles

Queralyth will follow these principles throughout development:

- Build core capabilities before advanced enhancements.
- Prioritize features according to their practical value.
- Avoid unnecessary complexity.
- Maintain technical accuracy in all explanations.
- Ensure recommendations are supported by available evidence.
- Validate performance improvements through measurements.
- Introduce advanced capabilities only when the underlying architecture can support them reliably.
- Enforce user-specific resource ownership and access restrictions.
- Prioritize secure database interactions and responsible execution practices.

## 10. Summary

The initial scope of Queralyth is to establish a reliable MySQL query analysis environment that connects SQL understanding, execution-plan interpretation, and contextual optimization guidance.

The MVP will provide individual user accounts, database connectivity, an SQL workspace, query understanding, execution-plan analysis, and basic optimization guidance within a unified workspace.

Advanced visualization, controlled experimentation, benchmarking, schema intelligence, and AI assistance will expand the platform progressively.

The objective is to build a technically sound foundation that can evolve into a comprehensive database intelligence and optimization platform.

### Audit clarification — Built-in sample database (MVP)

The MVP sample database is centrally managed by Queralyth and is read-only for application users. It is logically separate from the Queralyth application schema. The sample schema may share the same physical MySQL 8.x server as the application database when the hosting environment requires it, but it must use a distinct database/schema and a dedicated database account with only the privileges required for read-only sample-query execution. The application database account must not be used for sample queries.

The backend owns the sample-database connection and connection pool. Users do not provide credentials, create a saved connection record, or receive database credentials for this built-in source. The sample dataset is synthetic, version-controlled, and provisioned through deployment/migration or seed procedures. The MVP does not provide per-user writable copies or isolated optimization sandboxes. Isolated writable experimentation remains post-MVP.

