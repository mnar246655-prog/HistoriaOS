const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const source = require("../rashidun/encyclopedia-content");
const outputDirectory = path.join(root, "rashidun");
const requiredProfileFields = [
    "origin",
    "islam",
    "caliphate",
    "achievements",
    "reforms",
    "conquests",
    "challenges",
    "impact"
];
const caliphIds = new Set(source.caliphs.map(caliph => caliph.id));
const placeIds = new Set(source.places.map(place => place.id));
const referenceIds = new Set(source.references.map(reference => reference.id));

if (source.caliphs.length !== 4 || new Set(caliphIds).size !== 4) {
    throw new Error("The Rashidun source must contain four uniquely identified caliphs.");
}
if (new Set(placeIds).size !== source.places.length || new Set(referenceIds).size !== source.references.length) {
    throw new Error("Rashidun places and references must have unique IDs.");
}

for (const caliph of source.caliphs) {
    const missingFields = requiredProfileFields.filter(field => !caliph[field]);
    if (missingFields.length) throw new Error(`Missing ${missingFields.join(", ")} for ${caliph.id}.`);
    if (!caliph.referenceIds.length || caliph.referenceIds.some(id => !referenceIds.has(id))) {
        throw new Error(`Invalid bibliography links for ${caliph.id}.`);
    }
}

const eventIds = new Set(source.events.map(event => event.id));
if (eventIds.size !== source.events.length) throw new Error("Rashidun event IDs must be unique.");
for (const event of source.events) {
    if (!Number.isInteger(event.year) || event.year < 632 || event.year > 661) {
        throw new Error(`Invalid Rashidun date for ${event.id}.`);
    }
    for (const field of ["title", "dateLabel", "summary", "background", "causes", "outcomes"]) {
        if (!event[field]) throw new Error(`Missing ${field} for ${event.id}.`);
    }
    if (!event.personIds.length || event.personIds.some(id => !caliphIds.has(id))) {
        throw new Error(`Invalid caliph links for ${event.id}.`);
    }
    if (event.placeIds.some(id => !placeIds.has(id))) throw new Error(`Invalid place links for ${event.id}.`);
    if (!event.referenceIds.length || event.referenceIds.some(id => !referenceIds.has(id))) {
        throw new Error(`Invalid bibliography links for ${event.id}.`);
    }
}

const events = [...source.events]
    .sort((first, second) => first.year - second.year)
    .map(event => ({
        ...event,
        id: `rash-event-${event.id}`,
        personIds: event.personIds.map(id => `rash-person-${id}`),
        placeIds: event.placeIds.map(id => `rash-place-${id}`)
    }));

const caliphs = source.caliphs.map(caliph => ({
    ...caliph,
    id: `rash-person-${caliph.id}`,
    eventIds: events.filter(event => event.personIds.includes(`rash-person-${caliph.id}`)).map(event => event.id)
}));
if (caliphs.some(caliph => !caliph.eventIds.length)) {
    throw new Error("Every Rashidun caliph must be linked to at least one event.");
}

const places = source.places.map(place => {
    if (!Array.isArray(place.coordinates)
        || place.coordinates.length !== 2
        || !place.coordinates.every(Number.isFinite)
        || Math.abs(place.coordinates[0]) > 90
        || Math.abs(place.coordinates[1]) > 180) {
        throw new Error(`Invalid coordinates for ${place.id}.`);
    }
    return {
        ...place,
        id: `rash-place-${place.id}`,
        eventIds: events.filter(event => event.placeIds.includes(`rash-place-${place.id}`)).map(event => event.id)
    };
});

const data = {
    scope: "الخلافة الراشدة من وفاة النبي سنة 632م إلى مقتل علي سنة 661م؛ تعرض السنوات والأحداث المختلف فيها بتحفظ.",
    references: source.references,
    caliphs,
    events,
    places
};

