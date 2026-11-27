const atlasDataPaths = {
    umayyad: "../umayyad/data.json",
    rashidun: "../rashidun/data.json"
};
const atlasMapElement = document.querySelector("#historical-atlas-map");
const atlasStatus = document.querySelector("#atlas-status");
const layerInputs = Array.from(document.querySelectorAll("#atlas-layers input"));
const yearSlider = document.querySelector("#atlas-year");
const yearLabel = document.querySelector("#atlas-year-label");
const timeCount = document.querySelector("#atlas-time-count");
const eventList = document.querySelector("#atlas-event-list");
const resultCount = document.querySelector("#atlas-result-count");
const battleDetail = document.querySelector("#atlas-battle-detail");
const experienceSelect = document.querySelector("#atlas-experience-select");
const experienceStart = document.querySelector("#atlas-experience-start");
const experienceToggle = document.querySelector("#atlas-experience-toggle");
const experiencePrevious = document.querySelector("#atlas-experience-previous");
const experienceNext = document.querySelector("#atlas-experience-next");
const movementDemo = document.querySelector("#atlas-motion-demo");
const experienceTimeline = document.querySelector("#atlas-experience-timeline");
const experienceOutput = document.querySelector("#atlas-experience-output");
const guideForm = document.querySelector("#atlas-guide-form");
const guideQuestion = document.querySelector("#atlas-guide-question");
const guideAnswer = document.querySelector("#atlas-guide-answer");
const mapLayers = new Map();
const cityMarkers = new Map();
const movementMarkers = new Map();
let atlasMap;
let atlasData;
let selectedEventMarker;
let selectedBattle;
let experienceIndex = -1;
let experienceTimer;

const stateCenters = [
    { id: "rashidun-center", name: "الخلافة الراشدة · المدينة", coordinates: [24.4672, 39.6111], from: 632, to: 661 },
    { id: "umayyad-center", name: "الدولة الأموية · دمشق", coordinates: [33.5138, 36.2765], from: 661, to: 750 }
];
const schematicTradeRoutes = [
    {
        id: "hijaz-levant",
        name: "محور الحجاز وبلاد الشام",
        coordinates: [[24.4672, 39.6111], [28.3838, 36.5662], [33.5138, 36.2765]],
        note: "خط تعليمي تخطيطي يوضح اتصال مراكز؛ لا يعيد بناء طريق تاريخي محدد."
    },
    {
        id: "iraq-khorasan",
        name: "محور العراق وخراسان وما وراء النهر",
        coordinates: [[32.03, 44.4], [36.2, 46.3], [36.55, 59.6], [39.65, 66.96]],
        note: "خط تعليمي تخطيطي؛ تختلف الطرق والمراكز باختلاف العصر والمرحلة."
    }
];
const movementDemoRoute = {
    coordinates: [[18, 28], [22, 33], [27, 38], [31, 44]],
    note: "مسار تجريبي لا يمثل حملة تاريخية أو حركة جيش بعينها."
};

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

function normalizeText(value) {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u064B-\u065F\u0670]/g, "")
        .replace(/[أإآ]/g, "ا")
        .replace(/ى/g, "ي")
        .toLocaleLowerCase("ar")
        .trim();
}

function getReferenceUrl(record, collection) {
    const referenceId = record.referenceIds && record.referenceIds[0];
    if (!referenceId) return null;
    return collection === "umayyad"
        ? `umayyad.html#reference-${referenceId}`
        : `rashidun.html#rash-reference-${referenceId}`;
}

function getEventUrl(collection, id) {
    return collection === "umayyad"
        ? `umayyad.html#event-${id}`
        : `rashidun.html#${id}`;
}

function getPersonName(id, collection) {
    const people = collection === "umayyad" ? atlasData.umayyad.people : atlasData.rashidun.caliphs;
    return people.find(person => person.id === id)?.name || null;
}

