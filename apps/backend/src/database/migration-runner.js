import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import mysql from "mysql2/promise";
import { env } from "../config/env.js";

const currentFilePath = fileURLToPath(import.meta.url);

const currentDirectory = path.dirname(currentFilePath);

const migrationsDirectory = path.resolve(
  currentDirectory,
  "../../../../database/migrations",
);

async function createMigrationTable(connection) {
  const query = `
    CREATE TABLE IF NOT EXISTS schema_migrations (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL UNIQUE,
    checksum CHAR(64) NOT NULL,
    applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    execution_time_ms BIGINT UNSIGNED NOT NULL
    ) ENGINE=InnoDB
     DEFAULT CHARACTER SET = utf8mb4
     COLLATE=utf8mb4_0900_ai_ci
    `;

  await connection.query(query);
}

async function createMigrationConnection() {
  return mysql.createConnection({
    host: env.database.host,
    port: env.database.port,
    user: env.database.user,
    password: env.database.password,
    database: env.database.name,

    charset: "utf8mb4",
    timezone: "Z",
    multipleStatements: true,
  });
}

async function getMigrationFiles() {
  const entries = await fs.readdir(migrationsDirectory, {
    withFileTypes: true,
  });

  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort((a, b) => {
      const identifierA = Number.parseInt(a, 10)
      const identifierB = Number.parseInt(b, 10)

      return identifierA - identifierB;
    });

  if(files.length === 0){
    throw new Error(
        `No SQL migration files found in: ${migrationsDirectory}`
    )
  }  
}

async function calculateChecksum(filepath) {
  const fileContent = await fs.readFile(filepath);

  return crypto.createHash("sha256").update(fileContent).digest("hex");
}

async function getAppliedMigrations(connection) {
  const [rows] = await connection.query(
    `
        SELECT migration_name, checksum
        FROM schema_migrations
        ORDER BY id ASC
        `,
  );

  return rows;
}

async function validateAppliedMigrations(files, appliedMigrations) {
  const appliedMap = new Map(
    appliedMigrations.map((migration) => [
      migration.migration_name,
      migration.checksum,
    ]),
  );

  const availableFiles = new Set(files);

  for (const migration of appliedMigrations) {
    if (!availableFiles.has(migration.migration_name)) {
      throw new Error(
        `Previously applied migration is missing: ${migration.migration_name}`,
      );
    }
  }

  for (const file of files) {
    const storedChecksum = appliedMap.get(file);

    if (!storedChecksum) {
      continue;
    }

    const filePath = path.join(migrationsDirectory, file);
    const currentChecksum = await calculateChecksum(filePath);

    if (currentChecksum !== storedChecksum) {
      throw new Error(`Applied migration has been modified: ${file}`);
    }
  }

  let pendingMigrationFound = false;

  for (const file of files) {
    const isApplied = appliedMap.has(file);

    if (!isApplied) {
      pendingMigrationFound = true;
    } else if (pendingMigrationFound) {
      throw new Error(
        `Migration sequence is inconsistent: ${file} was applied after a pending migration`,
      );
    }
  }
}

async function getPendingMigrations(files, appliedMigrations) {
  const appliedNames = new Set(
    appliedMigrations.map((migration) => migration.migration_name),
  );

  return files.filter((file) => !appliedNames.has(file));
}

function validateMigrationFilenames(files) {
  const identifiers = [];
  const seenIdentifiers = new Set()

  for (const file of files) {
    const match = file.match(/^(\d{3,})_[a-z0-9]+(?:_[a-z0-9]+)*\.sql$/);

    if (!match) {
      throw new Error(`Invalid migration filename: ${file}`);
    }

    const identifier = Number(match[1])

    if(!Number.isSafeInteger(identifier)){
        throw new Error(
            `Migration identifier exceeds the safe integer reange: ${file}`
        )
    }

    if(seenIdentifiers.has(identifier)){
        throw new Error(
            `Duplicate migration identifier: ${String(identifier).padStart(3, "0")}`
        )
    }

    seenIdentifiers.add(identifier)
    identifiers.push(identifier)
  }

  for (let index = 0; index < identifiers.length; index++) {
    const expectedIdentifier = index + 1;

    if (identifiers[index] !== expectedIdentifier) {
      throw new Error(
        `Migration sequence error: expected ${String(expectedIdentifier).padStart(3, "0")}`,
      );
    }
  }
}

async function executeMigration(connection, file) {
  const filePath = path.join(migrationsDirectory, file);

  const fileContent = await fs.readFile(filePath);

  const sql = fileContent.toString("utf8");
  if (!sql.trim()) {
    throw new Error(`Migration file is empty: ${file}`);
  }

  const checksum = crypto
    .createHash("sha256")
    .update(fileContent)
    .digest("hex");

  const startTime = Date.now();
  let stage = "SQL execution"

  try{
    await connection.query(sql);
    
    stage = "migration tracking"

    const executionTime = Date.now() - startTime;

    await connection.query(
    `
        INSERT INTO schema_migrations(
        migration_name, checksum, execution_time_ms
        ) VALUES (?, ? , ?)
        `,
    [file, checksum, executionTime],
  );

  console.log(`Migration applied: ${file} (${executionTime}ms)`);
  }
  catch(error){
    throw new Error(
        `Migration "${file}" failed during ${stage}. ` + "The database may have been partially modified. " + "Inspect its state before attempting another migration run.", {cause: error}
    )
  }
  

  
}

async function acquireMigrationLock(connection) {
  const [rows] = await connection.query(
    "SELECT GET_LOCK('queralyth_schema_migrations', 10) AS lockStatus",
  );

  if (rows[0].lockStatus !== 1) {
    throw new Error(
      "Could not acquire migration lock. Another migration process may be running.",
    );
  }

  console.log("Migration lock acquired.");
}

async function releaseMigrationLock(connection) {
  const [rows] = await connection.query(
    "SELECT RELEASE_LOCK('queralyth_schema_migrations') AS lockStatus",
  );

  if (rows[0].lockStatus !== 1) {
    throw new Error("Failed to release migration lock.");
  }

  console.log("Migration lock released.");
}

async function runMigrations() {
  let connection;
  let lockAcquired = false;

  try {
    const files = await getMigrationFiles();

    validateMigrationFilenames(files);

    connection = await createMigrationConnection();

    await connection.query("SET time_zone = '+00:00'");

    await acquireMigrationLock(connection);
    lockAcquired = true;

    await createMigrationTable(connection);

    const appliedMigrations = await getAppliedMigrations(connection);

    await validateAppliedMigrations(files, appliedMigrations);

    const pendingMigrations = await getPendingMigrations(
      files,
      appliedMigrations,
    );

    if (pendingMigrations.length === 0) {
      console.log("Database is already up to date.");
      return;
    }

    console.log(`${pendingMigrations.length} pending migrations(s) found.`);

    for (const file of pendingMigrations) {
      await executeMigration(connection, file);
    }
    console.log("All migrations completed successfully");
  } catch (error) {
    console.error("Migration failed:", error.message);
    throw error;
  } finally {
    if (connection) {
      try {
        if (lockAcquired) {
          await releaseMigrationLock(connection);
        }
      } finally {
        await connection.end();
      }
    }
  }
}

runMigrations().catch((error) => {
  console.error("Migration failed:", error);
  process.exitCode = 1;
});
