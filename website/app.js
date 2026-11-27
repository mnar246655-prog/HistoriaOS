const collections = {
    books: {
        file: "../books/books.json",
        title: "title",
        description: "description",
        searchFields: ["title", "author", "category", "description", "historicalPeriod", "personNames", "eventNames", "cityNames"],
        fields: [
            { key: "author", label: "المؤلف" },
            { key: "compositionDate", label: "تاريخ التأليف" },
            { key: "category", label: "التصنيف" }
        ],
        kicker: "كتاب تاريخي"
    },
    people: {
        file: "../people/people.json",
        title: "name",
        description: "description",
        searchFields: ["name", "period", "description"],
        fields: [{ key: "period", label: "العصر" }],
        kicker: "شخصية تاريخية"
    },
    events: {
        file: "../events/events.json",
        title: "title",
        description: "description",
        searchFields: ["title", "year", "state", "period", "century", "description"],
        fields: [
            { key: "year", label: "السنة" },
            { key: "state", label: "الدولة" }
        ],
        kicker: "حدث تاريخي"
    }
};

const loadedCollections = new Map();
const searchInput = document.querySelector("#search");
if (searchInput && typeof window !== "undefined") {
    const initialQuery = new URLSearchParams(window.location.search).get("q");
    if (initialQuery) searchInput.value = initialQuery;
}
const timelineRange = document.querySelector("#timeline-range");
const timelineCurrentYear = document.querySelector("#timeline-current-year");
const timelineStartYear = document.querySelector("#timeline-start-year");
const timelineEndYear = document.querySelector("#timeline-end-year");
const timelineResultCount = document.querySelector("#timeline-result-count");
const timelinePreviousButton = document.querySelector("#timeline-prev");
const timelineNextButton = document.querySelector("#timeline-next");
const timelineShowAllButton = document.querySelector("#timeline-show-all");
const timelineCenturyFilter = document.querySelector("#timeline-century");
const timelineStateFilter = document.querySelector("#timeline-state");
const timelinePeriodFilter = document.querySelector("#timeline-period");
const timelineFromYear = document.querySelector("#timeline-from-year");
const timelineToYear = document.querySelector("#timeline-to-year");
let timelineYears = [];

function normalizeSearchText(value) {
    return String(value)
        .normalize("NFD")
        .replace(/[\u064B-\u065F\u0670]/g, "")
        .replace(/[أإآ]/g, "ا")
        .replace(/ى/g, "ي")
        .toLocaleLowerCase("ar")
        .trim();
}

function createTextElement(tagName, className, text) {
    const element = document.createElement(tagName);
    element.className = className;
    element.textContent = text;
    return element;
}

function createSourceLink(item) {
    if (!item.sourceUrl) return null;
    let url;
    try {
        url = new URL(item.sourceUrl);
    } catch {
        console.error("Invalid source URL in historical record:", item.title || item.name || item.id);
        return null;
    }
    const allowedHosts = new Set([
        "en.wikipedia.org",
        "ar.wikipedia.org",
        "en.wikisource.org",
        "ar.wikisource.org",
        "zh.wikisource.org"
    ]);
    if (url.protocol !== "https:"
        || url.username
        || url.password
        || url.port
        || !allowedHosts.has(url.hostname)
        || !url.pathname.startsWith("/wiki/")) {
        console.error("Invalid source URL in historical record:", item.title || item.name || item.id);
        return null;
    }

    const link = document.createElement("a");
    link.className = "source-link";
    link.href = url.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    const sourceName = item.sourceName === "Wikipedia" ? "ويكيبيديا"
        : item.sourceName === "Wikisource" ? "ويكي مصدر"
            : item.sourceName === "Chinese Wikisource" ? "ويكي مصدر (الصينية)"
                : item.sourceName || "مصدر مفتوح";
    link.textContent = `المصدر: ${sourceName}`
        + (item.sourceLicense ? ` (${item.sourceLicense})` : "");
    return link;
}

