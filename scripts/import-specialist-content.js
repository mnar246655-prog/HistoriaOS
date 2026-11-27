const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
    return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function write(relativePath, records) {
    fs.writeFileSync(path.join(root, relativePath), `${JSON.stringify(records, null, 2)}\n`, "utf8");
}

const books = read("books/books.json");
const people = read("people/people.json");
const events = read("events/events.json");
const rashidun = read("rashidun/data.json");
const umayyad = read("umayyad/data.json");

for (const event of events) {
    if (!event.id) {
        const ids = {
            "فتح مكة": "event-conquest-of-mecca",
            "معركة حطين": "event-battle-of-hattin"
        };
        event.id = ids[event.title];
    }
    if (!event.id) throw new Error(`Missing stable ID for event: ${event.title}`);
}

const bookImportance = {
    "البداية والنهاية": "يمثل نموذجًا موسوعيًا للتأريخ الإسلامي، إذ يجمع أخبار الأنبياء والتاريخ العام وتاريخ الإسلام إلى عصر المؤلف.",
    "تاريخ الطبري": "أحد أوسع الحوليات العربية المبكرة، وحفظ روايات متعددة عن تاريخ العالم الإسلامي قبل عصر المؤلف.",
    "الكامل في التاريخ": "يقدم سردًا حوليًا واسعًا للتاريخ الإسلامي والعالمي، ويُستخدم لمقارنة روايات المؤرخين الوسيطين.",
    "تواريخ هيرودوت": "من أقدم الأعمال التاريخية النثرية الباقية في التقليد اليوناني، ويجمع أخبار الصراع اليوناني الفارسي ووصف الشعوب.",
    "تاريخ الحرب البيلوبونيسية": "مصدر أساسي لدراسة الحرب بين أثينا وإسبرطة، ويُعرف بمحاولة تحليل دوافع الصراع ونتائجه.",
    "أناباسيس": "شهادة أدبية وتاريخية عن حملة كورش الأصغر وانسحاب المرتزقة اليونانيين عبر غرب آسيا.",
    "تعليقات على حرب الغال": "رواية معاصرة لحملات قيصر في بلاد الغال، ومصدر مهم لدراسة توسع روما في القرن الأول قبل الميلاد.",
    "الحرب اليهودية": "مصدر رئيس لدراسة الثورة اليهودية والحرب الرومانية في القرن الأول الميلادي، كتبه شاهد من المنطقة.",
    "حياة القياصرة الاثني عشر": "مجموعة سير إمبراطورية رومانية أثرت في كتابة السيرة السياسية ودراسة الحكم الروماني المبكر.",
    "مدينة الله": "عمل مؤثر في فلسفة التاريخ المسيحية، صيغ في سياق التحولات التي أعقبت نهب روما سنة 410م.",
    "المقدمة": "أسست إطارًا تحليليًا لدراسة العمران والعصبية والدولة ونقد الأخبار، وأثرت في مناهج كتابة التاريخ.",
    "تواريخ بوليبيوس": "تحلل صعود روما إلى الهيمنة المتوسطية وتوثق تحولات العالم الهلنستي في القرنين الثالث والثاني قبل الميلاد.",
    "مروج الذهب": "مصنف جغرافي وتاريخي يجمع أخبار الأمم ووصف العالم المعروف في القرن العاشر.",
    "تاريخ الفرنجة": "شهادة مبكرة واسعة عن الممالك الفرنجية وتحولات بلاد الغال في العصور الوسطى المبكرة.",
    "تاريخ البيهقي": "مصدر فارسي بارز لتاريخ البلاط الغزنوي وإدارة الدولة في القرن الحادي عشر.",
    "الرحلة": "توثق مشاهدات ابن بطوطة ومسارات رحلاته، وتقدم مادة عن مجتمعات ومراكز سياسية في القرن الرابع عشر.",
    "فتوح البلدان": "مصدر مهم لدراسة روايات الفتوحات وتطور المدن والإدارة في الأقاليم الإسلامية المبكرة.",
    "السيرة النبوية": "من أقدم مصنفات السيرة المعروفة، ووصلت مادتها في روايات لاحقة شكلت أساسًا لدراسة صدر الإسلام.",
    "الأليكسياد": "سرد بيزنطي من داخل الأسرة الإمبراطورية عن حكم ألكسيوس الأول وعلاقته بالحروب الصليبية.",
    "الشاهنامة": "ملحمة فارسية كبرى حفظت تقاليد أسطورية وملكية وأسهمت في تشكيل الذاكرة الأدبية الإيرانية.",
    "السجل الأنجلوسكسوني": "مجموعة حوليات أساسية لدراسة إنجلترا الأنجلوسكسونية وتطورها السياسي بين القرنين التاسع والثاني عشر.",
    "الأمير": "رسالة مؤثرة في الفكر السياسي الأوروبي، تناقش أدوات الحكم والسلطة في سياق إيطاليا عصر النهضة.",
    "تاريخ اضمحلال وسقوط الإمبراطورية الرومانية": "دراسة تركيبية واسعة أثرت في كتابة تاريخ روما المتأخرة والبيزنطية في العصر الحديث."
};

