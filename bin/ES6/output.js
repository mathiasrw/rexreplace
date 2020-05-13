let font = {};
font.red = font.green = font.gray = (str) => str;
// check for node version supporting chalk - if so overwrite `font`
//const font = import('chalk');
let config = null;
export const outputConfig = function (_config) {
    config = _config;
};
export const info = function (msg, data = '') {
    if (config.quiet || config.quietTotal) {
        return;
    }
    console.error(font.gray(msg), data);
};
export const chat = function (msg, data = '') {
    if (config.verbose) {
        info(msg, data);
    }
    else {
        debug(msg + ' ' + data);
    }
};
export const die = function (msg, data = '', displayHelp = false) {
    if (displayHelp && !config.quietTotal) {
        config.showHelp();
    }
    error(msg, data);
    kill(msg);
};
export const error = function (msg, data = '') {
    if (!config.quiet && !config.quietTotal) {
        console.error(font.red(msg), data);
    }
    if (config.halt) {
        kill(msg);
    }
    return false;
};
export function debug(data) {
    if (config.debug) {
        console.error(font.gray(JSON.stringify(data, null, 4)));
    }
}
export function step(data) {
    if (config.verbose) {
        debug(data);
    }
}
function kill(msg = '', error = 1) {
    process.exitCode = error;
    throw new Error(msg);
}
