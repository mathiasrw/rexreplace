/*
import commonjs from 'rollup-plugin-commonjs';
import pkg from './package.json';
import progress from 'rollup-plugin-progress';
import typescript from 'rollup-plugin-typescript3';
import closure from 'rollup-plugin-closure-compiler-js';

*/
import replace from '@rollup/plugin-replace';
import swc from '@rollup/plugin-swc';
import resolve from '@rollup/plugin-node-resolve';



// https://github.com/jkuri/rollup-plugin-progress
// https://github.com/camelaissani/rollup-plugin-closure-compiler-js
// https://github.com/rollup/rollup-plugin-buble (for browser)
// https://github.com/jetiny/rollup-plugin-re
// https://github.com/ezolenko/rollup-plugin-typescript2

export default [
	{
		// input: 'src/cli.ts',
		input: 'bin/ES6/cli.js',
		output: {
			name: 'rexreplace',
			file: 'bin/rexreplace.cli.js',
			format: 'iife',
			banner: '#!/usr/bin/env node',
		},
		plugins: [
			resolve(),
			swc({ jsc: { target: 'es5', }, }),
			replace({
				"PACKAGE_VERSION": require('./package.json').version, preventAssignment: true,
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
		]
	},/*{
		input: 'src/multiversion.cli.js',
		output: {
			name: 'rexreplace_cli',
			file: 'build/rexreplace.cli.js',
			format: 'iife'
		}
	},*/

];
