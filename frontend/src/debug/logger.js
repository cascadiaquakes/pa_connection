export function dbg(scope) {
    const prefix = `[${scope}]`;
    return {
        log: (...args) => console.log(prefix, ...args),
        warn: (...args) => console.warn(prefix, ...args),
        err: (...args) => console.error(prefix, ...args),
        group: (title) => console.group(`${prefix} ${title}`),
        groupEnd: () => console.groupEnd(),
    };
}