(function () {
    const themes = new Set(["emerald", "sand", "lapis", "copper", "burgundy", "sage", "teal", "claret"]);

    function textElement(tagName, className, value) {
        const element = document.createElement(tagName);
        element.className = className;
        element.textContent = value;
        return element;
    }

    function createCover(book, size) {
        const cover = book.cover || {};
        const theme = themes.has(cover.theme) ? cover.theme : "sand";
        const figure = document.createElement("figure");
        figure.className = `book-cover book-cover--${size || "card"} book-cover-theme-${theme}`;
        figure.setAttribute("aria-label", `غلاف افتراضي توضيحي لكتاب ${book.title}`);
        figure.append(textElement("span", "book-cover-overline", "HISTORIAOS · المكتبة التاريخية"));
        figure.append(textElement("span", "book-cover-ornament", ""));
        figure.append(textElement("span", "book-cover-title", book.title || "كتاب تاريخي"));
        figure.append(textElement("span", "book-cover-author", book.author || ""));
        figure.append(textElement("figcaption", "book-cover-caption", cover.label || "غلاف افتراضي توضيحي"));
        return figure;
    }

    window.HistoriaBookCovers = Object.freeze({ create: createCover });
})();
