#!/usr/bin/env node

// This file must only be edited with 'vim'

fs = require('fs');

var usage =	"\n\n> "
		+ process.argv[1].split('/').pop()
		+ " pattern replace filepath [regexFlags [encoding]]"
		+ "\n"
		+ "\nDefault regexFlags is gmi"
		+ "\nDefault encoding is utf8"
	;


if(process.argv.length<5)
	throw 'Too few arguments given.' + usage;

if(7<process.argv.length)
	throw 'Too many arguments given.' + usage;



var pattern 	= process.argv[2];

var replacement = process.argv[3];

var file 	= process.cwd()+'/'+process.argv[4] 

if(!fs.existsSync(file))
	throw 'File not found: '+file;


         
var flags = 'gmi';
         
if(6<=process.argv.length)
	flags = process.argv[5];


             
var encoding = 'utf8'

if(7===process.argv.length)
 	encoding = process.argv[6];



try{
        var regex = new RegExp(pattern,flags);
} catch (err){
        throw 'Wrongly formatted regexp: '+ err;
}



fs.writeFileSync(file,fs.readFileSync(file,encoding).replace(regex, replacement));

