const dataPath = "../rashidun/data.json";
const status = document.querySelector("#rashidun-status");
const caliphCards = document.querySelector("#rashidun-caliph-cards");
const eventsList = document.querySelector("#rashidun-events");
const placesList = document.querySelector("#rashidun-places");
const referencesList = document.querySelector("#rashidun-reference-cards");
const mapElement = document.querySelector("#rashidun-map-canvas");
const yearRange = document.querySelector("#rashidun-year");
const currentYear = document.querySelector("#rashidun-current-year");
const eventCount = document.querySelector("#rashidun-event-count");
const placeCount = document.querySelector("#rashidun-place-count");
let rashidunData;

function textElement(tagName, className, value) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = value;
    return element;
}

function addLink(container, label, href) {
    const link = document.createElement("a");
    link.href = href;
    link.textContent = label;
    container.append(link);
}

function renderReferences() {
    referencesList.replaceChildren();
    rashidunData.references.forEach((reference, index) => {
        const card = document.createElement("article");
        card.className = "encyclopedia-reference";
        card.id = `rash-reference-${reference.id}`;
        card.append(textElement("p", "card-kicker", `مرجع ${index + 1}`));
        card.append(textElement("h3", "card-title", reference.shortTitle));
        card.append(textElement("p", "card-description", reference.citation));
        card.append(textElement("p", "encyclopedia-reference-scope", reference.scope));
        referencesList.append(card);
    });
}

function addReferenceLinks(container, ids) {
    const row = textElement("div", "encyclopedia-citations", "مراجع: ");
    ids.forEach((id, index) => {
        const reference = rashidunData.references.find(item => item.id === id);
        if (!reference) {
            console.error("Unknown Rashidun reference:", id);
            return;
        }
        if (index) row.append(document.createTextNode(" · "));
        addLink(row, reference.shortTitle, `#rash-reference-${id}`);
    });
    container.append(row);
}

function renderCaliphs() {
    const eventsById = new Map(rashidunData.events.map(event => [event.id, event]));
    caliphCards.replaceChildren();
    rashidunData.caliphs.forEach(caliph => {
        const card = document.createElement("article");
        card.className = "data-card rashidun-caliph-card";
        card.id = `profile-${caliph.id}`;
        if (window.HistoriaVisualSystem) window.HistoriaVisualSystem.addArtwork(card, "person", caliph.name);
        card.append(textElement("p", "card-kicker", `${caliph.epithet} · ${caliph.dates}`));
        card.append(textElement("h3", "card-title", caliph.name));
        card.append(textElement("p", "card-detail", `فترة الخلافة: ${caliph.reign}`));
        [
            ["النشأة", caliph.origin],
            ["الإسلام", caliph.islam],
            ["فترة الخلافة", caliph.caliphate],
            ["الإنجازات", caliph.achievements],
            ["الإصلاحات", caliph.reforms],
            ["الفتوحات", caliph.conquests],
            ["التحديات", caliph.challenges],
            ["الأثر التاريخي", caliph.impact]
        ].forEach(([label, value]) => {
            card.append(textElement("p", "encyclopedia-label", label));
            card.append(textElement("p", "card-description", value));
        });
        const relatedEvents = document.createElement("details");
        relatedEvents.className = "umayyad-relations";
        relatedEvents.append(textElement("summary", "", `الأحداث المرتبطة (${caliph.eventIds.length})`));
        const links = document.createElement("div");
        caliph.eventIds.forEach((id, index) => {
            const event = eventsById.get(id);
            if (!event) {
                console.error("Missing event linked to Rashidun caliph:", caliph.id, id);
                return;
            }
            if (index) links.append(document.createTextNode(" · "));
            addLink(links, event.title, `#${event.id}`);
        });
        relatedEvents.append(links);
        card.append(relatedEvents);
        addReferenceLinks(card, caliph.referenceIds);
        caliphCards.append(card);
    });
}

function renderEvents() {
    const peopleById = new Map(rashidunData.caliphs.map(person => [person.id, person]));
    const placesById = new Map(rashidunData.places.map(place => [place.id, place]));
    const selectedYear = Number(yearRange.value);
    const visibleEvents = rashidunData.events.filter(event => event.year <= selectedYear);
    eventsList.replaceChildren();
    currentYear.textContent = `${selectedYear.toLocaleString("ar")}م`;
    eventCount.textContent = `يعرض ${visibleEvents.length.toLocaleString("ar")} من ${rashidunData.events.length.toLocaleString("ar")} أحداث`;

    if (!visibleEvents.length) {
        eventsList.append(textElement("p", "empty-state", "لا توجد أحداث قبل السنة المختارة."));
        return;
    }

    visibleEvents.forEach(event => {
        const card = document.createElement("article");
        card.className = "data-card rashidun-event-card";
        card.id = event.id;
        if (window.HistoriaVisualSystem && /معركة|وقعة/.test(event.title)) {
            window.HistoriaVisualSystem.addArtwork(card, "battle", event.title);
        }
        card.append(textElement("p", "card-kicker", `${event.dateLabel} · ${event.category}`));
        card.append(textElement("h3", "card-title", event.title));
        card.append(textElement("p", "card-description", event.summary));
        [
            ["الخلفية", event.background],
            ["الأسباب", event.causes],
            ["النتائج", event.outcomes]
        ].forEach(([label, value]) => {
            card.append(textElement("p", "encyclopedia-label", label));
            card.append(textElement("p", "card-description event-context", value));
        });

        const people = textElement("div", "umayyad-relations", "الشخصيات المرتبطة: ");
        event.personIds.forEach((id, index) => {
            const person = peopleById.get(id);
            if (!person) return;
            if (index) people.append(document.createTextNode(" · "));
            addLink(people, person.name, `#profile-${id}`);
        });
        card.append(people);

        if (event.placeIds.length) {
            const locations = textElement("div", "umayyad-relations", "المواضع: ");
            event.placeIds.forEach((id, index) => {
                const place = placesById.get(id);
                if (!place) return;
                if (index) locations.append(document.createTextNode(" · "));
                addLink(locations, place.name, `#place-${id}`);
            });
            card.append(locations);
        }
        addReferenceLinks(card, event.referenceIds);
        eventsList.append(card);
    });
}

