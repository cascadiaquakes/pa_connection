import assert from "node:assert/strict";
import test from "node:test";

import {
    escapeHtml,
    renderCard,
    renderInlineAction,
    setRenderedHtml,
} from "../src/info/infoRender.js";
import { highlightedTextSegments } from "../src/ui/dom.js";
import { renderColorLegend } from "../src/ui/colorLegend.js";
import { renderSearchResults } from "../src/ui/searchTab.js";

class FakeNode {
    constructor(ownerDocument, tagName = null, text = "") {
        this.ownerDocument = ownerDocument;
        this.tagName = tagName;
        this.textContent = text;
        this.children = [];
        this.className = "";
        this.dataset = {};
        this.style = {};
        this.attributes = {};
        this.listeners = {};
    }

    append(...children) {
        this.children.push(...children);
    }

    replaceChildren(...children) {
        this.children = children;
    }

    setAttribute(name, value) {
        this.attributes[name] = value;
    }

    addEventListener(name, listener) {
        this.listeners[name] = listener;
    }
}

class FakeDocument {
    createElement(tagName) {
        return new FakeNode(this, tagName);
    }

    createTextNode(text) {
        return new FakeNode(this, null, text);
    }
}

test("HTML rendering escapes labels, values, and inline action attributes", () => {
    assert.equal(
        escapeHtml(`<script>"x" & 'y'</script>`),
        "&lt;script&gt;&quot;x&quot; &amp; &#039;y&#039;&lt;/script&gt;"
    );

    const card = renderCard("Unsafe <title>", [
        ["Name", `<img src=x onerror="alert(1)">`],
        ["Website", "https://example.test/?a=1&b=<bad>"],
    ], { linkifyValues: true });

    assert.doesNotMatch(card, /<img/);
    assert.match(card, /Unsafe &lt;title&gt;/);
    assert.match(card, /href="https:\/\/example\.test\/\?a=1&amp;b="/);
    assert.match(card, /&lt;bad&gt;/);

    const action = renderInlineAction(
        `<Open & inspect>`,
        "data-select-node-id",
        `node-"1"`
    );
    assert.match(action, /data-select-node-id="node-&quot;1&quot;"/);
    assert.match(action, /&lt;Open &amp; inspect&gt;/);
    assert.throws(
        () => renderInlineAction("bad", `data-id" onclick="bad`, "x"),
        /Invalid data attribute/
    );

    const target = { innerHTML: "" };
    setRenderedHtml(target, card);
    assert.equal(target.innerHTML, card);
});

test("highlighting preserves source text and marks case-insensitive matches", () => {
    assert.deepEqual(
        highlightedTextSegments("<Alpha> alpha", "ALPHA"),
        [
            { text: "<", highlighted: false },
            { text: "Alpha", highlighted: true },
            { text: "> ", highlighted: false },
            { text: "alpha", highlighted: true },
        ]
    );
});

test("search results are constructed as DOM nodes and retain literal text", () => {
    const documentRef = new FakeDocument();
    const container = documentRef.createElement("div");
    const selected = [];

    renderSearchResults(
        container,
        [{
            id: `node-"1"`,
            title: `<Alpha & Co>`,
            subtitle: `Notes: <script>alert(1)</script>`,
        }],
        "alpha",
        (id) => selected.push(id)
    );

    assert.equal(container.children.length, 1);
    const item = container.children[0];
    assert.equal(item.tagName, "button");
    assert.equal(item.dataset.id, `node-"1"`);
    assert.equal(item.attributes.type, "button");
    assert.equal(item.children[0].children[1].tagName, "mark");
    assert.equal(item.children[0].children[1].textContent, "Alpha");
    assert.equal(item.children[1].children[0].textContent, "Notes: <script>alert(1)</script>");

    item.listeners.click();
    assert.deepEqual(selected, [`node-"1"`]);
});

test("legend rendering keeps category labels as literal DOM text", () => {
    const documentRef = new FakeDocument();
    const container = documentRef.createElement("div");

    renderColorLegend(container, {
        title: `Role <script>`,
        values: [`Provider <img onerror="bad">`],
        colors: { [`Provider <img onerror="bad">`]: "#123456" },
    });

    assert.equal(container.children[0].textContent, "Role <script> legend");
    const item = container.children[1].children[0];
    assert.equal(item.children[0].style.backgroundColor, "#123456");
    assert.equal(
        item.children[1].textContent,
        `Provider <img onerror="bad">`
    );
});
