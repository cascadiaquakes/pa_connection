export function publicAssetUrl(path) {
    const cleanPath = String(path ?? "").replace(/^\/+/, "");
    const viteBase = import.meta.env.BASE_URL || "/";

    if (viteBase !== "/") {
        return `${viteBase.replace(/\/?$/, "/")}${cleanPath}`;
    }

    return new URL(cleanPath, document.baseURI).toString();
}