function createPlacePopup(place) {
    const popup = textElement("div", "map-popup", "");
    popup.dir = "rtl";
    popup.append(textElement("h2", "map-popup-title", place.name));
    popup.append(textElement("p", "map-popup-region", `${place.region} · ${place.category}`));
    popup.append(textElement("p", "map-popup-history", place.locationNote));
    const related = textElement("div", "umayyad-map-events", "أحداث مرتبطة:");
    place.eventIds.forEach(id => {
        const event = rashidunData.events.find(item => item.id === id);
        if (event) addLink(related, `${event.year}م · ${event.title}`, `#${event.id}`);
    });
    if (!place.eventIds.length) related.append(textElement("span", "", "لا توجد أحداث مسندة لهذا الموضع في هذه النسخة."));
    popup.append(related);
    return popup;
}

function initializeMap() {
    if (typeof L === "undefined") {
        status.textContent = "تعذّر تحميل مكتبة Leaflet؛ تبقى قائمة المواضع والأحداث متاحة.";
        status.classList.add("map-status-error");
        return;
    }
    const map = L.map(mapElement, { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>'
    }).addTo(map);

    const bounds = [];
    rashidunData.places.forEach(place => {
        const marker = L.marker(place.coordinates, { title: place.name, alt: place.name })
            .addTo(map)
            .bindPopup(createPlacePopup(place), { minWidth: 220, maxWidth: 320 });
        bounds.push(place.coordinates);

        const button = document.createElement("button");
        button.className = "map-place-button";
        button.type = "button";
        button.id = `place-${place.id}`;
        button.setAttribute("aria-label", `اعرض ${place.name} على الخريطة`);
        if (window.HistoriaVisualSystem) {
            button.append(window.HistoriaVisualSystem.createArtwork("city", place.name));
        }
        button.append(textElement("span", "map-place-name", place.name));
        button.append(textElement("span", "map-place-region", `${place.region} · ${place.category}`));
        button.addEventListener("click", () => {
            map.flyTo(place.coordinates, 6, { duration: 0.6 });
            marker.openPopup();
            placesList.querySelectorAll(".map-place-button").forEach(item => item.classList.remove("is-active"));
            button.classList.add("is-active");
        });
        marker.on("click", () => button.classList.add("is-active"));
        placesList.append(button);
    });

    if (bounds.length) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 5 });
    map.on("tileerror", () => {
        status.textContent = "تعذّر تحميل بعض بلاطات الخريطة. تحقق من اتصال الإنترنت.";
        status.classList.add("map-status-error");
    });
    map.on("tileload", () => status.classList.remove("map-status-error"));
}

async function loadRashidunData() {
    try {
        const response = await fetch(dataPath);
        if (!response.ok) throw new Error(`تعذّر تحميل ${dataPath} (HTTP ${response.status})`);
        rashidunData = await response.json();
        if (rashidunData.caliphs.length !== 4
            || rashidunData.events.length !== 27
            || rashidunData.places.length !== 18
            || !Array.isArray(rashidunData.references)) {
            throw new Error("بيانات موسوعة الخلفاء الراشدين لا تطابق البنية المتوقعة.");
        }

        renderReferences();
        renderCaliphs();
        renderEvents();
        initializeMap();
        yearRange.addEventListener("input", renderEvents);
        placeCount.textContent = `${rashidunData.places.length.toLocaleString("ar")} موضعًا`;
        document.querySelectorAll("[data-rashidun-count]").forEach(element => {
            const key = element.dataset.rashidunCount;
            const count = key === "caliphs" ? rashidunData.caliphs.length
                : key === "events" ? rashidunData.events.length
                    : key === "places" ? rashidunData.places.length
                        : rashidunData.events.filter(event => /معركة|وقعة/.test(event.title)).length;
            element.textContent = count.toLocaleString("ar");
        });
        status.textContent = "اكتمل تحميل السير والأحداث والمواضع المرتبطة.";
    } catch (error) {
        console.error("تعذّر تهيئة موسوعة الخلفاء الراشدين:", error);
        status.textContent = `تعذّر تحميل بيانات الموسوعة: ${error.message}`;
        status.classList.add("map-status-error");
        [caliphCards, eventsList, referencesList, placesList].forEach(container => {
            if (container) container.replaceChildren(textElement("p", "empty-state load-error", "تعذّر تحميل البيانات. تحقق من تشغيل الموقع عبر خادم محلي."));
        });
    }
}

loadRashidunData();