function createBookCard(item, collection) {
    const card = document.createElement("article");
    card.className = "data-card book-card";
    const heading = document.createElement("div");
    heading.className = "card-heading";
    heading.append(createTextElement("span", "card-kicker", collection.kicker));
    card.append(heading);

    const detailHref = `book.html?id=${encodeURIComponent(item.id)}`;
    const coverLink = document.createElement("a");
    coverLink.className = "book-cover-link";
    coverLink.href = detailHref;
    coverLink.setAttribute("aria-label", `عرض تفاصيل كتاب ${item.title}`);
    coverLink.append(window.HistoriaBookCovers.create(item, "card"));
    card.append(coverLink);

    const content = document.createElement("div");
    content.className = "book-card-content";
    const title = document.createElement("h3");
    title.className = "card-title";
    const titleLink = document.createElement("a");
    titleLink.className = "book-title-link";
    titleLink.href = detailHref;
    titleLink.textContent = item[collection.title] ?? "بدون عنوان";
    title.append(titleLink);
    content.append(title);
    collection.fields.forEach(field => {
        const value = item[field.key];
        if (value !== undefined && value !== null && value !== "") {
            content.append(createTextElement("p", "card-detail", `${field.label}: ${value}`));
        }
    });
    if (item.summary || item[collection.description]) {
        content.append(createTextElement("p", "card-description", item.summary || item[collection.description]));
    }
    const detailLink = document.createElement("a");
    detailLink.className = "book-detail-link";
    detailLink.href = detailHref;
    detailLink.textContent = "عرض الملف التفصيلي";
    content.append(detailLink);
    const sourceLink = createSourceLink(item);
    if (sourceLink) content.append(sourceLink);
    card.append(content);
    return card;
}

function createCard(item, collection) {
    if (collection.kicker === "كتاب تاريخي" && item.cover && window.HistoriaBookCovers) {
        return createBookCard(item, collection);
    }
    const card = document.createElement("article");
    card.className = "data-card";
    if (window.HistoriaVisualSystem
        && (collection.kicker === "شخصية تاريخية" || collection.kicker === "حدث تاريخي")) {
        const type = collection.kicker === "شخصية تاريخية" ? "person" : "event";
        window.HistoriaVisualSystem.addArtwork(card, type, item[collection.title] || "سجل تاريخي");
    }
    const heading = document.createElement("div");
    heading.className = "card-heading";
    heading.append(createTextElement("span", "card-kicker", collection.kicker));
    if (item.isSample) heading.append(createTextElement("span", "sample-badge", "تجريبي"));
    card.append(heading);

    const title = item[collection.title];
    card.append(createTextElement("h3", "card-title", title ?? "بدون عنوان"));

    collection.fields.forEach(field => {
        const value = item[field.key];
        if (value !== undefined && value !== null && value !== "") {
            card.append(createTextElement("p", "card-detail", `${field.label}: ${value}`));
        }
    });
    if (item[collection.description]) {
        card.append(createTextElement("p", "card-description", item[collection.description]));
    }
    const sourceLink = createSourceLink(item);
    if (sourceLink) card.append(sourceLink);

    return card;
}

function createTimelineItem(item) {
    const timelineItem = document.createElement("article");
    timelineItem.className = "timeline-item";
    const year = item.year === undefined || item.year === null ? "غير محدد" : String(item.year);

    timelineItem.append(createTextElement("span", "timeline-year", year));
    timelineItem.append(createTextElement("span", "timeline-marker", ""));
    const content = document.createElement("div");
    content.className = "timeline-content";
    content.append(createTextElement("h2", "card-title", item.title ?? "حدث تاريخي"));
    if (item.description) content.append(createTextElement("p", "card-description", item.description));
    const details = [item.state, item.period].filter(Boolean).join(" · ");
    if (details) content.append(createTextElement("p", "card-detail", details));
    const sourceLink = createSourceLink(item);
    if (sourceLink) content.append(sourceLink);
    if (item.isSample) content.append(createTextElement("span", "sample-badge", "بيانات تجريبية"));
    timelineItem.append(content);

    return timelineItem;
}

function getEventYear(item) {
    if (item.year === undefined || item.year === null || item.year === "") return null;
    const year = Number(item.year);
    return Number.isFinite(year) ? year : null;
}

function compareEventsByYear(first, second) {
    const firstYear = getEventYear(first);
    const secondYear = getEventYear(second);
    if (firstYear === null && secondYear === null) return 0;
    if (firstYear === null) return 1;
    if (secondYear === null) return -1;
    return firstYear - secondYear;
}

