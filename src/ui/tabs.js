export function initSidebarTabs({
                                    tabSettingsId = "tabSettings",
                                    tabInfoId = "tabInfo",
                                    tabSearchId = "tabSearch",
                                    panelSettingsId = "panelSettings",
                                    panelInfoId = "panelInfo",
                                    panelSearchId = "panelSearch",
                                    defaultTab = "settings", // "settings" | "info" | "search"
                                } = {}) {
    const tabSettings = document.getElementById(tabSettingsId);
    const tabInfo = document.getElementById(tabInfoId);
    const tabSearch = document.getElementById(tabSearchId);

    const panelSettings = document.getElementById(panelSettingsId);
    const panelInfo = document.getElementById(panelInfoId);
    const panelSearch = document.getElementById(panelSearchId);

    if (!tabSettings || !tabInfo || !tabSearch ||
        !panelSettings || !panelInfo || !panelSearch) {
        console.warn("[tabs] Missing tab elements; skipping initSidebarTabs()");
        return { activate: () => {} };
    }

    const activate = (which) => {
        const isSettings = which === "settings";
        const isInfo = which === "info";
        const isSearch = which === "search";

        tabSettings.classList.toggle("active", isSettings);
        tabInfo.classList.toggle("active", isInfo);
        tabSearch.classList.toggle("active", isSearch);

        tabSettings.setAttribute("aria-selected", String(isSettings));
        tabInfo.setAttribute("aria-selected", String(isInfo));
        tabSearch.setAttribute("aria-selected", String(isSearch));

        panelSettings.hidden = !isSettings;
        panelInfo.hidden = !isInfo;
        panelSearch.hidden = !isSearch;
    };

    tabSettings.addEventListener("click", () => activate("settings"));
    tabInfo.addEventListener("click", () => activate("info"));
    tabSearch.addEventListener("click", () => activate("search"));

    // Keyboard navigation (simple linear)
    tabSettings.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") tabInfo.focus();
    });
    tabInfo.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") tabSearch.focus();
        if (e.key === "ArrowLeft") tabSettings.focus();
    });
    tabSearch.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") tabInfo.focus();
    });

    activate(defaultTab);

    return { activate };
}