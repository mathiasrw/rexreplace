export default class Datapoint {
	private _path: string;
	get path() {
		return this._path;
	}

	private _content: string;
	get content() {
		return this._content;
	}

	flushContent() {
		delete this._content;
		return this;
	}
	setFile(path, content) {
		this._path = path;
		this._content = content;
		this.setType({isFile: true});
		return this;
	}

	private _type: {
		isStream: boolean;
		isStreamIn: boolean;
		isStreamOut: boolean;
		isStreamInOut: boolean;
		isFile: boolean;
	};
	get type() {
		return this._type;
	}
	private setType(x) {
		this._type = {...this._type, ...x};
	}

	private _streamIn: NodeJS.ReadStream;
	get streamIn() {
		return this._streamIn;
	}
	set streamIn(x) {
		if (null !== x) {
			this._streamIn = x;
			this.setType({isStream: true, isStreamIn: true});
		}
	}

	private _streamOut: NodeJS.WriteStream;
	get streamOut() {
		return this._streamOut;
	}

	set streamOut(x) {
		if (null !== x) {
			this._streamOut = x;
			this.setType({isStream: true, isStreamOut: true});
		}
	}

	private _streamInOut: NodeJS.ReadWriteStream;
	get streamInOut() {
		return this._streamInOut;
	}
	set streamInOut(x) {
		if (null !== x) {
			this._streamInOut = x;
			this.setType({isStream: true, isStreamInOut: true});
		}
	}
	setStreamIn(x) {
		this.streamIn = x;
		return this;
	}
	setStreamOut(x) {
		this.streamOut = x;
		return this;
	}
	setStreamInOut(x) {
		this.streamInOut = x;
		return this;
	}
	constructor() {
		this.setFile(null, null);

		this.streamIn = null;
		this.streamOut = null;
		this.streamInOut = null;

		this._type = {
			isStream: false,
			isStreamIn: false,
			isStreamOut: false,
			isStreamInOut: false,
			isFile: false,
		};
	}
}

Datapoint.prototype.toString = function DatapointToString() {
	if (this.isStream) return 'Stream';
	return this.path;
};
