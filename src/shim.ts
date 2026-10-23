// The Set methods came in Node 22. They are added here for older runtimes, with only what RexReplace uses.

const proto: any = Set.prototype;

proto.intersection ??= function (other) {
	return new Set([...this].filter(item => other.has(item)));
};

proto.difference ??= function (other) {
	return new Set([...this].filter(item => !other.has(item)));
};
