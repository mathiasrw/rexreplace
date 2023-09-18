interface Runtime {
	fileReadSync: (path: string, encoding?: string) => string;
	fileReadAsync: (path: string, encoding?: string) => Promise<string>;
	fileWriteSync: (path: string, data: string, encoding?: string) => void;
	fileWriteAsync: (path: string, data: string, encoding?: string) => Promise<void>;
	fileDeleteSync: (path: string) => void;
	fileDeleteAsync: (path: string) => Promise<void>;
	fileCopySync: (originalPath: string, destinationPath: string) => void;
	fileCopyAsync: (originalPath: string, destinationPath: string) => Promise<void>;
	exit: (errorCode: number) => null;
}
