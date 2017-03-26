
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# bash $DIR/speed-test ; exit # for debug

echo Running tests
bash $DIR/speed-test &> $DIR/testlog.speed.md
cat $DIR/testlog.speed.md
echo ''
echo Tests stored in testlog.speed.md
open $DIR/testlog.speed.md || true
