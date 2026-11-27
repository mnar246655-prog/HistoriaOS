(function () {
    const visualSystem = window.HistoriaVisualSystem;
    const gallery = document.getElementById("visual-gallery");
    const searchInput = document.getElementById("visual-search");
    const resultCount = document.getElementById("visual-result-count");
    const inspectorTitle = document.getElementById("visual-inspector-title");
    const inspectorArt = document.getElementById("visual-record-art");
    const inspectorInfo = document.getElementById("visual-record-info");
    const recordLink = document.getElementById("visual-record-link");
    const mapCanvas = document.getElementById("visual-map");
    const mapPrecision = document.getElementById("visual-map-precision");
    const mapNote = document.getElementById("visual-map-note");
    const atlasLink = document.getElementById("visual-atlas-link");
    const detailTimeline = document.getElementById("visual-detail-timeline");
    const timelinePeriod = document.getElementById("visual-timeline-period");
    const relatedEvents = document.getElementById("visual-related-events");
    const filterButtons = Array.from(document.querySelectorAll("[data-visual-type]"));
    let activeType = "all";
    let records = [];
    let selectedRecordId = null;
    let map;
    let selectedMarker;

    function textElement(tagName, className, value) {
        const element = document.createElement(tagName);
        if (className) element.className = className;
        element.textContent = value;
        return element;
    }

    function normalizeName(value) {
        return String(value || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[إأآٱ]/g, "ا")
            .replace(/ى/g, "ي")
            .replace(/[^\p{L}\p{N}]+/gu, "")
            .toLowerCase();
    }

    function eventYears(ids, events) {
        return (ids || [])
            .map(id => events.get(id))
            .filter(Boolean)
            .map(event => Number(event.year))
            .filter(Number.isFinite);
    }

    function getRange(years) {
        if (!years.length) return { start: null, end: null };
        return { start: Math.min(...years), end: Math.max(...years) };
    }

    function getReferenceTitles(ids, references) {
        return (ids || []).map(id => {
            const reference = references.find(item => item.id === id);
            return reference ? reference.shortTitle || reference.citation : null;
        }).filter(Boolean);
    }

    function createPersonRecords(globalPeople, umayyad, rashidun, eventsByCollection) {
        const peopleByName = new Map();
        globalPeople
            .filter(person => !person.isSample && person.name)
            .forEach((person, index) => {
                const key = normalizeName(person.name);
                if (!peopleByName.has(key)) {
                    peopleByName.set(key, {
                        id: `global-person-${index + 1}`,
                        type: "person",
                        title: person.name,
                        subtitle: person.period || person.state || person.role || "شخصية تاريخية",
                        period: person.period || person.state || "الفترة غير محددة",
                        summary: person.description || person.biography || "لا يتوفر وصف محرر لهذا السجل.",
                        description: person.description || "",
                        source: person.sourceName || "",
                        referenceUrl: person.sourceUrl || "",
                        referenceTitles: person.sourceName ? [person.sourceName] : [],
                        relatedEventTitles: [],
                        coordinates: null,
                        mapFocus: "",
                        mapNote: "لا تتوفر إحداثية محررة للشخصية؛ ولا يُستنتج موضع من سيرتها.",
                        recordUrl: `people.html?q=${encodeURIComponent(person.name)}`,
                        range: getRange([]),
                        sourceLabel: "الشخصيات"
                    });
                }
            });

        const addSpecializedPerson = (person, collectionName, eventMap, places, cities) => {
            const ids = person.eventIds || [];
            const years = eventYears(ids, eventMap);
            const range = getRange(years);
            const relatedEvents = ids.map(id => eventMap.get(id)).filter(Boolean);
            let coordinates = null;
            let mapFocus = "";
            const firstEvent = relatedEvents[0];
            if (firstEvent && collectionName === "umayyad") {
                const city = cities.find(item => (firstEvent.cityIds || []).includes(item.id));
                if (city && Array.isArray(city.coordinates)) {
                    coordinates = city.coordinates;
                    mapFocus = city.id;
                }
            } else if (firstEvent) {
                const place = places.find(item => (firstEvent.placeIds || []).includes(item.id));
                if (place && Array.isArray(place.coordinates)) {
                    coordinates = place.coordinates;
                    mapFocus = place.id;
                }
            }
            const name = person.name;
            peopleByName.set(normalizeName(name), {
                id: person.id || `${collectionName}-person-${normalizeName(name)}`,
                type: "person",
                title: name,
                subtitle: person.role || person.epithet || person.period || person.reign || "شخصية تاريخية",
                period: person.reign || person.dates || person.period || "الفترة غير محددة",
                summary: person.biography || person.origin || person.description || person.impact || "لا يتوفر وصف محرر لهذا السجل.",
                description: person.historicalImpact || person.impact || person.achievements || person.description || "",
                source: "موسوعة HistoriaOS",
                referenceUrl: "",
                referenceTitles: getReferenceTitles(
                    person.referenceIds,
                    collectionName === "umayyad" ? umayyad.references : rashidun.references
                ),
                relatedEventTitles: relatedEvents.map(event => event.title).slice(0, 5),
                coordinates,
                mapFocus,
                mapNote: coordinates
                    ? "الإحداثية مستمدة من موضع حدث مرتبط بالسيرة، وليست موقعًا شخصيًا ثابتًا."
                    : "لا تتوفر إحداثية محررة للشخصية؛ ولا يُستنتج موضع من سيرتها.",
                recordUrl: collectionName === "umayyad"
                    ? `umayyad.html#person-${person.id}`
                    : `rashidun.html#profile-${person.id}`,
                range,
                sourceLabel: collectionName === "umayyad" ? "الدولة الأموية" : "الخلفاء الراشدون"
            });
        };

        umayyad.people.forEach(person => addSpecializedPerson(person, "umayyad", eventsByCollection.umayyad, [], umayyad.cities));
        rashidun.caliphs.forEach(person => addSpecializedPerson(person, "rashidun", eventsByCollection.rashidun, rashidun.places, []));
        return Array.from(peopleByName.values());
    }

    function createCityRecords(umayyad, rashidun, eventsByCollection) {
        const cities = [];
        umayyad.cities.forEach(city => {
            const years = eventYears(city.eventIds, eventsByCollection.umayyad);
            cities.push({
                id: city.id,
                type: "city",
                title: city.name,
                subtitle: city.region || "العصر الأموي",
                period: "العصر الأموي",
                summary: city.description || "موضع مرتبط بأحداث العصر الأموي.",
                description: city.locationNote || "",
                coordinates: city.coordinates || null,
                mapFocus: city.id,
                mapNote: city.locationNote || "إحداثية مرجعية للمدينة؛ لا تثبت موضعًا أثريًا محددًا.",
                referenceTitles: getReferenceTitles(city.referenceIds, umayyad.references),
                recordUrl: `umayyad.html#city-${city.id}`,
                range: getRange(years),
                relatedEventTitles: (city.eventIds || []).map(id => eventsByCollection.umayyad.get(id)).filter(Boolean).map(event => event.title).slice(0, 5),
                sourceLabel: "الدولة الأموية"
            });
        });
        rashidun.places.forEach(place => {
            const years = eventYears(place.eventIds, eventsByCollection.rashidun);
            cities.push({
                id: place.id,
                type: "city",
                title: place.name,
                subtitle: place.region || place.category || "الخلافة الراشدة",
                period: "الخلافة الراشدة",
                summary: place.description || place.locationNote || "موضع مرتبط بأحداث الخلافة الراشدة.",
                description: place.locationNote || "",
                coordinates: place.coordinates || null,
                mapFocus: place.id,
                mapNote: place.locationNote || "إحداثية مرجعية للموضع؛ لا تثبت موضعًا أثريًا محددًا.",
                referenceTitles: getReferenceTitles(place.referenceIds, rashidun.references),
                recordUrl: `rashidun.html#place-${place.id}`,
                range: getRange(years),
                relatedEventTitles: (place.eventIds || []).map(id => eventsByCollection.rashidun.get(id)).filter(Boolean).map(event => event.title).slice(0, 5),
                sourceLabel: "الخلفاء الراشدون"
            });
        });
        return cities;
    }

    function createBattleRecords(umayyad, rashidun, eventsByCollection) {
        const battles = umayyad.battles.map(battle => {
            const event = eventsByCollection.umayyad.get(battle.eventId);
            return {
                id: battle.id,
                type: "battle",
                title: battle.name,
                subtitle: `${battle.year}م · العصر الأموي`,
                period: `${battle.year}م`,
                summary: battle.description || (event && event.description) || "معركة مرتبطة بأحداث العصر الأموي.",
                description: battle.locationDescription || "",
                coordinates: battle.coordinates || null,
                mapFocus: battle.id,
                mapNote: battle.locationDescription || "موضع مرجعي للمعركة، لا إحداثيات لتمركز الجيشين.",
                referenceTitles: getReferenceTitles(battle.referenceIds, umayyad.references),
                recordUrl: `umayyad.html#battle-${battle.id}`,
                range: { start: Number(battle.year), end: Number(battle.year) },
                relatedEventTitles: event ? [event.title] : [],
                sourceLabel: "الدولة الأموية",
                associatedPeople: (battle.personIds || []).map(id => umayyad.people.find(person => person.id === id)?.name).filter(Boolean),
                referenceIds: battle.referenceIds || []
            };
        });
        rashidun.events.filter(event => /معركة|وقعة/.test(event.title)).forEach(event => {
            const place = rashidun.places.find(item => (event.placeIds || []).includes(item.id));
            const people = (event.personIds || []).map(id => rashidun.caliphs.find(person => person.id === id)?.name).filter(Boolean);
            battles.push({
                id: event.id,
                type: "battle",
                title: event.title,
                subtitle: `${event.dateLabel || `${event.year}م`} · الخلافة الراشدة`,
                period: event.dateLabel || `${event.year}م`,
                summary: event.summary || "معركة مرتبطة بأحداث الخلافة الراشدة.",
                description: event.background || "",
                coordinates: place?.coordinates || null,
                mapFocus: event.id,
                mapNote: place?.locationNote || "موضع مرجعي للحدث؛ لا إحداثيات لتمركز الجيشين.",
                referenceTitles: getReferenceTitles(event.referenceIds, rashidun.references),
                recordUrl: `rashidun.html#${event.id}`,
                range: { start: Number(event.year), end: Number(event.year) },
                relatedEventTitles: [event.title],
                sourceLabel: "الخلفاء الراشدون",
                associatedPeople: people,
                referenceIds: event.referenceIds || []
            });
        });
        return battles;
    }

    function createStateRecords() {
        return [
            {
                id: "state-rashidun", type: "state", title: "الخلافة الراشدة", subtitle: "632–661م · المدينة",
                period: "632–661م", summary: "مرحلة الخلافة التي أعقبت وفاة النبي محمد، واتخذت المدينة مركزًا سياسيًا قبل انتقال مركز الحكم إلى دمشق.",
                description: "تمثل الإحداثية مركزًا سياسيًا تقريبيًا، ولا ترسم حدود الدولة.",
                coordinates: [24.4672, 39.6111], mapFocus: "coordinates:24.4672,39.6111", range: { start: 632, end: 661 },
                mapNote: "المدينة مركز سياسي مرجعي للفترة؛ لا تمثل الإحداثية حدود الخلافة.",
                recordUrl: "rashidun.html",
                relatedEventTitles: ["بيعة أبي بكر", "خلافة عمر", "خلافة عثمان", "خلافة علي"], sourceLabel: "الخلفاء الراشدون"
            },
            {
                id: "state-umayyad", type: "state", title: "الدولة الأموية", subtitle: "661–750م · دمشق",
                period: "661–750م", summary: "دولة اتخذت دمشق مركزًا للحكم، وامتد نفوذها عبر أقاليم متعددة خلال القرن الأول الهجري.",
                description: "دمشق مركز الحكم؛ لا تمثل الإحداثية حدود الدولة في أي سنة بعينها.",
                coordinates: [33.5138, 36.2763], mapFocus: "coordinates:33.5138,36.2763", range: { start: 661, end: 750 },
                mapNote: "دمشق مركز الحكم؛ لا تمثل الإحداثية حدود الدولة في سنة بعينها.",
                recordUrl: "umayyad.html",
                relatedEventTitles: [], sourceLabel: "موسوعة الدولة الأموية"
            },
            {
                id: "state-abbasid", type: "state", title: "الخلافة العباسية", subtitle: "750–1258م · بغداد في مراحلها المركزية",
                period: "750–1258م", summary: "خلافة اتخذت بغداد مركزًا بارزًا منذ تأسيسها، وتبدلت خلالها موازين السلطة وحدود النفوذ على امتداد قرون.",
                description: "بغداد مركز حضري وسياسي بارز؛ تختلف حدود النفوذ باختلاف العصر.",
                coordinates: [33.3152, 44.3661], mapFocus: "coordinates:33.3152,44.3661", range: { start: 750, end: 1258 },
                mapNote: "بغداد مركز حضري وسياسي بارز؛ تختلف حدود النفوذ باختلاف العصر.",
                recordUrl: "events.html?q=تأسيس%20بغداد",
                relatedEventTitles: [], sourceLabel: "سجل تمهيدي"
            },
            {
                id: "state-andalus", type: "state", title: "الأندلس", subtitle: "711–1492م · كيانات سياسية متعاقبة",
                period: "711–1492م", summary: "اسم جغرافي وتاريخي لحضور سياسي إسلامي طويل في شبه الجزيرة الإيبيرية، شهد إمارات وخلافة وممالك متعددة.",
                description: "قرطبة موضع مرجعي للعرض، وليست عاصمة لجميع مراحل الأندلس.",
                coordinates: [37.8882, -4.7794], mapFocus: "coordinates:37.8882,-4.7794", range: { start: 711, end: 1492 },
                mapNote: "قرطبة موضع مرجعي لمرحلة من الأندلس، وليست عاصمة لجميع كياناتها.",
                recordUrl: "events.html?q=الأندلس",
                relatedEventTitles: [], sourceLabel: "سجل تمهيدي"
            },
            {
                id: "state-ottoman", type: "state", title: "الدولة العثمانية", subtitle: "نحو 1299–1922م · إسطنبول في مراحلها المتأخرة",
                period: "نحو 1299–1922م", summary: "دولة متعددة الأقاليم استمرت قرونًا، وتغير مركزها وحدودها وتركيبها السياسي عبر مراحل متعاقبة.",
                description: "إسطنبول مركز مرجعي للمرحلة المتأخرة؛ لا تمثل الإحداثية نطاق الدولة.",
                coordinates: [41.0082, 28.9784], mapFocus: "coordinates:41.0082,28.9784", range: { start: 1299, end: 1922 },
                mapNote: "إسطنبول مركز مرجعي للمرحلة المتأخرة؛ لا تمثل الإحداثية نطاق الدولة.",
                recordUrl: "events.html?q=الدولة%20العثمانية",
                relatedEventTitles: [], sourceLabel: "سجل تمهيدي"
            }
        ];
    }

    function createInfoRow(label, value) {
        const row = document.createElement("div");
        row.className = "visual-info-row";
        row.append(textElement("span", "visual-info-label", label));
        row.append(textElement("p", "", value));
        return row;
    }

    function getArtworkCaption(record) {
        const captions = {
            person: "رسم تجريدي؛ لا يقدّم ملامح مزعومة للشخصية.",
            city: "تصور معماري عام، لا إعادة بناء أثرية للموقع.",
            battle: "مخطط غير تكتيكي؛ لا يعرض تشكيلات أو مسارات موثقة.",
            state: "شارة رمزية؛ لا تمثل راية أو حدودًا تاريخية."
        };
        return captions[record.type] || "رسم تصوري لا يصوّر الواقعة حرفيًا.";
    }

    function atlasUrl(record) {
        const focus = record.mapFocus || "";
        const label = record.title ? `&label=${encodeURIComponent(record.title)}` : "";
        return focus ? `maps.html?focus=${encodeURIComponent(focus)}${label}` : "maps.html";
    }

    function createRecordCard(record) {
        const card = document.createElement("article");
        card.className = `visual-record-card${record.id === selectedRecordId ? " is-selected" : ""}`;
        card.dataset.recordId = record.id;
        const select = document.createElement("button");
        select.type = "button";
        select.className = "visual-record-select";
        select.setAttribute("aria-pressed", String(record.id === selectedRecordId));
        select.append(visualSystem.createArtwork(record.type, record.title, getArtworkCaption(record)));
        const heading = document.createElement("div");
        heading.className = "visual-record-heading";
        heading.append(textElement("span", "visual-type-label", record.sourceLabel || record.type));
        heading.append(textElement("span", "visual-record-period", record.period || record.subtitle || ""));
        select.append(heading);
        select.append(textElement("h3", "", record.title));
        select.append(textElement("p", "visual-card-summary", record.summary));
        select.append(visualSystem.createTimeline(record.range.start, record.range.end, record.subtitle));
        select.append(textElement("span", "visual-card-action", "افتح البطاقة الموسوعية ←"));
        select.addEventListener("click", () => selectRecord(record));
        card.append(select);
        card.append(visualSystem.createMapPreview(record.coordinates, record.coordinates ? "موضع مرتبط بالسجل" : "إتاحة الموقع", atlasUrl(record)));
        return card;
    }

    function renderGallery() {
        const query = normalizeName(searchInput.value);
        const filteredRecords = records.filter(record => {
            const matchesType = activeType === "all" || record.type === activeType;
            const searchable = normalizeName([
                record.title,
                record.subtitle,
                record.period,
                record.summary,
                record.sourceLabel,
                ...(record.relatedEventTitles || [])
            ].join(" "));
            return matchesType && (!query || searchable.includes(query));
        });
        gallery.replaceChildren();
        if (!filteredRecords.length) {
            gallery.append(textElement("p", "empty-state", "لا توجد سجلات مطابقة لهذا البحث."));
        } else {
            filteredRecords.forEach(record => gallery.append(createRecordCard(record)));
        }
        resultCount.textContent = `${filteredRecords.length.toLocaleString("ar")} سجل`;
    }

    function createMap() {
        if (!window.L) {
            mapNote.textContent = "تعذر تحميل مكتبة الخرائط؛ ستبقى البيانات والخطوط الزمنية متاحة.";
            mapPrecision.textContent = "الخريطة غير متاحة";
            return;
        }
        map = window.L.map(mapCanvas, { scrollWheelZoom: false }).setView([31.5, 37.5], 4);
        window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 18,
            attribution: "&copy; OpenStreetMap contributors"
        }).addTo(map);
        window.setTimeout(() => map.invalidateSize(), 100);
    }

    function selectRecord(record) {
        selectedRecordId = record.id;
        inspectorTitle.textContent = record.title;
        inspectorArt.replaceChildren(visualSystem.createArtwork(record.type, record.title, getArtworkCaption(record)));
        inspectorInfo.replaceChildren();
        inspectorInfo.append(createInfoRow("الفئة", record.sourceLabel || record.type));
        inspectorInfo.append(createInfoRow("الفترة", record.period || record.subtitle || "غير محددة"));
        inspectorInfo.append(createInfoRow("النبذة", record.summary));
        if (record.description) inspectorInfo.append(createInfoRow("ملاحظة تحريرية", record.description));
        if (record.associatedPeople && record.associatedPeople.length) {
            inspectorInfo.append(createInfoRow("الشخصيات المرتبطة", record.associatedPeople.join("، ")));
        }
        if (record.referenceTitles && record.referenceTitles.length) {
            inspectorInfo.append(createInfoRow("المراجع", record.referenceTitles.join("، ")));
        } else if (record.source) {
            inspectorInfo.append(createInfoRow("الإحالة", record.source));
        }
        if (record.referenceUrl && /^https:\/\/[^\s]+$/.test(record.referenceUrl)) {
            const sourceLink = document.createElement("a");
            sourceLink.className = "source-link";
            sourceLink.href = record.referenceUrl;
            sourceLink.target = "_blank";
            sourceLink.rel = "noopener noreferrer";
            sourceLink.textContent = `المصدر الخارجي: ${record.source || "مصدر تعريفي"}`;
            inspectorInfo.append(sourceLink);
        }
        detailTimeline.replaceChildren(visualSystem.createTimeline(record.range.start, record.range.end, record.period || record.subtitle));
        timelinePeriod.textContent = record.period || "التأريخ غير محدد";

        if (record.coordinates && Array.isArray(record.coordinates) && record.coordinates.length === 2) {
            mapPrecision.textContent = "إحداثية مرجعية";
            mapNote.textContent = record.mapNote || "الإحداثية للعرض الجغرافي العام؛ لا تعني تحديد موضع أثري دقيق أو حدود سياسية.";
            if (map) {
                const coordinates = record.coordinates.map(Number);
                if (selectedMarker) selectedMarker.setLatLng(coordinates);
                else {
                    selectedMarker = window.L.circleMarker(coordinates, {
                        radius: 8,
                        color: "#fff",
                        weight: 3,
                        fillColor: "#a64e3c",
                        fillOpacity: 1
                    }).addTo(map);
                }
                selectedMarker.bindPopup(record.title);
                map.flyTo(coordinates, record.type === "battle" ? 6 : 5, { duration: 0.6 });
                map.invalidateSize();
            }
        } else {
            mapPrecision.textContent = "غير محررة";
            mapNote.textContent = "لا تتوفر إحداثية موثقة لهذا السجل في مجموعة البيانات الحالية؛ لم يُخترع موضع بديل.";
            if (selectedMarker && map) map.removeLayer(selectedMarker);
            selectedMarker = null;
        }
        atlasLink.href = atlasUrl(record);
        recordLink.href = record.recordUrl || "people.html";
        recordLink.textContent = `افتح سجل ${record.title} الموسوعي ←`;
        recordLink.hidden = !record.recordUrl;
        relatedEvents.replaceChildren();
        if (record.relatedEventTitles && record.relatedEventTitles.length) {
            relatedEvents.append(textElement("h3", "visual-detail-subheading", "أحداث مرتبطة"));
            const list = document.createElement("ul");
            record.relatedEventTitles.forEach(title => list.append(textElement("li", "", title)));
            relatedEvents.append(list);
        }
        filterButtons.forEach(button => {
            button.setAttribute("aria-pressed", String(button.dataset.visualType === activeType));
        });
        renderGallery();
    }

    function updateCounts() {
        const counts = records.reduce((result, record) => {
            result[record.type] = (result[record.type] || 0) + 1;
            return result;
        }, {});
        document.getElementById("visual-count-people").textContent = (counts.person || 0).toLocaleString("ar");
        document.getElementById("visual-count-cities").textContent = (counts.city || 0).toLocaleString("ar");
        document.getElementById("visual-count-battles").textContent = (counts.battle || 0).toLocaleString("ar");
        document.getElementById("visual-count-states").textContent = (counts.state || 0).toLocaleString("ar");
    }

    async function loadRecords() {
        const paths = [
            "../people/people.json",
            "../events/events.json",
            "../umayyad/data.json",
            "../rashidun/data.json"
        ];
        const responses = await Promise.all(paths.map(path => fetch(path)));
        const failedResponse = responses.find(response => !response.ok);
        if (failedResponse) throw new Error(`تعذر تحميل سجل المعرض (${failedResponse.status}).`);
        const [globalPeople, globalEvents, umayyad, rashidun] = await Promise.all(responses.map(response => response.json()));
        const eventsByCollection = {
            umayyad: new Map(umayyad.events.map(event => [event.id, event])),
            rashidun: new Map(rashidun.events.map(event => [event.id, event]))
        };
        const people = createPersonRecords(globalPeople, umayyad, rashidun, eventsByCollection);
        const cities = createCityRecords(umayyad, rashidun, eventsByCollection);
        const battles = createBattleRecords(umayyad, rashidun, eventsByCollection);
        records = [...people, ...cities, ...battles, ...createStateRecords()];
        records.forEach(record => {
            if (record.type === "person" && !record.relatedEventTitles.length) {
                const globalMatches = globalEvents.filter(event =>
                    !event.isSample && event.title && normalizeName(record.title) === normalizeName(event.personName || "")
                );
                record.relatedEventTitles = globalMatches.slice(0, 3).map(event => event.title);
            }
        });
        records.sort((first, second) => first.title.localeCompare(second.title, "ar"));
    }

    function initializeFilters() {
        filterButtons.forEach(button => {
            button.addEventListener("click", () => {
                activeType = button.dataset.visualType;
                filterButtons.forEach(item => {
                    item.classList.toggle("is-active", item === button);
                    item.setAttribute("aria-pressed", String(item === button));
                });
                renderGallery();
            });
        });
        searchInput.addEventListener("input", renderGallery);
    }

    async function initialize() {
        if (!visualSystem) throw new Error("تعذر تهيئة نظام العرض البصري.");
        initializeFilters();
        createMap();
        await loadRecords();
        updateCounts();
        renderGallery();
        if (records.length) selectRecord(records[0]);
    }

    initialize().catch(error => {
        console.error(error);
        gallery.replaceChildren(textElement("p", "empty-state", `تعذر تحميل المعرض: ${error.message}`));
        resultCount.textContent = "تعذر تحميل السجلات";
    });
})();
