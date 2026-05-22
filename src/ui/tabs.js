export function initSidebarTabs({
    defaultTab = "controls",
} = {}) {
    const tabIds = ["filters", "controls", "info", "export", "search"];

    const entries = tabIds.map((key) => ({
        key,
        tab: document.getElementById(`tab${key.charAt(0).toUpperCase()}${key.slice(1)}`),
        panel: document.getElementById(`panel${key.charAt(0).toUpperCase()}${key.slice(1)}`),
    }));

    if (entries.some(({ tab, panel }) => !tab || !panel)) {
        console.warn("[tabs] Missing tab elements; skipping initSidebarTabs()");
        return { activate: () => {} };
    }

    const activate = (which) => {
        for (const entry of entries) {
            const isActive = entry.key === which;
            entry.tab.classList.toggle("active", isActive);
            entry.tab.setAttribute("aria-selected", String(isActive));
            entry.panel.hidden = !isActive;
        }
    };

    entries.forEach((entry, index) => {
        entry.tab.addEventListener("click", () => activate(entry.key));
        entry.tab.addEventListener("keydown", (e) => {
            if (e.key === "ArrowRight") {
                entries[(index + 1) % entries.length].tab.focus();
            }
            if (e.key === "ArrowLeft") {
                entries[(index - 1 + entries.length) % entries.length].tab.focus();
            }
        });
    });

    activate(defaultTab);

    return { activate };
}
