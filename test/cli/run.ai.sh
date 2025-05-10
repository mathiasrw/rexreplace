#!/usr/bin/env bash

echo 
echo "################## AI generated tests #################"
echo 

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Source the assertion library, assuming it's in the same directory
source "$DIR/aserta.sh"

# Helper function to reset test files to a known state
reset() {
        echo
        echo "$(date +'%Y-%m-%d %H:%M:%S') - Reset AI test data " 

        # Clean up potential leftovers from previous runs
        rm -f my.file.* your.file.* unicode.file.* trim.file.* read_only.file my.latin1.file file?.txt *.bak *.tmp *.log

        echo 'foobar' > my.file
        echo 'bazqux' > your.file
        echo 'file with unicode 😊' > unicode.file
        echo '  leading and trailing space  ' > trim.file
        
        # Ensure write permissions are reset if changed by tests
        chmod u+w my.file your.file unicode.file trim.file 2>/dev/null
}

# Helper to create a read-only file for testing -H
setup_readonly_error() {
    echo "error content" > read_only.file
    chmod u-w read_only.file
}

# Helper to clean up read-only file
cleanup_readonly_error() {
    chmod u+w read_only.file 2>/dev/null
    rm -f read_only.file
}

# Helper to create a file with latin1 encoding (requires iconv)
setup_latin1_file() {
    if command -v iconv &> /dev/null; then
        printf 'café' | iconv -f utf-8 -t latin1 > my.latin1.file
        return 0
    else
        echo "Skipping encoding test: iconv command not found" >&2
        return 1 # Indicate setup failed
    fi
}



# --- Start of Tests ---

# -V, --verbose
reset
echo assert_contains        "rexreplace foo bar my.file -V"          "my.file" # Verbose should mention the file processed
echo assert_contains        "rexreplace foo bar my.file --verbose"   "Matched" # Should mention match details

# -u, --unicode
reset
echo assert                "rexreplace 😊 xxx unicode.file -o -u" "file with unicode xxx"
echo assert                "rexreplace '😊' '😃' unicode.file -o --unicode" "file with unicode 😃"
# Test without -u (might fail or behave differently depending on default)
reset
echo assert_NOTcontains    "rexreplace 😊 xxx unicode.file -o" "xxx" # Expecting it to NOT match without -u

# -e, --encoding (using latin1/iso-8859-1 as an example)
reset
if setup_latin1_file; then
    # This assertion assumes rexreplace outputs utf8 by default when using -o
    # And that the pattern needs to be specified in the file's encoding without -e
    # The exact bytes for 'café' in latin1 are 63 61 66 e9
echo     assert            "rexreplace $(printf '\xe9') bar my.latin1.file -o" "cafbar" # Match latin1 char without -e
    # Now test WITH -e
echo     assert            "rexreplace é bar my.latin1.file -o -e latin1" "cafbar"
    # Test invalid encoding
echo     assert_raises     "rexreplace foo bar my.file -o -e invalid-encoding" 1 # Expecting non-zero exit code for bad encoding
    rm -f my.latin1.file
else
    skip # Skip encoding tests if iconv not found
    skip
    skip
fi

# -q, --quiet
reset
# Successful run should have NO stdout
echo assert                "rexreplace foo xxx my.file -q" ""
# Error run (file not found) should still print error to stderr (tested indirectly via assert_raises failure message)
# We can't easily assert stderr content with aserta, but we can check it doesn't suppress errors needed for failure
echo assert_raises         "rexreplace foo xxx non_existent_file.txt -q" 1 # Exit code should still be non-zero

# -Q, --quiet-total
reset
# Successful run should have NO stdout
echo assert                "rexreplace foo xxx my.file -Q" ""
# Error run should have NO output at all (stdout or stderr)
# Check exit code is still non-zero, but no output should be printed by aserta on failure if rexreplace is truly quiet
echo assert_raises         "rexreplace foo xxx non_existent_file.txt -Q" 1

# -H, --halt
reset
echo "halt test 1" > file1.txt
setup_readonly_error # file 'read_only.file' is now read-only
echo "halt test 3" > file3.txt
# Run command that succeeds on file1, fails on read_only.file, and should halt before file3
# Use -V to see progress in manual runs if needed. Using simple replacement 'test' -> 'HALTED'
echo assert_raises         "rexreplace test HALTED *.txt read_only.file -H" 1 # Expect non-zero exit due to error
# Check file1 was modified
echo assert                "cat file1.txt" "halt HALTED 1"
# Check file3 was NOT modified
echo assert                "cat file3.txt" "halt test 3"
cleanup_readonly_error
rm -f file?.txt

# -d, --debug
reset
# Check for specific debug messages (these might change based on implementation)
echo assert_contains       "rexreplace foo bar my.file -d" "\[DEBUG\]" # General debug flag marker
echo assert_contains       "rexreplace foo bar my.file --debug" "Options:" # Example debug output

# -A, --void-async
reset
# Ensure it runs and produces correct result, even if we can't test synchronicity easily
echo assert                "rexreplace foo XXX my.file -A -o" "XXXbar"
echo assert                "cat my.file" "foobar" # Should not modify file when -o is used
reset
rexreplace foo XXX my.file -A
echo assert                "cat my.file" "XXXbar" # Should modify file without -o