function getEventCentury(item) {
    if (item.century !== undefined && item.century !== null && item.century !== "") {
        return Number(item.century);
    }
    const year = getEventYear(item);
    return year === null ? null : Math.ceil(year / 100);
}

function populateFilter(select, values, placeholder, formatValue) {
    if (!select) return;
    select.replaceChildren();
    const allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = placeholder;
    select.append(allOption);

    [...new Set(values.filter(value => value !== undefined && value !== null && value !== ""))]
        .sort((first, second) => typeof first === "number" && typeof second === "number"
            ? first - second
            : String(first).localeCompare(String(second), "ar"))
        .forEach(value => {
            const option = document.createElement("option");
            option.value = String(value);
            option.textContent = formatValue ? formatValue(value) : String(value);
            select.append(option);
        });
}

function updateTimelineControls() {
    if (!timelineRange) return;

    const currentYear = Number(timelineRange.value);
    timelineCurrentYear.textContent = timelineYears.length
        ? currentYear.toLocaleString("ar")
        : "غير محدد";

    const hasRange = timelineYears.length > 1;
    timelineRange.disabled = !hasRange;
    timelinePreviousButton.disabled = !timelineYears.some(year => year < currentYear);
    timelineNextButton.disabled = !timelineYears.some(year => year > currentYear);
    const hasFilters = Boolean(
        (timelineCenturyFilter && timelineCenturyFilter.value)
        || (timelineStateFilter && timelineStateFilter.value)
        || (timelinePeriodFilter && timelinePeriodFilter.value)
        || (timelineFromYear && timelineFromYear.value && Number(timelineFromYear.value) !== timelineYears[0])
        || (timelineToYear && timelineToYear.value && Number(timelineToYear.value) !== timelineYears[timelineYears.length - 1])
        || (searchInput && searchInput.value.trim())
    );
    timelineShowAllButton.disabled = !timelineYears.length
        || currentYear === timelineYears[timelineYears.length - 1] && !hasFilters;
}

function initializeTimelineControls(items) {
    if (!timelineRange) return;

    timelineYears = [...new Set(items.map(getEventYear).filter(year => year !== null))].sort((a, b) => a - b);
    if (!timelineYears.length) {
        timelineRange.disabled = true;
        timelineCurrentYear.textContent = "غير محدد";
        timelineStartYear.textContent = "—";
        timelineEndYear.textContent = "—";
        timelinePreviousButton.disabled = true;
        timelineNextButton.disabled = true;
        timelineShowAllButton.disabled = true;
        return;
    }

    timelineRange.min = String(timelineYears[0]);
    timelineRange.max = String(timelineYears[timelineYears.length - 1]);
    timelineRange.value = String(timelineYears[timelineYears.length - 1]);
    timelineStartYear.textContent = timelineYears[0].toLocaleString("ar");
    timelineEndYear.textContent = timelineYears[timelineYears.length - 1].toLocaleString("ar");
    if (timelineFromYear) {
        timelineFromYear.min = String(timelineYears[0]);
        timelineFromYear.max = String(timelineYears[timelineYears.length - 1]);
        timelineFromYear.value = String(timelineYears[0]);
    }
    if (timelineToYear) {
        timelineToYear.min = String(timelineYears[0]);
        timelineToYear.max = String(timelineYears[timelineYears.length - 1]);
        timelineToYear.value = String(timelineYears[timelineYears.length - 1]);
    }

    populateFilter(
        timelineCenturyFilter,
        items.map(getEventCentury),
        "كل القرون",
        century => `القرن ${Number(century).toLocaleString("ar")}`
    );
    populateFilter(timelineStateFilter, items.map(item => item.state), "كل الدول");
    populateFilter(timelinePeriodFilter, items.map(item => item.period), "كل الفترات");

    timelineRange.addEventListener("input", () => {
        updateTimelineControls();
        refreshVisibleCollections();
    });
    [timelineCenturyFilter, timelineStateFilter, timelinePeriodFilter].forEach(filter => {
        if (filter) filter.addEventListener("change", () => {
            updateTimelineControls();
            refreshVisibleCollections();
        });
    });
    [timelineFromYear, timelineToYear].forEach(input => {
        if (input) input.addEventListener("input", () => {
            updateTimelineControls();
            refreshVisibleCollections();
        });
    });
    timelinePreviousButton.addEventListener("click", () => {
        const previousYear = timelineYears.filter(year => year < Number(timelineRange.value)).pop();
        if (previousYear !== undefined) setTimelineYear(previousYear);
    });
    timelineNextButton.addEventListener("click", () => {
        const nextYear = timelineYears.find(year => year > Number(timelineRange.value));
        if (nextYear !== undefined) setTimelineYear(nextYear);
    });
    timelineShowAllButton.addEventListener("click", () => {
        timelineRange.value = String(timelineYears[timelineYears.length - 1]);
        if (timelineCenturyFilter) timelineCenturyFilter.value = "";
        if (timelineStateFilter) timelineStateFilter.value = "";
        if (timelinePeriodFilter) timelinePeriodFilter.value = "";
        if (timelineFromYear) timelineFromYear.value = timelineFromYear.min;
        if (timelineToYear) timelineToYear.value = timelineToYear.max;
        if (searchInput) searchInput.value = "";
        updateTimelineControls();
        refreshVisibleCollections();
    });
    updateTimelineControls();
}

