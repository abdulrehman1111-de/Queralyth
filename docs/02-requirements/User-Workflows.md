## 7. User Workflows

### 7.1 First-Time User Workflow

1. The user opens Queralyth.
2. The system presents an introduction to the platform.
3. The user chooses between Learning Mode and Engineering Mode.
4. The user selects a built-in sample database or configures a MySQL database connection.
5. The system validates the database connection.
6. After successful validation, the user enters the main workspace.
7. The user can begin writing and analyzing SQL queries.

**Expected Outcome:** The user successfully enters the Queralyth workspace with an available database connection.

### 7.2 SQL Query Analysis Workflow

1. The user opens the SQL Query Editor.
2. The user selects an available database connection.
3. The user writes or enters a supported SQL query.
4. The user requests query analysis.
5. The system validates and parses the query.
6. The system identifies its tables, columns, and major operations.
7. The system generates a logical representation of the query.
8. The system retrieves relevant MySQL execution-plan information.
9. The system presents the analysis and execution plan.
10. The user reviews the results and explanations.

**Expected Outcome:** The user understands the query structure and how MySQL plans to execute it.

### 7.3 Learning Mode Workflow

1. The student opens Learning Mode.
2. The student enters a supported SQL query.
3. Queralyth analyzes the query.
4. The system identifies its logical operations.
5. The system presents a step-by-step explanation.
6. The student explores the logical query representation.
7. The student inspects the corresponding MySQL execution plan.
8. The student reviews explanations of important database operations.

**Expected Outcome:** The student connects SQL syntax, logical query processing, and physical execution behavior.

### 7.4 Engineering Mode Workflow

1. The developer opens Engineering Mode.
2. The developer selects a MySQL database connection.
3. The developer enters a query for investigation.
4. Queralyth validates and analyzes the query.
5. The system retrieves its execution plan.
6. The system highlights potentially expensive operations.
7. The system identifies possible optimization opportunities.
8. The developer reviews recommendations and their supporting evidence.
9. The developer decides which improvements deserve further investigation.

**Expected Outcome:** The developer gains useful information for investigating and improving query performance.

### 7.5 Optimization Experiment Workflow (Post-MVP)

1. The user opens the Optimization Lab.
2. The user creates a controlled experiment.
3. The user selects a baseline query.
4. The user creates an alternative query or indexing strategy.
5. The system executes the experiment in an isolated environment.
6. The system collects performance measurements.
7. The system repeats benchmark runs where appropriate.
8. The system compares execution plans and performance measurements.
9. The system presents the results and relevant trade-offs.

**Expected Outcome:** The user can evaluate whether an optimization produces a measurable improvement under controlled conditions.

### 7.6 Database Connection Failure Workflow

1. The user enters database connection details.
2. The system attempts to establish a connection.
3. The connection attempt fails.
4. The system identifies the available error information.
5. The system displays an understandable error message.
6. The user can correct the details and retry.

**Expected Outcome:** The user understands that the connection failed and can attempt to resolve the problem without losing the application session.