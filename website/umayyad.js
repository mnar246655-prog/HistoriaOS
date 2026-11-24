const dataPath = "../umayyad/data.json";
const searchInput = document.querySelector("#umayyad-search");
const status = document.querySelector("#umayyad-status");
const peopleGrid = document.querySelector("#umayyad-people");
const eventsGrid = document.querySelector("#umayyad-events");
const battlesGrid = document.querySelector("#umayyad-battles");
const citiesList = document.querySelector("#umayyad-cities");
const mapElement = document.querySelector("#umayyad-map");
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
    link.textContent = `المصدر: ${item.sourceName} · ${item.sourceTitle} (${item.sourceLicense})`;
    container.append(link);
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

function renderPeople(query) {
    const eventById = new Map(umayyadData.events.map(event => [event.id, event]));
    const people = umayyadData.people.filter(person => {
        const haystack = `${person.name} ${person.role} ${person.description}`.toLocaleLowerCase("ar");
        return haystack.includes(query);
    });
    peopleGrid.replaceChildren();
    people.forEach(person => {
        const card = document.createElement("article");
        card.className = "data-card";
        card.id = `person-${person.id}`;
        card.append(textElement("p", "card-kicker", person.role));
        card.append(textElement("h3", "card-title", person.name));
        card.append(textElement("p", "card-description", person.description));
        const relatedEvents = document.createElement("div");
        relatedEvents.className = "umayyad-relations";
        relatedEvents.append(document.createTextNode("الأحداث المرتبطة: "));
        person.eventIds.slice(0, 5).forEach((eventId, index) => {
            const event = eventById.get(eventId);
            if (!event) return;
            if (index) relatedEvents.append(document.createTextNode(" · "));
            addLink(relatedEvents, event.title, `#event-${event.id}`);
        });
        card.append(relatedEvents);
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
        return `${event.title} ${event.year} ${event.description} ${names} ${cityNames}`.toLocaleLowerCase("ar").includes(query);
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
        addRelations(card, "المكان", citiesById, event.cityIds, "city-", "umayyad-relations");
        addRelations(card, "الشخصيات", peopleById, event.personIds, "person-", "umayyad-relations");
        if (event.battleId) {
            const battle = battlesById.get(event.battleId);
            if (battle) addLink(card, `تفاصيل المعركة: ${battle.name}`, `#battle-${battle.id}`, "umayyad-battle-link");
        }
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
    popup.append(textElement("p", "map-popup-region", `${battle.year}م · موقع تقريبي`));
    popup.append(textElement("p", "map-popup-history", battle.description));
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
        card.append(textElement("p", "card-kicker", `${battle.year}م · معركة`));
        card.append(textElement("h3", "card-title", battle.name));
        card.append(textElement("p", "card-description", battle.description));
        addRelations(card, "المدينة المرتبطة", citiesById, [battle.cityId], "city-", "umayyad-relations");
        addRelations(card, "الشخصيات", peopleById, battle.personIds, "person-", "umayyad-relations");
        addLink(card, "عرض الحدث في التسلسل", `#event-${battle.eventId}`, "umayyad-battle-link");
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
            || umayyadData.battles.length !== 10) {
            throw new Error("بيانات الموسوعة الأموية لا تطابق الأعداد المطلوبة.");
        }
        window.umayyadMap = initializeMap();
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