function createBattleRecord(collection, record, event) {
    const peopleIds = record.personIds || event.personIds || [];
    const movementRoute = record.movementRoute || event.movementRoute || null;
    const armyPositions = record.armyPositions || event.armyPositions || null;
    const militaryDecisions = record.militaryDecisions || event.militaryDecisions || null;
    const commanders = record.commanders || event.commanders || null;
    const politicalContext = [record.background || event.background, record.causes || event.causes]
        .filter(Boolean)
        .join(" ");
    const positionNote = typeof armyPositions === "string" ? armyPositions
        : armyPositions?.note || armyPositions?.summary
            || `يعرض السجل موضعًا مرجعيًا للمعركة${record.locationDescription ? ` (${record.locationDescription})` : ""}، ولا يحرر مواقع مستقلة لتمركز الجيشين.`;
    const movementNote = movementRoute?.note
        || "لا يتضمن هذا الإصدار مسار تحرك موثقًا للجيشين؛ لا تُستنتج المسارات من قرب المدن أو من خط المعركة.";
    const decisionNote = typeof militaryDecisions === "string" ? militaryDecisions
        : militaryDecisions?.note || militaryDecisions?.summary
            || "لم يُحرر قرار تكتيكي محدد بإحالة يمكن عرضها في هذا السجل.";
    return {
        id: record.id,
        title: record.name || event.title,
        year: Number(record.year || event.year),
        dateLabel: event.dateLabel || `${Number(record.year || event.year).toLocaleString("ar")}م`,
        coordinates: record.coordinates || atlasData.rashidun.places.find(place => place.id === event.placeIds[0])?.coordinates,
        location: record.locationDescription || (event.placeIds || [])
            .map(id => atlasData.rashidun.places.find(place => place.id === id)?.name)
            .filter(Boolean)
            .join("، "),
        summary: record.description || event.summary || "",
        background: record.background || event.background || "",
        causes: record.causes || event.causes || "",
        outcome: event.outcomes || record.description || "",
        commanders,
        peopleIds,
        peopleNames: peopleIds.map(id => getPersonName(id, collection)).filter(Boolean),
        referenceIds: record.referenceIds || event.referenceIds || [],
        referenceUrl: getReferenceUrl(record, collection),
        armyStrength: record.armyStrength || {
            value: null,
            status: "not-curated",
            note: "لم يُحرر في هذه النسخة رقم مستقل موصول بمصدر وموضع محددين؛ لا تُعرض تقديرات غير محققة كحقائق."
        },
        collection,
        movementRoute,
        armyPositions,
        militaryDecisions,
        eventId: event.id,
        stages: [
            {
                title: "الوضع السياسي قبل المعركة",
                text: politicalContext || "لا يتوفر وصف سياقي في السجل الحالي.",
                result: "يقدم السجل سياق التنافس السابق للمواجهة، ولا يحرر نتيجة عسكرية مستقلة لهذه المرحلة."
            },
            {
                title: "مواقع الجيوش",
                text: positionNote,
                result: "لا يمكن تقدير أثر تمركز بعينه من دون تحديد مواقع الجيشين بإحالات موثقة."
            },
            {
                title: "تحركات الجيوش",
                text: movementNote,
                result: movementRoute?.note
                    ? "يقتصر العرض الجغرافي على المسار المسند المرفق بالسجل."
                    : "لا تُنسب نتيجة لتحرك غير موثق، ولا يُرسم مسار تخميني."
            },
            {
                title: "تسلسل المواجهة",
                text: record.description || event.summary || "لا يتوفر ملخص تفصيلي في السجل الحالي.",
                result: "يعرض السجل ملخصًا عامًا؛ ولا يفصل نتائج المواجهة إلى حلقات تكتيكية في هذه النسخة."
            },
            {
                title: "القرارات العسكرية",
                text: decisionNote,
                result: "لا تُنسب نتائج إلى قرار تكتيكي غير محدد أو غير محال إلى مصدر."
            },
            {
                title: "النتائج",
                text: event.outcomes || record.description || "لم يُحرر ملخص للنتائج في هذا السجل.",
                result: event.outcomes || record.description || "لم تُحرر نتيجة تفصيلية لهذا السجل."
            }
        ]
    };
}

function buildAtlasData(umayyad, rashidun) {
    const battles = [];
    const umayyadEvents = new Map(umayyad.events.map(event => [event.id, event]));
    const rashidunEvents = new Map(rashidun.events.map(event => [event.id, event]));

    umayyad.battles.forEach(battle => {
        const event = umayyadEvents.get(battle.eventId);
        if (event) battles.push(createBattleRecord("umayyad", battle, event));
    });
    rashidun.events
        .filter(event => /معركة|وقعة/.test(event.title))
        .forEach(event => {
            const place = rashidun.places.find(item => item.id === event.placeIds[0]);
            if (place) battles.push(createBattleRecord("rashidun", event, event));
        });

    const conquestEvents = [
        ...umayyad.events
            .filter(event => /فتح|حملة|عبور/.test(`${event.title} ${event.description}`))
            .map(event => {
                const city = umayyad.cities.find(item => item.id === event.cityIds[0]);
                return city ? {
                    id: event.id,
                    title: event.title,
                    year: event.year,
                    coordinates: city.coordinates,
                    location: city.name,
                    summary: event.description,
                    referenceIds: event.referenceIds,
                    collection: "umayyad"
                } : null;
            }),
        ...rashidun.events
            .filter(event => /فتح|حملة|غزو/.test(`${event.title} ${event.category}`))
            .flatMap(event => event.placeIds.map(id => {
                const place = rashidun.places.find(item => item.id === id);
                return place ? {
                    id: `${event.id}-${place.id}`,
                    title: event.title,
                    year: event.year,
                    coordinates: place.coordinates,
                    location: place.name,
                    summary: event.summary,
                    referenceIds: event.referenceIds,
                    collection: "rashidun"
                } : null;
            }))
    ].filter(Boolean);

    const cities = [
        ...umayyad.cities.map(city => ({
            id: city.id,
            name: city.name,
            region: city.region,
            coordinates: city.coordinates,
            description: city.description,
            eventIds: city.eventIds,
            collection: "umayyad"
        })),
        ...rashidun.places.map(place => ({
            id: place.id,
            name: place.name,
            region: place.region,
            coordinates: place.coordinates,
            description: place.locationNote,
            eventIds: place.eventIds,
            collection: "rashidun"
        }))
    ];

    const events = [
        ...umayyad.events.map(event => ({
            id: event.id,
            title: event.title,
            year: event.year,
            summary: event.description,
            background: event.background,
            causes: event.causes,
            outcomes: event.outcomes,
            coordinates: umayyad.cities.find(city => city.id === event.cityIds[0])?.coordinates,
            collection: "umayyad",
            referenceIds: event.referenceIds
        })),
        ...rashidun.events.map(event => {
            const place = rashidun.places.find(item => item.id === event.placeIds[0]);
            return {
                id: event.id,
                title: event.title,
                year: event.year,
                summary: event.summary,
                background: event.background,
                causes: event.causes,
                outcomes: event.outcomes,
                coordinates: place?.coordinates,
                collection: "rashidun",
                referenceIds: event.referenceIds
            };
        })
    ];

    return { battles, cities, events, conquestEvents, stateCenters, schematicTradeRoutes };
}

