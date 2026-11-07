# 9. MVP Definition and Release Criteria

## 9.1 MVP Purpose

The purpose of the Queralyth MVP is to establish a functional database intelligence platform that allows authenticated users to submit supported SQL queries, understand their structure, inspect MySQL execution plans, and identify potential optimization opportunities through a single unified workspace.

The MVP will provide individual user accounts, private query histories, and secure database connection management while combining educational explanations with engineering-focused analysis capabilities.

The MVP will distinguish between SQL query understanding, estimated execution-plan analysis, and actual query execution. These capabilities will work together to provide users with a clearer understanding of SQL structure, MySQL execution behavior, and potential optimization opportunities.

The MVP will focus on delivering a reliable, secure, and meaningful core experience rather than implementing every feature planned for the complete product.

## 9.2 MVP Features

The initial MVP will include the following capabilities:

### 1. User Account Management

- Allow users to register individual Queralyth accounts.
- Allow registered users to authenticate and log in.
- Manage authenticated user sessions.
- Provide secure logout functionality.
- Associate user-specific resources with their respective authenticated accounts.
- Enforce backend authorization and resource-ownership validation.
- Prevent unauthorized access to another user's account information and resources.

### 2. Database Connection Management

- Connect to a supported MySQL 8.x database.
- Provide a built-in sample database.
- Validate database connection details.
- Allow authenticated users to create, retrieve, update, and delete their own saved database connection configurations.
- Handle connection failures appropriately.
- Keep database credentials exclusively on the backend.
- Encrypt persisted database credentials at rest using encryption keys managed separately from stored credentials.
- Restrict credential access and decryption to authorized backend operations required for establishing database connections.
- Exclude sensitive credentials from frontend responses, application logs, and error messages.
- Use appropriately restricted database accounts with only the permissions required for supported operations.
- Restrict outbound database connections in hosted deployments to prevent access to unauthorized internal network resources and other prohibited destinations.

### 3. SQL Query Editor and Execution

- Provide an interface for writing and editing SQL queries.
- Support basic SQL syntax highlighting.
- Validate supported SQL statements through server-side parsing and validation.
- Enforce an allowlist of supported query structures before execution.
- Execute supported SELECT queries subject to backend validation and execution restrictions.
- Reject multiple statements, unsupported statement types, locking clauses, file-output operations, and other excluded or potentially unsafe query structures.
- Distinguish query analysis and execution-plan retrieval from actual query execution.
- Display successfully retrieved query results in a structured table.
- Enforce configurable query execution time limits and provide query cancellation where supported.
- Enforce configurable result-size limits and provide pagination or an equivalent mechanism for larger result sets.
- Maintain individual query histories associated with authenticated user accounts.
- Store query text and relevant execution metadata rather than complete result datasets by default.
- Represent successful, failed, and cancelled execution outcomes accurately where those attempts are retained.
- Allow users to retrieve and review their previous queries.
- Allow users to remove individual query history entries.

### 4. Basic SQL Query Understanding

- Parse a defined subset of SQL.
- Identify tables, columns, filters, and joins where supported.
- Recognize major logical query operations.
- Generate a basic logical operator tree or equivalent logical query representation.
- Explain the structure of supported queries.
- Communicate when submitted SQL falls outside the supported syntax subset.
- Distinguish the logical query representation from MySQL's physical execution plan.

### 5. Execution Plan Analysis

- Retrieve estimated MySQL execution plans using EXPLAIN.
- Interpret important execution-plan properties.
- Display execution-plan information in a structured format.
- Provide a basic visual representation of execution-plan operations.
- Highlight operations that may deserve further investigation.
- Explain important execution-plan properties and operations.
- Clearly distinguish optimizer estimates from actual execution measurements.
- Handle unavailable or unsupported execution-plan information appropriately.

### 6. Basic Optimization Guidance

- Identify selected inefficient SQL patterns within the supported analysis scope.
- Retrieve relevant table, column, and existing index metadata required for basic analysis.
- Highlight potential indexing opportunities.
- Provide contextual optimization suggestions.
- Explain the reasoning and available evidence behind recommendations.
- Communicate relevant limitations and potential trade-offs.
- Clearly communicate that suggestions are potential improvements and require validation.
- Avoid guaranteeing performance improvements based solely on estimated execution-plan information.
- Avoid presenting recommendations as verified when the required query, execution-plan, or schema information is unavailable.

