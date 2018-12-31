describe(__filename.replace(/.*\/([^\/]+)\.js$/, '$1') + ' - Stub', function() {
	before(function() {});

	after(function() {});

	it('rr is awesome', function() {
		rexreplace({
			pattern: 'a',
			replacement: 'b',
			files: ['myfile'],
		});
		assert.equal(1, 1);
	});
});
