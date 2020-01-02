const fs = require('fs');
const path = require('path');
const globs = require('globs');
const now = new Date();
import { outputConfig, step, debug, chat, info, error, die } from './output';
export const version = 'PACKAGE_VERSION';
export function engine(config = { engine: 'V8' }) {
    outputConfig(config);
    step('Displaying steps for:');
    step(config);
    config.pattern = getFinalPattern(config) || '';
    config.replacement = getFinalReplacement(config) || '';
    config.replacementOri = config.replacement;
    config.regex = getFinalRegex(config) || '';
    step(config);
    if (handlePipedData(config)) {
        return doReplacement('Piped data', config, config.pipedData);
    }
    config.files = globs.sync(config.files);
    if (!config.files.length) {
        return error(config.files.length + ' files found');
    }
    chat(config.files.length + ' files found');
    step(config);
    config.files
        // Correct filepath
        //.map(filepath=>path.normalize(process.cwd()+'/'+filepath))
        // Find out if any filepaths are invalid
        .filter((filepath) => (fs.existsSync(filepath) ? true : error('File not found:', filepath)))
        // Do the replacement
        .forEach((filepath) => openFile(filepath, config));
    function openFile(file, config) {
        if (config.voidAsync) {
            chat('Open sync: ' + file);
            var data = fs.readFileSync(file, config.encoding);
            return doReplacement(file, config, data);
        }
        else {
            chat('Open async: ' + file);
            fs.readFile(file, config.encoding, function (err, data) {
                if (err) {
                    return error(err);
                }
                return doReplacement(file, config, data);
            });
        }
    }
    // postfix argument names to limit the probabillity of user inputted javascript accidently using same values
    function doReplacement(_file_rr, _config_rr, _data_rr) {
        debug('Work on content from: ' + _file_rr);
        // Variables to be accessible from js.
        if (_config_rr.replacementJs) {
            _config_rr.replacement = dynamicReplacement(_file_rr, _config_rr, _data_rr);
        }
        // Main regexp of the whole thing
        const result = _data_rr.replace(_config_rr.regex, _config_rr.replacement);
        // The output of matched strings is done from the replacement, so no need to continue
        if (_config_rr.outputMatch) {
            return;
        }
        if (_config_rr.output) {
            debug('Output result from: ' + _file_rr);
            return process.stdout.write(result);
        }
        // Nothing replaced = no need for writing file again
        if (result === _data_rr) {
            chat('Nothing changed in: ' + _file_rr);
            return;
        }
        // Release the memory while storing files
        _data_rr = undefined;
        debug('Write new content to: ' + _file_rr);
        // Write directly to the same file (if the process is killed all new and old data is lost)
        if (_config_rr.voidBackup) {
            return fs.writeFile(_file_rr, result, _config_rr.encoding, function (err) {
                if (err) {
                    return error(err);
                }
                info(_file_rr);
            });
        }
        //Make sure data is always on disk
        const oriFile = path.normalize(path.join(process.cwd(), _file_rr));
        const salt = new Date()
            .toISOString()
            .replace(/:/g, '_')
            .replace('Z', '');
        const backupFile = oriFile + '.' + salt + '.backup';
        if (_config_rr.voidAsync) {
            try {
                fs.renameSync(oriFile, backupFile);
                fs.writeFileSync(oriFile, result, _config_rr.encoding);
                if (!_config_rr.keepBackup) {
                    fs.unlinkSync(backupFile);
                }
            }
            catch (e) {
                return error(e);
            }
            return info(_file_rr);
        }
        // Let me know when fs gets promise'fied
        fs.rename(oriFile, backupFile, (err) => {
            if (err) {
                return error(err);
            }
            fs.writeFile(oriFile, result, _config_rr.encoding, (err) => {
                if (err) {
                    return error(err);
                }
                if (!_config_rr.keepBackup) {
                    fs.unlink(backupFile, (err) => {
                        if (err) {
                            return error(err);
                        }
                        info(_file_rr);
                    });
                }
                else {
                    info(_file_rr);
                }
            });
        });
    }
    function handlePipedData(config) {
        step('Check Piped Data');
        if (config.files.length) {
            if (!config.replacementJs) {
                chat('Piped data never used.');
            }
            return false;
        }
        if (null !== config.pipedData && !config.pipedDataUsed) {
            config.dataIsPiped = true;
            config.output = true;
            return true;
        }
        return false;
    }
    function getFinalPattern(config) {
        step('Get final pattern');
        let pattern = config.pattern;
        /*if (config.patternFile) {
            pattern = fs.readFileSync(pattern, 'utf8');
            pattern = new Function('return '+pattern)();
        }*/
        step(pattern);
        return pattern;
    }
    function getFinalReplacement(config) {
        step('Get final replacement');
        /*if(config.replacementFile){
            return oneLinerFromFile(fs.readFileSync(replacement,'utf8'));
        }*/
        if (config.replacementPipe) {
            step('Piping replacement');
            config.pipedDataUsed = true;
            if (null === config.pipedData) {
                return die('No data piped into replacement');
            }
            config.replacement = config.pipedData;
        }
        if (config.outputMatch) {
            step('Output match');
            if (parseInt(process.versions.node) < 6) {
                return die('outputMatch is only supported in node 6+');
            }
            return function () {
                step(arguments);
                if (arguments.length === 3) {
                    step('Printing full match');
                    process.stdout.write(arguments[0] + '\n');
                    return '';
                }
                for (var i = 1; i < arguments.length - 2; i++) {
                    process.stdout.write(arguments[i]);
                }
                process.stdout.write('\n');
                return '';
            };
        }
        // If captured groups then run dynamicly
        //console.log(process);
        if (config.replacementJs &&
            /\$\d/.test(config.replacement) &&
            parseInt(process.versions.node) < 6) {
            return die('Captured groups for javascript replacement is only supported in node 6+');
        }
        step(config.replacement);
        return config.replacement;
    }
    /*function oneLinerFromFile(str){
        let lines = str.split("\n");
        if(lines.length===1){
            return str;
        }
        return lines.map(function (line) {
            return line.trim();
        }).join(' ');
    }*/
    function getFinalRegex(config) {
        step('Get final regex with engine: ' + config.engine);
        let regex = null;
        let flags = getFlags(config);
        switch (config.engine) {
            case 'V8':
                regex = new RegExp(config.pattern, flags);
                break;
            case 'RE2':
                const RE2 = require('re2');
                regex = new RE2(config.pattern, flags);
                break;
            default:
                die(`Engine ${config.engine} not supported yet`);
        }
        step(regex);
        return regex;
    }
    function getFlags(config) {
        step('Get flags');
        let flags = '';
        if (!config.voidGlobal) {
            flags += 'g';
        }
        if (!config.voidIgnoreCase) {
            flags += 'i';
        }
        if (!config.voidMultiline) {
            flags += 'm';
        }
        if (config.unicode) {
            flags += 'u';
        }
        step(flags);
        return flags;
    }
}
function readableSize(size) {
    if (1 === size) {
        return '1 Byte';
    }
    const i = Math.floor(Math.log(size) / Math.log(1024));
    return ((size / Math.pow(1024, i)).toFixed(!!i ? 1 : 0) + ' ' + ['Bytes', 'KB', 'MB', 'GB', 'TB'][i]);
}
function dynamicReplacement(_file_rr, _config_rr, _data_rr) {
    const _time_obj = now;
    const _time = localTimeString(_time_obj);
    const _pipe = _config_rr.pipedData, _text = _data_rr, _find = _config_rr.pattern, code_rr = _config_rr.replacementOri, _cwd = process.cwd(), _now = _time, _ = ' ', _nl = '\n';
    // prettier-ignore
    let _file = '❌', _file_rel = '❌', _dirpath = '❌', _dirpath_rel = '❌', _dirname = '❌', _filename = '❌', _name = '❌', _ext = '❌', _mtime = '❌', _ctime = '❌', _mtime_obj = new Date(0), _ctime_obj = new Date(0), _bytes = -1, _size = '❌', dynamicContent = new Function('require', 'fs', 'globs', 'path', 'pipe', 'pipe_', 'find', 'find_', 'text', 'text_', 'file', 'file_', 'file_rel', 'file_rel_', 'dirpath', 'dirpath_', 'dirpath_rel', 'dirpath_rel_', 'dirname', 'dirname_', 'filename', 'filename_', 'name', 'name_', 'ext', 'ext_', 'cwd', 'cwd_', 'now', 'now_', 'time_obj', 'time', 'time_', 'mtime_obj', 'mtime', 'mtime_', 'ctime_obj', 'ctime', 'ctime_', 'bytes', 'bytes_', 'size', 'size_', 'nl', '_', '__code_rr', 'var path = require("path");' +
        'var __require_ = require;' +
        'var r = function(file){' +
        'var result = null;' +
        'try{' +
        'result = __require_(file);' +
        '} catch (e){' +
        'var dir = /^[\\\/]/.test(file) ? "" : $cwd;' +
        'result = __require_(path.resolve(dir, file));' +
        '};' +
        'return result;' +
        '};' +
        'require = r;' +
        'return eval(__code_rr);');
    const needsByteOrSize = /bytes|size/.test(_config_rr.replacement);
    const betterToReadfromFile = needsByteOrSize && 50000000 < _text.length; // around 50 Mb will lead to reading filezise from file instead of copying into buffer
    if (!_config_rr.dataIsPiped) {
        _file = path.normalize(path.join(_cwd, _file_rr));
        _file_rel = path.relative(_cwd, _file);
        const pathInfo = path.parse(_file);
        _dirpath = pathInfo.dir;
        _dirpath_rel = path.relative(_cwd, _dirpath);
        _dirname = _file.match(/[\\\/]+([^\\\/]+)[\\\/]+[^\\\/]+$/)[1];
        _filename = pathInfo.base;
        _name = pathInfo.name;
        _ext = pathInfo.ext;
        if (betterToReadfromFile || /[mc]time/.test(_config_rr.replacement)) {
            const fileStats = fs.statSync(_file);
            _bytes = fileStats.size;
            _size = readableSize(_bytes);
            _mtime_obj = fileStats.mtime;
            _ctime_obj = fileStats.ctime;
            _mtime = localTimeString(_mtime_obj);
            _ctime = localTimeString(_ctime_obj);
            //console.log('filesize: ', fileStats.size);
            //console.log('dataSize: ', _bytes);
        }
    }
    if (needsByteOrSize && -1 === _bytes) {
        _bytes = Buffer.from(_text).length;
        _size = readableSize(_bytes);
    }
    // Run only once if no captured groups (replacement cant change)
    if (!/\$\d/.test(_config_rr.replacement)) {
        return dynamicContent(require, fs, globs, path, _pipe, _pipe + _, _find, _find + _, _text, _text + _, _file, _file + _, _file_rel, _file_rel + _, _dirpath, _dirpath + _, _dirpath_rel, _dirpath_rel + _, _dirname, _dirname + _, _filename, _filename + _, _name, _name + _, _ext, _ext + _, _cwd, _cwd + _, _now, _now + _, _time_obj, _time, _time + _, _mtime_obj, _mtime, _mtime + _, _ctime_obj, _ctime, _ctime + _, _bytes, _bytes + _, _size, _size + _, _nl, _, code_rr);
    }
    // Captures groups present, so need to run once per match
    return function () {
        step(arguments);
        const __pipe = _pipe, __text = _text, __find = _find, __file = _file, __file_rel = _file_rel, __dirpath = _dirpath, __dirpath_rel = _dirpath_rel, __dirname = _dirname, __filename = _filename, __name = _name, __ext = _ext, __cwd = _cwd, __now = _now, __time = _time, __mtime = _mtime, __ctime = _ctime, __bytes = _bytes, __size = _size, __nl = _nl, __ = _, __code_rr = code_rr;
        var capturedGroups = '';
        for (var i = 0; i < arguments.length - 2; i++) {
            capturedGroups += 'var $' + i + '=' + JSON.stringify(arguments[i]) + '; ';
        }
        return dynamicContent(require, fs, globs, path, __pipe, __pipe + __, __find, __find + __, __text, __text + __, __file, __file + __, __file_rel, __file_rel + __, __dirpath, __dirpath + __, __dirpath_rel, __dirpath_rel + __, __dirname, __dirname + __, __filename, __filename + __, __name, __name + __, __ext, __ext + __, __cwd, __cwd + __, __now, __now + __, __time, __time + __, __mtime, __mtime + __, __ctime, __ctime + __, __bytes, __bytes + __, __size, __size + __, __nl, __, capturedGroups + __code_rr);
    };
}
function localTimeString(dateObj = new Date()) {
    return `${dateObj.getFullYear()}-${('0' + (dateObj.getMonth() + 1)).slice(-2)}-${('0' + dateObj.getDate()).slice(-2)} ${('0' + dateObj.getHours()).slice(-2)}:${('0' + dateObj.getMinutes()).slice(-2)}:${('0' + dateObj.getSeconds()).slice(-2)}.${('00' + dateObj.getMilliseconds()).slice(-3)}`;
}