function makeMarker(coordinates, label, className) {
    return L.circleMarker(coordinates, {
        radius: className === "battle-map-marker" ? 7 : 5,
        color: className === "battle-map-marker" ? "#a64e3c"
            : className === "conquest-map-marker" ? "#b48339"
                : className === "state-map-marker" ? "#315c85" : "#245c4b",
        weight: 2,
        fillColor: className === "battle-map-marker" ? "#d87960"
            : className === "conquest-map-marker" ? "#d3a95f"
                : className === "state-map-marker" ? "#7ba2c6" : "#6eaa89",
        fillOpacity: 0.9,
        title: label
    });
}

function createCityPopup(city) {
    const popup = textElement("div", "map-popup", "");
    popup.dir = "rtl";
    popup.append(textElement("h2", "map-popup-title", city.name));
    popup.append(textElement("p", "map-popup-region", city.region));
    popup.append(textElement("p", "map-popup-history", city.description || "موضع مرتبط بسجلات تاريخية في الموسوعة."));
    return popup;
}

function createEventPopup(event) {
    const popup = textElement("div", "map-popup", "");
    popup.dir = "rtl";
    popup.append(textElement("h2", "map-popup-title", event.title));
    popup.append(textElement("p", "map-popup-region", `${Number(event.year).toLocaleString("ar")}م · حدث مرتبط بالموقع`));
    popup.append(textElement("p", "map-popup-history", event.summary || ""));
    addLink(popup, "قراءة سجل الحدث", getEventUrl(event.collection, event.id));
    return popup;
}

function createBattlePopup(battle) {
    const popup = textElement("div", "map-popup", "");
    popup.dir = "rtl";
    popup.append(textElement("h2", "map-popup-title", battle.title));
    popup.append(textElement("p", "map-popup-region", `${battle.year.toLocaleString("ar")}م · موضع تقريبي`));
    popup.append(textElement("p", "map-popup-history", battle.location || "الموقع التقريبي"));
    popup.append(textElement("p", "map-popup-history", battle.summary));
    const button = document.createElement("button");
    button.type = "button";
    button.className = "atlas-popup-button";
    button.textContent = "عرض بطاقة المعركة";
    button.addEventListener("click", () => selectBattle(battle));
    popup.append(button);
    return popup;
}

function createMovementIcon() {
    return L.divIcon({
        className: "army-motion-icon",
        html: '<span class="army-motion-dot" aria-hidden="true"></span>',
        iconSize: [18, 18],
        iconAnchor: [9, 9]
    });
}

function stopMovement() {
    movementMarkers.forEach(marker => marker.stop?.());
    movementMarkers.clear();
    movementDemo.textContent = "جرّب حركة توضيحية";
}

function animateRoute(route, map) {
    if (!route || !Array.isArray(route.coordinates) || route.coordinates.length < 2) return null;
    const marker = L.marker(route.coordinates[0], { icon: createMovementIcon(), keyboard: false }).addTo(map);
    const polyline = L.polyline(route.coordinates, { color: "#a64e3c", weight: 4, dashArray: "7 8", opacity: 0.85 })
        .addTo(map);
    let segment = 0;
    let progress = 0;
    let frameId;
    const animate = () => {
        if (segment >= route.coordinates.length - 1) {
            segment = 0;
            progress = 0;
        }
        progress = Math.min(1, progress + 0.008);
        const [startLat, startLng] = route.coordinates[segment];
        const [endLat, endLng] = route.coordinates[segment + 1];
        marker.setLatLng([
            startLat + (endLat - startLat) * progress,
            startLng + (endLng - startLng) * progress
        ]);
        if (progress === 1) {
            segment += 1;
            progress = 0;
        }
        frameId = window.requestAnimationFrame(animate);
    };
    animate();
    return {
        marker,
        stop() {
            window.cancelAnimationFrame(frameId);
            map.removeLayer(marker);
            map.removeLayer(polyline);
        }
    };
}

