import tippy from "tippy.js";
import "tippy.js/dist/tippy.css";

function buildTooltipContent(node) {
    const d = node.data();

    const div = document.createElement("div");
    div.innerHTML = `
        <div class="cy-tooltip">
            <div><strong>${d.orgName ?? "(no label)"}</strong></div>
        </div>
    `;
    return div;
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