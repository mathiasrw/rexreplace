#!/usr/bin/env node
(function () {
    'use strict';

    var font = {
        red: function (x) { return ("\u001b[31m" + x + "\u001b[39m"); },
        green: function (x) { return ("\u001b[32m" + x + "\u001b[39m"); },
        gray: function (x) { return ("\u001b[90m" + x + "\u001b[39m"); },
    };
    // check for node version supporting chalk - if so overwrite `font`
    // font = require('chalk');
    var config = null;
    var setOutputConfig = function (_config) {
        config = _config;
    };
    var info = function (msg, data) {
        if ( data === void 0 ) data = '';

        if (config.quiet || config.quietTotal) {
            return;
        }
        console.error(font.gray(msg), data);
    };
    var chat = function (msg, data) {
        if ( data === void 0 ) data = '';

        if (config.verbose) {
            info(msg, data);
        }
        else {
            debug(msg, data);
        }
    };
    var die = function (msg, data, displayHelp) {
        if ( data === void 0 ) data = '';
        if ( displayHelp === void 0 ) displayHelp = false;

        if (displayHelp && !config.quietTotal) {
            config.showHelp();
        }
        error(msg, data);
        kill(msg);
    };
    var error = function (msg, data) {
        if ( data === void 0 ) data = '';

        if (!config.quiet && !config.quietTotal) {
            console.error('');
            console.error('  ⚠️   ' + font.red(msg), data);
            console.error('');
        }
        if (config.halt) {
            kill(msg);
        }
        return false;
    };
    function debug(msg, data) {
        if (config.debug) {
            console.error(msg, '\x1b[90m');
            console.error(data);
            console.error('\x1b[39m');
        }
    }
    function step(msg, data) {
        if ( data === void 0 ) data = '';

        if (config.verbose) {
            debug(font.green(msg), data);
        }
    }
    function kill(msg, error) {
        if ( msg === void 0 ) msg = '';
        if ( error === void 0 ) error = 1;

        console.error(font.gray('      See instructions with: ') + font.green('rexreplace --help'));
        console.error('\x1b[90m');
        process.exitCode = error;
        throw new Error(msg);
    }

    var Datapoint = function Datapoint() {
        this.setFile(null, null);
        this.streamIn = null;
        this.streamOut = null;
        this.streamInOut = null;
        this._type = {
            isStream: false,
            isStreamIn: false,
            isStreamOut: false,
            isStreamInOut: false,
            isFile: false,
        };
    };

    var prototypeAccessors = { path: { configurable: true },content: { configurable: true },type: { configurable: true },streamIn: { configurable: true },streamOut: { configurable: true },streamInOut: { configurable: true } };

    prototypeAccessors.path.get = function () {
        return this._path;
    };
    prototypeAccessors.content.get = function () {
        return this._content;
    };
    Datapoint.prototype.flushContent = function flushContent () {
        delete this._content;
        return this;
    };
    Datapoint.prototype.setFile = function setFile (path, content) {
        this._path = path;
        this._content = content;
        this.setType({ isFile: true });
        return this;
    };
    prototypeAccessors.type.get = function () {
        return this._type;
    };
    Datapoint.prototype.setType = function setType (x) {
        this._type = Object.assign({}, this._type, x);
    };
    prototypeAccessors.streamIn.get = function () {
        return this._streamIn;
    };
    prototypeAccessors.streamIn.set = function (x) {
        if (null !== x) {
            this._streamIn = x;
            this.setType({ isStream: true, isStreamIn: true });
        }
    };
    prototypeAccessors.streamOut.get = function () {
        return this._streamOut;
    };
    prototypeAccessors.streamOut.set = function (x) {
        if (null !== x) {
            this._streamOut = x;
            this.setType({ isStream: true, isStreamOut: true });
        }
    };
    prototypeAccessors.streamInOut.get = function () {
        return this._streamInOut;
    };
    prototypeAccessors.streamInOut.set = function (x) {
        if (null !== x) {
            this._streamInOut = x;
            this.setType({ isStream: true, isStreamInOut: true });
        }
    };
    Datapoint.prototype.setStreamIn = function setStreamIn (x) {
        this.streamIn = x;
        return this;
    };
    Datapoint.prototype.setStreamOut = function setStreamOut (x) {
        this.streamOut = x;
        return this;
    };
    Datapoint.prototype.setStreamInOut = function setStreamInOut (x) {
        this.streamInOut = x;
        return this;
    };

    Object.defineProperties( Datapoint.prototype, prototypeAccessors );
    Datapoint.prototype.toString = function DatapointToString() {
        if (this.isStream)
            { return 'Stream'; }
        return this.path;
    };

    var fs = require('fs'), path = require('path'), globs = require('globs'), replaceStream = require('replacestream');
    var initTime = new Date();
    function handlePipedData(config, stream) {
        if ( stream === void 0 ) stream = null;

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
    var version = '4.1.1';
    function engine(config, stream) {
        if ( config === void 0 ) config = { engine: 'V8' };
        if ( stream === void 0 ) stream = null;

        setOutputConfig(config);
        debug('Initial config', config);
        var haystack = handlePipedData(config, stream);
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
        debug('files found', config.files);
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
            .forEach(function (filepath) { return treatFile(filepath, config); });
    }
    function treatFile(file, config) {
        /*if()
        
        fs.createReadStream('a.jpg')
    */
        if (config.voidAsync) {
            debug('Open sync', file);
            var data = fs.readFileSync(file, config.encoding);
            return doReplacement(config, new Datapoint().setFile(file, data));
        }
        else {
            debug('Open async', file);
            fs.readFile(file, config.encoding, function (err, data) {
                if (err) {
                    return error(err);
                }
                return doReplacement(config, new Datapoint().setFile(file, data));
            });
        }
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
            return haystack.streamIn
                .pipe(replaceStream(config.regex, config.replacement, { maxMatchLen: config.maxMatchLen }))
                .pipe(process.stdout);
        }
        var file = haystack.path;
        // Main regexp of the whole thing
        var result = haystack.content.replace(config.regex, config.replacement);
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
        var oriFile = path.normalize(path.join(process.cwd(), file));
        var salt = new Date()
            .toISOString()
            .replace(/:/g, '_')
            .replace('Z', '');
        var backupFile = oriFile + '.' + salt + '.backup';
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
        fs.rename(oriFile, backupFile, function (err) {
            if (err) {
                return error(err);
            }
            fs.writeFile(oriFile, result, config.encoding, function (err) {
                if (err) {
                    return error(err);
                }
                if (!config.keepBackup) {
                    fs.unlink(backupFile, function (err) {
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
        var pattern = config.pattern;
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
                var arguments$1 = arguments;

                debug('Output match', arguments);
                if (arguments.length === 3) {
                    step('Printing full match');
                    process.stdout.write(arguments[0] + '\n');
                    return arguments[0];
                }
                for (var i = 1; i < arguments.length - 2; i++) {
                    process.stdout.write(arguments$1[i]);
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
        var regex, pattern = config.pattern;
        if (config.literalSearch) {
            pattern = escapeStrForRegex(config.pattern);
        }
        var flags = getFlags(config);
        switch (config.engine) {
            case 'V8':
                regex = new RegExp(pattern, flags);
                break;
            case 'RE2':
                var RE2 = require('re2');
                regex = new RE2(pattern, flags);
                break;
            default:
                die(("Engine " + (config.engine) + " not supported yet"));
        }
        debug('Final regex', regex);
        return regex;
    }
    function getFlags(config) {
        step('Getting flags');
        var flags = '';
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
        var i = Math.floor(Math.log(size) / Math.log(1024));
        return ((size / Math.pow(1024, i)).toFixed(!!i ? 1 : 0) + ' ' + ['Bytes', 'KB', 'MB', 'GB', 'TB'][i]);
    }
    function dynamicReplacement(config, haystack) {
        // prettier-ignore
        var now_obj = new Date(), handleReplacementJsSrc = 'var __require__ = require;' +
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
        var _ = {
            find: config.pattern,
            replacementJsSrc: config.replacementOri,
            cwd: process.cwd(),
            time_obj: initTime,
            time: localTimeString(initTime),
            now_obj: now_obj,
            now: localTimeString(now_obj),
            nl: '\n',
        };
        _.toString = function () { return ' '; };
        if (config.jsFullText) {
            _.text = haystack.content;
        }
        if (haystack.type.isFile) {
            _.file = path.normalize(path.join(_.cwd, haystack.path));
            _.dirname = _.file.match(/[\\\/]+([^\\\/]+)[\\\/]+[^\\\/]+$/)[1];
            _.file_rel = path.relative(_.cwd, _.file);
            var pathInfo = path.parse(_.file);
            _.dirpath = pathInfo.dir;
            _.dirpath_rel = path.relative(_.cwd, _.dirpath);
            _.filename = pathInfo.base;
            _.name = pathInfo.name;
            _.ext = pathInfo.ext;
            var needsByteOrSize = /bytes|size/.test(config.replacement);
            var betterToReadfromFile = needsByteOrSize && 50e6 < haystack.content.length; // around 50 Mb files will lead to reading filezise from file instead of copying into buffer
            if (betterToReadfromFile || /[mc]time/.test(config.replacement)) {
                var fileStats = fs.statSync(_.file);
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
        var easyVarAccess = '';
        for (var prop in _) {
            if ('replacementJsSrc' === prop) {
                continue;
            }
            easyVarAccess += "var " + prop + " = _." + prop + ";";
            if ('text' === prop) {
                continue;
            }
            var type = Object.prototype.toString.call(_[prop]);
            if (type === '[object String]' || type === '[object Number]') {
                easyVarAccess += "var " + prop + "_ = _." + prop + " + ' ';";
            }
        }
        // Run only once if captured groups for sure (replacement cant change anyway)
        if (!/\$\d/.test(config.replacement)) {
            return fnWrapper(_, easyVarAccess + handleReplacementJsSrc);
        }
        // Captured groups might be present, so need to run once per match
        return function () {
            var arguments$1 = arguments;

            step('Match found', arguments);
            var capturedGroups = '';
            for (var i = 0; i < arguments.length - 2; i++) {
                capturedGroups += 'var $' + i + '=' + JSON.stringify(arguments$1[i]) + ';';
            }
            return fnWrapper(_, easyVarAccess + capturedGroups + handleReplacementJsSrc);
        };
    }
    function fnWrapper(_, src) {
        return new Function('_', 'require', 'fs', 'path', 'globs', src)(_, require, fs, path, globs);
    }
    function localTimeString(dateObj) {
        if ( dateObj === void 0 ) dateObj = new Date();

        var y = dateObj.getFullYear(), mo = ('0' + (dateObj.getMonth() + 1)).slice(-2), d = ('0' + dateObj.getDate()).slice(-2), h = ('0' + dateObj.getHours()).slice(-2), mi = ('0' + dateObj.getMinutes()).slice(-2), s = ('0' + dateObj.getSeconds()).slice(-2), ms = ('00' + dateObj.getMilliseconds()).slice(-3);
        return (y + "-" + mo + "-" + d + " " + h + ":" + mi + ":" + s + "." + ms);
    }
    function escapeStrForRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    /*
    process.on('exit',function(code){
        code || stream.end();
      });
      
      */

    var assign;
    var font$1 = {
        red: function (x) { return ("\u001b[31m" + x + "\u001b[39m"); },
        green: function (x) { return ("\u001b[32m" + x + "\u001b[39m"); },
        gray: function (x) { return ("\u001b[90m" + x + "\u001b[39m"); },
    };
    var pattern, replacement;
    // To avoid problems with patterns or replacements starting with '-' the two first arguments can not contain flags and are removed before yargs does it magic - but we still need to handle -version and -help
    var needHelp = null;
    if (process.argv.length < 4) {
        if (/^-?(v|version)$/.test(process.argv[process.argv.length - 1])) {
            console.log(version);
            process.exit(0);
        }
        if (/^--?(h|help)$/.test(process.argv[process.argv.length - 1])) {
            needHelp = '';
        }
        else {
            needHelp = 'Please provide parameters for both a seach-pattern and replacement';
        }
    }
    else {
        (assign = process.argv.splice(2, 2), pattern = assign[0], replacement = assign[1]);
    }
    var yargs = getCLIcommands();
    function backOut(needHelp) {
        if ('' === needHelp) {
            yargs.showHelp();
        }
        else {
            console.error('');
            console.error('  ⚠️   ' + font$1.red(needHelp));
            console.error('');
            console.error('      ' +
                font$1.gray('See instructions with: ') +
                font$1.green(process.argv[1].match(/[\\\/]([^\\\/]+)[\\\/]?$/)[1] + ' --help'));
            console.error('');
        }
        process.exitCode = 1;
        return null;
    }
    function unescapeString(str) {
        return new Function("return '" + str.replace(/'/g, "\\'") + "'")();
    }
    (function () {
        var inputIsPiped = !Boolean(process.stdin.isTTY);
        var outputIsPiped = !Boolean(process.stdout.isTTY);
        if (null !== needHelp) {
            return backOut(needHelp);
        }
        // All options into one big config object for the rexreplace core
        var config = yargs.argv;
        // Use only camelCase full lenght version of settings so we make sure the core can be documented propperly
        // Todo: check if this is needed at all.
        if (config.debug) {
            Object.keys(yargs.argv).forEach(function (key) {
                if (1 < key.length && key.indexOf('-') < 0) {
                    config[key] = yargs.argv[key];
                }
            });
        }
        var RE_EURO = /€/g;
        // CLI interface default has € as alias for $
        if (!config.voidEuro) {
            pattern = pattern.replace(RE_EURO, '$');
            replacement = replacement.replace(RE_EURO, '$');
        }
        config.maxMatchLen = Number(config.maxMatchLen);
        if (!(0 < config.maxMatchLen)) {
            return backOut('Please provide a positive number as argument to --max-match-len');
        }
        config.globs = yargs.argv._;
        config.showHelp = yargs.showHelp;
        config.pattern = pattern;
        if (config.replacementJs) {
            config.replacement = replacement;
        }
        else {
            config.replacement = unescapeString(replacement);
        }
        if (!config.output && outputIsPiped && !config.voidAutoOutput) {
            console.error(font$1.gray('Looks like you are Piping output. Dont forget to set the -o flag'));
            // config.output = true;
        }
        if (!inputIsPiped) {
            if (config.replacementPipe) {
                return backOut('You asked to let piped data be the replacement - but no data was piped.');
            }
            return engine(config);
        }
        if (!config.replacementPipe) {
            engine(config, process.stdin);
        }
        else {
            var content = '';
            process.stdin.resume();
            process.stdin.setEncoding(config.encoding);
            process.stdin.on('data', function (buf) {
                content += buf.toString();
            });
            process.stdin.on('end', function () {
                if (yargs.argv.trimPipe) {
                    content = content.trim();
                }
                config.replacement = content;
                engine(config);
            });
        }
    })();
    function getCLIcommands() {
        return (require('yargs')
            .strict()
            .usage('RexReplace ' +
            version +
            ': Regexp search and replace for files using lookahead and backreference to matching groups in the replacement. Defaults to global multiline case-insensitive search.\n\n' +
            '> rexreplace pattern replacement [fileGlob|option]+')
            .example("> rexreplace 'Foo' 'xxx' myfile.md", "'foobar' in myfile.md will become 'xxxbar'")
            .example('')
            .example("> rr Foo xxx myfile.md", "The alias 'rr' can be used instead of 'rexreplace'")
            .example('')
            .example("> rexreplace '(f?(o))o(.*)' '$3$1€2' myfile.md", "'foobar' in myfile.md will become 'barfoo'")
            .example('')
            .example("> rexreplace '^#' '##' *.md", "All markdown files in this dir got all headlines moved one level deeper")
            .version('v', 'Print rexreplace version (can be given as only argument)', version)
            .alias('v', 'version')
            .default('e', 'utf8')
            .alias('e', 'encoding')
            .describe('e', 'Encoding of files/piped data.')
            .boolean('I')
            .describe('I', 'Void case insensitive search pattern.')
            .alias('I', 'void-ignore-case')
            .boolean('M')
            .describe('M', 'Void multiline search pattern. Makes ^ and $ match start/end of whole content rather than each line.')
            .alias('M', 'void-multiline')
            .boolean('G')
            .describe('G', 'Void global search (stop looking after the first match).')
            .alias('G', 'void-global')
            .boolean('u')
            .describe('u', 'Treat pattern as a sequence of unicode code points.')
            .alias('u', 'unicode')
            .boolean('€')
            .describe('€', "Void having '€' as alias for '$' in pattern and replacement parameters")
            .alias('€', 'void-euro')
            .boolean('q')
            .describe('q', 'Only display errors (no other info)')
            .alias('q', 'quiet')
            .boolean('Q')
            .describe('Q', 'Never display errors or info')
            .alias('Q', 'quiet-total')
            .boolean('V')
            .describe('V', 'More chatty output')
            .alias('V', 'verbose')
            .conflicts('V', ['q', 'Q'])
            .boolean('d')
            .describe('d', 'Print debug info')
            .alias('d', 'debug')
            .boolean('H')
            .describe('H', 'Halt on first error')
            .alias('H', 'halt')
            .default('H', false)
            .boolean('A')
            .alias('A', 'void-async')
            .describe('A', "Handle files in a synchronous flow. Good to limit memory usage when handling large files. " +
            '')
            .boolean('T')
            .alias('T', 'trim-pipe')
            .describe('T', "Trim piped data before processing. " +
            "If piped data only consists of chars that can be trimmed (new line, space, tabs...) it will become an empty string. " +
            '')
            .boolean('R')
            .alias('R', 'replacement-pipe')
            .describe('R', "Replacement will be piped in. You still need to provide a dummy value (like `_`) as replacement parameter." +
            '')
            .alias('E', 'engine')
            .describe('E', 'What regex engine to use:')
            .choices('E', ['V8', 'RE2' ])
            .default('E', 'V8')
            .string('max-match-len')
            .describe('max-match-len', 'Number of characters to in the largest expected match when data is piped in. Can be scientific notation. Please mesure performance overhead if changing the value. Defaults to ~2 Mb.')
            .default('max-match-len', '2e5')
            /*.requiresArg('max-match-len')
    .coerce('max-match-len', function(val) {
        return Number(val) || (needHelp = 'Please provide a number as argument to --max-match-len');
    })*/
            .boolean('j')
            .alias('j', 'replacement-js')
            .describe('j', "Treat replacement as javascript source code. \nThe statement from the last expression will become the replacement string. \nPurposefully implemented the most insecure way possible to remove _any_ incentive to consider running code from an untrusted part. \nThe full match will be available as a javascript variable named $0 while each captured group will be available as $1, $2, $3, ... and so on. \nAt some point, the $ char _will_ give you a headache when used from the command line, so use €0, €1, €2, €3... instead. \nIf the javascript source code references to the full match or a captured group the code will run once per match. Otherwise, it will run once per file. \n\nThe code has access to the following variables: \n`r` as an alias for `require` with both expanded to understand a relative path even if it is not starting with `./`, \n`fs` from node, \n`path` from node, \n`globs` from npm, \n`text`: If the '--js-full-text' flag is set this will contain the full text being searched i.e. file content or piped data (the haystack), \n`find`: pattern searched for (the needle), \n`bytes`: total size of the haystack in bytes, \n`size`: human-friendly representation of the total size of the haystack, \n`time`: String representing the local time when the command was invoked (same for each file),\n`time_obj`: date object representing `time`,\n`now`: String representing the local current time (might be different for each file),\n`now_obj`: date object representing `now`,\n`cwd`: current process working dir, \n`nl`: a new-line char,\n`_`: a single space char (for easy string concatenation).\n\nThe following values are available if haystack originate from a file:\n`file`: contains the full path of the active file being searched (including full filename), \n`file_rel`: contains `file` relative to current process working dir, \n`dirpath`: contains the full path without filename of the active file being searched, \n`dirpath_rel`: contains `dirpath` relative to current process working dir, \n`filename`: is the full filename of the active file being searched without path, \n`name`: filename of the active file being searched with no extension, \n`ext`: extension of the filename including leading dot, \n`mtime`: ISO inspired representation of the last local modification time of the current file, \n`mtime_obj`: date object representing `mtime`, \n`ctime`: ISO representation of the local creation time of the current file. \n`ctime_obj`: date object representing `ctime`. \n\nAll variables, except from module, date objects, ´text` ´nl` and `_`, has a corresponding variable name followed by `_` where the content has an extra space at the end (for easy concatenation). \n")
            .boolean('js-full-text')
            .describe('js-full-text', 'Exposes the full text being searched as `text` when the replacement is generated from javascript. Please note performance overhead with many or large files. Will force piped data to be hold in memory instead of streamed.')
            .implies('js-full-text', 'j')
            .boolean('B')
            .describe('B', 'Avoid temporary backing up file. Works async (independent of -A flag) and will speed up things but at one point data lives only in memory, and you will lose the content if the process is abrupted.')
            .alias('B', 'void-backup')
            .boolean('b')
            .describe('b', 'Keep a backup file of the original content.')
            .alias('b', 'keep-backup')
            /*.boolean('O')
            .describe(
                'O',
                'Void the detection automaticly setting the --output if output is being piped along.'
            )
            .alias('O', 'void-auto-output')*/
            .boolean('o')
            .describe('o', 'Output the final result instead of saving to file. Will also output content even if no replacement has taken place.')
            .alias('o', 'output')
            .boolean('m')
            .describe('m', "Output each match on a new line. " +
            "Will not replace any content but you still need to provide a dummy value (like `_`) as replacement parameter. " +
            "If search pattern does not contain matching groups the full match will be outputted. " +
            "If search pattern does contain matching groups only matching groups will be outputted (same line with no delimiter). " +
            "")
            .alias('m', 'output-match')
            .boolean('L')
            .describe('L', 'literally search for the string provided as pattern (regex flags for global search/case insensitive still applied).')
            .alias('L', 'literal-search')
            /*
        // like trimming the last nl. Think its about the "echo" thing
        .boolean('N')
        .alias('N', 'void-newline')
        .describe('N',
            `Avoid having newline when outputting data (or when piping). `+
            `Normally . `+
               ''
        )


    -A (Expect there to be no match and return exit 1 if found)
    -a (Expect there to be a match and return exit 1 if not found)
    */
            /*    .boolean('P')
        .describe('P', "Pattern is a filename from where the pattern will be generated. If more than one line is found in the file the pattern will be defined by each line trimmed and having newlines removed followed by other all rules (like -€).)")
        .alias('P', 'pattern-file')

    .boolean('R')
        .alias('R', 'replacement-file')
        .describe('R',
            `Replacement is a filename from where the replacement will be generated. ` +
            `If more than one line is found in the file the final replacement will be defined by each line trimmed and having newlines removed followed by all other rules (like -€).`
        )

    */
            /* // Ideas

    .boolean('n')
        .describe('n', "Do replacement on file names instead of file content (rename the files)")
        .alias('n', 'name')

    // https://github.com/eugeneware/replacestream

    .integer('M')
        .describe('M', "Maximum length of match. Set this value only if any single file of your ")
        .alias('M', 'max-match-len')
        .default('M', false)



    .boolean('G')
        .describe('G', "filename/globas are filename(s) for files containing one filename/globs on each line to be search/replaced")
        .alias('G', 'globs-file')

    .boolean('g')
        .describe('g', "filename/globs will be piped in. If any filename/globs are given in command the piped data will be prepened")
        .alias('g', 'glob-pipe')


    .boolean('j')
        .describe('j', "Pattern is javascript source that will return a string giving the pattern to use")
        .alias('j', 'pattern-js')


    .boolean('glob-js')
        .describe('glob-js', "filename/globs are javascript source that will return a string with newline seperating each glob to work on")


    */
            .help('h')
            .describe('h', 'Display help.')
            .alias('h', 'help')
            .epilog("Inspiration: .oO(What should 'sed' have been by now?)"));
    }

}());
