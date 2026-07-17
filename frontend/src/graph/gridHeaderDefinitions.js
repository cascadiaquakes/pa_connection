const AXIS_DEFINITION_KEYS = {
    col: "orgCat",
    row: "geo",
};

function clean(value) {
    return String(value ?? "").trim();
}

export function gridDefinitionKeyForAxis(axis) {
    return AXIS_DEFINITION_KEYS[clean(axis)] ?? null;
}

export function resolveGridHeaderDefinition(headerData = {}, menuDefinitions = {}) {
    const definitionKey =
        clean(headerData.gridDefinitionKey) ||
        gridDefinitionKeyForAxis(headerData.gridAxis);
    if (!definitionKey) return null;

    const definition = menuDefinitions?.[definitionKey];
    if (!definition || typeof definition !== "object") return null;

    const label = clean(headerData.gridKey) || clean(headerData.label);
    if (!label) return null;

    return {
        key: definitionKey,
        label,
        title: clean(definition.title),
        dimensionDefinition: clean(definition.definition),
        categoryDefinition: clean(definition.categories?.[label]),
    };
}
