## 7. User Workflows

### 7.1 First-Time User Workflow

1. The user opens Queralyth.
2. The system presents an introduction to the platform and its capabilities.
3. The user creates an individual account through the registration process.
4. The user logs in using their account credentials.
5. The system establishes an authenticated user session.
6. The user accesses the Queralyth unified workspace.
7. The user selects a built-in sample database or configures an external MySQL database connection.
8. The system validates the database connection.
9. After successful validation, the system associates the saved connection configuration with the user's account.
10. The user enters the SQL workspace.
11. The user can access SQL query editing, query understanding, execution-plan analysis, and available optimization guidance within the same environment.

**Expected Outcome:** The user successfully creates an account, accesses the Queralyth unified workspace, establishes an available database connection, and can begin analyzing SQL queries.

### 7.2 SQL Query Analysis Workflow

1. The user opens the SQL Query Editor within the unified workspace.
2. The user selects one of their available database connections.
3. The user writes or enters a supported SQL query.
4. The user requests query analysis.
5. The system validates and parses the query.
6. The system identifies its tables, columns, and major operations.
7. The system generates a logical representation of the query.
8. The system retrieves relevant MySQL execution-plan information.
9. The system presents the logical representation, execution plan, and contextual explanations.
10. The system associates the query text and relevant execution metadata with the authenticated user's query history.
11. The user reviews the analysis and available optimization guidance.
12. The user can revisit the analysis through their individual query history.

**Expected Outcome:** The user understands the query structure and how MySQL plans to execute it, while retaining access to their own query history.

### 7.3 Educational Query Exploration Workflow

This workflow describes how students and other educational users can use the unified workspace to understand SQL queries and database execution concepts.

1. The student logs into Queralyth and opens the unified workspace.
2. The student enters a supported SQL query.
3. Queralyth analyzes the query.
4. The system identifies its logical operations.
5. The system presents explanations of the query's structure and processing.
6. The student explores the logical query representation.
7. The student inspects the corresponding MySQL execution plan.
8. The student reviews explanations of important database operations and their relationships to query execution.

**Expected Outcome:** The student develops an understanding of the relationship between SQL syntax, logical query processing, and MySQL execution behavior.

### 7.4 Engineering and Query Optimization Investigation Workflow

This workflow describes how software developers and database engineers can use the unified workspace to investigate query execution and identify optimization opportunities.

1. The developer logs into Queralyth and opens the unified workspace.
2. The developer selects one of their available MySQL database connections.
3. The developer enters a query for investigation.
4. Queralyth validates and analyzes the query.
5. The system retrieves its MySQL execution plan.
6. The system highlights potentially expensive execution operations.
7. The system identifies possible optimization opportunities using available query, execution-plan, and relevant schema information.
8. The developer reviews recommendations and their supporting evidence.
9. The developer evaluates the expected benefits and possible trade-offs.
10. The developer decides which improvements deserve further investigation.

**Expected Outcome:** The developer gains useful, evidence-based information for investigating query performance and identifying potential improvements.

### 7.5 Optimization Experiment Workflow (Post-MVP)

1. The user opens the Optimization Lab.
2. The user creates a controlled experiment.
3. The user selects a baseline query.
4. The user creates an alternative query or indexing strategy.
5. The system executes the experiment within an isolated environment rather than automatically modifying the user's production database.
6. The system collects performance measurements.
7. The system repeats benchmark runs where appropriate.
8. The system compares execution plans and performance measurements.
9. The system presents the results and relevant trade-offs.

**Expected Outcome:** The user can evaluate whether an optimization produces a measurable improvement under controlled conditions.

### 7.6 Database Connection Failure Workflow

1. The authenticated user enters database connection details.
2. The system attempts to establish a connection.
3. The connection attempt fails.
4. The system identifies the available error information.
5. The system displays an understandable error message without exposing sensitive connection credentials.
6. The user can correct the details and retry.
7. The application preserves the user's authenticated session.

**Expected Outcome:** The user understands that the connection failed and can attempt to resolve the problem without losing the application session or exposing sensitive connection information.

### 7.7 Query History Access Workflow

1. The authenticated user opens their query history.
2. The system retrieves query history entries associated with that user's account.
3. The system displays previously executed queries and their available execution metadata.
4. The user selects a previous query.
5. The system displays the available historical query information.
6. The user can revisit the query for further investigation.
7. The user can delete individual history entries when desired.

**Expected Outcome:** The user can review, revisit, and manage their own query history without accessing another user's records.