function initializeMap() {
    if (typeof L === "undefined") {
        atlasStatus.textContent = "تعذّر تحميل Leaflet؛ تحقق من الاتصال. تبقى قائمة الأحداث والطبقات النصية متاحة.";
        atlasStatus.classList.add("map-status-error");
        return false;
    }

    atlasMap = L.map(atlasMapElement, { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>'
    }).addTo(atlasMap);
    ["cities", "battles", "states", "conquests", "tradeRoutes", "armyMovements"]
        .forEach(name => mapLayers.set(name, L.layerGroup()));

    const allBounds = [];
    atlasData.cities.forEach(city => {
        if (!city.coordinates) return;
        const marker = makeMarker(city.coordinates, city.name, "city-map-marker")
            .bindPopup(createCityPopup(city));
        marker.addTo(mapLayers.get("cities"));
        allBounds.push(city.coordinates);
    });

    atlasData.battles.forEach(battle => {
        if (!battle.coordinates) return;
        const marker = makeMarker(battle.coordinates, battle.title, "battle-map-marker");
        marker.bindPopup(createBattlePopup(battle));
        marker.on("click", () => selectBattle(battle));
        battle.marker = marker;
        allBounds.push(battle.coordinates);
        if (battle.movementRoute) {
            const route = L.polyline(battle.movementRoute.coordinates, {
                color: "#a64e3c",
                weight: 3,
                dashArray: "6 7"
            }).bindPopup(textElement("div", "map-popup-history", battle.movementRoute.note));
            battle.routeLayer = route;
        }
    });

    atlasData.conquestEvents.forEach(event => {
        if (!event.coordinates) return;
        const marker = makeMarker(event.coordinates, event.title, "conquest-map-marker")
            .bindPopup(createEventPopup(event));
        event.marker = marker;
        allBounds.push(event.coordinates);
    });

    atlasData.stateCenters.forEach(center => {
        const marker = makeMarker(center.coordinates, center.name, "state-map-marker")
            .bindPopup(textElement("div", "map-popup-history", `${center.name}. هذه علامة لمركز الحكم، وليست حدًا للدولة.`));
        center.marker = marker;
    });

    atlasData.schematicTradeRoutes.forEach(route => {
        route.layer = L.polyline(route.coordinates, {
            color: "#997942",
            weight: 3,
            dashArray: "4 7",
            opacity: 0.8
        }).bindPopup(textElement("div", "map-popup-history", `${route.name}: ${route.note}`));
    });

    if (allBounds.length) atlasMap.fitBounds(allBounds, { padding: [28, 28], maxZoom: 4 });
    atlasMap.on("tileerror", () => {
        atlasStatus.textContent = "تعذّر تحميل بعض بلاطات الخريطة. تحقق من اتصال الإنترنت.";
        atlasStatus.classList.add("map-status-error");
    });
    atlasMap.on("tileload", () => atlasStatus.classList.remove("map-status-error"));
    layerInputs.forEach(input => input.addEventListener("change", renderLayers));
    return true;
}

function getSelectedYear() {
    return Number(yearSlider.value);
}

function renderLayers() {
    if (!atlasMap || !atlasData) return;
    stopMovement();
    if (selectedEventMarker) atlasMap.removeLayer(selectedEventMarker);
    selectedEventMarker = undefined;
    const year = getSelectedYear();
    const enabled = new Set(layerInputs.filter(input => input.checked).map(input => input.value));
    mapLayers.forEach((layer, name) => {
        layer.clearLayers();
        if (enabled.has(name)) layer.addTo(atlasMap);
        else atlasMap.removeLayer(layer);
    });

    if (enabled.has("cities")) {
        atlasData.cities.forEach(city => {
            if (!city.coordinates) return;
            const marker = makeMarker(city.coordinates, city.name, "city-map-marker")
                .bindPopup(createCityPopup(city))
                .addTo(mapLayers.get("cities"));
            cityMarkers.set(city.id, marker);
        });
    }
    if (enabled.has("battles")) {
        atlasData.battles.forEach(battle => {
            if (battle.year > year || !battle.coordinates) return;
            battle.marker.addTo(mapLayers.get("battles"));
        });
    }
    if (enabled.has("states")) {
        atlasData.stateCenters
            .filter(center => year >= center.from && year <= center.to)
            .forEach(center => center.marker.addTo(mapLayers.get("states")));
    }
    if (enabled.has("conquests")) {
        atlasData.conquestEvents
            .filter(event => Number(event.year) <= year)
            .forEach(event => event.marker.addTo(mapLayers.get("conquests")));
    }
    if (enabled.has("tradeRoutes")) {
        atlasData.schematicTradeRoutes.forEach(route => route.layer.addTo(mapLayers.get("tradeRoutes")));
    }
    if (enabled.has("armyMovements")) {
        const visibleRoutes = atlasData.battles.filter(battle => battle.year <= year && battle.movementRoute);
        visibleRoutes.forEach(battle => {
            battle.routeLayer.addTo(mapLayers.get("armyMovements"));
            const movement = animateRoute(battle.movementRoute, atlasMap);
            if (movement) movementMarkers.set(battle.id, movement);
        });
    }

    const pastBattles = atlasData.battles.filter(battle => battle.year <= year).length;
    const pastEvents = atlasData.events.filter(event => Number(event.year) <= year).length;
    yearLabel.textContent = `${year.toLocaleString("ar")}م`;
    timeCount.textContent = `حتى هذا العام: ${pastEvents.toLocaleString("ar")} حدثًا و${pastBattles.toLocaleString("ar")} معركة ضمن النطاق الراشدي والأموي.`;
    renderEventList(year);
}

