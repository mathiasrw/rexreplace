/*
import commonjs from 'rollup-plugin-commonjs';
import pkg from './package.json';
import progress from 'rollup-plugin-progress';
import typescript from 'rollup-plugin-typescript3';
import closure from 'rollup-plugin-closure-compiler-js';
import { uglify } from 'rollup-plugin-uglify';

*/
// import filesize from 'rollup-plugin-filesize';
import replace from 'rollup-plugin-replace';
import hashbang from 'rollup-plugin-hashbang'
import buble from 'rollup-plugin-buble';
import resolve from 'rollup-plugin-node-resolve';



// https://github.com/ritz078/rollup-plugin-filesize
// https://github.com/jkuri/rollup-plugin-progress
// https://github.com/TrySound/rollup-plugin-uglify
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
			//file: 'build/ES5/rexreplace.bundle.js',
			file: 'bin/rexreplace.cli.js',
			format: 'iife'
		},
		plugins: [
			hashbang(),			
			//typescript(),
			resolve(), 
			buble(),
			replace({
				"PACKAGE_VERSION": require('./package.json').version
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