### 7. Unified Workspace

- Provide a single workspace for all supported user roles and personas.
- Integrate educational explanations and engineering-focused analysis capabilities.
- Make query editing, query understanding, execution-plan analysis, and available optimization guidance accessible within the same environment.
- Allow users to explore technical information according to their individual needs without switching between separate product modes.
- Present query structure, execution-plan information, and query results as distinct but related parts of the analysis experience.

## 9.3 Features Excluded from the Initial MVP

The following features will be developed after the MVP:

- Advanced relational algebra visualization and interactive transformations.
- EXPLAIN ANALYZE-based actual runtime investigation.
- Optimization Experiment Lab.
- Advanced performance benchmarking and repeated benchmark comparisons.
- Comprehensive schema visualization and advanced schema analysis.
- AI-assisted explanations.
- Advanced reporting and saved analysis.
- Collaboration features.
- Support for additional database management systems.
- Separate Learning Mode and Engineering Mode interfaces.
- Advanced account customization and collaboration management.
- Advanced interactive execution-plan exploration.
- Automated production database schema or index modifications.

These features are outside the initial release scope and will not be mandatory for MVP acceptance.

## 9.4 MVP Release Criteria

The MVP will be considered ready for release when:

1. Users can successfully register individual Queralyth accounts.
2. Registered users can securely log in and log out.
3. The system manages authenticated user sessions appropriately.
4. Backend authentication and authorization protect account-specific functionality.
5. Users can access only their own account-specific resources.
6. Users can connect to a supported MySQL database or use the built-in sample database.
7. Users can create, retrieve, update, and delete their own saved database connection configurations.
8. Persisted database credentials are encrypted at rest.
9. Encryption keys are managed separately from stored encrypted credentials.
10. Credential access and decryption are restricted to authorized backend operations.
11. Database credentials are not exposed through frontend code, application responses, logs, or error messages.
12. Database connections use appropriately restricted permissions.
13. Hosted deployments enforce appropriate restrictions on outbound database connections.
14. Users can submit supported SELECT queries.
15. The backend parses and validates submitted queries against the defined allowlist of supported query structures.
16. Multiple statements, unsupported statement types, locking clauses, file-output operations, and other excluded query structures are rejected.
17. Query analysis, estimated execution-plan retrieval, and actual query execution are handled as distinct operations.
18. Query execution timeouts and result-size limits are enforced.
19. Users can cancel supported running queries.
20. Query results are displayed correctly, with pagination or equivalent handling for larger result sets.
21. Users can retrieve and review their individual query histories.
22. Users can remove individual query history entries.
23. Query history records accurately represent successful, failed, and cancelled execution outcomes where those attempts are retained.
24. The system can analyze supported query structures and generate basic logical representations.
25. The system can distinguish logical query representations from MySQL physical execution plans.
26. The system can retrieve and interpret relevant MySQL execution-plan information through EXPLAIN.
27. Execution plans are presented in an understandable basic visual format.
28. Estimated execution-plan information is clearly distinguished from actual execution measurements.
29. The system can identify selected potential optimization opportunities using available query, execution-plan, and schema information.
30. Optimization recommendations include understandable explanations, supporting evidence where available, and appropriate limitations.
31. The unified workspace provides access to both educational explanations and engineering-focused analysis capabilities.
32. Connection failures, validation errors, unsupported queries, and query execution errors are handled appropriately.
33. Users cannot access another user's query history or saved database connections by manipulating application requests.
34. Core functionality passes its required tests, including security, authorization, and data-isolation tests.
35. The application provides a usable experience across supported desktop browsers.
36. The application works with the MySQL versions defined as supported for the MVP.

## 9.5 MVP Success Indicators

The initial release should demonstrate that users can:

- Create and access their own Queralyth accounts.
- Maintain private query histories and saved database connections.
- Understand supported SQL queries more easily.
- Explore basic logical query representations.
- Interpret important MySQL execution-plan operations.
- Identify potential performance concerns.
- Understand why an optimization recommendation was generated.
- Distinguish estimated execution information from actual performance measurements.
- Execute supported queries and inspect their returned results.
- Explore educational and engineering-focused capabilities within one unified workspace.
- Use Queralyth as a practical learning and query investigation environment.

The initial MVP will prioritize functional reliability, account security, technical correctness, and meaningful user value over the total number of implemented features.