function renderEventList(year) {
    const visibleEvents = atlasData.events.filter(event => Number(event.year) <= year && event.coordinates);
    eventList.replaceChildren();
    yearLabel.textContent = `${year.toLocaleString("ar")}م`;
    resultCount.textContent = `${visibleEvents.length.toLocaleString("ar")} سجلًا`;
    if (!visibleEvents.length) {
        eventList.append(textElement("p", "empty-state", "لا توجد أحداث جغرافية في النطاق الزمني المحدد."));
        return;
    }
    visibleEvents.slice(-60).reverse().forEach(event => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "atlas-event-button";
        button.append(textElement("span", "atlas-event-year", `${Number(event.year).toLocaleString("ar")}م`));
        button.append(textElement("strong", "atlas-event-title", event.title));
        button.addEventListener("click", () => {
            const battle = atlasData.battles.find(item => item.eventId === event.id || item.id === event.id);
            if (battle) {
                selectBattle(battle);
                if (atlasMap) {
                    atlasMap.flyTo(battle.coordinates, 6, { duration: 0.65 });
                    battle.marker.openPopup();
                }
                return;
            }
            if (!atlasMap) return;
            atlasMap.flyTo(event.coordinates, 6, { duration: 0.65 });
            selectedEventMarker = makeMarker(event.coordinates, event.title, "conquest-map-marker")
                .bindPopup(createEventPopup(event))
                .addTo(atlasMap)
                .openPopup();
        });
        eventList.append(button);
    });
}

function renderBattleDetail(battle) {
    battleDetail.replaceChildren();
    battleDetail.append(textElement("p", "card-kicker", `${battle.year.toLocaleString("ar")}م · موضع تقريبي`));
    battleDetail.append(textElement("h3", "card-title", battle.title));
    battleDetail.append(textElement("p", "card-description", battle.summary));
    const fields = [
        ["الموقع", battle.location || "غير محدد على نحو موثوق في السجل."],
        ["السياق والأسباب", [battle.background, battle.causes].filter(Boolean).join(" ") || "لا يتوفر سياق محرر في السجل."],
        ["مواقع الجيوش", typeof battle.armyPositions === "string" ? battle.armyPositions
            : battle.armyPositions?.note || battle.armyPositions?.summary || "لا يحدد السجل مواضع مستقلة للجيشين."],
        ["أعداد الجيوش", battle.armyStrength.note],
        ["القادة", battle.commanders
            ? (Array.isArray(battle.commanders) ? battle.commanders.join("، ") : String(battle.commanders))
            : "لا تتضمن البيانات الحالية تعيينًا محررًا لقادة الميدان."],
        ["الشخصيات المرتبطة", battle.peopleNames.length
            ? battle.peopleNames.join("، ")
            : "لا توجد شخصيات مرتبطة في سجل البيانات الحالي."],
        ["مسار التحرك", battle.movementRoute?.note || "لا يتوفر مسار جيش موثق لهذا السجل بعد؛ لا يُستنتج المسار من قرب المدن."],
        ["القرارات العسكرية", typeof battle.militaryDecisions === "string" ? battle.militaryDecisions
            : battle.militaryDecisions?.note || battle.militaryDecisions?.summary || "لا تتوفر إحالة محررة لقرار تكتيكي محدد."],
        ["النتيجة", battle.outcome || "لم تُحرر نتيجة تفصيلية لهذا السجل."]
    ];
    fields.forEach(([label, value]) => {
        battleDetail.append(textElement("p", "encyclopedia-label", label));
        battleDetail.append(textElement("p", "card-description event-context", value));
    });
    const sources = textElement("div", "encyclopedia-citations", "المراجع: ");
    const referenceCollection = battle.collection === "umayyad" ? atlasData.umayyad.references : atlasData.rashidun.references;
    battle.referenceIds.forEach((id, index) => {
        const reference = referenceCollection.find(item => item.id === id);
        if (!reference) return;
        if (index) sources.append(document.createTextNode(" · "));
        const url = battle.collection === "umayyad"
            ? `umayyad.html#reference-${id}`
            : `rashidun.html#rash-reference-${id}`;
        addLink(sources, reference.shortTitle || id, url);
    });
    battleDetail.append(sources);
    if (battle.movementRoute && atlasMap) {
        const moveButton = document.createElement("button");
        moveButton.type = "button";
        moveButton.className = "timeline-control-button";
        moveButton.textContent = "حرّك علامة الجيش";
        moveButton.addEventListener("click", () => {
            const movementLayerToggle = layerInputs.find(input => input.value === "armyMovements");
            if (movementLayerToggle && !movementLayerToggle.checked) {
                movementLayerToggle.checked = true;
                renderLayers();
            }
            const movement = animateRoute(battle.movementRoute, atlasMap);
            if (movement) movementMarkers.set(battle.id, movement);
        });
        battleDetail.append(moveButton);
    }
}

