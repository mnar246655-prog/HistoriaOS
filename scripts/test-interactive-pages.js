const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");

class FakeElement {
    constructor(id = "") {
        this.id = id;
        this.value = "";
        this.checked = false;
        this.disabled = false;
        this.children = [];
        this.listeners = {};
        this.dataset = {};
        this.style = {};
        this.attributes = {};
        this.classNames = new Set();
        this.classList = {
            add: (...names) => names.forEach(name => this.classNames.add(name)),
            remove: (...names) => names.forEach(name => this.classNames.delete(name)),
            toggle: (name, force) => {
                const enabled = force === undefined ? !this.classNames.has(name) : force;
                if (enabled) this.classNames.add(name);
                else this.classNames.delete(name);
                return enabled;
            }
        };
        this.content = "";
        this.textContent = "";
    }

    append(...items) {
        this.children.push(...items);
    }

    prepend(...items) {
        this.children.unshift(...items);
    }

    replaceChildren(...items) {
        this.children = [...items];
    }

    addEventListener(name, callback) {
        this.listeners[name] = callback;
    }

    setAttribute(name, value) {
        this.attributes[name] = value;
    }
}

function createMap() {
    return {
        layers: [],
        setView() {
            return this;
        },
        addLayer(layer) {
            this.layers.push(layer);
        },
        removeLayer(layer) {
            this.layers = this.layers.filter(item => item !== layer);
        },
        fitBounds() {},
        invalidateSize() {},
        on() {},
        flyTo() {}
    };
}

function createVector() {
    return {
        addTo(target) {
            if (typeof target.addLayer === "function") target.addLayer(this);
            else target.layers.push(this);
            return this;
        },
        bindPopup() {
            return this;
        },
        on() {
            return this;
        },
        openPopup() {
            return this;
        },
        setLatLng() {
            return this;
        }
    };
}

function createLeaflet(map) {
    return {
        map() {
            return map;
        },
        tileLayer() {
            return createVector();
        },
        layerGroup() {
            return {
                items: [],
                addTo(target) {
                    target.addLayer(this);
                    return this;
                },
                addLayer(layer) {
                    this.items.push(layer);
                    return this;
                },
                clearLayers() {
                    this.items = [];
                }
            };
        },
        circleMarker() {
            return createVector();
        },
        polyline() {
            return createVector();
        },
        marker() {
            return createVector();
        },
        divIcon() {
            return {};
        }
    };
}

