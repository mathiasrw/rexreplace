// Set.prototype.intersection() came in Node 22, so it is added here for older runtimes

const proto: any = Set.prototype;

proto.intersection ??= function (other) {
	return new Set([...this].filter(item => other.has(item)));
};
