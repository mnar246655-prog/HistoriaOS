const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const collections = [
    "books/books.json",
    "people/people.json",
    "events/events.json"
];

function isSample(record) {
    return record.isSample === true
        || (typeof record.id === "string" && record.id.startsWith("sample-"))
        || (typeof record.sampleId === "string" && record.sampleId.length > 0);
}

for (const relativePath of collections) {
    const filePath = path.join(root, relativePath);
    const records = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!Array.isArray(records)) throw new Error(`${relativePath} must contain a JSON array.`);

    const retained = records.filter(record => !isSample(record));
    const removed = records.length - retained.length;
    if (relativePath === "events/events.json") {
        retained.sort((first, second) => Number(first.year) - Number(second.year));
    }

    fs.writeFileSync(filePath, `${JSON.stringify(retained, null, 2)}\n`, "utf8");
    console.log(`${relativePath}: removed ${removed}; retained ${retained.length}.`);
}
