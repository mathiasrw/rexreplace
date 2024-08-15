var font = {};
font.yellow = font.red = font.green = font.gray = function(str) {
    return str;
};
// check for node version supporting chalk - if so overwrite `font`
//font = import('chalk');
var conf = null;
export var outputConfig = function outputConfig(_conf) {
    conf = _conf;
};
export var info = function info(msg) {
    var data = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : '';
    if ((conf === null || conf === void 0 ? void 0 : conf.quiet) || (conf === null || conf === void 0 ? void 0 : conf.quietTotal)) {
        return;
    }
    if ((conf === null || conf === void 0 ? void 0 : conf.output) || (conf === null || conf === void 0 ? void 0 : conf.outputMatch)) {
        return console.error.apply(this, [
            font.gray(msg),
            data
        ].filter(Boolean));
    }
    console.log.apply(this, [
        msg,
        data
    ].filter(Boolean));
};
export var chat = function chat(msg) {
    var data = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : '';
    if ((conf === null || conf === void 0 ? void 0 : conf.verbose) && !((conf === null || conf === void 0 ? void 0 : conf.output) || (conf === null || conf === void 0 ? void 0 : conf.outputMatch))) {
        info(msg, data);
    } else {
        debug([
            msg,
            data
        ].filter(Boolean).join(' '));
    }
};
export var error = function error(msg) {
    var data = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : '';
    if (!(conf === null || conf === void 0 ? void 0 : conf.quietTotal)) {
        console.error.apply(this, [
            ' ❌',
            font.red(msg),
            data
        ].filter(Boolean));
    }
    if (conf === null || conf === void 0 ? void 0 : conf.bail) {
        return kill();
    }
    return false;
};
export var warn = function warn(msg) {
    var data = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : '';
    if (!(conf === null || conf === void 0 ? void 0 : conf.quiet) && !(conf === null || conf === void 0 ? void 0 : conf.quietTotal)) {
        console.warn.apply(this, [
            ' 🟡',
            font.yellow(msg),
            data
        ].filter(Boolean));
    }
    return false;
};
export var die = function die() {
    var msg = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : '', data = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : '', displayHelp = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : false;
    if (displayHelp && !(conf === null || conf === void 0 ? void 0 : conf.quietTotal)) {
        conf === null || conf === void 0 ? void 0 : conf.showHelp();
    }
    msg && error(msg, data);
    kill();
};
export function debug() {
    for(var _len = arguments.length, data = new Array(_len), _key = 0; _key < _len; _key++){
        data[_key] = arguments[_key];
    }
    if (conf === null || conf === void 0 ? void 0 : conf.debug) {
        console.error(font.gray(JSON.stringify(data, null, 4)));
    }
}
export function step(data) {
    if ((conf === null || conf === void 0 ? void 0 : conf.verbose) && !((conf === null || conf === void 0 ? void 0 : conf.output) || (conf === null || conf === void 0 ? void 0 : conf.quiet) || !(conf === null || conf === void 0 ? void 0 : conf.quiet) || !(conf === null || conf === void 0 ? void 0 : conf.quietTotal))) {
        console.error(font.gray(data));
    }
}
function kill() {
    var error = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : 1, msg = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : '';
    if (!(conf === null || conf === void 0 ? void 0 : conf.quietTotal) && msg) {
        console.error(+msg);
    }
    process.exit(+error);
}
