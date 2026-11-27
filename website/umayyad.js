const dataPath = "../umayyad/data.json";
const searchInput = document.querySelector("#umayyad-search");
const status = document.querySelector("#umayyad-status");
const peopleGrid = document.querySelector("#umayyad-people");
const eventsGrid = document.querySelector("#umayyad-events");
const battlesGrid = document.querySelector("#umayyad-battles");
const citiesList = document.querySelector("#umayyad-cities");
const mapElement = document.querySelector("#umayyad-map");
const caliphsGrid = document.querySelector("#umayyad-caliphs");
const featuredPeopleGrid = document.querySelector("#umayyad-featured-people");
const referencesGrid = document.querySelector("#umayyad-references");
const cityMarkers = new Map();
let umayyadData;

function textElement(tagName, className, value) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    element.textContent = value;
    return element;
}

function addLink(container, label, href, className) {
    const link = document.createElement("a");
    link.textContent = label;
    link.href = href;
    if (className) link.className = className;
    container.append(link);
}

function addSourceLink(container, item) {
    if (!/^https:\/\/en\.wikipedia\.org\/wiki\/[^\s]+$/.test(item.sourceUrl || "")) {
        console.error("Invalid source URL in Umayyad record:", item.id);
        return;
    }

    const link = document.createElement("a");
    link.className = "source-link";
    link.href = item.sourceUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = `قراءة تمهيدية: ${item.sourceName} · ${item.sourceTitle} (${item.sourceLicense})`;
    container.append(link);
}

function addReferenceLinks(container, item) {
    if (!item.referenceIds?.length) return;
    const row = textElement("div", "encyclopedia-citations", "مراجع أكاديمية: ");
    item.referenceIds.forEach((id, index) => {
        const reference = umayyadData.references.find(entry => entry.id === id);
        if (!reference) {
            console.error("Unknown bibliography reference in Umayyad record:", item.id, id);
            return;
        }
        if (index) row.append(document.createTextNode(" · "));
        addLink(row, reference.shortTitle || reference.id, `#reference-${id}`);
    });
    container.append(row);
}

function addRelations(container, label, records, ids, prefix, className) {
    if (!ids.length) return;
    const relation = textElement("div", className || "umayyad-relations", `${label}: `);
    ids.forEach((id, index) => {
        const record = records.get(id);
        if (!record) return;
        if (index) relation.append(document.createTextNode(" · "));
        addLink(relation, record.name || record.title, `#${prefix}${id}`);
    });
    container.append(relation);
}

function renderCaliphs() {
    const peopleById = new Map(umayyadData.people.map(person => [person.id, person]));
    caliphsGrid.replaceChildren();
    umayyadData.caliphs.forEach((entry, index) => {
        const person = peopleById.get(entry.personId);
        if (!person) {
            console.error("Missing Umayyad caliph profile:", entry.personId);
            return;
        }
        const card = document.createElement("article");
        card.className = "data-card caliph-card";
        if (window.HistoriaVisualSystem) window.HistoriaVisualSystem.addArtwork(card, "person", person.name);
        card.append(textElement("p", "card-kicker", `الخليفة ${index + 1} · ${entry.reign}`));
        const title = textElement("h3", "card-title", person.name);
        card.append(title);
        card.append(textElement("p", "card-description", person.historicalImpact));
        if (entry.note) card.append(textElement("p", "encyclopedia-reference-scope", entry.note));
        addLink(card, "فتح الترجمة الموسوعية", `#person-${person.id}`, "umayyad-battle-link");
        caliphsGrid.append(card);
    });
}

function renderFeaturedPeople() {
    const featuredIds = [
        "muawiya", "abdmalik", "umar2", "hajjaj", "maslama",
        "qutayba", "musa", "ibn_zubayr", "husayn", "abu_muslim"
    ];
    const peopleById = new Map(umayyadData.people.map(person => [person.id.replace("um-person-", ""), person]));
    featuredPeopleGrid.replaceChildren();
    featuredIds.forEach(id => {
        const person = peopleById.get(id);
        if (!person) return;
        const card = document.createElement("article");
        card.className = "data-card";
        if (window.HistoriaVisualSystem) window.HistoriaVisualSystem.addArtwork(card, "person", person.name);
        card.append(textElement("p", "card-kicker", person.role));
        card.append(textElement("h3", "card-title", person.name));
        card.append(textElement("p", "card-description", person.historicalImpact));
        addLink(card, "فتح الترجمة الموسوعية", `#person-${person.id}`, "umayyad-battle-link");
        featuredPeopleGrid.append(card);
    });
}

