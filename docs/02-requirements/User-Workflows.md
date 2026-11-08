# 7. User Workflows

## 7.1 First-Time User Workflow

1. The user opens Queralyth.
2. The system presents an introduction to the platform and its capabilities.
3. The user creates an individual account through the registration process.
4. The user logs in using their account credentials.
5. The system establishes an authenticated user session.
6. The user accesses the Queralyth unified workspace.
7. The user selects the built-in sample database or configures an external MySQL database connection.
8. The system validates the database connection.
9. After successful validation, the system associates the saved connection configuration with the authenticated user's account.
10. Persisted database credentials are securely stored on the backend using encryption at rest and separately managed encryption keys.
11. The user enters the SQL workspace.
12. The user can access SQL query editing, query understanding, execution-plan analysis, and available optimization guidance within the same environment.

**Expected Outcome:** The user successfully creates an account, accesses the Queralyth unified workspace, establishes an available database connection, and can begin analyzing SQL queries.

## 7.2 SQL Query Analysis and Execution Workflow

1. The user opens the SQL Query Editor within the unified workspace.
2. The user selects one of their available database connections or the built-in sample database.
3. The user writes or enters a supported SQL query.
4. The user requests query analysis.
5. The backend validates and parses the submitted query against the supported SQL syntax and execution restrictions.
6. The system identifies relevant tables, columns, filters, joins, and other supported logical operations.
7. The system generates a basic logical representation of the query.
8. The system retrieves the estimated MySQL execution plan using EXPLAIN.
9. The system interprets the available execution-plan information.
10. The system presents the logical representation, execution plan, and relevant contextual explanations.
11. The user can optionally request execution of the supported SELECT query.
12. If execution is requested, the backend applies the required execution safeguards and attempts to execute the validated query against the selected database connection.
13. If execution succeeds, the system displays the returned query results in a structured format, subject to configured result-size limits and pagination.
14. The system records the actual execution attempt in the authenticated user's query history, including the query text, relevant execution metadata, and its outcome.
15. If an execution attempt fails or is cancelled, the system records the attempt with its corresponding outcome and available execution metadata.
16. Analysis-only operations, including SQL parsing, logical representation generation, and EXPLAIN plan retrieval, do not create query history entries in the MVP.
17. The user reviews the analysis, available query results, and optimization guidance.
18. The user can revisit recorded execution attempts through their individual query history.

**Expected Outcome:** The user understands the query structure and how MySQL plans to execute it, can inspect its results when execution is requested, and retains access to their actual query execution attempts through their individual query history.

## 7.3 Educational Query Exploration Workflow

This workflow describes how students and other educational users can use the unified workspace to understand SQL queries and database execution concepts.

1. The student logs into Queralyth and opens the unified workspace.
2. The student selects the built-in sample database or one of their available database connections.
3. The student enters a supported SQL query.
4. Queralyth validates and analyzes the submitted query.
5. The system identifies its supported logical operations.
6. The system presents explanations of the query's structure and processing.
7. The student explores the generated basic logical query representation.
8. The student inspects the corresponding MySQL execution plan retrieved through EXPLAIN.
9. The student reviews explanations of important execution-plan properties and database operations.
10. Where appropriate, the student can execute the supported SELECT query and inspect its returned results.
11. The student explores the relationship between SQL syntax, logical query processing, and MySQL execution behavior.

**Expected Outcome:** The student develops an understanding of the relationship between SQL syntax, logical query processing, MySQL execution plans, and query results.

## 7.4 Engineering and Query Optimization Investigation Workflow

This workflow describes how software developers and database engineers can use the unified workspace to investigate query execution and identify optimization opportunities.

1. The developer logs into Queralyth and opens the unified workspace.
2. The developer selects one of their available MySQL database connections.
3. The developer enters a supported query for investigation.
4. Queralyth validates and analyzes the query.
5. The system generates its basic logical query representation.
6. The system retrieves and interprets the corresponding MySQL execution plan using EXPLAIN.
7. The system highlights potentially expensive execution operations and areas that may deserve further investigation.
8. The system identifies possible optimization opportunities using available query, execution-plan, and relevant schema and index information.
9. The developer reviews recommendations and their supporting evidence.
10. The developer evaluates the expected benefits, limitations, and possible trade-offs.
11. Where appropriate, the developer executes the supported query and examines its returned results.
12. The developer decides which potential improvements deserve further investigation or validation.

**Expected Outcome:** The developer gains evidence-based information for investigating query behavior and identifying potential improvements without treating estimated execution-plan information as proof of actual runtime performance.

## 7.5 Optimization Experiment Workflow (Post-MVP)

1. The user opens the Optimization Lab.
2. The user creates a controlled experiment.
3. The user selects a baseline query.
4. The user creates an alternative query or indexing strategy.
5. The system executes the experiment within an isolated environment rather than automatically modifying the user's production database.
6. The system collects relevant performance measurements.
7. The system repeats benchmark runs where appropriate.
8. The system compares execution plans and measured performance results.
9. The system presents the results, relevant testing conditions, and potential trade-offs.

**Expected Outcome:** The user can evaluate whether an optimization produces a measurable improvement under controlled conditions.

## 7.6 Database Connection Failure Workflow

1. The authenticated user enters database connection details.
2. The system attempts to establish a connection through the backend.
3. The connection attempt fails.
4. The system processes the available error information.
5. The system displays an understandable and appropriately sanitized error message without exposing database credentials, sensitive connection information, or unnecessary internal implementation details.
6. The user can correct the connection details and retry.
7. The application preserves the user's authenticated session.
8. If the connection configuration was not successfully validated, the system does not incorrectly present it as an available working connection.

**Expected Outcome:** The user understands that the connection failed and can attempt to resolve the problem without losing the application session or exposing sensitive connection information.

## 7.7 Query History Access Workflow

1. The authenticated user opens their query history.
2. The system retrieves only actual query execution attempts associated with that user's account.
3. The system displays previously executed queries and their available execution metadata.
4. The system accurately identifies each recorded execution outcome, including successful, failed, or cancelled attempts.
5. Analysis-only activities, such as SQL parsing, logical representation generation, and EXPLAIN plan retrieval, are not included in MVP query history.
6. The user selects a previous execution attempt.
7. The system displays the available historical query information.
8. The user can revisit the query in the SQL workspace for further investigation.
9. The user can delete individual history entries when desired.
10. The system verifies record ownership before allowing access to or deletion of a history entry.

**Expected Outcome:** The user can review, revisit, and manage their own actual query execution history while execution outcomes are represented accurately and records belonging to other users remain inaccessible.

### Audit clarification — built-in sample workflow

When the user selects the built-in sample database, the frontend identifies it as a built-in target rather than a user-saved connection. The backend resolves the target to its centrally configured read-only sample connection. No user credentials or saved connection record are requested. Execution, authorization, SQL validation, concurrency, timeout, and bounded-result safeguards remain in force.

