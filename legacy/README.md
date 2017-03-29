_This is the legacy version of [RexReplace](https://www.npmjs.com/package/rexreplace)_

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

- Replacement may refer to captured groups. The first group is named `$1`

- Filepath can only contain a path to one particular file (no globs)

- Default is global case-insensitive multiline search (regexFlags is default `gmi`)

- Default file encoding is `utf8`

### Example

```bash
> rreplace '(foo)(.*)' '$2$1' myfile.md 
  # 'foobar' is now 'barfoo' in myfile.md
```


---
MIT License