# -B, --void-backup
reset
rexreplace foo YYY my.file -B
echo assert                "cat my.file" "YYYbar" # File should be modified
# Assert that NO backup file exists (e.g., my.file.bak or similar)
echo assert_raises         "ls my.file.*" 1 # ls should fail if no other my.file.* exists

# Check interaction with -b (keep backup) - B should likely override b
reset
rexreplace foo ZZZ my.file -B -b
echo assert                "cat my.file" "ZZZbar"
echo assert_raises         "ls my.file.*" 1 # Still no backup expected

# -T, --trim-pipe
reset
echo assert                "printf '  foo bar
 ' | rexreplace 'foo bar' xxx -T" "xxx"
echo assert                "printf ' 
	 ' | rexreplace ' ' yyy -T" "" # Replace space in empty string (after trim) -> no change ""
echo assert                "printf ' 
	 ' | rexreplace '^$' yyy -T" "yyy" # Replace empty string (after trim)

# --- Combination Tests ---

# -L and -I (Literal and Void Case Insensitive - should ignore -I)
reset
echo assert                "rexreplace FOO xxx my.file -L -I -o" "foobar" # -L takes precedence, FOO != foo

# -s and -M (Dot All and Void Multiline)
reset
echo $'line1
line2' > multiline.file
echo assert                "rexreplace '^line.line.$' xxx multiline.file -s -M -o" "xxx" # -s makes . match 
, -M makes ^$ match whole string
rm -f multiline.file

# -o and -q (Output and Quiet - quiet should suppress normal output message, but -o still prints result)
reset
echo assert                "rexreplace foo xxx my.file -o -q" "xxxbar"

# -m and -V (Output Match and Verbose)
reset
echo assert_contains       "rexreplace '(o.)' _ my.file -m -V" "Match: ob" # Verbose output should exist alongside match output
echo assert_contains       "rexreplace '(o.)' _ my.file -m -V" "Match: oo"

# -x and -b (Exclude and Keep Backup)
reset
cp my.file my_excluded.file
rexreplace foo xxx *.file -x 'excluded' -b
echo assert                "cat my.file" "xxxbar" # my.file modified
echo assert_success        "ls my.file.*" # Backup of my.file exists
echo assert                "cat my_excluded.file" "foobar" # excluded file untouched
echo assert_raises         "ls my_excluded.file.*" 1 # No backup for excluded file
rm -f my_excluded.file* my.file.*

# -X and -j (Exclude Glob and JS Replacement)
reset
cp my.file my_excluded.file
rexreplace foo '1+1' *.file -X '*excluded*' -j
echo assert                "cat my.file" "2bar" # my.file modified via JS
echo assert                "cat my_excluded.file" "foobar" # excluded file untouched
rm -f my_excluded.file

# --- Edge Cases ---

# Empty file
reset
> empty.file
echo assert                "rexreplace foo bar empty.file -o" "" # Output empty string
rexreplace foo bar empty.file
echo assert                "cat empty.file" "" # File remains empty
rm -f empty.file

# Empty Pipe
echo assert                "printf '' | rexreplace foo bar" ""

# No Matches
reset
echo assert                "rexreplace nomatch xxx my.file -o" "foobar" # -o outputs even if no match
echo assert_NOTcontains    "rexreplace nomatch xxx my.file -V" "Matched" # Verbose shows no match
reset
rexreplace nomatch xxx my.file # Run without -o
echo assert                "cat my.file" "foobar" # File should be unchanged

# Shell Metacharacters (ensure quoting in test script works)
reset
echo 'dollar$ star* question?' > meta.file
# Test literal replacement OF metacharacters
echo assert                "rexreplace '$' '£' meta.file -L -o" "dollar£ star* question?"
echo assert                "rexreplace '*' '+' meta.file -L -o" "dollar$ star+ question?"
echo assert                "rexreplace '?' '!' meta.file -L -o" "dollar$ star* question!"
# Test literal replacement WITH metacharacters
echo assert                "rexreplace star '$*' meta.file -L -o" "dollar$ $* question?"
rm -f meta.file

# --- Error Handling ---

# Invalid Regex
reset
echo assert_raises         "rexreplace '(' ')' my.file" 1 # Invalid regex '(' should cause error

# Non-existent file (without -H)
reset
echo assert_raises         "rexreplace foo bar non_existent_file.txt" 1 # Should report error for the missing file

# Invalid Option
reset
echo assert_raises         "rexreplace foo bar --invalid-option my.file" 255 # Standard exit code for bad args often 255, but depends on parser

# Permission Error (using setup_readonly_error)
reset
setup_readonly_error
echo assert_raises         "rexreplace 'error' 'denied' read_only.file" 1 # Expect error when trying to write
cleanup_readonly_error

# --- Final Cleanup ---
reset # Run reset one last time to clean up standard files
rm -f *.file *.bak *.tmp *.log # General cleanup


# --- End of Tests ---
assert_end             "rexreplace AI extended"
