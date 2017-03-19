
# RexReplace speed test 2017-03-19 22:36

_This test will remove HTML tags from the HTML sorce of George Orwell's 1984 to get the pure text version._
_All test results printed are the sum of 10 rounds given in seconds._


## A single 1kB file

0.057
 - sed on a 1kB file

3.441
 - RexReplace on a 1kB file


## A single 5kB file

0.062
 - sed on a 5kB file

2.698
 - RexReplace on a 5kB file


## A single 10kB file

0.070
 - sed on a 10kB file

2.479
 - RexReplace on a 10kB file


## A single 100kB file

0.104
 - sed on a 100kB file

2.513
 - RexReplace on a 100kB file


## A single 500kB file

0.316
 - sed on a 500kB file

2.589
 - RexReplace on a 500kB file


## A single 1M file

0.581
 - sed on a 1M file

2.728
 - RexReplace on a 1M file


## A single 5M file

2.887
 - sed on a 5M file

3.361
 - RexReplace on a 5M file


## A single 10M file

5.797
 - sed on a 10M file

4.141
 - RexReplace on a 10M file


## A single 25M file

14.442
 - sed on a 25M file

7.042
 - RexReplace on a 25M file


## A single 50M file

28.809
 - sed on a 50M file

11.822
 - RexReplace on a 50M file


## A single 100M file

53.835
 - sed on a 100M file

20.402
 - RexReplace on a 100M file


----


## 10 files (10kb each)
cat: 10kb.file: No such file or directory

0.426
 - sed on 10 files

3.099
 - RexReplace on 10 files

2.941
 - RexReplace on 10 files given as one glob

----

All tests completed.
