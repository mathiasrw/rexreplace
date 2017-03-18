[![Build Status](https://travis-ci.org/mathiasrw/rexreplace.svg?branch=master)](https://travis-ci.org/mathiasrw/rexreplace)
[![npm version](https://badge.fury.io/js/rexreplace.svg)](https://www.npmjs.com/package/rexreplace)

# RexReplace

_Commandline search and replace as it should be._

Friendly regexp search and replace in files using lookahead and
backreference to matching groups in the replacement. 
Defaults to global multiline case-insensitive search. Will run with any version of Node JS (yes, even v0.6)


Files can be given as [glob notation](https://www.tcl.tk/man/tcl8.5/tutorial/Tcl16a.html), for example the glob `docs/*.md` represents each markdown file in the `docs/` dir. 

### Install
```bash
> npm install -g rexreplace
```

 
### Usages 
```bash
> rexreplace searchFor replaceWith fileA [fileB fileC ...]
```

Hard on your fingers to write on your keyboard? We got you covered with `rr` as alias for `rexreplace`



### Examples
```bash
> rexreplace Foo xxx myfile.md     
  # 'foobar' in myfile.md will become 'xxxbar'

> rexreplace Foo xxx myfile.md -I     
  # 'foobar' in myfile.md will remain 'foobar'

> rexreplace '^#' '##' *.md      
  # All markdown files in this dir got all headlines moved one level deeper

> rexreplace '(f?(o))o(.*)' '$3$1$2' myfile.md 
  # 'foobar' in myfile.md will become 'barfoo'

> rexreplace '(f?(o))o(.*)' '€3€1€2' myfile.md  
  # As '€' is treated as an alias for '$' this also transforms 'foobar' into 'barfoo'

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
  -€, --void-euro         Void having '€' as alias for '$' in pattern and
                          replacement                                  [boolean]
  -h, --help              Show help                                    [boolean]
```

### Quirks
- Per default `€` is treated as an alias for `$`. The main reason is for you not to worry about some commandline tools having a special relationship with with the `$` char. Your can escape your way out of this old love story but it often popup in unexpected ways. Use the `-€` flag if you need to search or replace the actual euro char. 

### Limitations
- Reads each file into memory, so using RexReplace on your 3Gb log file will probably not be ideal.

### Test 
All tests are defined in [test.sh](https://github.com/mathiasrw/rexreplace/blob/master/test.sh) and after `git clone`'ing the repo you can invoke them with:

```bash
> npm test
```

### Future ideas
- Test-run a with info outputted about what will happen (sets -v and does not change anything)
- Let search and replace be withing the names of the files (ask for overwrite. -Y = no questions)
- Let search and replace be within the path of the files (ask for overwrite. -Y = no questions)
- Piped data while no globs = this is content to be searched (will always output) (when no -rp flags)
- Piped data while having 1 globs = output is to be stored in this file (when no -rpo flags)
- Piped data while having 2+ globs = error (when no -rpg flags)
- Let pattern, replacement, globs be piped
- Let Pattern, replacement, globs come from file
- Let pattern, replacement, glob be javascript code returning string as result
- Error != warning
- Debug != all debug
- Flag for sync or async read file handeling. Test if async or sync is best.


### Inspiration

.oO(_What should "sed" have looked like by now?_)

