export function initSidebarTabs({
                                    tabSettingsId = "tabSettings",
                                    tabInfoId = "tabInfo",
                                    panelSettingsId = "panelSettings",
                                    panelInfoId = "panelInfo",
                                    defaultTab = "settings", // "settings" | "info"
                                } = {}) {
    const tabSettings = document.getElementById(tabSettingsId);
    const tabInfo = document.getElementById(tabInfoId);
    const panelSettings = document.getElementById(panelSettingsId);
    const panelInfo = document.getElementById(panelInfoId);

    // Fail soft (app still works if sidebar not present)
    if (!tabSettings || !tabInfo || !panelSettings || !panelInfo) {
        console.warn("[tabs] Missing tab elements; skipping initSidebarTabs()");
        return { activate: () => {} };
    }

    const activate = (which) => {
        const isSettings = which === "settings";

        tabSettings.classList.toggle("active", isSettings);
        tabInfo.classList.toggle("active", !isSettings);

        tabSettings.setAttribute("aria-selected", String(isSettings));
        tabInfo.setAttribute("aria-selected", String(!isSettings));

        panelSettings.hidden = !isSettings;
        panelInfo.hidden = isSettings;
    };

    tabSettings.addEventListener("click", () => activate("settings"));
    tabInfo.addEventListener("click", () => activate("info"));

    // Optional keyboard nicety
    tabSettings.addEventListener("keydown", (e) => {
        if (e.key === "ArrowRight") tabInfo.focus();
    });
    tabInfo.addEventListener("keydown", (e) => {
        if (e.key === "ArrowLeft") tabSettings.focus();
    });

    activate(defaultTab);

    return { activate };
}