function renderReferences() {
    referencesGrid.replaceChildren();
    umayyadData.references.forEach((reference, index) => {
        const card = document.createElement("article");
        card.className = "encyclopedia-reference";
        card.id = `reference-${reference.id}`;
        card.append(textElement("p", "card-kicker", `مرجع ${index + 1}`));
        card.append(textElement("h3", "card-title", reference.shortTitle || reference.id));
        card.append(textElement("p", "card-description", reference.citation));
        card.append(textElement("p", "encyclopedia-reference-scope", reference.scope));
        if (reference.url) {
            const link = document.createElement("a");
            link.href = reference.url;
            link.target = "_blank";
            link.rel = "noopener noreferrer";
            link.className = "source-link";
            link.textContent = "صفحة الناشر";
            card.append(link);
        }
        referencesGrid.append(card);
    });
}

function renderPeople(query) {
    const eventById = new Map(umayyadData.events.map(event => [event.id, event]));
    const people = umayyadData.people.filter(person => {
        const relationNames = person.relations.map(relation =>
            umayyadData.people.find(item => item.id === relation.personId)?.name || ""
        ).join(" ");
        const haystack = `${person.name} ${person.role} ${person.origin} ${person.biography} ${person.achievements} ${person.historicalImpact} ${relationNames}`.toLocaleLowerCase("ar");
        return haystack.includes(query);
    });
    peopleGrid.replaceChildren();
    people.forEach(person => {
        const card = document.createElement("article");
        card.className = "data-card";
        card.id = `person-${person.id}`;
        if (window.HistoriaVisualSystem) window.HistoriaVisualSystem.addArtwork(card, "person", person.name);
        card.append(textElement("p", "card-kicker", person.role));
        card.append(textElement("h3", "card-title", person.name));
        card.append(textElement("p", "encyclopedia-label", "النشأة"));
        card.append(textElement("p", "card-description", person.origin));
        card.append(textElement("p", "encyclopedia-label", "التعريف الموسوعي"));
        card.append(textElement("p", "card-description", person.biography));
        card.append(textElement("p", "encyclopedia-label", "الإنجازات"));
        card.append(textElement("p", "card-description", person.achievements));
        card.append(textElement("p", "encyclopedia-label", "التأثير التاريخي"));
        card.append(textElement("p", "card-description", person.historicalImpact));
        if (person.relations.length) {
            const relations = textElement("div", "umayyad-relations", "الروابط السياسية: ");
            person.relations.forEach((relation, index) => {
                const related = umayyadData.people.find(item => item.id === relation.personId);
                if (!related) return;
                if (index) relations.append(document.createTextNode(" · "));
                addLink(relations, `${related.name} (${relation.label})`, `#person-${related.id}`);
            });
            card.append(relations);
        }
        const relatedEvents = document.createElement("details");
        relatedEvents.className = "umayyad-relations";
        relatedEvents.append(textElement("summary", "", `الأحداث المرتبطة (${person.eventIds.length})`));
        const relatedEventLinks = document.createElement("div");
        person.eventIds.forEach((eventId, index) => {
            const event = eventById.get(eventId);
            if (!event) return;
            if (index) relatedEventLinks.append(document.createTextNode(" · "));
            addLink(relatedEventLinks, event.title, `#event-${event.id}`);
        });
        relatedEvents.append(relatedEventLinks);
        card.append(relatedEvents);
        addReferenceLinks(card, person);
        addSourceLink(card, person);
        peopleGrid.append(card);
    });
    if (!people.length) peopleGrid.append(textElement("p", "empty-state", "لا توجد شخصيات تطابق البحث."));
}