function createDocument(elements, selectors = {}) {
    return {
        title: "",
        getElementById(id) {
            return elements[id] || null;
        },
        querySelector(selector) {
            if (selector.startsWith("meta[")) return new FakeElement("meta");
            return elements[selector.replace(/^#/, "")] || null;
        },
        querySelectorAll(selector) {
            return selectors[selector] || [];
        },
        createElement(tagName) {
            return new FakeElement(tagName);
        },
        createTextNode(value) {
            const node = new FakeElement("text");
            node.textContent = value;
            return node;
        }
    };
}

function createElements(ids) {
    return Object.fromEntries(ids.map(id => [id, new FakeElement(id)]));
}

async function settle() {
    await new Promise(resolve => setTimeout(resolve, 0));
}

function getTree(rootElement) {
    return [rootElement, ...rootElement.children.flatMap(getTree)];
}

function parseArabicNumber(value) {
    const digits = "٠١٢٣٤٥٦٧٨٩";
    return Number(String(value).replace(/[٠-٩]/g, digit => String(digits.indexOf(digit))).replace(/[^\d-]/g, ""));
}

async function testAtlas() {
    const umayyad = JSON.parse(fs.readFileSync(path.join(root, "umayyad/data.json"), "utf8"));
    const rashidun = JSON.parse(fs.readFileSync(path.join(root, "rashidun/data.json"), "utf8"));
    const ids = [
        "historical-atlas-map", "atlas-status", "atlas-year", "atlas-year-label", "atlas-time-count",
        "atlas-event-list", "atlas-result-count", "atlas-battle-detail", "atlas-experience-select",
        "atlas-experience-start", "atlas-experience-toggle", "atlas-experience-previous",
        "atlas-experience-next", "atlas-motion-demo", "atlas-experience-timeline", "atlas-experience-output", "atlas-guide-form",
        "atlas-guide-question", "atlas-guide-answer"
    ];
    const elements = createElements(ids);
    elements["atlas-year"].value = "750";
    const layerInputs = ["cities", "battles", "states", "conquests", "tradeRoutes", "armyMovements"]
        .map((value, index) => {
            const input = new FakeElement(value);
            input.value = value;
            input.checked = index < 2;
            return input;
        });
    const errors = [];
    const map = createMap();
    const window = {
        location: { search: "", href: "https://example.test/website/maps.html" },
        requestAnimationFrame() { return 1; },
        cancelAnimationFrame() {},
        setInterval() { return 1; },
        clearInterval() {},
        setTimeout() { return 1; }
    };
    const context = {
        document: createDocument(elements, { "#atlas-layers input": layerInputs }),
        window,
        L: createLeaflet(map),
        URL,
        URLSearchParams,
        console: { error(...args) { errors.push(args); } },
        fetch: async file => ({
            ok: true,
            json: async () => file.includes("umayyad") ? umayyad : rashidun
        })
    };
    vm.runInNewContext(
        fs.readFileSync(path.join(root, "website/atlas.js"), "utf8"),
        context,
        { filename: "website/atlas.js" }
    );
    await settle();
    assert.equal(errors.length, 0, "atlas should load without runtime errors");
    assert.ok(elements["atlas-event-list"].children.length > 0, "atlas should render geolocated events");
    assert.equal(elements["atlas-experience-select"].children.length, 18, "atlas should expose all curated battles");

    elements["atlas-experience-select"].value = "rash-event-yarmouk";
    elements["atlas-experience-start"].listeners.click();
    assert.ok(elements["atlas-experience-output"].children.length > 0, "experience mode should render a scene");
    assert.equal(elements["atlas-experience-timeline"].children.length, 6, "each battle should expose the six-part narrative timeline");
    assert.equal(elements["atlas-experience-output"].children[1].textContent, "الوضع السياسي قبل المعركة");
    elements["atlas-experience-timeline"].children[1].children[0].listeners.click();
    assert.equal(elements["atlas-experience-output"].children[1].textContent, "مواقع الجيوش", "the timeline should navigate to army-position context");
    assert.match(elements["atlas-experience-output"].children[4].textContent, /لا يمكن تقدير أثر تمركز/);
    elements["atlas-experience-timeline"].children[2].children[0].listeners.click();
    assert.match(elements["atlas-experience-output"].children[2].textContent, /لا يتضمن هذا الإصدار مسار تحرك موثقًا/);
    assert.ok(
        elements["atlas-battle-detail"].children.some(child => child.textContent === "أعداد الجيوش"),
        "every battle view should expose an army-strength field"
    );
    elements["atlas-motion-demo"].listeners.click();
    assert.equal(elements["atlas-motion-demo"].disabled, false, "movement demo should be available with Leaflet");
    assert.equal(elements["atlas-motion-demo"].textContent, "أوقف الحركة التجريبية");
    elements["atlas-motion-demo"].listeners.click();
    assert.equal(elements["atlas-motion-demo"].textContent, "جرّب حركة توضيحية");

    elements["atlas-guide-question"].value = "\u0627\u0644\u064a\u0631\u0645\u0648\u0643";
    elements["atlas-guide-form"].listeners.submit({ preventDefault() {} });
    assert.ok(elements["atlas-guide-answer"].children.length > 0, "local guide should return related source records");

    layerInputs[2].checked = true;
    layerInputs[2].listeners.change();
    assert.equal(errors.length, 0, "changing atlas layers should not raise runtime errors");
}

async function testRashidunPage() {
    const data = JSON.parse(fs.readFileSync(path.join(root, "rashidun/data.json"), "utf8"));
    const ids = [
        "rashidun-status", "rashidun-caliph-cards", "rashidun-events", "rashidun-places",
        "rashidun-reference-cards", "rashidun-map-canvas", "rashidun-year", "rashidun-current-year",
        "rashidun-event-count", "rashidun-place-count"
    ];
    const elements = createElements(ids);
    elements["rashidun-year"].value = "661";
    const counts = ["caliphs", "events", "places", "battles"].map(key => {
        const element = new FakeElement();
        element.dataset.rashidunCount = key;
        return element;
    });
    const errors = [];
    const context = {
        document: createDocument(elements, { "[data-rashidun-count]": counts }),
        window: {},
        L: createLeaflet(createMap()),
        console: { error(...args) { errors.push(args); } },
        fetch: async () => ({ ok: true, json: async () => data })
    };
    vm.runInNewContext(
        fs.readFileSync(path.join(root, "website/rashidun.js"), "utf8"),
        context,
        { filename: "website/rashidun.js" }
    );
    await settle();
    assert.equal(errors.length, 0, "Rashidun page should load without runtime errors");
    assert.equal(elements["rashidun-caliph-cards"].children.length, 4);
    assert.equal(elements["rashidun-events"].children.length, 27);
    assert.equal(elements["rashidun-places"].children.length, 18);
    elements["rashidun-year"].value = "632";
    elements["rashidun-year"].listeners.input();
    assert.ok(elements["rashidun-events"].children.length < 27, "timeline slider should filter future events");
}

async function testVisualHistoryPage() {
    const globalPeople = JSON.parse(fs.readFileSync(path.join(root, "people/people.json"), "utf8"));
    const globalEvents = JSON.parse(fs.readFileSync(path.join(root, "events/events.json"), "utf8"));
    const umayyad = JSON.parse(fs.readFileSync(path.join(root, "umayyad/data.json"), "utf8"));
    const rashidun = JSON.parse(fs.readFileSync(path.join(root, "rashidun/data.json"), "utf8"));
    const ids = [
        "visual-gallery", "visual-search", "visual-result-count", "visual-inspector-title",
        "visual-record-art", "visual-record-info", "visual-record-link", "visual-map",
        "visual-map-precision", "visual-map-note", "visual-atlas-link", "visual-detail-timeline",
        "visual-timeline-period", "visual-related-events", "visual-count-people", "visual-count-cities",
        "visual-count-battles", "visual-count-states"
    ];
    const elements = createElements(ids);
    const filterButtons = ["all", "person", "city", "battle", "state"].map(type => {
        const button = new FakeElement(type);
        button.dataset.visualType = type;
        return button;
    });
    const errors = [];
    const map = createMap();
    const window = {
        setTimeout() { return 1; }
    };
    const leaflet = createLeaflet(map);
    window.L = leaflet;
    const context = {
        document: createDocument(elements, { "[data-visual-type]": filterButtons }),
        window,
        L: leaflet,
        console: { error(...args) { errors.push(args); } },
        fetch: async file => ({
            ok: true,
            json: async () => file.includes("people/people") ? globalPeople
                : file.includes("events/events") ? globalEvents
                    : file.includes("umayyad") ? umayyad : rashidun
        })
    };
    vm.runInNewContext(
        fs.readFileSync(path.join(root, "website/visual-system.js"), "utf8"),
        context,
        { filename: "website/visual-system.js" }
    );
    vm.runInNewContext(
        fs.readFileSync(path.join(root, "website/visual-history.js"), "utf8"),
        context,
        { filename: "website/visual-history.js" }
    );
    await settle();
    assert.equal(errors.length, 0, "visual history should load without runtime errors");
    assert.ok(parseArabicNumber(elements["visual-count-people"].textContent) >= 50);
    assert.ok(parseArabicNumber(elements["visual-count-cities"].textContent) >= 30);
    assert.equal(parseArabicNumber(elements["visual-count-battles"].textContent), 18);
    assert.equal(parseArabicNumber(elements["visual-count-states"].textContent), 5);
    filterButtons[3].listeners.click();
    assert.equal(elements["visual-gallery"].children.length, 18, "battle filter should show all current battle records");
    elements["visual-gallery"].children[0].children[0].listeners.click();
    assert.ok(elements["visual-record-info"].children.length > 0, "selecting a record should populate its encyclopedia card");
    assert.ok(elements["visual-detail-timeline"].children.length > 0, "selected records should show a timeline");
}

async function testBookDetailPage() {
    const books = JSON.parse(fs.readFileSync(path.join(root, "books/books.json"), "utf8"));
    const people = JSON.parse(fs.readFileSync(path.join(root, "people/people.json"), "utf8"));
    const events = JSON.parse(fs.readFileSync(path.join(root, "events/events.json"), "utf8"));
    const umayyad = JSON.parse(fs.readFileSync(path.join(root, "umayyad/data.json"), "utf8"));
    const rashidun = JSON.parse(fs.readFileSync(path.join(root, "rashidun/data.json"), "utf8"));
    const book = books.find(item => item.cover);
    const detail = new FakeElement("detail");
    detail.hidden = true;
    const status = new FakeElement("book-detail-status");
    const elements = { "[data-book-detail]": detail, "book-detail-status": status };
    const errors = [];
    const window = { location: { search: `?id=${encodeURIComponent(book.id)}` } };
    const context = {
        document: createDocument(elements),
        window,
        URL,
        URLSearchParams,
        console: { error(...args) { errors.push(args); } },
        fetch: async file => ({
            ok: true,
            json: async () => file.includes("books/books") ? books
                : file.includes("people/people") ? people
                    : file.includes("events/events") ? events
                        : file.includes("umayyad") ? umayyad : rashidun
        })
    };
    vm.runInNewContext(
        fs.readFileSync(path.join(root, "website/book-covers.js"), "utf8"),
        context,
        { filename: "website/book-covers.js" }
    );
    vm.runInNewContext(
        fs.readFileSync(path.join(root, "website/book-detail.js"), "utf8"),
        context,
        { filename: "website/book-detail.js" }
    );
    await settle();
    assert.equal(errors.length, 0, "book detail should load without runtime errors");
    assert.equal(detail.hidden, false, "a selected original book should render");
    const nodes = getTree(detail);
    assert.equal(nodes.find(node => node.id === "book-detail-title").textContent, book.title);
    assert.ok(
        nodes.some(node => typeof node.className === "string"
            && node.className.startsWith("book-cover book-cover--detail book-cover-theme-")),
        "book detail should include its virtual cover"
    );
    assert.ok(nodes.some(node => node.className === "book-detail-section"), "book detail should render editorial sections");
    assert.ok(nodes.some(node => node.href && node.href.startsWith("people.html?q=")), "linked people should be searchable from the detail page");
    assert.ok(nodes.some(node => node.href && node.href.startsWith("events.html?q=")), "linked events should be searchable from the detail page");
    assert.equal(context.document.title, `${book.title} | مكتبة HistoriaOS`);

    const missingStatus = new FakeElement("book-detail-status");
    const missingDetail = new FakeElement("detail");
    missingDetail.hidden = true;
    const missingContext = {
        document: createDocument({ "[data-book-detail]": missingDetail, "book-detail-status": missingStatus }),
        window: { location: { search: "" } },
        URL,
        URLSearchParams,
        console: { error(...args) { errors.push(args); } },
        fetch: async () => { throw new Error("fetch should not be called without a book id"); }
    };
    vm.runInNewContext(
        fs.readFileSync(path.join(root, "website/book-detail.js"), "utf8"),
        missingContext,
        { filename: "website/book-detail.js" }
    );
    await settle();
    assert.match(missingStatus.textContent, /لم يُحدَّد كتاب/);
    assert.equal(missingDetail.hidden, true, "missing IDs should not render a success-shaped empty detail");
}

async function testBookCollectionLinks() {
    const books = JSON.parse(fs.readFileSync(path.join(root, "books/books.json"), "utf8"));
    const collection = new FakeElement("book-collection");
    collection.dataset.collection = "books";
    const errors = [];
    const context = {
        document: createDocument({}, {
            "[data-collection]": [collection],
            '[data-collection="books"]': [collection]
        }),
        window: {},
        URL,
        console: { error(...args) { errors.push(args); } },
        fetch: async () => ({ ok: true, json: async () => books })
    };
    vm.runInNewContext(
        fs.readFileSync(path.join(root, "website/book-covers.js"), "utf8"),
        context,
        { filename: "website/book-covers.js" }
    );
    vm.runInNewContext(
        fs.readFileSync(path.join(root, "website/app.js"), "utf8"),
        context,
        { filename: "website/app.js" }
    );
    await settle();
    assert.equal(errors.length, 0, "book collection should load without runtime errors");
    assert.equal(collection.children.length, 100, "all catalog records should remain visible");
    const detailedCards = collection.children.filter(card => card.className === "data-card book-card");
    assert.equal(detailedCards.length, 35, "only the original 35 books should receive detailed cards");
    assert.ok(detailedCards.every(card => getTree(card).some(node => node.className === "book-detail-link"
        && node.href.startsWith("book.html?id="))), "each enriched card should link to the reusable detail page");
    const remainingCards = collection.children.filter(card => card.className !== "data-card book-card");
    assert.equal(remainingCards.length, 65, "the other 65 book cards should remain present");
    assert.ok(remainingCards.every(card => !getTree(card).some(node => node.className === "book-detail-link")),
        "the other 65 books should not receive detail links");
}

(async () => {
    await testAtlas();
    await testRashidunPage();
    await testVisualHistoryPage();
    await testBookDetailPage();
    await testBookCollectionLinks();
    console.log("Interactive page runtime tests passed.");
})().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
