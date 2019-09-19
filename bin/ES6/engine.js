import { setOutputConfig, step, debug, chat, info, error, die } from './output';
import Datapoint from './Datapoint';
const fs = require('fs'), path = require('path'), globs = require('globs'), replaceStream = require('replacestream');
const streamReplacer = replaceStream;
//const streamReplacer = river;
const initTime = new Date();
function handlePipedData(config, stream = null) {
    if (null !== stream && !config.replacementPipe && config.globs.length) {
        error('Getting data from both pipe and file. Will ignore pipe.');
        return new Datapoint();
    }
    if (null === stream) {
        return new Datapoint();
    }
    stream.setEncoding(config.encoding);
    return new Datapoint().setStreamIn(stream);
}
export const version = 'PACKAGE_VERSION';
export function engine(config = { engine: 'V8' }, stream = null) {
    setOutputConfig(config);
    debug('Initial config', config);
    const haystack = handlePipedData(config, stream);
    config.pattern = getFinalPattern(config);
    config.replacementOri = config.replacement;
    config.replacement = getFinalReplacement(config);
    config.regex = getFinalRegex(config);
    step('Final config', config);
    debug('final haystack', haystack);
    if (haystack.type.isStream) {
        return doReplacement(config, haystack);
    }
    if (!config.globs.length) {
        return die('No files/globs provided to be searched');
    }
    debug(config.globs.length + ' globs provided', config.globs);
    config.files = globs.sync(config.globs);
    if (config.exclude && config.exclude.length) {
        const re_ex = new RegExp(config.exclude);
        config.files.filter((f) => !re_ex.test(f));
    }
    debug('files found:', config.files);
    if (1023 < config.files.length) {
        chat(`Forcing async on all ${config.files.length} files`);
        config.voidAsync = true;
    }
    if (!config.files.length) {
        return info('0 files found');
    }
    chat(config.files.length + ' files will be searched');
    config.files
        // Correct filepath
        //.map(filepath=>path.normalize(process.cwd()+'/'+filepath))
        // Find out if any filepaths are invalid
        // no longer needed as globs will have returned existing files
        //.filter((filepath) => (fs.existsSync(filepath) ? true : error('File not found:', filepath)))
        // Do the replacement
        .forEach((filepath) => (config.voidAsync = treatFile(filepath, config)));
}
function treatFile(file, config) {
    if (config.voidAsync) {
        return treatFileSync(file, config);
    }
    return treatFileAsync(file, config);
}
function treatFileAsync(file, config) {
    debug('Open async', file);
    fs.readFile(file, config.encoding, function (err, data) {
        if (err) {
            switch (err.code) {
                case 'EISDIR':
                    return false;
                case 'EMFILE':
                    chat('Seams like async is not happy. Will try sync.');
                    debug('Going sync after file', file);
                    return treatFileSync(file, config);
                default:
                    error('Error reading ' + file);
                    error(err);
                    return process.exit(1);
            }
        }
        doReplacement(config, new Datapoint().setFile(file, data));
        return false;
    });
}
function treatFileSync(file, config) {
    debug('Open sync', file);
    var data;
    try {
        data = fs.readFileSync(file, config.encoding);
    }
    catch (err) {
        switch (err.code) {
            case 'EISDIR':
                return true;
            default:
                error('Error reading ' + file);
                error(err);
                return process.exit(1);
        }
    }
    doReplacement(config, new Datapoint().setFile(file, data));
    return true;
}
// postfix argument names to limit the probabillity of user inputted javascript accidently using same values
function doReplacement(config, haystack) {
    debug('Work on content from', haystack);
    // Variables depend on file origin to be accessible from js.
    if (config.replacementJs) {
        config.replacement = dynamicReplacement(config, haystack);
    }
    // handle stream
    if (haystack.type.isStream) {
        return (haystack.streamIn
            //.pipe(river(config.regex, config.replacement, {maxMatchLen: config.maxMatchLen}))
            .pipe(streamReplacer(config.regex, config.replacement, { maxMatchLen: config.maxMatchLen }))
            .pipe(process.stdout));
    }
    let file = haystack.path;
    // Main regexp of the whole thing
    const result = haystack.content.replace(config.regex, config.replacement);
    // The output of matched strings is done from the replacement, so no need to continue
    if (config.outputMatch) {
        return;
    }
    if (config.output) {
        step('Output result from', file);
        return process.stdout.write(result);
    }
    // Nothing replaced = no need for writing file again
    if (result === haystack.content) {
        chat('Nothing changed in', file);
        return;
    }
    // Release the content memory while storing files
    haystack.flushContent();
    debug('Write new content to', file);
    // Write directly to the same file (if the process is killed all new and old data is lost)
    if (config.voidBackup) {
        return fs.writeFile(file, result, config.encoding, function (err) {
            if (err) {
                return error(err);
            }
            info(file);
        });
    }
    //Make sure data is always on disk
    const oriFile = path.normalize(path.join(process.cwd(), file));
    const salt = new Date()
        .toISOString()
        .replace(/:/g, '_')
        .replace('Z', '');
    const backupFile = oriFile + '.' + salt + '.backup';
    if (config.voidAsync) {
        try {
            fs.renameSync(oriFile, backupFile);
            fs.writeFileSync(oriFile, result, config.encoding);
            if (!config.keepBackup) {
                fs.unlinkSync(backupFile);
            }
        }
        catch (e) {
            return error(e);
        }
        return info(file);
    }
    // Let me know when fs gets promise'fied
    fs.rename(oriFile, backupFile, (err) => {
        if (err) {
            return error(err);
        }
        fs.writeFile(oriFile, result, config.encoding, (err) => {
            if (err) {
                return error(err);
            }
            if (!config.keepBackup) {
                fs.unlink(backupFile, (err) => {
                    if (err) {
                        return error(err);
                    }
                    info(file);
                });
            }
            else {
                info(file);
            }
        });
    });
}
function getFinalPattern(config) {
    step('Get final pattern');
    let pattern = config.pattern;
    /*if (config.patternFile) {
            pattern = fs.readFileSync(pattern, 'utf8');
            pattern = new Function('return '+pattern)();
        }*/
    debug('Final pattern', pattern);
    return pattern;
}
function getFinalReplacement(config) {
    //step('Get final replacement');
    if (config.outputMatch) {
        step('Output match');
        if (process.versions.node < '6') {
            return die('--outputMatch is only supported in node 6+');
        }
        return function () {
            debug('Output match', arguments);
            if (arguments.length === 3) {
                step('Printing full match');
                process.stdout.write(arguments[0] + '\n');
                return arguments[0];
            }
            for (var i = 1; i < arguments.length - 2; i++) {
                process.stdout.write(arguments[i]);
            }
            process.stdout.write('\n');
            return arguments[0];
        };
    }
    // If captured groups then run dynamicly
    if (config.replacementJs && /\$\d/.test(config.replacement) && process.versions.node < '6') {
        return die('Captured groups for javascript generated replacement is only supported in node 6+');
    }
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
    step('Getting final regex with engine', config.engine);
    let regex, pattern = config.pattern;
    if (config.literalSearch) {
        pattern = escapeStrForRegex(config.pattern);
    }
    let flags = getFlags(config);
    switch (config.engine) {
        case 'V8':
            regex = new RegExp(pattern, flags);
            break;
        case 'RE2':
            const RE2 = require('re2');
            regex = new RE2(pattern, flags);
            break;
        default:
            die(`Engine ${config.engine} not supported yet`);
    }
    debug('Final regex', regex);
    return regex;
}
function getFlags(config) {
    step('Getting flags');
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
    debug('Flags found', flags);
    return flags;
}
function readableSize(size) {
    if (1 === size) {
        return '1 Byte';
    }
    const i = Math.floor(Math.log(size) / Math.log(1024));
    return ((size / Math.pow(1024, i)).toFixed(!!i ? 1 : 0) + ' ' + ['Bytes', 'KB', 'MB', 'GB', 'TB'][i]);
}
function dynamicReplacement(config, haystack) {
    // prettier-ignore
    const now_obj = new Date(), handleReplacementJsSrc = 'var __require__ = require;' +
        'var r = function(file){' +
        'var result = null;' +
        'try{' +
        'result = __require__(file);' +
        '} catch (e){' +
        'var dir = /^[\\\/]/.test(file) ? "" : cwd;' +
        'result = __require__(path.resolve(dir, file));' +
        '};' +
        'return result;' +
        '};' +
        'require = r;' +
        'return "" + eval(_.replacementJsSrc);';
    const _ = {
        find: config.pattern,
        replacementJsSrc: config.replacementOri,
        cwd: process.cwd(),
        time_obj: initTime,
        time: localTimeString(initTime),
        now_obj,
        now: localTimeString(now_obj),
        nl: '\n',
    };
    _.toString = () => ' ';
    if (config.jsFullText) {
        _.text = haystack.content;
    }
    if (haystack.type.isFile) {
        _.file = path.normalize(path.join(_.cwd, haystack.path));
        _.dirname = _.file.match(/[\\\/]+([^\\\/]+)[\\\/]+[^\\\/]+$/)[1];
        _.file_rel = path.relative(_.cwd, _.file);
        const pathInfo = path.parse(_.file);
        _.dirpath = pathInfo.dir;
        _.dirpath_rel = path.relative(_.cwd, _.dirpath);
        _.filename = pathInfo.base;
        _.name = pathInfo.name;
        _.ext = pathInfo.ext;
        const needsByteOrSize = /bytes|size/.test(config.replacement);
        const betterToReadfromFile = needsByteOrSize && 50e6 < haystack.content.length; // around 50 Mb files will lead to reading filezise from file instead of copying into buffer
        if (betterToReadfromFile || /[mc]time/.test(config.replacement)) {
            const fileStats = fs.statSync(_.file);
            _.bytes = fileStats.size;
            _.size = readableSize(_.bytes);
            _.mtime_obj = fileStats.mtime;
            _.mtime = localTimeString(_.mtime_obj);
            _.ctime_obj = fileStats.ctime;
            _.ctime = localTimeString(_.ctime_obj);
        }
        if (needsByteOrSize && undefined === _.bytes) {
            _.bytes = Buffer.from(haystack.content).length;
            _.size = readableSize(_.bytes);
        }
    }
    let easyVarAccess = '';
    for (const prop in _) {
        if ('replacementJsSrc' === prop) {
            continue;
        }
        easyVarAccess += `var ${prop} = _.${prop};`;
        if ('text' === prop) {
            continue;
        }
        let type = Object.prototype.toString.call(_[prop]);
        if (type === '[object String]' || type === '[object Number]') {
            easyVarAccess += `var ${prop}_ = _.${prop} + ' ';`;
        }
    }
    // Run only once if captured groups for sure (replacement cant change anyway)
    if (!/\$\d/.test(config.replacement)) {
        return fnWrapper(_, easyVarAccess + handleReplacementJsSrc);
    }
    // Captured groups might be present, so need to run once per match
    return function () {
        step('Match found', arguments);
        var capturedGroups = '';
        for (var i = 0; i < arguments.length - 2; i++) {
            capturedGroups += 'var $' + i + '=' + JSON.stringify(arguments[i]) + ';';
        }
        return fnWrapper(_, easyVarAccess + capturedGroups + handleReplacementJsSrc);
    };
}
function fnWrapper(_, src) {
    return new Function('_', 'require', 'fs', 'path', 'globs', src)(_, require, fs, path, globs);
}
function localTimeString(dateObj = new Date()) {
    const y = dateObj.getFullYear(), mo = ('0' + (dateObj.getMonth() + 1)).slice(-2), d = ('0' + dateObj.getDate()).slice(-2), h = ('0' + dateObj.getHours()).slice(-2), mi = ('0' + dateObj.getMinutes()).slice(-2), s = ('0' + dateObj.getSeconds()).slice(-2), ms = ('00' + dateObj.getMilliseconds()).slice(-3);
    return `${y}-${mo}-${d} ${h}:${mi}:${s}.${ms}`;
}
function escapeStrForRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
/*
process.on('exit',function(code){
    code || stream.end();
  });
  
  */
