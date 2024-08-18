interface Runtime {
	fileReadSync: (path: string) => string;
	fileReadAsync: (path: string) => Promise<string>;
	fileWriteSync: (path: string, data: string) => void;
	fileWriteAsync: (path: string, data: string) => Promise<void | number>;
	fileDeleteSync: (path: string) => void;
	fileDeleteAsync: (path: string) => Promise<void>;
	fileCopySync: (originalPath: string, destinationPath: string) => void;
	fileCopyAsync: (originalPath: string, destinationPath: string) => Promise<void | number>;
	exit: (errorCode: number) => null;
	isFileSync: (path: string) => boolean;
	logInfo: typeof console.log;
	logWarn: typeof console.log;
	logErr: typeof console.log;
	setEncoding: (encoding: BufferEncoding) => void;
	globFiles: (includeGlobs: string[], excludeGlobs?:string[], caseSensitive? :boolean) => string[];
}

declare const Deno: any;