function renderEvents(query) {
    const peopleById = new Map(umayyadData.people.map(person => [person.id, person]));
    const citiesById = new Map(umayyadData.cities.map(city => [city.id, city]));
    const battlesById = new Map(umayyadData.battles.map(battle => [battle.id, battle]));
    const events = umayyadData.events.filter(event => {
        const names = event.personIds.map(id => peopleById.get(id)?.name || "").join(" ");
        const cityNames = event.cityIds.map(id => citiesById.get(id)?.name || "").join(" ");
        return `${event.title} ${event.year} ${event.description} ${event.background} ${event.causes} ${event.outcomes} ${names} ${cityNames}`.toLocaleLowerCase("ar").includes(query);
    });
    eventsGrid.replaceChildren();
    events.forEach(event => {
        const card = document.createElement("article");
        card.className = "data-card";
        card.id = `event-${event.id}`;
        const dateLabel = event.datePrecision === "تقريبية" ? `${event.year}م تقريبًا` : `${event.year}م`;
        card.append(textElement("p", "card-kicker", `${dateLabel} · ${event.state}`));
        card.append(textElement("h3", "card-title", event.title));
        card.append(textElement("p", "card-description", event.description));
        card.append(textElement("p", "encyclopedia-label", "الخلفية"));
        card.append(textElement("p", "card-description event-context", event.background));
        card.append(textElement("p", "encyclopedia-label", "الأسباب"));
        card.append(textElement("p", "card-description event-context", event.causes));
        card.append(textElement("p", "encyclopedia-label", "النتائج"));
        card.append(textElement("p", "card-description event-context", event.outcomes));
        addRelations(card, "المدن والأقاليم المرتبطة", citiesById, event.cityIds, "city-", "umayyad-relations");
        addRelations(card, "الشخصيات", peopleById, event.personIds, "person-", "umayyad-relations");
        if (event.battleId) {
            const battle = battlesById.get(event.battleId);
            if (battle) {
                card.append(textElement("p", "encyclopedia-label", "موضع المعركة"));
                card.append(textElement("p", "card-description event-context", battle.locationDescription));
                addLink(card, `تفاصيل المعركة: ${battle.name}`, `#battle-${battle.id}`, "umayyad-battle-link");
            }
        }
        addReferenceLinks(card, event);
        addSourceLink(card, event);
        eventsGrid.append(card);
    });
    if (!events.length) eventsGrid.append(textElement("p", "empty-state", "لا توجد أحداث تطابق البحث."));
}

function createCityPopup(city) {
    const popup = textElement("div", "map-popup", "");
    popup.dir = "rtl";
    popup.append(textElement("h2", "map-popup-title", city.name));
    popup.append(textElement("p", "map-popup-region", city.region));
    popup.append(textElement("p", "map-popup-history", city.description));
    const related = textElement("div", "umayyad-map-events", "أحداث مرتبطة:");
    city.eventIds.slice(0, 5).forEach(eventId => {
        const event = umayyadData.events.find(item => item.id === eventId);
        if (event) addLink(related, `${event.year}م · ${event.title}`, `#event-${event.id}`);
    });
    popup.append(related);
    return popup;
}

function createBattlePopup(battle) {
    const popup = textElement("div", "map-popup", "");
    popup.dir = "rtl";
    popup.append(textElement("h2", "map-popup-title", battle.name));
    popup.append(textElement("p", "map-popup-region", `${battle.year}م · موضع تقريبي`));
    popup.append(textElement("p", "map-popup-history", battle.locationDescription));
    popup.append(textElement("p", "map-popup-history", battle.description));
    popup.append(textElement("p", "map-popup-history", battle.background));
    addLink(popup, "فتح سجل الحدث", `#event-${battle.eventId}`);
    return popup;
}

function renderCities(query, map) {
    const cities = umayyadData.cities.filter(city =>
        `${city.name} ${city.region} ${city.description}`.toLocaleLowerCase("ar").includes(query)
    );
    citiesList.replaceChildren();
    cities.forEach(city => {
        const button = document.createElement("button");
        button.className = "map-place-button";
        button.id = `city-${city.id}`;
        button.type = "button";
        button.setAttribute("aria-label", `اعرض ${city.name} على الخريطة`);
        if (window.HistoriaVisualSystem) {
            button.append(window.HistoriaVisualSystem.createArtwork("city", city.name));
        }
        button.append(textElement("span", "map-place-name", city.name));
        button.append(textElement("span", "map-place-region", `${city.region} · ${city.eventIds.length} حدث`));
        button.addEventListener("click", () => {
            if (map) {
                map.flyTo(city.coordinates, 6, { duration: 0.6 });
                cityMarkers.get(city.id).openPopup();
            }
        });
        citiesList.append(button);
    });
    if (!cities.length) citiesList.append(textElement("p", "empty-state", "لا توجد مدن تطابق البحث."));
}