const stableIds = new Map([
    ["البداية والنهاية", "book-al-bidaya-wa-al-nihaya"],
    ["تاريخ الطبري", "book-tarikh-al-tabari"],
    ["الكامل في التاريخ", "book-al-kamil-fi-al-tarikh"]
]);
for (const book of books) {
    if (!book.id) book.id = stableIds.get(book.title);
    if (!book.id) throw new Error(`Missing stable ID for existing book: ${book.title}`);
    book.compositionCentury = book.century;
    book.period = book.century;
    book.historicalImportance = book.historicalImportance || bookImportance[book.title];
    if (!book.historicalImportance) throw new Error(`Missing curated historical importance: ${book.title}`);
    book.personIds = [];
    book.eventIds = [];
    book.stateNames = [];
    book.sourceMetadata = {
        title: book.sourceTitle,
        name: book.sourceName,
        url: book.sourceUrl,
        license: book.sourceLicense
    };
}

const sourceMaps = {
    umayyad: new Map(umayyad.references.map(reference => [reference.id, reference])),
    rashidun: new Map(rashidun.references.map(reference => [reference.id, reference]))
};
for (const person of people) {
    if (!person.id) {
        const ids = {
            "صلاح الدين الأيوبي": "person-salah-al-din",
            "عمر بن الخطاب": "person-umar-ibn-al-khattab"
        };
        person.id = ids[person.name];
    }
    if (!person.id) throw new Error(`Missing stable ID for person: ${person.name}`);
}
const peopleByName = new Map(people.map(person => [person.name, person]));
const peopleById = new Map(people.map(person => [person.id, person]));

const umayyadPersonMap = new Map();
for (const person of umayyad.people) {
    const existing = peopleByName.get(person.name);
    const record = existing || {
        id: person.id,
        name: person.name,
        period: person.period,
        description: person.description,
        sourceTitle: person.sourceTitle,
        sourceName: person.sourceName,
        sourceLicense: person.sourceLicense,
        sourceUrl: person.sourceUrl
    };
    if (existing && existing.id !== person.id && !existing.id) record.id = person.id;
    if (!record.id) throw new Error(`Missing stable ID for person: ${person.name}`);
    record.period = record.period || person.period;
    record.description = record.description || person.description || person.biography;
    record.biography = person.biography || record.biography;
    record.historicalImportance = person.historicalImpact || record.historicalImportance || "";
    record.sourceTitle = person.sourceTitle;
    record.sourceName = person.sourceName;
    record.sourceLicense = person.sourceLicense;
    record.sourceUrl = person.sourceUrl;
    record.sourceMetadata = {
        title: person.sourceTitle,
        name: person.sourceName,
        url: person.sourceUrl,
        license: person.sourceLicense
    };
    record.sourceReferences = (person.referenceIds || []).map(id => {
        const reference = sourceMaps.umayyad.get(id);
        if (!reference) throw new Error(`Unknown Umayyad source ${id} for ${person.name}`);
        return { id: reference.id, citation: reference.citation, scope: reference.scope };
    });
    record.relatedPersonIds = [];
    record.eventIds = [];
    record.bookIds = [];
    record.stateNames = [];
    if (!existing) {
        people.push(record);
        peopleByName.set(record.name, record);
    }
    peopleById.set(record.id, record);
    umayyadPersonMap.set(person.id, record.id);
}

