#!/usr/bin/env node
var rexreplace = (function (exports) {
    'use strict';

    var font = {};
    font.red = font.green = font.gray = function (str) { return str; };
    // check for node version supporting chalk - if so overwrite `font`
    //const font = import('chalk');
    var conf = null;
    var outputConfig = function (_conf) {
        conf = _conf;
    };
    var info = function (msg, data) {
        if ( data === void 0 ) data = '';

        if (conf.quiet || conf.quietTotal) {
            return;
        }
        if (conf.output || conf.outputMatch)
            { return console.error.apply(this, [font.gray(msg), data].filter(Boolean)); }
        console.log.apply(this, [msg, data].filter(Boolean));
    };
    var chat = function (msg, data) {
        if ( data === void 0 ) data = '';

        if (conf.verbose) {
            info(msg, data);
        }
        else {
            debug([msg, data].filter(Boolean).join(' '));
        }
    };
    var error = function (msg, data) {
        if ( data === void 0 ) data = '';

        if (!conf.quiet && !conf.quietTotal) {
            console.error.apply(this, [font.red(msg), data].filter(Boolean));
        }
        if (conf.bail) {
            kill();
        }
        return false;
    };
    var die = function (msg, data, displayHelp) {
        if ( msg === void 0 ) msg = '';
        if ( data === void 0 ) data = '';
        if ( displayHelp === void 0 ) displayHelp = false;

        if (displayHelp && !conf.quietTotal) {
            conf.showHelp();
        }
        msg && error(' ❌ ' + msg, data);
        kill();
    };
    function debug(data) {
        if (conf.debug) {
            console.error(font.gray(JSON.stringify(data, null, 4)));
        }
    }
    function step(data) {
        if (conf.verbose) {
            console.error(font.gray(data));
        }
    }
    function kill(error, msg) {
        if ( error === void 0 ) error = 1;
        if ( msg === void 0 ) msg = '';

        msg && console.error(+msg);
        process.exit(+error);
    }

    var fs = require('fs-extra');
    var path = require('path');
    var fGlob = require('fast-glob');
    require('globs');
    var now = new Date();
    var re = {
        euro: /€/g,
        section: /§/g,
        mctime: /[mc]time/,
        colon: /:/g,
        capturedGroupRef: /\$\d/,
        regexSpecialChars: /[-\[\]{}()*+?.,\/\\^$|#\s]/g,
        byteOrSize: /bytes|size/,
        folderName: /[\\\/]+([^\\\/]+)[\\\/]+[^\\\/]+$/,
    };
    var version = '7.1.3-y';
    function engine(conf) {
        if ( conf === void 0 ) conf = { engine: 'V8' };

        outputConfig(conf);
        step('Displaying steps for:');
        step(conf);
        conf.pattern = getPattern(conf.pattern, conf) || '';
        conf.replacement = getReplacement(conf.replacement, conf) || '';
        conf.replacementOri = conf.replacement;
        conf.regex = getRegex(conf.pattern, conf) || '';
        step(conf);
        conf.files = getFilePaths(conf);
        if (!conf.files.length) {
            if (conf.contentWasPiped) {
                return doReplacement('[pipe-data]', conf, conf.pipeData);
            }
            return error(conf.files.length + ' files found');
        }
        chat(conf.files.length + ' files found');
        step(conf);
        conf.files
            // Find out if any filepaths are invalid
            .filter(function (filepath) { return (fs.statSync(filepath).isFile() ? true : error('Not a file:', filepath)); })
            // Do the replacement
            .forEach(function (filepath) { return openFile(filepath, conf); });
    }
    function openFile(file, conf) {
        if (conf.voidAsync) {
            chat('Open sync: ' + file);
            var data = fs.readFileSync(file, conf.encoding);
            return doReplacement(file, conf, data);
        }
        else {
            chat('Open async: ' + file);
            fs.readFile(file, conf.encoding, function (err, data) {
                if (err) {
                    return error(err);
                }
                return doReplacement(file, conf, data);
            });
        }
    }
    // postfix argument names to limit the probabillity of user inputted javascript accidently using same values
    function doReplacement(filePath, conf, content) {
        debug('Work on content from: ' + filePath);
        // Variables to be accessible from js.
        if (conf.replacementJs) {
            conf.replacement = dynamicReplacement(filePath, conf, content);
        }
        // Main regexp of the whole thing
        var result = content.replace(conf.regex, conf.replacement);
        // The output of matched strings is done from the replacement, so no need to continue
        if (conf.outputMatch) {
            return;
        }
        if (conf.output) {
            debug('Output result from: ' + filePath);
            return process.stdout.write(result);
        }
        // Nothing replaced = no need for writing file again
        if (result === content) {
            debug('Nothing changed in: ' + filePath);
            return;
        }
        // Release the memory while storing files
        content = '';
        debug('Write udpated content to: ' + filePath);
        if (conf.simulate)
            { return info(filePath); }
        // Write directly to the same file (if the process is killed all new and old data is lost)
        if (conf.voidBackup) {
            return fs.writeFile(filePath, result, conf.encoding, function (err) {
                if (err) {
                    return error(err);
                }
                info(filePath);
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
            }
            catch (e) {
                return error(e);
            }
            return info(filePath);
        }
        // Let me know when fs gets promise'fied
        fs.rename(oriFile, backupFile, function (err) {
            if (err) {
                return error(err);
            }
            fs.writeFile(oriFile, result, conf.encoding, function (err) {
                if (err) {
                    return error(err);
                }
                if (!conf.keepBackup) {
                    fs.unlink(backupFile, function (err) {
                        if (err) {
                            return error(err);
                        }
                        info(filePath);
                    });
                }
                else {
                    info(filePath);
                }
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
        }*/
        step(pattern);
        return pattern;
    }
    function getReplacement(replacement, conf) {
        step('Get final replacement');
        /*if(config.replacementFile){
            return oneLinerFromFile(fs.readFileSync(replacement,'utf8'));
        }*/
        replacement = replacePlaceholders(replacement, conf);
        if (conf.outputMatch) {
            step('Output match');
            if (parseInt(process.versions.node) < 6) {
                return die('outputMatch is only supported in node 6+');
            }
            return function () {
                var arguments$1 = arguments;

                step(arguments);
                if (arguments.length === 3) {
                    step('Printing full match');
                    process.stdout.write(arguments[0] + '\n');
                    return '';
                }
                for (var i = 1; i < arguments.length - 2; i++) {
                    process.stdout.write(arguments$1[i]);
                }
                process.stdout.write('\n');
                return '';
            };
        }
        // If captured groups then run dynamicly
        if (conf.replacementJs &&
            re.capturedGroupRef.test(conf.replacement) &&
            parseInt(process.versions.node) < 6) {
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
    }*/
    function getRegex(pattern, conf) {
        step('Get final regex with engine: ' + conf.engine);
        var regex;
        var flags = getFlags(conf);
        switch (conf.engine) {
            case 'V8':
                try {
                    regex = new RegExp(pattern, flags);
                }
                catch (e) {
                    if (conf.debug)
                        { throw new Error(e); }
                    die(e.message);
                }
                break;
            case 'RE2':
                try {
                    var RE2 = require('re2');
                    regex = new RE2(pattern, flags);
                }
                catch (e$1) {
                    if (conf.debug)
                        { throw new Error(e$1); }
                    die(e$1.message);
                }
                break;
            default:
                die(("Engine " + (conf.engine) + " not supported"));
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
        return ((size / Math.pow(1024, i)).toFixed(!!i ? 1 : 0) + ' ' + ['Bytes', 'KB', 'MB', 'GB', 'TB'][i]);
    }
    function dynamicReplacement(_file_rr, _config_rr, _data_rr) {
        var _time_obj = now;
        var _time = localTimeString(_time_obj);
        var _pipe = _config_rr.pipeData, _text = _data_rr, _find = _config_rr.pattern, code_rr = _config_rr.replacementOri, _cwd = process.cwd(), _now = _time, _ = ' ', _nl = '\n';
        // prettier-ignore
        var _file = '❌', _file_rel = '❌', _dirpath = '❌', _dirpath_rel = '❌', _dirname = '❌', _filename = '❌', _name = '❌', _ext = '❌', _mtime = '❌', _ctime = '❌', _mtime_obj = new Date(0), _ctime_obj = new Date(0), _bytes = -1, _size = '❌', dynamicContent = new Function('require', 'fs', 'globs', 'path', 'pipe', 'pipe_', 'find', 'find_', 'text', 'text_', 'file', 'file_', 'file_rel', 'file_rel_', 'dirpath', 'dirpath_', 'dirpath_rel', 'dirpath_rel_', 'dirname', 'dirname_', 'filename', 'filename_', 'name', 'name_', 'ext', 'ext_', 'cwd', 'cwd_', 'now', 'now_', 'time_obj', 'time', 'time_', 'mtime_obj', 'mtime', 'mtime_', 'ctime_obj', 'ctime', 'ctime_', 'bytes', 'bytes_', 'size', 'size_', 'nl', '_', '__code_rr', 'var path = require("path");' +
            'var __require_ = require;' +
            'var r = function(file){' +
            'var result = null;' +
            'try{' +
            'result = __require_(file);' +
            '} catch (e){' +
            'var dir = /^[\\\/]/.test(file) ? "" : cwd;' +
            'result = __require_(path.resolve(dir, file));' +
            '};' +
            'return result;' +
            '};' +
            'require = r;' +
            'return eval(__code_rr);');
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
        var glob = function (a, b) { return fGlob.sync(a, Object.assign({ unique: true, caseSensitiveMatch: !_config_rr.voidIgnoreCase, dot: true }, b)); };
        // Run only once if no captured groups (replacement cant change)
        if (!/\$\d/.test(_config_rr.replacement)) {
            return dynamicContent(require, fs, glob, path, _pipe, _pipe + _, _find, _find + _, _text, _text + _, _file, _file + _, _file_rel, _file_rel + _, _dirpath, _dirpath + _, _dirpath_rel, _dirpath_rel + _, _dirname, _dirname + _, _filename, _filename + _, _name, _name + _, _ext, _ext + _, _cwd, _cwd + _, _now, _now + _, _time_obj, _time, _time + _, _mtime_obj, _mtime, _mtime + _, _ctime_obj, _ctime, _ctime + _, _bytes, _bytes + _, _size, _size + _, _nl, _, code_rr);
        }
        // Capture groups used, so need to run once per match
        return function () {
            var arguments$1 = arguments;

            step(arguments);
            var __pipe = _pipe, __text = _text, __find = _find, __file = _file, __file_rel = _file_rel, __dirpath = _dirpath, __dirpath_rel = _dirpath_rel, __dirname = _dirname, __filename = _filename, __name = _name, __ext = _ext, __cwd = _cwd, __now = _now, __time_obj = _time_obj, __time = _time, __mtime_obj = _mtime_obj, __mtime = _mtime, __ctime_obj = _ctime_obj, __ctime = _ctime, __bytes = _bytes, __size = _size, __nl = _nl, __ = _, __code_rr = code_rr;
            var capturedGroups = '';
            for (var i = 0; i < arguments.length - 2; i++) {
                capturedGroups += 'var $' + i + '=' + JSON.stringify(arguments$1[i]) + '; ';
            }
            return dynamicContent(require, fs, glob, path, __pipe, __pipe + __, __find, __find + __, __text, __text + __, __file, __file + __, __file_rel, __file_rel + __, __dirpath, __dirpath + __, __dirpath_rel, __dirpath_rel + __, __dirname, __dirname + __, __filename, __filename + __, __name, __name + __, __ext, __ext + __, __cwd, __cwd + __, __now, __now + _, __time_obj, __time, __time + _, __mtime_obj, __mtime, __mtime + _, __ctime_obj, __ctime, __ctime + _, __bytes, __bytes + __, __size, __size + __, __nl, __, capturedGroups + __code_rr);
        };
    }
    function localTimeString(dateObj) {
        if ( dateObj === void 0 ) dateObj = new Date();

        return ((dateObj.getFullYear()) + "-" + (('0' + (dateObj.getMonth() + 1)).slice(-2)) + "-" + (('0' + dateObj.getDate()).slice(-2)) + " " + (('0' + dateObj.getHours()).slice(-2)) + ":" + (('0' + dateObj.getMinutes()).slice(-2)) + ":" + (('0' + dateObj.getSeconds()).slice(-2)) + "." + (('00' + dateObj.getMilliseconds()).slice(-3)));
    }
    function replacePlaceholders(str, conf) {
        if ( str === void 0 ) str = '';

        if (!conf.voidEuro) {
            str = str.replace(re.euro, '$');
        }
        if (!conf.voidSection) {
            str = str.replace(re.section, '\\');
        }
        return str;
    }
    function getFilePaths(conf) {
        var includeGlob = conf.includeGlob;
        var excludeGlob = conf.excludeGlob;
        var excludeRe = conf.excludeRe;
        var voidIgnoreCase = conf.voidIgnoreCase;
        var filesToInclude = fGlob.sync(includeGlob, {
            ignore: excludeGlob,
            onlyFiles: true,
            unique: true,
            caseSensitiveMatch: !voidIgnoreCase,
            dot: true,
        });
        if (excludeRe.length) {
            excludeRe
                .map(function (el) { return getRegex(getPattern(el, conf), conf); })
                .forEach(function (re) {
                filesToInclude = filesToInclude.filter(function (el) { return !el.match(re); });
            });
        }
        return filesToInclude;
    }

    // CLI interface for rexreplace
    var yargs = require('yargs/yargs');
    executeReplacement(cli2conf(process.argv.slice(2)));
    function cli2conf(args) {
        var assign;

        var pattern, replacement;
        // To avoid problems with patterns or replacements starting with '-' so the two first arguments can not contain flags and are removed before yargs does it magic - but we still need to handle -version and -help
        var needHelp = 0;
        if (args.length < 2) {
            if (/-v|--?version$/i.test(args.slice(-1)[0])) {
                console.log(version);
                process.exitCode = 0;
                process.exit();
            }
            else if (/-h|--?help$/i.test(args.slice(-1)[0])) {
                needHelp = 1;
            }
            else {
                needHelp = 2;
            }
        }
        else {
            (assign = args.splice(0, 2), pattern = assign[0], replacement = assign[1]);
        }
        var argv = yargs(args.slice(2))
            .strict()
            .usage('RexReplace v' +
            version +
            '\n\nRegexp search and replace for files using lookahead and backreference to matching groups in the replacement. Defaults to global multiline case-insensitive search.\n\n' +
            '> rexreplace pattern replacement [fileGlob|option]+')
            .example("> rexreplace 'Foo' 'xxx' myfile.md", "'foobar' in myfile.md will become 'xxxbar'")
            .example('')
            .example("> rr xxx Foo myfile.md", "The alias 'rr' can be used instead of 'rexreplace'")
            .example('')
            .example("> rexreplace '(f?(o))o(.*)' '$3$1€2' myfile.md", "'foobar' in myfile.md will become 'barfoo'")
            .example('')
            .example("> rexreplace '^#' '##' *.md", "All markdown files in this dir got all headlines moved one level deeper")
            .example('')
            .example("> rexreplace 'a' 'b' 'myfile.md' 'src/**/*.*' ", "Provide multiple files or globs if needed")
            .version('v', 'Print rexreplace version (can be given as only argument)', version)
            .alias('v', 'version')
            .boolean('I')
            .describe('I', 'Void case insensitive search pattern.')
            .alias('I', 'void-ignore-case')
            .boolean('G')
            .describe('G', 'Void global search (stop looking after the first match).')
            .alias('G', 'void-global')
            .boolean('M')
            .describe('M', 'Void multiline search pattern. Makes ^ and $ match start/end of whole content rather than each line.')
            .alias('M', 'void-multiline')
            .boolean('s')
            .describe('s', 'Have `.` also match newline.')
            .alias('s', 'dot-all')
            .boolean('u')
            .describe('u', 'Treat pattern as a sequence of unicode code points.')
            .alias('u', 'unicode')
            .default('e', 'utf8')
            .alias('e', 'encoding')
            .describe('e', 'Encoding of files/piped data.')
            .alias('E', 'engine')
            .describe('E', 'What regex engine to use:')
            .choices('E', ['V8' ])
            .default('E', 'V8')
            .boolean('L')
            .describe('L', 'Literal string search (no regex used when searching)')
            .alias('L', 'literal')
            .boolean('€')
            .describe('€', "Void having '€' as alias for '$' in pattern and replacement parameters")
            .alias('€', 'void-euro')
            .boolean('§')
            .describe('§', "Void having '§' as alias for '\\' in pattern and replacement parameters")
            .alias('§', 'void-section')
            .boolean('A')
            .alias('A', 'void-async')
            .describe('A', "Handle files in a synchronous flow. Good to limit memory usage when handling large files. ")
            .boolean('H')
            .describe('H', 'Halt on first error')
            .alias('H', 'halt')
            .alias('H', 'bail')
            .default('H', false)
            .boolean('q')
            .describe('q', 'Only display errors (no other info)')
            .alias('q', 'quiet')
            .boolean('Q')
            .describe('Q', 'Never display errors or info')
            .alias('Q', 'quiet-total')
            .boolean('B')
            .describe('B', 'Avoid temporary backing up files. Works async (independent of -A flag) and will speed up things but at one point data lives only in memory, and you might lose data if the process is forced closed.')
            .alias('B', 'void-backup')
            .boolean('b')
            .describe('b', 'Keep the backup file with the original content.')
            .alias('b', 'keep-backup')
            .boolean('o')
            .describe('o', 'Output the final result instead of saving to file. Will output the full content even if no replacement has taken place.')
            .alias('o', 'output')
            //.conflicts('o','O')
            .boolean('m')
            .describe('m', "Output each match on a new line. " +
            "Will not replace any content but you still need to provide a dummy value (like `_`) as replacement parameter. " +
            "If search pattern does not contain matching groups the full match will be outputted. " +
            "If search pattern _does_ contain matching groups only matching groups will be outputted (same line with no delimiter). " +
            "")
            .alias('m', 'output-match')
            .boolean('T')
            .alias('T', 'trim-pipe')
            .describe('T', "Trim piped data before processing. " +
            "If piped data only consists of chars that can be trimmed (new line, space, tabs...) it will become an empty string. " +
            '')
            .boolean('R')
            .alias('R', 'replacement-pipe')
            .describe('R', "Replacement is being piped in. You still need to provide a dummy value (like `_`) as replacement parameter.")
            .conflicts('R', 'g')
            .conflicts('R', 'G')
            .boolean('g')
            .describe('g', 'Filename/globs will be piped in. If filename/globs are provided in command (-X flags are ok) the execution will halt')
            .alias('g', 'glob-pipe')
            .conflicts('g', 'G')
            /*    .boolean('G')
        .describe('G', "filename/globs provided are to files containing one target filename/glob per line")
        .alias('G', 'glob-file')
        .conflicts('G','g')*/
            .boolean('S')
            .describe('S', 'Simulate output without changing any files')
            .alias('S', 'simulate')
            .string('x')
            .describe('x', 'Exclude files with a path that matches this regular expression. Will follow same regex flags and setup as the main search. Can be used multiple times.')
            .alias('x', 'exclude-re')
            .string('X')
            .describe('X', 'Exclude files found with this glob. Can be used multiple times.')
            .alias('X', 'exclude-glob')
            .boolean('V')
            .describe('V', 'More chatty output')
            .alias('V', 'verbose')
            .boolean('d')
            .describe('d', 'Print debug info')
            .alias('d', 'debug')
            //.conflicts('V', 'q')
            //.conflicts('V', 'Q')
            /*
        
        
        -T (Expect no match in any file and return exit 1 if found)
        -t (Expect a match in each file and return exit 1 if not found)

        
        .boolean('N')
            .alias('N', 'void-newline')
            .describe('N',
                `Avoid having newline when outputting data (or when piping). `+
                `Normally . `+
                   ''
            )
        
        

        .boolean('p')
            .describe('p', "Pattern is the path to a filename containing the pattern. If more than one line is found in the file the pattern will be defined by each line trimmed and having newlines removed followed by other all rules (like -€).)")
            .alias('p', 'pattern-file')
        

        .boolean('r')
            .alias('r', 'replacement-file')
            .describe('r',
                `Replacement is the path to a filename containing the replacement`.`Will run before any other rules (like -€)`
            )



        .boolean('n')
            .describe('n', "Do replacement on file path+name instead of file content (rename/move the files)")
            .alias('n', 'name')

        // https://github.com/eugeneware/replacestream
        .integer('M')
            .describe('M', "Maximum length of match. Set this value only if any single file of your ")
            .alias('M', 'max-match-len')
            .default('M', false)


       


        .boolean('J')
            .describe('J', "Pattern is javascript source that will return a string giving the pattern to use")
            .alias('J', 'pattern-js')


        .boolean('glob-js')
            .describe('glob-js', "filename/globs are javascript source that will return a string with newline seperating each glob to work on")


        */
            .boolean('j')
            .alias('j', 'replacement-js')
            .describe('j', "Treat replacement as javascript source code. \n\tThe statement from the last expression will become the replacement string. \n\tPurposefully implemented the most insecure way possible to remove _any_ incentive to consider running code from an untrusted party. \n\tThe full match will be available as a javascript variable named $0 while each captured group will be available as $1, $2, $3, ... and so on. \n\tAt some point, the $ char _will_ give you a headache when used from the command line, so use €0, €1, €2, €3... instead. \n\tIf the javascript source code references to the full match or a captured group the code will run once per match. Otherwise, it will run once per file. \n\t\n\tThe code has access to the following variables: \n\t`r` as an alias for `require` with both expanded to understand a relative path even if it is not starting with `./`, \n\t`fs` from node, \n\t`path` from node, \n\t`glob` proxy name for the .sync function of fast-glob from npm, \n\t`pipe`: the data piped into the command (null if no piped data), \n\t`find`: pattern searched for (the needle), \n\t`text`: full text being searched i.e. file content or piped data (the haystack), \n\t`bytes`: total size of the haystack in bytes, \n\t`size`: human-friendly representation of the total size of the haystack, \n\t`time`: String representing the local time when the command was invoked,\n\t`time_obj`: date object representing `time`,\n\t`now`: alias for `time`,\n\t`cwd`: current process working dir, \n\t`nl`: a new-line char,\n\t`_`: a single space char (for easy string concatenation).\n\t\n\tThe following values defaults to `❌` if haystack does not originate from a file:\n\t`file`: contains the full path of the active file being searched (including full filename), \n\t`file_rel`: contains `file` relative to current process working dir, \n\t`dirpath`: contains the full path without filename of the active file being searched, \n\t`dirpath_rel`: contains `dirpath` relative to current process working dir, \n\t`filename`: is the full filename of the active file being searched without path, \n\t`name`: filename of the active file being searched with no extension, \n\t`ext`: extension of the filename including leading dot, \n\t`mtime`: ISO inspired representation of the last local modification time of the current file, \n\t`ctime`: ISO representation of the local creation time of the current file. \n\t`mtime_obj`: date object representing `mtime`, \n\t`ctime_obj`: date object representing `ctime`. \n\t\n\tAll variables, except from module, date objects, `nl` and `_`, has a corresponding variable name followed by `_` where the content has an extra space at the end (for easy concatenation). \n\t")
            .help('h')
            .describe('h', 'Display help.')
            .alias('h', 'help')
            .epilog("Inspiration: .oO(What should 'sed' have been by now?)").argv;
        // All options into one big config object for the rexreplace engine
        var conf = {};
        // Use only camelCase full lenght version of settings
        Object.keys(argv).forEach(function (key) {
            if (1 < key.length && key.indexOf('-') < 0) {
                conf[key] = argv[key];
            }
        });
        conf.pipeData = null;
        conf.showHelp = argv.showHelp;
        conf.needHelp = needHelp;
        conf.pattern = pattern;
        conf.includeGlob = argv._;
        conf.excludeGlob = [].concat( argv.excludeGlob ).filter(Boolean);
        conf.excludeRe = [].concat( argv.excludeRe ).filter(Boolean);
        conf.replacement = replacement;
        if (!conf.replacementJs) {
            conf.replacement = unescapeString(conf.replacement);
        }
        return conf;
    }
    function executeReplacement(conf) {
        if (0 < conf.needHelp) {
            return backOut(conf.needHelp - 1, conf.showHelp);
        }
        if (conf.output)
            { process.stdout.setDefaultEncoding(conf.encoding); }
        if (Boolean(process.stdin.isTTY))
            { return engine(conf); }
        process.stdin.setEncoding(conf.encoding);
        var pipeInUse = false;
        var pipeData = '';
        process.stdin.on('readable', function () {
            var chunk = process.stdin.read();
            if (null !== chunk) {
                pipeInUse = true;
                pipeData += chunk;
                while ((chunk = process.stdin.read())) {
                    pipeData += chunk;
                }
            }
        });
        process.stdin.on('end', function () {
            if (pipeInUse) {
                if (conf.trimPipe) {
                    pipeData = pipeData.trim();
                }
                conf.pipeData = pipeData;
            }
            engine(handlePipeData(conf));
        });
    }
    function backOut(exitcode, cb) {
        if ( exitcode === void 0 ) exitcode = 1;

        cb && cb();
        process.exitCode = exitcode;
        process.exit();
    }
    function unescapeString(str) {
        if ( str === void 0 ) str = '';

        return new Function(("return '" + (str.replace(/'/g, "\\'")) + "'"))();
    }
    function handlePipeData(conf) {
        process.stdin.setDefaultEncoding(conf.encoding);
        outputConfig(conf);
        step('Check Piped Data');
        if (conf.replacementPipe) {
            step('Piping replacement');
            if (null === conf.pipeData) {
                return die('You flagged that replacement will be piped in - but no data arrived.');
            }
            conf.replacement = conf.pipeData;
            if (!conf.replacementJs)
                { conf.pipeData = null; }
        }
        else if (conf.globPipe) {
            step('Piping globs');
            if (conf.includeGlob.length) {
                return die('Please pipe file/globs OR provide as parameters. Not both.');
            }
            if (null === conf.pipeData) {
                return die('You flagged that filenames/globs will be piped in - but no data arrived.');
            }
            conf.globs = conf.pipeData;
            if (!conf.replacementJs)
                { conf.pipeData = null; }
        }
        else if (null !== conf.pipeData && !conf.includeGlob.length) {
            step('Content being piped');
            conf.contentWasPiped = true;
            conf.output = true;
            process.stdout.setDefaultEncoding(conf.encoding);
        }
        return conf;
    }

    exports.cli2conf = cli2conf;
    exports.executeReplacement = executeReplacement;

    Object.defineProperty(exports, '__esModule', { value: true });

    return exports;

})({});