function setTimelineYear(year) {
    timelineRange.value = String(year);
    updateTimelineControls();
    refreshVisibleCollections();
}

function renderTimeline(items, container) {
    const orderedItems = items.slice().sort(compareEventsByYear);
    const selectedYear = timelineRange ? Number(timelineRange.value) : null;
    const visibleItems = orderedItems.filter(item => {
        const year = getEventYear(item);
        if (selectedYear !== null && Number.isFinite(selectedYear) && year !== null && year > selectedYear) return false;
        if ((timelineFromYear && timelineFromYear.value || timelineToYear && timelineToYear.value) && year === null) return false;
        if (timelineFromYear && timelineFromYear.value && year < Number(timelineFromYear.value)) return false;
        if (timelineToYear && timelineToYear.value && year > Number(timelineToYear.value)) return false;
        if (timelineCenturyFilter && timelineCenturyFilter.value
            && getEventCentury(item) !== Number(timelineCenturyFilter.value)) return false;
        if (timelineStateFilter && timelineStateFilter.value
            && item.state !== timelineStateFilter.value) return false;
        if (timelinePeriodFilter && timelinePeriodFilter.value
            && item.period !== timelinePeriodFilter.value) return false;
        return true;
    });

    container.replaceChildren();
    if (timelineResultCount) {
        timelineResultCount.textContent = `يعرض ${visibleItems.length.toLocaleString("ar")} من ${orderedItems.length.toLocaleString("ar")} أحداث`;
    }
    if (visibleItems.length === 0) {
        const message = orderedItems.length
            ? "لا توجد أحداث حتى السنة المحددة."
            : searchInput && searchInput.value.trim()
                ? "لا توجد نتائج مطابقة لبحثك."
                : "لا توجد أحداث لعرضها.";
        container.append(createTextElement("p", "empty-state", message));
        return;
    }

    visibleItems.forEach(item => container.append(createTimelineItem(item)));
}

function renderCollection(key, items, container) {
    const query = searchInput ? normalizeSearchText(searchInput.value) : "";
    const searchFields = collections[key].searchFields;
    const availableItems = container.dataset.curatedOnly === "true"
        ? items.filter(item => !item.isSample && item.sourceUrl)
        : items;
    let matchingItems = availableItems.filter(item =>
        searchFields.some(field => normalizeSearchText(item[field] ?? "").includes(query))
    );
    const featuredIds = (container.dataset.featuredIds || "").split(",").filter(Boolean);
    if (!query && featuredIds.length) {
        const itemsById = new Map(matchingItems.map(item => [item.id, item]));
        const missingIds = featuredIds.filter(id => !itemsById.has(id));
        if (missingIds.length) console.error(`Missing featured ${key} records:`, missingIds);
        matchingItems = featuredIds.map(id => itemsById.get(id)).filter(Boolean);
    }

    if (container.dataset.display === "timeline") {
        renderTimeline(matchingItems, container);
        return;
    }

    container.replaceChildren();
    if (matchingItems.length === 0) {
        const message = query ? "لا توجد نتائج مطابقة لبحثك." : "لا توجد بيانات لعرضها.";
        container.append(createTextElement("p", "empty-state", message));
        return;
    }

    const defaultLimit = Number(container.dataset.limit);
    const searchLimit = Number(container.dataset.searchLimit);
    const limit = query && searchLimit > 0 ? searchLimit : !query && defaultLimit > 0 ? defaultLimit : matchingItems.length;
    matchingItems.slice(0, limit).forEach(item => container.append(createCard(item, collections[key])));
    if (matchingItems.length > limit) {
        const note = document.createElement("p");
        note.className = "result-note";
        note.append(document.createTextNode(`يظهر ${limit.toLocaleString("ar")} من ${matchingItems.length.toLocaleString("ar")} نتيجة. `));
        const link = document.createElement("a");
        link.href = `${key}.html?q=${encodeURIComponent(searchInput.value.trim())}`;
        link.textContent = "عرض جميع النتائج";
        note.append(link);
        container.append(note);
    }
}

