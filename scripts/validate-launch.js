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
    "website/umayyad.html",
    "website/references.html",
    "website/about.html",
    "website/pricing.html",
    "website/contact.html",
    "website/app.js",
    "website/umayyad.js",
    "website/styles.css",
    "umayyad/data.json",
    "umayyad/encyclopedia-content.js",
    "UMAYYAD_ENCYCLOPEDIA.md",
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
for (const htmlPath of listFiles(path.join(root, "website"), ".html")) {
    const html = fs.readFileSync(htmlPath, "utf8");
    const navStart = html.indexOf('<nav class="site-nav"');
    if (navStart < 0) continue;
    const navEnd = html.indexOf("</nav>", navStart);
    if (!html.slice(navStart, navEnd).includes('href="umayyad.html"')) {
        errors.push(`Missing Umayyad link in navigation: ${path.relative(root, htmlPath)}`);
    }
}
for (const relativePath of ["website/index.html", "website/references.html"]) {
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath)) continue;
    const page = fs.readFileSync(absolutePath, "utf8");
    if (!page.includes('href="references.html"')) errors.push(`${relativePath}: missing link to references.html.`);
}
const referencesPagePath = path.join(root, "website/references.html");
if (fs.existsSync(referencesPagePath)) {
    const referencesPage = fs.readFileSync(referencesPagePath, "utf8");
    for (const source of ["تاريخ الرسل والملوك", "البداية والنهاية", "الكامل في التاريخ", "تاريخ الخلفاء", "فتوح البلدان", "The Oxford History of Islam", "Encyclopaedia of Islam", "World History Encyclopedia"]) {
        if (!referencesPage.includes(source)) errors.push(`website/references.html: missing reference ${source}.`);
    }
}
const homePagePath = path.join(root, "website/index.html");
if (fs.existsSync(homePagePath)) {
    const homePage = fs.readFileSync(homePagePath, "utf8");
    for (const sectionId of ["explore-civilizations", "featured-people", "featured-events", "historical-maps", "civilization-timeline", "featured-topics", "trusted-references"]) {
        if (!homePage.includes(`id="${sectionId}"`)) errors.push(`website/index.html: missing home section ${sectionId}.`);
    }
}
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

if (fs.existsSync(homePagePath)) {
    const homePage = fs.readFileSync(homePagePath, "utf8");
    const statKeys = [...homePage.matchAll(/data-umayyad-stat="([^"]+)"/g)].map(([, key]) => key);
    if (statKeys.length !== 4
        || new Set(statKeys).size !== 4
        || ["people", "events", "cities", "battles"].some(key => !statKeys.includes(key))) {
        errors.push("website/index.html: live statistics must cover Umayyad people, events, cities, and battles.");
    }

    const featuredCollections = new Map([
        ["people", dataSets.get("people/people.json") || []],
        ["events", dataSets.get("events/events.json") || []]
    ]);
    const featuredIds = new Map();
    for (const [, collection, ids] of homePage.matchAll(/<div class="card-grid home-feature-grid" data-collection="(people|events)"[^>]*data-curated-only="true"[^>]*data-featured-ids="([^"]+)"/g)) {
        const items = featuredCollections.get(collection);
        const recordsById = new Map(items.map(item => [item.id, item]));
        const idsForCollection = ids.split(",");
        featuredIds.set(collection, idsForCollection);
        if (idsForCollection.some(id => {
            const record = recordsById.get(id);
            return !record || record.isSample || !record.sourceUrl;
        })) {
            errors.push(`website/index.html: ${collection} highlights must link to source-attributed, non-sample records.`);
        }
    }
    if (!featuredIds.has("people") || !featuredIds.has("events")) {
        errors.push("website/index.html: expected curated people and event highlights.");
    }
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

let umayyadData;
try {
    umayyadData = JSON.parse(fs.readFileSync(path.join(root, "umayyad/data.json"), "utf8"));
} catch (error) {
    errors.push(`Invalid JSON in umayyad/data.json: ${error.message}`);
}

