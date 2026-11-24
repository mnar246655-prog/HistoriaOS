const collections = {
    books: {
        file: "../books/books.json",
        title: "title",
        description: "description",
        searchFields: ["title", "author", "category", "description"],
        fields: [
            { key: "author", label: "المؤلف" },
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

const historicalPlaces = [
    {
        name: "مكة",
        region: "الحجاز · المملكة العربية السعودية",
        coordinates: [21.4225, 39.8262],
        history: "تضم المسجد الحرام والكعبة، وكانت مقصدًا للحج ومركزًا دينيًا وتجاريًا بارزًا في غرب الجزيرة العربية."
    },
    {
        name: "المدينة",
        region: "الحجاز · المملكة العربية السعودية",
        coordinates: [24.4672, 39.6111],
        history: "هاجر إليها النبي محمد ﷺ سنة 622م، ومنها قامت أول جماعة إسلامية، وتضم المسجد النبوي."
    },
    {
        name: "القدس",
        region: "بلاد الشام",
        coordinates: [31.7683, 35.2137],
        history: "مدينة ذات مكانة دينية وتاريخية كبرى، وفيها المسجد الأقصى وقبة الصخرة، وارتبطت بمحطات بارزة في تاريخ المنطقة."
    },
    {
        name: "دمشق",
        region: "بلاد الشام · سوريا",
        coordinates: [33.5138, 36.2765],
        history: "من أقدم المدن المأهولة، وكانت عاصمة الدولة الأموية بين عامي 661 و750م."
    },
    {
        name: "بغداد",
        region: "العراق",
        coordinates: [33.3152, 44.3661],
        history: "أسسها الخليفة العباسي أبو جعفر المنصور سنة 762م، وغدت مركزًا سياسيًا وعلميًا بارزًا في العصر العباسي."
    },
    {
        name: "قرطبة",
        region: "الأندلس · إسبانيا",
        coordinates: [37.8882, -4.7794],
        history: "ازدهرت في الأندلس، وصارت عاصمة الخلافة الأموية في الأندلس في القرن العاشر ومركزًا للعلم والعمران."
    },
    {
        name: "القاهرة",
        region: "مصر",
        coordinates: [30.0444, 31.2357],
        history: "تأسست القاهرة الفاطمية سنة 969م، وغدت مركزًا سياسيًا وثقافيًا بارزًا في مصر."
    },
    {
        name: "إسطنبول",
        region: "تركيا",
        coordinates: [41.0082, 28.9784],
        history: "كانت القسطنطينية عاصمة للإمبراطورية البيزنطية، وفتحها العثمانيون سنة 1453م."
    }
];

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
    if (typeof item.sourceUrl !== "string"
        || !/^https:\/\/en\.wikipedia\.org\/wiki\/[^\s]+$/.test(item.sourceUrl)) {
        console.error("Invalid source URL in historical record:", item.title || item.name || item.id);
        return null;
    }

    const link = document.createElement("a");
    link.className = "source-link";
    link.href = item.sourceUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = `المصدر: ${item.sourceName === "Wikipedia" ? "ويكيبيديا" : item.sourceName || "مصدر مفتوح"}`
        + (item.sourceLicense ? ` (${item.sourceLicense})` : "");
    return link;
}

function createCard(item, collection) {
    const card = document.createElement("article");
    card.className = "data-card";
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
    const matchingItems = items.filter(item =>
        searchFields.some(field => normalizeSearchText(item[field] ?? "").includes(query))
    );

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

function createMapPopup(place) {
    const popup = document.createElement("div");
    popup.className = "map-popup";
    popup.dir = "rtl";
    popup.append(createTextElement("h2", "map-popup-title", place.name));
    popup.append(createTextElement("p", "map-popup-region", place.region));
    popup.append(createTextElement("p", "map-popup-history", place.history));
    return popup;
}

function initializeHistoricalMap() {
    const mapElement = document.getElementById("history-map");
    if (!mapElement) return;

    const placesList = document.getElementById("map-locations");
    const status = document.getElementById("map-status");
    if (typeof L === "undefined") {
        status.textContent = "تعذّر تحميل مكتبة الخريطة. تحقق من اتصال الإنترنت ثم أعد تحميل الصفحة.";
        status.classList.add("map-status-error");
        return;
    }

    const map = L.map(mapElement, { scrollWheelZoom: false });
    const bounds = [];
    const placeButtons = [];

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>'
    }).addTo(map);

    historicalPlaces.forEach(place => {
        const button = document.createElement("button");
        button.className = "map-place-button";
        button.type = "button";
        button.setAttribute("aria-label", `اعرض ${place.name} على الخريطة`);
        button.append(createTextElement("span", "map-place-name", place.name));
        button.append(createTextElement("span", "map-place-region", place.region));
        placesList.append(button);

        const marker = L.marker(place.coordinates, {
            title: place.name,
            alt: place.name,
            icon: L.divIcon({
                className: "history-marker-shell",
                html: '<span class="history-marker"></span>',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            })
        }).addTo(map);
        marker.bindPopup(createMapPopup(place), { minWidth: 210, maxWidth: 270 });
        marker.on("click", () => {
            placeButtons.forEach(item => item.classList.remove("is-active"));
            button.classList.add("is-active");
        });
        button.addEventListener("click", () => {
            map.flyTo(place.coordinates, 7, { duration: 0.7 });
            marker.openPopup();
            placeButtons.forEach(item => item.classList.remove("is-active"));
            button.classList.add("is-active");
        });

        placeButtons.push(button);
        bounds.push(place.coordinates);
    });

    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 5 });
    map.on("tileerror", () => {
        status.textContent = "تعذّر تحميل بعض بلاطات الخريطة. تحقق من اتصال الإنترنت.";
        status.classList.add("map-status-error");
    });
    map.on("tileload", () => {
        status.textContent = "اضغط على علامة أو اختر مدينة لعرض معلوماتها التاريخية.";
        status.classList.remove("map-status-error");
    });
}

initializeHistoricalMap();

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
