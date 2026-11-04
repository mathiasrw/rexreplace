# Runs each command once on a copy of a file, and stops the test when one fails or does not give the same file as the reference.
# Else a tool that does other work, or no work, would be timed for it.
#   check_same <source file> <file> <reference file> -n <name> <command> [-n <name> <command>]...
check_same() {
	local source="$1" file="$2" reference="$3"
	shift 3
	while [ $# -gt 0 ]; do
		local name="$2" command="$3"
		shift 3
		cp "$source" "$file"
		if ! eval "$command" > /dev/null 2>&1 < /dev/null; then
			echo "$name failed" && exit 1
		fi
		# The wrong file is kept in tmp of the repo, to see what went wrong
		if ! cmp -s "$file" "$reference"; then
			cp "$file" "$ROOT/tmp/$name.wrong"
			echo "$name does not give the same file as the others, see tmp/$name.wrong" && exit 1
		fi
	done
}