async function loadCollection(key, collection, containers) {
    try {
        const response = await fetch(collection.file);
        if (!response.ok) {
            throw new Error(`تعذّر تحميل ${collection.file} (HTTP ${response.status})`);
        }

        const items = await response.json();
        if (!Array.isArray(items) || items.some(item => !item || typeof item !== "object" || Array.isArray(item))) {
            throw new Error(`تنسيق البيانات غير صالح في ${collection.file}`);
        }

        loadedCollections.set(key, items);
        const count = document.getElementById(`${key}-count`);
        if (count) count.textContent = items.length.toLocaleString("ar");
        if (containers.some(container => container.dataset.display === "timeline")) {
            initializeTimelineControls(items);
        }
        containers.forEach(container => renderCollection(key, items.slice(), container));
    } catch (error) {
        console.error(error);
        if (containers.some(container => container.dataset.display === "timeline")) {
            timelineCurrentYear.textContent = "تعذّر التحميل";
            timelineResultCount.textContent = "تعذّر تحميل الأحداث";
            timelineStartYear.textContent = "—";
            timelineEndYear.textContent = "—";
            timelineRange.disabled = true;
            timelinePreviousButton.disabled = true;
            timelineNextButton.disabled = true;
            timelineShowAllButton.disabled = true;
        }
        containers.forEach(container => {
            container.replaceChildren();
            container.append(createTextElement(
                "p",
                "empty-state load-error",
                "تعذّر تحميل البيانات. تأكد من تشغيل الموقع عبر خادم محلي وتوفر ملف JSON صالح."
            ));
        });
    }
}

function refreshVisibleCollections() {
    document.querySelectorAll("[data-collection]").forEach(container => {
        const key = container.dataset.collection;
        const items = loadedCollections.get(key);
        if (items) renderCollection(key, items.slice(), container);
    });
}

async function loadHomepageStats() {
    const statElements = Array.from(document.querySelectorAll("[data-home-stat]"));
    if (!statElements.length) return;

    const status = document.getElementById("home-stats-status");
    try {
        const paths = [
            "../people/people.json",
            "../events/events.json",
            "../umayyad/data.json",
            "../rashidun/data.json"
        ];
        const responses = await Promise.all(paths.map(path => fetch(path)));
        const failedResponse = responses.find(response => !response.ok);
        if (failedResponse) throw new Error(`تعذّر تحميل بيانات الإحصاءات (HTTP ${failedResponse.status})`);
        const [people, events, umayyad, rashidun] = await Promise.all(responses.map(response => response.json()));
        const isSourced = record => !record.isSample
            && (record.sourceUrl || (Array.isArray(record.referenceIds) && record.referenceIds.length));
        const uniqueCount = (records, keyFor) => new Set(records.map(keyFor).filter(Boolean)).size;
        const normalize = value => normalizeSearchText(value).replace(/[^\p{L}\p{N}]+/gu, "");
        const documentedPeople = [
            ...people.filter(isSourced),
            ...umayyad.people.filter(isSourced),
            ...rashidun.caliphs.filter(isSourced)
        ];
        const documentedEvents = [
            ...events.filter(isSourced),
            ...umayyad.events.filter(isSourced),
            ...rashidun.events.filter(isSourced)
        ];
        const documentedCities = [...umayyad.cities, ...rashidun.places];
        const documentedBattles = [
            ...umayyad.battles.filter(isSourced),
            ...rashidun.events.filter(event => isSourced(event) && /معركة|وقعة/.test(event.title)),
            ...events.filter(event => isSourced(event) && /معركة|وقعة|battle|siege/i.test(`${event.title} ${event.sourceTitle || ""}`))
        ];
        const counts = {
            people: uniqueCount(documentedPeople, person => normalize(person.name)),
            events: uniqueCount(documentedEvents, event => `${Number(event.year)}:${normalize(event.title)}`),
            cities: uniqueCount(documentedCities, city => normalize(city.name)),
            battles: uniqueCount(documentedBattles, battle => {
                const year = Number(battle.year);
                const title = normalize(battle.name || battle.title);
                return Number.isFinite(year) && title ? `${year}:${title}` : "";
            })
        };
        statElements.forEach(element => {
            const count = counts[element.dataset.homeStat];
            if (!Number.isFinite(count)) {
                throw new Error(`مجموعة إحصائية غير معروفة: ${element.dataset.homeStat}`);
            }
            element.textContent = count.toLocaleString("ar");
        });
        if (status) status.textContent = "إحصاءات السجلات ذات الإحالات؛ السجلات التجريبية مستبعدة.";
    } catch (error) {
        console.error("تعذّر تحميل إحصاءات الصفحة الرئيسية:", error);
        statElements.forEach(element => {
            element.textContent = "—";
        });
        if (status) {
            status.textContent = "تعذّر تحميل الإحصاءات الحية؛ تحقق من اتصال ملفات البيانات.";
            status.classList.add("load-error");
        }
    }
}

