#!/usr/bin/env node
function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
    try {
        var info = gen[key](arg);
        var value = info.value;
    } catch (error) {
        reject(error);
        return;
    }
    if (info.done) {
        resolve(value);
    } else {
        Promise.resolve(value).then(_next, _throw);
    }
}
function _async_to_generator(fn) {
    return function() {
        var self = this, args = arguments;
        return new Promise(function(resolve, reject) {
            var gen = fn.apply(self, args);
            function _next(value) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
            }
            function _throw(err) {
                asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
            }
            _next(undefined);
        });
    };
}
function _ts_generator(thisArg, body) {
    var f, y, t, g, _ = {
        label: 0,
        sent: function() {
            if (t[0] & 1) throw t[1];
            return t[1];
        },
        trys: [],
        ops: []
    };
    return g = {
        next: verb(0),
        "throw": verb(1),
        "return": verb(2)
    }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
    }), g;
    function verb(n) {
        return function(v) {
            return step([
                n,
                v
            ]);
        };
    }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while(_)try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [
                op[0] & 2,
                t.value
            ];
            switch(op[0]){
                case 0:
                case 1:
                    t = op;
                    break;
                case 4:
                    _.label++;
                    return {
                        value: op[1],
                        done: false
                    };
                case 5:
                    _.label++;
                    y = op[1];
                    op = [
                        0
                    ];
                    continue;
                case 7:
                    op = _.ops.pop();
                    _.trys.pop();
                    continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                        _ = 0;
                        continue;
                    }
                    if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                        _.label = op[1];
                        break;
                    }
                    if (op[0] === 6 && _.label < t[1]) {
                        _.label = t[1];
                        t = op;
                        break;
                    }
                    if (t && _.label < t[2]) {
                        _.label = t[2];
                        _.ops.push(op);
                        break;
                    }
                    if (t[2]) _.ops.pop();
                    _.trys.pop();
                    continue;
            }
            op = body.call(thisArg, _);
        } catch (e) {
            op = [
                6,
                e
            ];
            y = 0;
        } finally{
            f = t = 0;
        }
        if (op[0] & 5) throw op[1];
        return {
            value: op[0] ? op[1] : void 0,
            done: true
        };
    }
}
/// <reference types="node" />
import { cli2conf, executeReplacement } from '../cli.js';
import fs from 'fs-extra';
export var runtime = {
    fileReadSync: function(path) {
        var encoding = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 'utf8';
        return fs.readFileSync(path, {
            encoding: encoding
        });
    },
    fileReadAsync: function(path) {
        var encoding = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 'utf8';
        return fs.readFile(path, {
            encoding: encoding
        });
    },
    fileWriteSync: function(path, data) {
        var encoding = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 'utf8';
        return fs.writeFileSync(path, data, {
            encoding: encoding
        });
    },
    fileWriteAsync: function(path, data) {
        var encoding = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 'utf8';
        return fs.writeFile(path, data, {
            encoding: encoding
        });
    },
    fileDeleteSync: function(path) {
        return fs.unlinkSync(path);
    },
    fileDeleteAsync: function(path) {
        return fs.unlink(path);
    },
    fileCopySync: function(originalPath, destinationPath) {
        fs.copySync(originalPath, destinationPath);
    },
    fileCopyAsync: function() {
        var _ref = _async_to_generator(function(originalPath, destinationPath) {
            return _ts_generator(this, function(_state) {
                return [
                    2,
                    fs.copy(originalPath, destinationPath)
                ];
            });
        });
        return function(originalPath, destinationPath) {
            return _ref.apply(this, arguments);
        };
    }(),
    exit: process.exit
};
(function() {
    var conf = cli2conf(runtime, process.argv.slice(2));
    if (Boolean(process.stdin.isTTY)) return executeReplacement(runtime, conf);
    process.stdin.setEncoding(conf.encoding);
    var pipeData = null;
    process.stdin.on('readable', function() {
        var chunk = process.stdin.read();
        if (null !== chunk) {
            pipeData = chunk;
            while(chunk = process.stdin.read()){
                pipeData += chunk;
            }
        }
    });
    process.stdin.on('end', function() {
        return executeReplacement(runtime, conf, pipeData);
    });
})();
