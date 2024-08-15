import swc from '@rollup/plugin-swc';
import replace from '@rollup/plugin-replace';

export default [
	{
		input: 'src/cli.ts',
		output: {
			banner: '#!/usr/bin/env node',
			file: 'bin/rexreplace.cli.js',
			name: 'rexreplace',
			format: 'iife',
		},
		plugins: [
			swc({jsc: {target: 'es5'}}),
			replace({
				PACKAGE_VERSION: require('./package.json').version,
				preventAssignment: true,
			}),

			//progress(),
			/*closure({
						languageIn: 'ECMASCRIPT6',
						languageOut: 'ECMASCRIPT5',
						compilationLevel: 'ADVANCED',
						warningLevel: 'QUIET',
						env:'CUSTOM',
						//externs: ['externs.js'],
			}),//*/

			//uglify(),
			//filesize(),
		],
	} /*{
		input: 'src/multiversion.cli.js',
		output: {
			name: 'rexreplace_cli',
			file: 'build/rexreplace.cli.js',
			format: 'iife'
		}
	},*/,
];
