
# RexReplace vs `sed` speed test

	2018-07-07 00:10
	RexReplace v3.1.0
	Node v8.11.3

This test will remove HTML tags from the HTML sorce of George Orwell's 1984 to get the pure text version.
All testresults printed are the sum of 10 rounds given in seconds.

## A single 1Kb file

_10 rounds of:_

 - sed on 1Kb file:          	0.140

 - RexReplace on a 1Kb file: 	5.482


## A single 5Kb file

_10 rounds of:_

 - sed on 5Kb file:          	0.139

 - RexReplace on a 5Kb file: 	4.509


## A single 10Kb file

_10 rounds of:_

 - sed on 10Kb file:          	0.101

 - RexReplace on a 10Kb file: 	4.213


## A single 100Kb file

_10 rounds of:_

 - sed on 100Kb file:          	0.167

 - RexReplace on a 100Kb file: 	3.213


## A single 500Kb file

_10 rounds of:_

 - sed on 500Kb file:          	0.458

 - RexReplace on a 500Kb file: 	3.188


## A single 1Mb file

_10 rounds of:_

 - sed on 1Mb file:          	0.913

 - RexReplace on a 1Mb file: 	3.570


## A single 5Mb file

_10 rounds of:_

 - sed on 5Mb file:          	4.819

 - RexReplace on a 5Mb file: 	4.362


## A single 10Mb file

_10 rounds of:_

 - sed on 10Mb file:          	8.433

 - RexReplace on a 10Mb file: 	5.297


## A single 25Mb file

_10 rounds of:_

 - sed on 25Mb file:          	17.726

 - RexReplace on a 25Mb file: 	7.144


## A single 50Mb file

_10 rounds of:_

 - sed on 50Mb file:          	44.416

 - RexReplace on a 50Mb file: 	13.570


## A single 100Mb file

_10 rounds of:_

 - sed on 100Mb file:          	72.585

 - RexReplace on a 100Mb file: 	23.618



----


## 10 files (10Kb each) - time for 10 rounds

 - sed on 10 files: 	0.778

 - RexReplace on 10 files: 	3.015

 - RexReplace on 10 files given as one glob: 	3.313

----

_All tests completed_
