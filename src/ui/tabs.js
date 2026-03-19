export function initSidebarTabs({
                                    tabSettingsId = "tabSettings",
                                    tabInfoId = "tabInfo",
                                    tabExportId = "tabExport",
                                    tabSearchId = "tabSearch",
                                    panelSettingsId = "panelSettings",
                                    panelInfoId = "panelInfo",
                                    panelExportId = "panelExport",
                                    panelSearchId = "panelSearch",
                                    defaultTab = "settings", // "settings" | "info" | "search"
                                } = {}) {
    const tabSettings = document.getElementById(tabSettingsId);
    const tabInfo = document.getElementById(tabInfoId);
    const tabExport = document.getElementById(tabExportId);
    const tabSearch = document.getElementById(tabSearchId);

    const panelSettings = document.getElementById(panelSettingsId);
    const panelInfo = document.getElementById(panelInfoId);
    const panelExport = document.getElementById(panelExportId);
    const panelSearch = document.getElementById(panelSearchId);

    if (!tabSettings || !tabInfo || !tabExport || !tabSearch ||
        !panelSettings || !panelInfo || !panelExport || !panelSearch) {
        console.warn("[tabs] Missing tab elements; skipping initSidebarTabs()");
        return { activate: () => {} };
    }

    const activate = (which) => {
        const isSettings = which === "settings";
        const isInfo = which === "info";
        const isExport = which === "export";
        const isSearch = which === "search";

        tabSettings.classList.toggle("active", isSettings);
        tabInfo.classList.toggle("active", isInfo);
        tabExport.classList.toggle("active", isExport);
        tabSearch.classList.toggle("active", isSearch);

        tabSettings.setAttribute("aria-selected", String(isSettings));
        tabInfo.setAttribute("aria-selected", String(isInfo));
        tabExport.setAttribute("aria-selected", String(isExport));
        tabSearch.setAttribute("aria-selected", String(isSearch));

        panelSettings.hidden = !isSettings;
        panelInfo.hidden = !isInfo;
        panelExport.hidden = !isExport;
        panelSearch.hidden = !isSearch;
    };

    tabSettings.addEventListener("click", () => activate("settings"));
    tabInfo.addEventListener("click", () => activate("info"));
    tabExport.addEventListener("click", () => activate("export"));
    tabSearch.addEventListener("click", () => activate("search"));

    // Keyboard navigation (simple linear)
    tabSettings.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") tabInfo.focus();
    });
    tabInfo.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") tabExport.focus();
        if (e.key === "ArrowLeft") tabSettings.focus();
    });
    tabExport.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") tabSearch.focus();
        if (e.key === "ArrowLeft") tabInfo.focus();
    });
    tabSearch.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") tabExport.focus();
    });

    activate(defaultTab);

    return { activate };
}
