import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";
import { createElement } from "../ui/dom.js";
import { resolveGridHeaderDefinition } from "./gridHeaderDefinitions.js";

function buildNodeTooltipContent(node) {
    const d = node.data();

    return createElement(document, "div", {}, [
        createElement(document, "div", { className: "cy-tooltip" }, [
            createElement(document, "div", {}, [
                createElement(document, "strong", {
                    text: d.orgName ?? "(no label)",
                }),
            ]),
        ]),
    ]);
}

function buildGridHeaderTooltipContent(node, menuDefinitions) {
    const data = node.data();
    const resolved = resolveGridHeaderDefinition(data, menuDefinitions);
    const label = resolved?.label || data.label || "(no label)";
    const title = resolved?.title || "Grid Header";
    const description = resolved?.categoryDefinition || resolved?.dimensionDefinition || "";

    const children = [
        createElement(document, "div", {}, [
            createElement(document, "strong", { text: label }),
        ]),
        createElement(document, "div", {
            className: "cy-tooltip-meta",
            text: title,
        }),
    ];

    if (description) {
        children.push(createElement(document, "div", { text: description }));
    }

    return createElement(document, "div", {}, [
        createElement(document, "div", { className: "cy-tooltip cy-tooltip-grid-header" }, children),
    ]);
}

function createTooltip(node, buildContent, options = {}) {
    const ref = node.popperRef();

    return tippy(document.body, {
        getReferenceClientRect: ref.getBoundingClientRect,
        content: buildContent(node),
        trigger: "manual",
        placement: "top",
        arrow: true,
        hideOnClick: false,
        interactive: false,
        appendTo: () => document.body,
        ...options,
    });
}

export function showTooltip(evt) {
    const node = evt.target;

    let tip = node.scratch("_tooltip");
    if (!tip) {
        tip = createTooltip(node, buildNodeTooltipContent);
        node.scratch("_tooltip", tip);
    }

    tip.setContent(buildNodeTooltipContent(node));
    tip.show();
}

export function showGridHeaderTooltip(evt) {
    const node = evt.target;
    const menuDefinitions = node.cy().scratch("_menuDefinitions") ?? {};
    const buildContent = (target) => buildGridHeaderTooltipContent(target, menuDefinitions);

    let tip = node.scratch("_gridHeaderTooltip");
    if (!tip) {
        tip = createTooltip(node, buildContent, {
            placement: "right",
            maxWidth: 320,
        });
        node.scratch("_gridHeaderTooltip", tip);
    }

    tip.setContent(buildContent(node));
    tip.show();
}

export function hideTooltip(evt) {
    const node = evt.target;
    const tip = node.scratch("_tooltip");
    if (tip) tip.hide();
}

export function hideGridHeaderTooltip(evt) {
    const node = evt.target;
    const tip = node.scratch("_gridHeaderTooltip");
    if (tip) tip.hide();
}
