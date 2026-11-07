## 3. User Roles and User Personas

### 3.1 User Roles

Queralyth will support the following primary user roles:

#### 1. Student

Students use Queralyth to understand SQL concepts, visualize query processing, learn relational algebra, and explore database optimization techniques.

Their primary goal is educational understanding rather than production-level database management.

#### 2. Software Developer

Software developers use Queralyth to investigate SQL queries, understand execution plans, identify inefficient query patterns, and explore possible performance improvements.

Their primary goal is writing and maintaining efficient database queries in real-world applications.

#### 3. Database Professional

Database professionals use Queralyth to investigate database execution behavior, evaluate query performance, understand indexing opportunities, and conduct controlled optimization experiments.

Their primary goal is deeper database analysis and performance investigation.

#### 4. Technical Educator

Technical educators use Queralyth as a supporting tool for demonstrating SQL processing, relational algebra, execution plans, and database optimization concepts.

Their primary goal is making complex database concepts easier to teach and demonstrate.

### 3.2 User Personas

#### Persona 1: The Database Student

**Profile:** A computer science student learning advanced database systems and SQL.

**Goals:**
- Understand how SQL queries work internally.
- Visualize relational algebra operations.
- Learn how MySQL processes queries.
- Understand why certain queries perform poorly.

**Challenges:**
- Difficulty interpreting raw execution plans.
- Limited understanding of query optimization.
- Difficulty connecting theoretical concepts with actual database behavior.

**Expected Value from Queralyth:** An interactive learning environment that connects SQL theory with real MySQL execution.

#### Persona 2: The Full-Stack Developer

**Profile:** A developer building applications that rely on MySQL databases.

**Goals:**
- Investigate slow or inefficient queries.
- Understand execution plans.
- Improve query structure.
- Explore indexing opportunities.

**Challenges:**
- Limited visibility into database execution behavior.
- Difficulty interpreting optimization information.
- Uncertainty about whether a proposed improvement actually helps.

**Expected Value from Queralyth:** A practical analysis environment that helps investigate and improve SQL query performance.

#### Persona 3: The Database Engineer

**Profile:** A professional responsible for database performance, query efficiency, and database reliability.

**Goals:**
- Investigate expensive database operations.
- Evaluate indexing strategies.
- Compare query execution behavior.
- Conduct measurable optimization experiments.

**Challenges:**
- Manually connecting information from different database tools.
- Evaluating optimization changes reliably.
- Explaining execution behavior to other team members.

**Expected Value from Queralyth:** A unified environment for query analysis, execution-plan investigation, and controlled optimization experiments.

#### Persona 4: The Technical Educator

**Profile:** An instructor teaching SQL, relational algebra, or database systems.

**Goals:**
- Demonstrate query processing visually.
- Explain execution plans.
- Show how query structure affects performance.
- Connect theoretical concepts with practical examples.

**Challenges:**
- Explaining abstract database concepts.
- Demonstrating execution behavior using raw database output.
- Finding interactive teaching tools.

**Expected Value from Queralyth:** A visual demonstration platform that makes database concepts easier to explain.

### 3.3 User Experience Modes

Queralyth will eventually support two complementary experience modes:

**Learning Mode**
- Step-by-step query explanations.
- Relational algebra visualizations.
- Conceptual explanations of execution plans.
- Educational optimization examples.

**Engineering Mode**
- Detailed execution-plan analysis.
- Performance metrics.
- Optimization recommendations.
- Controlled benchmarking and experiment comparisons.

Both modes will use the same underlying query analysis engine while presenting information according to the user's needs.

### Unified Workspace Approach

Queralyth will provide a single unified workspace for all supported user roles and personas.

Rather than separating students, developers, and database engineers into different product interfaces, Queralyth will serve their needs through a shared analysis environment powered by the same underlying query analysis engine.

The workspace will provide both accessible explanations and technical analysis capabilities, allowing users to explore information at the level of detail they need.

For example:

- **Students:** Can understand SQL query structure, logical operations, and execution plans through contextual explanations and visualizations.
- **Software Developers:** Can investigate query execution plans, identify potential performance concerns, and explore optimization opportunities.
- **Database Engineers:** Can examine execution details, evaluate index-related recommendations, and investigate query performance.

The information presented may vary according to the user's task and the level of technical detail required, but the underlying workspace and core analysis capabilities remain shared.

Separate Learning Mode and Engineering Mode interfaces are not included in the MVP scope. They may be considered as optional experience enhancements in future releases if user feedback demonstrates a clear need.

### Unified Workspace Experience

All core product features will be accessible through a single unified workspace.

Queralyth will not maintain separate Learning Mode and Engineering Mode interfaces in the MVP. Instead, educational explanations, query visualizations, execution-plan analysis, and optimization guidance will be integrated into the same environment.

The workspace will support different user needs through contextual explanations and varying levels of technical detail.

Its core capabilities will include:

- SQL query editing and execution.
- Query structure understanding and logical representation.
- MySQL execution-plan analysis and visualization.
- Contextual explanations of query behavior.
- Identification of potential performance concerns.
- Evidence-based optimization recommendations.

The same analysis capabilities will serve all supported user personas. Users will be able to explore the information relevant to their tasks without switching between separate product modes.

Separate specialized interfaces may be considered in future releases based on user feedback and product requirements.