export function dbg(scope) {
    const prefix = `[${scope}]`;
    const isLocalDevelopment = import.meta.env?.DEV === true &&
        typeof window !== "undefined" &&
        (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    const diagnostic = (...args) => {
        if (isLocalDevelopment) console.log(prefix, ...args);
    };
    return {
        log: diagnostic,
        warn: (...args) => { if (isLocalDevelopment) console.warn(prefix, ...args); },
        err: (...args) => { if (isLocalDevelopment) console.error(prefix, ...args); },
        group: (title) => { if (isLocalDevelopment) console.group(`${prefix} ${title}`); },
        groupEnd: () => { if (isLocalDevelopment) console.groupEnd(); },
    };
}
