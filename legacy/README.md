_This is a legacy version of [RexReplace](https://github.com/mathiasrw/rexreplace)_

# rreplace

Regex replace in files from your CLI - with a tiny footprint. 

### Installation 
```bash
> npm install -g rreplace
```

Works on any version of Node.js since 0.6

### Usage
```bash
> rreplace pattern replace filepath [regexFlags [encoding]]
```

- Pattern is a regex and may capture groups

- Replacement may refer back to captured groups. The first group is named `$1`

- Filepath can only contain a path to one specific file (no globs)

- Default is global case-insensitive multiline search (regexFlags is `gmi`)

- Default file encoding is `utf8`

### Example

```bash
echo 'foobar' > myfile 
rreplace '(F?(O))O(.*)' '$3$1$2' myfile 
grep -q 'barfoo' myfile || exit 100
```


---
MIT License

