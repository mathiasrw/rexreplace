#!/usr/bin/env bash

echo 'foobar' > myfile 
rreplace '(F?(O))O(.*)' '$3$1$2' myfile 
grep -q 'barfoo' myfile || exit 101

echo 'foobar' > myfile 
rreplace '(F?(O))O(.*)' '$3$1$2' myfile gm utf8 
grep -q 'foobar' myfile || exit 102