if (umayyadData) {
    const groups = [
        ["people", 50],
        ["events", 100],
        ["cities", 20],
        ["battles", 10]
    ];
    const idsByGroup = new Map();
    for (const [group, count] of groups) {
        const records = umayyadData[group];
        if (!Array.isArray(records) || records.length !== count) {
            errors.push(`umayyad/data.json: expected ${count} ${group}.`);
            idsByGroup.set(group, new Set());
            continue;
        }
        const ids = records.map(record => record.id);
        if (ids.some(id => !id) || new Set(ids).size !== ids.length) {
            errors.push(`umayyad/data.json: ${group} require unique IDs.`);
        }
        if (records.some(record => !record.name && !record.title)) {
            errors.push(`umayyad/data.json: ${group} contain an unnamed record.`);
        }
        if (records.some(record => !record.sourceTitle
            || record.sourceName !== "Wikipedia"
            || record.sourceLicense !== "CC BY-SA 4.0"
            || !/^https:\/\/en\.wikipedia\.org\/wiki\/[^\s]+$/.test(record.sourceUrl || ""))) {
            errors.push(`umayyad/data.json: ${group} require attributed Wikipedia references.`);
        }
        idsByGroup.set(group, new Set(ids));
    }

    const peopleById = new Map(umayyadData.people.map(person => [person.id, person]));
    const eventsById = new Map(umayyadData.events.map(event => [event.id, event]));
    const citiesById = new Map(umayyadData.cities.map(city => [city.id, city]));
    const battlesById = new Map(umayyadData.battles.map(battle => [battle.id, battle]));
    const references = Array.isArray(umayyadData.references) ? umayyadData.references : [];
    const referenceIds = new Set(references.map(reference => reference.id));
    if (!references.length || references.some(reference => !reference.id || !reference.citation || !reference.scope)
        || referenceIds.size !== references.length) {
        errors.push("umayyad/data.json: bibliography entries require unique IDs, citations, and scope notes.");
    }
    const hasValidReferences = record => Array.isArray(record.referenceIds)
        && record.referenceIds.length > 0
        && record.referenceIds.every(id => referenceIds.has(id));
    if (!Array.isArray(umayyadData.caliphs)
        || umayyadData.caliphs.length !== 14
        || new Set(umayyadData.caliphs.map(caliph => caliph.personId)).size !== umayyadData.caliphs.length
        || umayyadData.caliphs.some(caliph => !peopleById.has(caliph.personId) || !caliph.reign)) {
        errors.push("umayyad/data.json: the 14-caliph chronology must link to unique profiles and reign periods.");
    }
    if (umayyadData.events.some((event, index) => {
        const year = Number(event.year);
        return !Number.isInteger(year)
            || year < 661
            || year > 750
            || !event.description
            || !event.background
            || !event.causes
            || !event.outcomes
            || !hasValidReferences(event)
            || !["سنة", "تقريبية"].includes(event.datePrecision)
            || (index > 0 && Number(umayyadData.events[index - 1].year) > year)
            || !event.cityIds.length
            || event.cityIds.some(id => !citiesById.has(id))
            || !event.personIds.length
            || event.personIds.some(id => !peopleById.has(id))
            || event.battleId && !battlesById.has(event.battleId);
    })) {
        errors.push("umayyad/data.json: events require ordered 661-750 dates and valid city, person, and battle links.");
    }
    if (umayyadData.people.some(person => !person.description
        || !person.origin
        || !person.biography
        || !person.achievements
        || !person.historicalImpact
        || !Array.isArray(person.relations)
        || !person.relations.length
        || person.relations.some(relation => !peopleById.has(relation.personId) || !relation.label)
        || !hasValidReferences(person)
        || !person.eventIds.length
        || person.eventIds.some(id => !eventsById.has(id) || !eventsById.get(id).personIds.includes(person.id)))) {
        errors.push("umayyad/data.json: every person requires an encyclopedia profile, valid relations, sources, and related events.");
    }
    if (umayyadData.cities.some(city => !Array.isArray(city.coordinates)
        || city.coordinates.length !== 2
        || !city.coordinates.every(Number.isFinite)
        || Math.abs(city.coordinates[0]) > 90
        || Math.abs(city.coordinates[1]) > 180
        || !hasValidReferences(city)
        || !city.eventIds.length
        || city.eventIds.some(id => !eventsById.has(id) || !eventsById.get(id).cityIds.includes(city.id)))) {
        errors.push("umayyad/data.json: cities require valid coordinates and reciprocal event links.");
    }
    if (umayyadData.battles.some(battle => !eventsById.has(battle.eventId)
        || !citiesById.has(battle.cityId)
        || !battle.personIds.length
        || battle.personIds.some(id => !peopleById.has(id))
        || !Array.isArray(battle.coordinates)
        || battle.coordinates.length !== 2
        || !battle.coordinates.every(Number.isFinite)
        || !battle.locationDescription
        || !battle.background
        || !hasValidReferences(battle)
        || !eventsById.get(battle.eventId).cityIds.includes(battle.cityId)
        || battle.personIds.some(id => !eventsById.get(battle.eventId).personIds.includes(id))
        || eventsById.get(battle.eventId).battleId !== battle.id)) {
        errors.push("umayyad/data.json: battles require valid coordinates and reciprocal event, city, and person links.");
    }
}

