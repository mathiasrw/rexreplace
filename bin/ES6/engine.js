const fs = require('fs');
const path = require('path');
const globs = require('globs');
import { outputConfig, step, debug, chat, info, error, die } from './output';
export const version = 'PACKAGE_VERSION';
export function engine(config) {
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
            const _pipe = _config_rr.pipedData;
            const _text = _data_rr;
            const _find = _config_rr.pattern;
            const code_rr = _config_rr.replacementOri;
            const _cwd = process.cwd();
            let _file = '', _path = '', _filename = '', _name = '', _ext = '', dynamicContent = new Function('require', 'fs', 'globs', '_pipe', '_text', '_find', '_file', '_path', '_filename', '_name', '_ext', '_cwd', 'code_rr', `
					var path = require('path')
					var require_ = require
					var r = function(file){
						var result = null;
						try{
							result = require_(file);
						} catch (e){
							var dir = !!file.match(/^[\\\/]/) ? '' : _cwd
							result = require_(path.resolve(dir, file))
						}
						return result;
					}
					require = r;
					return eval(code_rr);					
					`);
            if (!_config_rr.dataIsPiped) {
                _file = path.normalize(path.join(process.cwd(), _file_rr));
                let pathInfo = path.parse(_file);
                _path = pathInfo.dir;
                _filename = pathInfo.base;
                _name = pathInfo.name;
                _ext = pathInfo.ext;
            }
            // Run only once if no captured groups (replacement cant change)
            if (!/\$\d/.test(_config_rr.replacement)) {
                _config_rr.replacement = dynamicContent(require, fs, globs, _pipe, _text, _find, _file, _path, _filename, _name, _ext, _cwd, code_rr);
            }
            else {
                // Captures groups present, so need to run once per match
                _config_rr.replacement = function () {
                    step(arguments);
                    const __pipe = _pipe, __text = _text, __find = _find, __file = _file, __path = _path, __filename = _filename, __name = _name, __ext = _ext, __cwd = _cwd, __code_rr = code_rr;
                    var capturedGroups = '';
                    for (var i = 0; i < arguments.length - 2; i++) {
                        capturedGroups += 'var $' + i + '=' + JSON.stringify(arguments[i]) + '; ';
                    }
                    return dynamicContent(require, fs, globs, __pipe, __text, __find, __file, __path, __filename, __name, __ext, __cwd, capturedGroups + __code_rr);
                };
            }
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
            .toString()
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
            if ('6' > process.versions.node) {
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
        let regex = null;
        let flags = getFlags(config);
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
