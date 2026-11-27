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
    "website/book.html",
    "website/people.html",
    "website/events.html",
    "website/maps.html",
    "website/visual-history.html",
    "website/visual-history.js",
    "website/visual-system.js",
    "website/timeline.html",
    "website/rashidun.html",
    "website/umayyad.html",
    "website/references.html",
    "website/about.html",
    "website/pricing.html",
    "website/contact.html",
    "website/app.js",
    "website/book-covers.js",
    "website/book-detail.js",
    "website/atlas.js",
    "website/rashidun.js",
    "website/umayyad.js",
    "website/styles.css",
    "assets/images/person-portrait.svg",
    "assets/images/historical-city.svg",
    "assets/images/battle-map.svg",
    "assets/images/historical-state.svg",
    "assets/images/historical-event.svg",
    "assets/images/map-frame.svg",
    "rashidun/data.json",
    "rashidun/encyclopedia-content.js",
    "RASHIDUN_ENCYCLOPEDIA.md",
    "RASHIDUN_REPORT.md",
    "scripts/generate-rashidun-data.js",
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
    if (!html.slice(navStart, navEnd).includes('href="rashidun.html"')) {
        errors.push(`Missing Rashidun link in navigation: ${path.relative(root, htmlPath)}`);
    }
    if (!html.slice(navStart, navEnd).includes('href="visual-history.html"')) {
        errors.push(`Missing Visual History link in navigation: ${path.relative(root, htmlPath)}`);
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
    for (const sectionId of ["explore-civilizations", "featured-people", "featured-events", "historical-maps", "visual-museum", "civilization-timeline", "featured-topics", "trusted-references"]) {
        if (!homePage.includes(`id="${sectionId}"`)) errors.push(`website/index.html: missing home section ${sectionId}.`);
    }
    if (!homePage.includes('class="civilization-card civilization-card-rashidun" href="rashidun.html"')) {
        errors.push("website/index.html: the Rashidun civilization card must link to rashidun.html.");
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
    { file: "books/books.json", verifiedPrefix: "verified-book-", verifiedCount: 20, fields: ["title", "author", "century", "category", "description"] },
    { file: "people/people.json", verifiedPrefix: "verified-person-", verifiedCount: 50, fields: ["name", "period", "description"] },
    { file: "events/events.json", verifiedPrefix: "verified-event-", verifiedCount: 100, fields: ["title", "year", "description"] }
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
    if (!Array.isArray(records) || records.length === 0) {
        errors.push(`${check.file}: expected a non-empty collection.`);
        continue;
    }
    if (records.some(record => record.isSample === true
        || (typeof record.id === "string" && record.id.startsWith("sample-"))
        || (typeof record.sampleId === "string" && record.sampleId.length > 0))) {
        errors.push(`${check.file}: synthetic sample records are not allowed in the published collection.`);
    }

    const ids = records.map(record => record.id).filter(Boolean);
    if (new Set(ids).size !== ids.length) errors.push(`${check.file}: duplicate record IDs.`);
    const identityField = check.file === "books/books.json" ? "title"
        : check.file === "people/people.json" ? "name" : null;
    const identities = records.map(record => identityField
        ? record[identityField]
        : `${record.title}|${record.year}`);
    if (new Set(identities).size !== identities.length) errors.push(`${check.file}: duplicate historical records.`);
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

const books = dataSets.get("books/books.json") || [];
const people = dataSets.get("people/people.json") || [];
const events = dataSets.get("events/events.json") || [];
const originalBookIds = new Set([
    "book-al-bidaya-wa-al-nihaya",
    "book-tarikh-al-tabari",
    "book-al-kamil-fi-al-tarikh",
    ...books.filter(book => /^verified-book-(0[1-9]|1\d|20)$/.test(book.id)).map(book => book.id),
    ...books.filter(book => /^open-book-(02[4-9]|03[0-5])$/.test(book.id)).map(book => book.id)
]);
const originalBooks = books.filter(book => originalBookIds.has(book.id));
if (originalBookIds.size !== 35
    || originalBooks.length !== 35
    || originalBooks.some(book => !book.cover
        || book.cover.type !== "generated-typographic"
        || !book.historicalPeriod
        || !book.summary
        || !book.historicalImportance
        || !Array.isArray(book.personNames)
        || !Array.isArray(book.eventNames)
        || !Array.isArray(book.cityNames))) {
    errors.push("books/books.json: the original 35 books require complete cover, editorial, and relationship details.");
}
if (books.some(book => book.cover && !originalBookIds.has(book.id))) {
    errors.push("books/books.json: book-detail enrichment must remain limited to the original 35 records.");
}
let specialistReferences = new Set();
for (const relativePath of ["rashidun/data.json", "umayyad/data.json"]) {
    try {
        const specialistData = JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
        for (const reference of specialistData.references || []) specialistReferences.add(reference.id);
    } catch (error) {
        errors.push(`Invalid JSON in ${relativePath}: ${error.message}`);
    }
}
const idsByCollection = {
    books: new Set(books.map(record => record.id)),
    people: new Set(people.map(record => record.id)),
    events: new Set(events.map(record => record.id))
};
for (const book of books) {
    if (!book.description && !book.summary) errors.push(`books/books.json: ${book.id} is missing a summary.`);
    if (!book.historicalImportance
        || !book.period
        || !book.compositionCentury
        || !Array.isArray(book.personIds)
        || !Array.isArray(book.eventIds)
        || !Array.isArray(book.stateNames)
        || !book.sourceMetadata) {
        errors.push(`books/books.json: ${book.id} is missing required editorial, relation, or source fields.`);
    }
    if (book.authorPersonId && !idsByCollection.people.has(book.authorPersonId)) {
        errors.push(`books/books.json: ${book.id} references missing author ${book.authorPersonId}.`);
    }
    for (const id of book.personIds || []) {
        if (!idsByCollection.people.has(id)) errors.push(`books/books.json: ${book.id} references missing person ${id}.`);
    }
    for (const id of book.eventIds || []) {
        if (!idsByCollection.events.has(id)) errors.push(`books/books.json: ${book.id} references missing event ${id}.`);
    }
    for (const stateName of book.stateNames || []) {
        if (!events.some(event => event.state === stateName)) {
            errors.push(`books/books.json: ${book.id} references missing state ${stateName}.`);
        }
    }
}
for (const person of people) {
    for (const id of person.eventIds || []) {
        const event = events.find(record => record.id === id);
        if (!event || !(event.personIds || []).includes(person.id)) {
            errors.push(`people/people.json: ${person.id} has a missing or nonreciprocal event link ${id}.`);
        }
    }
    for (const id of person.bookIds || []) {
        const book = books.find(record => record.id === id);
        if (!book || !(book.personIds || []).includes(person.id)) {
            errors.push(`people/people.json: ${person.id} has a missing or nonreciprocal book link ${id}.`);
        }
    }
    for (const id of person.relatedPersonIds || []) {
        const related = people.find(record => record.id === id);
        if (!related || !(related.relatedPersonIds || []).includes(person.id)) {
            errors.push(`people/people.json: ${person.id} has a missing or nonreciprocal person link ${id}.`);
        }
    }
    for (const stateName of person.stateNames || []) {
        if (!events.some(event => event.state === stateName)) {
            errors.push(`people/people.json: ${person.id} references missing state ${stateName}.`);
        }
    }
}
for (const event of events) {
    if (!event.state
        || event.causes === undefined
        || event.outcomes === undefined
        || !Array.isArray(event.personIds)
        || !Array.isArray(event.bookIds)
        || !event.sourceMetadata) {
        errors.push(`events/events.json: ${event.id} is missing required state, cause, outcome, relation, or source fields.`);
    }
    const hasDirectSource = typeof event.sourceUrl === "string" && event.sourceUrl.startsWith("https://");
    const referenceIds = Array.isArray(event.referenceIds) ? event.referenceIds : [];
    if (!hasDirectSource && referenceIds.length === 0) {
        errors.push(`events/events.json: ${event.id} has no source URL or specialist reference IDs.`);
    }
    if (referenceIds.some(id => !specialistReferences.has(id))) {
        errors.push(`events/events.json: ${event.id} references an unknown specialist source.`);
    }
    if (!events.some(record => record.state === event.state)) {
        errors.push(`events/events.json: ${event.id} references missing state ${event.state}.`);
    }
    for (const id of event.personIds || []) {
        const person = people.find(record => record.id === id);
        if (!person || !(person.eventIds || []).includes(event.id)) {
            errors.push(`events/events.json: ${event.id} has a missing or nonreciprocal person link ${id}.`);
        }
        if (people.some(person => !Array.isArray(person.bookIds)
            || !Array.isArray(person.eventIds)
            || !Array.isArray(person.relatedPersonIds)
            || !Array.isArray(person.stateNames)
            || !person.sourceMetadata)) {
            errors.push("people/people.json: a person is missing relationship or source metadata.");
        }
    }
    for (const id of event.bookIds || []) {
        if (!idsByCollection.books.has(id)) errors.push(`events/events.json: ${event.id} references missing book ${id}.`);
    }
}

const targets = { books: 100, people: 200, events: 500 };
const totals = { books: books.length, people: people.length, events: events.length };
const gaps = Object.fromEntries(Object.entries(targets).map(([key, target]) => [key, Math.max(0, target - totals[key])]));
console.log(`Editorial dataset totals: ${totals.books}/100 books, ${totals.people}/200 people, ${totals.events}/500 events; remaining ${gaps.books}, ${gaps.people}, ${gaps.events}.`);

if (fs.existsSync(homePagePath)) {
    const homePage = fs.readFileSync(homePagePath, "utf8");
    const statKeys = [...homePage.matchAll(/data-home-stat="([^"]+)"/g)].map(([, key]) => key);
    if (statKeys.length !== 4
        || new Set(statKeys).size !== 4
        || ["people", "events", "cities", "battles"].some(key => !statKeys.includes(key))) {
        errors.push("website/index.html: live statistics must cover people, events, cities, and battles.");
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

const rashidunPath = path.join(root, "rashidun/data.json");
let rashidunData;
try {
    rashidunData = JSON.parse(fs.readFileSync(rashidunPath, "utf8"));
} catch (error) {
    errors.push(`Invalid JSON in rashidun/data.json: ${error.message}`);
}

if (rashidunData) {
    const groups = [
        ["caliphs", 4],
        ["events", 27],
        ["places", 18]
    ];
    for (const [group, count] of groups) {
        const records = rashidunData[group];
        if (!Array.isArray(records) || records.length !== count) {
            errors.push(`rashidun/data.json: expected ${count} ${group}.`);
            continue;
        }
        const ids = records.map(record => record.id);
        if (ids.some(id => !id) || new Set(ids).size !== ids.length) {
            errors.push(`rashidun/data.json: ${group} require unique IDs.`);
        }
    }

    const caliphsById = new Map(rashidunData.caliphs.map(person => [person.id, person]));
    const eventsById = new Map(rashidunData.events.map(event => [event.id, event]));
    const placesById = new Map(rashidunData.places.map(place => [place.id, place]));
    const references = Array.isArray(rashidunData.references) ? rashidunData.references : [];
    const referenceIds = new Set(references.map(reference => reference.id));
    const hasValidReferences = record => Array.isArray(record.referenceIds)
        && record.referenceIds.length > 0
        && record.referenceIds.every(id => referenceIds.has(id));
    const profileFields = ["origin", "islam", "caliphate", "achievements", "reforms", "conquests", "challenges", "impact"];

    if (!references.length || referenceIds.size !== references.length
        || references.some(reference => !reference.id || !reference.citation || !reference.scope)) {
        errors.push("rashidun/data.json: bibliography entries require unique IDs, citations, and scope notes.");
    }
    if (rashidunData.caliphs.some(caliph => profileFields.some(field => !caliph[field])
        || !hasValidReferences(caliph)
        || !caliph.eventIds.length
        || caliph.eventIds.some(id => !eventsById.has(id) || !eventsById.get(id).personIds.includes(caliph.id)))) {
        errors.push("rashidun/data.json: every caliph requires a complete profile, sources, and reciprocal event links.");
    }
    if (rashidunData.events.some((event, index) => !Number.isInteger(event.year)
        || event.year < 632
        || event.year > 661
        || !event.title
        || !event.summary
        || !event.background
        || !event.causes
        || !event.outcomes
        || !hasValidReferences(event)
        || !event.personIds.length
        || event.personIds.some(id => !caliphsById.has(id))
        || event.placeIds.some(id => !placesById.has(id))
        || (index > 0 && rashidunData.events[index - 1].year > event.year))) {
        errors.push("rashidun/data.json: events require ordered dates, complete context, sources, and valid person/place links.");
    }
    if (rashidunData.places.some(place => !Array.isArray(place.coordinates)
        || place.coordinates.length !== 2
        || !place.coordinates.every(Number.isFinite)
        || Math.abs(place.coordinates[0]) > 90
        || Math.abs(place.coordinates[1]) > 180
        || !place.locationNote
        || !place.eventIds.length
        || place.eventIds.some(id => !eventsById.has(id) || !eventsById.get(id).placeIds.includes(place.id)))) {
        errors.push("rashidun/data.json: places require approximate coordinates and reciprocal event links.");
    }
    if (rashidunData.events.filter(event => /معركة|وقعة/.test(event.title)).length !== 8) {
        errors.push("rashidun/data.json: expected eight battle records linked to the event timeline.");
    }

    const rashidunBookPath = path.join(root, "RASHIDUN_ENCYCLOPEDIA.md");
    if (fs.existsSync(rashidunBookPath)) {
        const book = fs.readFileSync(rashidunBookPath, "utf8");
        if ((book.match(/^### \d+\. /gm) || []).length !== 4
            || (book.match(/^\### .* — /gm) || []).length !== 27
            || !book.includes("## الخط الزمني")
            || !book.includes("## المراجع")) {
            errors.push("RASHIDUN_ENCYCLOPEDIA.md: expected four biographies and all 27 dated events.");
        }
    }
}

const atlasPagePath = path.join(root, "website/maps.html");
if (fs.existsSync(atlasPagePath)) {
    const atlasPage = fs.readFileSync(atlasPagePath, "utf8");
    for (const layer of ["cities", "battles", "states", "conquests", "tradeRoutes", "armyMovements"]) {
        if (!atlasPage.includes(`value="${layer}"`)) errors.push(`website/maps.html: missing atlas layer ${layer}.`);
    }
    for (const control of ["historical-atlas-map", "atlas-year", "atlas-experience-start", "atlas-guide-form"]) {
        if (!atlasPage.includes(`id="${control}"`)) errors.push(`website/maps.html: missing atlas control ${control}.`);
    }
    if (!atlasPage.includes('name="historical-ai-endpoint"')) {
        errors.push("website/maps.html: missing the optional same-origin AI guide endpoint configuration.");
    }
    const atlasScriptPath = path.join(root, "website/atlas.js");
    if (fs.existsSync(atlasScriptPath)) {
        const atlasScript = fs.readFileSync(atlasScriptPath, "utf8");
        for (const battleField of ["armyStrength", "peopleNames", "movementRoute", "stages", "outcome", "animateRoute"]) {
            if (!atlasScript.includes(battleField)) errors.push(`website/atlas.js: missing battle visualization field ${battleField}.`);
        }
    }
}
for (const relativePath of ["website/maps.html", "website/rashidun.html"]) {
    const absolutePath = path.join(root, relativePath);
    if (!fs.existsSync(absolutePath)) continue;
    const page = fs.readFileSync(absolutePath, "utf8");
    const ids = [...page.matchAll(/\bid=["']([^"']+)["']/g)].map(([, id]) => id);
    const idSet = new Set(ids);
    if (ids.length !== idSet.size) errors.push(`${relativePath}: duplicate element IDs.`);
    const missingFragments = [...page.matchAll(/\bhref=["']#([^"']+)["']/g)]
        .map(([, id]) => id)
        .filter(id => !idSet.has(id));
    if (missingFragments.length) {
        errors.push(`${relativePath}: missing section anchors: ${[...new Set(missingFragments)].join(", ")}.`);
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

const interactiveTest = spawnSync(
    process.execPath,
    [path.join(root, "scripts/test-interactive-pages.js")],
    { encoding: "utf8" }
);
if (interactiveTest.status !== 0) {
    errors.push(`Interactive page runtime tests failed: ${(interactiveTest.stderr || interactiveTest.stdout).trim()}`);
}

if (errors.length) {
    console.error(errors.map(error => `- ${error}`).join("\n"));
    process.exitCode = 1;
} else {
    console.log(`Launch validation passed: ${htmlFiles.length} HTML files, ${checkedLinks} local references, and all data and JavaScript checks.`);
}
