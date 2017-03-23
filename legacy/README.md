# rreplace
Regex replace in files from your CLI. 

### Installation 
```bash
> npm install -g rreplace
```

Works on any version of Node.js since 0.6

### Usage
```bash
> rreplace pattern replacement file
```

- Always global case insensitive multiline search
- Only single file, no globs
- Pattern is string with regex and can capture groups
- Replacement can refere back to gaptured group. first group is named `$1`

---
MIT License

_Legacy version of [RexReplace](https://github.com/mathiasrw/rexreplace)_