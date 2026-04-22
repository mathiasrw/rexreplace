// Provide Mocha-compatible aliases for Jest lifecycle hooks
global.before = global.beforeAll;
global.after = global.afterAll;

// Provide globals used by the test files
global.assert = require('assert');
// All JS test files are currently stubs whose assertions don't depend on
// rexreplace return values, so a no-op mock is sufficient.
global.rexreplace = jest.fn();
