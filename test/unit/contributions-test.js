/* global describe, it */
"use strict";

const assert = require("assert");
const ContributionsHandler = require("../../app/routes/contributions");

function submit(body, error) {
    const writes = [];
    const db = {
        collection: name => name === "contributions" ? {
            update: (query, document, options, callback) => {
                writes.push(document);
                callback(error);
            }
        } : {
            findOne: (query, callback) => callback(null, { userName: "test" })
        }
    };
    let rendered;
    let forwarded;
    new ContributionsHandler(db).handleContributionsUpdate({
        body,
        session: { userId: 1 }
    }, {
        render: (view, data) => {
            assert.strictEqual(view, "contributions");
            rendered = data;
        }
    }, err => { forwarded = err; });
    return { writes, rendered, forwarded };
}

describe("Contribution input validation", () => {
    it("persists decimal percentages at the total limit", () => {
        const result = submit({ preTax: " 10.5 ", afterTax: "19", roth: ".5" });
        assert.strictEqual(result.writes.length, 1);
        assert.strictEqual(result.writes[0].preTax, 10.5);
        assert.strictEqual(result.writes[0].afterTax, 19);
        assert.strictEqual(result.writes[0].roth, 0.5);
        assert.strictEqual(result.rendered.updateSuccess, true);
    });

    it("accepts zero and numeric JSON values", () => {
        const result = submit({ preTax: 0, afterTax: 2.5, roth: "0" });
        assert.strictEqual(result.writes.length, 1);
        assert.strictEqual(result.writes[0].afterTax, 2.5);
    });

    ["preTax", "afterTax", "roth"].forEach(field => {
        it("rejects invalid values in " + field + " without executing or writing", () => {
            const values = [
                "global.__contributionExecuted = true; 1", "1 + 2", "1;", "1abc", "0x10", "1e1",
                "", " ", "NaN", "Infinity", "-Infinity", "-1", "1e309", "9".repeat(400),
                null, undefined, true, [], [1], {}, NaN, Infinity, -Infinity, -1
            ];
            try {
                values.forEach(value => {
                    const body = { preTax: "0", afterTax: "0", roth: "0" };
                    body[field] = value;
                    const result = submit(body);
                    assert.strictEqual(global.__contributionExecuted, undefined);
                    assert.strictEqual(result.writes.length, 0);
                    assert.strictEqual(result.rendered.updateError, "Invalid contribution percentages");
                    assert.strictEqual(result.forwarded, undefined);
                });
            } finally {
                delete global.__contributionExecuted;
            }
        });
    });

    it("rejects totals above 30 before writing", () => {
        const result = submit({ preTax: "10", afterTax: "10", roth: "10.1" });
        assert.strictEqual(result.writes.length, 0);
        assert.strictEqual(result.rendered.updateError, "Contribution percentages cannot exceed 30 %");
    });

    it("forwards database errors", () => {
        const error = new Error("Database unavailable");
        const result = submit({ preTax: "1", afterTax: "2", roth: "3" }, error);
        assert.strictEqual(result.forwarded, error);
        assert.strictEqual(result.rendered, undefined);
    });
});
