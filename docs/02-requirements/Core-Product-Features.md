## 4. Core Product Features

### 4.1 Database Connection Management

Users should be able to connect Queralyth to a supported MySQL  database.

**Core capabilities:**
- Connect to an external MySQL database.
- Use a built-in sample database for experimentation.
- Validate database connection details.
- Display connection status.
- Manage saved database connections securely.

**MVP Priority:** High

### 4.2 SQL Query Editor

Queralyth should provide an environment where users can write, edit, and submit SQL queries.

**Core capabilities:**
- Write and edit SQL queries.
- Provide SQL syntax highlighting.
- Validate supported SQL syntax.
- Execute supported SELECT queries.
- Display query results in a structured table.
- Maintain a history of executed queries.

**MVP Priority:** High

### 4.3 SQL Query Understanding

Queralyth should analyze the structure of supported SQL queries and explain their logical components.

**Core capabilities:**
- Identify tables and columns.
- Identify filtering and joining conditions.
- Recognize supported SQL operations.
- Explain the logical structure of a query.
- Represent query operations through a logical plan.
- Introduce relational algebra visualizations.

**MVP Priority:** High for basic structural analysis; advanced relational algebra visualization is post-MVP.

### 4.4 Execution Plan Analysis

Queralyth should retrieve and interpret execution plan information from MySQL.

**Core capabilities:**
- Retrieve execution plans using MySQL EXPLAIN.
- Identify major execution operations.
- Display relevant execution-plan properties.
- Highlight potentially expensive operations.
- Present execution plans through an interactive visualization.
- Explain important execution-plan details.

**MVP Priority:** High

### 4.5 Query Optimization Guidance

Queralyth should identify potential query optimization opportunities based on available query and execution-plan information.

**Core capabilities:**
- Identify potentially inefficient query patterns.
- Highlight possible indexing opportunities.
- Explain why a query pattern may cause performance concerns.
- Provide contextual optimization suggestions.
- Explain the expected benefit and possible trade-offs of recommendations.

**MVP Priority:** Basic guidance in MVP; advanced recommendations post-MVP.

### 4.6 Optimization Experiment Lab

Queralyth should eventually provide a controlled environment where users can test alternative queries and indexing strategies.

**Core capabilities:**
- Create optimization experiments.
- Compare alternative query versions.
- Evaluate indexing strategies.
- Measure query execution performance.
- Compare execution plans.
- Present experiment results.

**MVP Priority:** Post-MVP

### 4.7 Performance Benchmarking

Queralyth should provide tools for measuring and comparing query performance.

**Core capabilities:**
- Execute controlled benchmark runs.
- Collect execution-time measurements.
- Perform repeated measurements.
- Calculate median execution time.
- Compare performance before and after changes.
- Distinguish estimated execution information from actual runtime measurements.

**MVP Priority:** Post-MVP

### 4.8 Schema Intelligence

Queralyth should eventually help users understand the structure of their MySQL databases.

**Core capabilities:**
- Display database tables and columns.
- Show relationships between tables.
- Visualize primary and foreign keys.
- Display index information.
- Help users understand how schema design relates to query performance.

**MVP Priority:** Post-MVP

### 4.9 AI-Assisted Database Explanations

Queralyth may use AI to make complex database analysis easier to understand.

**Core capabilities:**
- Explain execution-plan information in natural language.
- Simplify technical optimization recommendations.
- Answer contextual questions about analyzed queries.
- Help users understand why a particular optimization may be useful.

**MVP Priority:** Future enhancement

AI will support the analysis engine rather than replace its underlying SQL analysis and database reasoning.

### 4.10 Reports and Saved Analysis

Queralyth should eventually allow users to preserve and revisit their analysis.

**Core capabilities:**
- Save analyzed queries.
- Save optimization experiments.
- Review previous analysis results.
- Generate query analysis reports.
- Compare historical optimization results.

**MVP Priority:** Post-MVP