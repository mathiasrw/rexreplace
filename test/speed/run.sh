
# bash speed-test ; exit # for debug

echo Running tests
bash speed-test &> testlog.speed.md
cat testlog.speed.md
echo ''
echo Tests stored in testlog.speed.md