function buildEncyclopediaMarkdown() {
    const referenceNumbers = new Map(source.references.map((reference, index) => [reference.id, index + 1]));
    const citations = ids => ids.map(id => `[${referenceNumbers.get(id)}]`).join("، ");
    const caliphNames = new Map(caliphs.map(caliph => [caliph.id, caliph.name]));
    const placeNames = new Map(places.map(place => [place.id, place.name]));
    const eventTitles = new Map(events.map(event => [event.id, event.title]));
    const lines = [
        "# موسوعة الخلفاء الراشدين",
        "",
        "**HistoriaOS — موسوعة تاريخية عربية**",
        "",
        "تتناول هذه النسخة خلافة أبي بكر وعمر وعثمان وعلي بين 632 و661م. وهي مدخل تحريري يقارن الأخبار ولا يدعي حسم الاختلافات التي تنقلها المصادر.",
        "",
        "## المحتويات",
        "",
        "1. [مدخل ومنهج](#مدخل-ومنهج)",
        "2. [الخلفاء](#الخلفاء)",
        "3. [الخط الزمني](#الخط-الزمني)",
        "4. [الأحداث](#الأحداث)",
        "5. [الجغرافيا والفتوحات](#الجغرافيا-والفتوحات)",
        "6. [المراجع](#المراجع)",
        "",
        "## مدخل ومنهج",
        "",
        "يرتبط اصطلاح «الخلفاء الراشدين» بتقليد إسلامي لاحق يصف خلافة أبي بكر وعمر وعثمان وعلي. يحدد هذا القسم نطاقه بحسب الخلافة السياسية في المدينة بين 632 و661م، ولا يفترض أن آليات الحكم أو صورة الشرعية كانت واحدة طوال المدة.",
        "",
        "تختلف المصادر في تأريخ بعض الوقائع، وفي تفسير أسبابها وأعداد المشاركين فيها. تعرض الموسوعة الخلاف عند الحاجة، ولا تثبت أرقامًا أو تفاصيل جغرافية غير موثقة. الإحداثيات الحديثة على الخريطة تقريبية، ومسارات الحملات تخطيطية وليست إعادة بناء ميدانية.",
        "",
        "## الخلفاء",
        ""
    ];

    caliphs.forEach(caliph => {
        lines.push(
            `### ${caliph.order}. ${caliph.name}`,
            "",
            `**الاسم واللقب:** ${caliph.epithet}. **الفترة:** ${caliph.reign}. **التأريخ الحيوي:** ${caliph.dates}.`,
            "",
            `**النشأة:** ${caliph.origin}`,
            "",
            `**الإسلام:** ${caliph.islam}`,
            "",
            `**فترة الخلافة:** ${caliph.caliphate}`,
            "",
            `**الإنجازات:** ${caliph.achievements}`,
            "",
            `**الإصلاحات:** ${caliph.reforms}`,
            "",
            `**الفتوحات:** ${caliph.conquests}`,
            "",
            `**التحديات:** ${caliph.challenges}`,
            "",
            `**الأثر التاريخي:** ${caliph.impact}`,
            "",
            `**الأحداث المرتبطة:** ${caliph.eventIds.map(id => eventTitles.get(id)).join("؛ ")}.`,
            "",
            `**مراجع:** ${citations(caliph.referenceIds)}.`,
            ""
        );
    });

    lines.push("## الخط الزمني", "");
    lines.push("| التاريخ | الحدث | الخليفة/الشخصيات المرتبطة |", "|---|---|---|");
    events.forEach(event => {
        lines.push(`| ${event.dateLabel} | ${event.title} | ${event.personIds.map(id => caliphNames.get(id)).join("، ")} |`);
    });
    lines.push("", "## الأحداث", "");
    events.forEach(event => {
        lines.push(
            `### ${event.dateLabel} — ${event.title}`,
            "",
            `**الملخص:** ${event.summary}`,
            "",
            `**الخلفية:** ${event.background}`,
            "",
            `**الأسباب:** ${event.causes}`,
            "",
            `**النتائج:** ${event.outcomes}`,
            "",
            `**الشخصيات:** ${event.personIds.map(id => caliphNames.get(id)).join("، ") || "لا ينطبق"}.`,
            "",
            `**المواضع المرتبطة:** ${event.placeIds.map(id => placeNames.get(id)).join("، ") || "غير محددة على نحو موثوق"}.`,
            "",
            `**مراجع:** ${citations(event.referenceIds)}.`,
            ""
        );
    });

    lines.push("## الجغرافيا والفتوحات", "");
    lines.push("تعرض القائمة نقاطًا جغرافية للمراكز والحملات والمعارك، لا حدودًا سياسية ثابتة. لا تمثل الإحداثية موقعًا أثريًا مؤكدًا ما لم يذكر خلاف ذلك.", "");
    places.forEach(place => {
        lines.push(
            `### ${place.name}`,
            "",
            `**الإقليم:** ${place.region}. **النوع:** ${place.category}. **الإحداثيات التقريبية:** ${place.coordinates.join(", ")}.`,
            "",
            `${place.locationNote} **الأحداث المرتبطة:** ${place.eventIds.map(id => eventTitles.get(id)).join("؛ ") || "لا توجد أحداث مسندة في هذه النسخة"}.`,
            ""
        );
    });

    lines.push("## المراجع", "");
    source.references.forEach((reference, index) => {
        lines.push(`${index + 1}. ${reference.citation} ${reference.scope}`);
    });
    lines.push(
        "",
        "### تنبيه ببليوغرافي",
        "",
        "الإحالات هنا موضوعية. قبل الاستشهاد البحثي أو النشر النهائي، يجب تثبيت المحقق والناشر والطبعة والجزء والصفحة أو رقم الخبر المستخدم. لا تعني قائمة المراجع أن كل خبر في المصادر متفق عليه؛ تقارن الروايات وتعرض حدودها.",
        ""
    );
    return `${lines.join("\n")}\n`;
}

fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(path.join(outputDirectory, "data.json"), `${JSON.stringify(data, null, 2)}\n`, "utf8");
fs.writeFileSync(path.join(root, "RASHIDUN_ENCYCLOPEDIA.md"), buildEncyclopediaMarkdown(), "utf8");
console.log(`Generated ${caliphs.length} caliphs, ${events.length} events, and ${places.length} places.`);
