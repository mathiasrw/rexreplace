export default class Datapoint {
    get path() {
        return this._path;
    }
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
        this.setType({ isFile: true });
        return this;
    }
    get type() {
        return this._type;
    }
    setType(x) {
        this._type = Object.assign({}, this._type, x);
    }
    get streamIn() {
        return this._streamIn;
    }
    set streamIn(x) {
        if (null !== x) {
            this._streamIn = x;
            this.setType({ isStream: true, isStreamIn: true });
        }
    }
    get streamOut() {
        return this._streamOut;
    }
    set streamOut(x) {
        if (null !== x) {
            this._streamOut = x;
            this.setType({ isStream: true, isStreamOut: true });
        }
    }
    get streamInOut() {
        return this._streamInOut;
    }
    set streamInOut(x) {
        if (null !== x) {
            this._streamInOut = x;
            this.setType({ isStream: true, isStreamInOut: true });
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
    if (this.isStream)
        return 'Stream';
    return this.path;
};
