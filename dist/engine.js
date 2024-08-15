function _define_property(obj, key, value) {
    if (key in obj) {
        Object.defineProperty(obj, key, {
            value: value,
            enumerable: true,
            configurable: true,
            writable: true
        });
    } else {
        obj[key] = value;
    }
    return obj;
}
function _object_spread(target) {
    for(var i = 1; i < arguments.length; i++){
        var source = arguments[i] != null ? arguments[i] : {};
        var ownKeys = Object.keys(source);
        if (typeof Object.getOwnPropertySymbols === "function") {
            ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function(sym) {
                return Object.getOwnPropertyDescriptor(source, sym).enumerable;
            }));
        }
        ownKeys.forEach(function(key) {
            _define_property(target, key, source[key]);
        });
    }
    return target;
}
var fs = require('fs-extra');
var path = require('path');
var fGlob = require('fast-glob');
var globs = require('globs');
var now = new Date();
import { chat, debug, die, error, info, outputConfig, step } from './output.ts';
var re = {
    euro: /€/g,
    section: /§/g,
    mctime: /[mc]time/,
    colon: /:/g,
    capturedGroupRef: /\$\d/,
    regexSpecialChars: /[-\[\]{}()*+?.,\/\\^$|#\s]/g,
    byteOrSize: /bytes|size/,
    folderName: /[\\\/]+([^\\\/]+)[\\\/]+[^\\\/]+$/
};
export var version = 'PACKAGE_VERSION';
var runtime;
export function engine(_runtime) {
    var conf = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : {
        engine: 'V8'
    };
    runtime = _runtime;
    outputConfig(conf);
    step('Displaying steps for:');
    step(conf);
    conf.pattern = getPattern(conf.pattern, conf) || '';
    conf.replacement = getReplacement(conf.replacement, conf) || '';
    if (conf.replacementJs) conf.replacementOri = conf.replacement;
    conf.regex = getRegex(conf.pattern, conf) || '';
    step(conf);
    conf.files = getFilePaths(conf);
    if (!conf.files.length) {
        if (null !== conf.pipeData) {
            return doReplacement('[pipe-data]', conf, conf.pipeData);
        }
        return error(conf.files.length + ' files found');
    }
    chat(conf.files.length + ' files found');
    step(conf);
    conf.files// Find out if any filepaths are invalid
    .filter(function(filepath) {
        if (fs.statSync(filepath).isFile()) {
            return true;
        }
        debug('Not a valid file:', filepath);
        return false;
    })// Do the replacement
    .forEach(function(filepath) {
        return openFile(filepath, conf);
    });
}
function openFile(file, conf) {
    if (conf.voidAsync) {
        chat('Open sync: ' + file);
        var data = runtime.fileReadSync(file, conf.encoding);
        return doReplacement(file, conf, data);
    }
    chat('Open async: ' + file);
    fs.readFile(file, conf.encoding, function(err, data) {
        if (err) {
            return error(err);
        }
        return doReplacement(file, conf, data);
    });
}
// postfix argument names to limit the probabillity of user inputted javascript accidently using same values
function doReplacement(filePath, conf, content) {
    debug('Work on content from: ' + filePath);
    // Variables to be accessible from js.
    if (conf.replacementJs) {
        conf.replacement = dynamicReplacement(filePath, conf, content);
    }
    // Main regexp doing the replacement
    var result = content.replace(conf.regex, conf.replacement);
    // The output of matched strings is done from the replacement, so no need to continue
    if (conf.outputMatch) {
        return;
    }
    if (conf.output) {
        if (conf.verbose || conf.debug) {
            console.error(filePath);
        }
        return process.stdout.write(result);
    }
    // Nothing replaced = no need for writing file again
    if (result === content) {
        debug('Nothing changed in: ' + filePath);
        return;
    }
    // Release the memory while storing files
    content = '';
    if (conf.simulate) return info(filePath);
    debug('Write updated content to: ' + filePath);
    // Write directly to the same file (if the process is killed all new and old data is lost)
    if (conf.voidBackup) {
        return fs.writeFile(filePath, result, conf.encoding, function(err) {
            if (err) {
                return error(err);
            }
            return info(filePath);
        });
    }
    //Make sure data is always on disk
    var oriFile = path.normalize(path.join(process.cwd(), filePath));
    var salt = new Date().toISOString().replace(re.colon, '_').replace('Z', '');
    var backupFile = oriFile + '.' + salt + '.backup';
    if (conf.voidAsync) {
        try {
            fs.renameSync(oriFile, backupFile);
            fs.writeFileSync(oriFile, result, conf.encoding);
            if (!conf.keepBackup) {
                fs.unlinkSync(backupFile);
            }
        } catch (e) {
            return error(e);
        }
        return info(filePath);
    }
    // Let me know when fs gets promise'fied
    fs.rename(oriFile, backupFile, function(err) {
        if (err) {
            return error(err);
        }
        fs.writeFile(oriFile, result, conf.encoding, function(err) {
            if (err) {
                return error(err);
            }
            if (!conf.keepBackup) {
                return fs.unlink(backupFile, function(err) {
                    if (err) {
                        return error(err);
                    }
                    return info(filePath);
                });
            }
            return info(filePath);
        });
    });
}
function getPattern(pattern, conf) {
    step('Get final pattern');
    pattern = replacePlaceholders(pattern, conf);
    if (conf.literal) {
        pattern = pattern.replace(re.regexSpecialChars, '\\$&');
    }
    /*if (config.patternFile) {
		pattern = fs.readFileSync(pattern, 'utf8');
		pattern = new Function('return '+pattern)(); // js code?!?
	}*/ step(pattern);
    return pattern;
}
function getReplacement(replacement, conf) {
    step('Get final replacement');
    /*if(config.replacementFile){
		return oneLinerFromFile(fs.readFileSync(replacement,'utf8'));
	}*/ replacement = replacePlaceholders(replacement, conf);
    if (conf.outputMatch) {
        step('Output match');
        if (parseInt(process.versions.node) < 6) {
            return die('outputMatch is only supported in node 6+');
        }
        return function() {
            step(arguments);
            if (arguments.length === 3) {
                step('Printing full match');
                process.stdout.write(arguments[0] + '\n');
                return '';
            }
            for(var i = 1; i < arguments.length - 2; i++){
                process.stdout.write(arguments[i]);
            }
            process.stdout.write('\n');
            return '';
        };
    }
    // If captured groups then run dynamicly
    if (conf.replacementJs && re.capturedGroupRef.test(conf.replacement) && parseInt(process.versions.node) < 6) {
        return die('Captured groups for javascript replacement is only supported in node 6+');
    }
    step(replacement);
    return replacement;
}
/*function oneLinerFromFile(str){
	let lines = str.split("\n");
	if(lines.length===1){
		return str;
	}
	return lines.map(function (line) {
		return line.trim();
	}).join(' ');
}*/ function getRegex(pattern, conf) {
    step('Get final regex with engine: ' + conf.engine);
    var regex;
    var flags = getFlags(conf);
    switch(conf.engine){
        case 'V8':
            try {
                regex = new RegExp(pattern, flags);
            } catch (e) {
                if (conf.debug) throw new Error(e);
                die(e.message);
            }
            break;
        case 'RE2':
            try {
                var RE2 = require('re2');
                regex = new RE2(pattern, flags);
            } catch (e) {
                if (conf.debug) throw new Error(e);
                die(e.message);
            }
            break;
        default:
            die("Engine ".concat(conf.engine, " not supported"));
    }
    step(regex);
    return regex;
}
function getFlags(conf) {
    step('Get flags');
    var flags = '';
    if (!conf.voidGlobal) {
        flags += 'g';
    }
    if (!conf.voidIgnoreCase) {
        flags += 'i';
    }
    if (!conf.voidMultiline) {
        flags += 'm';
    }
    if (conf.dotAll) {
        flags += 's';
    }
    if (conf.unicode) {
        flags += 'u';
    }
    step(flags);
    return flags;
}
function readableSize(size) {
    if (1 === size) {
        return '1 Byte';
    }
    var i = Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, i)).toFixed(!!i ? 1 : 0) + ' ' + [
        'Bytes',
        'KB',
        'MB',
        'GB',
        'TB'
    ][i];
}
function dynamicReplacement(_file_rr, _config_rr, _data_rr) {
    var _time_obj = now;
    var _time = localTimeString(_time_obj);
    var _pipe = _config_rr.pipeData, _text = _data_rr, _find = _config_rr.pattern, code_rr = _config_rr.replacementOri, _cwd = process.cwd(), _now = _time, _ = ' ', _nl = '\n';
    // prettier-ignore
    var _file = '❌', _file_rel = '❌', _dirpath = '❌', _dirpath_rel = '❌', _dirname = '❌', _filename = '❌', _name = '❌', _ext = '❌', _mtime = '❌', _ctime = '❌', _mtime_obj = new Date(0), _ctime_obj = new Date(0), _bytes = -1, _size = '❌', dynamicContent = new Function('require', 'fs', 'globs', 'path', 'pipe', 'pipe_', 'find', 'find_', 'text', 'text_', 'file', 'file_', 'file_rel', 'file_rel_', 'dirpath', 'dirpath_', 'dirpath_rel', 'dirpath_rel_', 'dirname', 'dirname_', 'filename', 'filename_', 'name', 'name_', 'ext', 'ext_', 'cwd', 'cwd_', 'now', 'now_', 'time_obj', 'time', 'time_', 'mtime_obj', 'mtime', 'mtime_', 'ctime_obj', 'ctime', 'ctime_', 'bytes', 'bytes_', 'size', 'size_', 'nl', '_', '__code_rr', 'var path = require("path");' + 'var __require_ = require;' + 'var r = function(file){' + 'var result = null;' + 'try{' + 'result = __require_(file);' + '} catch (e){' + 'var dir = /^[\\\/]/.test(file) ? "" : cwd;' + 'result = __require_(path.resolve(dir, file));' + '};' + 'return result;' + '};' + 'require = r;' + 'return eval(__code_rr);');
    var needsByteOrSize = re.byteOrSize.test(_config_rr.replacement);
    var betterToReadfromFile = needsByteOrSize && 50000000 < _text.length; // around 50 Mb will lead to reading filezise from file instead of copying into buffer
    if (!_config_rr.contentWasPiped) {
        _file = path.normalize(path.join(_cwd, _file_rr));
        _file_rel = path.relative(_cwd, _file);
        var pathInfo = path.parse(_file);
        _dirpath = pathInfo.dir;
        _dirpath_rel = path.relative(_cwd, _dirpath);
        _dirname = (_file.match(re.folderName) || ' _')[1];
        _filename = pathInfo.base;
        _name = pathInfo.name;
        _ext = pathInfo.ext;
        if (betterToReadfromFile || re.mctime.test(_config_rr.replacement)) {
            var fileStats = fs.statSync(_file);
            _bytes = fileStats.size;
            _size = readableSize(_bytes);
            _mtime_obj = fileStats.mtime;
            _ctime_obj = fileStats.ctime;
            _mtime = localTimeString(_mtime_obj);
            _ctime = localTimeString(_ctime_obj);
        }
    }
    if (needsByteOrSize && -1 === _bytes) {
        _bytes = Buffer.from(_text).length;
        _size = readableSize(_bytes);
    }
    var glob = function(a, b) {
        return fGlob.sync(a, _object_spread({
            unique: true,
            caseSensitiveMatch: !_config_rr.voidIgnoreCase,
            dot: true
        }, b));
    };
    // Run only once if no captured groups (replacement cant change)
    if (!/\$\d/.test(_config_rr.replacement)) {
        return dynamicContent(require, fs, glob, path, _pipe, _pipe + _, _find, _find + _, _text, _text + _, _file, _file + _, _file_rel, _file_rel + _, _dirpath, _dirpath + _, _dirpath_rel, _dirpath_rel + _, _dirname, _dirname + _, _filename, _filename + _, _name, _name + _, _ext, _ext + _, _cwd, _cwd + _, _now, _now + _, _time_obj, _time, _time + _, _mtime_obj, _mtime, _mtime + _, _ctime_obj, _ctime, _ctime + _, _bytes, _bytes + _, _size, _size + _, _nl, _, code_rr);
    }
    // Capture groups used, so need to run once per match
    return function() {
        step(arguments);
        var __pipe = _pipe, __text = _text, __find = _find, __file = _file, __file_rel = _file_rel, __dirpath = _dirpath, __dirpath_rel = _dirpath_rel, __dirname = _dirname, __filename = _filename, __name = _name, __ext = _ext, __cwd = _cwd, __now = _now, __time_obj = _time_obj, __time = _time, __mtime_obj = _mtime_obj, __mtime = _mtime, __ctime_obj = _ctime_obj, __ctime = _ctime, __bytes = _bytes, __size = _size, __nl = _nl, __ = _, __code_rr = code_rr;
        var capturedGroups = '';
        for(var i = 0; i < arguments.length - 2; i++){
            capturedGroups += 'var $' + i + '=' + JSON.stringify(arguments[i]) + '; ';
        }
        return dynamicContent(require, fs, glob, path, __pipe, __pipe + __, __find, __find + __, __text, __text + __, __file, __file + __, __file_rel, __file_rel + __, __dirpath, __dirpath + __, __dirpath_rel, __dirpath_rel + __, __dirname, __dirname + __, __filename, __filename + __, __name, __name + __, __ext, __ext + __, __cwd, __cwd + __, __now, __now + _, __time_obj, __time, __time + _, __mtime_obj, __mtime, __mtime + _, __ctime_obj, __ctime, __ctime + _, __bytes, __bytes + __, __size, __size + __, __nl, __, capturedGroups + __code_rr);
    };
}
function localTimeString() {
    var dateObj = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : new Date();
    return "".concat(dateObj.getFullYear(), "-").concat(('0' + (dateObj.getMonth() + 1)).slice(-2), "-").concat(('0' + dateObj.getDate()).slice(-2), " ").concat(('0' + dateObj.getHours()).slice(-2), ":").concat(('0' + dateObj.getMinutes()).slice(-2), ":").concat(('0' + dateObj.getSeconds()).slice(-2), ".").concat(('00' + dateObj.getMilliseconds()).slice(-3));
}
function replacePlaceholders() {
    var str = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : '', conf = arguments.length > 1 ? arguments[1] : void 0;
    if (!conf.voidEuro) {
        str = str.replace(re.euro, '$');
    }
    if (!conf.voidSection) {
        str = str.replace(re.section, '\\');
    }
    return str;
}
function getFilePaths(conf) {
    var includeGlob = conf.includeGlob, excludeGlob = conf.excludeGlob, excludeRe = conf.excludeRe, voidIgnoreCase = conf.voidIgnoreCase;
    var filesToInclude = fGlob.sync(includeGlob, {
        ignore: excludeGlob,
        onlyFiles: true,
        unique: true,
        caseSensitiveMatch: !voidIgnoreCase,
        dot: true
    });
    if (excludeRe) {
        excludeRe.map(function(el) {
            return getRegex(getPattern(el, conf), conf);
        }).forEach(function(re) {
            filesToInclude = filesToInclude.filter(function(el) {
                return !el.match(re);
            });
        });
    }
    return filesToInclude;
}
