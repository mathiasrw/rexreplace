[![Build Status](https://travis-ci.org/mathiasrw/rexreplace.svg?branch=master)](https://travis-ci.org/mathiasrw/rexreplace)
[![npm version](https://badge.fury.io/js/rexreplace.svg)](https://www.npmjs.com/package/rexreplace)

# RexReplace

CLI Regexp search and replace for files using lookahead and
backreference to matching groups in the replacement. Defaults to global
multiline case-insensitive search. Needs Node v6 or higher.

### Install
```bash
> npm install -g rexreplace
```
 


### Usages 
```bash
> rexreplace searchFor replaceWith filenameA filenameB filenameC ...
```

### Examples
```bash
> rexreplace Foo xxx myfile.md     
  # 'foobar' in myfile.md will become 'xxxbar'

> rexreplace Foo xxx myfile.md -I     
  # 'foobar' in myfile.md will remain 'foobar'
  
> rexreplace '(f?(o))o(.*)' '$3$1$2' myfile.md 
  # 'foobar' in myfile.md will become 'barfoo'

  # Some commandline tools (bash/zsh/...) can be a bit funny with the `$` sign. Use the '-€' flag to let `€` alias a `$` in pattern and replacement
> rexreplace '(f?(o))o(.*)' '€3€1€2' myfile.md -€ 
  # 'foobar' in myfile.md will become 'barfoo'



```


### Options

```
  -v, --version           Echo rexreplace version                      [boolean]
  -I, --void-ignore-case  Void case insensitive search pattern.        [boolean]
  -M, --void-multiline    Void multiline search pattern. Makes ^ and $ match
                          start/end of whole content rather than each line.
                                                                       [boolean]
  -u, --unicode           Treat pattern as a sequence of unicode code points.
                                                                       [boolean]
  -e, --encoding          Encoding of files.                   [default: "utf8"]
  -o, --output            Output the result instead of saving to file. Will also
                          output content even if no replacement have taken
                          place.                                       [boolean]
  -q, --quiet             Only display erros (no other info)           [boolean]
  -Q, --quiet-total       Never display erros or info                  [boolean]
  -H, --halt              Halt on first error         [boolean] [default: false]
  -d, --debug             Print debug info                             [boolean]
  -€, --eurodollar        Replace all '€' with '$' in pattern and replace
                          string. Usefull when your commandline (bash/zsh/...)
                          seeks to do interesting things with '$'      [boolean]
  -h, --help              Show help                                    [boolean]
```

### Future
- Handle globs
- Handle piped data

### inspiration

.oO(_What "sed" should have been by now_)

The replace-in-file npm package (but with better naming and backreferences)
