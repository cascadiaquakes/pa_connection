const SIDEBAR_WIDTH_KEY = "pa.sidebarWidth";

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

function getMaxWidth() {
    return Math.max(360, Math.floor(window.innerWidth * 0.6));
}

function setSidebarWidth(appEl, widthPx) {
    appEl.style.setProperty("--sidebar-width", `${Math.round(widthPx)}px`);
}

function loadStoredWidth() {
    const raw = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}

export function initSidebarResize({
    appId = "app",
    resizerId = "sidebarResizer",
    minWidth = 260,
    defaultWidth = 350,
    onResize = () => {},
} = {}) {
    const appEl = document.getElementById(appId);
    const resizerEl = document.getElementById(resizerId);

    if (!appEl || !resizerEl) {
        console.warn("[sidebarResize] Missing app or resizer element");
        return;
    }

    const initial = clamp(loadStoredWidth() ?? defaultWidth, minWidth, getMaxWidth());
    setSidebarWidth(appEl, initial);

    let dragging = false;

    const applyWidthFromPointer = (clientX) => {
        const next = clamp(clientX, minWidth, getMaxWidth());
        setSidebarWidth(appEl, next);
        localStorage.setItem(SIDEBAR_WIDTH_KEY, String(next));
        onResize();
    };

    const onPointerMove = (evt) => {
        if (!dragging) return;
        applyWidthFromPointer(evt.clientX);
    };

    const stopDragging = () => {
        if (!dragging) return;
        dragging = false;
        document.body.classList.remove("is-resizing");
    };

    resizerEl.addEventListener("pointerdown", (evt) => {
        dragging = true;
        document.body.classList.add("is-resizing");
        resizerEl.setPointerCapture?.(evt.pointerId);
    });

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("blur", stopDragging);

    window.addEventListener("resize", () => {
        const stored = loadStoredWidth() ?? defaultWidth;
        const clamped = clamp(stored, minWidth, getMaxWidth());
        setSidebarWidth(appEl, clamped);
        onResize();
    });
}