function selectBattle(battle) {
    selectedBattle = battle;
    renderBattleDetail(battle);
    experienceSelect.value = battle.id;
}

function focusAtlasRecord(focus, label) {
    if (!atlasMap || !focus) return;
    if (focus.startsWith("coordinates:")) {
        const coordinates = focus.slice("coordinates:".length).split(",").map(Number);
        if (coordinates.length === 2 && coordinates.every(Number.isFinite)
            && Math.abs(coordinates[0]) <= 90 && Math.abs(coordinates[1]) <= 180) {
            atlasMap.flyTo(coordinates, 5, { duration: 0.65 });
            if (selectedEventMarker) atlasMap.removeLayer(selectedEventMarker);
            selectedEventMarker = makeMarker(coordinates, label || "موضع مرجعي", "state-map-marker")
                .bindPopup(textElement("p", "map-popup-history", label || "موضع مرجعي"))
                .addTo(atlasMap)
                .openPopup();
        }
        return;
    }

    const battle = atlasData.battles.find(item => item.id === focus || item.eventId === focus);
    if (battle) {
        const battleLayer = layerInputs.find(input => input.value === "battles");
        if (battleLayer) battleLayer.checked = true;
        if (battle.year <= Number(yearSlider.max) && battle.year >= Number(yearSlider.min)) {
            yearSlider.value = String(battle.year);
            renderLayers();
        }
        selectBattle(battle);
        experienceSelect.value = battle.id;
        atlasMap.flyTo(battle.coordinates, 6, { duration: 0.65 });
        if (battle.marker) battle.marker.openPopup();
        return;
    }

    const city = atlasData.cities.find(item => item.id === focus);
    if (city && city.coordinates) {
        const cityLayer = layerInputs.find(input => input.value === "cities");
        if (cityLayer) cityLayer.checked = true;
        renderLayers();
        atlasMap.flyTo(city.coordinates, 6, { duration: 0.65 });
        const marker = cityMarkers.get(city.id);
        if (marker) marker.openPopup();
        return;
    }

    const event = atlasData.events.find(item => item.id === focus);
    if (event && event.coordinates) {
        atlasMap.flyTo(event.coordinates, 6, { duration: 0.65 });
        selectedEventMarker = makeMarker(event.coordinates, event.title, "conquest-map-marker")
            .bindPopup(createEventPopup(event))
            .addTo(atlasMap)
            .openPopup();
    }
}

function renderExperienceStep() {
    const battle = atlasData.battles.find(item => item.id === experienceSelect.value);
    if (!battle || experienceIndex < 0 || experienceIndex >= battle.stages.length) return;
    const stage = battle.stages[experienceIndex];
    const previousExperienceRoute = movementMarkers.get("experience-route");
    if (previousExperienceRoute) {
        previousExperienceRoute.stop();
        movementMarkers.delete("experience-route");
    }
    experienceTimeline.replaceChildren();
    battle.stages.forEach((timelineStage, index) => {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "atlas-experience-stage";
        button.setAttribute("aria-current", index === experienceIndex ? "step" : "false");
        button.append(textElement("span", "atlas-experience-stage-number", (index + 1).toLocaleString("ar")));
        button.append(textElement("span", "atlas-experience-stage-title", timelineStage.title));
        button.addEventListener("click", () => {
            stopExperience();
            experienceIndex = index;
            renderExperienceStep();
        });
        item.append(button);
        experienceTimeline.append(item);
    });
    experienceOutput.replaceChildren();
    experienceOutput.append(textElement("p", "card-kicker", `${battle.dateLabel} · المشهد ${experienceIndex + 1} من ${battle.stages.length}`));
    experienceOutput.append(textElement("h3", "card-title", stage.title));
    experienceOutput.append(textElement("p", "card-description", stage.text));
    experienceOutput.append(textElement("p", "encyclopedia-label", "نتيجة هذه المرحلة"));
    experienceOutput.append(textElement("p", "card-description event-context", stage.result));
    experienceOutput.append(textElement(
        "p",
        "atlas-experience-map-note",
        battle.coordinates
            ? `على الخريطة: علامة الموضع المرجعي لـ${battle.title}. لا تعرض العلامة تمركز الجيشين أو اتجاه حركتهما.`
            : "لا تتوفر إحداثيات محررة لهذا السجل؛ لم يُخترع موضع بديل."
    ));
    experienceOutput.append(textElement("p", "atlas-caveat", "التتابع إطار تعليمي لترتيب المعرفة المتاحة، وليس توقيتًا يوميًا أو إعادة تمثيل حرفية للمعركة."));
    const sourceReferences = battle.referenceIds.map(id => {
        const referenceCollection = battle.collection === "umayyad" ? atlasData.umayyad.references : atlasData.rashidun.references;
        const reference = referenceCollection.find(item => item.id === id);
        return reference ? { id, title: reference.shortTitle || id } : null;
    }).filter(Boolean);
    if (sourceReferences.length) {
        const sources = textElement("div", "encyclopedia-citations atlas-experience-sources", "راجع إحالات السجل: ");
        sourceReferences.forEach((reference, index) => {
            if (index) sources.append(document.createTextNode(" · "));
            const url = battle.collection === "umayyad"
                ? `umayyad.html#reference-${reference.id}`
                : `rashidun.html#rash-reference-${reference.id}`;
            addLink(sources, reference.title, url);
        });
        experienceOutput.append(sources);
    }
    experiencePrevious.disabled = experienceIndex <= 0;
    experienceNext.disabled = experienceIndex >= battle.stages.length - 1;
    if (atlasMap && stage.title === "تحركات الجيوش" && battle.movementRoute) {
        const movement = animateRoute(battle.movementRoute, atlasMap);
        if (movement) movementMarkers.set("experience-route", movement);
    }
    if (atlasMap && battle.coordinates) atlasMap.flyTo(battle.coordinates, 6, { duration: 0.65 });
}