function initializeHomeEraCounter() {
    const range = document.getElementById("home-era-range");
    const yearOutput = document.getElementById("home-era-year");
    const mapLabel = document.getElementById("home-era-map-label");
    const eraLink = document.getElementById("home-era-link");
    const map = document.querySelector(".home-hero-map-window");
    const buttons = Array.from(document.querySelectorAll("[data-home-era]"));
    if (!range || !yearOutput || !eraLink || !buttons.length) return;

    const eras = [
        { year: "٦٣٢م", title: "الخلافة الراشدة", href: "rashidun.html" },
        { year: "٦٦١م", title: "الدولة الأموية", href: "umayyad.html" },
        { year: "٧١١م", title: "الأندلس", href: "events.html?q=الأندلس" },
        { year: "١٢٩٩م", title: "الدولة العثمانية", href: "events.html?q=الدولة%20العثمانية" }
    ];
    const updateEra = value => {
        const index = Math.max(0, Math.min(eras.length - 1, Number(value)));
        const era = eras[index];
        range.value = String(index);
        range.setAttribute("aria-valuetext", `${era.title}، ${era.year}`);
        yearOutput.value = era.year;
        yearOutput.textContent = era.year;
        eraLink.href = era.href;
        eraLink.firstChild.textContent = `استكشف ${era.title} `;
        if (mapLabel) mapLabel.textContent = `${era.title} · ${era.year}`;
        if (map) map.dataset.activeEra = String(index);
        buttons.forEach(button => {
            button.setAttribute("aria-pressed", String(Number(button.dataset.homeEra) === index));
        });
    };

    range.addEventListener("input", () => updateEra(range.value));
    buttons.forEach(button => button.addEventListener("click", () => updateEra(button.dataset.homeEra)));
    updateEra(range.value);
}

document.querySelectorAll("[data-collection]").forEach(container => {
    const key = container.dataset.collection;
    const collection = collections[key];
    if (!collection) return;

    const containers = Array.from(document.querySelectorAll(`[data-collection="${key}"]`));
    loadCollection(key, collection, containers);
});

if (searchInput) searchInput.addEventListener("input", () => {
    updateTimelineControls();
    refreshVisibleCollections();
});

loadHomepageStats();
initializeHomeEraCounter();

document.querySelectorAll("[data-current-year]").forEach(element => {
    element.textContent = String(new Date().getFullYear());
});

document.querySelectorAll("[data-export-pdf]").forEach(button => {
    button.addEventListener("click", () => window.print());
});

const contactForm = document.querySelector("#contact-form");
if (contactForm) {
    contactForm.addEventListener("submit", event => {
        event.preventDefault();
        document.getElementById("contact-status").textContent =
            "تم التحقق من الحقول، لكن لم تُرسل الرسالة. يلزم ربط النموذج بخدمة استقبال قبل الإرسال.";
    });
}
