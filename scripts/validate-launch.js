const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const errors = [];
const requiredFiles = [
    "index.html",
    "404.html",
    "website/index.html",
    "website/books.html",
    "website/people.html",
    "website/events.html",
    "website/maps.html",
    "website/timeline.html",
    "website/about.html",
    "website/pricing.html",
    "website/contact.html",
    "website/app.js",
    "website/styles.css",
    "books/books.json",
    "people/people.json",
    "events/events.json"
];

for (const relativePath of requiredFiles) {
    if (!fs.existsSync(path.join(root, relativePath))) errors.push(`Missing required file: ${relativePath}`);
}

function listFiles(directory, extension) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const absolutePath = path.join(directory, entry.name);
        if (entry.isDirectory()) return listFiles(absolutePath, extension);
        return entry.isFile() && path.extname(entry.name) === extension ? [absolutePath] : [];
    });
}

const htmlFiles = [
    path.join(root, "index.html"),
    path.join(root, "404.html"),
    ...listFiles(path.join(root, "website"), ".html")
];
const rootIndex = fs.readFileSync(path.join(root, "index.html"), "utf8");
if (!/<meta\s+http-equiv=["']refresh["']\s+content=["']0;\s*url=website\/index\.html["']/i.test(rootIndex)) {
    errors.push("index.html must redirect to website/index.html.");
}
let checkedLinks = 0;
for (const htmlPath of htmlFiles) {
    const html = fs.readFileSync(htmlPath, "utf8");
    const references = html.matchAll(/\b(?:href|src)\s*=\s*(["'])(.*?)\1/gi);
    for (const [, , reference] of references) {
        if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(reference)) continue;
        const pathname = reference.split(/[?#]/, 1)[0];
        if (!pathname) continue;

        let decodedPath;
        try {
            decodedPath = decodeURIComponent(pathname);
        } catch {
            errors.push(`Invalid URL encoding in ${path.relative(root, htmlPath)}: ${reference}`);
            continue;
        }

        const target = path.resolve(
            decodedPath.startsWith("/")
                ? root
                : path.dirname(htmlPath),
            decodedPath.replace(/^[/\\]+/, "")
        );
        if (target !== root && !target.startsWith(`${root}${path.sep}`)) {
            errors.push(`Reference escapes the site root in ${path.relative(root, htmlPath)}: ${reference}`);
            continue;
        }

        let resolvedTarget = target;
        if (fs.existsSync(resolvedTarget) && fs.statSync(resolvedTarget).isDirectory()) {
            resolvedTarget = path.join(resolvedTarget, "index.html");
        }
        checkedLinks += 1;
        if (!fs.existsSync(resolvedTarget) || !fs.statSync(resolvedTarget).isFile()) {
            errors.push(`Broken local reference in ${path.relative(root, htmlPath)}: ${reference}`);
        }
    }
}

const dataChecks = [
    { file: "books/books.json", count: 120, verifiedPrefix: "verified-book-", verifiedCount: 20, fields: ["title", "author", "category", "description"] },
    { file: "people/people.json", count: 550, verifiedPrefix: "verified-person-", verifiedCount: 50, fields: ["name", "period", "description"] },
    { file: "events/events.json", count: 1100, verifiedPrefix: "verified-event-", verifiedCount: 100, fields: ["title", "year", "description"] }
];
const dataSets = new Map();

for (const check of dataChecks) {
    let records;
    try {
        records = JSON.parse(fs.readFileSync(path.join(root, check.file), "utf8"));
    } catch (error) {
        errors.push(`Invalid JSON in ${check.file}: ${error.message}`);
        continue;
    }
    if (!Array.isArray(records) || records.length !== check.count) {
        errors.push(`${check.file}: expected ${check.count} records.`);
        continue;
    }

    const ids = records.map(record => record.id).filter(Boolean);
    if (new Set(ids).size !== ids.length) errors.push(`${check.file}: duplicate record IDs.`);
    if (records.some(record => !record || typeof record !== "object"
        || check.fields.some(field => record[field] === undefined || record[field] === ""))) {
        errors.push(`${check.file}: a record is missing a required field.`);
    }

    const verified = records.filter(record => record.id && record.id.startsWith(check.verifiedPrefix));
    if (verified.length !== check.verifiedCount) {
        errors.push(`${check.file}: expected ${check.verifiedCount} curated records.`);
    }
    if (verified.some(record => !record.sourceTitle
        || !record.sourceUrl
        || !record.sourceUrl.startsWith("https://en.wikipedia.org/wiki/")
        || record.sourceName !== "Wikipedia"
        || record.sourceLicense !== "CC BY-SA 4.0")) {
        errors.push(`${check.file}: curated records require attributed Wikipedia source URLs.`);
    }
    dataSets.set(check.file, records);
}

const events = dataSets.get("events/events.json");
if (events && events.some((event, index) => {
    const year = Number(event.year);
    return !Number.isFinite(year)
        || !Number.isFinite(Number(event.century))
        || Number(event.century) !== Math.ceil(year / 100)
        || (index > 0 && Number(events[index - 1].year) > year);
})) {
    errors.push("events/events.json: years, centuries, and chronological ordering must be valid.");
}

const appPath = path.join(root, "website/app.js");
if (fs.existsSync(appPath)) {
    const app = fs.readFileSync(appPath, "utf8");
    for (const place of ["مكة", "المدينة", "القدس", "دمشق", "بغداد", "قرطبة", "القاهرة", "إسطنبول"]) {
        if (!app.includes(`name: "${place}"`)) errors.push(`The historical map is missing ${place}.`);
    }
}

const javascriptFiles = [
    ...listFiles(path.join(root, "scripts"), ".js"),
    ...listFiles(path.join(root, "website"), ".js")
];
for (const javascriptFile of javascriptFiles) {
    const result = spawnSync(process.execPath, ["--check", javascriptFile], { encoding: "utf8" });
    if (result.status !== 0) {
        errors.push(`JavaScript syntax error in ${path.relative(root, javascriptFile)}: ${result.stderr.trim()}`);
    }
}

if (errors.length) {
    console.error(errors.map(error => `- ${error}`).join("\n"));
    process.exitCode = 1;
} else {
    console.log(`Launch validation passed: ${htmlFiles.length} HTML files, ${checkedLinks} local references, and all data and JavaScript checks.`);
}