function eventKey(title, year) {
    return `${title}|${year}`;
}

const eventsByKey = new Map(events.map(event => [eventKey(event.title, event.year), event]));

for (const event of umayyad.events) {
    const existing = eventsByKey.get(eventKey(event.title, event.year));
    const record = existing || {
        id: event.id,
        title: event.title,
        year: event.year,
        state: event.state,
        period: event.period,
        century: event.century,
        description: event.description
    };
    if (!record.id) throw new Error(`Missing stable ID for event: ${event.title}`);
    Object.assign(record, {
        state: event.state || record.state || "الدولة الأموية",
        period: event.period || record.period,
        century: event.century || record.century,
        description: event.description || record.description,
        background: event.background || record.background || null,
        causes: event.causes || record.causes || null,
        outcomes: event.outcomes || record.outcomes || null,
        personIds: (event.personIds || []).map(id => {
            const mapped = umayyadPersonMap.get(id);
            if (!mapped) throw new Error(`Unknown Umayyad person ${id} in ${event.title}`);
            return mapped;
        }),
        bookIds: [],
        sourceTitle: event.sourceTitle,
        sourceName: event.sourceName,
        sourceLicense: event.sourceLicense,
        sourceUrl: event.sourceUrl,
        sourceMetadata: {
            title: event.sourceTitle,
            name: event.sourceName,
            url: event.sourceUrl,
            license: event.sourceLicense
        },
        sourceReferences: (event.referenceIds || []).map(id => {
            const reference = sourceMaps.umayyad.get(id);
            if (!reference) throw new Error(`Unknown Umayyad source ${id} for ${event.title}`);
            return { id: reference.id, citation: reference.citation, scope: reference.scope };
        })
    });
    record.personIds = [...new Set(record.personIds)];
    if (existing) Object.assign(existing, record);
    else {
        events.push(record);
        eventsByKey.set(eventKey(record.title, record.year), record);
    }
}

const rashidunPersonMap = new Map();
for (const person of rashidun.caliphs) {
    const target = peopleByName.get(person.name);
    if (!target) throw new Error(`Rashidun event person is not in people dataset: ${person.name}`);
    rashidunPersonMap.set(person.id, target.id);
}

for (const event of rashidun.events) {
    const existing = eventsByKey.get(eventKey(event.title, event.year));
    const personIds = (event.personIds || []).map(id => {
        const mapped = rashidunPersonMap.get(id);
        if (!mapped) throw new Error(`Unknown Rashidun person ${id} in ${event.title}`);
        return mapped;
    });
    const sourceReferences = (event.referenceIds || []).map(id => {
        const reference = sourceMaps.rashidun.get(id);
        if (!reference) throw new Error(`Unknown Rashidun source ${id} for ${event.title}`);
        return { id: reference.id, citation: reference.citation, scope: reference.scope };
    });
    const record = existing || {
        id: event.id,
        title: event.title,
        year: event.year,
        state: "الخلافة الراشدة",
        period: "الخلافة الراشدة",
        century: Math.ceil(event.year / 100),
        description: event.summary
    };
    Object.assign(record, {
        state: record.state || "الخلافة الراشدة",
        period: record.period || "الخلافة الراشدة",
        description: record.description || event.summary,
        background: event.background,
        causes: event.causes,
        outcomes: event.outcomes,
        personIds: [...new Set([...(record.personIds || []), ...personIds])],
        bookIds: record.bookIds || [],
        referenceIds: [...new Set([...(record.referenceIds || []), ...sourceReferences.map(reference => reference.id)])],
        sourceReferences: [...new Map(
            [...(record.sourceReferences || []), ...sourceReferences]
                .map(reference => [`${reference.id}|${reference.citation}`, reference])
        ).values()],
        sourceMetadata: record.sourceMetadata || {
            name: "المراجع المدرجة في بيانات موسوعة الراشدين",
            references: sourceReferences.map(reference => reference.id)
        }
    });
    if (existing) Object.assign(existing, record);
    else {
        events.push(record);
        eventsByKey.set(eventKey(record.title, record.year), record);
    }
}

