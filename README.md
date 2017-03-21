
<!--h3 align="center">
	<br>
<img width="350" src="https://cloud.githubusercontent.com/assets/1063454/24127465/ed1a59a2-0e28-11e7-9546-160d7eb1d8b9.png" alt="RexReplace mascot Benny on the RexReplace logo" />
	<br>
	<br>
</h3-->



[![Build Status](https://travis-ci.org/mathiasrw/rexreplace.svg?branch=master)](https://travis-ci.org/mathiasrw/rexreplace)
[![npm version](https://badge.fury.io/js/rexreplace.svg)](https://www.npmjs.com/package/rexreplace)
[![OPEN open source software](https://img.shields.io/badge/Open--OSS-%E2%9C%94-brightgreen.svg)](https://open-oss.surge.sh/)

# RexReplace


> Commandline search-and-replace as it should be: Simple file selection with globs, flexible patterns with regex and a friendly interface. No more brute forcing the right combination of `find`, `cat`, `sed`, `tr`, and `awk` to replace a text pattern in a bunch of files.

RexReplace gives you a friendly CLI interface to do search-and-replaces in files. 
It defaults to global multiline case-insensitive search and includes the possibility to do lookahead and
backreference to matching groups in the replacement. 
Files can be given as [glob notation](https://www.tcl.tk/man/tcl8.5/tutorial/Tcl16a.html) `docs/*.md` represents each markdown file in your `docs/` dir. 



### Install
```bash
> npm install -g rexreplace
```

 
### Usages 
```bash
> rexreplace pattern replacement fileA [fileB fileC ...]
```

Hard for your fingers to write on your keyboard? We got you covered with the `rr` alias for `rexreplace`. 

### Examples
```bash
> rexreplace Foo xxx myfile.md     
  # 'foobar' in myfile.md will become 'xxxbar'

> rexreplace '^#' '##' docs/*.md      
  # All markdown files in the docs/ dir got headlines moved one level deeper

> rexreplace '(f?(o))o(.*)' '$3$1$2' myfile.md 
  # 'foobar' in myfile.md will become 'barfoo'

> rexreplace '(f?(o))o(.*)' '€3€1€2' myfile.md  
  # '€' is treated as an alias for '$' so this also transforms 'foobar' into 'barfoo'

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

## Good to know 

### Limitations
- RexReplace reads each file fully into memory, so working on your 4Gb log files will probably not be ideal.

### Priorities
- Flexibillity regarding text pattern matching 
- Easy to filter what files to be treated
- Helpfull interface
- Test (if you know how to do a test cover report on javascript code  ran via the command line please open an issue to let me know)


### Not a priority
- Speed. Obviously speed is important, but to what extent does a 21 millisecond command really satisfy the user compared to a 294 millisecond command? 

```bash
> time cat README.md | sed 's/x/y/g'  > /dev/null
cat myfile  0,00s user 0,00s system 45% cpu 0,011 total
sed 's/x/y/g' > /dev/null  0,00s user 0,00s system 43% cpu 0,010 total
> time rr x y README.md -o > /dev/null 
rr x y myfile -o > /dev/null  0,21s user 0,04s system 86% cpu 0,294 total
```


### Quirks
- Per default `€` is treated as an alias for `$`. The main reason is for you not to worry about how command line tools often have a special relationship with the `$` char. Your can escape your way out of this old love story, but it often pops up in unexpected ways. Use the `-€` flag if you need to search or replace the actual euro char. 


## Test 

### Regression
All tests are defined in [test.sh](https://github.com/mathiasrw/rexreplace/blob/master/test.sh) and after `git clone`'ing the repo you can invoke them with:

```bash
> npm test
```

### Speed

_**tl;dr**:_ 
_Files over 5 Mb are faster with `rr` than with `sed` - but - it does not matter as any file under 25 Mb has less than 0.7 seconds in difference._

The speed test is initiated by starting `test/speed/run.sh`. The test takes files in different sizes and compares the processing time for RexReplace (`rr`) and the unix tool `sed`. The test uses the sources of a web site displaying the book _1984_ by George Orwell. The task for the tests is to remove all HTML tags by search and replace so only the final text is left. The source is 888Kb, so all files under 500Kb are generated directly from the source, while larger files are created by combining the first 500Kb several times. Each test runs 10 times to even the results out. 
Results from latest test run can always be seen in the [`test/speed/`](https://github.com/mathiasrw/rexreplace/blob/master/test/speed/testlog.speed.md) folder. 

<p align="center">
<img src="https://cloud.githubusercontent.com/assets/1063454/24081543/fc237d68-0d09-11e7-8c31-92a550589b53.png" alt="" />
</p>

The graph visualises speed relative to fastest run overall (`sed` on a 1kb file) . This chart also has [an interactive log version](https://plot.ly/~mathiasrw/1.embed) so the details in the low end can be studied better. Interestingly files of 1Kb, 5Kb takes longer for `rr` than 10Kb files. 

Now, what is relevant to notice is how `sed` only takes 3.3 seconds longer for the 100Mb file - even if the difference looks drastic on the graph. 

```
Speed relative to fastest tool for each file size
---------------------------------------------------
Bytes    sed    rr    Time it took longer (seconds)
1          1    60    0,3    <= sed is 60x faster  
5          1    44    0,3
10         1    35    0,2
100        1    24    0,2
500        1     8    0,2
1000       1     5    0,2
5000       1     1    0,0    <= same speed for 5Mb file
10000      1     1    0,2
25000      2     1    0,7
50000      2     1    1,7
100000     3     1    3,3    <= rr is 3x faster
```

So even though the speed evolves very differently there is little practical use of the focus on speed for most usecases. 

Please note that the the data might look very differently when the files get so large that the memory starts to get full. 

## Rumers

### Inspiration

.oO(_What should "sed" have looked like by now?_)


### Future ideas

- Test-run a with info outputted about what will happen (sets -t and does not change anything)
- Let search and replace be withing the names of the files (ask for overwriting. -Y = no questions)
- Let search and replace be within the path of the files (ask for overwriting. -Y = no questions)
- Piped data while no globs = this is content to be searched (will always output) (when no -rp flags)
- Piped data while having 1 globs = output is to be stored in this file (when no -rpo flags)
- Piped data while having 2+ globs = error (when no -rpg flags)
- Let pattern, replacement, globs be piped
- Let Pattern, replacement, and globs come from file
- Let pattern, replacement, and glob be javascript code returning string as result
- Error != warning
- Debug != all debug
- Flag for sync or async read file handling. Test if async or sync is best.
- Flag for simple string search (all other chars than [\n\r\t])
- Flag for plain string search litteral (no regex, no special chars, no escape chars)
- Check if https://github.com/eugeneware/replacestream is good to rely on






----


<img src="https://cloud.githubusercontent.com/assets/1063454/24103435/5a0e3746-0dd3-11e7-9f0e-fd8664348fbe.png" align="right" alt="RexReplace mascot Benny on the RexReplace logBo" />

Please note that RexReplace is an **OPEN Open Source Project**. This means that individuals making significant and valuable contributions are given commit-access to the project to contribute as they see fit. This project is more like an open wiki than a standard guarded open source project.


_<small>Icon inspired by <a href="http://www.freepik.com">Freepik</a> from <a href="http://www.flaticon.com">www.flaticon.com</a></small>_