function renderBattles(query) {
    const peopleById = new Map(umayyadData.people.map(person => [person.id, person]));
    const citiesById = new Map(umayyadData.cities.map(city => [city.id, city]));
    const battles = umayyadData.battles.filter(battle => {
        const names = battle.personIds.map(id => peopleById.get(id)?.name || "").join(" ");
        return `${battle.name} ${battle.year} ${names}`.toLocaleLowerCase("ar").includes(query);
    });
    battlesGrid.replaceChildren();
    battles.forEach(battle => {
        const card = document.createElement("article");
        card.className = "data-card";
        card.id = `battle-${battle.id}`;
        if (window.HistoriaVisualSystem) window.HistoriaVisualSystem.addArtwork(card, "battle", battle.name);
        card.append(textElement("p", "card-kicker", `${battle.year}م · معركة`));
        card.append(textElement("h3", "card-title", battle.name));
        card.append(textElement("p", "card-description", battle.description));
        card.append(textElement("p", "encyclopedia-label", "الخلفية"));
        card.append(textElement("p", "card-description event-context", battle.background));
        card.append(textElement("p", "encyclopedia-label", "الموضع التقريبي"));
        card.append(textElement("p", "card-description event-context", battle.locationDescription));
        addRelations(card, "المدينة أو الإقليم المرجعي", citiesById, [battle.cityId], "city-", "umayyad-relations");
        addRelations(card, "الشخصيات", peopleById, battle.personIds, "person-", "umayyad-relations");
        addLink(card, "عرض الحدث في التسلسل", `#event-${battle.eventId}`, "umayyad-battle-link");
        addReferenceLinks(card, battle);
        addSourceLink(card, battle);
        battlesGrid.append(card);
    });
    if (!battles.length) battlesGrid.append(textElement("p", "empty-state", "لا توجد معارك تطابق البحث."));
}

function initializeMap() {
    if (typeof L === "undefined") {
        status.textContent = "تعذّر تحميل مكتبة الخريطة. يمكن استعراض المدن والأحداث في القائمة.";
        status.classList.add("map-status-error");
        return null;
    }

    const map = L.map(mapElement, { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>'
    }).addTo(map);

    const bounds = [];
    umayyadData.cities.forEach(city => {
        const marker = L.marker(city.coordinates, { title: city.name, alt: city.name })
            .addTo(map)
            .bindPopup(createCityPopup(city), { minWidth: 220, maxWidth: 300 });
        cityMarkers.set(city.id, marker);
        bounds.push(city.coordinates);
    });
    umayyadData.battles.forEach(battle => {
        const marker = L.marker(battle.coordinates, {
            title: battle.name,
            alt: battle.name,
            icon: L.divIcon({
                className: "history-marker-shell umayyad-battle-marker",
                html: '<span class="history-marker"></span>',
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            })
        }).addTo(map);
        marker.bindPopup(createBattlePopup(battle), { minWidth: 220, maxWidth: 300 });
        bounds.push(battle.coordinates);
    });
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 4 });
    map.on("tileerror", () => {
        status.textContent = "تعذّر تحميل بعض بلاطات الخريطة. تحقق من اتصال الإنترنت.";
        status.classList.add("map-status-error");
    });
    map.on("tileload", () => {
        status.textContent = "تظهر المدن العشرون، وعلامات المعارك العشر؛ اختر علامة أو مدينة لعرض أحداثها.";
        status.classList.remove("map-status-error");
    });
    return map;
}

function renderSearchResults() {
    if (!umayyadData) return;
    const query = searchInput.value.trim().toLocaleLowerCase("ar");
    const map = window.umayyadMap;
    renderPeople(query);
    renderEvents(query);
    renderCities(query, map);
    renderBattles(query);
}

async function loadUmayyadData() {
    try {
        const response = await fetch(dataPath);
        if (!response.ok) throw new Error(`تعذّر تحميل ${dataPath} (HTTP ${response.status})`);
        umayyadData = await response.json();
        if (umayyadData.people.length !== 50
            || umayyadData.events.length !== 100
            || umayyadData.cities.length !== 20
            || umayyadData.battles.length !== 10
            || !Array.isArray(umayyadData.caliphs)
            || umayyadData.caliphs.length !== 14
            || !Array.isArray(umayyadData.references)
            || !umayyadData.references.length) {
            throw new Error("بيانات الموسوعة الأموية لا تطابق الأعداد المطلوبة.");
        }
        window.umayyadMap = initializeMap();
        renderCaliphs();
        renderFeaturedPeople();
        renderReferences();
        document.querySelectorAll("[data-umayyad-count]").forEach(element => {
            element.textContent = String(umayyadData[element.dataset.umayyadCount].length);
        });
        renderSearchResults();
        if (window.umayyadMap) status.textContent = "اكتمل تحميل بيانات الموسوعة وروابطها.";
    } catch (error) {
        console.error("تعذّر تهيئة الموسوعة الأموية:", error);
        status.textContent = `تعذّر تحميل بيانات الموسوعة: ${error.message}`;
        status.classList.add("map-status-error");
    }
}

searchInput.addEventListener("input", renderSearchResults);
loadUmayyadData();