for (const person of people) {
    person.eventIds = [];
    person.bookIds = [];
    person.relatedPersonIds = person.relatedPersonIds || [];
    person.stateNames = [];
}

const peopleByNameFinal = new Map(people.map(person => [person.name, person]));
const peopleByIdFinal = new Map(people.map(person => [person.id, person]));
for (const person of umayyad.people) {
    const target = peopleByIdFinal.get(umayyadPersonMap.get(person.id));
    for (const relation of person.relations || []) {
        const relatedId = umayyadPersonMap.get(relation.personId);
        if (!relatedId || !peopleByIdFinal.has(relatedId)) {
            throw new Error(`Unknown related person ${relation.personId} for ${person.name}`);
        }
        target.relatedPersonIds.push(relatedId);
        peopleByIdFinal.get(relatedId).relatedPersonIds.push(target.id);
    }
}

for (const event of events) {
    event.personIds = [...new Set(event.personIds || [])];
    event.bookIds = [...new Set(event.bookIds || [])];
    event.causes = event.causes === undefined ? null : event.causes;
    event.outcomes = event.outcomes === undefined ? null : event.outcomes;
    event.sourceReferences = event.sourceReferences || [];
    event.sourceMetadata = event.sourceMetadata || {
        title: event.sourceTitle,
        name: event.sourceName,
        url: event.sourceUrl,
        license: event.sourceLicense
    };
    for (const personId of event.personIds) {
        const person = peopleByIdFinal.get(personId);
        if (!person) throw new Error(`Unknown person ${personId} in event ${event.title}`);
        person.eventIds.push(event.id);
        if (event.state && !person.stateNames.includes(event.state)) person.stateNames.push(event.state);
    }
}

for (const book of books) {
    const author = peopleByNameFinal.get(book.author);
    if (author) {
        book.authorPersonId = author.id;
        book.personIds = [author.id];
        author.bookIds.push(book.id);
    } else {
        book.personIds = [];
    }
}

for (const person of people) {
    person.eventIds = [...new Set(person.eventIds)];
    person.bookIds = [...new Set(person.bookIds)];
    person.relatedPersonIds = [...new Set(person.relatedPersonIds || [])].filter(id => peopleByIdFinal.has(id));
    person.stateNames = [...new Set(person.stateNames)];
    person.sourceMetadata = person.sourceMetadata || {
        title: person.sourceTitle,
        name: person.sourceName,
        url: person.sourceUrl,
        license: person.sourceLicense
    };
    person.sourceReferences = person.sourceReferences || [];
}

const checkUnique = (records, field, label) => {
    const values = records.map(record => record[field]);
    if (values.some(value => !value) || new Set(values).size !== values.length) {
        const duplicates = values.filter((value, index) => !value || values.indexOf(value) !== index);
        throw new Error(`${label} contains a missing or duplicate ${field}: ${duplicates.slice(0, 10).join(", ")}`);
    }
};

checkUnique(books, "id", "books");
checkUnique(people, "id", "people");
checkUnique(events, "id", "events");
checkUnique(books, "title", "books");
checkUnique(people, "name", "people");
checkUnique(events.map(event => ({ id: eventKey(event.title, event.year) })), "id", "events");

write("books/books.json", books);
write("people/people.json", people);
write("events/events.json", events.sort((first, second) => Number(first.year) - Number(second.year)));

console.log(`Imported sourced specialist records. Current totals: ${books.length} books, ${people.length} people, ${events.length} events.`);