function stopExperience() {
    if (experienceTimer) window.clearInterval(experienceTimer);
    experienceTimer = undefined;
    experienceToggle.textContent = "تشغيل تلقائي";
    experienceToggle.disabled = experienceIndex < 0;
}

function startExperience() {
    const battle = atlasData.battles.find(item => item.id === experienceSelect.value);
    if (!battle) return;
    stopExperience();
    stopMovement();
    selectBattle(battle);
    if (battle.year <= Number(yearSlider.max)) {
        yearSlider.value = String(battle.year);
        renderLayers();
    }
    experienceIndex = 0;
    experiencePrevious.disabled = true;
    experienceNext.disabled = false;
    experienceToggle.disabled = false;
    experienceToggle.textContent = "تشغيل تلقائي";
    renderExperienceStep();
}

function initializeExperience() {
    experienceSelect.replaceChildren();
    atlasData.battles.slice().sort((first, second) => first.year - second.year).forEach(battle => {
        const option = document.createElement("option");
        option.value = battle.id;
        option.textContent = `${battle.year.toLocaleString("ar")}م · ${battle.title}`;
        experienceSelect.append(option);
    });
    const initialBattle = atlasData.battles.find(battle => battle.id === selectedBattle?.id) || atlasData.battles[0];
    if (initialBattle) experienceSelect.value = initialBattle.id;
    experienceStart.disabled = atlasData.battles.length === 0;
    movementDemo.disabled = !atlasMap;
    experienceStart.addEventListener("click", startExperience);
    movementDemo.addEventListener("click", () => {
        if (!atlasMap) return;
        if (movementMarkers.has("demo-route")) {
            stopMovement();
            experienceOutput.replaceChildren(textElement("p", "atlas-caveat", "أُوقفت المعاينة التقنية."));
            return;
        }
        stopMovement();
        const movement = animateRoute(movementDemoRoute, atlasMap);
        if (movement) movementMarkers.set("demo-route", movement);
        movementDemo.textContent = "أوقف الحركة التجريبية";
        experienceOutput.replaceChildren(
            textElement("p", "card-kicker", "معاينة تقنية"),
            textElement("p", "card-description", movementDemoRoute.note)
        );
    });
    experiencePrevious.addEventListener("click", () => {
        if (experienceIndex <= 0) return;
        experienceIndex -= 1;
        renderExperienceStep();
    });
    experienceNext.addEventListener("click", () => {
        const battle = atlasData.battles.find(item => item.id === experienceSelect.value);
        if (!battle || experienceIndex >= battle.stages.length - 1) return;
        experienceIndex += 1;
        renderExperienceStep();
    });
    experienceToggle.addEventListener("click", () => {
        if (experienceTimer) {
            stopExperience();
            return;
        }
        experienceToggle.textContent = "إيقاف";
        experienceTimer = window.setInterval(() => {
            const battle = atlasData.battles.find(item => item.id === experienceSelect.value);
            if (!battle || experienceIndex >= battle.stages.length - 1) {
                stopExperience();
                return;
            }
            experienceIndex += 1;
            renderExperienceStep();
        }, 5000);
    });
    experienceSelect.addEventListener("change", () => {
        stopExperience();
        experienceIndex = -1;
        experienceToggle.disabled = true;
        experiencePrevious.disabled = true;
        experienceNext.disabled = true;
        experienceTimeline.replaceChildren();
        experienceOutput.replaceChildren(textElement("p", "atlas-caveat", "اضغط «ابدأ سرد الحدث» لعرض مراحله."));
    });
}

function renderLocalGuide(results) {
    guideAnswer.replaceChildren();
    if (!results.length) {
        guideAnswer.append(textElement("p", "empty-state", "لم يُعثر على سجل مطابق؛ جرّب اسم معركة أو مدينة أو شخصية."));
        return;
    }
    guideAnswer.append(textElement("p", "card-detail", `عُثر على ${results.length.toLocaleString("ar")} سجلات ذات صلة. هذه نتائج بحث محلي وليست إجابة مولدة بالذكاء الاصطناعي.`));
    results.slice(0, 5).forEach(record => {
        const item = document.createElement("article");
        item.className = "atlas-guide-result";
        item.append(textElement("strong", "", record.title));
        item.append(textElement("p", "card-description", record.summary || record.background || ""));
        addLink(item, "افتح السجل", getEventUrl(record.collection, record.id));
        const referenceUrl = getReferenceUrl(record, record.collection);
        if (referenceUrl) addLink(item, "المراجع", referenceUrl);
        guideAnswer.append(item);
    });
}

