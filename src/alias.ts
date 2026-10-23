// Test of stacked PRs (devops/stack/a, commit 1). Not to be merged.
// The `€` and `§` aliases are for the shell, where `$` and `\` are hard to type, so the CLI uses them and not the engine.
// Globs, file names and piped data never use them, as `€` and `§` can be part of the text.
export function alias(config) {
	const swap = (str) => {
		if (!str) {
			return str;
		}
		if (!config.voidEuro) {
			str = str.replace(/€/g, '$');
		}
		if (!config.voidSection) {
			str = str.replace(/§/g, '\\');
		}
		return str;
	};

	config.pattern = swap(config.pattern);
	config.replacement = swap(config.replacement);
	config.excludeRe = config.excludeRe.map(swap);
	config.delimiter = swap(config.delimiter);
	config.nameDelimiter = swap(config.nameDelimiter);
	config.contentDelimiter = swap(config.contentDelimiter);
}
