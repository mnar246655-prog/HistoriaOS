const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const sampleNote = "سجل تجريبي مولّد لاختبار الواجهة والبحث؛ لا يمثل معلومة تاريخية موثقة.";
const periods = ["العصور القديمة", "العصور الوسطى", "العصر الحديث", "العصر المعاصر"];
const categories = [
    "التاريخ الإسلامي",
    "تاريخ العالم",
    "تاريخ الحضارات",
    "التاريخ السياسي",
    "التاريخ الثقافي"
];
const personDescriptions = {
    "صلاح الدين الأيوبي": "قائد مسلم ومؤسس الدولة الأيوبية، استعاد القدس بعد انتصاره في معركة حطين سنة 1187م.",
    "عمر بن الخطاب": "ثاني الخلفاء الراشدين، تولى الخلافة بعد أبي بكر، واتسعت في عهده الدولة الإسلامية."
};
const eventDescriptions = {
    "معركة حطين": "انتصر جيش صلاح الدين الأيوبي على القوات الصليبية قرب طبريا، ومهّد الانتصار لاستعادة القدس.",
    "فتح مكة": "دخل النبي محمد ﷺ مكة مع المسلمين سنة 630م، وانتهى الحدث بعودة المدينة إلى الحكم الإسلامي."
};
const eventMetadata = {
    "معركة حطين": { state: "الدولة الأيوبية", period: periods[1], century: 12 },
    "فتح مكة": { state: "العصر النبوي", period: periods[1], century: 7 }
};

function readJson(relativePath) {
    return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function writeJson(relativePath, records) {
    fs.writeFileSync(path.join(root, relativePath), `${JSON.stringify(records, null, 2)}\n`, "utf8");
}

function completeRecords(relativePath, targetCount, enrich, createSample) {
    const records = readJson(relativePath);
    const factualRecords = records.filter(record => !record.isSample).map(enrich);
    const sampleRecords = records.filter(record => record.isSample).slice(0, targetCount - factualRecords.length);

    while (sampleRecords.length < targetCount - factualRecords.length) {
        sampleRecords.push(createSample(sampleRecords.length + 1));
    }

    writeJson(relativePath, factualRecords.concat(sampleRecords));
}

function getPeriod(year) {
    if (year < 476) return periods[0];
    if (year < 1500) return periods[1];
    if (year < 1800) return periods[2];
    return periods[3];
}

function getState(year) {
    if (year < 622) return "كيانات تاريخية متعددة";
    if (year < 632) return "العصر النبوي";
    if (year < 661) return "الخلافة الراشدة";
    if (year < 750) return "الدولة الأموية";
    if (year < 1258) return "الدولة العباسية";
    if (year < 1517) return "دول إسلامية وسيطة";
    if (year < 1924) return "الدولة العثمانية";
    return "العصر الحديث";
}

completeRecords("books/books.json", 120, book => ({
    ...book,
    description: book.description || `مرجع تاريخي بعنوان «${book.title}» للمؤلف ${book.author}.`
}), index => {
    const number = String(index).padStart(3, "0");
    return {
        id: `sample-book-${number}`,
        title: `عنوان كتاب تجريبي ${number}`,
        author: `مؤلف افتراضي ${number}`,
        category: categories[(index - 1) % categories.length],
        description: sampleNote,
        isSample: true,
        sampleId: `book-${number}`
    };
});

completeRecords("people/people.json", 550, person => ({
    ...person,
    description: personDescriptions[person.name] || person.description || `شخصية تاريخية من ${person.period}.`
}), index => {
    const number = String(index).padStart(3, "0");
    return {
        id: `sample-person-${number}`,
        name: `شخصية تجريبية ${number}`,
        period: periods[(index - 1) % periods.length],
        description: sampleNote,
        isSample: true,
        sampleId: `person-${number}`
    };
});

completeRecords("events/events.json", 1100, event => {
    const year = Number(event.year);
    const metadata = eventMetadata[event.title] || {};
    return {
        ...event,
        description: eventDescriptions[event.title] || event.description || `حدث تاريخي مسجل في عام ${year}م.`,
        state: metadata.state || event.state || getState(year),
        period: metadata.period || event.period || getPeriod(year),
        century: metadata.century || event.century || Math.ceil(year / 100)
    };
}, index => {
    const number = String(index).padStart(4, "0");
    const year = 1 + Math.round((index - 1) * 2025 / 997);
    return {
        id: `sample-event-${number}`,
        title: `حدث تجريبي ${number}`,
        year,
        state: getState(year),
        period: getPeriod(year),
        century: Math.ceil(year / 100),
        description: `حدث تجريبي للعام ${year}م. ${sampleNote}`,
        isSample: true,
        sampleId: `event-${number}`
    };
});

const events = readJson("events/events.json").sort((first, second) => Number(first.year) - Number(second.year));
writeJson("events/events.json", events);

for (const [file, expected] of [
    ["books/books.json", 120],
    ["people/people.json", 550],
    ["events/events.json", 1100]
]) {
    const records = readJson(file);
    if (records.length !== expected) {
        throw new Error(`${file}: expected ${expected} records; got ${records.length}`);
    }
    if (records.some(record => Object.values(record).some(value => value === undefined))) {
        throw new Error(`${file}: found an invalid record`);
    }
}

for (const [file, prefix, expected] of [
    ["books/books.json", "verified-book-", 20],
    ["people/people.json", "verified-person-", 50],
    ["events/events.json", "verified-event-", 100]
]) {
    const records = readJson(file);
    const verified = records.filter(record => record.id && record.id.startsWith(prefix));
    if (verified.length !== expected) {
        throw new Error(`${file}: expected ${expected} sourced records; got ${verified.length}`);
    }
    const sourceUrls = verified.map(record => record.sourceUrl);
    if (sourceUrls.some(url => !url || !url.startsWith("https://en.wikipedia.org/wiki/")
        || !verified.find(record => record.sourceUrl === url && record.sourceLicense === "CC BY-SA 4.0"))
        || new Set(sourceUrls).size !== verified.length) {
        throw new Error(`${file}: sourced records must have unique, attributed Wikipedia links.`);
    }
}

if (readJson("books/books.json").some(book => !book.title || !book.author || !book.category || !book.description)) {
    throw new Error("Every book must include a title, author, category, and description.");
}
if (readJson("people/people.json").some(person => !person.name || !person.period || !person.description)) {
    throw new Error("Every person must include a name, period, and description.");
}
const finalEvents = readJson("events/events.json");
if (finalEvents.some((event, index) => !event.title || !event.description || !Number.isFinite(Number(event.year))
    || (index > 0 && Number(finalEvents[index - 1].year) > Number(event.year)))) {
    throw new Error("Events must include a title, year, description, and chronological ordering.");
}

console.log("Generated 120 books, 550 people, and 1,100 events.");
