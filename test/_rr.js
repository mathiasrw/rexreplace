const fs = require('fs');
const path = require('path');
const {exec} = require('child_process');

module.exports = rr = {};

rr.exe = 'node -r ts-node/register ' + path.resolve(__dirname, '../src/cli.ts');

rr.getCLICommand = function(CLIparams, voidOutputFlag = false) {
	return `${rr.exe} ${CLIparams} ` + (voidOutputFlag ? '' : '-o');
};

rr.verify = function(CLIparams, expectedOutput, cb) {
	rr.verifyCMDoutput(rr.getCLICommand(CLIparams), expectedOutput, cb);
};

rr.verifyCMDoutput = function(command, expectedOutput, cb) {
	rr.execCMD(command, (output) => {
		assert.equal(output, expectedOutput);
		cb();
	});
};

rr.resetTestData = function(name = 'my.file', content = 'foobar') {
	fs.writeFileSync(name, content);
	//rr.execCMD(`echo "${content}" > "${name}"`, cb);
};

rr.execCMD = function(command, cb) {
	exec(command, (err, output, stderr) => {
		if (err) {
			console.error(err);
			throw command;
		}
		cb(output.trim());
	});
};

rr.test = function(CLIparams, expectedOutput) {
	it(CLIparams, function(done) {
		rr.resetTestData();
		rr.verify(CLIparams, expectedOutput, done);
	});
};
