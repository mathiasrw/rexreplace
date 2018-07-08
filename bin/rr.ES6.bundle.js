#!/usr/bin/env node
(function () {
    'use strict';

    var font = {};
    font.red = font.green = font.gray = function (str) { return str; };
    // check for node version supporting chalk - if so overwrite `font`
    //const font = import('chalk');
    var config = null;
    var outputConfig = function (_config) {
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
            debug(msg + ' ' + data);
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
            console.error(font.red(msg), data);
        }
        if (config.halt) {
            kill(msg);
        }
        return false;
    };
    function debug(data) {
        if (config.debug) {
            console.error(font.gray(JSON.stringify(data, null, 4)));
        }
    }
    function step(data) {
        if (config.verbose) {
            debug(data);
        }
    }
    function kill(msg, error) {
        if ( msg === void 0 ) msg = '';
        if ( error === void 0 ) error = 1;

        process.exitCode = error;
        throw new Error(msg);
    }

    var fs = require('fs');
    var path = require('path');
    var globs = require('globs');
    var version = '3.1.0';
    function engine(config) {
        outputConfig(config);
        step('Displaying steps for:');
        step(config);
        config.pattern = getFinalPattern(config) || '';
        config.replacement = getFinalReplacement(config) || '';
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
            .filter(function (filepath) { return (fs.existsSync(filepath) ? true : error('File not found:', filepath)); })
            // Do the replacement
            .forEach(function (filepath) { return openFile(filepath, config); });
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
                var _pipe = _config_rr.pipedData;
                var _text = _data_rr;
                var _find = _config_rr.pattern;
                var code_rr = _config_rr.replacement;
                var _cwd = process.cwd();
                var _file = '', _path = '', _filename = '', _name = '', _ext = '', dynamicContent = new Function('_fs', '_globs', '_pipe', '_text', '_find', '_file', '_path', '_filename', '_name', '_ext', '_cwd', 'code_rr', 'return eval(code_rr)');
                if (!_config_rr.dataIsPiped) {
                    _file = path.normalize(path.join(process.cwd(), _file_rr));
                    var pathInfo = path.parse(_file);
                    _path = pathInfo.dir;
                    _filename = pathInfo.base;
                    _name = pathInfo.name;
                    _ext = pathInfo.ext;
                }
                // Run only once if no captured groups (replacement cant change)
                if (!/\$\d/.test(_config_rr.replacement)) {
                    _config_rr.replacement = dynamicContent(fs, globs, _pipe, _text, _find, _file, _path, _filename, _name, _ext, _cwd, code_rr);
                }
                else {
                    // Captures groups present, so need to run once per match
                    _config_rr.replacement = function () {
                        var arguments$1 = arguments;

                        step(arguments);
                        var __pipe = _pipe, __text = _text, __find = _find, __file = _file, __path = _path, __filename = _filename, __name = _name, __ext = _ext, __cwd = _cwd, __code_rr = code_rr;
                        var capturedGroups = '';
                        for (var i = 0; i < arguments.length - 2; i++) {
                            capturedGroups += 'var $' + i + '=' + JSON.stringify(arguments$1[i]) + '; ';
                        }
                        return dynamicContent(fs, globs, __pipe, __text, __find, __file, __path, __filename, __name, __ext, __cwd, capturedGroups + __code_rr);
                    };
                }
            }
            // Main regexp of the whole thing
            var result = _data_rr.replace(_config_rr.regex, _config_rr.replacement);
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
            var oriFile = path.normalize(path.join(process.cwd(), _file_rr));
            var salt = new Date()
                .toISOString()
                .toString()
                .replace(/:/g, '_')
                .replace('Z', '');
            var backupFile = oriFile + '.' + salt + '.backup';
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
            fs.rename(oriFile, backupFile, function (err) {
                if (err) {
                    return error(err);
                }
                fs.writeFile(oriFile, result, _config_rr.encoding, function (err) {
                    if (err) {
                        return error(err);
                    }
                    if (!_config_rr.keepBackup) {
                        fs.unlink(backupFile, function (err) {
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
            var pattern = config.pattern;
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
                if ('6' > process.versions.node) {
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
            if (config.replacementJs && /\$\d/.test(config.replacement) && process.versions.node < '6') {
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
            step('Get final regex');
            var regex = null;
            var flags = getFlags(config);
            try {
                regex = new RegExp(config.pattern, flags);
            }
            catch (err) {
                die('Wrongly formatted regex pattern', err);
            }
            step(regex);
            return regex;
        }
        function getFlags(config) {
            step('Get flags');
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
            step(flags);
            return flags;
        }
    }

    var assign;
    var pattern, replacement;
    // To avoid problems with patterns or replacements starting with '-' the two first arguments can not contain flags and are removed before yargs does it magic - but we still need to handle -version and -help
    var needHelp = false;
    if (process.argv.length < 4) {
        needHelp = true;
    }
    else {
        (assign = process.argv.splice(2, 2), pattern = assign[0], replacement = assign[1]);
    }
    var yargs = require('yargs')
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
        .boolean('V')
        .describe('V', 'More chatty output')
        .alias('V', 'verbose')
        //.conflicts('V', 'q')
        //.conflicts('V', 'Q')
        .boolean('I')
        .describe('I', 'Void case insensitive search pattern.')
        .alias('I', 'void-ignore-case')
        .boolean('G')
        .describe('G', 'Void global search (stop looking after first match).')
        .alias('G', 'void-global')
        .boolean('M')
        .describe('M', 'Void multiline search pattern. Makes ^ and $ match start/end of whole content rather than each line.')
        .alias('M', 'void-multiline')
        .boolean('u')
        .describe('u', 'Treat pattern as a sequence of unicode code points.')
        .alias('u', 'unicode')
        .default('e', 'utf8')
        .alias('e', 'encoding')
        .describe('e', 'Encoding of files/piped data.')
        .boolean('q')
        .describe('q', 'Only display errors (no other info)')
        .alias('q', 'quiet')
        .boolean('Q')
        .describe('Q', 'Never display errors or info')
        .alias('Q', 'quiet-total')
        .boolean('H')
        .describe('H', 'Halt on first error')
        .alias('H', 'halt')
        .default('H', false)
        .boolean('d')
        .describe('d', 'Print debug info')
        .alias('d', 'debug')
        .boolean('€')
        .describe('€', "Void having '€' as alias for '$' in pattern and replacement parameters")
        .alias('€', 'void-euro')
        .boolean('o')
        .describe('o', 'Output the final result instead of saving to file. Will also output content even if no replacement has taken place.')
        .alias('o', 'output')
        //.conflicts('o','O')
        .boolean('A')
        .alias('A', 'void-async')
        .describe('A', "Handle files in a synchronous flow. Good to limit memory usage when handling large files. " +
        '')
        .boolean('B')
        .describe('B', 'Avoid temporary backing up file. Works async (independent of -A flag) and will speed up things but at one point data lives only in memory, and you will lose the content if the process is abrupted.')
        .alias('B', 'void-backup')
        .boolean('b')
        .describe('b', 'Keep a backup file of the original content.')
        .alias('b', 'keep-backup')
        .boolean('m')
        .describe('m', "Output each match on a new line. " +
        "Will not replace any content but you still need to provide a dummy value (like '_') as replacement parameter. " +
        "If search pattern does not contain matching groups the full match will be outputted. " +
        "If search pattern does contain matching groups only matching groups will be outputted (same line with no delimiter). " +
        "")
        .alias('m', 'output-match')
        .boolean('T')
        .alias('T', 'trim-pipe')
        .describe('T', "Trim piped data before processing. " +
        "If piped data only consists of chars that can be trimmed (new line, space, tabs...) it will become an empty string. " +
        '')
        .boolean('R')
        .alias('R', 'replacement-pipe')
        .describe('R', "Replacement will be piped in. You still need to provide a dummy value (like '_') as replacement parameter." +
        '')
        .boolean('j')
        .alias('j', 'replacement-js')
        .describe('j', "Treat replacement as javascript source code. " +
        "The statement from the last expression will become the replacement string. " +
        "Purposefully implemented the most insecure way possible to remove _any_ incentive to consider running code from an untrusted person - that be anyone that is not yourself. " +
        "The full match will be available as a javascript variable named $0 while each captured group will be available as $1, $2, $3, ... and so on. " +
        "At some point, the $ char _will_ give you a headache when used from the command line, so use €0, €1, €2 €3 ... instead. " +
        "If the javascript source code references to the full match or a captured group the code will run once per match. Otherwise, it will run once per file. " +
        "\nThe code has access to the following variables: " +
        "\n'_fs' from node, " +
        "\n'_globs' from npm, " +
        "\n'_cwd' current working dir, " +
        "\n'_pipe' is the data piped into the command (null if no piped data), " +
        "\n'_find' is the final pattern searched for. " +
        "\n'_text' is the full text being searched (= file contents or piped data). " +
        "\nThe following values are also available if working on a file (if data is being piped they are all set to an empty string): " +
        "\n'_file' is the full path of the active file being searched (including full filename), " +
        "\n'_path' is the full path without filename of the active file being searched, " +
        "\n'_filename' is the full filename of the active file being searched, " +
        "\n'_name' is the filename of the active file being searched with no extension, " +
        "\n'_ext' is the extension of the filename including leading dot. " +
        '')
        /*
            .boolean('N')
            .alias('N', 'void-newline')
            .describe('N',
                `Avoid having newline when outputting data (or when piping). `+
                `Normally . `+
                   ''
            )
        
        
        -E (Expect there to be no match and return exit 1 if found)
        -e (Expect there to be batch and return exit 1 if not found)
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
        .epilog("Inspiration: .oO(What should 'sed' have been by now?)");
    function backOut() {
        yargs.showHelp();
        process.exitCode = 1;
    }
    function unescapeString(str) {
        return new Function("return '" + str.replace(/'/g, "\\'") + "'")();
    }
    (function () {
        if (needHelp) {
            return backOut();
        }
        // CLI interface default has € as alias for $
        if (!yargs.argv.voidEuro) {
            pattern = pattern.replace(/€/g, '$');
            replacement = replacement.replace(/€/g, '$');
        }
        // All options into one big config object for the rexreplace core
        var config = {};
        // Use only camelCase full lenght version of settings so we make sure the core can be documented propperly
        Object.keys(yargs.argv).forEach(function (key) {
            if (1 < key.length && key.indexOf('-') < 0) {
                config[key] = yargs.argv[key];
            }
        });
        var pipeInUse = false;
        var pipeData = '';
        config.files = yargs.argv._;
        config.pipedData = null;
        config.showHelp = yargs.showHelp;
        config.pattern = pattern;
        if (config.replacementJs) {
            config.replacement = replacement;
        }
        else {
            config.replacement = unescapeString(replacement);
        }
        /*if(Boolean(process.stdout.isTTY)){
            config.output = true;
        }*/
        if (Boolean(process.stdin.isTTY)) {
            if (config.replacementPipe) {
                return backOut();
            }
            engine(config);
        }
        else {
            process.stdin.setEncoding(config.encoding);
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
                    if (yargs.argv.trimPipe) {
                        pipeData = pipeData.trim();
                    }
                    config.pipedData = pipeData;
                }
                engine(config);
            });
        }
    })();

}());
