(function () {
    const gallery = document.getElementById("media-gallery-grid");
    const dialog = document.getElementById("media-gallery-dialog");
    const dialogTitle = document.getElementById("media-gallery-dialog-title");
    const dialogImage = document.getElementById("media-gallery-dialog-image");
    const dialogCaption = document.getElementById("media-gallery-dialog-caption");
    const closeButton = document.getElementById("media-gallery-close");
    const filterButtons = Array.from(document.querySelectorAll("[data-media-filter]"));
    if (!gallery || !dialog || !dialogTitle || !dialogImage || !dialogCaption || !closeButton) return;

    const media = [
        {
            id: "antique-map",
            type: "maps",
            label: "خريطة",
            title: "أطلس قديم الطابع",
            src: "../assets/maps/antique-map.svg",
            alt: "خريطة توضيحية قديمة الطابع، لا تمثل حدودًا أو طرقًا تاريخية دقيقة.",
            caption: "رسم أصلي بملامح خرائطية قديمة؛ لا يحدد حدودًا أو طرقًا تاريخية."
        },
        {
            id: "army-symbols",
            type: "battles",
            label: "معارك",
            title: "رموز الجيوش",
            src: "../assets/battles/army-symbols.svg",
            alt: "رموز هندسية عامة لجيشين، لا تمثل رايات أو تشكيلات تاريخية بعينها.",
            caption: "رموز تعليمية عامة؛ لا تمثل تشكيلات أو رايات تاريخية."
        },
        {
            id: "battle-map",
            type: "battles",
            label: "معارك",
            title: "مشهد تخطيطي لمعركة",
            src: "../assets/images/battle-map.svg",
            alt: "مخطط خرائطي توضيحي لمعركة لا يثبت مواقع الجيوش أو تحركاتها.",
            caption: "تصور بصري تخطيطي، وليس خريطة معركة موثقة."
        },
        {
            id: "person",
            type: "people",
            label: "شخصيات",
            title: "صورة رمزية للشخصية",
            src: "../assets/images/person-portrait.svg",
            alt: "هيئة تجريدية لا تمثل ملامح شخصية تاريخية بعينها.",
            caption: "رسم تجريدي؛ لا يدعي تمثيل ملامح شخصية تاريخية."
        },
        {
            id: "city",
            type: "cities",
            label: "مدن",
            title: "مدينة تاريخية",
            src: "../assets/images/historical-city.svg",
            alt: "مشهد معماري رمزي لا يعيد بناء مدينة أثرية بعينها.",
            caption: "تصور معماري عام، وليس إعادة بناء أثرية."
        },
        {
            id: "state",
            type: "states",
            label: "دول",
            title: "رمز الدولة",
            src: "../assets/images/historical-state.svg",
            alt: "شارة هندسية تجريدية لا تمثل راية أو حدود دولة تاريخية.",
            caption: "علامة بصرية رمزية؛ لا تمثل راية أو حدودًا تاريخية."
        },
        {
            id: "event",
            type: "events",
            label: "أحداث",
            title: "خط الزمن",
            src: "../assets/images/historical-event.svg",
            alt: "تمثيل زمني تجريدي لحدث تاريخي، لا يصور الواقعة حرفيًا.",
            caption: "تمثيل بصري للسياق الزمني، وليس صورة أرشيفية."
        }
    ];

    function createCard(item) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "media-gallery-card";
        button.dataset.mediaType = item.type;
        const image = document.createElement("img");
        image.src = item.src;
        image.alt = item.alt;
        image.loading = "lazy";
        image.decoding = "async";
        button.append(image);
        const caption = document.createElement("span");
        caption.className = "media-gallery-card-caption";
        caption.append(Object.assign(document.createElement("small"), { textContent: item.label }));
        caption.append(Object.assign(document.createElement("strong"), { textContent: item.title }));
        button.append(caption);
        button.addEventListener("click", () => openMedia(item));
        return button;
    }

    function openMedia(item) {
        dialogTitle.textContent = item.title;
        dialogImage.src = item.src;
        dialogImage.alt = item.alt;
        dialogCaption.textContent = item.caption;
        if (typeof dialog.showModal === "function") dialog.showModal();
        else dialog.setAttribute("open", "");
    }

    function render(filter) {
        const visibleMedia = filter === "all" ? media : media.filter(item => item.type === filter);
        gallery.replaceChildren(...visibleMedia.map(createCard));
        filterButtons.forEach(button => {
            const active = button.dataset.mediaFilter === filter;
            button.setAttribute("aria-pressed", String(active));
            button.classList.toggle("is-active", active);
        });
    }

    filterButtons.forEach(button => button.addEventListener("click", () => render(button.dataset.mediaFilter)));
    closeButton.addEventListener("click", () => {
        if (typeof dialog.close === "function") dialog.close();
        else dialog.removeAttribute("open");
    });
    dialog.addEventListener("click", event => {
        if (event.target === dialog) {
            if (typeof dialog.close === "function") dialog.close();
            else dialog.removeAttribute("open");
        }
    });
    render("all");
})();
