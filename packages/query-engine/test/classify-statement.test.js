import test from "node:test"
import assert from "node:assert/strict"
import { classifyStatement, removeComments } from "../src/index.js"

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