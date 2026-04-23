export function initInfoModal({
    modalId = "infoModal",
    openButtonId = "btnInfoSeeAll",
    closeButtonId = "btnInfoModalClose",
    backdropId = "infoModalBackdrop",
} = {}) {
    const modal = document.getElementById(modalId);
    const openButton = document.getElementById(openButtonId);
    const closeButton = document.getElementById(closeButtonId);
    const backdrop = document.getElementById(backdropId);

    if (!modal || !openButton || !closeButton || !backdrop) {
        console.warn("[infoModal] Missing modal elements; skipping initInfoModal()");
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
