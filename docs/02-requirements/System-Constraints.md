## 8. System Constraints and Assumptions

### 8.1 Technical Constraints

1. **Database Platform:** The initial version of Queralyth will support MySQL  exclusively.

2. **Application Type:** Queralyth will initially be developed as a web-based application.

3. **Database Access:** All database communication must occur through the backend rather than directly from the frontend.

4. **Query Execution:** The initial MVP will support a restricted set of SQL operations, prioritizing SELECT queries.

5. **SQL Coverage:** The query analysis engine will initially support a defined subset of SQL rather than attempting to interpret every possible SQL statement.

6. **Execution Plan Source:** MySQL will provide the underlying execution-plan information through its native EXPLAIN functionality.

7. **Optimization Recommendations:** Recommendations will be based on available query structure, schema information, and execution-plan evidence. They will not guarantee performance improvements.

8. **Experiment Isolation:** Future optimization experiments must use controlled environments rather than unrestricted production database modifications.

### 8.2 Product Constraints

1. Queralyth will combine educational and professional database analysis experiences.

2. Learning Mode and Engineering Mode will share the same underlying query analysis engine.

3. The initial development focus will be on reliable core functionality rather than implementing every planned feature.

4. AI-assisted explanations will remain supplementary and will not be required for core query analysis.

5. Automatic production database modifications will not be part of the initial product.

### 8.3 Development Assumptions

1. Users will have access to a compatible MySQL database or the built-in sample database.

2. Users will have a basic understanding of SQL or be willing to learn it through Queralyth.

3. The development environment will support the selected frontend, backend, and MySQL technologies.

4. MySQL will expose sufficient execution-plan information for the initial analysis features.

5. The initial application will prioritize desktop usability.

6. Advanced benchmarking and optimization experiments will be developed after the core analysis engine is established.

### 8.4 Future Considerations

The following areas may be reconsidered as Queralyth evolves:

- Support for additional SQL features.
- More advanced execution-plan interpretation.
- Improved query optimization analysis.
- Background processing for expensive operations.
- Additional database management capabilities.
- AI-assisted database intelligence.
- Collaboration and sharing capabilities.