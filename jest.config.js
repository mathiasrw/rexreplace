module.exports = {
	testEnvironment: 'node',
	testMatch: ['<rootDir>/test/**/*.js'],
	testPathIgnorePatterns: [
		'<rootDir>/test/helper\\.js$',
		'<rootDir>/test/test\\.js\\.stub$',
		'<rootDir>/test/jest\\.setup\\.js$',
		'<rootDir>/test/cli/',
		'<rootDir>/test/speed/',
	],
	setupFilesAfterEnv: ['<rootDir>/test/jest.setup.js'],
};
