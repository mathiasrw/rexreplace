#!/usr/bin/env node
(function () {
    'use strict';

    let font = {};
    font.red = font.green = font.gray = (str)=>str;
    // check for node version supporting chalk - if so overwrite `font`
    //const font = import('chalk');
    let config = null;
    const outputConfig = function(_config) {
        config = _config;
    };
    const info = function(msg, data = '') {
        if (config.quiet || config.quietTotal) {
            return;
        }
        console.error(font.gray(msg), data);
    };
    const chat = function(msg, data = '') {
        if (config.verbose) {
            info(msg, data);
        } else {
            debug(msg + ' ' + data);
        }
    };
    const die = function(msg = '', data = '', displayHelp = false) {
        if (displayHelp && !config.quietTotal) {
            config.showHelp();
        }
        msg && error(' ❌ ' + msg, data);
        kill();
    };
    const error = function(msg, data = '') {
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
    function kill(error = 1, msg = '') {
        msg && console.error(+msg);
        process.exit(error);
    }

    const fs = require('fs-extra');
    const path = require('path');
    const globs = require('globs');
    const now = new Date();
    const re = {
        euro: /€/g,
        section: /§/g,
        mctime: /[mc]time/,
        colon: /:/g,
        capturedGroupRef: /\$\d/,
        regexSpecialChars: /[-\[\]{}()*+?.,\/\\^$|#\s]/g,
        byteOrSize: /bytes|size/,
        folderName: /[\\\/]+([^\\\/]+)[\\\/]+[^\\\/]+$/
    };
    const version = '7.1.4';
    function engine(config = {
        engine: 'V8'
    }) {
        outputConfig(config);
        step('Displaying steps for:');
        step(config);
        config.pattern = getFinalPattern(config.pattern, config) || '';
        config.replacement = getFinalReplacement(config.replacement, config) || '';
        config.replacementOri = config.replacement;
        config.regex = getFinalRegex(config.pattern, config) || '';
        step(config);
        if (handlePipedData(config)) {
            return doReplacement('Piped data', config, config.pipedData);
        }
        config.files = getFilePaths(config);
        if (!config.files.length) {
            return error(config.files.length + ' files found');
        }
        chat(config.files.length + ' files found');
        step(config);
        config.files// Correct filepath
        //.map(filepath=>path.normalize(process.cwd()+'/'+filepath))
        // Find out if any filepaths are invalid
        .filter((filepath)=>fs.existsSync(filepath) ? true : error('File not found:', filepath))// Do the replacement
        .forEach((filepath)=>openFile(filepath, config));
    }
    function openFile(file, config) {
        if (config.voidAsync) {
            chat('Open sync: ' + file);
            var data = fs.readFileSync(file, config.encoding);
            return doReplacement(file, config, data);
        } else {
            chat('Open async: ' + file);
            fs.readFile(file, config.encoding, function(err, data) {
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
        _data_rr = '';
        debug('Write new content to: ' + _file_rr);
        // Write directly to the same file (if the process is killed all new and old data is lost)
        if (_config_rr.voidBackup) {
            return fs.writeFile(_file_rr, result, _config_rr.encoding, function(err) {
                if (err) {
                    return error(err);
                }
                info(_file_rr);
            });
        }
        //Make sure data is always on disk
        const oriFile = path.normalize(path.join(process.cwd(), _file_rr));
        const salt = new Date().toISOString().replace(re.colon, '_').replace('Z', '');
        const backupFile = oriFile + '.' + salt + '.backup';
        if (_config_rr.voidAsync) {
            try {
                fs.renameSync(oriFile, backupFile);
                fs.writeFileSync(oriFile, result, _config_rr.encoding);
                if (!_config_rr.keepBackup) {
                    fs.unlinkSync(backupFile);
                }
            } catch (e) {
                return error(e);
            }
            return info(_file_rr);
        }
        // Let me know when fs gets promise'fied
        fs.rename(oriFile, backupFile, (err)=>{
            if (err) {
                return error(err);
            }
            fs.writeFile(oriFile, result, _config_rr.encoding, (err)=>{
                if (err) {
                    return error(err);
                }
                if (!_config_rr.keepBackup) {
                    fs.unlink(backupFile, (err)=>{
                        if (err) {
                            return error(err);
                        }
                        info(_file_rr);
                    });
                } else {
                    info(_file_rr);
                }
            });
        });
    }
    function handlePipedData(config) {
        step('Check Piped Data');
        if (config.includeGlob.length) {
            if (!config.replacementJs && config.pipedData) {
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
    function getFinalPattern(pattern, conf) {
        step('Get final pattern');
        pattern = replacePlaceholders(pattern, conf);
        if (conf.literal) {
            pattern = pattern.replace(re.regexSpecialChars, '\\$&');
        }
        /*if (config.patternFile) {
            pattern = fs.readFileSync(pattern, 'utf8');
            pattern = new Function('return '+pattern)();
        }*/ step(pattern);
        return pattern;
    }
    function getFinalReplacement(replacement, conf) {
        step('Get final replacement');
        /*if(config.replacementFile){
            return oneLinerFromFile(fs.readFileSync(replacement,'utf8'));
        }*/ replacement = replacePlaceholders(replacement, conf);
        if (conf.replacementPipe) {
            step('Piping replacement');
            conf.pipedDataUsed = true;
            if (null === conf.pipedData) {
                return die('No data piped into replacement');
            }
            replacement = conf.pipedData;
        }
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
        //console.log(process);
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
    }*/ function getFinalRegex(pattern, config) {
        step('Get final regex with engine: ' + config.engine);
        let regex;
        let flags = getFlags(config);
        switch(config.engine){
            case 'V8':
                try {
                    regex = new RegExp(pattern, flags);
                } catch (e) {
                    if (config.debug) throw new Error(e);
                    die(e.message);
                }
                break;
            case 'RE2':
                try {
                    const RE2 = require('re2');
                    regex = new RE2(pattern, flags);
                } catch (e) {
                    if (config.debug) throw new Error(e);
                    die(e.message);
                }
                break;
            default:
                die(`Engine ${config.engine} not supported`);
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
        if (config.dotAll) {
            flags += 's';
        }
        if (config.unicode) {
            flags += 'u';
        }
        step(flags);
        return flags;
    }
    function readableSize(size) {
        if (1 === size) {
            return '1 Byte';
        }
        const i = Math.floor(Math.log(size) / Math.log(1024));
        return (size / Math.pow(1024, i)).toFixed(!!i ? 1 : 0) + ' ' + [
            'Bytes',
            'KB',
            'MB',
            'GB',
            'TB'
        ][i];
    }
    function dynamicReplacement(_file_rr, _config_rr, _data_rr) {
        const _time_obj = now;
        const _time = localTimeString(_time_obj);
        const _pipe = _config_rr.pipedData, _text = _data_rr, _find = _config_rr.pattern, code_rr = _config_rr.replacementOri, _cwd = process.cwd(), _now = _time, _ = ' ', _nl = '\n';
        // prettier-ignore
        let _file = '❌', _file_rel = '❌', _dirpath = '❌', _dirpath_rel = '❌', _dirname = '❌', _filename = '❌', _name = '❌', _ext = '❌', _mtime = '❌', _ctime = '❌', _mtime_obj = new Date(0), _ctime_obj = new Date(0), _bytes = -1, _size = '❌', dynamicContent = new Function('require', 'fs', 'globs', 'path', 'pipe', 'pipe_', 'find', 'find_', 'text', 'text_', 'file', 'file_', 'file_rel', 'file_rel_', 'dirpath', 'dirpath_', 'dirpath_rel', 'dirpath_rel_', 'dirname', 'dirname_', 'filename', 'filename_', 'name', 'name_', 'ext', 'ext_', 'cwd', 'cwd_', 'now', 'now_', 'time_obj', 'time', 'time_', 'mtime_obj', 'mtime', 'mtime_', 'ctime_obj', 'ctime', 'ctime_', 'bytes', 'bytes_', 'size', 'size_', 'nl', '_', '__code_rr', 'var path = require("path");' + 'var __require_ = require;' + 'var r = function(file){' + 'var result = null;' + 'try{' + 'result = __require_(file);' + '} catch (e){' + 'var dir = /^[\\\/]/.test(file) ? "" : cwd;' + 'result = __require_(path.resolve(dir, file));' + '};' + 'return result;' + '};' + 'require = r;' + 'return eval(__code_rr);');
        const needsByteOrSize = re.byteOrSize.test(_config_rr.replacement);
        const betterToReadfromFile = needsByteOrSize && 50000000 < _text.length; // around 50 Mb will lead to reading filezise from file instead of copying into buffer
        if (!_config_rr.dataIsPiped) {
            _file = path.normalize(path.join(_cwd, _file_rr));
            _file_rel = path.relative(_cwd, _file);
            const pathInfo = path.parse(_file);
            _dirpath = pathInfo.dir;
            _dirpath_rel = path.relative(_cwd, _dirpath);
            _dirname = (_file.match(re.folderName) || ' _')[1];
            _filename = pathInfo.base;
            _name = pathInfo.name;
            _ext = pathInfo.ext;
            if (betterToReadfromFile || re.mctime.test(_config_rr.replacement)) {
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
        // Capture groups used, so need to run once per match
        return function() {
            step(arguments);
            const __pipe = _pipe, __text = _text, __find = _find, __file = _file, __file_rel = _file_rel, __dirpath = _dirpath, __dirpath_rel = _dirpath_rel, __dirname = _dirname, __filename = _filename, __name = _name, __ext = _ext, __cwd = _cwd, __now = _now, __time_obj = _time_obj, __time = _time, __mtime_obj = _mtime_obj, __mtime = _mtime, __ctime_obj = _ctime_obj, __ctime = _ctime, __bytes = _bytes, __size = _size, __nl = _nl, __ = _, __code_rr = code_rr;
            var capturedGroups = '';
            for(var i = 0; i < arguments.length - 2; i++){
                capturedGroups += 'var $' + i + '=' + JSON.stringify(arguments[i]) + '; ';
            }
            return dynamicContent(require, fs, globs, path, __pipe, __pipe + __, __find, __find + __, __text, __text + __, __file, __file + __, __file_rel, __file_rel + __, __dirpath, __dirpath + __, __dirpath_rel, __dirpath_rel + __, __dirname, __dirname + __, __filename, __filename + __, __name, __name + __, __ext, __ext + __, __cwd, __cwd + __, __now, __now + _, __time_obj, __time, __time + _, __mtime_obj, __mtime, __mtime + _, __ctime_obj, __ctime, __ctime + _, __bytes, __bytes + __, __size, __size + __, __nl, __, capturedGroups + __code_rr);
        };
    }
    function localTimeString(dateObj = new Date()) {
        return `${dateObj.getFullYear()}-${('0' + (dateObj.getMonth() + 1)).slice(-2)}-${('0' + dateObj.getDate()).slice(-2)} ${('0' + dateObj.getHours()).slice(-2)}:${('0' + dateObj.getMinutes()).slice(-2)}:${('0' + dateObj.getSeconds()).slice(-2)}.${('00' + dateObj.getMilliseconds()).slice(-3)}`;
    }
    function replacePlaceholders(str = '', conf) {
        if (!conf.voidEuro) {
            str = str.replace(re.euro, '$');
        }
        if (!conf.voidSection) {
            str = str.replace(re.section, '\\');
        }
        return str;
    }
    function getFilePaths(conf) {
        let { includeGlob, excludeGlob, excludeRe } = conf;
        let filesToInclude = globs.sync(includeGlob);
        if (excludeRe.length) {
            excludeRe.map((el)=>getFinalPattern(el, conf)).forEach((re)=>{
                filesToInclude = filesToInclude.filter((el)=>!el.match(re));
            });
        }
        if (excludeGlob.length) {
            const filesToExclude = globs.sync(excludeGlob);
            filesToInclude = filesToInclude.filter((el)=>!filesToExclude.includes(el));
        }
        return filesToInclude;
    }

    // CLI interface for rexreplace
    let pattern, replacement;
    // To avoid problems with patterns or replacements starting with '-' the two first arguments can not contain flags and are removed before yargs does it magic - but we still need to handle -version and -help
    let needHelp = 0;
    if (process.argv.length < 4) {
        if (/-v|--?version$/i.test(process.argv[process.argv.length - 1])) {
            console.log(version);
            process.exitCode = 0;
            process.exit();
        } else if (/-h|--?help$/i.test(process.argv[process.argv.length - 1])) {
            needHelp = 1;
        } else {
            needHelp = 2;
        }
    } else {
        [pattern, replacement] = process.argv.splice(2, 2);
    }
    const yargs = require('yargs').strict().usage('RexReplace ' + version + ': Regexp search and replace for files using lookahead and backreference to matching groups in the replacement. Defaults to global multiline case-insensitive search.\n\n' + '> rexreplace pattern replacement [fileGlob|option]+').example(`> rexreplace 'Foo' 'xxx' myfile.md`, `'foobar' in myfile.md will become 'xxxbar'`).example('').example(`> rr xxx Foo myfile.md`, `The alias 'rr' can be used instead of 'rexreplace'`).example('').example(`> rexreplace '(f?(o))o(.*)' '$3$1€2' myfile.md`, `'foobar' in myfile.md will become 'barfoo'`).example('').example(`> rexreplace '^#' '##' *.md`, `All markdown files in this dir got all headlines moved one level deeper`).example('').example(`> rexreplace 'a' 'b' 'myfile.md' 'src/**/*.*' `, `Provide multiple files or glob if needed`).version('v', 'Print rexreplace version (can be given as only argument)', version).alias('v', 'version').boolean('V').describe('V', 'More chatty output').alias('V', 'verbose')//.conflicts('V', 'q')
    //.conflicts('V', 'Q')
    .boolean('L').describe('L', 'Literal string search (no regex used when searching)').alias('L', 'literal').boolean('I').describe('I', 'Void case insensitive search pattern.').alias('I', 'void-ignore-case').boolean('G').describe('G', 'Void global search (stop looking after the first match).').alias('G', 'void-global').boolean('s').describe('s', 'Have `.` also match newline.').alias('s', 'dot-all').boolean('M').describe('M', 'Void multiline search pattern. Makes ^ and $ match start/end of whole content rather than each line.').alias('M', 'void-multiline').boolean('u').describe('u', 'Treat pattern as a sequence of unicode code points.').alias('u', 'unicode').default('e', 'utf8').alias('e', 'encoding').describe('e', 'Encoding of files/piped data.').alias('E', 'engine').describe('E', 'What regex engine to use:').choices('E', [
        'V8' /*'RE2' /*'sd', 'stream'*/ 
    ]).default('E', 'V8').boolean('q').describe('q', 'Only display errors (no other info)').alias('q', 'quiet').boolean('Q').describe('Q', 'Never display errors or info').alias('Q', 'quiet-total').boolean('H').describe('H', 'Halt on first error').alias('H', 'halt').default('H', false).boolean('d').describe('d', 'Print debug info').alias('d', 'debug').boolean('€').describe('€', "Void having '€' as alias for '$' in pattern and replacement parameters").alias('€', 'void-euro').boolean('§').describe('§', "Void having '§' as alias for '\\' in pattern and replacement parameters").alias('§', 'void-section').boolean('o').describe('o', 'Output the final result instead of saving to file. Will also output content even if no replacement has taken place.').alias('o', 'output')//.conflicts('o','O')
    .boolean('A').alias('A', 'void-async').describe('A', `Handle files in a synchronous flow. Good to limit memory usage when handling large files. ` + '').boolean('B').describe('B', 'Avoid temporary backing up file. Works async (independent of -A flag) and will speed up things but at one point data lives only in memory, and you might lose data if the process is halted.').alias('B', 'void-backup').boolean('b').describe('b', 'Keep a backup file of the original content.').alias('b', 'keep-backup').boolean('m').describe('m', `Output each match on a new line. ` + `Will not replace any content but you still need to provide a dummy value (like \`_\`) as replacement parameter. ` + `If search pattern does not contain matching groups the full match will be outputted. ` + `If search pattern _does_ contain matching groups only matching groups will be outputted (same line with no delimiter). ` + ``).alias('m', 'output-match').boolean('T').alias('T', 'trim-pipe').describe('T', `Trim piped data before processing. ` + `If piped data only consists of chars that can be trimmed (new line, space, tabs...) it will become an empty string. ` + '').boolean('R').alias('R', 'replacement-pipe').describe('R', `Replacement will be piped in. You still need to provide a dummy value (like \`_\`) as replacement parameter.` + '').string('x').describe('x', 'Exclude files with a path that matches this regular expression. Will follow same regex flags and setup as the main search. Can be used multiple times.').alias('x', 'exclude-re').string('X').describe('X', 'Exclude files found with this glob. Can be used multiple times.').alias('X', 'exclude-glob')/*
        
        
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
        

        .boolean('R')
            .alias('R', 'replacement-file')
            .describe('R',
                `Replacement is the path to a filename containing the replacement`.`Will be followed by other all rules (like -€)`
            )



        .boolean('n')
            .describe('n', "Do replacement on file path+name instead of file content (rename/move the files)")
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


        .boolean('J')
            .describe('J', "Pattern is javascript source that will return a string giving the pattern to use")
            .alias('J', 'pattern-js')


        .boolean('glob-js')
            .describe('glob-js', "filename/globs are javascript source that will return a string with newline seperating each glob to work on")


        */ .boolean('j').alias('j', 'replacement-js').describe('j', `Treat replacement as javascript source code. 
	The statement from the last expression will become the replacement string. 
	Purposefully implemented the most insecure way possible to remove _any_ incentive to consider running code from an untrusted part. 
	The full match will be available as a javascript variable named $0 while each captured group will be available as $1, $2, $3, ... and so on. 
	At some point, the $ char _will_ give you a headache when used from the command line, so use €0, €1, €2, €3... instead. 
	If the javascript source code references to the full match or a captured group the code will run once per match. Otherwise, it will run once per file. 
	
	The code has access to the following variables: 
	\`r\` as an alias for \`require\` with both expanded to understand a relative path even if it is not starting with \`./\`, 
	\`fs\` from node, 
	\`path\` from node, 
	\`globs\` from npm, 
	\`pipe\`: the data piped into the command (null if no piped data), 
	\`find\`: pattern searched for (the needle), 
	\`text\`: full text being searched i.e. file content or piped data (the haystack), 
	\`bytes\`: total size of the haystack in bytes, 
	\`size\`: human-friendly representation of the total size of the haystack, 
	\`time\`: String representing the local time when the command was invoked,
	\`time_obj\`: date object representing \`time\`,
	\`now\`: alias for \`time\`,
	\`cwd\`: current process working dir, 
	\`nl\`: a new-line char,
	\`_\`: a single space char (for easy string concatenation).
	
	The following values defaults to \`❌\` if haystack does not originate from a file:
	\`file\`: contains the full path of the active file being searched (including full filename), 
	\`file_rel\`: contains \`file\` relative to current process working dir, 
	\`dirpath\`: contains the full path without filename of the active file being searched, 
	\`dirpath_rel\`: contains \`dirpath\` relative to current process working dir, 
	\`filename\`: is the full filename of the active file being searched without path, 
	\`name\`: filename of the active file being searched with no extension, 
	\`ext\`: extension of the filename including leading dot, 
	\`mtime\`: ISO inspired representation of the last local modification time of the current file, 
	\`ctime\`: ISO representation of the local creation time of the current file. 
	\`mtime_obj\`: date object representing \`mtime\`, 
	\`ctime_obj\`: date object representing \`ctime\`. 
	
	All variables, except from module, date objects, \`nl\` and \`_\`, has a corresponding variable name followed by \`_\` where the content has an extra space at the end (for easy concatenation). 
	`).help('h').describe('h', 'Display help.').alias('h', 'help').epilog(`Inspiration: .oO(What should 'sed' have been by now?)`);
    function backOut(exitcode = 1) {
        yargs.showHelp();
        //io(help);
        process.exitCode = exitcode;
        process.exit();
    }
    function unescapeString(str = '') {
        return new Function(`return '${str.replace(/'/g, "\\'")}'`)();
    }
    (function() {
        if (0 < needHelp) {
            return backOut(needHelp - 1);
        }
        // All options into one big config object for the rexreplace core
        let config = {};
        // Use only camelCase full lenght version of settings so we make sure the core can be documented propperly
        Object.keys(yargs.argv).forEach((key)=>{
            if (1 < key.length && key.indexOf('-') < 0) {
                config[key] = yargs.argv[key];
            }
        });
        let pipeInUse = false;
        let pipeData = '';
        config.pipedData = null;
        config.showHelp = yargs.showHelp;
        config.pattern = pattern;
        config.includeGlob = yargs.argv._;
        config.excludeGlob = [
            ...yargs.argv.excludeGlob
        ].filter(Boolean);
        config.excludeRe = [
            ...yargs.argv.excludeRe
        ].filter(Boolean);
        if (config.replacementJs) {
            config.replacement = replacement;
        } else {
            config.replacement = unescapeString(replacement);
        }
        /*if(Boolean(process.stdout.isTTY)){
            config.output = true;
        }*/ if (Boolean(process.stdin.isTTY)) {
            if (config.replacementPipe) {
                return backOut();
            }
            engine(config);
        } else {
            process.stdin.setEncoding(config.encoding);
            process.stdin.on('readable', ()=>{
                let chunk = process.stdin.read();
                if (null !== chunk) {
                    pipeInUse = true;
                    pipeData += chunk;
                    while(chunk = process.stdin.read()){
                        pipeData += chunk;
                    }
                }
            });
            process.stdin.on('end', ()=>{
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

})();
