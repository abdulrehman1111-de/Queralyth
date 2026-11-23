import test from "node:test"
import assert from "node:assert/strict"
import { classifyStatement, removeComments, sqlScanner } from "../src/index.js"

test("Classifies a SELECT statement", ()=>{

    const result = classifyStatement("SELECT * FROM users")

    assert.deepEqual(result, {
        type: "SELECT"
    })
})

test("Classifies a lowercase SELECT statement", () => {
    const result = classifyStatement("select * FROM users");

    assert.deepEqual(result, {
        type: "SELECT"
    });
});

test("Handles leading whitespace", () => {
    const result = classifyStatement("   UPDATE users SET name = 'Ali'");

    assert.deepEqual(result, {
        type: "UPDATE"
    });
});

test("Handles multiple spaces between SQL tokens", () => {
    const result = classifyStatement("SELECT     * FROM users");

    assert.deepEqual(result, {
        type: "SELECT"
    });
});

test("Handles an empty SQL statement", () => {
    const result = classifyStatement("   ");

    assert.deepEqual(result, {
        type: "UNKNOWN"
    });
});

test("Removes a single-line SQL comment", () => {
    const result = removeComments("-- Get all users\nSELECT * FROM users;");

    assert.equal(result, "\nSELECT * FROM users;");
});

test("Does not remove double dashes without following whitespace", () => {
    const result = removeComments("SELECT 10--2;");

    assert.equal(result, "SELECT 10--2;");
});

test("Preserves double dashes inside single quotes", () => {
    const result = removeComments(
        "SELECT 'value-- another-value' FROM users;"
    );

    assert.equal(
        result,
        "SELECT 'value-- another-value' FROM users;"
    );
});

test("Handles a single-quoted string", () => {
    assert.equal(sqlScanner("'Hello world'"), "'Hello world'");
});

test("Handles multiple single-quoted strings", () => {
    assert.equal(
        sqlScanner("'First' and 'Second'"),
        "'First' and 'Second'"
    );
});

test("Handles escaped single quotes", () => {
    assert.equal(
        sqlScanner("'It''s working'"),
        "'It''s working'"
    );
});

test("Preserves Windows-style line endings after comments", () => {
    const sqlStatement = "-- comment\r\nSELECT * FROM users;";

    assert.equal(
        removeComments(sqlStatement),
        "\r\nSELECT * FROM users;"
    );
});