/**
 * Simple logger utility to abstract away console calls.
 * Can be expanded later to integrate with external logging services
 * or to mute logs in production environments.
 */
export const logger = {
    info: (...args: unknown[]) => {
        if (process.env.NODE_ENV !== 'production') {
            console.info(...args);
        }
    },
    log: (...args: unknown[]) => {
        if (process.env.NODE_ENV !== 'production') {
            console.log(...args);
        }
    },
    warn: (...args: unknown[]) => {
        if (process.env.NODE_ENV !== 'production') {
            console.warn(...args);
        }
    },
    error: (...args: unknown[]) => {
        console.error(...args); // Errors typically should still be logged, or sent to a tracking service
    }
};