async function askHistoricalGuide(event) {
    event.preventDefault();
    const query = normalizeText(guideQuestion.value);
    if (!query) {
        guideAnswer.replaceChildren(textElement("p", "empty-state", "اكتب سؤالًا قبل البحث."));
        return;
    }
    const configuredEndpoint = document.querySelector('meta[name="historical-ai-endpoint"]')?.content.trim();
    if (configuredEndpoint) {
        try {
            const endpoint = new URL(configuredEndpoint, window.location.href);
            if (endpoint.origin !== window.location.origin) {
                throw new Error("يجب أن تكون خدمة المرشد على النطاق نفسه لحماية بيانات المستخدم.");
            }
            const response = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question: guideQuestion.value.trim() })
            });
            if (!response.ok) throw new Error(`تعذّر الاتصال بخدمة المرشد (HTTP ${response.status}).`);
            const result = await response.json();
            if (!result || typeof result.answer !== "string" || !Array.isArray(result.citations)) {
                throw new Error("استجابة خدمة المرشد لا تطابق البنية المتوقعة.");
            }
            guideAnswer.replaceChildren(textElement("p", "card-description", result.answer));
            result.citations.forEach(citation => {
                const record = atlasData.events.find(item => item.id === citation.id && item.collection === citation.collection);
                if (!record) {
                    console.error("The historical guide returned an unknown citation:", citation);
                    return;
                }
                addLink(
                    guideAnswer,
                    citation.label || record.title,
                    getEventUrl(record.collection, record.id)
                );
            });
            return;
        } catch (error) {
            console.error("Historical AI guide request failed:", error);
            guideAnswer.replaceChildren(textElement("p", "empty-state load-error", `تعذّر تشغيل المرشد الذكي: ${error.message}`));
            return;
        }
    }
    const records = atlasData.events
        .map(record => ({
            ...record,
            haystack: normalizeText(`${record.title} ${record.summary} ${record.background} ${record.causes} ${record.outcomes}`)
        }))
        .filter(record => record.haystack.includes(query) || query.split(/\s+/).some(term => term.length > 2 && record.haystack.includes(term)))
        .sort((first, second) => {
            const firstExact = first.haystack.includes(query) ? 1 : 0;
            const secondExact = second.haystack.includes(query) ? 1 : 0;
            return secondExact - firstExact || Number(second.year) - Number(first.year);
        });
    renderLocalGuide(records);
}

async function loadAtlas() {
    try {
        const responses = await Promise.all(Object.entries(atlasDataPaths).map(async ([key, path]) => {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`تعذّر تحميل ${path} (HTTP ${response.status})`);
            return [key, await response.json()];
        }));
        atlasData = Object.fromEntries(responses);
        if (!atlasData.umayyad.battles?.length
            || !atlasData.rashidun.events?.length
            || !atlasData.umayyad.cities?.length
            || !atlasData.rashidun.places?.length) {
            throw new Error("ملفات بيانات الأطلس لا تحتوي السجلات الجغرافية المطلوبة.");
        }

        atlasData = { ...atlasData, ...buildAtlasData(atlasData.umayyad, atlasData.rashidun) };
        const period = new URLSearchParams(window.location.search).get("period");
        if (period === "rashidun") yearSlider.value = "661";
        atlasMapElement.dataset.period = period || "all";
        const hasMap = initializeMap();
        initializeExperience();
        yearSlider.addEventListener("input", () => {
            if (hasMap) renderLayers();
            else renderEventList(getSelectedYear());
        });
        guideForm.addEventListener("submit", askHistoricalGuide);
        if (hasMap) {
            renderLayers();
            const query = new URLSearchParams(window.location.search);
            focusAtlasRecord(query.get("focus"), query.get("label"));
            const verifiedMovementCount = atlasData.battles.filter(battle => battle.movementRoute).length;
            atlasStatus.textContent = `اكتمل تحميل ${atlasData.cities.length.toLocaleString("ar")} موضعًا و${atlasData.battles.length.toLocaleString("ar")} معركة. ${verifiedMovementCount ? `تتوفر مسارات حركة لـ${verifiedMovementCount} سجلات.` : "لا توجد بعد مسارات جيوش محررة ومسنَدة."}`;
        } else {
            renderEventList(getSelectedYear());
        }
    } catch (error) {
        console.error("تعذّر تحميل الأطلس التاريخي:", error);
        atlasStatus.textContent = `تعذّر تحميل بيانات الأطلس: ${error.message}`;
        atlasStatus.classList.add("map-status-error");
        eventList.replaceChildren(textElement("p", "empty-state load-error", "تعذّر تحميل السجلات. تحقق من تشغيل الموقع عبر خادم محلي وصحة ملفات البيانات."));
        experienceOutput.replaceChildren(textElement("p", "empty-state load-error", "تعذّر تحميل تجربة المعارك."));
    }
}

loadAtlas();
