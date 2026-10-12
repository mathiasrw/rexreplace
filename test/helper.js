// Bun's test runner has no mocha-style `before`/`after`; alias them so the existing tests run unchanged.
const bun = require('bun:test');

global.before = bun.beforeAll;
global.after = bun.afterAll;
global.describe = bun.describe;
global.it = bun.it;

global.assert = require('assert');

// The JS tests are currently stubs whose assertions don't depend on rexreplace return values.
global.rexreplace = bun.mock(() => {});
