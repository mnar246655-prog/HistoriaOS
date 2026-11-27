(function () {
    const trustedSourceHosts = new Set([
        "en.wikipedia.org",
        "ar.wikipedia.org",
        "en.wikisource.org",
        "ar.wikisource.org",
        "zh.wikisource.org"
    ]);
    const detail = document.querySelector("[data-book-detail]");
    const status = document.querySelector("#book-detail-status");

    function textElement(tagName, className, value) {
        const element = document.createElement(tagName);
        element.className = className;
        element.textContent = value;
        return element;
    }

    function appendMeta(container, label, value) {
        if (!value) return;
        const item = document.createElement("div");
        item.className = "book-detail-meta-item";
        item.append(textElement("span", "book-detail-meta-label", label));
        item.append(textElement("strong", "book-detail-meta-value", value));
        container.append(item);
    }

    function createSourceLink(book) {
        if (!book.sourceUrl) return null;
        let url;
        try {
            url = new URL(book.sourceUrl);
        } catch {
            console.error("عنوان مصدر غير صالح في سجل الكتاب:", book.id);
            return null;
        }
        if (url.protocol !== "https:"
            || url.username
            || url.password
            || url.port
            || !trustedSourceHosts.has(url.hostname)
            || !url.pathname.startsWith("/wiki/")) {
            console.error("نطاق مصدر غير معتمد في سجل الكتاب:", book.id);
            return null;
        }
        const link = document.createElement("a");
        link.className = "source-link book-detail-source-link";
        link.href = url.href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        const sourceName = book.sourceName === "Wikipedia" ? "ويكيبيديا"
            : book.sourceName === "Wikisource" ? "ويكي مصدر"
                : book.sourceName === "Chinese Wikisource" ? "ويكي مصدر (الصينية)"
                    : book.sourceName || "مصدر ببليوغرافي";
        link.textContent = `المصدر الببليوغرافي: ${sourceName}`;
        return link;
    }

    function renderRelatedSection(title, names, linkedItems, hrefFor) {
        const section = document.createElement("section");
        section.className = "book-detail-section";
        section.append(textElement("h2", "", title));
        const list = document.createElement("ul");
        list.className = "book-related-list";
        const linksByName = new Map(linkedItems.map(item => [item.name || item.title, item]));
        const uniqueNames = [...new Set(names.filter(name => typeof name === "string" && name.trim()))];
        uniqueNames.forEach(name => {
            const listItem = document.createElement("li");
            const linkedItem = linksByName.get(name);
            if (linkedItem) {
                const link = document.createElement("a");
                link.href = hrefFor(linkedItem, name);
                link.textContent = name;
                listItem.append(link);
            } else {
                listItem.append(textElement("span", "", name));
            }
            list.append(listItem);
        });
        if (!uniqueNames.length) {
            list.append(textElement("li", "book-related-empty", "لم تُحرر إحالات مرتبطة لهذا الكتاب."));
        }
        section.append(list);
        return section;
    }

    function renderCities(book, cityRecords) {
        const namesById = new Map(cityRecords.map(city => [city.id, city]));
        const section = document.createElement("section");
        section.className = "book-detail-section";
        section.append(textElement("h2", "", "المدن المرتبطة"));
        const list = document.createElement("ul");
        list.className = "book-related-list";
        const cityNames = [...new Set(book.cityNames || [])];
        const linkedByName = new Map();
        (book.cityIds || []).forEach(id => {
            const city = namesById.get(id);
            if (city && city.coordinates) linkedByName.set(city.name, city);
        });
        cityNames.forEach(name => {
            const item = document.createElement("li");
            const city = linkedByName.get(name);
            if (city) {
                const link = document.createElement("a");
                link.href = `maps.html?focus=${encodeURIComponent(city.id)}&label=${encodeURIComponent(city.name)}`;
                link.textContent = name;
                item.append(link);
            } else {
                item.append(textElement("span", "", name));
            }
            list.append(item);
        });
        if (!cityNames.length) list.append(textElement("li", "book-related-empty", "لم تُحرر مدن مرتبطة لهذا الكتاب."));
        section.append(list);
        return section;
    }

    async function loadBook() {
        const bookId = new URLSearchParams(window.location.search).get("id");
        if (!bookId) {
            status.textContent = "لم يُحدَّد كتاب لعرض تفاصيله.";
            status.classList.add("load-error");
            return;
        }

        try {
            const paths = [
                ["books", "../books/books.json"],
                ["people", "../people/people.json"],
                ["events", "../events/events.json"],
                ["umayyad", "../umayyad/data.json"],
                ["rashidun", "../rashidun/data.json"]
            ];
            const responses = await Promise.all(paths.map(async ([key, file]) => {
                const response = await fetch(file);
                if (!response.ok) throw new Error(`تعذّر تحميل ${file} (HTTP ${response.status})`);
                return [key, await response.json()];
            }));
            const data = Object.fromEntries(responses);
            if (!Array.isArray(data.books)
                || !Array.isArray(data.people)
                || !Array.isArray(data.events)
                || !Array.isArray(data.umayyad?.cities)
                || !Array.isArray(data.rashidun?.places)) {
                throw new Error("ملفات بيانات تفاصيل الكتب غير صالحة.");
            }
            const book = data.books.find(item => item.id === bookId && item.cover);
            if (!book) {
                status.textContent = "لا تتوفر صفحة تفصيلية لهذا الكتاب في هذه المجموعة.";
                status.classList.add("load-error");
                return;
            }

            const peopleById = new Map(data.people.map(person => [person.id, person]));
            const eventsById = new Map(data.events.map(event => [event.id, event]));
            const peopleByName = new Map(data.people.map(person => [person.name, person]));
            const cities = [
                ...(data.umayyad.cities || []),
                ...(data.rashidun.places || [])
            ];
            const relatedPeople = (book.personIds || []).map(id => peopleById.get(id)).filter(Boolean);
            const linkedPersonIds = new Set(relatedPeople.map(person => person.id));
            [...(book.personNames || []), book.author].forEach(name => {
                const person = peopleByName.get(name);
                if (person && !linkedPersonIds.has(person.id)) {
                    linkedPersonIds.add(person.id);
                    relatedPeople.push(person);
                }
            });
            const relatedEvents = (book.eventIds || []).map(id => eventsById.get(id)).filter(Boolean);
            const peopleNames = [...new Set([...(book.personNames || []), ...relatedPeople.map(person => person.name)])];
            const eventNames = [...new Set([...(book.eventNames || []), ...relatedEvents.map(event => event.title)])];
            const hero = document.createElement("section");
            hero.className = "book-detail-hero";
            const coverWrapper = document.createElement("div");
            coverWrapper.className = "book-detail-cover";
            coverWrapper.append(window.HistoriaBookCovers.create(book, "detail"));
            const intro = document.createElement("div");
            intro.className = "book-detail-intro";
            intro.append(textElement("p", "eyebrow eyebrow-dark", "ملف ببليوغرافي"));
            const title = textElement("h1", "", book.title);
            title.id = "book-detail-title";
            intro.append(title);
            intro.append(textElement("p", "book-detail-author", `المؤلف: ${book.author}`));
            const metadata = document.createElement("div");
            metadata.className = "book-detail-meta";
            appendMeta(metadata, "تاريخ التأليف", book.compositionDate || book.compositionCentury || book.century);
            appendMeta(metadata, "الحقبة التاريخية", book.historicalPeriod || book.period);
            appendMeta(metadata, "التصنيف", book.category);
            intro.append(metadata);
            const sourceLink = createSourceLink(book);
            if (sourceLink) intro.append(sourceLink);
            hero.append(coverWrapper, intro);

            detail.replaceChildren(
                hero,
                createBookSection("الملخص", book.summary || book.description),
                createBookSection("الأهمية التاريخية", book.historicalImportance),
                renderRelatedSection("الشخصيات المرتبطة", peopleNames, relatedPeople,
                    (person, name) => `people.html?q=${encodeURIComponent(name)}`),
                renderRelatedSection("الأحداث المرتبطة", eventNames, relatedEvents,
                    (event, name) => `events.html?q=${encodeURIComponent(name)}`),
                renderCities(book, cities)
            );
            detail.hidden = false;
            status.textContent = "";
            document.title = `${book.title} | مكتبة HistoriaOS`;
        } catch (error) {
            console.error("تعذّر تحميل تفاصيل الكتاب:", error);
            status.textContent = "تعذّر تحميل تفاصيل الكتاب ومراجع علاقاته. حاول تحديث الصفحة.";
            status.classList.add("load-error");
        }
    }

    function createBookSection(title, content) {
        const section = document.createElement("section");
        section.className = "book-detail-section";
        section.append(textElement("h2", "", title));
        section.append(textElement("p", "book-detail-copy", content || "لم يحرر وصف لهذا الجانب بعد."));
        return section;
    }

    if (detail && status) loadBook();
})();
