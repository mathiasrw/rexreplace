
# RexReplace vs `sed` speed test

	2024-08-18 14:32
	RexReplace v7.1.10
	Node v20.15.1

This test will remove HTML tags from the HTML sorce of George Orwell's 1984 to get the pure text version.
All testresults printed are the sum of 10 rounds given in seconds.

## A single 1Kb file

_10 rounds of:_

 - sed on 1Kb file:          	0.036

 - RexReplace on a 1Kb file: 	/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
0.009


## A single 5Kb file

_10 rounds of:_

 - sed on 5Kb file:          	0.019

 - RexReplace on a 5Kb file: 	/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
0.015


## A single 10Kb file

_10 rounds of:_

 - sed on 10Kb file:          	0.099

 - RexReplace on a 10Kb file: 	/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
0.008


## A single 100Kb file

_10 rounds of:_

 - sed on 100Kb file:          	0.059

 - RexReplace on a 100Kb file: 	/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
0.009


## A single 500Kb file

_10 rounds of:_

 - sed on 500Kb file:          	0.178

 - RexReplace on a 500Kb file: 	/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
0.005


## A single 1Mb file

_10 rounds of:_

 - sed on 1Mb file:          	0.292

 - RexReplace on a 1Mb file: 	/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
0.007


## A single 5Mb file

_10 rounds of:_

 - sed on 5Mb file:          	1.474

 - RexReplace on a 5Mb file: 	/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
0.005


## A single 10Mb file

_10 rounds of:_

 - sed on 10Mb file:          	2.835

 - RexReplace on a 10Mb file: 	/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
0.007


## A single 25Mb file

_10 rounds of:_

 - sed on 25Mb file:          	6.887

 - RexReplace on a 25Mb file: 	/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
/Users/mwulff/git/rexreplace/test/speed/speed-test: line 79: rexreplace_: command not found
0.006


## A single 50Mb file

_10 rounds of:_

 - sed on 50Mb file:          	