(function () {
    const artworkFiles = {
        person: "person-portrait.svg",
        city: "historical-city.svg",
        battle: "battle-map.svg",
        state: "historical-state.svg",
        event: "historical-event.svg",
        map: "map-frame.svg"
    };
    const artworkCaveats = {
        person: "رسم تجريدي لا يدّعي تمثيل ملامح تاريخية.",
        city: "تصور معماري عام، لا إعادة بناء أثرية.",
        battle: "مخطط توضيحي، لا يثبت مواقع الجيوش أو تحركاتها.",
        state: "رمز بصري لا يمثل راية أو حدودًا سياسية تاريخية.",
        event: "تمثيل زمني لا يصوّر الواقعة حرفيًا.",
        map: "خريطة رمزية؛ راجع الموضع على الأطلس التفاعلي."
    };

    function textElement(tagName, className, value) {
        const element = document.createElement(tagName);
        if (className) element.className = className;
        element.textContent = value;
        return element;
    }

    function createArtwork(type, title, caption) {
        const artworkType = artworkFiles[type] ? type : "event";
        const figure = document.createElement("figure");
        figure.className = `visual-artwork visual-artwork-${artworkType}`;
        const image = document.createElement("img");
        image.src = `../assets/images/${artworkFiles[artworkType]}`;
        image.alt = `رسم توضيحي تجريدي: ${title}`;
        image.loading = "lazy";
        image.decoding = "async";
        figure.append(image);
        figure.append(textElement("figcaption", "visual-artwork-caption", caption || artworkCaveats[artworkType]));
        return figure;
    }

    function createTimeline(start, end, label) {
        const timeline = document.createElement("div");
        timeline.className = "visual-mini-timeline";
        timeline.dir = "ltr";
        const labelRow = document.createElement("div");
        labelRow.className = "visual-mini-timeline-labels";
        labelRow.append(textElement("span", "", Number.isFinite(start) ? `${start}م` : "التاريخ غير محدد"));
        labelRow.append(textElement("span", "", label || (Number.isFinite(end) && end !== start ? `${end}م` : "")));
        timeline.append(labelRow);

        const track = document.createElement("div");
        track.className = "visual-mini-timeline-track";
        if (Number.isFinite(start)) {
            const span = document.createElement("span");
            span.className = "visual-mini-timeline-span";
            span.style.left = `${Math.max(0, Math.min(100, ((start + 500) / 2500) * 100))}%`;
            if (Number.isFinite(end) && end > start) {
                span.style.width = `${Math.max(1, Math.min(100, ((end - start) / 2500) * 100))}%`;
            } else {
                span.classList.add("visual-mini-timeline-point");
            }
            track.append(span);
        }
        timeline.append(track);
        return timeline;
    }

    function createMapPreview(coordinates, label, href) {
        const panel = document.createElement("div");
        panel.className = "visual-map-preview";
        const image = document.createElement("img");
        image.src = `../assets/images/${artworkFiles.map}`;
        image.alt = "";
        image.setAttribute("aria-hidden", "true");
        image.loading = "lazy";
        image.decoding = "async";
        panel.append(image);
        const copy = document.createElement("div");
        copy.className = "visual-map-preview-copy";
        copy.append(textElement("strong", "", label || "خريطة الموضع"));
        copy.append(textElement(
            "span",
            "",
            Array.isArray(coordinates) && coordinates.length === 2
                ? `إحداثيات تقريبية: ${coordinates.map(value => Number(value).toFixed(2)).join("، ")}`
                : "لا تتوفر إحداثيات محررة لهذا السجل."
        ));
        if (href) {
            const link = document.createElement("a");
            link.href = href;
            link.textContent = "افتح الأطلس";
            copy.append(link);
        }
        panel.append(copy);
        return panel;
    }

    window.HistoriaVisualSystem = Object.freeze({
        createArtwork,
        createTimeline,
        createMapPreview,
        addArtwork(container, type, title, caption) {
            container.prepend(createArtwork(type, title, caption));
        }
    });
})();
