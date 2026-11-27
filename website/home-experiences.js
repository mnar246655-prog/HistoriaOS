(function () {
    const grid = document.getElementById("home-experiences-grid");

    function textElement(tagName, className, value) {
        const element = document.createElement(tagName);
        if (className) element.className = className;
        element.textContent = value;
        return element;
    }

    function findPlace(data, ids, fallbackName) {
        return (ids || []).map(id => data.places.find(place => place.id === id)).find(Boolean)
            || data.umayyad.cities.find(city => city.name.includes(fallbackName))
            || null;
    }

    function getSources(record, references) {
        return (record.referenceIds || []).map(id => {
            const reference = references.find(item => item.id === id);
            return reference ? { title: reference.shortTitle || id, href: `rashidun.html#rash-reference-${id}` } : null;
        }).filter(Boolean);
    }

    function createExperienceCard(record) {
        const article = document.createElement("article");
        article.className = `home-experience-card${record.kind === "battle" ? " is-battle" : " is-event"}`;

        const visual = document.createElement("div");
        visual.className = "home-experience-visual";
        const art = document.createElement("img");
        art.src = record.kind === "battle"
            ? "../assets/images/battle-map.svg"
            : "../assets/images/historical-event.svg";
        art.alt = "";
        art.setAttribute("aria-hidden", "true");
        art.loading = "lazy";
        visual.append(art);
        if (record.kind === "battle") {
            const armySymbols = document.createElement("img");
            armySymbols.className = "home-experience-armies";
            armySymbols.src = "../assets/battles/army-symbols.svg";
            armySymbols.alt = "";
            armySymbols.setAttribute("aria-hidden", "true");
            armySymbols.loading = "lazy";
            visual.append(armySymbols);
        }
        visual.append(textElement("span", "home-experience-kind", record.kindLabel));
        visual.append(textElement("span", "home-experience-date", record.dateLabel));
        article.append(visual);

        const body = document.createElement("div");
        body.className = "home-experience-body";
        body.append(textElement("p", "eyebrow eyebrow-dark", record.contextLabel));
        body.append(textElement("h3", "", record.title));
        body.append(textElement("p", "home-experience-summary", record.summary));

        const facts = document.createElement("div");
        facts.className = "home-experience-facts";
        facts.append(textElement("span", "home-experience-fact", `الموضع: ${record.placeName || "غير محدد في السجل"}`));
        facts.append(textElement("span", "home-experience-fact", record.peopleNames.length
            ? `شخصيات مرتبطة: ${record.peopleNames.join("، ")}`
            : "الشخصيات المرتبطة: لم يحررها هذا السجل."));
        facts.append(textElement("span", "home-experience-fact", record.outcomes || "لا تتوفر نتيجة محررة لهذا السجل."));
        body.append(facts);

        const mapCard = document.createElement("div");
        mapCard.className = "home-experience-map";
        const mapImage = document.createElement("img");
        mapImage.src = "../assets/maps/antique-map.svg";
        mapImage.alt = "";
        mapImage.setAttribute("aria-hidden", "true");
        mapImage.loading = "lazy";
        mapCard.append(mapImage);
        const mapCopy = document.createElement("span");
        mapCopy.textContent = record.mapNote;
        mapCard.append(mapCopy);
        const mapLink = document.createElement("a");
        mapLink.href = record.mapHref;
        mapLink.textContent = "اعرض الموضع على الخريطة";
        mapCard.append(mapLink);
        body.append(mapCard);

        const timeline = document.createElement("div");
        timeline.className = "home-experience-timeline";
        timeline.append(textElement("span", "", record.dateLabel));
        timeline.append(textElement("i", "", ""));
        timeline.append(textElement("span", "", record.contextLabel));
        body.append(timeline);

        const sourceList = document.createElement("div");
        sourceList.className = "home-experience-sources";
        sourceList.append(textElement("strong", "", "المصادر:"));
        if (record.sources.length) {
            record.sources.forEach((source, index) => {
                if (index) sourceList.append(document.createTextNode(" · "));
                const link = document.createElement("a");
                link.href = source.href;
                if (/^https:\/\//.test(source.href)) {
                    link.target = "_blank";
                    link.rel = "noopener noreferrer";
                }
                link.textContent = source.title;
                sourceList.append(link);
            });
        } else {
            sourceList.append(textElement("span", "", "لا توجد إحالة منشورة لهذا السجل."));
        }
        body.append(sourceList);

        const start = document.createElement("a");
        start.className = "button button-green home-experience-start";
        start.href = `maps.html?experience=${encodeURIComponent(record.experienceId)}`;
        start.textContent = "ابدأ التجربة";
        body.append(start);
        article.append(body);
        return article;
    }

    function buildExperiences(rashidun, globalEvents, umayyad) {
        const selected = [
            { id: "rash-event-yarmouk", kind: "battle", kindLabel: "معركة", contextLabel: "بلاد الشام" },
            { id: "rash-event-qadisiyya", kind: "battle", kindLabel: "معركة", contextLabel: "فتح العراق" },
            { id: "rash-event-jerusalem", kind: "event", kindLabel: "فتح وتسليم", title: "القدس: الحصار والتسليم", contextLabel: "بلاد الشام" }
        ];
        const experiences = selected.map(selection => {
            const event = rashidun.events.find(item => item.id === selection.id);
            if (!event) throw new Error(`Missing historical experience: ${selection.id}`);
            const place = findPlace({ places: rashidun.places, umayyad }, event.placeIds, "");
            const peopleNames = (event.personIds || [])
                .map(id => rashidun.caliphs.find(person => person.id === id)?.name)
                .filter(Boolean);
            return {
                ...selection,
                experienceId: event.id,
                title: selection.title || event.title,
                year: Number(event.year),
                dateLabel: event.dateLabel || `${event.year}م`,
                summary: event.summary,
                outcomes: `النتيجة: ${event.outcomes}`,
                peopleNames,
                placeName: place?.name || "",
                mapNote: place?.locationNote || "موضع مرجعي تقريبي؛ لا يحدد نقطة أثرية أو تمركزًا عسكريًا.",
                mapHref: `maps.html?focus=${encodeURIComponent(place?.id || event.id)}&label=${encodeURIComponent(place?.name || event.title)}`,
                sources: getSources(event, rashidun.references)
            };
        });

        const meccaEvent = globalEvents.find(event =>
            !event.isSample && event.title === "فتح مكة" && event.sourceUrl
        );
        if (meccaEvent) {
            const mecca = umayyad.cities.find(city => city.name.includes("مكة"));
            const mapFocus = mecca && Array.isArray(mecca.coordinates)
                ? `coordinates:${mecca.coordinates.join(",")}`
                : "";
            experiences.push({
                experienceId: meccaEvent.id || "moment-conquest-mecca",
                id: meccaEvent.id || "moment-conquest-mecca",
                kind: "event",
                kindLabel: "حدث تاريخي",
                contextLabel: "العصر النبوي",
                title: meccaEvent.title,
                year: Number(meccaEvent.year),
                dateLabel: `${Number(meccaEvent.year).toLocaleString("ar")}م`,
                summary: meccaEvent.description,
                outcomes: "النتيجة: انتهى الحدث بعودة مكة إلى الحكم الإسلامي وفق وصف السجل.",
                peopleNames: ["النبي محمد"],
                placeName: mecca?.name || "مكة",
                mapNote: "مركز المدينة الحديث مرجع جغرافي، ولا يحدد مسارًا أو موضعًا عسكريًا تاريخيًا.",
                mapHref: mapFocus
                    ? `maps.html?focus=${encodeURIComponent(mapFocus)}&label=${encodeURIComponent(mecca.name)}`
                    : "maps.html",
                sources: [{ title: meccaEvent.sourceName || "المصدر", href: meccaEvent.sourceUrl }]
            });
        }
        return experiences.sort((first, second) => first.year - second.year);
    }

    async function initialize() {
        if (!grid) return;
        try {
            const paths = ["../rashidun/data.json", "../events/events.json", "../umayyad/data.json"];
            const responses = await Promise.all(paths.map(path => fetch(path)));
            const failedResponse = responses.find(response => !response.ok);
            if (failedResponse) throw new Error(`HTTP ${failedResponse.status}`);
            const [rashidun, globalEvents, umayyad] = await Promise.all(responses.map(response => response.json()));
            const records = buildExperiences(rashidun, globalEvents, umayyad);
            if (records.length !== 4) throw new Error(`Expected four curated experiences; found ${records.length}.`);
            grid.replaceChildren(...records.map(createExperienceCard));
        } catch (error) {
            console.error("تعذر تحميل التجارب التاريخية:", error);
            grid.replaceChildren(textElement("p", "home-experience-status load-error", `تعذر تحميل التجارب التاريخية: ${error.message}`));
        }
    }

    initialize();
})();