const encyclopediaPath = path.join(root, "UMAYYAD_ENCYCLOPEDIA.md");
if (fs.existsSync(encyclopediaPath)) {
    const encyclopedia = fs.readFileSync(encyclopediaPath, "utf8");
    const profileHeadings = encyclopedia.match(/^### \d+\. /gm) || [];
    const biographies = encyclopedia.match(/\*\*التعريف الموسوعي:\*\*/g) || [];
    const origins = encyclopedia.match(/\*\*النشأة:\*\*/g) || [];
    const achievements = encyclopedia.match(/\*\*الإنجازات:\*\*/g) || [];
    const historicalImpacts = encyclopedia.match(/\*\*التأثير التاريخي:\*\*/g) || [];
    const relatedEventLists = encyclopedia.match(/\*\*الأحداث المرتبطة:\*\*/g) || [];
    const backgrounds = encyclopedia.match(/\*\*الخلفية:\*\*/g) || [];
    const causes = encyclopedia.match(/\*\*الأسباب:\*\*/g) || [];
    const outcomes = encyclopedia.match(/\*\*النتائج:\*\*/g) || [];
    if (profileHeadings.length !== 50
        || biographies.length !== 50
        || origins.length !== 50
        || achievements.length !== 50
        || historicalImpacts.length !== 50
        || relatedEventLists.length !== 50
        || backgrounds.length !== 110
        || causes.length !== 100
        || outcomes.length !== 100
        || !encyclopedia.includes("## الخلفاء")
        || !encyclopedia.includes("## التوسع الجغرافي")
        || !encyclopedia.includes("## الإنجازات الحضارية")
        || !encyclopedia.includes("## الخط الزمني")
        || !encyclopedia.includes("## الأحداث والسياقات")
        || !encyclopedia.includes("## المراجع والمنهج")) {
        errors.push("UMAYYAD_ENCYCLOPEDIA.md: expected complete sections for 50 biographies and 100 events.");
    }

    const umayyadPagePath = path.join(root, "website/umayyad.html");
    if (fs.existsSync(umayyadPagePath)) {
        const umayyadPage = fs.readFileSync(umayyadPagePath, "utf8");
        const ids = [...umayyadPage.matchAll(/\bid=["']([^"']+)["']/g)].map(([, id]) => id);
        const idSet = new Set(ids);
        if (ids.length !== idSet.size) errors.push("website/umayyad.html: duplicate element IDs.");
        const missingFragments = [...umayyadPage.matchAll(/\bhref=["']#([^"']+)["']/g)]
            .map(([, id]) => id)
            .filter(id => !idSet.has(id));
        if (missingFragments.length) {
            errors.push(`website/umayyad.html: missing section anchors: ${[...new Set(missingFragments)].join(", ")}.`);
        }
    }
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
