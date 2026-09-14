export function initInfoModal({
    modalId = "infoModal",
    openButtonId = "btnInfoSeeAll",
    closeButtonId = "btnInfoModalClose",
    backdropId = "infoModalBackdrop",
    graphPanelId = "infoModalGraphPanel",
} = {}) {
    const modal = document.getElementById(modalId);
    const openButton = document.getElementById(openButtonId);
    const closeButton = document.getElementById(closeButtonId);
    const backdrop = document.getElementById(backdropId);
    const graphPanel = document.getElementById(graphPanelId);

    if (!modal || !openButton || !closeButton || !backdrop || !graphPanel) {
        console.warn("[infoModal] Missing modal elements; skipping initInfoModal()");
        return { open: () => {}, close: () => {} };
    }

    const close = () => {
        modal.hidden = true;
        document.body.classList.remove("modal-open");
    };

    const open = () => {
        graphPanel.removeAttribute("open");
        modal.hidden = false;
        document.body.classList.add("modal-open");
    };

    openButton.addEventListener("click", open);
    closeButton.addEventListener("click", close);
    backdrop.addEventListener("click", close);

    document.addEventListener("keydown", (evt) => {
        if (evt.key === "Escape" && !modal.hidden) {
            close();
        }
    });

    return { open, close };
}

export function initAboutModal({
    modalId = "aboutModal",
    openButtonId = "btnAbout",
    closeButtonId = "btnAboutModalClose",
    backdropId = "aboutModalBackdrop",
} = {}) {
    const modal = document.getElementById(modalId);
    const openButton = document.getElementById(openButtonId);
    const closeButton = document.getElementById(closeButtonId);
    const backdrop = document.getElementById(backdropId);

    if (!modal || !openButton || !closeButton || !backdrop) {
        console.warn("[aboutModal] Missing modal elements; skipping initAboutModal()");
        return { open: () => {}, close: () => {} };
    }

    const close = () => {
        modal.hidden = true;
        document.body.classList.remove("modal-open");
    };

    const open = () => {
        modal.hidden = false;
        document.body.classList.add("modal-open");
    };

    openButton.addEventListener("click", open);
    closeButton.addEventListener("click", close);
    backdrop.addEventListener("click", close);

    document.addEventListener("keydown", (evt) => {
        if (evt.key === "Escape" && !modal.hidden) {
            close();
        }
    });

    return { open, close };
}
