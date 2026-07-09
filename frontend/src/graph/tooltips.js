import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";
import { createElement } from "../ui/dom.js";

function buildTooltipContent(node) {
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

function createTooltip(node) {
    const ref = node.popperRef();

    return tippy(document.body, {
        getReferenceClientRect: ref.getBoundingClientRect,
        content: buildTooltipContent(node),
        trigger: "manual",
        placement: "top",
        arrow: true,
        hideOnClick: false,
        interactive: false,
        appendTo: () => document.body,
    });
}

export function showTooltip(evt) {
    const node = evt.target;

    let tip = node.scratch("_tooltip");
    if (!tip) {
        tip = createTooltip(node);
        node.scratch("_tooltip", tip);
    }

    tip.setContent(buildTooltipContent(node));
    tip.show();
}

export function hideTooltip(evt) {
    const node = evt.target;
    const tip = node.scratch("_tooltip");
    if (tip) tip.hide();
}
