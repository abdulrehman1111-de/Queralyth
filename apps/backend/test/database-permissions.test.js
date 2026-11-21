
import test, { before, after } from "node:test"
import assert from "node:assert/strict"
import mysql from "mysql2/promise"
import { env } from "../src/config/env.js"

let runtimeConnection
let migrationConnection

const fixtureTable = "permission_test_fixture"
const forbiddenTable = "permission_test_forbidden_create"

before(async () => {
    // Never allow permission tests to run against production.
    if (env.testDatabase.name !== "queralyth_test") {
        throw new Error(
            "Safety check failed: tests must use queralyth_test."
        )
    }

    if (
        !env.migrationDatabase.user ||
        !env.migrationDatabase.password
    ) {
        throw new Error("Migration database credentials are required.")
    }

    // Connect using the normal application account.
    runtimeConnection = await mysql.createConnection({
        host: env.database.host,
        port: env.database.port,
        user: env.database.user,
        password: env.database.password,
        database: env.testDatabase.name
    })

    // Connect using the migration account.
    migrationConnection = await mysql.createConnection({
        host: env.database.host,
        port: env.database.port,
        user: env.migrationDatabase.user,
        password: env.migrationDatabase.password,
        database: env.testDatabase.name
    })

    // Verify the actual database and account identities.
    const [runtimeIdentity] = await runtimeConnection.query(
        "SELECT CURRENT_USER() AS account, DATABASE() AS database_name"
    )

    const [migrationIdentity] = await migrationConnection.query(
        "SELECT CURRENT_USER() AS account, DATABASE() AS database_name"
    )

    assert.equal(
        runtimeIdentity[0].account,
        "queralyth_app@localhost"
    )

    assert.equal(
        runtimeIdentity[0].database_name,
        "queralyth_test"
    )

    assert.equal(
        migrationIdentity[0].account,
        "queralyth_migrator@localhost"
    )

    assert.equal(
        migrationIdentity[0].database_name,
        "queralyth_test"
    )

    // Prepare a disposable fixture using migration privileges.
    await migrationConnection.query(
        `DROP TABLE IF EXISTS ${fixtureTable}`
    )

    await migrationConnection.query(
        `DROP TABLE IF EXISTS ${forbiddenTable}`
    )

    await migrationConnection.query(`
        CREATE TABLE ${fixtureTable} (
            id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            label VARCHAR(100) NOT NULL,
            PRIMARY KEY (id)
        )
    `)
})

after(async () => {
    try {
        // Cleanup always uses the migration account.
        if (migrationConnection) {
            await migrationConnection.query(
                `DROP TABLE IF EXISTS ${fixtureTable}`
            )

            await migrationConnection.query(
                `DROP TABLE IF EXISTS ${forbiddenTable}`
            )
        }
    } finally {
        if (runtimeConnection) {
            await runtimeConnection.end()
        }

        if (migrationConnection) {
            await migrationConnection.end()
        }
    }
})

test("runtime account can perform CRUD operations", async () => {
    await runtimeConnection.beginTransaction()

    try {
        // INSERT
        const [insertResult] = await runtimeConnection.execute(
            `INSERT INTO ${fixtureTable} (label) VALUES (?)`,
            ["permission-test"]
        )

        assert.equal(insertResult.affectedRows, 1)

        const insertedId = insertResult.insertId

        // SELECT
        const [selectedRows] = await runtimeConnection.execute(
            `SELECT label FROM ${fixtureTable} WHERE id = ?`,
            [insertedId]
        )

        assert.equal(selectedRows.length, 1)
        assert.equal(selectedRows[0].label, "permission-test")

        // UPDATE
        const [updateResult] = await runtimeConnection.execute(
            `UPDATE ${fixtureTable} SET label = ? WHERE id = ?`,
            ["updated-permission-test", insertedId]
        )

        assert.equal(updateResult.affectedRows, 1)

        // DELETE
        const [deleteResult] = await runtimeConnection.execute(
            `DELETE FROM ${fixtureTable} WHERE id = ?`,
            [insertedId]
        )

        assert.equal(deleteResult.affectedRows, 1)
    } finally {
        // Leave the test database unchanged after CRUD testing.
        await runtimeConnection.rollback()
    }
})

test("runtime account cannot execute CREATE TABLE", async () => {
    await assert.rejects(
        runtimeConnection.query(`
            CREATE TABLE ${forbiddenTable} (
                id INT PRIMARY KEY
            )
        `),
        error => error.code === "ER_TABLEACCESS_DENIED_ERROR"
    )
})

test("runtime account cannot execute ALTER TABLE", async () => {
    await assert.rejects(
        runtimeConnection.query(`
            ALTER TABLE ${fixtureTable}
            ADD COLUMN forbidden_column INT
        `),
        error => error.code === "ER_TABLEACCESS_DENIED_ERROR"
    )
})

test("runtime account cannot execute DROP TABLE", async () => {
    await assert.rejects(
        runtimeConnection.query(
            `DROP TABLE ${fixtureTable}`
        ),
        error => error.code === "ER_TABLEACCESS_DENIED_ERROR"
    )
})


test("runtime account cannot create indexes", async () => {
    await assert.rejects(
        runtimeConnection.query(`
            CREATE INDEX idx_permission_test_label
            ON ${fixtureTable} (label)
        `),
        error => error.code === "ER_TABLEACCESS_DENIED_ERROR"
    )
})


test("runtime account cannot create temporary tables", async () => {
    await assert.rejects(
        runtimeConnection.query(`
            CREATE TEMPORARY TABLE permission_test_temporary (
                id INT PRIMARY KEY
            )
        `),
        error => error.code === "ER_DBACCESS_DENIED_ERROR"
    )
})


test("migration account can create and drop tables", async () => {
    const tableName = "migration_permission_test"

    try {
        await migrationConnection.query(`
            CREATE TABLE ${tableName} (
                id INT PRIMARY KEY
            )
        `)

        const [rows] = await migrationConnection.query(
            `SHOW TABLES LIKE '${tableName}'`
        )

        assert.equal(rows.length, 1)

        await migrationConnection.query(
            `DROP TABLE ${tableName}`
        )

        const [remainingRows] = await migrationConnection.query(
            `SHOW TABLES LIKE '${tableName}'`
        )

        assert.equal(remainingRows.length, 0)
    } finally {
        await migrationConnection.query(
            `DROP TABLE IF EXISTS ${tableName}`
        )
    }
})

