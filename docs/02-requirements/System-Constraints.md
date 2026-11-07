## 8. System Constraints and Assumptions

### 8.1 Technical Constraints

1. **Database Platform:** The initial version of Queralyth will support MySQL exclusively, targeting compatible MySQL 8.x versions.

2. **Application Type:** Queralyth will initially be developed as a web-based application.

3. **Database Access:** All database communication must occur through the backend rather than directly from the frontend.

4. **Query Execution:** The initial MVP will support a restricted set of SQL operations, prioritizing supported SELECT queries.

5. **SQL Coverage:** The query analysis engine will initially support a defined subset of SQL rather than attempting to interpret every possible SQL statement.

6. **Execution Plan Source:** MySQL will provide the underlying execution-plan information through its native EXPLAIN functionality.

7. **Optimization Recommendations:** Recommendations will be based on available query structure, relevant schema information, and execution-plan evidence. They will not guarantee performance improvements.

8. **Experiment Isolation:** Future optimization experiments must use controlled environments rather than unrestricted production database modifications.

9. **User Authentication:** Access to individual user accounts and account-specific resources must be controlled through backend authentication and authorization mechanisms.

10. **User Data Isolation:** The system must ensure that user-specific information, including query history and saved database connections, remains isolated between accounts.

11. **Credential Security:** Database credentials must remain on the backend and must not be exposed to the frontend, application responses, or logs. Persisted credentials must be protected using appropriate encryption and access controls.

12. **Query Execution Safety:** Query execution must be subject to backend validation, appropriate execution restrictions, resource limits, and timeouts. Frontend validation alone must not be considered sufficient.

### 8.2 Product Constraints

1. Queralyth will provide a unified workspace combining educational and professional database analysis capabilities.

2. Educational explanations and engineering-focused analysis will be accessible through the same workspace and shared underlying query analysis engine.

3. Separate Learning Mode and Engineering Mode interfaces will not be part of the initial MVP.

4. The initial development focus will be on reliable core functionality rather than implementing every planned feature.

5. AI-assisted explanations will remain supplementary and will not be required for core query analysis.

6. Automatic production database modifications will not be part of the initial product.

7. Each user will have an individual account, with access to their own query history and saved resources.

8. Query history and other account-specific information must be associated with the appropriate user account.

### 8.3 Development Assumptions

1. Users will have access to a compatible MySQL database or the built-in sample database.

2. Users will have a basic understanding of SQL or be willing to learn it through Queralyth.

3. The development environment will support the selected frontend, backend, and MySQL technologies.

4. MySQL will expose sufficient execution-plan information for the initial analysis features.

5. The initial application will prioritize desktop usability.

6. Users will register for individual Queralyth accounts before accessing account-specific functionality.

7. Each user's query history will be stored and retrieved in association with their authenticated account.

8. Users will have the necessary database permissions to perform the supported operations through their selected database connections.

9. Saved database connections and their credentials will be managed according to the application's security requirements.

10. Advanced benchmarking and optimization experiments will be developed after the core analysis engine is established.

### 8.4 Future Considerations

The following areas may be reconsidered as Queralyth evolves:

- Support for additional SQL features.
- More advanced execution-plan interpretation.
- Improved query optimization analysis.
- Background processing for expensive operations.
- Additional database management capabilities.
- AI-assisted database intelligence.
- Collaboration and sharing capabilities.
- More advanced account management and security features.
- Additional user workspace customization options.