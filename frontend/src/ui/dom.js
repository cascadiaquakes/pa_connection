export function clearElement(element) {
    element.replaceChildren();
}

export function createElement(
    documentRef,
    tagName,
    {
        className = "",
        text = null,
        attributes = {},
        dataset = {},
        style = {},
    } = {},
    children = []
) {
    const element = documentRef.createElement(tagName);
    if (className) element.className = className;
    if (text !== null) element.textContent = String(text);

    for (const [name, value] of Object.entries(attributes)) {
        element.setAttribute(name, String(value));
    }
    for (const [name, value] of Object.entries(dataset)) {
        element.dataset[name] = String(value);
    }
    Object.assign(element.style, style);
    element.append(...children);
    return element;
}

export function highlightedTextSegments(text, query) {
    const value = String(text ?? "");
    const needle = String(query ?? "").trim();
    if (!needle) return [{ text: value, highlighted: false }];

    const lowerValue = value.toLowerCase();
    const lowerNeedle = needle.toLowerCase();
    const segments = [];
    let offset = 0;

    while (offset < value.length) {
        const matchIndex = lowerValue.indexOf(lowerNeedle, offset);
        if (matchIndex === -1) {
            segments.push({
                text: value.slice(offset),
                highlighted: false,
            });
            break;
        }
        if (matchIndex > offset) {
            segments.push({
                text: value.slice(offset, matchIndex),
                highlighted: false,
            });
        }
        segments.push({
            text: value.slice(matchIndex, matchIndex + needle.length),
            highlighted: true,
        });
        offset = matchIndex + needle.length;
    }

    return segments;
}

export function appendHighlightedText(element, text, query, documentRef) {
    const doc = documentRef ?? element.ownerDocument ?? document;
    const nodes = highlightedTextSegments(text, query).map((segment) => {
        if (!segment.highlighted) return doc.createTextNode(segment.text);
        return createElement(doc, "mark", { text: segment.text });
    });
    element.append(...nodes);
}
