const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const sourceFile = path.join(__dirname, "verified-content.json");
const data = JSON.parse(fs.readFileSync(sourceFile, "utf8"));
const sourceLicense = "CC BY-SA 4.0";

function sourceUrl(sourceTitle) {
    return `https://en.wikipedia.org/wiki/${encodeURIComponent(sourceTitle.replace(/ /g, "_"))}`;
}

function readJson(relativePath) {
    return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function writeJson(relativePath, records) {
    fs.writeFileSync(path.join(root, relativePath), `${JSON.stringify(records, null, 2)}\n`, "utf8");
}

function addSource(record, sourceTitle) {
    return {
        ...record,
        sourceTitle,
        sourceName: "Wikipedia",
        sourceLicense,
        sourceUrl: sourceUrl(sourceTitle)
    };
}

function mergeVerifiedRecords(relativePath, rows, expectedCount, createRecord, keyField, idPrefix) {
    if (rows.length !== expectedCount) {
        throw new Error(`${relativePath}: expected ${expectedCount} curated records; got ${rows.length}`);
    }

    const records = readJson(relativePath);
    const imported = records.filter(record => record.id && record.id.startsWith(idPrefix));
    if (imported.length > expectedCount) {
        throw new Error(`${relativePath}: found more imported records than expected`);
    }

    const sourceUrls = new Set(records.map(record => record.sourceUrl).filter(Boolean));
    const keys = new Set(records.map(record => record[keyField]).filter(Boolean));
    rows.forEach((row, index) => {
        const record = createRecord(row, index + 1);
        const url = record.sourceUrl;
        if (!url.startsWith("https://en.wikipedia.org/wiki/")) {
            throw new Error(`${relativePath}: invalid source URL for ${record[keyField]}`);
        }
        if (sourceUrls.has(url) || keys.has(record[keyField])) return;
        records.push(record);
        sourceUrls.add(url);
        keys.add(record[keyField]);
    });

    const finalImported = records.filter(record => record.id && record.id.startsWith(idPrefix));
    if (finalImported.length !== expectedCount) {
        throw new Error(`${relativePath}: expected ${expectedCount} new sourced records; got ${finalImported.length}`);
    }
    writeJson(relativePath, records);
}

mergeVerifiedRecords("books/books.json", data.books, 20, (row, index) => {
    const [sourceTitle, title, author, category, description] = row;
    return addSource({
        id: `verified-book-${String(index).padStart(2, "0")}`,
        title,
        author,
        category,
        description
    }, sourceTitle);
}, "title", "verified-book-");

mergeVerifiedRecords("people/people.json", data.people, 50, (row, index) => {
    const [sourceTitle, name, period, description] = row;
    return addSource({
        id: `verified-person-${String(index).padStart(2, "0")}`,
        name,
        period,
        description
    }, sourceTitle);
}, "name", "verified-person-");

mergeVerifiedRecords("events/events.json", data.events, 100, (row, index) => {
    const [sourceTitle, title, year, state, period, description] = row;
    return addSource({
        id: `verified-event-${String(index).padStart(3, "0")}`,
        title,
        year,
        state,
        period,
        century: Math.ceil(year / 100),
        description
    }, sourceTitle);
}, "title", "verified-event-");

const sourcePages = {
    "books/books.json": {
        "البداية والنهاية": "Al-Bidaya wa l-Nihaya",
        "تاريخ الطبري": "History of the Prophets and Kings",
        "الكامل في التاريخ": "The Complete History"
    },
    "people/people.json": {
        "عمر بن الخطاب": "Umar",
        "صلاح الدين الأيوبي": "Saladin"
    },
    "events/events.json": {
        "فتح مكة": "Conquest of Mecca",
        "معركة حطين": "Battle of Hattin"
    }
};

for (const [relativePath, sources] of Object.entries(sourcePages)) {
    const records = readJson(relativePath);
    const titleField = relativePath.startsWith("books/") ? "title"
        : relativePath.startsWith("people/") ? "name" : "title";
    for (const [title, sourceTitle] of Object.entries(sources)) {
        const record = records.find(item => item[titleField] === title);
        if (!record) throw new Error(`${relativePath}: expected existing record "${title}"`);
        Object.assign(record, addSource(record, sourceTitle));
    }
    writeJson(relativePath, records);
}

const events = readJson("events/events.json").sort((first, second) => Number(first.year) - Number(second.year));
writeJson("events/events.json", events);
console.log("Verified 20 sourced books, 50 sourced people, and 100 sourced events.");
