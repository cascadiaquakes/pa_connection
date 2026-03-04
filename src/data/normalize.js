export function slugify(s) {
    return String(s ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

export function normKey(s) {
    return String(s ?? "")
        .trim()
        .toLowerCase()
        .replace(/[\s\-_]+/g, "")
        .replace(/[^a-z0-9]/g, "");
}

export function uniq(values) {
    return Array.from(
        new Set(values.filter((v) => v != null && String(v).trim() !== ""))
    );
}

export function paletteColor(key) {
    const s = String(key ?? "unknown");
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    const hue = h % 360;
    return `hsl(${hue}, 60%, 55%)`;
}