#!/usr/bin/env bun
// @bun
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getProtoOf = Object.getPrototypeOf;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
    if (!__hasOwnProp.call(to, key))
      __defProp(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __require = (id) => {
  return import.meta.require(id);
};

// node_modules/universalify/index.js
var require_universalify = __commonJS((exports) => {
  exports.fromCallback = function(fn) {
    return Object.defineProperty(function(...args) {
      if (typeof args[args.length - 1] === "function")
        fn.apply(this, args);
      else {
        return new Promise((resolve5, reject) => {
          fn.call(this, ...args, (err, res) => err != null ? reject(err) : resolve5(res));
        });
      }
    }, "name", { value: fn.name });
  };
  exports.fromPromise = function(fn) {
    return Object.defineProperty(function(...args) {
      const cb = args[args.length - 1];
      if (typeof cb !== "function")
        return fn.apply(this, args);
      else
        fn.apply(this, args.slice(0, -1)).then((r) => cb(null, r), cb);
    }, "name", { value: fn.name });
  };
});

// node_modules/graceful-fs/polyfills.js
var require_polyfills = __commonJS((exports, module) => {
  var patch = function(fs) {
    if (constants.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
      patchLchmod(fs);
    }
    if (!fs.lutimes) {
      patchLutimes(fs);
    }
    fs.chown = chownFix(fs.chown);
    fs.fchown = chownFix(fs.fchown);
    fs.lchown = chownFix(fs.lchown);
    fs.chmod = chmodFix(fs.chmod);
    fs.fchmod = chmodFix(fs.fchmod);
    fs.lchmod = chmodFix(fs.lchmod);
    fs.chownSync = chownFixSync(fs.chownSync);
    fs.fchownSync = chownFixSync(fs.fchownSync);
    fs.lchownSync = chownFixSync(fs.lchownSync);
    fs.chmodSync = chmodFixSync(fs.chmodSync);
    fs.fchmodSync = chmodFixSync(fs.fchmodSync);
    fs.lchmodSync = chmodFixSync(fs.lchmodSync);
    fs.stat = statFix(fs.stat);
    fs.fstat = statFix(fs.fstat);
    fs.lstat = statFix(fs.lstat);
    fs.statSync = statFixSync(fs.statSync);
    fs.fstatSync = statFixSync(fs.fstatSync);
    fs.lstatSync = statFixSync(fs.lstatSync);
    if (fs.chmod && !fs.lchmod) {
      fs.lchmod = function(path, mode, cb) {
        if (cb)
          process.nextTick(cb);
      };
      fs.lchmodSync = function() {
      };
    }
    if (fs.chown && !fs.lchown) {
      fs.lchown = function(path, uid, gid, cb) {
        if (cb)
          process.nextTick(cb);
      };
      fs.lchownSync = function() {
      };
    }
    if (platform === "win32") {
      fs.rename = typeof fs.rename !== "function" ? fs.rename : function(fs$rename) {
        function rename(from, to, cb) {
          var start = Date.now();
          var backoff = 0;
          fs$rename(from, to, function CB(er) {
            if (er && (er.code === "EACCES" || er.code === "EPERM" || er.code === "EBUSY") && Date.now() - start < 60000) {
              setTimeout(function() {
                fs.stat(to, function(stater, st) {
                  if (stater && stater.code === "ENOENT")
                    fs$rename(from, to, CB);
                  else
                    cb(er);
                });
              }, backoff);
              if (backoff < 100)
                backoff += 10;
              return;
            }
            if (cb)
              cb(er);
          });
        }
        if (Object.setPrototypeOf)
          Object.setPrototypeOf(rename, fs$rename);
        return rename;
      }(fs.rename);
    }
    fs.read = typeof fs.read !== "function" ? fs.read : function(fs$read) {
      function read(fd, buffer, offset, length, position, callback_) {
        var callback;
        if (callback_ && typeof callback_ === "function") {
          var eagCounter = 0;
          callback = function(er, _, __) {
            if (er && er.code === "EAGAIN" && eagCounter < 10) {
              eagCounter++;
              return fs$read.call(fs, fd, buffer, offset, length, position, callback);
            }
            callback_.apply(this, arguments);
          };
        }
        return fs$read.call(fs, fd, buffer, offset, length, position, callback);
      }
      if (Object.setPrototypeOf)
        Object.setPrototypeOf(read, fs$read);
      return read;
    }(fs.read);
    fs.readSync = typeof fs.readSync !== "function" ? fs.readSync : function(fs$readSync) {
      return function(fd, buffer, offset, length, position) {
        var eagCounter = 0;
        while (true) {
          try {
            return fs$readSync.call(fs, fd, buffer, offset, length, position);
          } catch (er) {
            if (er.code === "EAGAIN" && eagCounter < 10) {
              eagCounter++;
              continue;
            }
            throw er;
          }
        }
      };
    }(fs.readSync);
    function patchLchmod(fs2) {
      fs2.lchmod = function(path, mode, callback) {
        fs2.open(path, constants.O_WRONLY | constants.O_SYMLINK, mode, function(err, fd) {
          if (err) {
            if (callback)
              callback(err);
            return;
          }
          fs2.fchmod(fd, mode, function(err2) {
            fs2.close(fd, function(err22) {
              if (callback)
                callback(err2 || err22);
            });
          });
        });
      };
      fs2.lchmodSync = function(path, mode) {
        var fd = fs2.openSync(path, constants.O_WRONLY | constants.O_SYMLINK, mode);
        var threw = true;
        var ret;
        try {
          ret = fs2.fchmodSync(fd, mode);
          threw = false;
        } finally {
          if (threw) {
            try {
              fs2.closeSync(fd);
            } catch (er) {
            }
          } else {
            fs2.closeSync(fd);
          }
        }
        return ret;
      };
    }
    function patchLutimes(fs2) {
      if (constants.hasOwnProperty("O_SYMLINK") && fs2.futimes) {
        fs2.lutimes = function(path, at, mt, cb) {
          fs2.open(path, constants.O_SYMLINK, function(er, fd) {
            if (er) {
              if (cb)
                cb(er);
              return;
            }
            fs2.futimes(fd, at, mt, function(er2) {
              fs2.close(fd, function(er22) {
                if (cb)
                  cb(er2 || er22);
              });
            });
          });
        };
        fs2.lutimesSync = function(path, at, mt) {
          var fd = fs2.openSync(path, constants.O_SYMLINK);
          var ret;
          var threw = true;
          try {
            ret = fs2.futimesSync(fd, at, mt);
            threw = false;
          } finally {
            if (threw) {
              try {
                fs2.closeSync(fd);
              } catch (er) {
              }
            } else {
              fs2.closeSync(fd);
            }
          }
          return ret;
        };
      } else if (fs2.futimes) {
        fs2.lutimes = function(_a, _b, _c, cb) {
          if (cb)
            process.nextTick(cb);
        };
        fs2.lutimesSync = function() {
        };
      }
    }
    function chmodFix(orig) {
      if (!orig)
        return orig;
      return function(target, mode, cb) {
        return orig.call(fs, target, mode, function(er) {
          if (chownErOk(er))
            er = null;
          if (cb)
            cb.apply(this, arguments);
        });
      };
    }
    function chmodFixSync(orig) {
      if (!orig)
        return orig;
      return function(target, mode) {
        try {
          return orig.call(fs, target, mode);
        } catch (er) {
          if (!chownErOk(er))
            throw er;
        }
      };
    }
    function chownFix(orig) {
      if (!orig)
        return orig;
      return function(target, uid, gid, cb) {
        return orig.call(fs, target, uid, gid, function(er) {
          if (chownErOk(er))
            er = null;
          if (cb)
            cb.apply(this, arguments);
        });
      };
    }
    function chownFixSync(orig) {
      if (!orig)
        return orig;
      return function(target, uid, gid) {
        try {
          return orig.call(fs, target, uid, gid);
        } catch (er) {
          if (!chownErOk(er))
            throw er;
        }
      };
    }
    function statFix(orig) {
      if (!orig)
        return orig;
      return function(target, options, cb) {
        if (typeof options === "function") {
          cb = options;
          options = null;
        }
        function callback(er, stats) {
          if (stats) {
            if (stats.uid < 0)
              stats.uid += 4294967296;
            if (stats.gid < 0)
              stats.gid += 4294967296;
          }
          if (cb)
            cb.apply(this, arguments);
        }
        return options ? orig.call(fs, target, options, callback) : orig.call(fs, target, callback);
      };
    }
    function statFixSync(orig) {
      if (!orig)
        return orig;
      return function(target, options) {
        var stats = options ? orig.call(fs, target, options) : orig.call(fs, target);
        if (stats) {
          if (stats.uid < 0)
            stats.uid += 4294967296;
          if (stats.gid < 0)
            stats.gid += 4294967296;
        }
        return stats;
      };
    }
    function chownErOk(er) {
      if (!er)
        return true;
      if (er.code === "ENOSYS")
        return true;
      var nonroot = !process.getuid || process.getuid() !== 0;
      if (nonroot) {
        if (er.code === "EINVAL" || er.code === "EPERM")
          return true;
      }
      return false;
    }
  };
  var constants = import.meta.require("constants");
  var origCwd = process.cwd;
  var cwd = null;
  var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;
  process.cwd = function() {
    if (!cwd)
      cwd = origCwd.call(process);
    return cwd;
  };
  try {
    process.cwd();
  } catch (er) {
  }
  if (typeof process.chdir === "function") {
    chdir = process.chdir;
    process.chdir = function(d) {
      cwd = null;
      chdir.call(process, d);
    };
    if (Object.setPrototypeOf)
      Object.setPrototypeOf(process.chdir, chdir);
  }
  var chdir;
  module.exports = patch;
});

// node_modules/graceful-fs/legacy-streams.js
var require_legacy_streams = __commonJS((exports, module) => {
  var legacy = function(fs) {
    return {
      ReadStream,
      WriteStream
    };
    function ReadStream(path, options) {
      if (!(this instanceof ReadStream))
        return new ReadStream(path, options);
      Stream.call(this);
      var self = this;
      this.path = path;
      this.fd = null;
      this.readable = true;
      this.paused = false;
      this.flags = "r";
      this.mode = 438;
      this.bufferSize = 64 * 1024;
      options = options || {};
      var keys = Object.keys(options);
      for (var index = 0, length = keys.length;index < length; index++) {
        var key = keys[index];
        this[key] = options[key];
      }
      if (this.encoding)
        this.setEncoding(this.encoding);
      if (this.start !== undefined) {
        if (typeof this.start !== "number") {
          throw TypeError("start must be a Number");
        }
        if (this.end === undefined) {
          this.end = Infinity;
        } else if (typeof this.end !== "number") {
          throw TypeError("end must be a Number");
        }
        if (this.start > this.end) {
          throw new Error("start must be <= end");
        }
        this.pos = this.start;
      }
      if (this.fd !== null) {
        process.nextTick(function() {
          self._read();
        });
        return;
      }
      fs.open(this.path, this.flags, this.mode, function(err, fd) {
        if (err) {
          self.emit("error", err);
          self.readable = false;
          return;
        }
        self.fd = fd;
        self.emit("open", fd);
        self._read();
      });
    }
    function WriteStream(path, options) {
      if (!(this instanceof WriteStream))
        return new WriteStream(path, options);
      Stream.call(this);
      this.path = path;
      this.fd = null;
      this.writable = true;
      this.flags = "w";
      this.encoding = "binary";
      this.mode = 438;
      this.bytesWritten = 0;
      options = options || {};
      var keys = Object.keys(options);
      for (var index = 0, length = keys.length;index < length; index++) {
        var key = keys[index];
        this[key] = options[key];
      }
      if (this.start !== undefined) {
        if (typeof this.start !== "number") {
          throw TypeError("start must be a Number");
        }
        if (this.start < 0) {
          throw new Error("start must be >= zero");
        }
        this.pos = this.start;
      }
      this.busy = false;
      this._queue = [];
      if (this.fd === null) {
        this._open = fs.open;
        this._queue.push([this._open, this.path, this.flags, this.mode, undefined]);
        this.flush();
      }
    }
  };
  var Stream = import.meta.require("stream").Stream;
  module.exports = legacy;
});

// node_modules/graceful-fs/clone.js
var require_clone = __commonJS((exports, module) => {
  var clone = function(obj) {
    if (obj === null || typeof obj !== "object")
      return obj;
    if (obj instanceof Object)
      var copy = { __proto__: getPrototypeOf(obj) };
    else
      var copy = Object.create(null);
    Object.getOwnPropertyNames(obj).forEach(function(key) {
      Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key));
    });
    return copy;
  };
  module.exports = clone;
  var getPrototypeOf = Object.getPrototypeOf || function(obj) {
    return obj.__proto__;
  };
});

// node_modules/graceful-fs/graceful-fs.js
var require_graceful_fs = __commonJS((exports, module) => {
  var noop = function() {
  };
  var publishQueue = function(context, queue2) {
    Object.defineProperty(context, gracefulQueue, {
      get: function() {
        return queue2;
      }
    });
  };
  var patch = function(fs2) {
    polyfills(fs2);
    fs2.gracefulify = patch;
    fs2.createReadStream = createReadStream;
    fs2.createWriteStream = createWriteStream;
    var fs$readFile = fs2.readFile;
    fs2.readFile = readFile;
    function readFile(path, options, cb) {
      if (typeof options === "function")
        cb = options, options = null;
      return go$readFile(path, options, cb);
      function go$readFile(path2, options2, cb2, startTime) {
        return fs$readFile(path2, options2, function(err) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([go$readFile, [path2, options2, cb2], err, startTime || Date.now(), Date.now()]);
          else {
            if (typeof cb2 === "function")
              cb2.apply(this, arguments);
          }
        });
      }
    }
    var fs$writeFile = fs2.writeFile;
    fs2.writeFile = writeFile2;
    function writeFile2(path, data, options, cb) {
      if (typeof options === "function")
        cb = options, options = null;
      return go$writeFile(path, data, options, cb);
      function go$writeFile(path2, data2, options2, cb2, startTime) {
        return fs$writeFile(path2, data2, options2, function(err) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([go$writeFile, [path2, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
          else {
            if (typeof cb2 === "function")
              cb2.apply(this, arguments);
          }
        });
      }
    }
    var fs$appendFile = fs2.appendFile;
    if (fs$appendFile)
      fs2.appendFile = appendFile;
    function appendFile(path, data, options, cb) {
      if (typeof options === "function")
        cb = options, options = null;
      return go$appendFile(path, data, options, cb);
      function go$appendFile(path2, data2, options2, cb2, startTime) {
        return fs$appendFile(path2, data2, options2, function(err) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([go$appendFile, [path2, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
          else {
            if (typeof cb2 === "function")
              cb2.apply(this, arguments);
          }
        });
      }
    }
    var fs$copyFile = fs2.copyFile;
    if (fs$copyFile)
      fs2.copyFile = copyFile;
    function copyFile(src, dest, flags, cb) {
      if (typeof flags === "function") {
        cb = flags;
        flags = 0;
      }
      return go$copyFile(src, dest, flags, cb);
      function go$copyFile(src2, dest2, flags2, cb2, startTime) {
        return fs$copyFile(src2, dest2, flags2, function(err) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([go$copyFile, [src2, dest2, flags2, cb2], err, startTime || Date.now(), Date.now()]);
          else {
            if (typeof cb2 === "function")
              cb2.apply(this, arguments);
          }
        });
      }
    }
    var fs$readdir = fs2.readdir;
    fs2.readdir = readdir;
    var noReaddirOptionVersions = /^v[0-5]\./;
    function readdir(path, options, cb) {
      if (typeof options === "function")
        cb = options, options = null;
      var go$readdir = noReaddirOptionVersions.test(process.version) ? function go$readdir(path2, options2, cb2, startTime) {
        return fs$readdir(path2, fs$readdirCallback(path2, options2, cb2, startTime));
      } : function go$readdir(path2, options2, cb2, startTime) {
        return fs$readdir(path2, options2, fs$readdirCallback(path2, options2, cb2, startTime));
      };
      return go$readdir(path, options, cb);
      function fs$readdirCallback(path2, options2, cb2, startTime) {
        return function(err, files) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([
              go$readdir,
              [path2, options2, cb2],
              err,
              startTime || Date.now(),
              Date.now()
            ]);
          else {
            if (files && files.sort)
              files.sort();
            if (typeof cb2 === "function")
              cb2.call(this, err, files);
          }
        };
      }
    }
    if (process.version.substr(0, 4) === "v0.8") {
      var legStreams = legacy(fs2);
      ReadStream = legStreams.ReadStream;
      WriteStream = legStreams.WriteStream;
    }
    var fs$ReadStream = fs2.ReadStream;
    if (fs$ReadStream) {
      ReadStream.prototype = Object.create(fs$ReadStream.prototype);
      ReadStream.prototype.open = ReadStream$open;
    }
    var fs$WriteStream = fs2.WriteStream;
    if (fs$WriteStream) {
      WriteStream.prototype = Object.create(fs$WriteStream.prototype);
      WriteStream.prototype.open = WriteStream$open;
    }
    Object.defineProperty(fs2, "ReadStream", {
      get: function() {
        return ReadStream;
      },
      set: function(val) {
        ReadStream = val;
      },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(fs2, "WriteStream", {
      get: function() {
        return WriteStream;
      },
      set: function(val) {
        WriteStream = val;
      },
      enumerable: true,
      configurable: true
    });
    var FileReadStream = ReadStream;
    Object.defineProperty(fs2, "FileReadStream", {
      get: function() {
        return FileReadStream;
      },
      set: function(val) {
        FileReadStream = val;
      },
      enumerable: true,
      configurable: true
    });
    var FileWriteStream = WriteStream;
    Object.defineProperty(fs2, "FileWriteStream", {
      get: function() {
        return FileWriteStream;
      },
      set: function(val) {
        FileWriteStream = val;
      },
      enumerable: true,
      configurable: true
    });
    function ReadStream(path, options) {
      if (this instanceof ReadStream)
        return fs$ReadStream.apply(this, arguments), this;
      else
        return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
    }
    function ReadStream$open() {
      var that = this;
      open(that.path, that.flags, that.mode, function(err, fd) {
        if (err) {
          if (that.autoClose)
            that.destroy();
          that.emit("error", err);
        } else {
          that.fd = fd;
          that.emit("open", fd);
          that.read();
        }
      });
    }
    function WriteStream(path, options) {
      if (this instanceof WriteStream)
        return fs$WriteStream.apply(this, arguments), this;
      else
        return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
    }
    function WriteStream$open() {
      var that = this;
      open(that.path, that.flags, that.mode, function(err, fd) {
        if (err) {
          that.destroy();
          that.emit("error", err);
        } else {
          that.fd = fd;
          that.emit("open", fd);
        }
      });
    }
    function createReadStream(path, options) {
      return new fs2.ReadStream(path, options);
    }
    function createWriteStream(path, options) {
      return new fs2.WriteStream(path, options);
    }
    var fs$open = fs2.open;
    fs2.open = open;
    function open(path, flags, mode, cb) {
      if (typeof mode === "function")
        cb = mode, mode = null;
      return go$open(path, flags, mode, cb);
      function go$open(path2, flags2, mode2, cb2, startTime) {
        return fs$open(path2, flags2, mode2, function(err, fd) {
          if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
            enqueue([go$open, [path2, flags2, mode2, cb2], err, startTime || Date.now(), Date.now()]);
          else {
            if (typeof cb2 === "function")
              cb2.apply(this, arguments);
          }
        });
      }
    }
    return fs2;
  };
  var enqueue = function(elem) {
    debug2("ENQUEUE", elem[0].name, elem[1]);
    fs[gracefulQueue].push(elem);
    retry();
  };
  var resetQueue = function() {
    var now = Date.now();
    for (var i = 0;i < fs[gracefulQueue].length; ++i) {
      if (fs[gracefulQueue][i].length > 2) {
        fs[gracefulQueue][i][3] = now;
        fs[gracefulQueue][i][4] = now;
      }
    }
    retry();
  };
  var retry = function() {
    clearTimeout(retryTimer);
    retryTimer = undefined;
    if (fs[gracefulQueue].length === 0)
      return;
    var elem = fs[gracefulQueue].shift();
    var fn = elem[0];
    var args = elem[1];
    var err = elem[2];
    var startTime = elem[3];
    var lastTime = elem[4];
    if (startTime === undefined) {
      debug2("RETRY", fn.name, args);
      fn.apply(null, args);
    } else if (Date.now() - startTime >= 60000) {
      debug2("TIMEOUT", fn.name, args);
      var cb = args.pop();
      if (typeof cb === "function")
        cb.call(null, err);
    } else {
      var sinceAttempt = Date.now() - lastTime;
      var sinceStart = Math.max(lastTime - startTime, 1);
      var desiredDelay = Math.min(sinceStart * 1.2, 100);
      if (sinceAttempt >= desiredDelay) {
        debug2("RETRY", fn.name, args);
        fn.apply(null, args.concat([startTime]));
      } else {
        fs[gracefulQueue].push(elem);
      }
    }
    if (retryTimer === undefined) {
      retryTimer = setTimeout(retry, 0);
    }
  };
  var fs = import.meta.require("fs");
  var polyfills = require_polyfills();
  var legacy = require_legacy_streams();
  var clone = require_clone();
  var util = import.meta.require("util");
  var gracefulQueue;
  var previousSymbol;
  if (typeof Symbol === "function" && typeof Symbol.for === "function") {
    gracefulQueue = Symbol.for("graceful-fs.queue");
    previousSymbol = Symbol.for("graceful-fs.previous");
  } else {
    gracefulQueue = "___graceful-fs.queue";
    previousSymbol = "___graceful-fs.previous";
  }
  var debug2 = noop;
  if (util.debuglog)
    debug2 = util.debuglog("gfs4");
  else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ""))
    debug2 = function() {
      var m = util.format.apply(util, arguments);
      m = "GFS4: " + m.split(/\n/).join("\nGFS4: ");
      console.error(m);
    };
  if (!fs[gracefulQueue]) {
    queue = global[gracefulQueue] || [];
    publishQueue(fs, queue);
    fs.close = function(fs$close) {
      function close(fd, cb) {
        return fs$close.call(fs, fd, function(err) {
          if (!err) {
            resetQueue();
          }
          if (typeof cb === "function")
            cb.apply(this, arguments);
        });
      }
      Object.defineProperty(close, previousSymbol, {
        value: fs$close
      });
      return close;
    }(fs.close);
    fs.closeSync = function(fs$closeSync) {
      function closeSync(fd) {
        fs$closeSync.apply(fs, arguments);
        resetQueue();
      }
      Object.defineProperty(closeSync, previousSymbol, {
        value: fs$closeSync
      });
      return closeSync;
    }(fs.closeSync);
    if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || "")) {
      process.on("exit", function() {
        debug2(fs[gracefulQueue]);
        import.meta.require("assert").equal(fs[gracefulQueue].length, 0);
      });
    }
  }
  var queue;
  if (!global[gracefulQueue]) {
    publishQueue(global, fs[gracefulQueue]);
  }
  module.exports = patch(clone(fs));
  if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs.__patched) {
    module.exports = patch(fs);
    fs.__patched = true;
  }
  var retryTimer;
});

// node_modules/fs-extra/lib/fs/index.js
var require_fs = __commonJS((exports) => {
  var u = require_universalify().fromCallback;
  var fs = require_graceful_fs();
  var api = [
    "access",
    "appendFile",
    "chmod",
    "chown",
    "close",
    "copyFile",
    "fchmod",
    "fchown",
    "fdatasync",
    "fstat",
    "fsync",
    "ftruncate",
    "futimes",
    "lchmod",
    "lchown",
    "link",
    "lstat",
    "mkdir",
    "mkdtemp",
    "open",
    "opendir",
    "readdir",
    "readFile",
    "readlink",
    "realpath",
    "rename",
    "rm",
    "rmdir",
    "stat",
    "symlink",
    "truncate",
    "unlink",
    "utimes",
    "writeFile"
  ].filter((key) => {
    return typeof fs[key] === "function";
  });
  Object.assign(exports, fs);
  api.forEach((method) => {
    exports[method] = u(fs[method]);
  });
  exports.exists = function(filename, callback) {
    if (typeof callback === "function") {
      return fs.exists(filename, callback);
    }
    return new Promise((resolve5) => {
      return fs.exists(filename, resolve5);
    });
  };
  exports.read = function(fd, buffer, offset, length, position, callback) {
    if (typeof callback === "function") {
      return fs.read(fd, buffer, offset, length, position, callback);
    }
    return new Promise((resolve5, reject) => {
      fs.read(fd, buffer, offset, length, position, (err, bytesRead, buffer2) => {
        if (err)
          return reject(err);
        resolve5({ bytesRead, buffer: buffer2 });
      });
    });
  };
  exports.write = function(fd, buffer, ...args) {
    if (typeof args[args.length - 1] === "function") {
      return fs.write(fd, buffer, ...args);
    }
    return new Promise((resolve5, reject) => {
      fs.write(fd, buffer, ...args, (err, bytesWritten, buffer2) => {
        if (err)
          return reject(err);
        resolve5({ bytesWritten, buffer: buffer2 });
      });
    });
  };
  exports.readv = function(fd, buffers, ...args) {
    if (typeof args[args.length - 1] === "function") {
      return fs.readv(fd, buffers, ...args);
    }
    return new Promise((resolve5, reject) => {
      fs.readv(fd, buffers, ...args, (err, bytesRead, buffers2) => {
        if (err)
          return reject(err);
        resolve5({ bytesRead, buffers: buffers2 });
      });
    });
  };
  exports.writev = function(fd, buffers, ...args) {
    if (typeof args[args.length - 1] === "function") {
      return fs.writev(fd, buffers, ...args);
    }
    return new Promise((resolve5, reject) => {
      fs.writev(fd, buffers, ...args, (err, bytesWritten, buffers2) => {
        if (err)
          return reject(err);
        resolve5({ bytesWritten, buffers: buffers2 });
      });
    });
  };
  if (typeof fs.realpath.native === "function") {
    exports.realpath.native = u(fs.realpath.native);
  } else {
    process.emitWarning("fs.realpath.native is not a function. Is fs being monkey-patched?", "Warning", "fs-extra-WARN0003");
  }
});

// node_modules/fs-extra/lib/mkdirs/utils.js
var require_utils = __commonJS((exports, module) => {
  var path = import.meta.require("path");
  exports.checkPath = function checkPath(pth) {
    if (process.platform === "win32") {
      const pathHasInvalidWinCharacters = /[<>:"|?*]/.test(pth.replace(path.parse(pth).root, ""));
      if (pathHasInvalidWinCharacters) {
        const error2 = new Error(`Path contains invalid characters: ${pth}`);
        error2.code = "EINVAL";
        throw error2;
      }
    }
  };
});

// node_modules/fs-extra/lib/mkdirs/make-dir.js
var require_make_dir = __commonJS((exports, module) => {
  var fs = require_fs();
  var { checkPath } = require_utils();
  var getMode = (options) => {
    const defaults = { mode: 511 };
    if (typeof options === "number")
      return options;
    return { ...defaults, ...options }.mode;
  };
  exports.makeDir = async (dir, options) => {
    checkPath(dir);
    return fs.mkdir(dir, {
      mode: getMode(options),
      recursive: true
    });
  };
  exports.makeDirSync = (dir, options) => {
    checkPath(dir);
    return fs.mkdirSync(dir, {
      mode: getMode(options),
      recursive: true
    });
  };
});

// node_modules/fs-extra/lib/mkdirs/index.js
var require_mkdirs = __commonJS((exports, module) => {
  var u = require_universalify().fromPromise;
  var { makeDir: _makeDir, makeDirSync } = require_make_dir();
  var makeDir = u(_makeDir);
  module.exports = {
    mkdirs: makeDir,
    mkdirsSync: makeDirSync,
    mkdirp: makeDir,
    mkdirpSync: makeDirSync,
    ensureDir: makeDir,
    ensureDirSync: makeDirSync
  };
});

// node_modules/fs-extra/lib/path-exists/index.js
var require_path_exists = __commonJS((exports, module) => {
  var pathExists = function(path) {
    return fs.access(path).then(() => true).catch(() => false);
  };
  var u = require_universalify().fromPromise;
  var fs = require_fs();
  module.exports = {
    pathExists: u(pathExists),
    pathExistsSync: fs.existsSync
  };
});

// node_modules/fs-extra/lib/util/utimes.js
var require_utimes = __commonJS((exports, module) => {
  var utimesMillis = function(path, atime, mtime, callback) {
    fs.open(path, "r+", (err, fd) => {
      if (err)
        return callback(err);
      fs.futimes(fd, atime, mtime, (futimesErr) => {
        fs.close(fd, (closeErr) => {
          if (callback)
            callback(futimesErr || closeErr);
        });
      });
    });
  };
  var utimesMillisSync = function(path, atime, mtime) {
    const fd = fs.openSync(path, "r+");
    fs.futimesSync(fd, atime, mtime);
    return fs.closeSync(fd);
  };
  var fs = require_graceful_fs();
  module.exports = {
    utimesMillis,
    utimesMillisSync
  };
});

// node_modules/fs-extra/lib/util/stat.js
var require_stat = __commonJS((exports, module) => {
  var getStats = function(src, dest, opts) {
    const statFunc = opts.dereference ? (file) => fs.stat(file, { bigint: true }) : (file) => fs.lstat(file, { bigint: true });
    return Promise.all([
      statFunc(src),
      statFunc(dest).catch((err) => {
        if (err.code === "ENOENT")
          return null;
        throw err;
      })
    ]).then(([srcStat, destStat]) => ({ srcStat, destStat }));
  };
  var getStatsSync = function(src, dest, opts) {
    let destStat;
    const statFunc = opts.dereference ? (file) => fs.statSync(file, { bigint: true }) : (file) => fs.lstatSync(file, { bigint: true });
    const srcStat = statFunc(src);
    try {
      destStat = statFunc(dest);
    } catch (err) {
      if (err.code === "ENOENT")
        return { srcStat, destStat: null };
      throw err;
    }
    return { srcStat, destStat };
  };
  var checkPaths = function(src, dest, funcName, opts, cb) {
    util.callbackify(getStats)(src, dest, opts, (err, stats) => {
      if (err)
        return cb(err);
      const { srcStat, destStat } = stats;
      if (destStat) {
        if (areIdentical(srcStat, destStat)) {
          const srcBaseName = path.basename(src);
          const destBaseName = path.basename(dest);
          if (funcName === "move" && srcBaseName !== destBaseName && srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
            return cb(null, { srcStat, destStat, isChangingCase: true });
          }
          return cb(new Error("Source and destination must not be the same."));
        }
        if (srcStat.isDirectory() && !destStat.isDirectory()) {
          return cb(new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`));
        }
        if (!srcStat.isDirectory() && destStat.isDirectory()) {
          return cb(new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`));
        }
      }
      if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
        return cb(new Error(errMsg(src, dest, funcName)));
      }
      return cb(null, { srcStat, destStat });
    });
  };
  var checkPathsSync = function(src, dest, funcName, opts) {
    const { srcStat, destStat } = getStatsSync(src, dest, opts);
    if (destStat) {
      if (areIdentical(srcStat, destStat)) {
        const srcBaseName = path.basename(src);
        const destBaseName = path.basename(dest);
        if (funcName === "move" && srcBaseName !== destBaseName && srcBaseName.toLowerCase() === destBaseName.toLowerCase()) {
          return { srcStat, destStat, isChangingCase: true };
        }
        throw new Error("Source and destination must not be the same.");
      }
      if (srcStat.isDirectory() && !destStat.isDirectory()) {
        throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`);
      }
      if (!srcStat.isDirectory() && destStat.isDirectory()) {
        throw new Error(`Cannot overwrite directory '${dest}' with non-directory '${src}'.`);
      }
    }
    if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
      throw new Error(errMsg(src, dest, funcName));
    }
    return { srcStat, destStat };
  };
  var checkParentPaths = function(src, srcStat, dest, funcName, cb) {
    const srcParent = path.resolve(path.dirname(src));
    const destParent = path.resolve(path.dirname(dest));
    if (destParent === srcParent || destParent === path.parse(destParent).root)
      return cb();
    fs.stat(destParent, { bigint: true }, (err, destStat) => {
      if (err) {
        if (err.code === "ENOENT")
          return cb();
        return cb(err);
      }
      if (areIdentical(srcStat, destStat)) {
        return cb(new Error(errMsg(src, dest, funcName)));
      }
      return checkParentPaths(src, srcStat, destParent, funcName, cb);
    });
  };
  var checkParentPathsSync = function(src, srcStat, dest, funcName) {
    const srcParent = path.resolve(path.dirname(src));
    const destParent = path.resolve(path.dirname(dest));
    if (destParent === srcParent || destParent === path.parse(destParent).root)
      return;
    let destStat;
    try {
      destStat = fs.statSync(destParent, { bigint: true });
    } catch (err) {
      if (err.code === "ENOENT")
        return;
      throw err;
    }
    if (areIdentical(srcStat, destStat)) {
      throw new Error(errMsg(src, dest, funcName));
    }
    return checkParentPathsSync(src, srcStat, destParent, funcName);
  };
  var areIdentical = function(srcStat, destStat) {
    return destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev;
  };
  var isSrcSubdir = function(src, dest) {
    const srcArr = path.resolve(src).split(path.sep).filter((i) => i);
    const destArr = path.resolve(dest).split(path.sep).filter((i) => i);
    return srcArr.reduce((acc, cur, i) => acc && destArr[i] === cur, true);
  };
  var errMsg = function(src, dest, funcName) {
    return `Cannot ${funcName} '${src}' to a subdirectory of itself, '${dest}'.`;
  };
  var fs = require_fs();
  var path = import.meta.require("path");
  var util = import.meta.require("util");
  module.exports = {
    checkPaths,
    checkPathsSync,
    checkParentPaths,
    checkParentPathsSync,
    isSrcSubdir,
    areIdentical
  };
});

// node_modules/fs-extra/lib/copy/copy.js
var require_copy = __commonJS((exports, module) => {
  var copy = function(src, dest, opts, cb) {
    if (typeof opts === "function" && !cb) {
      cb = opts;
      opts = {};
    } else if (typeof opts === "function") {
      opts = { filter: opts };
    }
    cb = cb || function() {
    };
    opts = opts || {};
    opts.clobber = ("clobber" in opts) ? !!opts.clobber : true;
    opts.overwrite = ("overwrite" in opts) ? !!opts.overwrite : opts.clobber;
    if (opts.preserveTimestamps && process.arch === "ia32") {
      process.emitWarning("Using the preserveTimestamps option in 32-bit node is not recommended;\n\n\tsee https://github.com/jprichardson/node-fs-extra/issues/269", "Warning", "fs-extra-WARN0001");
    }
    stat.checkPaths(src, dest, "copy", opts, (err, stats) => {
      if (err)
        return cb(err);
      const { srcStat, destStat } = stats;
      stat.checkParentPaths(src, srcStat, dest, "copy", (err2) => {
        if (err2)
          return cb(err2);
        runFilter(src, dest, opts, (err3, include) => {
          if (err3)
            return cb(err3);
          if (!include)
            return cb();
          checkParentDir(destStat, src, dest, opts, cb);
        });
      });
    });
  };
  var checkParentDir = function(destStat, src, dest, opts, cb) {
    const destParent = path.dirname(dest);
    pathExists(destParent, (err, dirExists) => {
      if (err)
        return cb(err);
      if (dirExists)
        return getStats(destStat, src, dest, opts, cb);
      mkdirs(destParent, (err2) => {
        if (err2)
          return cb(err2);
        return getStats(destStat, src, dest, opts, cb);
      });
    });
  };
  var runFilter = function(src, dest, opts, cb) {
    if (!opts.filter)
      return cb(null, true);
    Promise.resolve(opts.filter(src, dest)).then((include) => cb(null, include), (error2) => cb(error2));
  };
  var getStats = function(destStat, src, dest, opts, cb) {
    const stat2 = opts.dereference ? fs.stat : fs.lstat;
    stat2(src, (err, srcStat) => {
      if (err)
        return cb(err);
      if (srcStat.isDirectory())
        return onDir(srcStat, destStat, src, dest, opts, cb);
      else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice())
        return onFile(srcStat, destStat, src, dest, opts, cb);
      else if (srcStat.isSymbolicLink())
        return onLink(destStat, src, dest, opts, cb);
      else if (srcStat.isSocket())
        return cb(new Error(`Cannot copy a socket file: ${src}`));
      else if (srcStat.isFIFO())
        return cb(new Error(`Cannot copy a FIFO pipe: ${src}`));
      return cb(new Error(`Unknown file: ${src}`));
    });
  };
  var onFile = function(srcStat, destStat, src, dest, opts, cb) {
    if (!destStat)
      return copyFile(srcStat, src, dest, opts, cb);
    return mayCopyFile(srcStat, src, dest, opts, cb);
  };
  var mayCopyFile = function(srcStat, src, dest, opts, cb) {
    if (opts.overwrite) {
      fs.unlink(dest, (err) => {
        if (err)
          return cb(err);
        return copyFile(srcStat, src, dest, opts, cb);
      });
    } else if (opts.errorOnExist) {
      return cb(new Error(`'${dest}' already exists`));
    } else
      return cb();
  };
  var copyFile = function(srcStat, src, dest, opts, cb) {
    fs.copyFile(src, dest, (err) => {
      if (err)
        return cb(err);
      if (opts.preserveTimestamps)
        return handleTimestampsAndMode(srcStat.mode, src, dest, cb);
      return setDestMode(dest, srcStat.mode, cb);
    });
  };
  var handleTimestampsAndMode = function(srcMode, src, dest, cb) {
    if (fileIsNotWritable(srcMode)) {
      return makeFileWritable(dest, srcMode, (err) => {
        if (err)
          return cb(err);
        return setDestTimestampsAndMode(srcMode, src, dest, cb);
      });
    }
    return setDestTimestampsAndMode(srcMode, src, dest, cb);
  };
  var fileIsNotWritable = function(srcMode) {
    return (srcMode & 128) === 0;
  };
  var makeFileWritable = function(dest, srcMode, cb) {
    return setDestMode(dest, srcMode | 128, cb);
  };
  var setDestTimestampsAndMode = function(srcMode, src, dest, cb) {
    setDestTimestamps(src, dest, (err) => {
      if (err)
        return cb(err);
      return setDestMode(dest, srcMode, cb);
    });
  };
  var setDestMode = function(dest, srcMode, cb) {
    return fs.chmod(dest, srcMode, cb);
  };
  var setDestTimestamps = function(src, dest, cb) {
    fs.stat(src, (err, updatedSrcStat) => {
      if (err)
        return cb(err);
      return utimesMillis(dest, updatedSrcStat.atime, updatedSrcStat.mtime, cb);
    });
  };
  var onDir = function(srcStat, destStat, src, dest, opts, cb) {
    if (!destStat)
      return mkDirAndCopy(srcStat.mode, src, dest, opts, cb);
    return copyDir(src, dest, opts, cb);
  };
  var mkDirAndCopy = function(srcMode, src, dest, opts, cb) {
    fs.mkdir(dest, (err) => {
      if (err)
        return cb(err);
      copyDir(src, dest, opts, (err2) => {
        if (err2)
          return cb(err2);
        return setDestMode(dest, srcMode, cb);
      });
    });
  };
  var copyDir = function(src, dest, opts, cb) {
    fs.readdir(src, (err, items) => {
      if (err)
        return cb(err);
      return copyDirItems(items, src, dest, opts, cb);
    });
  };
  var copyDirItems = function(items, src, dest, opts, cb) {
    const item = items.pop();
    if (!item)
      return cb();
    return copyDirItem(items, item, src, dest, opts, cb);
  };
  var copyDirItem = function(items, item, src, dest, opts, cb) {
    const srcItem = path.join(src, item);
    const destItem = path.join(dest, item);
    runFilter(srcItem, destItem, opts, (err, include) => {
      if (err)
        return cb(err);
      if (!include)
        return copyDirItems(items, src, dest, opts, cb);
      stat.checkPaths(srcItem, destItem, "copy", opts, (err2, stats) => {
        if (err2)
          return cb(err2);
        const { destStat } = stats;
        getStats(destStat, srcItem, destItem, opts, (err3) => {
          if (err3)
            return cb(err3);
          return copyDirItems(items, src, dest, opts, cb);
        });
      });
    });
  };
  var onLink = function(destStat, src, dest, opts, cb) {
    fs.readlink(src, (err, resolvedSrc) => {
      if (err)
        return cb(err);
      if (opts.dereference) {
        resolvedSrc = path.resolve(process.cwd(), resolvedSrc);
      }
      if (!destStat) {
        return fs.symlink(resolvedSrc, dest, cb);
      } else {
        fs.readlink(dest, (err2, resolvedDest) => {
          if (err2) {
            if (err2.code === "EINVAL" || err2.code === "UNKNOWN")
              return fs.symlink(resolvedSrc, dest, cb);
            return cb(err2);
          }
          if (opts.dereference) {
            resolvedDest = path.resolve(process.cwd(), resolvedDest);
          }
          if (stat.isSrcSubdir(resolvedSrc, resolvedDest)) {
            return cb(new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`));
          }
          if (stat.isSrcSubdir(resolvedDest, resolvedSrc)) {
            return cb(new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`));
          }
          return copyLink(resolvedSrc, dest, cb);
        });
      }
    });
  };
  var copyLink = function(resolvedSrc, dest, cb) {
    fs.unlink(dest, (err) => {
      if (err)
        return cb(err);
      return fs.symlink(resolvedSrc, dest, cb);
    });
  };
  var fs = require_graceful_fs();
  var path = import.meta.require("path");
  var mkdirs = require_mkdirs().mkdirs;
  var pathExists = require_path_exists().pathExists;
  var utimesMillis = require_utimes().utimesMillis;
  var stat = require_stat();
  module.exports = copy;
});

// node_modules/fs-extra/lib/copy/copy-sync.js
var require_copy_sync = __commonJS((exports, module) => {
  var copySync = function(src, dest, opts) {
    if (typeof opts === "function") {
      opts = { filter: opts };
    }
    opts = opts || {};
    opts.clobber = ("clobber" in opts) ? !!opts.clobber : true;
    opts.overwrite = ("overwrite" in opts) ? !!opts.overwrite : opts.clobber;
    if (opts.preserveTimestamps && process.arch === "ia32") {
      process.emitWarning("Using the preserveTimestamps option in 32-bit node is not recommended;\n\n\tsee https://github.com/jprichardson/node-fs-extra/issues/269", "Warning", "fs-extra-WARN0002");
    }
    const { srcStat, destStat } = stat.checkPathsSync(src, dest, "copy", opts);
    stat.checkParentPathsSync(src, srcStat, dest, "copy");
    if (opts.filter && !opts.filter(src, dest))
      return;
    const destParent = path.dirname(dest);
    if (!fs.existsSync(destParent))
      mkdirsSync(destParent);
    return getStats(destStat, src, dest, opts);
  };
  var getStats = function(destStat, src, dest, opts) {
    const statSync3 = opts.dereference ? fs.statSync : fs.lstatSync;
    const srcStat = statSync3(src);
    if (srcStat.isDirectory())
      return onDir(srcStat, destStat, src, dest, opts);
    else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice())
      return onFile(srcStat, destStat, src, dest, opts);
    else if (srcStat.isSymbolicLink())
      return onLink(destStat, src, dest, opts);
    else if (srcStat.isSocket())
      throw new Error(`Cannot copy a socket file: ${src}`);
    else if (srcStat.isFIFO())
      throw new Error(`Cannot copy a FIFO pipe: ${src}`);
    throw new Error(`Unknown file: ${src}`);
  };
  var onFile = function(srcStat, destStat, src, dest, opts) {
    if (!destStat)
      return copyFile(srcStat, src, dest, opts);
    return mayCopyFile(srcStat, src, dest, opts);
  };
  var mayCopyFile = function(srcStat, src, dest, opts) {
    if (opts.overwrite) {
      fs.unlinkSync(dest);
      return copyFile(srcStat, src, dest, opts);
    } else if (opts.errorOnExist) {
      throw new Error(`'${dest}' already exists`);
    }
  };
  var copyFile = function(srcStat, src, dest, opts) {
    fs.copyFileSync(src, dest);
    if (opts.preserveTimestamps)
      handleTimestamps(srcStat.mode, src, dest);
    return setDestMode(dest, srcStat.mode);
  };
  var handleTimestamps = function(srcMode, src, dest) {
    if (fileIsNotWritable(srcMode))
      makeFileWritable(dest, srcMode);
    return setDestTimestamps(src, dest);
  };
  var fileIsNotWritable = function(srcMode) {
    return (srcMode & 128) === 0;
  };
  var makeFileWritable = function(dest, srcMode) {
    return setDestMode(dest, srcMode | 128);
  };
  var setDestMode = function(dest, srcMode) {
    return fs.chmodSync(dest, srcMode);
  };
  var setDestTimestamps = function(src, dest) {
    const updatedSrcStat = fs.statSync(src);
    return utimesMillisSync(dest, updatedSrcStat.atime, updatedSrcStat.mtime);
  };
  var onDir = function(srcStat, destStat, src, dest, opts) {
    if (!destStat)
      return mkDirAndCopy(srcStat.mode, src, dest, opts);
    return copyDir(src, dest, opts);
  };
  var mkDirAndCopy = function(srcMode, src, dest, opts) {
    fs.mkdirSync(dest);
    copyDir(src, dest, opts);
    return setDestMode(dest, srcMode);
  };
  var copyDir = function(src, dest, opts) {
    fs.readdirSync(src).forEach((item) => copyDirItem(item, src, dest, opts));
  };
  var copyDirItem = function(item, src, dest, opts) {
    const srcItem = path.join(src, item);
    const destItem = path.join(dest, item);
    if (opts.filter && !opts.filter(srcItem, destItem))
      return;
    const { destStat } = stat.checkPathsSync(srcItem, destItem, "copy", opts);
    return getStats(destStat, srcItem, destItem, opts);
  };
  var onLink = function(destStat, src, dest, opts) {
    let resolvedSrc = fs.readlinkSync(src);
    if (opts.dereference) {
      resolvedSrc = path.resolve(process.cwd(), resolvedSrc);
    }
    if (!destStat) {
      return fs.symlinkSync(resolvedSrc, dest);
    } else {
      let resolvedDest;
      try {
        resolvedDest = fs.readlinkSync(dest);
      } catch (err) {
        if (err.code === "EINVAL" || err.code === "UNKNOWN")
          return fs.symlinkSync(resolvedSrc, dest);
        throw err;
      }
      if (opts.dereference) {
        resolvedDest = path.resolve(process.cwd(), resolvedDest);
      }
      if (stat.isSrcSubdir(resolvedSrc, resolvedDest)) {
        throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`);
      }
      if (stat.isSrcSubdir(resolvedDest, resolvedSrc)) {
        throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`);
      }
      return copyLink(resolvedSrc, dest);
    }
  };
  var copyLink = function(resolvedSrc, dest) {
    fs.unlinkSync(dest);
    return fs.symlinkSync(resolvedSrc, dest);
  };
  var fs = require_graceful_fs();
  var path = import.meta.require("path");
  var mkdirsSync = require_mkdirs().mkdirsSync;
  var utimesMillisSync = require_utimes().utimesMillisSync;
  var stat = require_stat();
  module.exports = copySync;
});

// node_modules/fs-extra/lib/copy/index.js
var require_copy2 = __commonJS((exports, module) => {
  var u = require_universalify().fromCallback;
  module.exports = {
    copy: u(require_copy()),
    copySync: require_copy_sync()
  };
});

// node_modules/fs-extra/lib/remove/index.js
var require_remove = __commonJS((exports, module) => {
  var remove = function(path, callback) {
    fs.rm(path, { recursive: true, force: true }, callback);
  };
  var removeSync = function(path) {
    fs.rmSync(path, { recursive: true, force: true });
  };
  var fs = require_graceful_fs();
  var u = require_universalify().fromCallback;
  module.exports = {
    remove: u(remove),
    removeSync
  };
});

// node_modules/fs-extra/lib/empty/index.js
var require_empty = __commonJS((exports, module) => {
  var emptyDirSync = function(dir) {
    let items;
    try {
      items = fs.readdirSync(dir);
    } catch {
      return mkdir.mkdirsSync(dir);
    }
    items.forEach((item) => {
      item = path.join(dir, item);
      remove.removeSync(item);
    });
  };
  var u = require_universalify().fromPromise;
  var fs = require_fs();
  var path = import.meta.require("path");
  var mkdir = require_mkdirs();
  var remove = require_remove();
  var emptyDir = u(async function emptyDir(dir) {
    let items;
    try {
      items = await fs.readdir(dir);
    } catch {
      return mkdir.mkdirs(dir);
    }
    return Promise.all(items.map((item) => remove.remove(path.join(dir, item))));
  });
  module.exports = {
    emptyDirSync,
    emptydirSync: emptyDirSync,
    emptyDir,
    emptydir: emptyDir
  };
});

// node_modules/fs-extra/lib/ensure/file.js
var require_file = __commonJS((exports, module) => {
  var createFile = function(file, callback) {
    function makeFile() {
      fs.writeFile(file, "", (err) => {
        if (err)
          return callback(err);
        callback();
      });
    }
    fs.stat(file, (err, stats) => {
      if (!err && stats.isFile())
        return callback();
      const dir = path.dirname(file);
      fs.stat(dir, (err2, stats2) => {
        if (err2) {
          if (err2.code === "ENOENT") {
            return mkdir.mkdirs(dir, (err3) => {
              if (err3)
                return callback(err3);
              makeFile();
            });
          }
          return callback(err2);
        }
        if (stats2.isDirectory())
          makeFile();
        else {
          fs.readdir(dir, (err3) => {
            if (err3)
              return callback(err3);
          });
        }
      });
    });
  };
  var createFileSync = function(file) {
    let stats;
    try {
      stats = fs.statSync(file);
    } catch {
    }
    if (stats && stats.isFile())
      return;
    const dir = path.dirname(file);
    try {
      if (!fs.statSync(dir).isDirectory()) {
        fs.readdirSync(dir);
      }
    } catch (err) {
      if (err && err.code === "ENOENT")
        mkdir.mkdirsSync(dir);
      else
        throw err;
    }
    fs.writeFileSync(file, "");
  };
  var u = require_universalify().fromCallback;
  var path = import.meta.require("path");
  var fs = require_graceful_fs();
  var mkdir = require_mkdirs();
  module.exports = {
    createFile: u(createFile),
    createFileSync
  };
});

// node_modules/fs-extra/lib/ensure/link.js
var require_link = __commonJS((exports, module) => {
  var createLink = function(srcpath, dstpath, callback) {
    function makeLink(srcpath2, dstpath2) {
      fs.link(srcpath2, dstpath2, (err) => {
        if (err)
          return callback(err);
        callback(null);
      });
    }
    fs.lstat(dstpath, (_, dstStat) => {
      fs.lstat(srcpath, (err, srcStat) => {
        if (err) {
          err.message = err.message.replace("lstat", "ensureLink");
          return callback(err);
        }
        if (dstStat && areIdentical(srcStat, dstStat))
          return callback(null);
        const dir = path.dirname(dstpath);
        pathExists(dir, (err2, dirExists) => {
          if (err2)
            return callback(err2);
          if (dirExists)
            return makeLink(srcpath, dstpath);
          mkdir.mkdirs(dir, (err3) => {
            if (err3)
              return callback(err3);
            makeLink(srcpath, dstpath);
          });
        });
      });
    });
  };
  var createLinkSync = function(srcpath, dstpath) {
    let dstStat;
    try {
      dstStat = fs.lstatSync(dstpath);
    } catch {
    }
    try {
      const srcStat = fs.lstatSync(srcpath);
      if (dstStat && areIdentical(srcStat, dstStat))
        return;
    } catch (err) {
      err.message = err.message.replace("lstat", "ensureLink");
      throw err;
    }
    const dir = path.dirname(dstpath);
    const dirExists = fs.existsSync(dir);
    if (dirExists)
      return fs.linkSync(srcpath, dstpath);
    mkdir.mkdirsSync(dir);
    return fs.linkSync(srcpath, dstpath);
  };
  var u = require_universalify().fromCallback;
  var path = import.meta.require("path");
  var fs = require_graceful_fs();
  var mkdir = require_mkdirs();
  var pathExists = require_path_exists().pathExists;
  var { areIdentical } = require_stat();
  module.exports = {
    createLink: u(createLink),
    createLinkSync
  };
});

// node_modules/fs-extra/lib/ensure/symlink-paths.js
var require_symlink_paths = __commonJS((exports, module) => {
  var symlinkPaths = function(srcpath, dstpath, callback) {
    if (path.isAbsolute(srcpath)) {
      return fs.lstat(srcpath, (err) => {
        if (err) {
          err.message = err.message.replace("lstat", "ensureSymlink");
          return callback(err);
        }
        return callback(null, {
          toCwd: srcpath,
          toDst: srcpath
        });
      });
    } else {
      const dstdir = path.dirname(dstpath);
      const relativeToDst = path.join(dstdir, srcpath);
      return pathExists(relativeToDst, (err, exists) => {
        if (err)
          return callback(err);
        if (exists) {
          return callback(null, {
            toCwd: relativeToDst,
            toDst: srcpath
          });
        } else {
          return fs.lstat(srcpath, (err2) => {
            if (err2) {
              err2.message = err2.message.replace("lstat", "ensureSymlink");
              return callback(err2);
            }
            return callback(null, {
              toCwd: srcpath,
              toDst: path.relative(dstdir, srcpath)
            });
          });
        }
      });
    }
  };
  var symlinkPathsSync = function(srcpath, dstpath) {
    let exists;
    if (path.isAbsolute(srcpath)) {
      exists = fs.existsSync(srcpath);
      if (!exists)
        throw new Error("absolute srcpath does not exist");
      return {
        toCwd: srcpath,
        toDst: srcpath
      };
    } else {
      const dstdir = path.dirname(dstpath);
      const relativeToDst = path.join(dstdir, srcpath);
      exists = fs.existsSync(relativeToDst);
      if (exists) {
        return {
          toCwd: relativeToDst,
          toDst: srcpath
        };
      } else {
        exists = fs.existsSync(srcpath);
        if (!exists)
          throw new Error("relative srcpath does not exist");
        return {
          toCwd: srcpath,
          toDst: path.relative(dstdir, srcpath)
        };
      }
    }
  };
  var path = import.meta.require("path");
  var fs = require_graceful_fs();
  var pathExists = require_path_exists().pathExists;
  module.exports = {
    symlinkPaths,
    symlinkPathsSync
  };
});

// node_modules/fs-extra/lib/ensure/symlink-type.js
var require_symlink_type = __commonJS((exports, module) => {
  var symlinkType = function(srcpath, type, callback) {
    callback = typeof type === "function" ? type : callback;
    type = typeof type === "function" ? false : type;
    if (type)
      return callback(null, type);
    fs.lstat(srcpath, (err, stats) => {
      if (err)
        return callback(null, "file");
      type = stats && stats.isDirectory() ? "dir" : "file";
      callback(null, type);
    });
  };
  var symlinkTypeSync = function(srcpath, type) {
    let stats;
    if (type)
      return type;
    try {
      stats = fs.lstatSync(srcpath);
    } catch {
      return "file";
    }
    return stats && stats.isDirectory() ? "dir" : "file";
  };
  var fs = require_graceful_fs();
  module.exports = {
    symlinkType,
    symlinkTypeSync
  };
});

// node_modules/fs-extra/lib/ensure/symlink.js
var require_symlink = __commonJS((exports, module) => {
  var createSymlink = function(srcpath, dstpath, type, callback) {
    callback = typeof type === "function" ? type : callback;
    type = typeof type === "function" ? false : type;
    fs.lstat(dstpath, (err, stats) => {
      if (!err && stats.isSymbolicLink()) {
        Promise.all([
          fs.stat(srcpath),
          fs.stat(dstpath)
        ]).then(([srcStat, dstStat]) => {
          if (areIdentical(srcStat, dstStat))
            return callback(null);
          _createSymlink(srcpath, dstpath, type, callback);
        });
      } else
        _createSymlink(srcpath, dstpath, type, callback);
    });
  };
  var _createSymlink = function(srcpath, dstpath, type, callback) {
    symlinkPaths(srcpath, dstpath, (err, relative2) => {
      if (err)
        return callback(err);
      srcpath = relative2.toDst;
      symlinkType(relative2.toCwd, type, (err2, type2) => {
        if (err2)
          return callback(err2);
        const dir = path.dirname(dstpath);
        pathExists(dir, (err3, dirExists) => {
          if (err3)
            return callback(err3);
          if (dirExists)
            return fs.symlink(srcpath, dstpath, type2, callback);
          mkdirs(dir, (err4) => {
            if (err4)
              return callback(err4);
            fs.symlink(srcpath, dstpath, type2, callback);
          });
        });
      });
    });
  };
  var createSymlinkSync = function(srcpath, dstpath, type) {
    let stats;
    try {
      stats = fs.lstatSync(dstpath);
    } catch {
    }
    if (stats && stats.isSymbolicLink()) {
      const srcStat = fs.statSync(srcpath);
      const dstStat = fs.statSync(dstpath);
      if (areIdentical(srcStat, dstStat))
        return;
    }
    const relative2 = symlinkPathsSync(srcpath, dstpath);
    srcpath = relative2.toDst;
    type = symlinkTypeSync(relative2.toCwd, type);
    const dir = path.dirname(dstpath);
    const exists = fs.existsSync(dir);
    if (exists)
      return fs.symlinkSync(srcpath, dstpath, type);
    mkdirsSync(dir);
    return fs.symlinkSync(srcpath, dstpath, type);
  };
  var u = require_universalify().fromCallback;
  var path = import.meta.require("path");
  var fs = require_fs();
  var _mkdirs = require_mkdirs();
  var mkdirs = _mkdirs.mkdirs;
  var mkdirsSync = _mkdirs.mkdirsSync;
  var _symlinkPaths = require_symlink_paths();
  var symlinkPaths = _symlinkPaths.symlinkPaths;
  var symlinkPathsSync = _symlinkPaths.symlinkPathsSync;
  var _symlinkType = require_symlink_type();
  var symlinkType = _symlinkType.symlinkType;
  var symlinkTypeSync = _symlinkType.symlinkTypeSync;
  var pathExists = require_path_exists().pathExists;
  var { areIdentical } = require_stat();
  module.exports = {
    createSymlink: u(createSymlink),
    createSymlinkSync
  };
});

// node_modules/fs-extra/lib/ensure/index.js
var require_ensure = __commonJS((exports, module) => {
  var { createFile, createFileSync } = require_file();
  var { createLink, createLinkSync } = require_link();
  var { createSymlink, createSymlinkSync } = require_symlink();
  module.exports = {
    createFile,
    createFileSync,
    ensureFile: createFile,
    ensureFileSync: createFileSync,
    createLink,
    createLinkSync,
    ensureLink: createLink,
    ensureLinkSync: createLinkSync,
    createSymlink,
    createSymlinkSync,
    ensureSymlink: createSymlink,
    ensureSymlinkSync: createSymlinkSync
  };
});

// node_modules/jsonfile/utils.js
var require_utils2 = __commonJS((exports, module) => {
  var stringify = function(obj, { EOL = "\n", finalEOL = true, replacer = null, spaces } = {}) {
    const EOF = finalEOL ? EOL : "";
    const str = JSON.stringify(obj, replacer, spaces);
    return str.replace(/\n/g, EOL) + EOF;
  };
  var stripBom = function(content) {
    if (Buffer.isBuffer(content))
      content = content.toString("utf8");
    return content.replace(/^\uFEFF/, "");
  };
  module.exports = { stringify, stripBom };
});

// node_modules/jsonfile/index.js
var require_jsonfile = __commonJS((exports, module) => {
  async function _readFile(file, options = {}) {
    if (typeof options === "string") {
      options = { encoding: options };
    }
    const fs = options.fs || _fs;
    const shouldThrow = "throws" in options ? options.throws : true;
    let data = await universalify.fromCallback(fs.readFile)(file, options);
    data = stripBom(data);
    let obj;
    try {
      obj = JSON.parse(data, options ? options.reviver : null);
    } catch (err) {
      if (shouldThrow) {
        err.message = `${file}: ${err.message}`;
        throw err;
      } else {
        return null;
      }
    }
    return obj;
  }
  var readFileSync4 = function(file, options = {}) {
    if (typeof options === "string") {
      options = { encoding: options };
    }
    const fs = options.fs || _fs;
    const shouldThrow = "throws" in options ? options.throws : true;
    try {
      let content = fs.readFileSync(file, options);
      content = stripBom(content);
      return JSON.parse(content, options.reviver);
    } catch (err) {
      if (shouldThrow) {
        err.message = `${file}: ${err.message}`;
        throw err;
      } else {
        return null;
      }
    }
  };
  async function _writeFile(file, obj, options = {}) {
    const fs = options.fs || _fs;
    const str = stringify(obj, options);
    await universalify.fromCallback(fs.writeFile)(file, str, options);
  }
  var writeFileSync = function(file, obj, options = {}) {
    const fs = options.fs || _fs;
    const str = stringify(obj, options);
    return fs.writeFileSync(file, str, options);
  };
  var _fs;
  try {
    _fs = require_graceful_fs();
  } catch (_) {
    _fs = import.meta.require("fs");
  }
  var universalify = require_universalify();
  var { stringify, stripBom } = require_utils2();
  var readFile = universalify.fromPromise(_readFile);
  var writeFile2 = universalify.fromPromise(_writeFile);
  var jsonfile = {
    readFile,
    readFileSync: readFileSync4,
    writeFile: writeFile2,
    writeFileSync
  };
  module.exports = jsonfile;
});

// node_modules/fs-extra/lib/json/jsonfile.js
var require_jsonfile2 = __commonJS((exports, module) => {
  var jsonFile = require_jsonfile();
  module.exports = {
    readJson: jsonFile.readFile,
    readJsonSync: jsonFile.readFileSync,
    writeJson: jsonFile.writeFile,
    writeJsonSync: jsonFile.writeFileSync
  };
});

// node_modules/fs-extra/lib/output-file/index.js
var require_output_file = __commonJS((exports, module) => {
  var outputFile = function(file, data, encoding, callback) {
    if (typeof encoding === "function") {
      callback = encoding;
      encoding = "utf8";
    }
    const dir = path.dirname(file);
    pathExists(dir, (err, itDoes) => {
      if (err)
        return callback(err);
      if (itDoes)
        return fs.writeFile(file, data, encoding, callback);
      mkdir.mkdirs(dir, (err2) => {
        if (err2)
          return callback(err2);
        fs.writeFile(file, data, encoding, callback);
      });
    });
  };
  var outputFileSync = function(file, ...args) {
    const dir = path.dirname(file);
    if (fs.existsSync(dir)) {
      return fs.writeFileSync(file, ...args);
    }
    mkdir.mkdirsSync(dir);
    fs.writeFileSync(file, ...args);
  };
  var u = require_universalify().fromCallback;
  var fs = require_graceful_fs();
  var path = import.meta.require("path");
  var mkdir = require_mkdirs();
  var pathExists = require_path_exists().pathExists;
  module.exports = {
    outputFile: u(outputFile),
    outputFileSync
  };
});

// node_modules/fs-extra/lib/json/output-json.js
var require_output_json = __commonJS((exports, module) => {
  async function outputJson(file, data, options = {}) {
    const str = stringify(data, options);
    await outputFile(file, str, options);
  }
  var { stringify } = require_utils2();
  var { outputFile } = require_output_file();
  module.exports = outputJson;
});

// node_modules/fs-extra/lib/json/output-json-sync.js
var require_output_json_sync = __commonJS((exports, module) => {
  var outputJsonSync = function(file, data, options) {
    const str = stringify(data, options);
    outputFileSync(file, str, options);
  };
  var { stringify } = require_utils2();
  var { outputFileSync } = require_output_file();
  module.exports = outputJsonSync;
});

// node_modules/fs-extra/lib/json/index.js
var require_json = __commonJS((exports, module) => {
  var u = require_universalify().fromPromise;
  var jsonFile = require_jsonfile2();
  jsonFile.outputJson = u(require_output_json());
  jsonFile.outputJsonSync = require_output_json_sync();
  jsonFile.outputJSON = jsonFile.outputJson;
  jsonFile.outputJSONSync = jsonFile.outputJsonSync;
  jsonFile.writeJSON = jsonFile.writeJson;
  jsonFile.writeJSONSync = jsonFile.writeJsonSync;
  jsonFile.readJSON = jsonFile.readJson;
  jsonFile.readJSONSync = jsonFile.readJsonSync;
  module.exports = jsonFile;
});

// node_modules/fs-extra/lib/move/move.js
var require_move = __commonJS((exports, module) => {
  var move = function(src, dest, opts, cb) {
    if (typeof opts === "function") {
      cb = opts;
      opts = {};
    }
    opts = opts || {};
    const overwrite = opts.overwrite || opts.clobber || false;
    stat.checkPaths(src, dest, "move", opts, (err, stats) => {
      if (err)
        return cb(err);
      const { srcStat, isChangingCase = false } = stats;
      stat.checkParentPaths(src, srcStat, dest, "move", (err2) => {
        if (err2)
          return cb(err2);
        if (isParentRoot(dest))
          return doRename(src, dest, overwrite, isChangingCase, cb);
        mkdirp(path.dirname(dest), (err3) => {
          if (err3)
            return cb(err3);
          return doRename(src, dest, overwrite, isChangingCase, cb);
        });
      });
    });
  };
  var isParentRoot = function(dest) {
    const parent = path.dirname(dest);
    const parsedPath = path.parse(parent);
    return parsedPath.root === parent;
  };
  var doRename = function(src, dest, overwrite, isChangingCase, cb) {
    if (isChangingCase)
      return rename(src, dest, overwrite, cb);
    if (overwrite) {
      return remove(dest, (err) => {
        if (err)
          return cb(err);
        return rename(src, dest, overwrite, cb);
      });
    }
    pathExists(dest, (err, destExists) => {
      if (err)
        return cb(err);
      if (destExists)
        return cb(new Error("dest already exists."));
      return rename(src, dest, overwrite, cb);
    });
  };
  var rename = function(src, dest, overwrite, cb) {
    fs.rename(src, dest, (err) => {
      if (!err)
        return cb();
      if (err.code !== "EXDEV")
        return cb(err);
      return moveAcrossDevice(src, dest, overwrite, cb);
    });
  };
  var moveAcrossDevice = function(src, dest, overwrite, cb) {
    const opts = {
      overwrite,
      errorOnExist: true,
      preserveTimestamps: true
    };
    copy(src, dest, opts, (err) => {
      if (err)
        return cb(err);
      return remove(src, cb);
    });
  };
  var fs = require_graceful_fs();
  var path = import.meta.require("path");
  var copy = require_copy2().copy;
  var remove = require_remove().remove;
  var mkdirp = require_mkdirs().mkdirp;
  var pathExists = require_path_exists().pathExists;
  var stat = require_stat();
  module.exports = move;
});

// node_modules/fs-extra/lib/move/move-sync.js
var require_move_sync = __commonJS((exports, module) => {
  var moveSync = function(src, dest, opts) {
    opts = opts || {};
    const overwrite = opts.overwrite || opts.clobber || false;
    const { srcStat, isChangingCase = false } = stat.checkPathsSync(src, dest, "move", opts);
    stat.checkParentPathsSync(src, srcStat, dest, "move");
    if (!isParentRoot(dest))
      mkdirpSync(path.dirname(dest));
    return doRename(src, dest, overwrite, isChangingCase);
  };
  var isParentRoot = function(dest) {
    const parent = path.dirname(dest);
    const parsedPath = path.parse(parent);
    return parsedPath.root === parent;
  };
  var doRename = function(src, dest, overwrite, isChangingCase) {
    if (isChangingCase)
      return rename(src, dest, overwrite);
    if (overwrite) {
      removeSync(dest);
      return rename(src, dest, overwrite);
    }
    if (fs.existsSync(dest))
      throw new Error("dest already exists.");
    return rename(src, dest, overwrite);
  };
  var rename = function(src, dest, overwrite) {
    try {
      fs.renameSync(src, dest);
    } catch (err) {
      if (err.code !== "EXDEV")
        throw err;
      return moveAcrossDevice(src, dest, overwrite);
    }
  };
  var moveAcrossDevice = function(src, dest, overwrite) {
    const opts = {
      overwrite,
      errorOnExist: true,
      preserveTimestamps: true
    };
    copySync(src, dest, opts);
    return removeSync(src);
  };
  var fs = require_graceful_fs();
  var path = import.meta.require("path");
  var copySync = require_copy2().copySync;
  var removeSync = require_remove().removeSync;
  var mkdirpSync = require_mkdirs().mkdirpSync;
  var stat = require_stat();
  module.exports = moveSync;
});

// node_modules/fs-extra/lib/move/index.js
var require_move2 = __commonJS((exports, module) => {
  var u = require_universalify().fromCallback;
  module.exports = {
    move: u(require_move()),
    moveSync: require_move_sync()
  };
});

// node_modules/fs-extra/lib/index.js
var require_lib = __commonJS((exports, module) => {
  module.exports = {
    ...require_fs(),
    ...require_copy2(),
    ...require_empty(),
    ...require_ensure(),
    ...require_json(),
    ...require_mkdirs(),
    ...require_move2(),
    ...require_output_file(),
    ...require_path_exists(),
    ...require_remove()
  };
});

// node_modules/fast-glob/out/utils/array.js
var require_array = __commonJS((exports) => {
  var flatten = function(items) {
    return items.reduce((collection, item) => [].concat(collection, item), []);
  };
  var splitWhen = function(items, predicate) {
    const result = [[]];
    let groupIndex = 0;
    for (const item of items) {
      if (predicate(item)) {
        groupIndex++;
        result[groupIndex] = [];
      } else {
        result[groupIndex].push(item);
      }
    }
    return result;
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.splitWhen = exports.flatten = undefined;
  exports.flatten = flatten;
  exports.splitWhen = splitWhen;
});

// node_modules/fast-glob/out/utils/errno.js
var require_errno = __commonJS((exports) => {
  var isEnoentCodeError = function(error2) {
    return error2.code === "ENOENT";
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.isEnoentCodeError = undefined;
  exports.isEnoentCodeError = isEnoentCodeError;
});

// node_modules/fast-glob/out/utils/fs.js
var require_fs2 = __commonJS((exports) => {
  var createDirentFromStats = function(name, stats) {
    return new DirentFromStats(name, stats);
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.createDirentFromStats = undefined;

  class DirentFromStats {
    constructor(name, stats) {
      this.name = name;
      this.isBlockDevice = stats.isBlockDevice.bind(stats);
      this.isCharacterDevice = stats.isCharacterDevice.bind(stats);
      this.isDirectory = stats.isDirectory.bind(stats);
      this.isFIFO = stats.isFIFO.bind(stats);
      this.isFile = stats.isFile.bind(stats);
      this.isSocket = stats.isSocket.bind(stats);
      this.isSymbolicLink = stats.isSymbolicLink.bind(stats);
    }
  }
  exports.createDirentFromStats = createDirentFromStats;
});

// node_modules/fast-glob/out/utils/path.js
var require_path = __commonJS((exports) => {
  var unixify = function(filepath) {
    return filepath.replace(/\\/g, "/");
  };
  var makeAbsolute = function(cwd, filepath) {
    return path.resolve(cwd, filepath);
  };
  var removeLeadingDotSegment = function(entry) {
    if (entry.charAt(0) === ".") {
      const secondCharactery = entry.charAt(1);
      if (secondCharactery === "/" || secondCharactery === "\\") {
        return entry.slice(LEADING_DOT_SEGMENT_CHARACTERS_COUNT);
      }
    }
    return entry;
  };
  var escapeWindowsPath = function(pattern) {
    return pattern.replace(WINDOWS_UNESCAPED_GLOB_SYMBOLS_RE, "\\$2");
  };
  var escapePosixPath = function(pattern) {
    return pattern.replace(POSIX_UNESCAPED_GLOB_SYMBOLS_RE, "\\$2");
  };
  var convertWindowsPathToPattern = function(filepath) {
    return escapeWindowsPath(filepath).replace(DOS_DEVICE_PATH_RE, "//$1").replace(WINDOWS_BACKSLASHES_RE, "/");
  };
  var convertPosixPathToPattern = function(filepath) {
    return escapePosixPath(filepath);
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.convertPosixPathToPattern = exports.convertWindowsPathToPattern = exports.convertPathToPattern = exports.escapePosixPath = exports.escapeWindowsPath = exports.escape = exports.removeLeadingDotSegment = exports.makeAbsolute = exports.unixify = undefined;
  var os = import.meta.require("os");
  var path = import.meta.require("path");
  var IS_WINDOWS_PLATFORM = os.platform() === "win32";
  var LEADING_DOT_SEGMENT_CHARACTERS_COUNT = 2;
  var POSIX_UNESCAPED_GLOB_SYMBOLS_RE = /(\\?)([()*?[\]{|}]|^!|[!+@](?=\()|\\(?![!()*+?@[\]{|}]))/g;
  var WINDOWS_UNESCAPED_GLOB_SYMBOLS_RE = /(\\?)([(){}]|^!|[!+@](?=\())/g;
  var DOS_DEVICE_PATH_RE = /^\\\\([.?])/;
  var WINDOWS_BACKSLASHES_RE = /\\(?![!()+@{}])/g;
  exports.unixify = unixify;
  exports.makeAbsolute = makeAbsolute;
  exports.removeLeadingDotSegment = removeLeadingDotSegment;
  exports.escape = IS_WINDOWS_PLATFORM ? escapeWindowsPath : escapePosixPath;
  exports.escapeWindowsPath = escapeWindowsPath;
  exports.escapePosixPath = escapePosixPath;
  exports.convertPathToPattern = IS_WINDOWS_PLATFORM ? convertWindowsPathToPattern : convertPosixPathToPattern;
  exports.convertWindowsPathToPattern = convertWindowsPathToPattern;
  exports.convertPosixPathToPattern = convertPosixPathToPattern;
});

// node_modules/is-extglob/index.js
var require_is_extglob = __commonJS((exports, module) => {
  /*!
   * is-extglob <https://github.com/jonschlinkert/is-extglob>
   *
   * Copyright (c) 2014-2016, Jon Schlinkert.
   * Licensed under the MIT License.
   */
  module.exports = function isExtglob(str) {
    if (typeof str !== "string" || str === "") {
      return false;
    }
    var match;
    while (match = /(\\).|([@?!+*]\(.*\))/g.exec(str)) {
      if (match[2])
        return true;
      str = str.slice(match.index + match[0].length);
    }
    return false;
  };
});

// node_modules/is-glob/index.js
var require_is_glob = __commonJS((exports, module) => {
  /*!
   * is-glob <https://github.com/jonschlinkert/is-glob>
   *
   * Copyright (c) 2014-2017, Jon Schlinkert.
   * Released under the MIT License.
   */
  var isExtglob = require_is_extglob();
  var chars = { "{": "}", "(": ")", "[": "]" };
  var strictCheck = function(str) {
    if (str[0] === "!") {
      return true;
    }
    var index = 0;
    var pipeIndex = -2;
    var closeSquareIndex = -2;
    var closeCurlyIndex = -2;
    var closeParenIndex = -2;
    var backSlashIndex = -2;
    while (index < str.length) {
      if (str[index] === "*") {
        return true;
      }
      if (str[index + 1] === "?" && /[\].+)]/.test(str[index])) {
        return true;
      }
      if (closeSquareIndex !== -1 && str[index] === "[" && str[index + 1] !== "]") {
        if (closeSquareIndex < index) {
          closeSquareIndex = str.indexOf("]", index);
        }
        if (closeSquareIndex > index) {
          if (backSlashIndex === -1 || backSlashIndex > closeSquareIndex) {
            return true;
          }
          backSlashIndex = str.indexOf("\\", index);
          if (backSlashIndex === -1 || backSlashIndex > closeSquareIndex) {
            return true;
          }
        }
      }
      if (closeCurlyIndex !== -1 && str[index] === "{" && str[index + 1] !== "}") {
        closeCurlyIndex = str.indexOf("}", index);
        if (closeCurlyIndex > index) {
          backSlashIndex = str.indexOf("\\", index);
          if (backSlashIndex === -1 || backSlashIndex > closeCurlyIndex) {
            return true;
          }
        }
      }
      if (closeParenIndex !== -1 && str[index] === "(" && str[index + 1] === "?" && /[:!=]/.test(str[index + 2]) && str[index + 3] !== ")") {
        closeParenIndex = str.indexOf(")", index);
        if (closeParenIndex > index) {
          backSlashIndex = str.indexOf("\\", index);
          if (backSlashIndex === -1 || backSlashIndex > closeParenIndex) {
            return true;
          }
        }
      }
      if (pipeIndex !== -1 && str[index] === "(" && str[index + 1] !== "|") {
        if (pipeIndex < index) {
          pipeIndex = str.indexOf("|", index);
        }
        if (pipeIndex !== -1 && str[pipeIndex + 1] !== ")") {
          closeParenIndex = str.indexOf(")", pipeIndex);
          if (closeParenIndex > pipeIndex) {
            backSlashIndex = str.indexOf("\\", pipeIndex);
            if (backSlashIndex === -1 || backSlashIndex > closeParenIndex) {
              return true;
            }
          }
        }
      }
      if (str[index] === "\\") {
        var open = str[index + 1];
        index += 2;
        var close = chars[open];
        if (close) {
          var n = str.indexOf(close, index);
          if (n !== -1) {
            index = n + 1;
          }
        }
        if (str[index] === "!") {
          return true;
        }
      } else {
        index++;
      }
    }
    return false;
  };
  var relaxedCheck = function(str) {
    if (str[0] === "!") {
      return true;
    }
    var index = 0;
    while (index < str.length) {
      if (/[*?{}()[\]]/.test(str[index])) {
        return true;
      }
      if (str[index] === "\\") {
        var open = str[index + 1];
        index += 2;
        var close = chars[open];
        if (close) {
          var n = str.indexOf(close, index);
          if (n !== -1) {
            index = n + 1;
          }
        }
        if (str[index] === "!") {
          return true;
        }
      } else {
        index++;
      }
    }
    return false;
  };
  module.exports = function isGlob(str, options) {
    if (typeof str !== "string" || str === "") {
      return false;
    }
    if (isExtglob(str)) {
      return true;
    }
    var check = strictCheck;
    if (options && options.strict === false) {
      check = relaxedCheck;
    }
    return check(str);
  };
});

// node_modules/glob-parent/index.js
var require_glob_parent = __commonJS((exports, module) => {
  var isGlob = require_is_glob();
  var pathPosixDirname = import.meta.require("path").posix.dirname;
  var isWin32 = import.meta.require("os").platform() === "win32";
  var slash = "/";
  var backslash = /\\/g;
  var enclosure = /[\{\[].*[\}\]]$/;
  var globby = /(^|[^\\])([\{\[]|\([^\)]+$)/;
  var escaped = /\\([\!\*\?\|\[\]\(\)\{\}])/g;
  module.exports = function globParent(str, opts) {
    var options = Object.assign({ flipBackslashes: true }, opts);
    if (options.flipBackslashes && isWin32 && str.indexOf(slash) < 0) {
      str = str.replace(backslash, slash);
    }
    if (enclosure.test(str)) {
      str += slash;
    }
    str += "a";
    do {
      str = pathPosixDirname(str);
    } while (isGlob(str) || globby.test(str));
    return str.replace(escaped, "$1");
  };
});

// node_modules/braces/lib/utils.js
var require_utils3 = __commonJS((exports) => {
  exports.isInteger = (num) => {
    if (typeof num === "number") {
      return Number.isInteger(num);
    }
    if (typeof num === "string" && num.trim() !== "") {
      return Number.isInteger(Number(num));
    }
    return false;
  };
  exports.find = (node2, type) => node2.nodes.find((node3) => node3.type === type);
  exports.exceedsLimit = (min, max, step2 = 1, limit) => {
    if (limit === false)
      return false;
    if (!exports.isInteger(min) || !exports.isInteger(max))
      return false;
    return (Number(max) - Number(min)) / Number(step2) >= limit;
  };
  exports.escapeNode = (block, n = 0, type) => {
    let node2 = block.nodes[n];
    if (!node2)
      return;
    if (type && node2.type === type || node2.type === "open" || node2.type === "close") {
      if (node2.escaped !== true) {
        node2.value = "\\" + node2.value;
        node2.escaped = true;
      }
    }
  };
  exports.encloseBrace = (node2) => {
    if (node2.type !== "brace")
      return false;
    if (node2.commas >> 0 + node2.ranges >> 0 === 0) {
      node2.invalid = true;
      return true;
    }
    return false;
  };
  exports.isInvalidBrace = (block) => {
    if (block.type !== "brace")
      return false;
    if (block.invalid === true || block.dollar)
      return true;
    if (block.commas >> 0 + block.ranges >> 0 === 0) {
      block.invalid = true;
      return true;
    }
    if (block.open !== true || block.close !== true) {
      block.invalid = true;
      return true;
    }
    return false;
  };
  exports.isOpenOrClose = (node2) => {
    if (node2.type === "open" || node2.type === "close") {
      return true;
    }
    return node2.open === true || node2.close === true;
  };
  exports.reduce = (nodes) => nodes.reduce((acc, node2) => {
    if (node2.type === "text")
      acc.push(node2.value);
    if (node2.type === "range")
      node2.type = "text";
    return acc;
  }, []);
  exports.flatten = (...args) => {
    const result = [];
    const flat = (arr) => {
      for (let i = 0;i < arr.length; i++) {
        let ele = arr[i];
        Array.isArray(ele) ? flat(ele, result) : ele !== undefined && result.push(ele);
      }
      return result;
    };
    flat(args);
    return result;
  };
});

// node_modules/braces/lib/stringify.js
var require_stringify = __commonJS((exports, module) => {
  var utils = require_utils3();
  module.exports = (ast, options = {}) => {
    let stringify = (node2, parent = {}) => {
      let invalidBlock = options.escapeInvalid && utils.isInvalidBrace(parent);
      let invalidNode = node2.invalid === true && options.escapeInvalid === true;
      let output = "";
      if (node2.value) {
        if ((invalidBlock || invalidNode) && utils.isOpenOrClose(node2)) {
          return "\\" + node2.value;
        }
        return node2.value;
      }
      if (node2.value) {
        return node2.value;
      }
      if (node2.nodes) {
        for (let child of node2.nodes) {
          output += stringify(child);
        }
      }
      return output;
    };
    return stringify(ast);
  };
});

// node_modules/is-number/index.js
var require_is_number = __commonJS((exports, module) => {
  /*!
   * is-number <https://github.com/jonschlinkert/is-number>
   *
   * Copyright (c) 2014-present, Jon Schlinkert.
   * Released under the MIT License.
   */
  module.exports = function(num) {
    if (typeof num === "number") {
      return num - num === 0;
    }
    if (typeof num === "string" && num.trim() !== "") {
      return Number.isFinite ? Number.isFinite(+num) : isFinite(+num);
    }
    return false;
  };
});

// node_modules/to-regex-range/index.js
var require_to_regex_range = __commonJS((exports, module) => {
  var collatePatterns = function(neg, pos, options) {
    let onlyNegative = filterPatterns(neg, pos, "-", false, options) || [];
    let onlyPositive = filterPatterns(pos, neg, "", false, options) || [];
    let intersected = filterPatterns(neg, pos, "-?", true, options) || [];
    let subpatterns = onlyNegative.concat(intersected).concat(onlyPositive);
    return subpatterns.join("|");
  };
  var splitToRanges = function(min, max) {
    let nines = 1;
    let zeros = 1;
    let stop = countNines(min, nines);
    let stops = new Set([max]);
    while (min <= stop && stop <= max) {
      stops.add(stop);
      nines += 1;
      stop = countNines(min, nines);
    }
    stop = countZeros(max + 1, zeros) - 1;
    while (min < stop && stop <= max) {
      stops.add(stop);
      zeros += 1;
      stop = countZeros(max + 1, zeros) - 1;
    }
    stops = [...stops];
    stops.sort(compare);
    return stops;
  };
  var rangeToPattern = function(start, stop, options) {
    if (start === stop) {
      return { pattern: start, count: [], digits: 0 };
    }
    let zipped = zip(start, stop);
    let digits = zipped.length;
    let pattern = "";
    let count = 0;
    for (let i = 0;i < digits; i++) {
      let [startDigit, stopDigit] = zipped[i];
      if (startDigit === stopDigit) {
        pattern += startDigit;
      } else if (startDigit !== "0" || stopDigit !== "9") {
        pattern += toCharacterClass(startDigit, stopDigit, options);
      } else {
        count++;
      }
    }
    if (count) {
      pattern += options.shorthand === true ? "\\d" : "[0-9]";
    }
    return { pattern, count: [count], digits };
  };
  var splitToPatterns = function(min, max, tok, options) {
    let ranges = splitToRanges(min, max);
    let tokens = [];
    let start = min;
    let prev;
    for (let i = 0;i < ranges.length; i++) {
      let max2 = ranges[i];
      let obj = rangeToPattern(String(start), String(max2), options);
      let zeros = "";
      if (!tok.isPadded && prev && prev.pattern === obj.pattern) {
        if (prev.count.length > 1) {
          prev.count.pop();
        }
        prev.count.push(obj.count[0]);
        prev.string = prev.pattern + toQuantifier(prev.count);
        start = max2 + 1;
        continue;
      }
      if (tok.isPadded) {
        zeros = padZeros(max2, tok, options);
      }
      obj.string = zeros + obj.pattern + toQuantifier(obj.count);
      tokens.push(obj);
      start = max2 + 1;
      prev = obj;
    }
    return tokens;
  };
  var filterPatterns = function(arr, comparison, prefix, intersection, options) {
    let result = [];
    for (let ele of arr) {
      let { string } = ele;
      if (!intersection && !contains(comparison, "string", string)) {
        result.push(prefix + string);
      }
      if (intersection && contains(comparison, "string", string)) {
        result.push(prefix + string);
      }
    }
    return result;
  };
  var zip = function(a, b) {
    let arr = [];
    for (let i = 0;i < a.length; i++)
      arr.push([a[i], b[i]]);
    return arr;
  };
  var compare = function(a, b) {
    return a > b ? 1 : b > a ? -1 : 0;
  };
  var contains = function(arr, key, val) {
    return arr.some((ele) => ele[key] === val);
  };
  var countNines = function(min, len) {
    return Number(String(min).slice(0, -len) + "9".repeat(len));
  };
  var countZeros = function(integer, zeros) {
    return integer - integer % Math.pow(10, zeros);
  };
  var toQuantifier = function(digits) {
    let [start = 0, stop = ""] = digits;
    if (stop || start > 1) {
      return `{${start + (stop ? "," + stop : "")}}`;
    }
    return "";
  };
  var toCharacterClass = function(a, b, options) {
    return `[${a}${b - a === 1 ? "" : "-"}${b}]`;
  };
  var hasPadding = function(str) {
    return /^-?(0+)\d/.test(str);
  };
  var padZeros = function(value, tok, options) {
    if (!tok.isPadded) {
      return value;
    }
    let diff = Math.abs(tok.maxLen - String(value).length);
    let relax = options.relaxZeros !== false;
    switch (diff) {
      case 0:
        return "";
      case 1:
        return relax ? "0?" : "0";
      case 2:
        return relax ? "0{0,2}" : "00";
      default: {
        return relax ? `0{0,${diff}}` : `0{${diff}}`;
      }
    }
  };
  /*!
   * to-regex-range <https://github.com/micromatch/to-regex-range>
   *
   * Copyright (c) 2015-present, Jon Schlinkert.
   * Released under the MIT License.
   */
  var isNumber = require_is_number();
  var toRegexRange = (min, max, options) => {
    if (isNumber(min) === false) {
      throw new TypeError("toRegexRange: expected the first argument to be a number");
    }
    if (max === undefined || min === max) {
      return String(min);
    }
    if (isNumber(max) === false) {
      throw new TypeError("toRegexRange: expected the second argument to be a number.");
    }
    let opts = { relaxZeros: true, ...options };
    if (typeof opts.strictZeros === "boolean") {
      opts.relaxZeros = opts.strictZeros === false;
    }
    let relax = String(opts.relaxZeros);
    let shorthand = String(opts.shorthand);
    let capture = String(opts.capture);
    let wrap2 = String(opts.wrap);
    let cacheKey = min + ":" + max + "=" + relax + shorthand + capture + wrap2;
    if (toRegexRange.cache.hasOwnProperty(cacheKey)) {
      return toRegexRange.cache[cacheKey].result;
    }
    let a = Math.min(min, max);
    let b = Math.max(min, max);
    if (Math.abs(a - b) === 1) {
      let result = min + "|" + max;
      if (opts.capture) {
        return `(${result})`;
      }
      if (opts.wrap === false) {
        return result;
      }
      return `(?:${result})`;
    }
    let isPadded = hasPadding(min) || hasPadding(max);
    let state = { min, max, a, b };
    let positives = [];
    let negatives = [];
    if (isPadded) {
      state.isPadded = isPadded;
      state.maxLen = String(state.max).length;
    }
    if (a < 0) {
      let newMin = b < 0 ? Math.abs(b) : 1;
      negatives = splitToPatterns(newMin, Math.abs(a), state, opts);
      a = state.a = 0;
    }
    if (b >= 0) {
      positives = splitToPatterns(a, b, state, opts);
    }
    state.negatives = negatives;
    state.positives = positives;
    state.result = collatePatterns(negatives, positives, opts);
    if (opts.capture === true) {
      state.result = `(${state.result})`;
    } else if (opts.wrap !== false && positives.length + negatives.length > 1) {
      state.result = `(?:${state.result})`;
    }
    toRegexRange.cache[cacheKey] = state;
    return state.result;
  };
  toRegexRange.cache = {};
  toRegexRange.clearCache = () => toRegexRange.cache = {};
  module.exports = toRegexRange;
});

// node_modules/fill-range/index.js
var require_fill_range = __commonJS((exports, module) => {
  /*!
   * fill-range <https://github.com/jonschlinkert/fill-range>
   *
   * Copyright (c) 2014-present, Jon Schlinkert.
   * Licensed under the MIT License.
   */
  var util = import.meta.require("util");
  var toRegexRange = require_to_regex_range();
  var isObject = (val) => val !== null && typeof val === "object" && !Array.isArray(val);
  var transform = (toNumber) => {
    return (value) => toNumber === true ? Number(value) : String(value);
  };
  var isValidValue = (value) => {
    return typeof value === "number" || typeof value === "string" && value !== "";
  };
  var isNumber = (num) => Number.isInteger(+num);
  var zeros = (input) => {
    let value = `${input}`;
    let index = -1;
    if (value[0] === "-")
      value = value.slice(1);
    if (value === "0")
      return false;
    while (value[++index] === "0")
      ;
    return index > 0;
  };
  var stringify = (start, end, options) => {
    if (typeof start === "string" || typeof end === "string") {
      return true;
    }
    return options.stringify === true;
  };
  var pad = (input, maxLength, toNumber) => {
    if (maxLength > 0) {
      let dash = input[0] === "-" ? "-" : "";
      if (dash)
        input = input.slice(1);
      input = dash + input.padStart(dash ? maxLength - 1 : maxLength, "0");
    }
    if (toNumber === false) {
      return String(input);
    }
    return input;
  };
  var toMaxLen = (input, maxLength) => {
    let negative = input[0] === "-" ? "-" : "";
    if (negative) {
      input = input.slice(1);
      maxLength--;
    }
    while (input.length < maxLength)
      input = "0" + input;
    return negative ? "-" + input : input;
  };
  var toSequence = (parts, options) => {
    parts.negatives.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    parts.positives.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
    let prefix = options.capture ? "" : "?:";
    let positives = "";
    let negatives = "";
    let result;
    if (parts.positives.length) {
      positives = parts.positives.join("|");
    }
    if (parts.negatives.length) {
      negatives = `-(${prefix}${parts.negatives.join("|")})`;
    }
    if (positives && negatives) {
      result = `${positives}|${negatives}`;
    } else {
      result = positives || negatives;
    }
    if (options.wrap) {
      return `(${prefix}${result})`;
    }
    return result;
  };
  var toRange = (a, b, isNumbers, options) => {
    if (isNumbers) {
      return toRegexRange(a, b, { wrap: false, ...options });
    }
    let start = String.fromCharCode(a);
    if (a === b)
      return start;
    let stop = String.fromCharCode(b);
    return `[${start}-${stop}]`;
  };
  var toRegex = (start, end, options) => {
    if (Array.isArray(start)) {
      let wrap2 = options.wrap === true;
      let prefix = options.capture ? "" : "?:";
      return wrap2 ? `(${prefix}${start.join("|")})` : start.join("|");
    }
    return toRegexRange(start, end, options);
  };
  var rangeError = (...args) => {
    return new RangeError("Invalid range arguments: " + util.inspect(...args));
  };
  var invalidRange = (start, end, options) => {
    if (options.strictRanges === true)
      throw rangeError([start, end]);
    return [];
  };
  var invalidStep = (step2, options) => {
    if (options.strictRanges === true) {
      throw new TypeError(`Expected step "${step2}" to be a number`);
    }
    return [];
  };
  var fillNumbers = (start, end, step2 = 1, options = {}) => {
    let a = Number(start);
    let b = Number(end);
    if (!Number.isInteger(a) || !Number.isInteger(b)) {
      if (options.strictRanges === true)
        throw rangeError([start, end]);
      return [];
    }
    if (a === 0)
      a = 0;
    if (b === 0)
      b = 0;
    let descending = a > b;
    let startString = String(start);
    let endString = String(end);
    let stepString = String(step2);
    step2 = Math.max(Math.abs(step2), 1);
    let padded = zeros(startString) || zeros(endString) || zeros(stepString);
    let maxLen = padded ? Math.max(startString.length, endString.length, stepString.length) : 0;
    let toNumber = padded === false && stringify(start, end, options) === false;
    let format4 = options.transform || transform(toNumber);
    if (options.toRegex && step2 === 1) {
      return toRange(toMaxLen(start, maxLen), toMaxLen(end, maxLen), true, options);
    }
    let parts = { negatives: [], positives: [] };
    let push = (num) => parts[num < 0 ? "negatives" : "positives"].push(Math.abs(num));
    let range = [];
    let index = 0;
    while (descending ? a >= b : a <= b) {
      if (options.toRegex === true && step2 > 1) {
        push(a);
      } else {
        range.push(pad(format4(a, index), maxLen, toNumber));
      }
      a = descending ? a - step2 : a + step2;
      index++;
    }
    if (options.toRegex === true) {
      return step2 > 1 ? toSequence(parts, options) : toRegex(range, null, { wrap: false, ...options });
    }
    return range;
  };
  var fillLetters = (start, end, step2 = 1, options = {}) => {
    if (!isNumber(start) && start.length > 1 || !isNumber(end) && end.length > 1) {
      return invalidRange(start, end, options);
    }
    let format4 = options.transform || ((val) => String.fromCharCode(val));
    let a = `${start}`.charCodeAt(0);
    let b = `${end}`.charCodeAt(0);
    let descending = a > b;
    let min = Math.min(a, b);
    let max = Math.max(a, b);
    if (options.toRegex && step2 === 1) {
      return toRange(min, max, false, options);
    }
    let range = [];
    let index = 0;
    while (descending ? a >= b : a <= b) {
      range.push(format4(a, index));
      a = descending ? a - step2 : a + step2;
      index++;
    }
    if (options.toRegex === true) {
      return toRegex(range, null, { wrap: false, options });
    }
    return range;
  };
  var fill = (start, end, step2, options = {}) => {
    if (end == null && isValidValue(start)) {
      return [start];
    }
    if (!isValidValue(start) || !isValidValue(end)) {
      return invalidRange(start, end, options);
    }
    if (typeof step2 === "function") {
      return fill(start, end, 1, { transform: step2 });
    }
    if (isObject(step2)) {
      return fill(start, end, 0, step2);
    }
    let opts = { ...options };
    if (opts.capture === true)
      opts.wrap = true;
    step2 = step2 || opts.step || 1;
    if (!isNumber(step2)) {
      if (step2 != null && !isObject(step2))
        return invalidStep(step2, opts);
      return fill(start, end, 1, step2);
    }
    if (isNumber(start) && isNumber(end)) {
      return fillNumbers(start, end, step2, opts);
    }
    return fillLetters(start, end, Math.max(Math.abs(step2), 1), opts);
  };
  module.exports = fill;
});

// node_modules/braces/lib/compile.js
var require_compile = __commonJS((exports, module) => {
  var fill = require_fill_range();
  var utils = require_utils3();
  var compile = (ast, options = {}) => {
    let walk = (node2, parent = {}) => {
      let invalidBlock = utils.isInvalidBrace(parent);
      let invalidNode = node2.invalid === true && options.escapeInvalid === true;
      let invalid = invalidBlock === true || invalidNode === true;
      let prefix = options.escapeInvalid === true ? "\\" : "";
      let output = "";
      if (node2.isOpen === true) {
        return prefix + node2.value;
      }
      if (node2.isClose === true) {
        return prefix + node2.value;
      }
      if (node2.type === "open") {
        return invalid ? prefix + node2.value : "(";
      }
      if (node2.type === "close") {
        return invalid ? prefix + node2.value : ")";
      }
      if (node2.type === "comma") {
        return node2.prev.type === "comma" ? "" : invalid ? node2.value : "|";
      }
      if (node2.value) {
        return node2.value;
      }
      if (node2.nodes && node2.ranges > 0) {
        let args = utils.reduce(node2.nodes);
        let range = fill(...args, { ...options, wrap: false, toRegex: true });
        if (range.length !== 0) {
          return args.length > 1 && range.length > 1 ? `(${range})` : range;
        }
      }
      if (node2.nodes) {
        for (let child of node2.nodes) {
          output += walk(child, node2);
        }
      }
      return output;
    };
    return walk(ast);
  };
  module.exports = compile;
});

// node_modules/braces/lib/expand.js
var require_expand = __commonJS((exports, module) => {
  var fill = require_fill_range();
  var stringify = require_stringify();
  var utils = require_utils3();
  var append = (queue = "", stash = "", enclose = false) => {
    let result = [];
    queue = [].concat(queue);
    stash = [].concat(stash);
    if (!stash.length)
      return queue;
    if (!queue.length) {
      return enclose ? utils.flatten(stash).map((ele) => `{${ele}}`) : stash;
    }
    for (let item of queue) {
      if (Array.isArray(item)) {
        for (let value of item) {
          result.push(append(value, stash, enclose));
        }
      } else {
        for (let ele of stash) {
          if (enclose === true && typeof ele === "string")
            ele = `{${ele}}`;
          result.push(Array.isArray(ele) ? append(item, ele, enclose) : item + ele);
        }
      }
    }
    return utils.flatten(result);
  };
  var expand = (ast, options = {}) => {
    let rangeLimit = options.rangeLimit === undefined ? 1000 : options.rangeLimit;
    let walk = (node2, parent = {}) => {
      node2.queue = [];
      let p = parent;
      let q = parent.queue;
      while (p.type !== "brace" && p.type !== "root" && p.parent) {
        p = p.parent;
        q = p.queue;
      }
      if (node2.invalid || node2.dollar) {
        q.push(append(q.pop(), stringify(node2, options)));
        return;
      }
      if (node2.type === "brace" && node2.invalid !== true && node2.nodes.length === 2) {
        q.push(append(q.pop(), ["{}"]));
        return;
      }
      if (node2.nodes && node2.ranges > 0) {
        let args = utils.reduce(node2.nodes);
        if (utils.exceedsLimit(...args, options.step, rangeLimit)) {
          throw new RangeError("expanded array length exceeds range limit. Use options.rangeLimit to increase or disable the limit.");
        }
        let range = fill(...args, options);
        if (range.length === 0) {
          range = stringify(node2, options);
        }
        q.push(append(q.pop(), range));
        node2.nodes = [];
        return;
      }
      let enclose = utils.encloseBrace(node2);
      let queue = node2.queue;
      let block = node2;
      while (block.type !== "brace" && block.type !== "root" && block.parent) {
        block = block.parent;
        queue = block.queue;
      }
      for (let i = 0;i < node2.nodes.length; i++) {
        let child = node2.nodes[i];
        if (child.type === "comma" && node2.type === "brace") {
          if (i === 1)
            queue.push("");
          queue.push("");
          continue;
        }
        if (child.type === "close") {
          q.push(append(q.pop(), queue, enclose));
          continue;
        }
        if (child.value && child.type !== "open") {
          queue.push(append(queue.pop(), child.value));
          continue;
        }
        if (child.nodes) {
          walk(child, node2);
        }
      }
      return queue;
    };
    return utils.flatten(walk(ast));
  };
  module.exports = expand;
});

// node_modules/braces/lib/constants.js
var require_constants = __commonJS((exports, module) => {
  module.exports = {
    MAX_LENGTH: 1024 * 64,
    CHAR_0: "0",
    CHAR_9: "9",
    CHAR_UPPERCASE_A: "A",
    CHAR_LOWERCASE_A: "a",
    CHAR_UPPERCASE_Z: "Z",
    CHAR_LOWERCASE_Z: "z",
    CHAR_LEFT_PARENTHESES: "(",
    CHAR_RIGHT_PARENTHESES: ")",
    CHAR_ASTERISK: "*",
    CHAR_AMPERSAND: "&",
    CHAR_AT: "@",
    CHAR_BACKSLASH: "\\",
    CHAR_BACKTICK: "`",
    CHAR_CARRIAGE_RETURN: "\r",
    CHAR_CIRCUMFLEX_ACCENT: "^",
    CHAR_COLON: ":",
    CHAR_COMMA: ",",
    CHAR_DOLLAR: "$",
    CHAR_DOT: ".",
    CHAR_DOUBLE_QUOTE: '"',
    CHAR_EQUAL: "=",
    CHAR_EXCLAMATION_MARK: "!",
    CHAR_FORM_FEED: "\f",
    CHAR_FORWARD_SLASH: "/",
    CHAR_HASH: "#",
    CHAR_HYPHEN_MINUS: "-",
    CHAR_LEFT_ANGLE_BRACKET: "<",
    CHAR_LEFT_CURLY_BRACE: "{",
    CHAR_LEFT_SQUARE_BRACKET: "[",
    CHAR_LINE_FEED: "\n",
    CHAR_NO_BREAK_SPACE: "\xA0",
    CHAR_PERCENT: "%",
    CHAR_PLUS: "+",
    CHAR_QUESTION_MARK: "?",
    CHAR_RIGHT_ANGLE_BRACKET: ">",
    CHAR_RIGHT_CURLY_BRACE: "}",
    CHAR_RIGHT_SQUARE_BRACKET: "]",
    CHAR_SEMICOLON: ";",
    CHAR_SINGLE_QUOTE: "\'",
    CHAR_SPACE: " ",
    CHAR_TAB: "\t",
    CHAR_UNDERSCORE: "_",
    CHAR_VERTICAL_LINE: "|",
    CHAR_ZERO_WIDTH_NOBREAK_SPACE: "\uFEFF"
  };
});

// node_modules/braces/lib/parse.js
var require_parse = __commonJS((exports, module) => {
  var stringify = require_stringify();
  var {
    MAX_LENGTH,
    CHAR_BACKSLASH,
    CHAR_BACKTICK,
    CHAR_COMMA,
    CHAR_DOT,
    CHAR_LEFT_PARENTHESES,
    CHAR_RIGHT_PARENTHESES,
    CHAR_LEFT_CURLY_BRACE,
    CHAR_RIGHT_CURLY_BRACE,
    CHAR_LEFT_SQUARE_BRACKET,
    CHAR_RIGHT_SQUARE_BRACKET,
    CHAR_DOUBLE_QUOTE,
    CHAR_SINGLE_QUOTE,
    CHAR_NO_BREAK_SPACE,
    CHAR_ZERO_WIDTH_NOBREAK_SPACE
  } = require_constants();
  var parse = (input, options = {}) => {
    if (typeof input !== "string") {
      throw new TypeError("Expected a string");
    }
    let opts = options || {};
    let max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
    if (input.length > max) {
      throw new SyntaxError(`Input length (${input.length}), exceeds max characters (${max})`);
    }
    let ast = { type: "root", input, nodes: [] };
    let stack = [ast];
    let block = ast;
    let prev = ast;
    let brackets = 0;
    let length = input.length;
    let index = 0;
    let depth = 0;
    let value;
    let memo = {};
    const advance = () => input[index++];
    const push = (node2) => {
      if (node2.type === "text" && prev.type === "dot") {
        prev.type = "text";
      }
      if (prev && prev.type === "text" && node2.type === "text") {
        prev.value += node2.value;
        return;
      }
      block.nodes.push(node2);
      node2.parent = block;
      node2.prev = prev;
      prev = node2;
      return node2;
    };
    push({ type: "bos" });
    while (index < length) {
      block = stack[stack.length - 1];
      value = advance();
      if (value === CHAR_ZERO_WIDTH_NOBREAK_SPACE || value === CHAR_NO_BREAK_SPACE) {
        continue;
      }
      if (value === CHAR_BACKSLASH) {
        push({ type: "text", value: (options.keepEscaping ? value : "") + advance() });
        continue;
      }
      if (value === CHAR_RIGHT_SQUARE_BRACKET) {
        push({ type: "text", value: "\\" + value });
        continue;
      }
      if (value === CHAR_LEFT_SQUARE_BRACKET) {
        brackets++;
        let closed = true;
        let next;
        while (index < length && (next = advance())) {
          value += next;
          if (next === CHAR_LEFT_SQUARE_BRACKET) {
            brackets++;
            continue;
          }
          if (next === CHAR_BACKSLASH) {
            value += advance();
            continue;
          }
          if (next === CHAR_RIGHT_SQUARE_BRACKET) {
            brackets--;
            if (brackets === 0) {
              break;
            }
          }
        }
        push({ type: "text", value });
        continue;
      }
      if (value === CHAR_LEFT_PARENTHESES) {
        block = push({ type: "paren", nodes: [] });
        stack.push(block);
        push({ type: "text", value });
        continue;
      }
      if (value === CHAR_RIGHT_PARENTHESES) {
        if (block.type !== "paren") {
          push({ type: "text", value });
          continue;
        }
        block = stack.pop();
        push({ type: "text", value });
        block = stack[stack.length - 1];
        continue;
      }
      if (value === CHAR_DOUBLE_QUOTE || value === CHAR_SINGLE_QUOTE || value === CHAR_BACKTICK) {
        let open = value;
        let next;
        if (options.keepQuotes !== true) {
          value = "";
        }
        while (index < length && (next = advance())) {
          if (next === CHAR_BACKSLASH) {
            value += next + advance();
            continue;
          }
          if (next === open) {
            if (options.keepQuotes === true)
              value += next;
            break;
          }
          value += next;
        }
        push({ type: "text", value });
        continue;
      }
      if (value === CHAR_LEFT_CURLY_BRACE) {
        depth++;
        let dollar = prev.value && prev.value.slice(-1) === "$" || block.dollar === true;
        let brace = {
          type: "brace",
          open: true,
          close: false,
          dollar,
          depth,
          commas: 0,
          ranges: 0,
          nodes: []
        };
        block = push(brace);
        stack.push(block);
        push({ type: "open", value });
        continue;
      }
      if (value === CHAR_RIGHT_CURLY_BRACE) {
        if (block.type !== "brace") {
          push({ type: "text", value });
          continue;
        }
        let type = "close";
        block = stack.pop();
        block.close = true;
        push({ type, value });
        depth--;
        block = stack[stack.length - 1];
        continue;
      }
      if (value === CHAR_COMMA && depth > 0) {
        if (block.ranges > 0) {
          block.ranges = 0;
          let open = block.nodes.shift();
          block.nodes = [open, { type: "text", value: stringify(block) }];
        }
        push({ type: "comma", value });
        block.commas++;
        continue;
      }
      if (value === CHAR_DOT && depth > 0 && block.commas === 0) {
        let siblings = block.nodes;
        if (depth === 0 || siblings.length === 0) {
          push({ type: "text", value });
          continue;
        }
        if (prev.type === "dot") {
          block.range = [];
          prev.value += value;
          prev.type = "range";
          if (block.nodes.length !== 3 && block.nodes.length !== 5) {
            block.invalid = true;
            block.ranges = 0;
            prev.type = "text";
            continue;
          }
          block.ranges++;
          block.args = [];
          continue;
        }
        if (prev.type === "range") {
          siblings.pop();
          let before = siblings[siblings.length - 1];
          before.value += prev.value + value;
          prev = before;
          block.ranges--;
          continue;
        }
        push({ type: "dot", value });
        continue;
      }
      push({ type: "text", value });
    }
    do {
      block = stack.pop();
      if (block.type !== "root") {
        block.nodes.forEach((node2) => {
          if (!node2.nodes) {
            if (node2.type === "open")
              node2.isOpen = true;
            if (node2.type === "close")
              node2.isClose = true;
            if (!node2.nodes)
              node2.type = "text";
            node2.invalid = true;
          }
        });
        let parent = stack[stack.length - 1];
        let index2 = parent.nodes.indexOf(block);
        parent.nodes.splice(index2, 1, ...block.nodes);
      }
    } while (stack.length > 0);
    push({ type: "eos" });
    return ast;
  };
  module.exports = parse;
});

// node_modules/braces/index.js
var require_braces = __commonJS((exports, module) => {
  var stringify = require_stringify();
  var compile = require_compile();
  var expand = require_expand();
  var parse = require_parse();
  var braces = (input, options = {}) => {
    let output = [];
    if (Array.isArray(input)) {
      for (let pattern of input) {
        let result = braces.create(pattern, options);
        if (Array.isArray(result)) {
          output.push(...result);
        } else {
          output.push(result);
        }
      }
    } else {
      output = [].concat(braces.create(input, options));
    }
    if (options && options.expand === true && options.nodupes === true) {
      output = [...new Set(output)];
    }
    return output;
  };
  braces.parse = (input, options = {}) => parse(input, options);
  braces.stringify = (input, options = {}) => {
    if (typeof input === "string") {
      return stringify(braces.parse(input, options), options);
    }
    return stringify(input, options);
  };
  braces.compile = (input, options = {}) => {
    if (typeof input === "string") {
      input = braces.parse(input, options);
    }
    return compile(input, options);
  };
  braces.expand = (input, options = {}) => {
    if (typeof input === "string") {
      input = braces.parse(input, options);
    }
    let result = expand(input, options);
    if (options.noempty === true) {
      result = result.filter(Boolean);
    }
    if (options.nodupes === true) {
      result = [...new Set(result)];
    }
    return result;
  };
  braces.create = (input, options = {}) => {
    if (input === "" || input.length < 3) {
      return [input];
    }
    return options.expand !== true ? braces.compile(input, options) : braces.expand(input, options);
  };
  module.exports = braces;
});

// node_modules/picomatch/lib/constants.js
var require_constants2 = __commonJS((exports, module) => {
  var path = import.meta.require("path");
  var WIN_SLASH = "\\\\/";
  var WIN_NO_SLASH = `[^${WIN_SLASH}]`;
  var DOT_LITERAL = "\\.";
  var PLUS_LITERAL = "\\+";
  var QMARK_LITERAL = "\\?";
  var SLASH_LITERAL = "\\/";
  var ONE_CHAR = "(?=.)";
  var QMARK = "[^/]";
  var END_ANCHOR = `(?:${SLASH_LITERAL}|\$)`;
  var START_ANCHOR = `(?:^|${SLASH_LITERAL})`;
  var DOTS_SLASH = `${DOT_LITERAL}{1,2}${END_ANCHOR}`;
  var NO_DOT = `(?!${DOT_LITERAL})`;
  var NO_DOTS = `(?!${START_ANCHOR}${DOTS_SLASH})`;
  var NO_DOT_SLASH = `(?!${DOT_LITERAL}{0,1}${END_ANCHOR})`;
  var NO_DOTS_SLASH = `(?!${DOTS_SLASH})`;
  var QMARK_NO_DOT = `[^.${SLASH_LITERAL}]`;
  var STAR = `${QMARK}*?`;
  var POSIX_CHARS = {
    DOT_LITERAL,
    PLUS_LITERAL,
    QMARK_LITERAL,
    SLASH_LITERAL,
    ONE_CHAR,
    QMARK,
    END_ANCHOR,
    DOTS_SLASH,
    NO_DOT,
    NO_DOTS,
    NO_DOT_SLASH,
    NO_DOTS_SLASH,
    QMARK_NO_DOT,
    STAR,
    START_ANCHOR
  };
  var WINDOWS_CHARS = {
    ...POSIX_CHARS,
    SLASH_LITERAL: `[${WIN_SLASH}]`,
    QMARK: WIN_NO_SLASH,
    STAR: `${WIN_NO_SLASH}*?`,
    DOTS_SLASH: `${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|\$)`,
    NO_DOT: `(?!${DOT_LITERAL})`,
    NO_DOTS: `(?!(?:^|[${WIN_SLASH}])${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|\$))`,
    NO_DOT_SLASH: `(?!${DOT_LITERAL}{0,1}(?:[${WIN_SLASH}]|\$))`,
    NO_DOTS_SLASH: `(?!${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|\$))`,
    QMARK_NO_DOT: `[^.${WIN_SLASH}]`,
    START_ANCHOR: `(?:^|[${WIN_SLASH}])`,
    END_ANCHOR: `(?:[${WIN_SLASH}]|\$)`
  };
  var POSIX_REGEX_SOURCE = {
    alnum: "a-zA-Z0-9",
    alpha: "a-zA-Z",
    ascii: "\\x00-\\x7F",
    blank: " \\t",
    cntrl: "\\x00-\\x1F\\x7F",
    digit: "0-9",
    graph: "\\x21-\\x7E",
    lower: "a-z",
    print: "\\x20-\\x7E ",
    punct: '\\-!"#$%&\'()\\*+,./:;<=>?@[\\]^_`{|}~',
    space: " \\t\\r\\n\\v\\f",
    upper: "A-Z",
    word: "A-Za-z0-9_",
    xdigit: "A-Fa-f0-9"
  };
  module.exports = {
    MAX_LENGTH: 1024 * 64,
    POSIX_REGEX_SOURCE,
    REGEX_BACKSLASH: /\\(?![*+?^${}(|)[\]])/g,
    REGEX_NON_SPECIAL_CHARS: /^[^@![\].,$*+?^{}()|\\/]+/,
    REGEX_SPECIAL_CHARS: /[-*+?.^${}(|)[\]]/,
    REGEX_SPECIAL_CHARS_BACKREF: /(\\?)((\W)(\3*))/g,
    REGEX_SPECIAL_CHARS_GLOBAL: /([-*+?.^${}(|)[\]])/g,
    REGEX_REMOVE_BACKSLASH: /(?:\[.*?[^\\]\]|\\(?=.))/g,
    REPLACEMENTS: {
      "***": "*",
      "**/**": "**",
      "**/**/**": "**"
    },
    CHAR_0: 48,
    CHAR_9: 57,
    CHAR_UPPERCASE_A: 65,
    CHAR_LOWERCASE_A: 97,
    CHAR_UPPERCASE_Z: 90,
    CHAR_LOWERCASE_Z: 122,
    CHAR_LEFT_PARENTHESES: 40,
    CHAR_RIGHT_PARENTHESES: 41,
    CHAR_ASTERISK: 42,
    CHAR_AMPERSAND: 38,
    CHAR_AT: 64,
    CHAR_BACKWARD_SLASH: 92,
    CHAR_CARRIAGE_RETURN: 13,
    CHAR_CIRCUMFLEX_ACCENT: 94,
    CHAR_COLON: 58,
    CHAR_COMMA: 44,
    CHAR_DOT: 46,
    CHAR_DOUBLE_QUOTE: 34,
    CHAR_EQUAL: 61,
    CHAR_EXCLAMATION_MARK: 33,
    CHAR_FORM_FEED: 12,
    CHAR_FORWARD_SLASH: 47,
    CHAR_GRAVE_ACCENT: 96,
    CHAR_HASH: 35,
    CHAR_HYPHEN_MINUS: 45,
    CHAR_LEFT_ANGLE_BRACKET: 60,
    CHAR_LEFT_CURLY_BRACE: 123,
    CHAR_LEFT_SQUARE_BRACKET: 91,
    CHAR_LINE_FEED: 10,
    CHAR_NO_BREAK_SPACE: 160,
    CHAR_PERCENT: 37,
    CHAR_PLUS: 43,
    CHAR_QUESTION_MARK: 63,
    CHAR_RIGHT_ANGLE_BRACKET: 62,
    CHAR_RIGHT_CURLY_BRACE: 125,
    CHAR_RIGHT_SQUARE_BRACKET: 93,
    CHAR_SEMICOLON: 59,
    CHAR_SINGLE_QUOTE: 39,
    CHAR_SPACE: 32,
    CHAR_TAB: 9,
    CHAR_UNDERSCORE: 95,
    CHAR_VERTICAL_LINE: 124,
    CHAR_ZERO_WIDTH_NOBREAK_SPACE: 65279,
    SEP: path.sep,
    extglobChars(chars) {
      return {
        "!": { type: "negate", open: "(?:(?!(?:", close: `))${chars.STAR})` },
        "?": { type: "qmark", open: "(?:", close: ")?" },
        "+": { type: "plus", open: "(?:", close: ")+" },
        "*": { type: "star", open: "(?:", close: ")*" },
        "@": { type: "at", open: "(?:", close: ")" }
      };
    },
    globChars(win32) {
      return win32 === true ? WINDOWS_CHARS : POSIX_CHARS;
    }
  };
});

// node_modules/picomatch/lib/utils.js
var require_utils4 = __commonJS((exports) => {
  var path = import.meta.require("path");
  var win32 = process.platform === "win32";
  var {
    REGEX_BACKSLASH,
    REGEX_REMOVE_BACKSLASH,
    REGEX_SPECIAL_CHARS,
    REGEX_SPECIAL_CHARS_GLOBAL
  } = require_constants2();
  exports.isObject = (val) => val !== null && typeof val === "object" && !Array.isArray(val);
  exports.hasRegexChars = (str) => REGEX_SPECIAL_CHARS.test(str);
  exports.isRegexChar = (str) => str.length === 1 && exports.hasRegexChars(str);
  exports.escapeRegex = (str) => str.replace(REGEX_SPECIAL_CHARS_GLOBAL, "\\$1");
  exports.toPosixSlashes = (str) => str.replace(REGEX_BACKSLASH, "/");
  exports.removeBackslashes = (str) => {
    return str.replace(REGEX_REMOVE_BACKSLASH, (match) => {
      return match === "\\" ? "" : match;
    });
  };
  exports.supportsLookbehinds = () => {
    const segs = process.version.slice(1).split(".").map(Number);
    if (segs.length === 3 && segs[0] >= 9 || segs[0] === 8 && segs[1] >= 10) {
      return true;
    }
    return false;
  };
  exports.isWindows = (options) => {
    if (options && typeof options.windows === "boolean") {
      return options.windows;
    }
    return win32 === true || path.sep === "\\";
  };
  exports.escapeLast = (input, char, lastIdx) => {
    const idx = input.lastIndexOf(char, lastIdx);
    if (idx === -1)
      return input;
    if (input[idx - 1] === "\\")
      return exports.escapeLast(input, char, idx - 1);
    return `${input.slice(0, idx)}\\${input.slice(idx)}`;
  };
  exports.removePrefix = (input, state = {}) => {
    let output = input;
    if (output.startsWith("./")) {
      output = output.slice(2);
      state.prefix = "./";
    }
    return output;
  };
  exports.wrapOutput = (input, state = {}, options = {}) => {
    const prepend = options.contains ? "" : "^";
    const append = options.contains ? "" : "$";
    let output = `${prepend}(?:${input})${append}`;
    if (state.negated === true) {
      output = `(?:^(?!${output}).*\$)`;
    }
    return output;
  };
});

// node_modules/picomatch/lib/scan.js
var require_scan = __commonJS((exports, module) => {
  var utils = require_utils4();
  var {
    CHAR_ASTERISK,
    CHAR_AT,
    CHAR_BACKWARD_SLASH,
    CHAR_COMMA,
    CHAR_DOT,
    CHAR_EXCLAMATION_MARK,
    CHAR_FORWARD_SLASH,
    CHAR_LEFT_CURLY_BRACE,
    CHAR_LEFT_PARENTHESES,
    CHAR_LEFT_SQUARE_BRACKET,
    CHAR_PLUS,
    CHAR_QUESTION_MARK,
    CHAR_RIGHT_CURLY_BRACE,
    CHAR_RIGHT_PARENTHESES,
    CHAR_RIGHT_SQUARE_BRACKET
  } = require_constants2();
  var isPathSeparator = (code) => {
    return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
  };
  var depth = (token) => {
    if (token.isPrefix !== true) {
      token.depth = token.isGlobstar ? Infinity : 1;
    }
  };
  var scan = (input, options) => {
    const opts = options || {};
    const length = input.length - 1;
    const scanToEnd = opts.parts === true || opts.scanToEnd === true;
    const slashes = [];
    const tokens = [];
    const parts = [];
    let str = input;
    let index = -1;
    let start = 0;
    let lastIndex = 0;
    let isBrace = false;
    let isBracket = false;
    let isGlob = false;
    let isExtglob = false;
    let isGlobstar = false;
    let braceEscaped = false;
    let backslashes = false;
    let negated = false;
    let negatedExtglob = false;
    let finished = false;
    let braces = 0;
    let prev;
    let code;
    let token = { value: "", depth: 0, isGlob: false };
    const eos = () => index >= length;
    const peek = () => str.charCodeAt(index + 1);
    const advance = () => {
      prev = code;
      return str.charCodeAt(++index);
    };
    while (index < length) {
      code = advance();
      let next;
      if (code === CHAR_BACKWARD_SLASH) {
        backslashes = token.backslashes = true;
        code = advance();
        if (code === CHAR_LEFT_CURLY_BRACE) {
          braceEscaped = true;
        }
        continue;
      }
      if (braceEscaped === true || code === CHAR_LEFT_CURLY_BRACE) {
        braces++;
        while (eos() !== true && (code = advance())) {
          if (code === CHAR_BACKWARD_SLASH) {
            backslashes = token.backslashes = true;
            advance();
            continue;
          }
          if (code === CHAR_LEFT_CURLY_BRACE) {
            braces++;
            continue;
          }
          if (braceEscaped !== true && code === CHAR_DOT && (code = advance()) === CHAR_DOT) {
            isBrace = token.isBrace = true;
            isGlob = token.isGlob = true;
            finished = true;
            if (scanToEnd === true) {
              continue;
            }
            break;
          }
          if (braceEscaped !== true && code === CHAR_COMMA) {
            isBrace = token.isBrace = true;
            isGlob = token.isGlob = true;
            finished = true;
            if (scanToEnd === true) {
              continue;
            }
            break;
          }
          if (code === CHAR_RIGHT_CURLY_BRACE) {
            braces--;
            if (braces === 0) {
              braceEscaped = false;
              isBrace = token.isBrace = true;
              finished = true;
              break;
            }
          }
        }
        if (scanToEnd === true) {
          continue;
        }
        break;
      }
      if (code === CHAR_FORWARD_SLASH) {
        slashes.push(index);
        tokens.push(token);
        token = { value: "", depth: 0, isGlob: false };
        if (finished === true)
          continue;
        if (prev === CHAR_DOT && index === start + 1) {
          start += 2;
          continue;
        }
        lastIndex = index + 1;
        continue;
      }
      if (opts.noext !== true) {
        const isExtglobChar = code === CHAR_PLUS || code === CHAR_AT || code === CHAR_ASTERISK || code === CHAR_QUESTION_MARK || code === CHAR_EXCLAMATION_MARK;
        if (isExtglobChar === true && peek() === CHAR_LEFT_PARENTHESES) {
          isGlob = token.isGlob = true;
          isExtglob = token.isExtglob = true;
          finished = true;
          if (code === CHAR_EXCLAMATION_MARK && index === start) {
            negatedExtglob = true;
          }
          if (scanToEnd === true) {
            while (eos() !== true && (code = advance())) {
              if (code === CHAR_BACKWARD_SLASH) {
                backslashes = token.backslashes = true;
                code = advance();
                continue;
              }
              if (code === CHAR_RIGHT_PARENTHESES) {
                isGlob = token.isGlob = true;
                finished = true;
                break;
              }
            }
            continue;
          }
          break;
        }
      }
      if (code === CHAR_ASTERISK) {
        if (prev === CHAR_ASTERISK)
          isGlobstar = token.isGlobstar = true;
        isGlob = token.isGlob = true;
        finished = true;
        if (scanToEnd === true) {
          continue;
        }
        break;
      }
      if (code === CHAR_QUESTION_MARK) {
        isGlob = token.isGlob = true;
        finished = true;
        if (scanToEnd === true) {
          continue;
        }
        break;
      }
      if (code === CHAR_LEFT_SQUARE_BRACKET) {
        while (eos() !== true && (next = advance())) {
          if (next === CHAR_BACKWARD_SLASH) {
            backslashes = token.backslashes = true;
            advance();
            continue;
          }
          if (next === CHAR_RIGHT_SQUARE_BRACKET) {
            isBracket = token.isBracket = true;
            isGlob = token.isGlob = true;
            finished = true;
            break;
          }
        }
        if (scanToEnd === true) {
          continue;
        }
        break;
      }
      if (opts.nonegate !== true && code === CHAR_EXCLAMATION_MARK && index === start) {
        negated = token.negated = true;
        start++;
        continue;
      }
      if (opts.noparen !== true && code === CHAR_LEFT_PARENTHESES) {
        isGlob = token.isGlob = true;
        if (scanToEnd === true) {
          while (eos() !== true && (code = advance())) {
            if (code === CHAR_LEFT_PARENTHESES) {
              backslashes = token.backslashes = true;
              code = advance();
              continue;
            }
            if (code === CHAR_RIGHT_PARENTHESES) {
              finished = true;
              break;
            }
          }
          continue;
        }
        break;
      }
      if (isGlob === true) {
        finished = true;
        if (scanToEnd === true) {
          continue;
        }
        break;
      }
    }
    if (opts.noext === true) {
      isExtglob = false;
      isGlob = false;
    }
    let base = str;
    let prefix = "";
    let glob = "";
    if (start > 0) {
      prefix = str.slice(0, start);
      str = str.slice(start);
      lastIndex -= start;
    }
    if (base && isGlob === true && lastIndex > 0) {
      base = str.slice(0, lastIndex);
      glob = str.slice(lastIndex);
    } else if (isGlob === true) {
      base = "";
      glob = str;
    } else {
      base = str;
    }
    if (base && base !== "" && base !== "/" && base !== str) {
      if (isPathSeparator(base.charCodeAt(base.length - 1))) {
        base = base.slice(0, -1);
      }
    }
    if (opts.unescape === true) {
      if (glob)
        glob = utils.removeBackslashes(glob);
      if (base && backslashes === true) {
        base = utils.removeBackslashes(base);
      }
    }
    const state = {
      prefix,
      input,
      start,
      base,
      glob,
      isBrace,
      isBracket,
      isGlob,
      isExtglob,
      isGlobstar,
      negated,
      negatedExtglob
    };
    if (opts.tokens === true) {
      state.maxDepth = 0;
      if (!isPathSeparator(code)) {
        tokens.push(token);
      }
      state.tokens = tokens;
    }
    if (opts.parts === true || opts.tokens === true) {
      let prevIndex;
      for (let idx = 0;idx < slashes.length; idx++) {
        const n = prevIndex ? prevIndex + 1 : start;
        const i = slashes[idx];
        const value = input.slice(n, i);
        if (opts.tokens) {
          if (idx === 0 && start !== 0) {
            tokens[idx].isPrefix = true;
            tokens[idx].value = prefix;
          } else {
            tokens[idx].value = value;
          }
          depth(tokens[idx]);
          state.maxDepth += tokens[idx].depth;
        }
        if (idx !== 0 || value !== "") {
          parts.push(value);
        }
        prevIndex = i;
      }
      if (prevIndex && prevIndex + 1 < input.length) {
        const value = input.slice(prevIndex + 1);
        parts.push(value);
        if (opts.tokens) {
          tokens[tokens.length - 1].value = value;
          depth(tokens[tokens.length - 1]);
          state.maxDepth += tokens[tokens.length - 1].depth;
        }
      }
      state.slashes = slashes;
      state.parts = parts;
    }
    return state;
  };
  module.exports = scan;
});

// node_modules/picomatch/lib/parse.js
var require_parse2 = __commonJS((exports, module) => {
  var constants = require_constants2();
  var utils = require_utils4();
  var {
    MAX_LENGTH,
    POSIX_REGEX_SOURCE,
    REGEX_NON_SPECIAL_CHARS,
    REGEX_SPECIAL_CHARS_BACKREF,
    REPLACEMENTS
  } = constants;
  var expandRange = (args, options) => {
    if (typeof options.expandRange === "function") {
      return options.expandRange(...args, options);
    }
    args.sort();
    const value = `[${args.join("-")}]`;
    try {
      new RegExp(value);
    } catch (ex) {
      return args.map((v) => utils.escapeRegex(v)).join("..");
    }
    return value;
  };
  var syntaxError = (type, char) => {
    return `Missing ${type}: "${char}" - use "\\\\${char}" to match literal characters`;
  };
  var parse = (input, options) => {
    if (typeof input !== "string") {
      throw new TypeError("Expected a string");
    }
    input = REPLACEMENTS[input] || input;
    const opts = { ...options };
    const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
    let len = input.length;
    if (len > max) {
      throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
    }
    const bos = { type: "bos", value: "", output: opts.prepend || "" };
    const tokens = [bos];
    const capture = opts.capture ? "" : "?:";
    const win32 = utils.isWindows(options);
    const PLATFORM_CHARS = constants.globChars(win32);
    const EXTGLOB_CHARS = constants.extglobChars(PLATFORM_CHARS);
    const {
      DOT_LITERAL,
      PLUS_LITERAL,
      SLASH_LITERAL,
      ONE_CHAR,
      DOTS_SLASH,
      NO_DOT,
      NO_DOT_SLASH,
      NO_DOTS_SLASH,
      QMARK,
      QMARK_NO_DOT,
      STAR,
      START_ANCHOR
    } = PLATFORM_CHARS;
    const globstar = (opts2) => {
      return `(${capture}(?:(?!${START_ANCHOR}${opts2.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
    };
    const nodot = opts.dot ? "" : NO_DOT;
    const qmarkNoDot = opts.dot ? QMARK : QMARK_NO_DOT;
    let star = opts.bash === true ? globstar(opts) : STAR;
    if (opts.capture) {
      star = `(${star})`;
    }
    if (typeof opts.noext === "boolean") {
      opts.noextglob = opts.noext;
    }
    const state = {
      input,
      index: -1,
      start: 0,
      dot: opts.dot === true,
      consumed: "",
      output: "",
      prefix: "",
      backtrack: false,
      negated: false,
      brackets: 0,
      braces: 0,
      parens: 0,
      quotes: 0,
      globstar: false,
      tokens
    };
    input = utils.removePrefix(input, state);
    len = input.length;
    const extglobs = [];
    const braces = [];
    const stack = [];
    let prev = bos;
    let value;
    const eos = () => state.index === len - 1;
    const peek = state.peek = (n = 1) => input[state.index + n];
    const advance = state.advance = () => input[++state.index] || "";
    const remaining = () => input.slice(state.index + 1);
    const consume = (value2 = "", num = 0) => {
      state.consumed += value2;
      state.index += num;
    };
    const append = (token) => {
      state.output += token.output != null ? token.output : token.value;
      consume(token.value);
    };
    const negate = () => {
      let count = 1;
      while (peek() === "!" && (peek(2) !== "(" || peek(3) === "?")) {
        advance();
        state.start++;
        count++;
      }
      if (count % 2 === 0) {
        return false;
      }
      state.negated = true;
      state.start++;
      return true;
    };
    const increment2 = (type) => {
      state[type]++;
      stack.push(type);
    };
    const decrement = (type) => {
      state[type]--;
      stack.pop();
    };
    const push = (tok) => {
      if (prev.type === "globstar") {
        const isBrace = state.braces > 0 && (tok.type === "comma" || tok.type === "brace");
        const isExtglob = tok.extglob === true || extglobs.length && (tok.type === "pipe" || tok.type === "paren");
        if (tok.type !== "slash" && tok.type !== "paren" && !isBrace && !isExtglob) {
          state.output = state.output.slice(0, -prev.output.length);
          prev.type = "star";
          prev.value = "*";
          prev.output = star;
          state.output += prev.output;
        }
      }
      if (extglobs.length && tok.type !== "paren") {
        extglobs[extglobs.length - 1].inner += tok.value;
      }
      if (tok.value || tok.output)
        append(tok);
      if (prev && prev.type === "text" && tok.type === "text") {
        prev.value += tok.value;
        prev.output = (prev.output || "") + tok.value;
        return;
      }
      tok.prev = prev;
      tokens.push(tok);
      prev = tok;
    };
    const extglobOpen = (type, value2) => {
      const token = { ...EXTGLOB_CHARS[value2], conditions: 1, inner: "" };
      token.prev = prev;
      token.parens = state.parens;
      token.output = state.output;
      const output = (opts.capture ? "(" : "") + token.open;
      increment2("parens");
      push({ type, value: value2, output: state.output ? "" : ONE_CHAR });
      push({ type: "paren", extglob: true, value: advance(), output });
      extglobs.push(token);
    };
    const extglobClose = (token) => {
      let output = token.close + (opts.capture ? ")" : "");
      let rest;
      if (token.type === "negate") {
        let extglobStar = star;
        if (token.inner && token.inner.length > 1 && token.inner.includes("/")) {
          extglobStar = globstar(opts);
        }
        if (extglobStar !== star || eos() || /^\)+$/.test(remaining())) {
          output = token.close = `)\$))${extglobStar}`;
        }
        if (token.inner.includes("*") && (rest = remaining()) && /^\.[^\\/.]+$/.test(rest)) {
          const expression = parse(rest, { ...options, fastpaths: false }).output;
          output = token.close = `)${expression})${extglobStar})`;
        }
        if (token.prev.type === "bos") {
          state.negatedExtglob = true;
        }
      }
      push({ type: "paren", extglob: true, value, output });
      decrement("parens");
    };
    if (opts.fastpaths !== false && !/(^[*!]|[/()[\]{}"])/.test(input)) {
      let backslashes = false;
      let output = input.replace(REGEX_SPECIAL_CHARS_BACKREF, (m, esc, chars, first, rest, index) => {
        if (first === "\\") {
          backslashes = true;
          return m;
        }
        if (first === "?") {
          if (esc) {
            return esc + first + (rest ? QMARK.repeat(rest.length) : "");
          }
          if (index === 0) {
            return qmarkNoDot + (rest ? QMARK.repeat(rest.length) : "");
          }
          return QMARK.repeat(chars.length);
        }
        if (first === ".") {
          return DOT_LITERAL.repeat(chars.length);
        }
        if (first === "*") {
          if (esc) {
            return esc + first + (rest ? star : "");
          }
          return star;
        }
        return esc ? m : `\\${m}`;
      });
      if (backslashes === true) {
        if (opts.unescape === true) {
          output = output.replace(/\\/g, "");
        } else {
          output = output.replace(/\\+/g, (m) => {
            return m.length % 2 === 0 ? "\\\\" : m ? "\\" : "";
          });
        }
      }
      if (output === input && opts.contains === true) {
        state.output = input;
        return state;
      }
      state.output = utils.wrapOutput(output, state, options);
      return state;
    }
    while (!eos()) {
      value = advance();
      if (value === "\0") {
        continue;
      }
      if (value === "\\") {
        const next = peek();
        if (next === "/" && opts.bash !== true) {
          continue;
        }
        if (next === "." || next === ";") {
          continue;
        }
        if (!next) {
          value += "\\";
          push({ type: "text", value });
          continue;
        }
        const match = /^\\+/.exec(remaining());
        let slashes = 0;
        if (match && match[0].length > 2) {
          slashes = match[0].length;
          state.index += slashes;
          if (slashes % 2 !== 0) {
            value += "\\";
          }
        }
        if (opts.unescape === true) {
          value = advance();
        } else {
          value += advance();
        }
        if (state.brackets === 0) {
          push({ type: "text", value });
          continue;
        }
      }
      if (state.brackets > 0 && (value !== "]" || prev.value === "[" || prev.value === "[^")) {
        if (opts.posix !== false && value === ":") {
          const inner = prev.value.slice(1);
          if (inner.includes("[")) {
            prev.posix = true;
            if (inner.includes(":")) {
              const idx = prev.value.lastIndexOf("[");
              const pre = prev.value.slice(0, idx);
              const rest2 = prev.value.slice(idx + 2);
              const posix = POSIX_REGEX_SOURCE[rest2];
              if (posix) {
                prev.value = pre + posix;
                state.backtrack = true;
                advance();
                if (!bos.output && tokens.indexOf(prev) === 1) {
                  bos.output = ONE_CHAR;
                }
                continue;
              }
            }
          }
        }
        if (value === "[" && peek() !== ":" || value === "-" && peek() === "]") {
          value = `\\${value}`;
        }
        if (value === "]" && (prev.value === "[" || prev.value === "[^")) {
          value = `\\${value}`;
        }
        if (opts.posix === true && value === "!" && prev.value === "[") {
          value = "^";
        }
        prev.value += value;
        append({ value });
        continue;
      }
      if (state.quotes === 1 && value !== '"') {
        value = utils.escapeRegex(value);
        prev.value += value;
        append({ value });
        continue;
      }
      if (value === '"') {
        state.quotes = state.quotes === 1 ? 0 : 1;
        if (opts.keepQuotes === true) {
          push({ type: "text", value });
        }
        continue;
      }
      if (value === "(") {
        increment2("parens");
        push({ type: "paren", value });
        continue;
      }
      if (value === ")") {
        if (state.parens === 0 && opts.strictBrackets === true) {
          throw new SyntaxError(syntaxError("opening", "("));
        }
        const extglob = extglobs[extglobs.length - 1];
        if (extglob && state.parens === extglob.parens + 1) {
          extglobClose(extglobs.pop());
          continue;
        }
        push({ type: "paren", value, output: state.parens ? ")" : "\\)" });
        decrement("parens");
        continue;
      }
      if (value === "[") {
        if (opts.nobracket === true || !remaining().includes("]")) {
          if (opts.nobracket !== true && opts.strictBrackets === true) {
            throw new SyntaxError(syntaxError("closing", "]"));
          }
          value = `\\${value}`;
        } else {
          increment2("brackets");
        }
        push({ type: "bracket", value });
        continue;
      }
      if (value === "]") {
        if (opts.nobracket === true || prev && prev.type === "bracket" && prev.value.length === 1) {
          push({ type: "text", value, output: `\\${value}` });
          continue;
        }
        if (state.brackets === 0) {
          if (opts.strictBrackets === true) {
            throw new SyntaxError(syntaxError("opening", "["));
          }
          push({ type: "text", value, output: `\\${value}` });
          continue;
        }
        decrement("brackets");
        const prevValue = prev.value.slice(1);
        if (prev.posix !== true && prevValue[0] === "^" && !prevValue.includes("/")) {
          value = `/${value}`;
        }
        prev.value += value;
        append({ value });
        if (opts.literalBrackets === false || utils.hasRegexChars(prevValue)) {
          continue;
        }
        const escaped = utils.escapeRegex(prev.value);
        state.output = state.output.slice(0, -prev.value.length);
        if (opts.literalBrackets === true) {
          state.output += escaped;
          prev.value = escaped;
          continue;
        }
        prev.value = `(${capture}${escaped}|${prev.value})`;
        state.output += prev.value;
        continue;
      }
      if (value === "{" && opts.nobrace !== true) {
        increment2("braces");
        const open = {
          type: "brace",
          value,
          output: "(",
          outputIndex: state.output.length,
          tokensIndex: state.tokens.length
        };
        braces.push(open);
        push(open);
        continue;
      }
      if (value === "}") {
        const brace = braces[braces.length - 1];
        if (opts.nobrace === true || !brace) {
          push({ type: "text", value, output: value });
          continue;
        }
        let output = ")";
        if (brace.dots === true) {
          const arr = tokens.slice();
          const range = [];
          for (let i = arr.length - 1;i >= 0; i--) {
            tokens.pop();
            if (arr[i].type === "brace") {
              break;
            }
            if (arr[i].type !== "dots") {
              range.unshift(arr[i].value);
            }
          }
          output = expandRange(range, opts);
          state.backtrack = true;
        }
        if (brace.comma !== true && brace.dots !== true) {
          const out = state.output.slice(0, brace.outputIndex);
          const toks = state.tokens.slice(brace.tokensIndex);
          brace.value = brace.output = "\\{";
          value = output = "\\}";
          state.output = out;
          for (const t of toks) {
            state.output += t.output || t.value;
          }
        }
        push({ type: "brace", value, output });
        decrement("braces");
        braces.pop();
        continue;
      }
      if (value === "|") {
        if (extglobs.length > 0) {
          extglobs[extglobs.length - 1].conditions++;
        }
        push({ type: "text", value });
        continue;
      }
      if (value === ",") {
        let output = value;
        const brace = braces[braces.length - 1];
        if (brace && stack[stack.length - 1] === "braces") {
          brace.comma = true;
          output = "|";
        }
        push({ type: "comma", value, output });
        continue;
      }
      if (value === "/") {
        if (prev.type === "dot" && state.index === state.start + 1) {
          state.start = state.index + 1;
          state.consumed = "";
          state.output = "";
          tokens.pop();
          prev = bos;
          continue;
        }
        push({ type: "slash", value, output: SLASH_LITERAL });
        continue;
      }
      if (value === ".") {
        if (state.braces > 0 && prev.type === "dot") {
          if (prev.value === ".")
            prev.output = DOT_LITERAL;
          const brace = braces[braces.length - 1];
          prev.type = "dots";
          prev.output += value;
          prev.value += value;
          brace.dots = true;
          continue;
        }
        if (state.braces + state.parens === 0 && prev.type !== "bos" && prev.type !== "slash") {
          push({ type: "text", value, output: DOT_LITERAL });
          continue;
        }
        push({ type: "dot", value, output: DOT_LITERAL });
        continue;
      }
      if (value === "?") {
        const isGroup = prev && prev.value === "(";
        if (!isGroup && opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
          extglobOpen("qmark", value);
          continue;
        }
        if (prev && prev.type === "paren") {
          const next = peek();
          let output = value;
          if (next === "<" && !utils.supportsLookbehinds()) {
            throw new Error("Node.js v10 or higher is required for regex lookbehinds");
          }
          if (prev.value === "(" && !/[!=<:]/.test(next) || next === "<" && !/<([!=]|\w+>)/.test(remaining())) {
            output = `\\${value}`;
          }
          push({ type: "text", value, output });
          continue;
        }
        if (opts.dot !== true && (prev.type === "slash" || prev.type === "bos")) {
          push({ type: "qmark", value, output: QMARK_NO_DOT });
          continue;
        }
        push({ type: "qmark", value, output: QMARK });
        continue;
      }
      if (value === "!") {
        if (opts.noextglob !== true && peek() === "(") {
          if (peek(2) !== "?" || !/[!=<:]/.test(peek(3))) {
            extglobOpen("negate", value);
            continue;
          }
        }
        if (opts.nonegate !== true && state.index === 0) {
          negate();
          continue;
        }
      }
      if (value === "+") {
        if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
          extglobOpen("plus", value);
          continue;
        }
        if (prev && prev.value === "(" || opts.regex === false) {
          push({ type: "plus", value, output: PLUS_LITERAL });
          continue;
        }
        if (prev && (prev.type === "bracket" || prev.type === "paren" || prev.type === "brace") || state.parens > 0) {
          push({ type: "plus", value });
          continue;
        }
        push({ type: "plus", value: PLUS_LITERAL });
        continue;
      }
      if (value === "@") {
        if (opts.noextglob !== true && peek() === "(" && peek(2) !== "?") {
          push({ type: "at", extglob: true, value, output: "" });
          continue;
        }
        push({ type: "text", value });
        continue;
      }
      if (value !== "*") {
        if (value === "$" || value === "^") {
          value = `\\${value}`;
        }
        const match = REGEX_NON_SPECIAL_CHARS.exec(remaining());
        if (match) {
          value += match[0];
          state.index += match[0].length;
        }
        push({ type: "text", value });
        continue;
      }
      if (prev && (prev.type === "globstar" || prev.star === true)) {
        prev.type = "star";
        prev.star = true;
        prev.value += value;
        prev.output = star;
        state.backtrack = true;
        state.globstar = true;
        consume(value);
        continue;
      }
      let rest = remaining();
      if (opts.noextglob !== true && /^\([^?]/.test(rest)) {
        extglobOpen("star", value);
        continue;
      }
      if (prev.type === "star") {
        if (opts.noglobstar === true) {
          consume(value);
          continue;
        }
        const prior = prev.prev;
        const before = prior.prev;
        const isStart = prior.type === "slash" || prior.type === "bos";
        const afterStar = before && (before.type === "star" || before.type === "globstar");
        if (opts.bash === true && (!isStart || rest[0] && rest[0] !== "/")) {
          push({ type: "star", value, output: "" });
          continue;
        }
        const isBrace = state.braces > 0 && (prior.type === "comma" || prior.type === "brace");
        const isExtglob = extglobs.length && (prior.type === "pipe" || prior.type === "paren");
        if (!isStart && prior.type !== "paren" && !isBrace && !isExtglob) {
          push({ type: "star", value, output: "" });
          continue;
        }
        while (rest.slice(0, 3) === "/**") {
          const after = input[state.index + 4];
          if (after && after !== "/") {
            break;
          }
          rest = rest.slice(3);
          consume("/**", 3);
        }
        if (prior.type === "bos" && eos()) {
          prev.type = "globstar";
          prev.value += value;
          prev.output = globstar(opts);
          state.output = prev.output;
          state.globstar = true;
          consume(value);
          continue;
        }
        if (prior.type === "slash" && prior.prev.type !== "bos" && !afterStar && eos()) {
          state.output = state.output.slice(0, -(prior.output + prev.output).length);
          prior.output = `(?:${prior.output}`;
          prev.type = "globstar";
          prev.output = globstar(opts) + (opts.strictSlashes ? ")" : "|$)");
          prev.value += value;
          state.globstar = true;
          state.output += prior.output + prev.output;
          consume(value);
          continue;
        }
        if (prior.type === "slash" && prior.prev.type !== "bos" && rest[0] === "/") {
          const end = rest[1] !== undefined ? "|$" : "";
          state.output = state.output.slice(0, -(prior.output + prev.output).length);
          prior.output = `(?:${prior.output}`;
          prev.type = "globstar";
          prev.output = `${globstar(opts)}${SLASH_LITERAL}|${SLASH_LITERAL}${end})`;
          prev.value += value;
          state.output += prior.output + prev.output;
          state.globstar = true;
          consume(value + advance());
          push({ type: "slash", value: "/", output: "" });
          continue;
        }
        if (prior.type === "bos" && rest[0] === "/") {
          prev.type = "globstar";
          prev.value += value;
          prev.output = `(?:^|${SLASH_LITERAL}|${globstar(opts)}${SLASH_LITERAL})`;
          state.output = prev.output;
          state.globstar = true;
          consume(value + advance());
          push({ type: "slash", value: "/", output: "" });
          continue;
        }
        state.output = state.output.slice(0, -prev.output.length);
        prev.type = "globstar";
        prev.output = globstar(opts);
        prev.value += value;
        state.output += prev.output;
        state.globstar = true;
        consume(value);
        continue;
      }
      const token = { type: "star", value, output: star };
      if (opts.bash === true) {
        token.output = ".*?";
        if (prev.type === "bos" || prev.type === "slash") {
          token.output = nodot + token.output;
        }
        push(token);
        continue;
      }
      if (prev && (prev.type === "bracket" || prev.type === "paren") && opts.regex === true) {
        token.output = value;
        push(token);
        continue;
      }
      if (state.index === state.start || prev.type === "slash" || prev.type === "dot") {
        if (prev.type === "dot") {
          state.output += NO_DOT_SLASH;
          prev.output += NO_DOT_SLASH;
        } else if (opts.dot === true) {
          state.output += NO_DOTS_SLASH;
          prev.output += NO_DOTS_SLASH;
        } else {
          state.output += nodot;
          prev.output += nodot;
        }
        if (peek() !== "*") {
          state.output += ONE_CHAR;
          prev.output += ONE_CHAR;
        }
      }
      push(token);
    }
    while (state.brackets > 0) {
      if (opts.strictBrackets === true)
        throw new SyntaxError(syntaxError("closing", "]"));
      state.output = utils.escapeLast(state.output, "[");
      decrement("brackets");
    }
    while (state.parens > 0) {
      if (opts.strictBrackets === true)
        throw new SyntaxError(syntaxError("closing", ")"));
      state.output = utils.escapeLast(state.output, "(");
      decrement("parens");
    }
    while (state.braces > 0) {
      if (opts.strictBrackets === true)
        throw new SyntaxError(syntaxError("closing", "}"));
      state.output = utils.escapeLast(state.output, "{");
      decrement("braces");
    }
    if (opts.strictSlashes !== true && (prev.type === "star" || prev.type === "bracket")) {
      push({ type: "maybe_slash", value: "", output: `${SLASH_LITERAL}?` });
    }
    if (state.backtrack === true) {
      state.output = "";
      for (const token of state.tokens) {
        state.output += token.output != null ? token.output : token.value;
        if (token.suffix) {
          state.output += token.suffix;
        }
      }
    }
    return state;
  };
  parse.fastpaths = (input, options) => {
    const opts = { ...options };
    const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
    const len = input.length;
    if (len > max) {
      throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
    }
    input = REPLACEMENTS[input] || input;
    const win32 = utils.isWindows(options);
    const {
      DOT_LITERAL,
      SLASH_LITERAL,
      ONE_CHAR,
      DOTS_SLASH,
      NO_DOT,
      NO_DOTS,
      NO_DOTS_SLASH,
      STAR,
      START_ANCHOR
    } = constants.globChars(win32);
    const nodot = opts.dot ? NO_DOTS : NO_DOT;
    const slashDot = opts.dot ? NO_DOTS_SLASH : NO_DOT;
    const capture = opts.capture ? "" : "?:";
    const state = { negated: false, prefix: "" };
    let star = opts.bash === true ? ".*?" : STAR;
    if (opts.capture) {
      star = `(${star})`;
    }
    const globstar = (opts2) => {
      if (opts2.noglobstar === true)
        return star;
      return `(${capture}(?:(?!${START_ANCHOR}${opts2.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
    };
    const create = (str) => {
      switch (str) {
        case "*":
          return `${nodot}${ONE_CHAR}${star}`;
        case ".*":
          return `${DOT_LITERAL}${ONE_CHAR}${star}`;
        case "*.*":
          return `${nodot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
        case "*/*":
          return `${nodot}${star}${SLASH_LITERAL}${ONE_CHAR}${slashDot}${star}`;
        case "**":
          return nodot + globstar(opts);
        case "**/*":
          return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${ONE_CHAR}${star}`;
        case "**/*.*":
          return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
        case "**/.*":
          return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${DOT_LITERAL}${ONE_CHAR}${star}`;
        default: {
          const match = /^(.*?)\.(\w+)$/.exec(str);
          if (!match)
            return;
          const source2 = create(match[1]);
          if (!source2)
            return;
          return source2 + DOT_LITERAL + match[2];
        }
      }
    };
    const output = utils.removePrefix(input, state);
    let source = create(output);
    if (source && opts.strictSlashes !== true) {
      source += `${SLASH_LITERAL}?`;
    }
    return source;
  };
  module.exports = parse;
});

// node_modules/picomatch/lib/picomatch.js
var require_picomatch = __commonJS((exports, module) => {
  var path = import.meta.require("path");
  var scan = require_scan();
  var parse = require_parse2();
  var utils = require_utils4();
  var constants = require_constants2();
  var isObject = (val) => val && typeof val === "object" && !Array.isArray(val);
  var picomatch = (glob, options, returnState = false) => {
    if (Array.isArray(glob)) {
      const fns = glob.map((input) => picomatch(input, options, returnState));
      const arrayMatcher = (str) => {
        for (const isMatch of fns) {
          const state2 = isMatch(str);
          if (state2)
            return state2;
        }
        return false;
      };
      return arrayMatcher;
    }
    const isState = isObject(glob) && glob.tokens && glob.input;
    if (glob === "" || typeof glob !== "string" && !isState) {
      throw new TypeError("Expected pattern to be a non-empty string");
    }
    const opts = options || {};
    const posix = utils.isWindows(options);
    const regex = isState ? picomatch.compileRe(glob, options) : picomatch.makeRe(glob, options, false, true);
    const state = regex.state;
    delete regex.state;
    let isIgnored = () => false;
    if (opts.ignore) {
      const ignoreOpts = { ...options, ignore: null, onMatch: null, onResult: null };
      isIgnored = picomatch(opts.ignore, ignoreOpts, returnState);
    }
    const matcher = (input, returnObject = false) => {
      const { isMatch, match, output } = picomatch.test(input, regex, options, { glob, posix });
      const result = { glob, state, regex, posix, input, output, match, isMatch };
      if (typeof opts.onResult === "function") {
        opts.onResult(result);
      }
      if (isMatch === false) {
        result.isMatch = false;
        return returnObject ? result : false;
      }
      if (isIgnored(input)) {
        if (typeof opts.onIgnore === "function") {
          opts.onIgnore(result);
        }
        result.isMatch = false;
        return returnObject ? result : false;
      }
      if (typeof opts.onMatch === "function") {
        opts.onMatch(result);
      }
      return returnObject ? result : true;
    };
    if (returnState) {
      matcher.state = state;
    }
    return matcher;
  };
  picomatch.test = (input, regex, options, { glob, posix } = {}) => {
    if (typeof input !== "string") {
      throw new TypeError("Expected input to be a string");
    }
    if (input === "") {
      return { isMatch: false, output: "" };
    }
    const opts = options || {};
    const format4 = opts.format || (posix ? utils.toPosixSlashes : null);
    let match = input === glob;
    let output = match && format4 ? format4(input) : input;
    if (match === false) {
      output = format4 ? format4(input) : input;
      match = output === glob;
    }
    if (match === false || opts.capture === true) {
      if (opts.matchBase === true || opts.basename === true) {
        match = picomatch.matchBase(input, regex, options, posix);
      } else {
        match = regex.exec(output);
      }
    }
    return { isMatch: Boolean(match), match, output };
  };
  picomatch.matchBase = (input, glob, options, posix = utils.isWindows(options)) => {
    const regex = glob instanceof RegExp ? glob : picomatch.makeRe(glob, options);
    return regex.test(path.basename(input));
  };
  picomatch.isMatch = (str, patterns, options) => picomatch(patterns, options)(str);
  picomatch.parse = (pattern, options) => {
    if (Array.isArray(pattern))
      return pattern.map((p) => picomatch.parse(p, options));
    return parse(pattern, { ...options, fastpaths: false });
  };
  picomatch.scan = (input, options) => scan(input, options);
  picomatch.compileRe = (state, options, returnOutput = false, returnState = false) => {
    if (returnOutput === true) {
      return state.output;
    }
    const opts = options || {};
    const prepend = opts.contains ? "" : "^";
    const append = opts.contains ? "" : "$";
    let source = `${prepend}(?:${state.output})${append}`;
    if (state && state.negated === true) {
      source = `^(?!${source}).*\$`;
    }
    const regex = picomatch.toRegex(source, options);
    if (returnState === true) {
      regex.state = state;
    }
    return regex;
  };
  picomatch.makeRe = (input, options = {}, returnOutput = false, returnState = false) => {
    if (!input || typeof input !== "string") {
      throw new TypeError("Expected a non-empty string");
    }
    let parsed = { negated: false, fastpaths: true };
    if (options.fastpaths !== false && (input[0] === "." || input[0] === "*")) {
      parsed.output = parse.fastpaths(input, options);
    }
    if (!parsed.output) {
      parsed = parse(input, options);
    }
    return picomatch.compileRe(parsed, options, returnOutput, returnState);
  };
  picomatch.toRegex = (source, options) => {
    try {
      const opts = options || {};
      return new RegExp(source, opts.flags || (opts.nocase ? "i" : ""));
    } catch (err) {
      if (options && options.debug === true)
        throw err;
      return /$^/;
    }
  };
  picomatch.constants = constants;
  module.exports = picomatch;
});

// node_modules/micromatch/index.js
var require_micromatch = __commonJS((exports, module) => {
  var util = import.meta.require("util");
  var braces = require_braces();
  var picomatch = require_picomatch();
  var utils = require_utils4();
  var isEmptyString = (val) => val === "" || val === "./";
  var micromatch = (list, patterns, options) => {
    patterns = [].concat(patterns);
    list = [].concat(list);
    let omit = new Set;
    let keep = new Set;
    let items = new Set;
    let negatives = 0;
    let onResult = (state) => {
      items.add(state.output);
      if (options && options.onResult) {
        options.onResult(state);
      }
    };
    for (let i = 0;i < patterns.length; i++) {
      let isMatch = picomatch(String(patterns[i]), { ...options, onResult }, true);
      let negated = isMatch.state.negated || isMatch.state.negatedExtglob;
      if (negated)
        negatives++;
      for (let item of list) {
        let matched = isMatch(item, true);
        let match = negated ? !matched.isMatch : matched.isMatch;
        if (!match)
          continue;
        if (negated) {
          omit.add(matched.output);
        } else {
          omit.delete(matched.output);
          keep.add(matched.output);
        }
      }
    }
    let result = negatives === patterns.length ? [...items] : [...keep];
    let matches = result.filter((item) => !omit.has(item));
    if (options && matches.length === 0) {
      if (options.failglob === true) {
        throw new Error(`No matches found for "${patterns.join(", ")}"`);
      }
      if (options.nonull === true || options.nullglob === true) {
        return options.unescape ? patterns.map((p) => p.replace(/\\/g, "")) : patterns;
      }
    }
    return matches;
  };
  micromatch.match = micromatch;
  micromatch.matcher = (pattern, options) => picomatch(pattern, options);
  micromatch.isMatch = (str, patterns, options) => picomatch(patterns, options)(str);
  micromatch.any = micromatch.isMatch;
  micromatch.not = (list, patterns, options = {}) => {
    patterns = [].concat(patterns).map(String);
    let result = new Set;
    let items = [];
    let onResult = (state) => {
      if (options.onResult)
        options.onResult(state);
      items.push(state.output);
    };
    let matches = new Set(micromatch(list, patterns, { ...options, onResult }));
    for (let item of items) {
      if (!matches.has(item)) {
        result.add(item);
      }
    }
    return [...result];
  };
  micromatch.contains = (str, pattern, options) => {
    if (typeof str !== "string") {
      throw new TypeError(`Expected a string: "${util.inspect(str)}"`);
    }
    if (Array.isArray(pattern)) {
      return pattern.some((p) => micromatch.contains(str, p, options));
    }
    if (typeof pattern === "string") {
      if (isEmptyString(str) || isEmptyString(pattern)) {
        return false;
      }
      if (str.includes(pattern) || str.startsWith("./") && str.slice(2).includes(pattern)) {
        return true;
      }
    }
    return micromatch.isMatch(str, pattern, { ...options, contains: true });
  };
  micromatch.matchKeys = (obj, patterns, options) => {
    if (!utils.isObject(obj)) {
      throw new TypeError("Expected the first argument to be an object");
    }
    let keys = micromatch(Object.keys(obj), patterns, options);
    let res = {};
    for (let key of keys)
      res[key] = obj[key];
    return res;
  };
  micromatch.some = (list, patterns, options) => {
    let items = [].concat(list);
    for (let pattern of [].concat(patterns)) {
      let isMatch = picomatch(String(pattern), options);
      if (items.some((item) => isMatch(item))) {
        return true;
      }
    }
    return false;
  };
  micromatch.every = (list, patterns, options) => {
    let items = [].concat(list);
    for (let pattern of [].concat(patterns)) {
      let isMatch = picomatch(String(pattern), options);
      if (!items.every((item) => isMatch(item))) {
        return false;
      }
    }
    return true;
  };
  micromatch.all = (str, patterns, options) => {
    if (typeof str !== "string") {
      throw new TypeError(`Expected a string: "${util.inspect(str)}"`);
    }
    return [].concat(patterns).every((p) => picomatch(p, options)(str));
  };
  micromatch.capture = (glob, input, options) => {
    let posix = utils.isWindows(options);
    let regex = picomatch.makeRe(String(glob), { ...options, capture: true });
    let match = regex.exec(posix ? utils.toPosixSlashes(input) : input);
    if (match) {
      return match.slice(1).map((v) => v === undefined ? "" : v);
    }
  };
  micromatch.makeRe = (...args) => picomatch.makeRe(...args);
  micromatch.scan = (...args) => picomatch.scan(...args);
  micromatch.parse = (patterns, options) => {
    let res = [];
    for (let pattern of [].concat(patterns || [])) {
      for (let str of braces(String(pattern), options)) {
        res.push(picomatch.parse(str, options));
      }
    }
    return res;
  };
  micromatch.braces = (pattern, options) => {
    if (typeof pattern !== "string")
      throw new TypeError("Expected a string");
    if (options && options.nobrace === true || !/\{.*\}/.test(pattern)) {
      return [pattern];
    }
    return braces(pattern, options);
  };
  micromatch.braceExpand = (pattern, options) => {
    if (typeof pattern !== "string")
      throw new TypeError("Expected a string");
    return micromatch.braces(pattern, { ...options, expand: true });
  };
  module.exports = micromatch;
});

// node_modules/fast-glob/out/utils/pattern.js
var require_pattern = __commonJS((exports) => {
  var isStaticPattern = function(pattern, options = {}) {
    return !isDynamicPattern(pattern, options);
  };
  var isDynamicPattern = function(pattern, options = {}) {
    if (pattern === "") {
      return false;
    }
    if (options.caseSensitiveMatch === false || pattern.includes(ESCAPE_SYMBOL)) {
      return true;
    }
    if (COMMON_GLOB_SYMBOLS_RE.test(pattern) || REGEX_CHARACTER_CLASS_SYMBOLS_RE.test(pattern) || REGEX_GROUP_SYMBOLS_RE.test(pattern)) {
      return true;
    }
    if (options.extglob !== false && GLOB_EXTENSION_SYMBOLS_RE.test(pattern)) {
      return true;
    }
    if (options.braceExpansion !== false && hasBraceExpansion(pattern)) {
      return true;
    }
    return false;
  };
  var hasBraceExpansion = function(pattern) {
    const openingBraceIndex = pattern.indexOf("{");
    if (openingBraceIndex === -1) {
      return false;
    }
    const closingBraceIndex = pattern.indexOf("}", openingBraceIndex + 1);
    if (closingBraceIndex === -1) {
      return false;
    }
    const braceContent = pattern.slice(openingBraceIndex, closingBraceIndex);
    return BRACE_EXPANSION_SEPARATORS_RE.test(braceContent);
  };
  var convertToPositivePattern = function(pattern) {
    return isNegativePattern(pattern) ? pattern.slice(1) : pattern;
  };
  var convertToNegativePattern = function(pattern) {
    return "!" + pattern;
  };
  var isNegativePattern = function(pattern) {
    return pattern.startsWith("!") && pattern[1] !== "(";
  };
  var isPositivePattern = function(pattern) {
    return !isNegativePattern(pattern);
  };
  var getNegativePatterns = function(patterns) {
    return patterns.filter(isNegativePattern);
  };
  var getPositivePatterns = function(patterns) {
    return patterns.filter(isPositivePattern);
  };
  var getPatternsInsideCurrentDirectory = function(patterns) {
    return patterns.filter((pattern) => !isPatternRelatedToParentDirectory(pattern));
  };
  var getPatternsOutsideCurrentDirectory = function(patterns) {
    return patterns.filter(isPatternRelatedToParentDirectory);
  };
  var isPatternRelatedToParentDirectory = function(pattern) {
    return pattern.startsWith("..") || pattern.startsWith("./..");
  };
  var getBaseDirectory = function(pattern) {
    return globParent(pattern, { flipBackslashes: false });
  };
  var hasGlobStar = function(pattern) {
    return pattern.includes(GLOBSTAR);
  };
  var endsWithSlashGlobStar = function(pattern) {
    return pattern.endsWith("/" + GLOBSTAR);
  };
  var isAffectDepthOfReadingPattern = function(pattern) {
    const basename2 = path.basename(pattern);
    return endsWithSlashGlobStar(pattern) || isStaticPattern(basename2);
  };
  var expandPatternsWithBraceExpansion = function(patterns) {
    return patterns.reduce((collection, pattern) => {
      return collection.concat(expandBraceExpansion(pattern));
    }, []);
  };
  var expandBraceExpansion = function(pattern) {
    const patterns = micromatch.braces(pattern, { expand: true, nodupes: true });
    patterns.sort((a, b) => a.length - b.length);
    return patterns.filter((pattern2) => pattern2 !== "");
  };
  var getPatternParts = function(pattern, options) {
    let { parts } = micromatch.scan(pattern, Object.assign(Object.assign({}, options), { parts: true }));
    if (parts.length === 0) {
      parts = [pattern];
    }
    if (parts[0].startsWith("/")) {
      parts[0] = parts[0].slice(1);
      parts.unshift("");
    }
    return parts;
  };
  var makeRe = function(pattern, options) {
    return micromatch.makeRe(pattern, options);
  };
  var convertPatternsToRe = function(patterns, options) {
    return patterns.map((pattern) => makeRe(pattern, options));
  };
  var matchAny = function(entry, patternsRe) {
    return patternsRe.some((patternRe) => patternRe.test(entry));
  };
  var removeDuplicateSlashes = function(pattern) {
    return pattern.replace(DOUBLE_SLASH_RE, "/");
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.removeDuplicateSlashes = exports.matchAny = exports.convertPatternsToRe = exports.makeRe = exports.getPatternParts = exports.expandBraceExpansion = exports.expandPatternsWithBraceExpansion = exports.isAffectDepthOfReadingPattern = exports.endsWithSlashGlobStar = exports.hasGlobStar = exports.getBaseDirectory = exports.isPatternRelatedToParentDirectory = exports.getPatternsOutsideCurrentDirectory = exports.getPatternsInsideCurrentDirectory = exports.getPositivePatterns = exports.getNegativePatterns = exports.isPositivePattern = exports.isNegativePattern = exports.convertToNegativePattern = exports.convertToPositivePattern = exports.isDynamicPattern = exports.isStaticPattern = undefined;
  var path = import.meta.require("path");
  var globParent = require_glob_parent();
  var micromatch = require_micromatch();
  var GLOBSTAR = "**";
  var ESCAPE_SYMBOL = "\\";
  var COMMON_GLOB_SYMBOLS_RE = /[*?]|^!/;
  var REGEX_CHARACTER_CLASS_SYMBOLS_RE = /\[[^[]*]/;
  var REGEX_GROUP_SYMBOLS_RE = /(?:^|[^!*+?@])\([^(]*\|[^|]*\)/;
  var GLOB_EXTENSION_SYMBOLS_RE = /[!*+?@]\([^(]*\)/;
  var BRACE_EXPANSION_SEPARATORS_RE = /,|\.\./;
  var DOUBLE_SLASH_RE = /(?!^)\/{2,}/g;
  exports.isStaticPattern = isStaticPattern;
  exports.isDynamicPattern = isDynamicPattern;
  exports.convertToPositivePattern = convertToPositivePattern;
  exports.convertToNegativePattern = convertToNegativePattern;
  exports.isNegativePattern = isNegativePattern;
  exports.isPositivePattern = isPositivePattern;
  exports.getNegativePatterns = getNegativePatterns;
  exports.getPositivePatterns = getPositivePatterns;
  exports.getPatternsInsideCurrentDirectory = getPatternsInsideCurrentDirectory;
  exports.getPatternsOutsideCurrentDirectory = getPatternsOutsideCurrentDirectory;
  exports.isPatternRelatedToParentDirectory = isPatternRelatedToParentDirectory;
  exports.getBaseDirectory = getBaseDirectory;
  exports.hasGlobStar = hasGlobStar;
  exports.endsWithSlashGlobStar = endsWithSlashGlobStar;
  exports.isAffectDepthOfReadingPattern = isAffectDepthOfReadingPattern;
  exports.expandPatternsWithBraceExpansion = expandPatternsWithBraceExpansion;
  exports.expandBraceExpansion = expandBraceExpansion;
  exports.getPatternParts = getPatternParts;
  exports.makeRe = makeRe;
  exports.convertPatternsToRe = convertPatternsToRe;
  exports.matchAny = matchAny;
  exports.removeDuplicateSlashes = removeDuplicateSlashes;
});

// node_modules/merge2/index.js
var require_merge2 = __commonJS((exports, module) => {
  var merge2 = function() {
    const streamsQueue = [];
    const args = slice.call(arguments);
    let merging = false;
    let options = args[args.length - 1];
    if (options && !Array.isArray(options) && options.pipe == null) {
      args.pop();
    } else {
      options = {};
    }
    const doEnd = options.end !== false;
    const doPipeError = options.pipeError === true;
    if (options.objectMode == null) {
      options.objectMode = true;
    }
    if (options.highWaterMark == null) {
      options.highWaterMark = 64 * 1024;
    }
    const mergedStream = PassThrough(options);
    function addStream() {
      for (let i = 0, len = arguments.length;i < len; i++) {
        streamsQueue.push(pauseStreams(arguments[i], options));
      }
      mergeStream();
      return this;
    }
    function mergeStream() {
      if (merging) {
        return;
      }
      merging = true;
      let streams = streamsQueue.shift();
      if (!streams) {
        process.nextTick(endStream);
        return;
      }
      if (!Array.isArray(streams)) {
        streams = [streams];
      }
      let pipesCount = streams.length + 1;
      function next() {
        if (--pipesCount > 0) {
          return;
        }
        merging = false;
        mergeStream();
      }
      function pipe(stream) {
        function onend() {
          stream.removeListener("merge2UnpipeEnd", onend);
          stream.removeListener("end", onend);
          if (doPipeError) {
            stream.removeListener("error", onerror);
          }
          next();
        }
        function onerror(err) {
          mergedStream.emit("error", err);
        }
        if (stream._readableState.endEmitted) {
          return next();
        }
        stream.on("merge2UnpipeEnd", onend);
        stream.on("end", onend);
        if (doPipeError) {
          stream.on("error", onerror);
        }
        stream.pipe(mergedStream, { end: false });
        stream.resume();
      }
      for (let i = 0;i < streams.length; i++) {
        pipe(streams[i]);
      }
      next();
    }
    function endStream() {
      merging = false;
      mergedStream.emit("queueDrain");
      if (doEnd) {
        mergedStream.end();
      }
    }
    mergedStream.setMaxListeners(0);
    mergedStream.add = addStream;
    mergedStream.on("unpipe", function(stream) {
      stream.emit("merge2UnpipeEnd");
    });
    if (args.length) {
      addStream.apply(null, args);
    }
    return mergedStream;
  };
  var pauseStreams = function(streams, options) {
    if (!Array.isArray(streams)) {
      if (!streams._readableState && streams.pipe) {
        streams = streams.pipe(PassThrough(options));
      }
      if (!streams._readableState || !streams.pause || !streams.pipe) {
        throw new Error("Only readable stream can be merged.");
      }
      streams.pause();
    } else {
      for (let i = 0, len = streams.length;i < len; i++) {
        streams[i] = pauseStreams(streams[i], options);
      }
    }
    return streams;
  };
  var Stream = import.meta.require("stream");
  var PassThrough = Stream.PassThrough;
  var slice = Array.prototype.slice;
  module.exports = merge2;
});

// node_modules/fast-glob/out/utils/stream.js
var require_stream = __commonJS((exports) => {
  var merge = function(streams) {
    const mergedStream = merge2(streams);
    streams.forEach((stream) => {
      stream.once("error", (error2) => mergedStream.emit("error", error2));
    });
    mergedStream.once("close", () => propagateCloseEventToSources(streams));
    mergedStream.once("end", () => propagateCloseEventToSources(streams));
    return mergedStream;
  };
  var propagateCloseEventToSources = function(streams) {
    streams.forEach((stream) => stream.emit("close"));
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.merge = undefined;
  var merge2 = require_merge2();
  exports.merge = merge;
});

// node_modules/fast-glob/out/utils/string.js
var require_string = __commonJS((exports) => {
  var isString = function(input) {
    return typeof input === "string";
  };
  var isEmpty = function(input) {
    return input === "";
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.isEmpty = exports.isString = undefined;
  exports.isString = isString;
  exports.isEmpty = isEmpty;
});

// node_modules/fast-glob/out/utils/index.js
var require_utils5 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.string = exports.stream = exports.pattern = exports.path = exports.fs = exports.errno = exports.array = undefined;
  var array = require_array();
  exports.array = array;
  var errno = require_errno();
  exports.errno = errno;
  var fs = require_fs2();
  exports.fs = fs;
  var path = require_path();
  exports.path = path;
  var pattern = require_pattern();
  exports.pattern = pattern;
  var stream = require_stream();
  exports.stream = stream;
  var string = require_string();
  exports.string = string;
});

// node_modules/fast-glob/out/managers/tasks.js
var require_tasks = __commonJS((exports) => {
  var generate = function(input, settings) {
    const patterns = processPatterns(input, settings);
    const ignore = processPatterns(settings.ignore, settings);
    const positivePatterns = getPositivePatterns(patterns);
    const negativePatterns = getNegativePatternsAsPositive(patterns, ignore);
    const staticPatterns = positivePatterns.filter((pattern) => utils.pattern.isStaticPattern(pattern, settings));
    const dynamicPatterns = positivePatterns.filter((pattern) => utils.pattern.isDynamicPattern(pattern, settings));
    const staticTasks = convertPatternsToTasks(staticPatterns, negativePatterns, false);
    const dynamicTasks = convertPatternsToTasks(dynamicPatterns, negativePatterns, true);
    return staticTasks.concat(dynamicTasks);
  };
  var processPatterns = function(input, settings) {
    let patterns = input;
    if (settings.braceExpansion) {
      patterns = utils.pattern.expandPatternsWithBraceExpansion(patterns);
    }
    if (settings.baseNameMatch) {
      patterns = patterns.map((pattern) => pattern.includes("/") ? pattern : `**/${pattern}`);
    }
    return patterns.map((pattern) => utils.pattern.removeDuplicateSlashes(pattern));
  };
  var convertPatternsToTasks = function(positive, negative, dynamic) {
    const tasks = [];
    const patternsOutsideCurrentDirectory = utils.pattern.getPatternsOutsideCurrentDirectory(positive);
    const patternsInsideCurrentDirectory = utils.pattern.getPatternsInsideCurrentDirectory(positive);
    const outsideCurrentDirectoryGroup = groupPatternsByBaseDirectory(patternsOutsideCurrentDirectory);
    const insideCurrentDirectoryGroup = groupPatternsByBaseDirectory(patternsInsideCurrentDirectory);
    tasks.push(...convertPatternGroupsToTasks(outsideCurrentDirectoryGroup, negative, dynamic));
    if ("." in insideCurrentDirectoryGroup) {
      tasks.push(convertPatternGroupToTask(".", patternsInsideCurrentDirectory, negative, dynamic));
    } else {
      tasks.push(...convertPatternGroupsToTasks(insideCurrentDirectoryGroup, negative, dynamic));
    }
    return tasks;
  };
  var getPositivePatterns = function(patterns) {
    return utils.pattern.getPositivePatterns(patterns);
  };
  var getNegativePatternsAsPositive = function(patterns, ignore) {
    const negative = utils.pattern.getNegativePatterns(patterns).concat(ignore);
    const positive = negative.map(utils.pattern.convertToPositivePattern);
    return positive;
  };
  var groupPatternsByBaseDirectory = function(patterns) {
    const group = {};
    return patterns.reduce((collection, pattern) => {
      const base = utils.pattern.getBaseDirectory(pattern);
      if (base in collection) {
        collection[base].push(pattern);
      } else {
        collection[base] = [pattern];
      }
      return collection;
    }, group);
  };
  var convertPatternGroupsToTasks = function(positive, negative, dynamic) {
    return Object.keys(positive).map((base) => {
      return convertPatternGroupToTask(base, positive[base], negative, dynamic);
    });
  };
  var convertPatternGroupToTask = function(base, positive, negative, dynamic) {
    return {
      dynamic,
      positive,
      negative,
      base,
      patterns: [].concat(positive, negative.map(utils.pattern.convertToNegativePattern))
    };
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.convertPatternGroupToTask = exports.convertPatternGroupsToTasks = exports.groupPatternsByBaseDirectory = exports.getNegativePatternsAsPositive = exports.getPositivePatterns = exports.convertPatternsToTasks = exports.generate = undefined;
  var utils = require_utils5();
  exports.generate = generate;
  exports.convertPatternsToTasks = convertPatternsToTasks;
  exports.getPositivePatterns = getPositivePatterns;
  exports.getNegativePatternsAsPositive = getNegativePatternsAsPositive;
  exports.groupPatternsByBaseDirectory = groupPatternsByBaseDirectory;
  exports.convertPatternGroupsToTasks = convertPatternGroupsToTasks;
  exports.convertPatternGroupToTask = convertPatternGroupToTask;
});

// node_modules/@nodelib/fs.stat/out/providers/async.js
var require_async = __commonJS((exports) => {
  var read = function(path, settings, callback) {
    settings.fs.lstat(path, (lstatError, lstat) => {
      if (lstatError !== null) {
        callFailureCallback(callback, lstatError);
        return;
      }
      if (!lstat.isSymbolicLink() || !settings.followSymbolicLink) {
        callSuccessCallback(callback, lstat);
        return;
      }
      settings.fs.stat(path, (statError, stat) => {
        if (statError !== null) {
          if (settings.throwErrorOnBrokenSymbolicLink) {
            callFailureCallback(callback, statError);
            return;
          }
          callSuccessCallback(callback, lstat);
          return;
        }
        if (settings.markSymbolicLink) {
          stat.isSymbolicLink = () => true;
        }
        callSuccessCallback(callback, stat);
      });
    });
  };
  var callFailureCallback = function(callback, error2) {
    callback(error2);
  };
  var callSuccessCallback = function(callback, result) {
    callback(null, result);
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.read = undefined;
  exports.read = read;
});

// node_modules/@nodelib/fs.stat/out/providers/sync.js
var require_sync = __commonJS((exports) => {
  var read = function(path, settings) {
    const lstat = settings.fs.lstatSync(path);
    if (!lstat.isSymbolicLink() || !settings.followSymbolicLink) {
      return lstat;
    }
    try {
      const stat = settings.fs.statSync(path);
      if (settings.markSymbolicLink) {
        stat.isSymbolicLink = () => true;
      }
      return stat;
    } catch (error2) {
      if (!settings.throwErrorOnBrokenSymbolicLink) {
        return lstat;
      }
      throw error2;
    }
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.read = undefined;
  exports.read = read;
});

// node_modules/@nodelib/fs.stat/out/adapters/fs.js
var require_fs3 = __commonJS((exports) => {
  var createFileSystemAdapter = function(fsMethods) {
    if (fsMethods === undefined) {
      return exports.FILE_SYSTEM_ADAPTER;
    }
    return Object.assign(Object.assign({}, exports.FILE_SYSTEM_ADAPTER), fsMethods);
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.createFileSystemAdapter = exports.FILE_SYSTEM_ADAPTER = undefined;
  var fs = import.meta.require("fs");
  exports.FILE_SYSTEM_ADAPTER = {
    lstat: fs.lstat,
    stat: fs.stat,
    lstatSync: fs.lstatSync,
    statSync: fs.statSync
  };
  exports.createFileSystemAdapter = createFileSystemAdapter;
});

// node_modules/@nodelib/fs.stat/out/settings.js
var require_settings = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var fs = require_fs3();

  class Settings {
    constructor(_options = {}) {
      this._options = _options;
      this.followSymbolicLink = this._getValue(this._options.followSymbolicLink, true);
      this.fs = fs.createFileSystemAdapter(this._options.fs);
      this.markSymbolicLink = this._getValue(this._options.markSymbolicLink, false);
      this.throwErrorOnBrokenSymbolicLink = this._getValue(this._options.throwErrorOnBrokenSymbolicLink, true);
    }
    _getValue(option, value) {
      return option !== null && option !== undefined ? option : value;
    }
  }
  exports.default = Settings;
});

// node_modules/@nodelib/fs.stat/out/index.js
var require_out = __commonJS((exports) => {
  var stat = function(path, optionsOrSettingsOrCallback, callback) {
    if (typeof optionsOrSettingsOrCallback === "function") {
      async.read(path, getSettings(), optionsOrSettingsOrCallback);
      return;
    }
    async.read(path, getSettings(optionsOrSettingsOrCallback), callback);
  };
  var statSync3 = function(path, optionsOrSettings) {
    const settings = getSettings(optionsOrSettings);
    return sync2.read(path, settings);
  };
  var getSettings = function(settingsOrOptions = {}) {
    if (settingsOrOptions instanceof settings_1.default) {
      return settingsOrOptions;
    }
    return new settings_1.default(settingsOrOptions);
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.statSync = exports.stat = exports.Settings = undefined;
  var async = require_async();
  var sync2 = require_sync();
  var settings_1 = require_settings();
  exports.Settings = settings_1.default;
  exports.stat = stat;
  exports.statSync = statSync3;
});

// node_modules/queue-microtask/index.js
var require_queue_microtask = __commonJS((exports, module) => {
  /*! queue-microtask. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
  var promise;
  module.exports = typeof queueMicrotask === "function" ? queueMicrotask.bind(typeof window !== "undefined" ? window : global) : (cb) => (promise || (promise = Promise.resolve())).then(cb).catch((err) => setTimeout(() => {
    throw err;
  }, 0));
});

// node_modules/run-parallel/index.js
var require_run_parallel = __commonJS((exports, module) => {
  var runParallel = function(tasks, cb) {
    let results, pending, keys;
    let isSync = true;
    if (Array.isArray(tasks)) {
      results = [];
      pending = tasks.length;
    } else {
      keys = Object.keys(tasks);
      results = {};
      pending = keys.length;
    }
    function done(err) {
      function end() {
        if (cb)
          cb(err, results);
        cb = null;
      }
      if (isSync)
        queueMicrotask2(end);
      else
        end();
    }
    function each(i, err, result) {
      results[i] = result;
      if (--pending === 0 || err) {
        done(err);
      }
    }
    if (!pending) {
      done(null);
    } else if (keys) {
      keys.forEach(function(key) {
        tasks[key](function(err, result) {
          each(key, err, result);
        });
      });
    } else {
      tasks.forEach(function(task, i) {
        task(function(err, result) {
          each(i, err, result);
        });
      });
    }
    isSync = false;
  };
  /*! run-parallel. MIT License. Feross Aboukhadijeh <https://feross.org/opensource> */
  module.exports = runParallel;
  var queueMicrotask2 = require_queue_microtask();
});

// node_modules/@nodelib/fs.scandir/out/constants.js
var require_constants3 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.IS_SUPPORT_READDIR_WITH_FILE_TYPES = undefined;
  var NODE_PROCESS_VERSION_PARTS = process.versions.node.split(".");
  if (NODE_PROCESS_VERSION_PARTS[0] === undefined || NODE_PROCESS_VERSION_PARTS[1] === undefined) {
    throw new Error(`Unexpected behavior. The 'process.versions.node' variable has invalid value: ${process.versions.node}`);
  }
  var MAJOR_VERSION = Number.parseInt(NODE_PROCESS_VERSION_PARTS[0], 10);
  var MINOR_VERSION = Number.parseInt(NODE_PROCESS_VERSION_PARTS[1], 10);
  var SUPPORTED_MAJOR_VERSION = 10;
  var SUPPORTED_MINOR_VERSION = 10;
  var IS_MATCHED_BY_MAJOR = MAJOR_VERSION > SUPPORTED_MAJOR_VERSION;
  var IS_MATCHED_BY_MAJOR_AND_MINOR = MAJOR_VERSION === SUPPORTED_MAJOR_VERSION && MINOR_VERSION >= SUPPORTED_MINOR_VERSION;
  exports.IS_SUPPORT_READDIR_WITH_FILE_TYPES = IS_MATCHED_BY_MAJOR || IS_MATCHED_BY_MAJOR_AND_MINOR;
});

// node_modules/@nodelib/fs.scandir/out/utils/fs.js
var require_fs4 = __commonJS((exports) => {
  var createDirentFromStats = function(name, stats) {
    return new DirentFromStats(name, stats);
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.createDirentFromStats = undefined;

  class DirentFromStats {
    constructor(name, stats) {
      this.name = name;
      this.isBlockDevice = stats.isBlockDevice.bind(stats);
      this.isCharacterDevice = stats.isCharacterDevice.bind(stats);
      this.isDirectory = stats.isDirectory.bind(stats);
      this.isFIFO = stats.isFIFO.bind(stats);
      this.isFile = stats.isFile.bind(stats);
      this.isSocket = stats.isSocket.bind(stats);
      this.isSymbolicLink = stats.isSymbolicLink.bind(stats);
    }
  }
  exports.createDirentFromStats = createDirentFromStats;
});

// node_modules/@nodelib/fs.scandir/out/utils/index.js
var require_utils6 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.fs = undefined;
  var fs = require_fs4();
  exports.fs = fs;
});

// node_modules/@nodelib/fs.scandir/out/providers/common.js
var require_common = __commonJS((exports) => {
  var joinPathSegments = function(a, b, separator) {
    if (a.endsWith(separator)) {
      return a + b;
    }
    return a + separator + b;
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.joinPathSegments = undefined;
  exports.joinPathSegments = joinPathSegments;
});

// node_modules/@nodelib/fs.scandir/out/providers/async.js
var require_async2 = __commonJS((exports) => {
  var read = function(directory, settings, callback) {
    if (!settings.stats && constants_1.IS_SUPPORT_READDIR_WITH_FILE_TYPES) {
      readdirWithFileTypes(directory, settings, callback);
      return;
    }
    readdir(directory, settings, callback);
  };
  var readdirWithFileTypes = function(directory, settings, callback) {
    settings.fs.readdir(directory, { withFileTypes: true }, (readdirError, dirents) => {
      if (readdirError !== null) {
        callFailureCallback(callback, readdirError);
        return;
      }
      const entries = dirents.map((dirent) => ({
        dirent,
        name: dirent.name,
        path: common.joinPathSegments(directory, dirent.name, settings.pathSegmentSeparator)
      }));
      if (!settings.followSymbolicLinks) {
        callSuccessCallback(callback, entries);
        return;
      }
      const tasks = entries.map((entry) => makeRplTaskEntry(entry, settings));
      rpl(tasks, (rplError, rplEntries) => {
        if (rplError !== null) {
          callFailureCallback(callback, rplError);
          return;
        }
        callSuccessCallback(callback, rplEntries);
      });
    });
  };
  var makeRplTaskEntry = function(entry, settings) {
    return (done) => {
      if (!entry.dirent.isSymbolicLink()) {
        done(null, entry);
        return;
      }
      settings.fs.stat(entry.path, (statError, stats) => {
        if (statError !== null) {
          if (settings.throwErrorOnBrokenSymbolicLink) {
            done(statError);
            return;
          }
          done(null, entry);
          return;
        }
        entry.dirent = utils.fs.createDirentFromStats(entry.name, stats);
        done(null, entry);
      });
    };
  };
  var readdir = function(directory, settings, callback) {
    settings.fs.readdir(directory, (readdirError, names) => {
      if (readdirError !== null) {
        callFailureCallback(callback, readdirError);
        return;
      }
      const tasks = names.map((name) => {
        const path = common.joinPathSegments(directory, name, settings.pathSegmentSeparator);
        return (done) => {
          fsStat.stat(path, settings.fsStatSettings, (error2, stats) => {
            if (error2 !== null) {
              done(error2);
              return;
            }
            const entry = {
              name,
              path,
              dirent: utils.fs.createDirentFromStats(name, stats)
            };
            if (settings.stats) {
              entry.stats = stats;
            }
            done(null, entry);
          });
        };
      });
      rpl(tasks, (rplError, entries) => {
        if (rplError !== null) {
          callFailureCallback(callback, rplError);
          return;
        }
        callSuccessCallback(callback, entries);
      });
    });
  };
  var callFailureCallback = function(callback, error2) {
    callback(error2);
  };
  var callSuccessCallback = function(callback, result) {
    callback(null, result);
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.readdir = exports.readdirWithFileTypes = exports.read = undefined;
  var fsStat = require_out();
  var rpl = require_run_parallel();
  var constants_1 = require_constants3();
  var utils = require_utils6();
  var common = require_common();
  exports.read = read;
  exports.readdirWithFileTypes = readdirWithFileTypes;
  exports.readdir = readdir;
});

// node_modules/@nodelib/fs.scandir/out/providers/sync.js
var require_sync2 = __commonJS((exports) => {
  var read = function(directory, settings) {
    if (!settings.stats && constants_1.IS_SUPPORT_READDIR_WITH_FILE_TYPES) {
      return readdirWithFileTypes(directory, settings);
    }
    return readdir(directory, settings);
  };
  var readdirWithFileTypes = function(directory, settings) {
    const dirents = settings.fs.readdirSync(directory, { withFileTypes: true });
    return dirents.map((dirent) => {
      const entry = {
        dirent,
        name: dirent.name,
        path: common.joinPathSegments(directory, dirent.name, settings.pathSegmentSeparator)
      };
      if (entry.dirent.isSymbolicLink() && settings.followSymbolicLinks) {
        try {
          const stats = settings.fs.statSync(entry.path);
          entry.dirent = utils.fs.createDirentFromStats(entry.name, stats);
        } catch (error2) {
          if (settings.throwErrorOnBrokenSymbolicLink) {
            throw error2;
          }
        }
      }
      return entry;
    });
  };
  var readdir = function(directory, settings) {
    const names = settings.fs.readdirSync(directory);
    return names.map((name) => {
      const entryPath = common.joinPathSegments(directory, name, settings.pathSegmentSeparator);
      const stats = fsStat.statSync(entryPath, settings.fsStatSettings);
      const entry = {
        name,
        path: entryPath,
        dirent: utils.fs.createDirentFromStats(name, stats)
      };
      if (settings.stats) {
        entry.stats = stats;
      }
      return entry;
    });
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.readdir = exports.readdirWithFileTypes = exports.read = undefined;
  var fsStat = require_out();
  var constants_1 = require_constants3();
  var utils = require_utils6();
  var common = require_common();
  exports.read = read;
  exports.readdirWithFileTypes = readdirWithFileTypes;
  exports.readdir = readdir;
});

// node_modules/@nodelib/fs.scandir/out/adapters/fs.js
var require_fs5 = __commonJS((exports) => {
  var createFileSystemAdapter = function(fsMethods) {
    if (fsMethods === undefined) {
      return exports.FILE_SYSTEM_ADAPTER;
    }
    return Object.assign(Object.assign({}, exports.FILE_SYSTEM_ADAPTER), fsMethods);
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.createFileSystemAdapter = exports.FILE_SYSTEM_ADAPTER = undefined;
  var fs = import.meta.require("fs");
  exports.FILE_SYSTEM_ADAPTER = {
    lstat: fs.lstat,
    stat: fs.stat,
    lstatSync: fs.lstatSync,
    statSync: fs.statSync,
    readdir: fs.readdir,
    readdirSync: fs.readdirSync
  };
  exports.createFileSystemAdapter = createFileSystemAdapter;
});

// node_modules/@nodelib/fs.scandir/out/settings.js
var require_settings2 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var path = import.meta.require("path");
  var fsStat = require_out();
  var fs = require_fs5();

  class Settings {
    constructor(_options = {}) {
      this._options = _options;
      this.followSymbolicLinks = this._getValue(this._options.followSymbolicLinks, false);
      this.fs = fs.createFileSystemAdapter(this._options.fs);
      this.pathSegmentSeparator = this._getValue(this._options.pathSegmentSeparator, path.sep);
      this.stats = this._getValue(this._options.stats, false);
      this.throwErrorOnBrokenSymbolicLink = this._getValue(this._options.throwErrorOnBrokenSymbolicLink, true);
      this.fsStatSettings = new fsStat.Settings({
        followSymbolicLink: this.followSymbolicLinks,
        fs: this.fs,
        throwErrorOnBrokenSymbolicLink: this.throwErrorOnBrokenSymbolicLink
      });
    }
    _getValue(option, value) {
      return option !== null && option !== undefined ? option : value;
    }
  }
  exports.default = Settings;
});

// node_modules/@nodelib/fs.scandir/out/index.js
var require_out2 = __commonJS((exports) => {
  var scandir = function(path, optionsOrSettingsOrCallback, callback) {
    if (typeof optionsOrSettingsOrCallback === "function") {
      async.read(path, getSettings(), optionsOrSettingsOrCallback);
      return;
    }
    async.read(path, getSettings(optionsOrSettingsOrCallback), callback);
  };
  var scandirSync = function(path, optionsOrSettings) {
    const settings = getSettings(optionsOrSettings);
    return sync2.read(path, settings);
  };
  var getSettings = function(settingsOrOptions = {}) {
    if (settingsOrOptions instanceof settings_1.default) {
      return settingsOrOptions;
    }
    return new settings_1.default(settingsOrOptions);
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.Settings = exports.scandirSync = exports.scandir = undefined;
  var async = require_async2();
  var sync2 = require_sync2();
  var settings_1 = require_settings2();
  exports.Settings = settings_1.default;
  exports.scandir = scandir;
  exports.scandirSync = scandirSync;
});

// node_modules/reusify/reusify.js
var require_reusify = __commonJS((exports, module) => {
  var reusify = function(Constructor) {
    var head = new Constructor;
    var tail = head;
    function get() {
      var current = head;
      if (current.next) {
        head = current.next;
      } else {
        head = new Constructor;
        tail = head;
      }
      current.next = null;
      return current;
    }
    function release(obj) {
      tail.next = obj;
      tail = obj;
    }
    return {
      get,
      release
    };
  };
  module.exports = reusify;
});

// node_modules/fastq/queue.js
var require_queue = __commonJS((exports, module) => {
  var fastqueue = function(context, worker, concurrency) {
    if (typeof context === "function") {
      concurrency = worker;
      worker = context;
      context = null;
    }
    if (concurrency < 1) {
      throw new Error("fastqueue concurrency must be greater than 1");
    }
    var cache = reusify(Task);
    var queueHead = null;
    var queueTail = null;
    var _running = 0;
    var errorHandler = null;
    var self = {
      push,
      drain: noop,
      saturated: noop,
      pause,
      paused: false,
      concurrency,
      running,
      resume,
      idle,
      length,
      getQueue,
      unshift,
      empty: noop,
      kill: kill2,
      killAndDrain,
      error: error2
    };
    return self;
    function running() {
      return _running;
    }
    function pause() {
      self.paused = true;
    }
    function length() {
      var current = queueHead;
      var counter = 0;
      while (current) {
        current = current.next;
        counter++;
      }
      return counter;
    }
    function getQueue() {
      var current = queueHead;
      var tasks = [];
      while (current) {
        tasks.push(current.value);
        current = current.next;
      }
      return tasks;
    }
    function resume() {
      if (!self.paused)
        return;
      self.paused = false;
      for (var i = 0;i < self.concurrency; i++) {
        _running++;
        release();
      }
    }
    function idle() {
      return _running === 0 && self.length() === 0;
    }
    function push(value, done) {
      var current = cache.get();
      current.context = context;
      current.release = release;
      current.value = value;
      current.callback = done || noop;
      current.errorHandler = errorHandler;
      if (_running === self.concurrency || self.paused) {
        if (queueTail) {
          queueTail.next = current;
          queueTail = current;
        } else {
          queueHead = current;
          queueTail = current;
          self.saturated();
        }
      } else {
        _running++;
        worker.call(context, current.value, current.worked);
      }
    }
    function unshift(value, done) {
      var current = cache.get();
      current.context = context;
      current.release = release;
      current.value = value;
      current.callback = done || noop;
      if (_running === self.concurrency || self.paused) {
        if (queueHead) {
          current.next = queueHead;
          queueHead = current;
        } else {
          queueHead = current;
          queueTail = current;
          self.saturated();
        }
      } else {
        _running++;
        worker.call(context, current.value, current.worked);
      }
    }
    function release(holder) {
      if (holder) {
        cache.release(holder);
      }
      var next = queueHead;
      if (next) {
        if (!self.paused) {
          if (queueTail === queueHead) {
            queueTail = null;
          }
          queueHead = next.next;
          next.next = null;
          worker.call(context, next.value, next.worked);
          if (queueTail === null) {
            self.empty();
          }
        } else {
          _running--;
        }
      } else if (--_running === 0) {
        self.drain();
      }
    }
    function kill2() {
      queueHead = null;
      queueTail = null;
      self.drain = noop;
    }
    function killAndDrain() {
      queueHead = null;
      queueTail = null;
      self.drain();
      self.drain = noop;
    }
    function error2(handler) {
      errorHandler = handler;
    }
  };
  var noop = function() {
  };
  var Task = function() {
    this.value = null;
    this.callback = noop;
    this.next = null;
    this.release = noop;
    this.context = null;
    this.errorHandler = null;
    var self = this;
    this.worked = function worked(err, result) {
      var callback = self.callback;
      var errorHandler = self.errorHandler;
      var val = self.value;
      self.value = null;
      self.callback = noop;
      if (self.errorHandler) {
        errorHandler(err, val);
      }
      callback.call(self.context, err, result);
      self.release(self);
    };
  };
  var queueAsPromised = function(context, worker, concurrency) {
    if (typeof context === "function") {
      concurrency = worker;
      worker = context;
      context = null;
    }
    function asyncWrapper(arg, cb) {
      worker.call(this, arg).then(function(res) {
        cb(null, res);
      }, cb);
    }
    var queue = fastqueue(context, asyncWrapper, concurrency);
    var pushCb = queue.push;
    var unshiftCb = queue.unshift;
    queue.push = push;
    queue.unshift = unshift;
    queue.drained = drained;
    return queue;
    function push(value) {
      var p = new Promise(function(resolve5, reject) {
        pushCb(value, function(err, result) {
          if (err) {
            reject(err);
            return;
          }
          resolve5(result);
        });
      });
      p.catch(noop);
      return p;
    }
    function unshift(value) {
      var p = new Promise(function(resolve5, reject) {
        unshiftCb(value, function(err, result) {
          if (err) {
            reject(err);
            return;
          }
          resolve5(result);
        });
      });
      p.catch(noop);
      return p;
    }
    function drained() {
      if (queue.idle()) {
        return new Promise(function(resolve5) {
          resolve5();
        });
      }
      var previousDrain = queue.drain;
      var p = new Promise(function(resolve5) {
        queue.drain = function() {
          previousDrain();
          resolve5();
        };
      });
      return p;
    }
  };
  var reusify = require_reusify();
  module.exports = fastqueue;
  module.exports.promise = queueAsPromised;
});

// node_modules/@nodelib/fs.walk/out/readers/common.js
var require_common2 = __commonJS((exports) => {
  var isFatalError = function(settings, error2) {
    if (settings.errorFilter === null) {
      return true;
    }
    return !settings.errorFilter(error2);
  };
  var isAppliedFilter = function(filter, value) {
    return filter === null || filter(value);
  };
  var replacePathSegmentSeparator = function(filepath, separator) {
    return filepath.split(/[/\\]/).join(separator);
  };
  var joinPathSegments = function(a, b, separator) {
    if (a === "") {
      return b;
    }
    if (a.endsWith(separator)) {
      return a + b;
    }
    return a + separator + b;
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.joinPathSegments = exports.replacePathSegmentSeparator = exports.isAppliedFilter = exports.isFatalError = undefined;
  exports.isFatalError = isFatalError;
  exports.isAppliedFilter = isAppliedFilter;
  exports.replacePathSegmentSeparator = replacePathSegmentSeparator;
  exports.joinPathSegments = joinPathSegments;
});

// node_modules/@nodelib/fs.walk/out/readers/reader.js
var require_reader = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var common = require_common2();

  class Reader {
    constructor(_root, _settings) {
      this._root = _root;
      this._settings = _settings;
      this._root = common.replacePathSegmentSeparator(_root, _settings.pathSegmentSeparator);
    }
  }
  exports.default = Reader;
});

// node_modules/@nodelib/fs.walk/out/readers/async.js
var require_async3 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var events_1 = import.meta.require("events");
  var fsScandir = require_out2();
  var fastq = require_queue();
  var common = require_common2();
  var reader_1 = require_reader();

  class AsyncReader extends reader_1.default {
    constructor(_root, _settings) {
      super(_root, _settings);
      this._settings = _settings;
      this._scandir = fsScandir.scandir;
      this._emitter = new events_1.EventEmitter;
      this._queue = fastq(this._worker.bind(this), this._settings.concurrency);
      this._isFatalError = false;
      this._isDestroyed = false;
      this._queue.drain = () => {
        if (!this._isFatalError) {
          this._emitter.emit("end");
        }
      };
    }
    read() {
      this._isFatalError = false;
      this._isDestroyed = false;
      setImmediate(() => {
        this._pushToQueue(this._root, this._settings.basePath);
      });
      return this._emitter;
    }
    get isDestroyed() {
      return this._isDestroyed;
    }
    destroy() {
      if (this._isDestroyed) {
        throw new Error("The reader is already destroyed");
      }
      this._isDestroyed = true;
      this._queue.killAndDrain();
    }
    onEntry(callback) {
      this._emitter.on("entry", callback);
    }
    onError(callback) {
      this._emitter.once("error", callback);
    }
    onEnd(callback) {
      this._emitter.once("end", callback);
    }
    _pushToQueue(directory, base) {
      const queueItem = { directory, base };
      this._queue.push(queueItem, (error2) => {
        if (error2 !== null) {
          this._handleError(error2);
        }
      });
    }
    _worker(item, done) {
      this._scandir(item.directory, this._settings.fsScandirSettings, (error2, entries) => {
        if (error2 !== null) {
          done(error2, undefined);
          return;
        }
        for (const entry of entries) {
          this._handleEntry(entry, item.base);
        }
        done(null, undefined);
      });
    }
    _handleError(error2) {
      if (this._isDestroyed || !common.isFatalError(this._settings, error2)) {
        return;
      }
      this._isFatalError = true;
      this._isDestroyed = true;
      this._emitter.emit("error", error2);
    }
    _handleEntry(entry, base) {
      if (this._isDestroyed || this._isFatalError) {
        return;
      }
      const fullpath = entry.path;
      if (base !== undefined) {
        entry.path = common.joinPathSegments(base, entry.name, this._settings.pathSegmentSeparator);
      }
      if (common.isAppliedFilter(this._settings.entryFilter, entry)) {
        this._emitEntry(entry);
      }
      if (entry.dirent.isDirectory() && common.isAppliedFilter(this._settings.deepFilter, entry)) {
        this._pushToQueue(fullpath, base === undefined ? undefined : entry.path);
      }
    }
    _emitEntry(entry) {
      this._emitter.emit("entry", entry);
    }
  }
  exports.default = AsyncReader;
});

// node_modules/@nodelib/fs.walk/out/providers/async.js
var require_async4 = __commonJS((exports) => {
  var callFailureCallback = function(callback, error2) {
    callback(error2);
  };
  var callSuccessCallback = function(callback, entries) {
    callback(null, entries);
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  var async_1 = require_async3();

  class AsyncProvider {
    constructor(_root, _settings) {
      this._root = _root;
      this._settings = _settings;
      this._reader = new async_1.default(this._root, this._settings);
      this._storage = [];
    }
    read(callback) {
      this._reader.onError((error2) => {
        callFailureCallback(callback, error2);
      });
      this._reader.onEntry((entry) => {
        this._storage.push(entry);
      });
      this._reader.onEnd(() => {
        callSuccessCallback(callback, this._storage);
      });
      this._reader.read();
    }
  }
  exports.default = AsyncProvider;
});

// node_modules/@nodelib/fs.walk/out/providers/stream.js
var require_stream2 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var stream_1 = import.meta.require("stream");
  var async_1 = require_async3();

  class StreamProvider {
    constructor(_root, _settings) {
      this._root = _root;
      this._settings = _settings;
      this._reader = new async_1.default(this._root, this._settings);
      this._stream = new stream_1.Readable({
        objectMode: true,
        read: () => {
        },
        destroy: () => {
          if (!this._reader.isDestroyed) {
            this._reader.destroy();
          }
        }
      });
    }
    read() {
      this._reader.onError((error2) => {
        this._stream.emit("error", error2);
      });
      this._reader.onEntry((entry) => {
        this._stream.push(entry);
      });
      this._reader.onEnd(() => {
        this._stream.push(null);
      });
      this._reader.read();
      return this._stream;
    }
  }
  exports.default = StreamProvider;
});

// node_modules/@nodelib/fs.walk/out/readers/sync.js
var require_sync3 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var fsScandir = require_out2();
  var common = require_common2();
  var reader_1 = require_reader();

  class SyncReader extends reader_1.default {
    constructor() {
      super(...arguments);
      this._scandir = fsScandir.scandirSync;
      this._storage = [];
      this._queue = new Set;
    }
    read() {
      this._pushToQueue(this._root, this._settings.basePath);
      this._handleQueue();
      return this._storage;
    }
    _pushToQueue(directory, base) {
      this._queue.add({ directory, base });
    }
    _handleQueue() {
      for (const item of this._queue.values()) {
        this._handleDirectory(item.directory, item.base);
      }
    }
    _handleDirectory(directory, base) {
      try {
        const entries = this._scandir(directory, this._settings.fsScandirSettings);
        for (const entry of entries) {
          this._handleEntry(entry, base);
        }
      } catch (error2) {
        this._handleError(error2);
      }
    }
    _handleError(error2) {
      if (!common.isFatalError(this._settings, error2)) {
        return;
      }
      throw error2;
    }
    _handleEntry(entry, base) {
      const fullpath = entry.path;
      if (base !== undefined) {
        entry.path = common.joinPathSegments(base, entry.name, this._settings.pathSegmentSeparator);
      }
      if (common.isAppliedFilter(this._settings.entryFilter, entry)) {
        this._pushToStorage(entry);
      }
      if (entry.dirent.isDirectory() && common.isAppliedFilter(this._settings.deepFilter, entry)) {
        this._pushToQueue(fullpath, base === undefined ? undefined : entry.path);
      }
    }
    _pushToStorage(entry) {
      this._storage.push(entry);
    }
  }
  exports.default = SyncReader;
});

// node_modules/@nodelib/fs.walk/out/providers/sync.js
var require_sync4 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var sync_1 = require_sync3();

  class SyncProvider {
    constructor(_root, _settings) {
      this._root = _root;
      this._settings = _settings;
      this._reader = new sync_1.default(this._root, this._settings);
    }
    read() {
      return this._reader.read();
    }
  }
  exports.default = SyncProvider;
});

// node_modules/@nodelib/fs.walk/out/settings.js
var require_settings3 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var path = import.meta.require("path");
  var fsScandir = require_out2();

  class Settings {
    constructor(_options = {}) {
      this._options = _options;
      this.basePath = this._getValue(this._options.basePath, undefined);
      this.concurrency = this._getValue(this._options.concurrency, Number.POSITIVE_INFINITY);
      this.deepFilter = this._getValue(this._options.deepFilter, null);
      this.entryFilter = this._getValue(this._options.entryFilter, null);
      this.errorFilter = this._getValue(this._options.errorFilter, null);
      this.pathSegmentSeparator = this._getValue(this._options.pathSegmentSeparator, path.sep);
      this.fsScandirSettings = new fsScandir.Settings({
        followSymbolicLinks: this._options.followSymbolicLinks,
        fs: this._options.fs,
        pathSegmentSeparator: this._options.pathSegmentSeparator,
        stats: this._options.stats,
        throwErrorOnBrokenSymbolicLink: this._options.throwErrorOnBrokenSymbolicLink
      });
    }
    _getValue(option, value) {
      return option !== null && option !== undefined ? option : value;
    }
  }
  exports.default = Settings;
});

// node_modules/@nodelib/fs.walk/out/index.js
var require_out3 = __commonJS((exports) => {
  var walk = function(directory, optionsOrSettingsOrCallback, callback) {
    if (typeof optionsOrSettingsOrCallback === "function") {
      new async_1.default(directory, getSettings()).read(optionsOrSettingsOrCallback);
      return;
    }
    new async_1.default(directory, getSettings(optionsOrSettingsOrCallback)).read(callback);
  };
  var walkSync = function(directory, optionsOrSettings) {
    const settings = getSettings(optionsOrSettings);
    const provider = new sync_1.default(directory, settings);
    return provider.read();
  };
  var walkStream = function(directory, optionsOrSettings) {
    const settings = getSettings(optionsOrSettings);
    const provider = new stream_1.default(directory, settings);
    return provider.read();
  };
  var getSettings = function(settingsOrOptions = {}) {
    if (settingsOrOptions instanceof settings_1.default) {
      return settingsOrOptions;
    }
    return new settings_1.default(settingsOrOptions);
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.Settings = exports.walkStream = exports.walkSync = exports.walk = undefined;
  var async_1 = require_async4();
  var stream_1 = require_stream2();
  var sync_1 = require_sync4();
  var settings_1 = require_settings3();
  exports.Settings = settings_1.default;
  exports.walk = walk;
  exports.walkSync = walkSync;
  exports.walkStream = walkStream;
});

// node_modules/fast-glob/out/readers/reader.js
var require_reader2 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var path = import.meta.require("path");
  var fsStat = require_out();
  var utils = require_utils5();

  class Reader {
    constructor(_settings) {
      this._settings = _settings;
      this._fsStatSettings = new fsStat.Settings({
        followSymbolicLink: this._settings.followSymbolicLinks,
        fs: this._settings.fs,
        throwErrorOnBrokenSymbolicLink: this._settings.followSymbolicLinks
      });
    }
    _getFullEntryPath(filepath) {
      return path.resolve(this._settings.cwd, filepath);
    }
    _makeEntry(stats, pattern) {
      const entry = {
        name: pattern,
        path: pattern,
        dirent: utils.fs.createDirentFromStats(pattern, stats)
      };
      if (this._settings.stats) {
        entry.stats = stats;
      }
      return entry;
    }
    _isFatalError(error2) {
      return !utils.errno.isEnoentCodeError(error2) && !this._settings.suppressErrors;
    }
  }
  exports.default = Reader;
});

// node_modules/fast-glob/out/readers/stream.js
var require_stream3 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var stream_1 = import.meta.require("stream");
  var fsStat = require_out();
  var fsWalk = require_out3();
  var reader_1 = require_reader2();

  class ReaderStream extends reader_1.default {
    constructor() {
      super(...arguments);
      this._walkStream = fsWalk.walkStream;
      this._stat = fsStat.stat;
    }
    dynamic(root, options) {
      return this._walkStream(root, options);
    }
    static(patterns, options) {
      const filepaths = patterns.map(this._getFullEntryPath, this);
      const stream = new stream_1.PassThrough({ objectMode: true });
      stream._write = (index, _enc, done) => {
        return this._getEntry(filepaths[index], patterns[index], options).then((entry) => {
          if (entry !== null && options.entryFilter(entry)) {
            stream.push(entry);
          }
          if (index === filepaths.length - 1) {
            stream.end();
          }
          done();
        }).catch(done);
      };
      for (let i = 0;i < filepaths.length; i++) {
        stream.write(i);
      }
      return stream;
    }
    _getEntry(filepath, pattern, options) {
      return this._getStat(filepath).then((stats) => this._makeEntry(stats, pattern)).catch((error2) => {
        if (options.errorFilter(error2)) {
          return null;
        }
        throw error2;
      });
    }
    _getStat(filepath) {
      return new Promise((resolve5, reject) => {
        this._stat(filepath, this._fsStatSettings, (error2, stats) => {
          return error2 === null ? resolve5(stats) : reject(error2);
        });
      });
    }
  }
  exports.default = ReaderStream;
});

// node_modules/fast-glob/out/readers/async.js
var require_async5 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var fsWalk = require_out3();
  var reader_1 = require_reader2();
  var stream_1 = require_stream3();

  class ReaderAsync extends reader_1.default {
    constructor() {
      super(...arguments);
      this._walkAsync = fsWalk.walk;
      this._readerStream = new stream_1.default(this._settings);
    }
    dynamic(root, options) {
      return new Promise((resolve5, reject) => {
        this._walkAsync(root, options, (error2, entries) => {
          if (error2 === null) {
            resolve5(entries);
          } else {
            reject(error2);
          }
        });
      });
    }
    async static(patterns, options) {
      const entries = [];
      const stream = this._readerStream.static(patterns, options);
      return new Promise((resolve5, reject) => {
        stream.once("error", reject);
        stream.on("data", (entry) => entries.push(entry));
        stream.once("end", () => resolve5(entries));
      });
    }
  }
  exports.default = ReaderAsync;
});

// node_modules/fast-glob/out/providers/matchers/matcher.js
var require_matcher = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var utils = require_utils5();

  class Matcher {
    constructor(_patterns, _settings, _micromatchOptions) {
      this._patterns = _patterns;
      this._settings = _settings;
      this._micromatchOptions = _micromatchOptions;
      this._storage = [];
      this._fillStorage();
    }
    _fillStorage() {
      for (const pattern of this._patterns) {
        const segments = this._getPatternSegments(pattern);
        const sections = this._splitSegmentsIntoSections(segments);
        this._storage.push({
          complete: sections.length <= 1,
          pattern,
          segments,
          sections
        });
      }
    }
    _getPatternSegments(pattern) {
      const parts = utils.pattern.getPatternParts(pattern, this._micromatchOptions);
      return parts.map((part) => {
        const dynamic = utils.pattern.isDynamicPattern(part, this._settings);
        if (!dynamic) {
          return {
            dynamic: false,
            pattern: part
          };
        }
        return {
          dynamic: true,
          pattern: part,
          patternRe: utils.pattern.makeRe(part, this._micromatchOptions)
        };
      });
    }
    _splitSegmentsIntoSections(segments) {
      return utils.array.splitWhen(segments, (segment) => segment.dynamic && utils.pattern.hasGlobStar(segment.pattern));
    }
  }
  exports.default = Matcher;
});

// node_modules/fast-glob/out/providers/matchers/partial.js
var require_partial = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var matcher_1 = require_matcher();

  class PartialMatcher extends matcher_1.default {
    match(filepath) {
      const parts = filepath.split("/");
      const levels = parts.length;
      const patterns = this._storage.filter((info2) => !info2.complete || info2.segments.length > levels);
      for (const pattern of patterns) {
        const section = pattern.sections[0];
        if (!pattern.complete && levels > section.length) {
          return true;
        }
        const match = parts.every((part, index) => {
          const segment = pattern.segments[index];
          if (segment.dynamic && segment.patternRe.test(part)) {
            return true;
          }
          if (!segment.dynamic && segment.pattern === part) {
            return true;
          }
          return false;
        });
        if (match) {
          return true;
        }
      }
      return false;
    }
  }
  exports.default = PartialMatcher;
});

// node_modules/fast-glob/out/providers/filters/deep.js
var require_deep = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var utils = require_utils5();
  var partial_1 = require_partial();

  class DeepFilter {
    constructor(_settings, _micromatchOptions) {
      this._settings = _settings;
      this._micromatchOptions = _micromatchOptions;
    }
    getFilter(basePath, positive, negative) {
      const matcher = this._getMatcher(positive);
      const negativeRe = this._getNegativePatternsRe(negative);
      return (entry) => this._filter(basePath, entry, matcher, negativeRe);
    }
    _getMatcher(patterns) {
      return new partial_1.default(patterns, this._settings, this._micromatchOptions);
    }
    _getNegativePatternsRe(patterns) {
      const affectDepthOfReadingPatterns = patterns.filter(utils.pattern.isAffectDepthOfReadingPattern);
      return utils.pattern.convertPatternsToRe(affectDepthOfReadingPatterns, this._micromatchOptions);
    }
    _filter(basePath, entry, matcher, negativeRe) {
      if (this._isSkippedByDeep(basePath, entry.path)) {
        return false;
      }
      if (this._isSkippedSymbolicLink(entry)) {
        return false;
      }
      const filepath = utils.path.removeLeadingDotSegment(entry.path);
      if (this._isSkippedByPositivePatterns(filepath, matcher)) {
        return false;
      }
      return this._isSkippedByNegativePatterns(filepath, negativeRe);
    }
    _isSkippedByDeep(basePath, entryPath) {
      if (this._settings.deep === Infinity) {
        return false;
      }
      return this._getEntryLevel(basePath, entryPath) >= this._settings.deep;
    }
    _getEntryLevel(basePath, entryPath) {
      const entryPathDepth = entryPath.split("/").length;
      if (basePath === "") {
        return entryPathDepth;
      }
      const basePathDepth = basePath.split("/").length;
      return entryPathDepth - basePathDepth;
    }
    _isSkippedSymbolicLink(entry) {
      return !this._settings.followSymbolicLinks && entry.dirent.isSymbolicLink();
    }
    _isSkippedByPositivePatterns(entryPath, matcher) {
      return !this._settings.baseNameMatch && !matcher.match(entryPath);
    }
    _isSkippedByNegativePatterns(entryPath, patternsRe) {
      return !utils.pattern.matchAny(entryPath, patternsRe);
    }
  }
  exports.default = DeepFilter;
});

// node_modules/fast-glob/out/providers/filters/entry.js
var require_entry = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var utils = require_utils5();

  class EntryFilter {
    constructor(_settings, _micromatchOptions) {
      this._settings = _settings;
      this._micromatchOptions = _micromatchOptions;
      this.index = new Map;
    }
    getFilter(positive, negative) {
      const positiveRe = utils.pattern.convertPatternsToRe(positive, this._micromatchOptions);
      const negativeRe = utils.pattern.convertPatternsToRe(negative, Object.assign(Object.assign({}, this._micromatchOptions), { dot: true }));
      return (entry) => this._filter(entry, positiveRe, negativeRe);
    }
    _filter(entry, positiveRe, negativeRe) {
      const filepath = utils.path.removeLeadingDotSegment(entry.path);
      if (this._settings.unique && this._isDuplicateEntry(filepath)) {
        return false;
      }
      if (this._onlyFileFilter(entry) || this._onlyDirectoryFilter(entry)) {
        return false;
      }
      if (this._isSkippedByAbsoluteNegativePatterns(filepath, negativeRe)) {
        return false;
      }
      const isDirectory = entry.dirent.isDirectory();
      const isMatched = this._isMatchToPatterns(filepath, positiveRe, isDirectory) && !this._isMatchToPatterns(filepath, negativeRe, isDirectory);
      if (this._settings.unique && isMatched) {
        this._createIndexRecord(filepath);
      }
      return isMatched;
    }
    _isDuplicateEntry(filepath) {
      return this.index.has(filepath);
    }
    _createIndexRecord(filepath) {
      this.index.set(filepath, undefined);
    }
    _onlyFileFilter(entry) {
      return this._settings.onlyFiles && !entry.dirent.isFile();
    }
    _onlyDirectoryFilter(entry) {
      return this._settings.onlyDirectories && !entry.dirent.isDirectory();
    }
    _isSkippedByAbsoluteNegativePatterns(entryPath, patternsRe) {
      if (!this._settings.absolute) {
        return false;
      }
      const fullpath = utils.path.makeAbsolute(this._settings.cwd, entryPath);
      return utils.pattern.matchAny(fullpath, patternsRe);
    }
    _isMatchToPatterns(filepath, patternsRe, isDirectory) {
      const isMatched = utils.pattern.matchAny(filepath, patternsRe);
      if (!isMatched && isDirectory) {
        return utils.pattern.matchAny(filepath + "/", patternsRe);
      }
      return isMatched;
    }
  }
  exports.default = EntryFilter;
});

// node_modules/fast-glob/out/providers/filters/error.js
var require_error = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var utils = require_utils5();

  class ErrorFilter {
    constructor(_settings) {
      this._settings = _settings;
    }
    getFilter() {
      return (error2) => this._isNonFatalError(error2);
    }
    _isNonFatalError(error2) {
      return utils.errno.isEnoentCodeError(error2) || this._settings.suppressErrors;
    }
  }
  exports.default = ErrorFilter;
});

// node_modules/fast-glob/out/providers/transformers/entry.js
var require_entry2 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var utils = require_utils5();

  class EntryTransformer {
    constructor(_settings) {
      this._settings = _settings;
    }
    getTransformer() {
      return (entry) => this._transform(entry);
    }
    _transform(entry) {
      let filepath = entry.path;
      if (this._settings.absolute) {
        filepath = utils.path.makeAbsolute(this._settings.cwd, filepath);
        filepath = utils.path.unixify(filepath);
      }
      if (this._settings.markDirectories && entry.dirent.isDirectory()) {
        filepath += "/";
      }
      if (!this._settings.objectMode) {
        return filepath;
      }
      return Object.assign(Object.assign({}, entry), { path: filepath });
    }
  }
  exports.default = EntryTransformer;
});

// node_modules/fast-glob/out/providers/provider.js
var require_provider = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var path = import.meta.require("path");
  var deep_1 = require_deep();
  var entry_1 = require_entry();
  var error_1 = require_error();
  var entry_2 = require_entry2();

  class Provider {
    constructor(_settings) {
      this._settings = _settings;
      this.errorFilter = new error_1.default(this._settings);
      this.entryFilter = new entry_1.default(this._settings, this._getMicromatchOptions());
      this.deepFilter = new deep_1.default(this._settings, this._getMicromatchOptions());
      this.entryTransformer = new entry_2.default(this._settings);
    }
    _getRootDirectory(task) {
      return path.resolve(this._settings.cwd, task.base);
    }
    _getReaderOptions(task) {
      const basePath = task.base === "." ? "" : task.base;
      return {
        basePath,
        pathSegmentSeparator: "/",
        concurrency: this._settings.concurrency,
        deepFilter: this.deepFilter.getFilter(basePath, task.positive, task.negative),
        entryFilter: this.entryFilter.getFilter(task.positive, task.negative),
        errorFilter: this.errorFilter.getFilter(),
        followSymbolicLinks: this._settings.followSymbolicLinks,
        fs: this._settings.fs,
        stats: this._settings.stats,
        throwErrorOnBrokenSymbolicLink: this._settings.throwErrorOnBrokenSymbolicLink,
        transform: this.entryTransformer.getTransformer()
      };
    }
    _getMicromatchOptions() {
      return {
        dot: this._settings.dot,
        matchBase: this._settings.baseNameMatch,
        nobrace: !this._settings.braceExpansion,
        nocase: !this._settings.caseSensitiveMatch,
        noext: !this._settings.extglob,
        noglobstar: !this._settings.globstar,
        posix: true,
        strictSlashes: false
      };
    }
  }
  exports.default = Provider;
});

// node_modules/fast-glob/out/providers/async.js
var require_async6 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var async_1 = require_async5();
  var provider_1 = require_provider();

  class ProviderAsync extends provider_1.default {
    constructor() {
      super(...arguments);
      this._reader = new async_1.default(this._settings);
    }
    async read(task) {
      const root = this._getRootDirectory(task);
      const options = this._getReaderOptions(task);
      const entries = await this.api(root, task, options);
      return entries.map((entry) => options.transform(entry));
    }
    api(root, task, options) {
      if (task.dynamic) {
        return this._reader.dynamic(root, options);
      }
      return this._reader.static(task.patterns, options);
    }
  }
  exports.default = ProviderAsync;
});

// node_modules/fast-glob/out/providers/stream.js
var require_stream4 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var stream_1 = import.meta.require("stream");
  var stream_2 = require_stream3();
  var provider_1 = require_provider();

  class ProviderStream extends provider_1.default {
    constructor() {
      super(...arguments);
      this._reader = new stream_2.default(this._settings);
    }
    read(task) {
      const root = this._getRootDirectory(task);
      const options = this._getReaderOptions(task);
      const source = this.api(root, task, options);
      const destination = new stream_1.Readable({ objectMode: true, read: () => {
      } });
      source.once("error", (error2) => destination.emit("error", error2)).on("data", (entry) => destination.emit("data", options.transform(entry))).once("end", () => destination.emit("end"));
      destination.once("close", () => source.destroy());
      return destination;
    }
    api(root, task, options) {
      if (task.dynamic) {
        return this._reader.dynamic(root, options);
      }
      return this._reader.static(task.patterns, options);
    }
  }
  exports.default = ProviderStream;
});

// node_modules/fast-glob/out/readers/sync.js
var require_sync5 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var fsStat = require_out();
  var fsWalk = require_out3();
  var reader_1 = require_reader2();

  class ReaderSync extends reader_1.default {
    constructor() {
      super(...arguments);
      this._walkSync = fsWalk.walkSync;
      this._statSync = fsStat.statSync;
    }
    dynamic(root, options) {
      return this._walkSync(root, options);
    }
    static(patterns, options) {
      const entries = [];
      for (const pattern of patterns) {
        const filepath = this._getFullEntryPath(pattern);
        const entry = this._getEntry(filepath, pattern, options);
        if (entry === null || !options.entryFilter(entry)) {
          continue;
        }
        entries.push(entry);
      }
      return entries;
    }
    _getEntry(filepath, pattern, options) {
      try {
        const stats = this._getStat(filepath);
        return this._makeEntry(stats, pattern);
      } catch (error2) {
        if (options.errorFilter(error2)) {
          return null;
        }
        throw error2;
      }
    }
    _getStat(filepath) {
      return this._statSync(filepath, this._fsStatSettings);
    }
  }
  exports.default = ReaderSync;
});

// node_modules/fast-glob/out/providers/sync.js
var require_sync6 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  var sync_1 = require_sync5();
  var provider_1 = require_provider();

  class ProviderSync extends provider_1.default {
    constructor() {
      super(...arguments);
      this._reader = new sync_1.default(this._settings);
    }
    read(task) {
      const root = this._getRootDirectory(task);
      const options = this._getReaderOptions(task);
      const entries = this.api(root, task, options);
      return entries.map(options.transform);
    }
    api(root, task, options) {
      if (task.dynamic) {
        return this._reader.dynamic(root, options);
      }
      return this._reader.static(task.patterns, options);
    }
  }
  exports.default = ProviderSync;
});

// node_modules/fast-glob/out/settings.js
var require_settings4 = __commonJS((exports) => {
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.DEFAULT_FILE_SYSTEM_ADAPTER = undefined;
  var fs = import.meta.require("fs");
  var os = import.meta.require("os");
  var CPU_COUNT = Math.max(os.cpus().length, 1);
  exports.DEFAULT_FILE_SYSTEM_ADAPTER = {
    lstat: fs.lstat,
    lstatSync: fs.lstatSync,
    stat: fs.stat,
    statSync: fs.statSync,
    readdir: fs.readdir,
    readdirSync: fs.readdirSync
  };

  class Settings {
    constructor(_options = {}) {
      this._options = _options;
      this.absolute = this._getValue(this._options.absolute, false);
      this.baseNameMatch = this._getValue(this._options.baseNameMatch, false);
      this.braceExpansion = this._getValue(this._options.braceExpansion, true);
      this.caseSensitiveMatch = this._getValue(this._options.caseSensitiveMatch, true);
      this.concurrency = this._getValue(this._options.concurrency, CPU_COUNT);
      this.cwd = this._getValue(this._options.cwd, process.cwd());
      this.deep = this._getValue(this._options.deep, Infinity);
      this.dot = this._getValue(this._options.dot, false);
      this.extglob = this._getValue(this._options.extglob, true);
      this.followSymbolicLinks = this._getValue(this._options.followSymbolicLinks, true);
      this.fs = this._getFileSystemMethods(this._options.fs);
      this.globstar = this._getValue(this._options.globstar, true);
      this.ignore = this._getValue(this._options.ignore, []);
      this.markDirectories = this._getValue(this._options.markDirectories, false);
      this.objectMode = this._getValue(this._options.objectMode, false);
      this.onlyDirectories = this._getValue(this._options.onlyDirectories, false);
      this.onlyFiles = this._getValue(this._options.onlyFiles, true);
      this.stats = this._getValue(this._options.stats, false);
      this.suppressErrors = this._getValue(this._options.suppressErrors, false);
      this.throwErrorOnBrokenSymbolicLink = this._getValue(this._options.throwErrorOnBrokenSymbolicLink, false);
      this.unique = this._getValue(this._options.unique, true);
      if (this.onlyDirectories) {
        this.onlyFiles = false;
      }
      if (this.stats) {
        this.objectMode = true;
      }
      this.ignore = [].concat(this.ignore);
    }
    _getValue(option, value) {
      return option === undefined ? value : option;
    }
    _getFileSystemMethods(methods = {}) {
      return Object.assign(Object.assign({}, exports.DEFAULT_FILE_SYSTEM_ADAPTER), methods);
    }
  }
  exports.default = Settings;
});

// node_modules/fast-glob/out/index.js
var require_out4 = __commonJS((exports, module) => {
  async function FastGlob(source, options) {
    assertPatternsInput(source);
    const works = getWorks(source, async_1.default, options);
    const result = await Promise.all(works);
    return utils.array.flatten(result);
  }
  var getWorks = function(source, _Provider, options) {
    const patterns = [].concat(source);
    const settings = new settings_1.default(options);
    const tasks = taskManager.generate(patterns, settings);
    const provider = new _Provider(settings);
    return tasks.map(provider.read, provider);
  };
  var assertPatternsInput = function(input) {
    const source = [].concat(input);
    const isValidSource = source.every((item) => utils.string.isString(item) && !utils.string.isEmpty(item));
    if (!isValidSource) {
      throw new TypeError("Patterns must be a string (non empty) or an array of strings");
    }
  };
  var taskManager = require_tasks();
  var async_1 = require_async6();
  var stream_1 = require_stream4();
  var sync_1 = require_sync6();
  var settings_1 = require_settings4();
  var utils = require_utils5();
  (function(FastGlob2) {
    FastGlob2.glob = FastGlob2;
    FastGlob2.globSync = sync2;
    FastGlob2.globStream = stream;
    FastGlob2.async = FastGlob2;
    function sync2(source, options) {
      assertPatternsInput(source);
      const works = getWorks(source, sync_1.default, options);
      return utils.array.flatten(works);
    }
    FastGlob2.sync = sync2;
    function stream(source, options) {
      assertPatternsInput(source);
      const works = getWorks(source, stream_1.default, options);
      return utils.stream.merge(works);
    }
    FastGlob2.stream = stream;
    function generateTasks(source, options) {
      assertPatternsInput(source);
      const patterns = [].concat(source);
      const settings = new settings_1.default(options);
      return taskManager.generate(patterns, settings);
    }
    FastGlob2.generateTasks = generateTasks;
    function isDynamicPattern(source, options) {
      assertPatternsInput(source);
      const settings = new settings_1.default(options);
      return utils.pattern.isDynamicPattern(source, settings);
    }
    FastGlob2.isDynamicPattern = isDynamicPattern;
    function escapePath(source) {
      assertPatternsInput(source);
      return utils.path.escape(source);
    }
    FastGlob2.escapePath = escapePath;
    function convertPathToPattern(source) {
      assertPatternsInput(source);
      return utils.path.convertPathToPattern(source);
    }
    FastGlob2.convertPathToPattern = convertPathToPattern;
    let posix;
    (function(posix2) {
      function escapePath2(source) {
        assertPatternsInput(source);
        return utils.path.escapePosixPath(source);
      }
      posix2.escapePath = escapePath2;
      function convertPathToPattern2(source) {
        assertPatternsInput(source);
        return utils.path.convertPosixPathToPattern(source);
      }
      posix2.convertPathToPattern = convertPathToPattern2;
    })(posix = FastGlob2.posix || (FastGlob2.posix = {}));
    let win32;
    (function(win322) {
      function escapePath2(source) {
        assertPatternsInput(source);
        return utils.path.escapeWindowsPath(source);
      }
      win322.escapePath = escapePath2;
      function convertPathToPattern2(source) {
        assertPatternsInput(source);
        return utils.path.convertWindowsPathToPattern(source);
      }
      win322.convertPathToPattern = convertPathToPattern2;
    })(win32 = FastGlob2.win32 || (FastGlob2.win32 = {}));
  })(FastGlob || (FastGlob = {}));
  module.exports = FastGlob;
});

// node_modules/fs.realpath/old.js
var require_old = __commonJS((exports) => {
  var rethrow = function() {
    var callback;
    if (DEBUG) {
      var backtrace = new Error;
      callback = debugCallback;
    } else
      callback = missingCallback;
    return callback;
    function debugCallback(err) {
      if (err) {
        backtrace.message = err.message;
        err = backtrace;
        missingCallback(err);
      }
    }
    function missingCallback(err) {
      if (err) {
        if (process.throwDeprecation)
          throw err;
        else if (!process.noDeprecation) {
          var msg = "fs: missing callback " + (err.stack || err.message);
          if (process.traceDeprecation)
            console.trace(msg);
          else
            console.error(msg);
        }
      }
    }
  };
  var maybeCallback = function(cb) {
    return typeof cb === "function" ? cb : rethrow();
  };
  var pathModule = import.meta.require("path");
  var isWindows = process.platform === "win32";
  var fs = import.meta.require("fs");
  var DEBUG = process.env.NODE_DEBUG && /fs/.test(process.env.NODE_DEBUG);
  var normalize2 = pathModule.normalize;
  if (isWindows) {
    nextPartRe = /(.*?)(?:[\/\\]+|$)/g;
  } else {
    nextPartRe = /(.*?)(?:[\/]+|$)/g;
  }
  var nextPartRe;
  if (isWindows) {
    splitRootRe = /^(?:[a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/][^\\\/]+)?[\\\/]*/;
  } else {
    splitRootRe = /^[\/]*/;
  }
  var splitRootRe;
  exports.realpathSync = function realpathSync(p, cache) {
    p = pathModule.resolve(p);
    if (cache && Object.prototype.hasOwnProperty.call(cache, p)) {
      return cache[p];
    }
    var original = p, seenLinks = {}, knownHard = {};
    var pos;
    var current;
    var base;
    var previous;
    start();
    function start() {
      var m = splitRootRe.exec(p);
      pos = m[0].length;
      current = m[0];
      base = m[0];
      previous = "";
      if (isWindows && !knownHard[base]) {
        fs.lstatSync(base);
        knownHard[base] = true;
      }
    }
    while (pos < p.length) {
      nextPartRe.lastIndex = pos;
      var result = nextPartRe.exec(p);
      previous = current;
      current += result[0];
      base = previous + result[1];
      pos = nextPartRe.lastIndex;
      if (knownHard[base] || cache && cache[base] === base) {
        continue;
      }
      var resolvedLink;
      if (cache && Object.prototype.hasOwnProperty.call(cache, base)) {
        resolvedLink = cache[base];
      } else {
        var stat = fs.lstatSync(base);
        if (!stat.isSymbolicLink()) {
          knownHard[base] = true;
          if (cache)
            cache[base] = base;
          continue;
        }
        var linkTarget = null;
        if (!isWindows) {
          var id = stat.dev.toString(32) + ":" + stat.ino.toString(32);
          if (seenLinks.hasOwnProperty(id)) {
            linkTarget = seenLinks[id];
          }
        }
        if (linkTarget === null) {
          fs.statSync(base);
          linkTarget = fs.readlinkSync(base);
        }
        resolvedLink = pathModule.resolve(previous, linkTarget);
        if (cache)
          cache[base] = resolvedLink;
        if (!isWindows)
          seenLinks[id] = linkTarget;
      }
      p = pathModule.resolve(resolvedLink, p.slice(pos));
      start();
    }
    if (cache)
      cache[original] = p;
    return p;
  };
  exports.realpath = function realpath(p, cache, cb) {
    if (typeof cb !== "function") {
      cb = maybeCallback(cache);
      cache = null;
    }
    p = pathModule.resolve(p);
    if (cache && Object.prototype.hasOwnProperty.call(cache, p)) {
      return process.nextTick(cb.bind(null, null, cache[p]));
    }
    var original = p, seenLinks = {}, knownHard = {};
    var pos;
    var current;
    var base;
    var previous;
    start();
    function start() {
      var m = splitRootRe.exec(p);
      pos = m[0].length;
      current = m[0];
      base = m[0];
      previous = "";
      if (isWindows && !knownHard[base]) {
        fs.lstat(base, function(err) {
          if (err)
            return cb(err);
          knownHard[base] = true;
          LOOP();
        });
      } else {
        process.nextTick(LOOP);
      }
    }
    function LOOP() {
      if (pos >= p.length) {
        if (cache)
          cache[original] = p;
        return cb(null, p);
      }
      nextPartRe.lastIndex = pos;
      var result = nextPartRe.exec(p);
      previous = current;
      current += result[0];
      base = previous + result[1];
      pos = nextPartRe.lastIndex;
      if (knownHard[base] || cache && cache[base] === base) {
        return process.nextTick(LOOP);
      }
      if (cache && Object.prototype.hasOwnProperty.call(cache, base)) {
        return gotResolvedLink(cache[base]);
      }
      return fs.lstat(base, gotStat);
    }
    function gotStat(err, stat) {
      if (err)
        return cb(err);
      if (!stat.isSymbolicLink()) {
        knownHard[base] = true;
        if (cache)
          cache[base] = base;
        return process.nextTick(LOOP);
      }
      if (!isWindows) {
        var id = stat.dev.toString(32) + ":" + stat.ino.toString(32);
        if (seenLinks.hasOwnProperty(id)) {
          return gotTarget(null, seenLinks[id], base);
        }
      }
      fs.stat(base, function(err2) {
        if (err2)
          return cb(err2);
        fs.readlink(base, function(err3, target) {
          if (!isWindows)
            seenLinks[id] = target;
          gotTarget(err3, target);
        });
      });
    }
    function gotTarget(err, target, base2) {
      if (err)
        return cb(err);
      var resolvedLink = pathModule.resolve(previous, target);
      if (cache)
        cache[base2] = resolvedLink;
      gotResolvedLink(resolvedLink);
    }
    function gotResolvedLink(resolvedLink) {
      p = pathModule.resolve(resolvedLink, p.slice(pos));
      start();
    }
  };
});

// node_modules/fs.realpath/index.js
var require_fs6 = __commonJS((exports, module) => {
  var newError = function(er) {
    return er && er.syscall === "realpath" && (er.code === "ELOOP" || er.code === "ENOMEM" || er.code === "ENAMETOOLONG");
  };
  var realpath = function(p, cache, cb) {
    if (ok) {
      return origRealpath(p, cache, cb);
    }
    if (typeof cache === "function") {
      cb = cache;
      cache = null;
    }
    origRealpath(p, cache, function(er, result) {
      if (newError(er)) {
        old.realpath(p, cache, cb);
      } else {
        cb(er, result);
      }
    });
  };
  var realpathSync = function(p, cache) {
    if (ok) {
      return origRealpathSync(p, cache);
    }
    try {
      return origRealpathSync(p, cache);
    } catch (er) {
      if (newError(er)) {
        return old.realpathSync(p, cache);
      } else {
        throw er;
      }
    }
  };
  var monkeypatch = function() {
    fs.realpath = realpath;
    fs.realpathSync = realpathSync;
  };
  var unmonkeypatch = function() {
    fs.realpath = origRealpath;
    fs.realpathSync = origRealpathSync;
  };
  module.exports = realpath;
  realpath.realpath = realpath;
  realpath.sync = realpathSync;
  realpath.realpathSync = realpathSync;
  realpath.monkeypatch = monkeypatch;
  realpath.unmonkeypatch = unmonkeypatch;
  var fs = import.meta.require("fs");
  var origRealpath = fs.realpath;
  var origRealpathSync = fs.realpathSync;
  var version = process.version;
  var ok = /^v[0-5]\./.test(version);
  var old = require_old();
});

// node_modules/concat-map/index.js
var require_concat_map = __commonJS((exports, module) => {
  module.exports = function(xs, fn) {
    var res = [];
    for (var i = 0;i < xs.length; i++) {
      var x = fn(xs[i], i);
      if (isArray(x))
        res.push.apply(res, x);
      else
        res.push(x);
    }
    return res;
  };
  var isArray = Array.isArray || function(xs) {
    return Object.prototype.toString.call(xs) === "[object Array]";
  };
});

// node_modules/balanced-match/index.js
var require_balanced_match = __commonJS((exports, module) => {
  var balanced = function(a, b, str) {
    if (a instanceof RegExp)
      a = maybeMatch(a, str);
    if (b instanceof RegExp)
      b = maybeMatch(b, str);
    var r = range(a, b, str);
    return r && {
      start: r[0],
      end: r[1],
      pre: str.slice(0, r[0]),
      body: str.slice(r[0] + a.length, r[1]),
      post: str.slice(r[1] + b.length)
    };
  };
  var maybeMatch = function(reg, str) {
    var m = str.match(reg);
    return m ? m[0] : null;
  };
  var range = function(a, b, str) {
    var begs, beg, left2, right2, result;
    var ai = str.indexOf(a);
    var bi = str.indexOf(b, ai + 1);
    var i = ai;
    if (ai >= 0 && bi > 0) {
      if (a === b) {
        return [ai, bi];
      }
      begs = [];
      left2 = str.length;
      while (i >= 0 && !result) {
        if (i == ai) {
          begs.push(i);
          ai = str.indexOf(a, i + 1);
        } else if (begs.length == 1) {
          result = [begs.pop(), bi];
        } else {
          beg = begs.pop();
          if (beg < left2) {
            left2 = beg;
            right2 = bi;
          }
          bi = str.indexOf(b, i + 1);
        }
        i = ai < bi && ai >= 0 ? ai : bi;
      }
      if (begs.length) {
        result = [left2, right2];
      }
    }
    return result;
  };
  module.exports = balanced;
  balanced.range = range;
});

// node_modules/minimatch/node_modules/brace-expansion/index.js
var require_brace_expansion = __commonJS((exports, module) => {
  var numeric = function(str) {
    return parseInt(str, 10) == str ? parseInt(str, 10) : str.charCodeAt(0);
  };
  var escapeBraces = function(str) {
    return str.split("\\\\").join(escSlash).split("\\{").join(escOpen).split("\\}").join(escClose).split("\\,").join(escComma).split("\\.").join(escPeriod);
  };
  var unescapeBraces = function(str) {
    return str.split(escSlash).join("\\").split(escOpen).join("{").split(escClose).join("}").split(escComma).join(",").split(escPeriod).join(".");
  };
  var parseCommaParts = function(str) {
    if (!str)
      return [""];
    var parts = [];
    var m = balanced("{", "}", str);
    if (!m)
      return str.split(",");
    var pre = m.pre;
    var body = m.body;
    var post = m.post;
    var p = pre.split(",");
    p[p.length - 1] += "{" + body + "}";
    var postParts = parseCommaParts(post);
    if (post.length) {
      p[p.length - 1] += postParts.shift();
      p.push.apply(p, postParts);
    }
    parts.push.apply(parts, p);
    return parts;
  };
  var expandTop = function(str) {
    if (!str)
      return [];
    if (str.substr(0, 2) === "{}") {
      str = "\\{\\}" + str.substr(2);
    }
    return expand(escapeBraces(str), true).map(unescapeBraces);
  };
  var embrace = function(str) {
    return "{" + str + "}";
  };
  var isPadded = function(el) {
    return /^-?0\d/.test(el);
  };
  var lte = function(i, y) {
    return i <= y;
  };
  var gte = function(i, y) {
    return i >= y;
  };
  var expand = function(str, isTop) {
    var expansions = [];
    var m = balanced("{", "}", str);
    if (!m || /\$$/.test(m.pre))
      return [str];
    var isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
    var isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
    var isSequence = isNumericSequence || isAlphaSequence;
    var isOptions = m.body.indexOf(",") >= 0;
    if (!isSequence && !isOptions) {
      if (m.post.match(/,.*\}/)) {
        str = m.pre + "{" + m.body + escClose + m.post;
        return expand(str);
      }
      return [str];
    }
    var n;
    if (isSequence) {
      n = m.body.split(/\.\./);
    } else {
      n = parseCommaParts(m.body);
      if (n.length === 1) {
        n = expand(n[0], false).map(embrace);
        if (n.length === 1) {
          var post = m.post.length ? expand(m.post, false) : [""];
          return post.map(function(p) {
            return m.pre + n[0] + p;
          });
        }
      }
    }
    var pre = m.pre;
    var post = m.post.length ? expand(m.post, false) : [""];
    var N;
    if (isSequence) {
      var x = numeric(n[0]);
      var y = numeric(n[1]);
      var width = Math.max(n[0].length, n[1].length);
      var incr = n.length == 3 ? Math.abs(numeric(n[2])) : 1;
      var test = lte;
      var reverse = y < x;
      if (reverse) {
        incr *= -1;
        test = gte;
      }
      var pad = n.some(isPadded);
      N = [];
      for (var i = x;test(i, y); i += incr) {
        var c;
        if (isAlphaSequence) {
          c = String.fromCharCode(i);
          if (c === "\\")
            c = "";
        } else {
          c = String(i);
          if (pad) {
            var need = width - c.length;
            if (need > 0) {
              var z = new Array(need + 1).join("0");
              if (i < 0)
                c = "-" + z + c.slice(1);
              else
                c = z + c;
            }
          }
        }
        N.push(c);
      }
    } else {
      N = concatMap(n, function(el) {
        return expand(el, false);
      });
    }
    for (var j = 0;j < N.length; j++) {
      for (var k = 0;k < post.length; k++) {
        var expansion = pre + N[j] + post[k];
        if (!isTop || isSequence || expansion)
          expansions.push(expansion);
      }
    }
    return expansions;
  };
  var concatMap = require_concat_map();
  var balanced = require_balanced_match();
  module.exports = expandTop;
  var escSlash = "\0SLASH" + Math.random() + "\0";
  var escOpen = "\0OPEN" + Math.random() + "\0";
  var escClose = "\0CLOSE" + Math.random() + "\0";
  var escComma = "\0COMMA" + Math.random() + "\0";
  var escPeriod = "\0PERIOD" + Math.random() + "\0";
});

// node_modules/minimatch/minimatch.js
var require_minimatch = __commonJS((exports, module) => {
  var charSet = function(s) {
    return s.split("").reduce(function(set, c) {
      set[c] = true;
      return set;
    }, {});
  };
  var filter = function(pattern, options) {
    options = options || {};
    return function(p, i, list) {
      return minimatch(p, pattern, options);
    };
  };
  var ext = function(a, b) {
    b = b || {};
    var t = {};
    Object.keys(a).forEach(function(k) {
      t[k] = a[k];
    });
    Object.keys(b).forEach(function(k) {
      t[k] = b[k];
    });
    return t;
  };
  var minimatch = function(p, pattern, options) {
    assertValidPattern(pattern);
    if (!options)
      options = {};
    if (!options.nocomment && pattern.charAt(0) === "#") {
      return false;
    }
    return new Minimatch(pattern, options).match(p);
  };
  var Minimatch = function(pattern, options) {
    if (!(this instanceof Minimatch)) {
      return new Minimatch(pattern, options);
    }
    assertValidPattern(pattern);
    if (!options)
      options = {};
    pattern = pattern.trim();
    if (!options.allowWindowsEscape && path.sep !== "/") {
      pattern = pattern.split(path.sep).join("/");
    }
    this.options = options;
    this.set = [];
    this.pattern = pattern;
    this.regexp = null;
    this.negate = false;
    this.comment = false;
    this.empty = false;
    this.partial = !!options.partial;
    this.make();
  };
  var make = function() {
    var pattern = this.pattern;
    var options = this.options;
    if (!options.nocomment && pattern.charAt(0) === "#") {
      this.comment = true;
      return;
    }
    if (!pattern) {
      this.empty = true;
      return;
    }
    this.parseNegate();
    var set = this.globSet = this.braceExpand();
    if (options.debug)
      this.debug = function debug() {
        console.error.apply(console, arguments);
      };
    this.debug(this.pattern, set);
    set = this.globParts = set.map(function(s) {
      return s.split(slashSplit);
    });
    this.debug(this.pattern, set);
    set = set.map(function(s, si, set2) {
      return s.map(this.parse, this);
    }, this);
    this.debug(this.pattern, set);
    set = set.filter(function(s) {
      return s.indexOf(false) === -1;
    });
    this.debug(this.pattern, set);
    this.set = set;
  };
  var parseNegate = function() {
    var pattern = this.pattern;
    var negate = false;
    var options = this.options;
    var negateOffset = 0;
    if (options.nonegate)
      return;
    for (var i = 0, l = pattern.length;i < l && pattern.charAt(i) === "!"; i++) {
      negate = !negate;
      negateOffset++;
    }
    if (negateOffset)
      this.pattern = pattern.substr(negateOffset);
    this.negate = negate;
  };
  var braceExpand = function(pattern, options) {
    if (!options) {
      if (this instanceof Minimatch) {
        options = this.options;
      } else {
        options = {};
      }
    }
    pattern = typeof pattern === "undefined" ? this.pattern : pattern;
    assertValidPattern(pattern);
    if (options.nobrace || !/\{(?:(?!\{).)*\}/.test(pattern)) {
      return [pattern];
    }
    return expand(pattern);
  };
  var parse = function(pattern, isSub) {
    assertValidPattern(pattern);
    var options = this.options;
    if (pattern === "**") {
      if (!options.noglobstar)
        return GLOBSTAR;
      else
        pattern = "*";
    }
    if (pattern === "")
      return "";
    var re = "";
    var hasMagic = !!options.nocase;
    var escaping = false;
    var patternListStack = [];
    var negativeLists = [];
    var stateChar;
    var inClass = false;
    var reClassStart = -1;
    var classStart = -1;
    var patternStart = pattern.charAt(0) === "." ? "" : options.dot ? "(?!(?:^|\\/)\\.{1,2}(?:$|\\/))" : "(?!\\.)";
    var self = this;
    function clearStateChar() {
      if (stateChar) {
        switch (stateChar) {
          case "*":
            re += star;
            hasMagic = true;
            break;
          case "?":
            re += qmark;
            hasMagic = true;
            break;
          default:
            re += "\\" + stateChar;
            break;
        }
        self.debug("clearStateChar %j %j", stateChar, re);
        stateChar = false;
      }
    }
    for (var i = 0, len = pattern.length, c;i < len && (c = pattern.charAt(i)); i++) {
      this.debug("%s\t%s %s %j", pattern, i, re, c);
      if (escaping && reSpecials[c]) {
        re += "\\" + c;
        escaping = false;
        continue;
      }
      switch (c) {
        case "/": {
          return false;
        }
        case "\\":
          clearStateChar();
          escaping = true;
          continue;
        case "?":
        case "*":
        case "+":
        case "@":
        case "!":
          this.debug("%s\t%s %s %j <-- stateChar", pattern, i, re, c);
          if (inClass) {
            this.debug("  in class");
            if (c === "!" && i === classStart + 1)
              c = "^";
            re += c;
            continue;
          }
          self.debug("call clearStateChar %j", stateChar);
          clearStateChar();
          stateChar = c;
          if (options.noext)
            clearStateChar();
          continue;
        case "(":
          if (inClass) {
            re += "(";
            continue;
          }
          if (!stateChar) {
            re += "\\(";
            continue;
          }
          patternListStack.push({
            type: stateChar,
            start: i - 1,
            reStart: re.length,
            open: plTypes[stateChar].open,
            close: plTypes[stateChar].close
          });
          re += stateChar === "!" ? "(?:(?!(?:" : "(?:";
          this.debug("plType %j %j", stateChar, re);
          stateChar = false;
          continue;
        case ")":
          if (inClass || !patternListStack.length) {
            re += "\\)";
            continue;
          }
          clearStateChar();
          hasMagic = true;
          var pl = patternListStack.pop();
          re += pl.close;
          if (pl.type === "!") {
            negativeLists.push(pl);
          }
          pl.reEnd = re.length;
          continue;
        case "|":
          if (inClass || !patternListStack.length || escaping) {
            re += "\\|";
            escaping = false;
            continue;
          }
          clearStateChar();
          re += "|";
          continue;
        case "[":
          clearStateChar();
          if (inClass) {
            re += "\\" + c;
            continue;
          }
          inClass = true;
          classStart = i;
          reClassStart = re.length;
          re += c;
          continue;
        case "]":
          if (i === classStart + 1 || !inClass) {
            re += "\\" + c;
            escaping = false;
            continue;
          }
          var cs = pattern.substring(classStart + 1, i);
          try {
            RegExp("[" + cs + "]");
          } catch (er) {
            var sp = this.parse(cs, SUBPARSE);
            re = re.substr(0, reClassStart) + "\\[" + sp[0] + "\\]";
            hasMagic = hasMagic || sp[1];
            inClass = false;
            continue;
          }
          hasMagic = true;
          inClass = false;
          re += c;
          continue;
        default:
          clearStateChar();
          if (escaping) {
            escaping = false;
          } else if (reSpecials[c] && !(c === "^" && inClass)) {
            re += "\\";
          }
          re += c;
      }
    }
    if (inClass) {
      cs = pattern.substr(classStart + 1);
      sp = this.parse(cs, SUBPARSE);
      re = re.substr(0, reClassStart) + "\\[" + sp[0];
      hasMagic = hasMagic || sp[1];
    }
    for (pl = patternListStack.pop();pl; pl = patternListStack.pop()) {
      var tail = re.slice(pl.reStart + pl.open.length);
      this.debug("setting tail", re, pl);
      tail = tail.replace(/((?:\\{2}){0,64})(\\?)\|/g, function(_, $1, $2) {
        if (!$2) {
          $2 = "\\";
        }
        return $1 + $1 + $2 + "|";
      });
      this.debug("tail=%j\n   %s", tail, tail, pl, re);
      var t = pl.type === "*" ? star : pl.type === "?" ? qmark : "\\" + pl.type;
      hasMagic = true;
      re = re.slice(0, pl.reStart) + t + "\\(" + tail;
    }
    clearStateChar();
    if (escaping) {
      re += "\\\\";
    }
    var addPatternStart = false;
    switch (re.charAt(0)) {
      case "[":
      case ".":
      case "(":
        addPatternStart = true;
    }
    for (var n = negativeLists.length - 1;n > -1; n--) {
      var nl = negativeLists[n];
      var nlBefore = re.slice(0, nl.reStart);
      var nlFirst = re.slice(nl.reStart, nl.reEnd - 8);
      var nlLast = re.slice(nl.reEnd - 8, nl.reEnd);
      var nlAfter = re.slice(nl.reEnd);
      nlLast += nlAfter;
      var openParensBefore = nlBefore.split("(").length - 1;
      var cleanAfter = nlAfter;
      for (i = 0;i < openParensBefore; i++) {
        cleanAfter = cleanAfter.replace(/\)[+*?]?/, "");
      }
      nlAfter = cleanAfter;
      var dollar = "";
      if (nlAfter === "" && isSub !== SUBPARSE) {
        dollar = "$";
      }
      var newRe = nlBefore + nlFirst + nlAfter + dollar + nlLast;
      re = newRe;
    }
    if (re !== "" && hasMagic) {
      re = "(?=.)" + re;
    }
    if (addPatternStart) {
      re = patternStart + re;
    }
    if (isSub === SUBPARSE) {
      return [re, hasMagic];
    }
    if (!hasMagic) {
      return globUnescape(pattern);
    }
    var flags = options.nocase ? "i" : "";
    try {
      var regExp = new RegExp("^" + re + "$", flags);
    } catch (er) {
      return new RegExp("$.");
    }
    regExp._glob = pattern;
    regExp._src = re;
    return regExp;
  };
  var makeRe = function() {
    if (this.regexp || this.regexp === false)
      return this.regexp;
    var set = this.set;
    if (!set.length) {
      this.regexp = false;
      return this.regexp;
    }
    var options = this.options;
    var twoStar = options.noglobstar ? star : options.dot ? twoStarDot : twoStarNoDot;
    var flags = options.nocase ? "i" : "";
    var re = set.map(function(pattern) {
      return pattern.map(function(p) {
        return p === GLOBSTAR ? twoStar : typeof p === "string" ? regExpEscape(p) : p._src;
      }).join("\\/");
    }).join("|");
    re = "^(?:" + re + ")$";
    if (this.negate)
      re = "^(?!" + re + ").*$";
    try {
      this.regexp = new RegExp(re, flags);
    } catch (ex) {
      this.regexp = false;
    }
    return this.regexp;
  };
  var globUnescape = function(s) {
    return s.replace(/\\(.)/g, "$1");
  };
  var regExpEscape = function(s) {
    return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
  };
  module.exports = minimatch;
  minimatch.Minimatch = Minimatch;
  var path = function() {
    try {
      return import.meta.require("path");
    } catch (e) {
    }
  }() || {
    sep: "/"
  };
  minimatch.sep = path.sep;
  var GLOBSTAR = minimatch.GLOBSTAR = Minimatch.GLOBSTAR = {};
  var expand = require_brace_expansion();
  var plTypes = {
    "!": { open: "(?:(?!(?:", close: "))[^/]*?)" },
    "?": { open: "(?:", close: ")?" },
    "+": { open: "(?:", close: ")+" },
    "*": { open: "(?:", close: ")*" },
    "@": { open: "(?:", close: ")" }
  };
  var qmark = "[^/]";
  var star = qmark + "*?";
  var twoStarDot = "(?:(?!(?:\\/|^)(?:\\.{1,2})($|\\/)).)*?";
  var twoStarNoDot = "(?:(?!(?:\\/|^)\\.).)*?";
  var reSpecials = charSet("().*{}+?[]^$\\!");
  var slashSplit = /\/+/;
  minimatch.filter = filter;
  minimatch.defaults = function(def) {
    if (!def || typeof def !== "object" || !Object.keys(def).length) {
      return minimatch;
    }
    var orig = minimatch;
    var m = function minimatch(p, pattern, options) {
      return orig(p, pattern, ext(def, options));
    };
    m.Minimatch = function Minimatch(pattern, options) {
      return new orig.Minimatch(pattern, ext(def, options));
    };
    m.Minimatch.defaults = function defaults(options) {
      return orig.defaults(ext(def, options)).Minimatch;
    };
    m.filter = function filter(pattern, options) {
      return orig.filter(pattern, ext(def, options));
    };
    m.defaults = function defaults(options) {
      return orig.defaults(ext(def, options));
    };
    m.makeRe = function makeRe(pattern, options) {
      return orig.makeRe(pattern, ext(def, options));
    };
    m.braceExpand = function braceExpand(pattern, options) {
      return orig.braceExpand(pattern, ext(def, options));
    };
    m.match = function(list, pattern, options) {
      return orig.match(list, pattern, ext(def, options));
    };
    return m;
  };
  Minimatch.defaults = function(def) {
    return minimatch.defaults(def).Minimatch;
  };
  Minimatch.prototype.debug = function() {
  };
  Minimatch.prototype.make = make;
  Minimatch.prototype.parseNegate = parseNegate;
  minimatch.braceExpand = function(pattern, options) {
    return braceExpand(pattern, options);
  };
  Minimatch.prototype.braceExpand = braceExpand;
  var MAX_PATTERN_LENGTH = 1024 * 64;
  var assertValidPattern = function(pattern) {
    if (typeof pattern !== "string") {
      throw new TypeError("invalid pattern");
    }
    if (pattern.length > MAX_PATTERN_LENGTH) {
      throw new TypeError("pattern is too long");
    }
  };
  Minimatch.prototype.parse = parse;
  var SUBPARSE = {};
  minimatch.makeRe = function(pattern, options) {
    return new Minimatch(pattern, options || {}).makeRe();
  };
  Minimatch.prototype.makeRe = makeRe;
  minimatch.match = function(list, pattern, options) {
    options = options || {};
    var mm = new Minimatch(pattern, options);
    list = list.filter(function(f) {
      return mm.match(f);
    });
    if (mm.options.nonull && !list.length) {
      list.push(pattern);
    }
    return list;
  };
  Minimatch.prototype.match = function match(f, partial) {
    if (typeof partial === "undefined")
      partial = this.partial;
    this.debug("match", f, this.pattern);
    if (this.comment)
      return false;
    if (this.empty)
      return f === "";
    if (f === "/" && partial)
      return true;
    var options = this.options;
    if (path.sep !== "/") {
      f = f.split(path.sep).join("/");
    }
    f = f.split(slashSplit);
    this.debug(this.pattern, "split", f);
    var set = this.set;
    this.debug(this.pattern, "set", set);
    var filename;
    var i;
    for (i = f.length - 1;i >= 0; i--) {
      filename = f[i];
      if (filename)
        break;
    }
    for (i = 0;i < set.length; i++) {
      var pattern = set[i];
      var file = f;
      if (options.matchBase && pattern.length === 1) {
        file = [filename];
      }
      var hit = this.matchOne(file, pattern, partial);
      if (hit) {
        if (options.flipNegate)
          return true;
        return !this.negate;
      }
    }
    if (options.flipNegate)
      return false;
    return this.negate;
  };
  Minimatch.prototype.matchOne = function(file, pattern, partial) {
    var options = this.options;
    this.debug("matchOne", { this: this, file, pattern });
    this.debug("matchOne", file.length, pattern.length);
    for (var fi = 0, pi = 0, fl = file.length, pl = pattern.length;fi < fl && pi < pl; fi++, pi++) {
      this.debug("matchOne loop");
      var p = pattern[pi];
      var f = file[fi];
      this.debug(pattern, p, f);
      if (p === false)
        return false;
      if (p === GLOBSTAR) {
        this.debug("GLOBSTAR", [pattern, p, f]);
        var fr = fi;
        var pr = pi + 1;
        if (pr === pl) {
          this.debug("** at the end");
          for (;fi < fl; fi++) {
            if (file[fi] === "." || file[fi] === ".." || !options.dot && file[fi].charAt(0) === ".")
              return false;
          }
          return true;
        }
        while (fr < fl) {
          var swallowee = file[fr];
          this.debug("\nglobstar while", file, fr, pattern, pr, swallowee);
          if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
            this.debug("globstar found match!", fr, fl, swallowee);
            return true;
          } else {
            if (swallowee === "." || swallowee === ".." || !options.dot && swallowee.charAt(0) === ".") {
              this.debug("dot detected!", file, fr, pattern, pr);
              break;
            }
            this.debug("globstar swallow a segment, and continue");
            fr++;
          }
        }
        if (partial) {
          this.debug("\n>>> no match, partial?", file, fr, pattern, pr);
          if (fr === fl)
            return true;
        }
        return false;
      }
      var hit;
      if (typeof p === "string") {
        hit = f === p;
        this.debug("string match", p, f, hit);
      } else {
        hit = f.match(p);
        this.debug("pattern match", p, f, hit);
      }
      if (!hit)
        return false;
    }
    if (fi === fl && pi === pl) {
      return true;
    } else if (fi === fl) {
      return partial;
    } else if (pi === pl) {
      return fi === fl - 1 && file[fi] === "";
    }
    throw new Error("wtf?");
  };
});

// node_modules/inherits/inherits_browser.js
var require_inherits_browser = __commonJS((exports, module) => {
  if (typeof Object.create === "function") {
    module.exports = function inherits(ctor, superCtor) {
      if (superCtor) {
        ctor.super_ = superCtor;
        ctor.prototype = Object.create(superCtor.prototype, {
          constructor: {
            value: ctor,
            enumerable: false,
            writable: true,
            configurable: true
          }
        });
      }
    };
  } else {
    module.exports = function inherits(ctor, superCtor) {
      if (superCtor) {
        ctor.super_ = superCtor;
        var TempCtor = function() {
        };
        TempCtor.prototype = superCtor.prototype;
        ctor.prototype = new TempCtor;
        ctor.prototype.constructor = ctor;
      }
    };
  }
});

// node_modules/inherits/inherits.js
var require_inherits = __commonJS((exports, module) => {
  try {
    util = import.meta.require("util");
    if (typeof util.inherits !== "function")
      throw "";
    module.exports = util.inherits;
  } catch (e) {
    module.exports = require_inherits_browser();
  }
  var util;
});

// node_modules/path-is-absolute/index.js
var require_path_is_absolute = __commonJS((exports, module) => {
  var posix = function(path) {
    return path.charAt(0) === "/";
  };
  var win32 = function(path) {
    var splitDeviceRe = /^([a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?([\\\/])?([\s\S]*?)$/;
    var result = splitDeviceRe.exec(path);
    var device = result[1] || "";
    var isUnc = Boolean(device && device.charAt(1) !== ":");
    return Boolean(result[2] || isUnc);
  };
  module.exports = process.platform === "win32" ? win32 : posix;
  module.exports.posix = posix;
  module.exports.win32 = win32;
});

// node_modules/glob/common.js
var require_common3 = __commonJS((exports) => {
  var ownProp = function(obj, field) {
    return Object.prototype.hasOwnProperty.call(obj, field);
  };
  var alphasort = function(a, b) {
    return a.localeCompare(b, "en");
  };
  var setupIgnores = function(self, options) {
    self.ignore = options.ignore || [];
    if (!Array.isArray(self.ignore))
      self.ignore = [self.ignore];
    if (self.ignore.length) {
      self.ignore = self.ignore.map(ignoreMap);
    }
  };
  var ignoreMap = function(pattern) {
    var gmatcher = null;
    if (pattern.slice(-3) === "/**") {
      var gpattern = pattern.replace(/(\/\*\*)+$/, "");
      gmatcher = new Minimatch(gpattern, { dot: true });
    }
    return {
      matcher: new Minimatch(pattern, { dot: true }),
      gmatcher
    };
  };
  var setopts = function(self, pattern, options) {
    if (!options)
      options = {};
    if (options.matchBase && pattern.indexOf("/") === -1) {
      if (options.noglobstar) {
        throw new Error("base matching requires globstar");
      }
      pattern = "**/" + pattern;
    }
    self.silent = !!options.silent;
    self.pattern = pattern;
    self.strict = options.strict !== false;
    self.realpath = !!options.realpath;
    self.realpathCache = options.realpathCache || Object.create(null);
    self.follow = !!options.follow;
    self.dot = !!options.dot;
    self.mark = !!options.mark;
    self.nodir = !!options.nodir;
    if (self.nodir)
      self.mark = true;
    self.sync = !!options.sync;
    self.nounique = !!options.nounique;
    self.nonull = !!options.nonull;
    self.nosort = !!options.nosort;
    self.nocase = !!options.nocase;
    self.stat = !!options.stat;
    self.noprocess = !!options.noprocess;
    self.absolute = !!options.absolute;
    self.fs = options.fs || fs;
    self.maxLength = options.maxLength || Infinity;
    self.cache = options.cache || Object.create(null);
    self.statCache = options.statCache || Object.create(null);
    self.symlinks = options.symlinks || Object.create(null);
    setupIgnores(self, options);
    self.changedCwd = false;
    var cwd = process.cwd();
    if (!ownProp(options, "cwd"))
      self.cwd = cwd;
    else {
      self.cwd = path.resolve(options.cwd);
      self.changedCwd = self.cwd !== cwd;
    }
    self.root = options.root || path.resolve(self.cwd, "/");
    self.root = path.resolve(self.root);
    if (process.platform === "win32")
      self.root = self.root.replace(/\\/g, "/");
    self.cwdAbs = isAbsolute(self.cwd) ? self.cwd : makeAbs(self, self.cwd);
    if (process.platform === "win32")
      self.cwdAbs = self.cwdAbs.replace(/\\/g, "/");
    self.nomount = !!options.nomount;
    options.nonegate = true;
    options.nocomment = true;
    options.allowWindowsEscape = false;
    self.minimatch = new Minimatch(pattern, options);
    self.options = self.minimatch.options;
  };
  var finish = function(self) {
    var nou = self.nounique;
    var all = nou ? [] : Object.create(null);
    for (var i = 0, l = self.matches.length;i < l; i++) {
      var matches = self.matches[i];
      if (!matches || Object.keys(matches).length === 0) {
        if (self.nonull) {
          var literal = self.minimatch.globSet[i];
          if (nou)
            all.push(literal);
          else
            all[literal] = true;
        }
      } else {
        var m = Object.keys(matches);
        if (nou)
          all.push.apply(all, m);
        else
          m.forEach(function(m2) {
            all[m2] = true;
          });
      }
    }
    if (!nou)
      all = Object.keys(all);
    if (!self.nosort)
      all = all.sort(alphasort);
    if (self.mark) {
      for (var i = 0;i < all.length; i++) {
        all[i] = self._mark(all[i]);
      }
      if (self.nodir) {
        all = all.filter(function(e) {
          var notDir = !/\/$/.test(e);
          var c = self.cache[e] || self.cache[makeAbs(self, e)];
          if (notDir && c)
            notDir = c !== "DIR" && !Array.isArray(c);
          return notDir;
        });
      }
    }
    if (self.ignore.length)
      all = all.filter(function(m2) {
        return !isIgnored(self, m2);
      });
    self.found = all;
  };
  var mark = function(self, p) {
    var abs = makeAbs(self, p);
    var c = self.cache[abs];
    var m = p;
    if (c) {
      var isDir = c === "DIR" || Array.isArray(c);
      var slash = p.slice(-1) === "/";
      if (isDir && !slash)
        m += "/";
      else if (!isDir && slash)
        m = m.slice(0, -1);
      if (m !== p) {
        var mabs = makeAbs(self, m);
        self.statCache[mabs] = self.statCache[abs];
        self.cache[mabs] = self.cache[abs];
      }
    }
    return m;
  };
  var makeAbs = function(self, f) {
    var abs = f;
    if (f.charAt(0) === "/") {
      abs = path.join(self.root, f);
    } else if (isAbsolute(f) || f === "") {
      abs = f;
    } else if (self.changedCwd) {
      abs = path.resolve(self.cwd, f);
    } else {
      abs = path.resolve(f);
    }
    if (process.platform === "win32")
      abs = abs.replace(/\\/g, "/");
    return abs;
  };
  var isIgnored = function(self, path2) {
    if (!self.ignore.length)
      return false;
    return self.ignore.some(function(item) {
      return item.matcher.match(path2) || !!(item.gmatcher && item.gmatcher.match(path2));
    });
  };
  var childrenIgnored = function(self, path2) {
    if (!self.ignore.length)
      return false;
    return self.ignore.some(function(item) {
      return !!(item.gmatcher && item.gmatcher.match(path2));
    });
  };
  exports.setopts = setopts;
  exports.ownProp = ownProp;
  exports.makeAbs = makeAbs;
  exports.finish = finish;
  exports.mark = mark;
  exports.isIgnored = isIgnored;
  exports.childrenIgnored = childrenIgnored;
  var fs = import.meta.require("fs");
  var path = import.meta.require("path");
  var minimatch = require_minimatch();
  var isAbsolute = require_path_is_absolute();
  var Minimatch = minimatch.Minimatch;
});

// node_modules/glob/sync.js
var require_sync7 = __commonJS((exports, module) => {
  var globSync = function(pattern, options) {
    if (typeof options === "function" || arguments.length === 3)
      throw new TypeError("callback provided to sync glob\nSee: https://github.com/isaacs/node-glob/issues/167");
    return new GlobSync(pattern, options).found;
  };
  var GlobSync = function(pattern, options) {
    if (!pattern)
      throw new Error("must provide pattern");
    if (typeof options === "function" || arguments.length === 3)
      throw new TypeError("callback provided to sync glob\nSee: https://github.com/isaacs/node-glob/issues/167");
    if (!(this instanceof GlobSync))
      return new GlobSync(pattern, options);
    setopts(this, pattern, options);
    if (this.noprocess)
      return this;
    var n = this.minimatch.set.length;
    this.matches = new Array(n);
    for (var i = 0;i < n; i++) {
      this._process(this.minimatch.set[i], i, false);
    }
    this._finish();
  };
  module.exports = globSync;
  globSync.GlobSync = GlobSync;
  var rp = require_fs6();
  var minimatch = require_minimatch();
  var Minimatch = minimatch.Minimatch;
  var Glob = require_glob().Glob;
  var util = import.meta.require("util");
  var path = import.meta.require("path");
  var assert = import.meta.require("assert");
  var isAbsolute = require_path_is_absolute();
  var common = require_common3();
  var setopts = common.setopts;
  var ownProp = common.ownProp;
  var childrenIgnored = common.childrenIgnored;
  var isIgnored = common.isIgnored;
  GlobSync.prototype._finish = function() {
    assert.ok(this instanceof GlobSync);
    if (this.realpath) {
      var self = this;
      this.matches.forEach(function(matchset, index) {
        var set = self.matches[index] = Object.create(null);
        for (var p in matchset) {
          try {
            p = self._makeAbs(p);
            var real = rp.realpathSync(p, self.realpathCache);
            set[real] = true;
          } catch (er) {
            if (er.syscall === "stat")
              set[self._makeAbs(p)] = true;
            else
              throw er;
          }
        }
      });
    }
    common.finish(this);
  };
  GlobSync.prototype._process = function(pattern, index, inGlobStar) {
    assert.ok(this instanceof GlobSync);
    var n = 0;
    while (typeof pattern[n] === "string") {
      n++;
    }
    var prefix;
    switch (n) {
      case pattern.length:
        this._processSimple(pattern.join("/"), index);
        return;
      case 0:
        prefix = null;
        break;
      default:
        prefix = pattern.slice(0, n).join("/");
        break;
    }
    var remain = pattern.slice(n);
    var read;
    if (prefix === null)
      read = ".";
    else if (isAbsolute(prefix) || isAbsolute(pattern.map(function(p) {
      return typeof p === "string" ? p : "[*]";
    }).join("/"))) {
      if (!prefix || !isAbsolute(prefix))
        prefix = "/" + prefix;
      read = prefix;
    } else
      read = prefix;
    var abs = this._makeAbs(read);
    if (childrenIgnored(this, read))
      return;
    var isGlobStar = remain[0] === minimatch.GLOBSTAR;
    if (isGlobStar)
      this._processGlobStar(prefix, read, abs, remain, index, inGlobStar);
    else
      this._processReaddir(prefix, read, abs, remain, index, inGlobStar);
  };
  GlobSync.prototype._processReaddir = function(prefix, read, abs, remain, index, inGlobStar) {
    var entries = this._readdir(abs, inGlobStar);
    if (!entries)
      return;
    var pn = remain[0];
    var negate = !!this.minimatch.negate;
    var rawGlob = pn._glob;
    var dotOk = this.dot || rawGlob.charAt(0) === ".";
    var matchedEntries = [];
    for (var i = 0;i < entries.length; i++) {
      var e = entries[i];
      if (e.charAt(0) !== "." || dotOk) {
        var m;
        if (negate && !prefix) {
          m = !e.match(pn);
        } else {
          m = e.match(pn);
        }
        if (m)
          matchedEntries.push(e);
      }
    }
    var len = matchedEntries.length;
    if (len === 0)
      return;
    if (remain.length === 1 && !this.mark && !this.stat) {
      if (!this.matches[index])
        this.matches[index] = Object.create(null);
      for (var i = 0;i < len; i++) {
        var e = matchedEntries[i];
        if (prefix) {
          if (prefix.slice(-1) !== "/")
            e = prefix + "/" + e;
          else
            e = prefix + e;
        }
        if (e.charAt(0) === "/" && !this.nomount) {
          e = path.join(this.root, e);
        }
        this._emitMatch(index, e);
      }
      return;
    }
    remain.shift();
    for (var i = 0;i < len; i++) {
      var e = matchedEntries[i];
      var newPattern;
      if (prefix)
        newPattern = [prefix, e];
      else
        newPattern = [e];
      this._process(newPattern.concat(remain), index, inGlobStar);
    }
  };
  GlobSync.prototype._emitMatch = function(index, e) {
    if (isIgnored(this, e))
      return;
    var abs = this._makeAbs(e);
    if (this.mark)
      e = this._mark(e);
    if (this.absolute) {
      e = abs;
    }
    if (this.matches[index][e])
      return;
    if (this.nodir) {
      var c = this.cache[abs];
      if (c === "DIR" || Array.isArray(c))
        return;
    }
    this.matches[index][e] = true;
    if (this.stat)
      this._stat(e);
  };
  GlobSync.prototype._readdirInGlobStar = function(abs) {
    if (this.follow)
      return this._readdir(abs, false);
    var entries;
    var lstat;
    var stat;
    try {
      lstat = this.fs.lstatSync(abs);
    } catch (er) {
      if (er.code === "ENOENT") {
        return null;
      }
    }
    var isSym = lstat && lstat.isSymbolicLink();
    this.symlinks[abs] = isSym;
    if (!isSym && lstat && !lstat.isDirectory())
      this.cache[abs] = "FILE";
    else
      entries = this._readdir(abs, false);
    return entries;
  };
  GlobSync.prototype._readdir = function(abs, inGlobStar) {
    var entries;
    if (inGlobStar && !ownProp(this.symlinks, abs))
      return this._readdirInGlobStar(abs);
    if (ownProp(this.cache, abs)) {
      var c = this.cache[abs];
      if (!c || c === "FILE")
        return null;
      if (Array.isArray(c))
        return c;
    }
    try {
      return this._readdirEntries(abs, this.fs.readdirSync(abs));
    } catch (er) {
      this._readdirError(abs, er);
      return null;
    }
  };
  GlobSync.prototype._readdirEntries = function(abs, entries) {
    if (!this.mark && !this.stat) {
      for (var i = 0;i < entries.length; i++) {
        var e = entries[i];
        if (abs === "/")
          e = abs + e;
        else
          e = abs + "/" + e;
        this.cache[e] = true;
      }
    }
    this.cache[abs] = entries;
    return entries;
  };
  GlobSync.prototype._readdirError = function(f, er) {
    switch (er.code) {
      case "ENOTSUP":
      case "ENOTDIR":
        var abs = this._makeAbs(f);
        this.cache[abs] = "FILE";
        if (abs === this.cwdAbs) {
          var error2 = new Error(er.code + " invalid cwd " + this.cwd);
          error2.path = this.cwd;
          error2.code = er.code;
          throw error2;
        }
        break;
      case "ENOENT":
      case "ELOOP":
      case "ENAMETOOLONG":
      case "UNKNOWN":
        this.cache[this._makeAbs(f)] = false;
        break;
      default:
        this.cache[this._makeAbs(f)] = false;
        if (this.strict)
          throw er;
        if (!this.silent)
          console.error("glob error", er);
        break;
    }
  };
  GlobSync.prototype._processGlobStar = function(prefix, read, abs, remain, index, inGlobStar) {
    var entries = this._readdir(abs, inGlobStar);
    if (!entries)
      return;
    var remainWithoutGlobStar = remain.slice(1);
    var gspref = prefix ? [prefix] : [];
    var noGlobStar = gspref.concat(remainWithoutGlobStar);
    this._process(noGlobStar, index, false);
    var len = entries.length;
    var isSym = this.symlinks[abs];
    if (isSym && inGlobStar)
      return;
    for (var i = 0;i < len; i++) {
      var e = entries[i];
      if (e.charAt(0) === "." && !this.dot)
        continue;
      var instead = gspref.concat(entries[i], remainWithoutGlobStar);
      this._process(instead, index, true);
      var below = gspref.concat(entries[i], remain);
      this._process(below, index, true);
    }
  };
  GlobSync.prototype._processSimple = function(prefix, index) {
    var exists = this._stat(prefix);
    if (!this.matches[index])
      this.matches[index] = Object.create(null);
    if (!exists)
      return;
    if (prefix && isAbsolute(prefix) && !this.nomount) {
      var trail = /[\/\\]$/.test(prefix);
      if (prefix.charAt(0) === "/") {
        prefix = path.join(this.root, prefix);
      } else {
        prefix = path.resolve(this.root, prefix);
        if (trail)
          prefix += "/";
      }
    }
    if (process.platform === "win32")
      prefix = prefix.replace(/\\/g, "/");
    this._emitMatch(index, prefix);
  };
  GlobSync.prototype._stat = function(f) {
    var abs = this._makeAbs(f);
    var needDir = f.slice(-1) === "/";
    if (f.length > this.maxLength)
      return false;
    if (!this.stat && ownProp(this.cache, abs)) {
      var c = this.cache[abs];
      if (Array.isArray(c))
        c = "DIR";
      if (!needDir || c === "DIR")
        return c;
      if (needDir && c === "FILE")
        return false;
    }
    var exists;
    var stat = this.statCache[abs];
    if (!stat) {
      var lstat;
      try {
        lstat = this.fs.lstatSync(abs);
      } catch (er) {
        if (er && (er.code === "ENOENT" || er.code === "ENOTDIR")) {
          this.statCache[abs] = false;
          return false;
        }
      }
      if (lstat && lstat.isSymbolicLink()) {
        try {
          stat = this.fs.statSync(abs);
        } catch (er) {
          stat = lstat;
        }
      } else {
        stat = lstat;
      }
    }
    this.statCache[abs] = stat;
    var c = true;
    if (stat)
      c = stat.isDirectory() ? "DIR" : "FILE";
    this.cache[abs] = this.cache[abs] || c;
    if (needDir && c === "FILE")
      return false;
    return c;
  };
  GlobSync.prototype._mark = function(p) {
    return common.mark(this, p);
  };
  GlobSync.prototype._makeAbs = function(f) {
    return common.makeAbs(this, f);
  };
});

// node_modules/wrappy/wrappy.js
var require_wrappy = __commonJS((exports, module) => {
  var wrappy = function(fn, cb) {
    if (fn && cb)
      return wrappy(fn)(cb);
    if (typeof fn !== "function")
      throw new TypeError("need wrapper function");
    Object.keys(fn).forEach(function(k) {
      wrapper[k] = fn[k];
    });
    return wrapper;
    function wrapper() {
      var args = new Array(arguments.length);
      for (var i = 0;i < args.length; i++) {
        args[i] = arguments[i];
      }
      var ret = fn.apply(this, args);
      var cb2 = args[args.length - 1];
      if (typeof ret === "function" && ret !== cb2) {
        Object.keys(cb2).forEach(function(k) {
          ret[k] = cb2[k];
        });
      }
      return ret;
    }
  };
  module.exports = wrappy;
});

// node_modules/once/once.js
var require_once = __commonJS((exports, module) => {
  var once = function(fn) {
    var f = function() {
      if (f.called)
        return f.value;
      f.called = true;
      return f.value = fn.apply(this, arguments);
    };
    f.called = false;
    return f;
  };
  var onceStrict = function(fn) {
    var f = function() {
      if (f.called)
        throw new Error(f.onceError);
      f.called = true;
      return f.value = fn.apply(this, arguments);
    };
    var name = fn.name || "Function wrapped with `once`";
    f.onceError = name + " shouldn't be called more than once";
    f.called = false;
    return f;
  };
  var wrappy = require_wrappy();
  module.exports = wrappy(once);
  module.exports.strict = wrappy(onceStrict);
  once.proto = once(function() {
    Object.defineProperty(Function.prototype, "once", {
      value: function() {
        return once(this);
      },
      configurable: true
    });
    Object.defineProperty(Function.prototype, "onceStrict", {
      value: function() {
        return onceStrict(this);
      },
      configurable: true
    });
  });
});

// node_modules/inflight/inflight.js
var require_inflight = __commonJS((exports, module) => {
  var inflight = function(key, cb) {
    if (reqs[key]) {
      reqs[key].push(cb);
      return null;
    } else {
      reqs[key] = [cb];
      return makeres(key);
    }
  };
  var makeres = function(key) {
    return once(function RES() {
      var cbs = reqs[key];
      var len = cbs.length;
      var args = slice(arguments);
      try {
        for (var i = 0;i < len; i++) {
          cbs[i].apply(null, args);
        }
      } finally {
        if (cbs.length > len) {
          cbs.splice(0, len);
          process.nextTick(function() {
            RES.apply(null, args);
          });
        } else {
          delete reqs[key];
        }
      }
    });
  };
  var slice = function(args) {
    var length = args.length;
    var array = [];
    for (var i = 0;i < length; i++)
      array[i] = args[i];
    return array;
  };
  var wrappy = require_wrappy();
  var reqs = Object.create(null);
  var once = require_once();
  module.exports = wrappy(inflight);
});

// node_modules/glob/glob.js
var require_glob = __commonJS((exports, module) => {
  var glob = function(pattern, options, cb) {
    if (typeof options === "function")
      cb = options, options = {};
    if (!options)
      options = {};
    if (options.sync) {
      if (cb)
        throw new TypeError("callback provided to sync glob");
      return globSync(pattern, options);
    }
    return new Glob(pattern, options, cb);
  };
  var extend = function(origin, add) {
    if (add === null || typeof add !== "object") {
      return origin;
    }
    var keys = Object.keys(add);
    var i = keys.length;
    while (i--) {
      origin[keys[i]] = add[keys[i]];
    }
    return origin;
  };
  var Glob = function(pattern, options, cb) {
    if (typeof options === "function") {
      cb = options;
      options = null;
    }
    if (options && options.sync) {
      if (cb)
        throw new TypeError("callback provided to sync glob");
      return new GlobSync(pattern, options);
    }
    if (!(this instanceof Glob))
      return new Glob(pattern, options, cb);
    setopts(this, pattern, options);
    this._didRealPath = false;
    var n = this.minimatch.set.length;
    this.matches = new Array(n);
    if (typeof cb === "function") {
      cb = once(cb);
      this.on("error", cb);
      this.on("end", function(matches) {
        cb(null, matches);
      });
    }
    var self = this;
    this._processing = 0;
    this._emitQueue = [];
    this._processQueue = [];
    this.paused = false;
    if (this.noprocess)
      return this;
    if (n === 0)
      return done();
    var sync2 = true;
    for (var i = 0;i < n; i++) {
      this._process(this.minimatch.set[i], i, false, done);
    }
    sync2 = false;
    function done() {
      --self._processing;
      if (self._processing <= 0) {
        if (sync2) {
          process.nextTick(function() {
            self._finish();
          });
        } else {
          self._finish();
        }
      }
    }
  };
  var readdirCb = function(self, abs, cb) {
    return function(er, entries) {
      if (er)
        self._readdirError(abs, er, cb);
      else
        self._readdirEntries(abs, entries, cb);
    };
  };
  module.exports = glob;
  var rp = require_fs6();
  var minimatch = require_minimatch();
  var Minimatch = minimatch.Minimatch;
  var inherits = require_inherits();
  var EE = import.meta.require("events").EventEmitter;
  var path = import.meta.require("path");
  var assert = import.meta.require("assert");
  var isAbsolute = require_path_is_absolute();
  var globSync = require_sync7();
  var common = require_common3();
  var setopts = common.setopts;
  var ownProp = common.ownProp;
  var inflight = require_inflight();
  var util = import.meta.require("util");
  var childrenIgnored = common.childrenIgnored;
  var isIgnored = common.isIgnored;
  var once = require_once();
  glob.sync = globSync;
  var GlobSync = glob.GlobSync = globSync.GlobSync;
  glob.glob = glob;
  glob.hasMagic = function(pattern, options_) {
    var options = extend({}, options_);
    options.noprocess = true;
    var g = new Glob(pattern, options);
    var set = g.minimatch.set;
    if (!pattern)
      return false;
    if (set.length > 1)
      return true;
    for (var j = 0;j < set[0].length; j++) {
      if (typeof set[0][j] !== "string")
        return true;
    }
    return false;
  };
  glob.Glob = Glob;
  inherits(Glob, EE);
  Glob.prototype._finish = function() {
    assert(this instanceof Glob);
    if (this.aborted)
      return;
    if (this.realpath && !this._didRealpath)
      return this._realpath();
    common.finish(this);
    this.emit("end", this.found);
  };
  Glob.prototype._realpath = function() {
    if (this._didRealpath)
      return;
    this._didRealpath = true;
    var n = this.matches.length;
    if (n === 0)
      return this._finish();
    var self = this;
    for (var i = 0;i < this.matches.length; i++)
      this._realpathSet(i, next);
    function next() {
      if (--n === 0)
        self._finish();
    }
  };
  Glob.prototype._realpathSet = function(index, cb) {
    var matchset = this.matches[index];
    if (!matchset)
      return cb();
    var found = Object.keys(matchset);
    var self = this;
    var n = found.length;
    if (n === 0)
      return cb();
    var set = this.matches[index] = Object.create(null);
    found.forEach(function(p, i) {
      p = self._makeAbs(p);
      rp.realpath(p, self.realpathCache, function(er, real) {
        if (!er)
          set[real] = true;
        else if (er.syscall === "stat")
          set[p] = true;
        else
          self.emit("error", er);
        if (--n === 0) {
          self.matches[index] = set;
          cb();
        }
      });
    });
  };
  Glob.prototype._mark = function(p) {
    return common.mark(this, p);
  };
  Glob.prototype._makeAbs = function(f) {
    return common.makeAbs(this, f);
  };
  Glob.prototype.abort = function() {
    this.aborted = true;
    this.emit("abort");
  };
  Glob.prototype.pause = function() {
    if (!this.paused) {
      this.paused = true;
      this.emit("pause");
    }
  };
  Glob.prototype.resume = function() {
    if (this.paused) {
      this.emit("resume");
      this.paused = false;
      if (this._emitQueue.length) {
        var eq = this._emitQueue.slice(0);
        this._emitQueue.length = 0;
        for (var i = 0;i < eq.length; i++) {
          var e = eq[i];
          this._emitMatch(e[0], e[1]);
        }
      }
      if (this._processQueue.length) {
        var pq = this._processQueue.slice(0);
        this._processQueue.length = 0;
        for (var i = 0;i < pq.length; i++) {
          var p = pq[i];
          this._processing--;
          this._process(p[0], p[1], p[2], p[3]);
        }
      }
    }
  };
  Glob.prototype._process = function(pattern, index, inGlobStar, cb) {
    assert(this instanceof Glob);
    assert(typeof cb === "function");
    if (this.aborted)
      return;
    this._processing++;
    if (this.paused) {
      this._processQueue.push([pattern, index, inGlobStar, cb]);
      return;
    }
    var n = 0;
    while (typeof pattern[n] === "string") {
      n++;
    }
    var prefix;
    switch (n) {
      case pattern.length:
        this._processSimple(pattern.join("/"), index, cb);
        return;
      case 0:
        prefix = null;
        break;
      default:
        prefix = pattern.slice(0, n).join("/");
        break;
    }
    var remain = pattern.slice(n);
    var read;
    if (prefix === null)
      read = ".";
    else if (isAbsolute(prefix) || isAbsolute(pattern.map(function(p) {
      return typeof p === "string" ? p : "[*]";
    }).join("/"))) {
      if (!prefix || !isAbsolute(prefix))
        prefix = "/" + prefix;
      read = prefix;
    } else
      read = prefix;
    var abs = this._makeAbs(read);
    if (childrenIgnored(this, read))
      return cb();
    var isGlobStar = remain[0] === minimatch.GLOBSTAR;
    if (isGlobStar)
      this._processGlobStar(prefix, read, abs, remain, index, inGlobStar, cb);
    else
      this._processReaddir(prefix, read, abs, remain, index, inGlobStar, cb);
  };
  Glob.prototype._processReaddir = function(prefix, read, abs, remain, index, inGlobStar, cb) {
    var self = this;
    this._readdir(abs, inGlobStar, function(er, entries) {
      return self._processReaddir2(prefix, read, abs, remain, index, inGlobStar, entries, cb);
    });
  };
  Glob.prototype._processReaddir2 = function(prefix, read, abs, remain, index, inGlobStar, entries, cb) {
    if (!entries)
      return cb();
    var pn = remain[0];
    var negate = !!this.minimatch.negate;
    var rawGlob = pn._glob;
    var dotOk = this.dot || rawGlob.charAt(0) === ".";
    var matchedEntries = [];
    for (var i = 0;i < entries.length; i++) {
      var e = entries[i];
      if (e.charAt(0) !== "." || dotOk) {
        var m;
        if (negate && !prefix) {
          m = !e.match(pn);
        } else {
          m = e.match(pn);
        }
        if (m)
          matchedEntries.push(e);
      }
    }
    var len = matchedEntries.length;
    if (len === 0)
      return cb();
    if (remain.length === 1 && !this.mark && !this.stat) {
      if (!this.matches[index])
        this.matches[index] = Object.create(null);
      for (var i = 0;i < len; i++) {
        var e = matchedEntries[i];
        if (prefix) {
          if (prefix !== "/")
            e = prefix + "/" + e;
          else
            e = prefix + e;
        }
        if (e.charAt(0) === "/" && !this.nomount) {
          e = path.join(this.root, e);
        }
        this._emitMatch(index, e);
      }
      return cb();
    }
    remain.shift();
    for (var i = 0;i < len; i++) {
      var e = matchedEntries[i];
      var newPattern;
      if (prefix) {
        if (prefix !== "/")
          e = prefix + "/" + e;
        else
          e = prefix + e;
      }
      this._process([e].concat(remain), index, inGlobStar, cb);
    }
    cb();
  };
  Glob.prototype._emitMatch = function(index, e) {
    if (this.aborted)
      return;
    if (isIgnored(this, e))
      return;
    if (this.paused) {
      this._emitQueue.push([index, e]);
      return;
    }
    var abs = isAbsolute(e) ? e : this._makeAbs(e);
    if (this.mark)
      e = this._mark(e);
    if (this.absolute)
      e = abs;
    if (this.matches[index][e])
      return;
    if (this.nodir) {
      var c = this.cache[abs];
      if (c === "DIR" || Array.isArray(c))
        return;
    }
    this.matches[index][e] = true;
    var st = this.statCache[abs];
    if (st)
      this.emit("stat", e, st);
    this.emit("match", e);
  };
  Glob.prototype._readdirInGlobStar = function(abs, cb) {
    if (this.aborted)
      return;
    if (this.follow)
      return this._readdir(abs, false, cb);
    var lstatkey = "lstat\0" + abs;
    var self = this;
    var lstatcb = inflight(lstatkey, lstatcb_);
    if (lstatcb)
      self.fs.lstat(abs, lstatcb);
    function lstatcb_(er, lstat) {
      if (er && er.code === "ENOENT")
        return cb();
      var isSym = lstat && lstat.isSymbolicLink();
      self.symlinks[abs] = isSym;
      if (!isSym && lstat && !lstat.isDirectory()) {
        self.cache[abs] = "FILE";
        cb();
      } else
        self._readdir(abs, false, cb);
    }
  };
  Glob.prototype._readdir = function(abs, inGlobStar, cb) {
    if (this.aborted)
      return;
    cb = inflight("readdir\0" + abs + "\0" + inGlobStar, cb);
    if (!cb)
      return;
    if (inGlobStar && !ownProp(this.symlinks, abs))
      return this._readdirInGlobStar(abs, cb);
    if (ownProp(this.cache, abs)) {
      var c = this.cache[abs];
      if (!c || c === "FILE")
        return cb();
      if (Array.isArray(c))
        return cb(null, c);
    }
    var self = this;
    self.fs.readdir(abs, readdirCb(this, abs, cb));
  };
  Glob.prototype._readdirEntries = function(abs, entries, cb) {
    if (this.aborted)
      return;
    if (!this.mark && !this.stat) {
      for (var i = 0;i < entries.length; i++) {
        var e = entries[i];
        if (abs === "/")
          e = abs + e;
        else
          e = abs + "/" + e;
        this.cache[e] = true;
      }
    }
    this.cache[abs] = entries;
    return cb(null, entries);
  };
  Glob.prototype._readdirError = function(f, er, cb) {
    if (this.aborted)
      return;
    switch (er.code) {
      case "ENOTSUP":
      case "ENOTDIR":
        var abs = this._makeAbs(f);
        this.cache[abs] = "FILE";
        if (abs === this.cwdAbs) {
          var error2 = new Error(er.code + " invalid cwd " + this.cwd);
          error2.path = this.cwd;
          error2.code = er.code;
          this.emit("error", error2);
          this.abort();
        }
        break;
      case "ENOENT":
      case "ELOOP":
      case "ENAMETOOLONG":
      case "UNKNOWN":
        this.cache[this._makeAbs(f)] = false;
        break;
      default:
        this.cache[this._makeAbs(f)] = false;
        if (this.strict) {
          this.emit("error", er);
          this.abort();
        }
        if (!this.silent)
          console.error("glob error", er);
        break;
    }
    return cb();
  };
  Glob.prototype._processGlobStar = function(prefix, read, abs, remain, index, inGlobStar, cb) {
    var self = this;
    this._readdir(abs, inGlobStar, function(er, entries) {
      self._processGlobStar2(prefix, read, abs, remain, index, inGlobStar, entries, cb);
    });
  };
  Glob.prototype._processGlobStar2 = function(prefix, read, abs, remain, index, inGlobStar, entries, cb) {
    if (!entries)
      return cb();
    var remainWithoutGlobStar = remain.slice(1);
    var gspref = prefix ? [prefix] : [];
    var noGlobStar = gspref.concat(remainWithoutGlobStar);
    this._process(noGlobStar, index, false, cb);
    var isSym = this.symlinks[abs];
    var len = entries.length;
    if (isSym && inGlobStar)
      return cb();
    for (var i = 0;i < len; i++) {
      var e = entries[i];
      if (e.charAt(0) === "." && !this.dot)
        continue;
      var instead = gspref.concat(entries[i], remainWithoutGlobStar);
      this._process(instead, index, true, cb);
      var below = gspref.concat(entries[i], remain);
      this._process(below, index, true, cb);
    }
    cb();
  };
  Glob.prototype._processSimple = function(prefix, index, cb) {
    var self = this;
    this._stat(prefix, function(er, exists) {
      self._processSimple2(prefix, index, er, exists, cb);
    });
  };
  Glob.prototype._processSimple2 = function(prefix, index, er, exists, cb) {
    if (!this.matches[index])
      this.matches[index] = Object.create(null);
    if (!exists)
      return cb();
    if (prefix && isAbsolute(prefix) && !this.nomount) {
      var trail = /[\/\\]$/.test(prefix);
      if (prefix.charAt(0) === "/") {
        prefix = path.join(this.root, prefix);
      } else {
        prefix = path.resolve(this.root, prefix);
        if (trail)
          prefix += "/";
      }
    }
    if (process.platform === "win32")
      prefix = prefix.replace(/\\/g, "/");
    this._emitMatch(index, prefix);
    cb();
  };
  Glob.prototype._stat = function(f, cb) {
    var abs = this._makeAbs(f);
    var needDir = f.slice(-1) === "/";
    if (f.length > this.maxLength)
      return cb();
    if (!this.stat && ownProp(this.cache, abs)) {
      var c = this.cache[abs];
      if (Array.isArray(c))
        c = "DIR";
      if (!needDir || c === "DIR")
        return cb(null, c);
      if (needDir && c === "FILE")
        return cb();
    }
    var exists;
    var stat = this.statCache[abs];
    if (stat !== undefined) {
      if (stat === false)
        return cb(null, stat);
      else {
        var type = stat.isDirectory() ? "DIR" : "FILE";
        if (needDir && type === "FILE")
          return cb();
        else
          return cb(null, type, stat);
      }
    }
    var self = this;
    var statcb = inflight("stat\0" + abs, lstatcb_);
    if (statcb)
      self.fs.lstat(abs, statcb);
    function lstatcb_(er, lstat) {
      if (lstat && lstat.isSymbolicLink()) {
        return self.fs.stat(abs, function(er2, stat2) {
          if (er2)
            self._stat2(f, abs, null, lstat, cb);
          else
            self._stat2(f, abs, er2, stat2, cb);
        });
      } else {
        self._stat2(f, abs, er, lstat, cb);
      }
    }
  };
  Glob.prototype._stat2 = function(f, abs, er, stat, cb) {
    if (er && (er.code === "ENOENT" || er.code === "ENOTDIR")) {
      this.statCache[abs] = false;
      return cb();
    }
    var needDir = f.slice(-1) === "/";
    this.statCache[abs] = stat;
    if (abs.slice(-1) === "/" && stat && !stat.isDirectory())
      return cb(null, false, stat);
    var c = true;
    if (stat)
      c = stat.isDirectory() ? "DIR" : "FILE";
    this.cache[abs] = this.cache[abs] || c;
    if (needDir && c === "FILE")
      return cb();
    return cb(null, c, stat);
  };
});

// node_modules/globs/index.js
var require_globs = __commonJS((exports, module) => {
  var glob = require_glob();
  var globs = module.exports = function(patterns, options, callback) {
    var pending, groups = [];
    if (!Array.isArray(patterns)) {
      patterns = [patterns];
    }
    pending = patterns.length;
    if (typeof options === "function") {
      callback = options;
      options = {};
    }
    if (!pending) {
      return process.nextTick(function() {
        callback(null, []);
      });
    }
    patterns.forEach(function(pattern) {
      glob(pattern, options, function(err, files) {
        if (err) {
          return callback(err);
        }
        groups = groups.concat(files);
        pending -= 1;
        if (!pending) {
          return callback(null, groups);
        }
      });
    });
  };
  globs.sync = function(patterns, options) {
    options = options || {};
    var groups = [], index, length;
    if (!Array.isArray(patterns)) {
      patterns = [patterns];
    }
    for (index = 0, length = patterns.length;index < length; index++) {
      groups = groups.concat(glob.sync(patterns[index], options));
    }
    return groups;
  };
});

// node_modules/yargs/lib/platform-shims/esm.mjs
import {notStrictEqual, strictEqual} from "assert";

// node_modules/cliui/build/lib/index.js
var addBorder = function(col, ts, style) {
  if (col.border) {
    if (/[.']-+[.']/.test(ts)) {
      return "";
    }
    if (ts.trim().length !== 0) {
      return style;
    }
    return "  ";
  }
  return "";
};
var _minWidth = function(col) {
  const padding = col.padding || [];
  const minWidth = 1 + (padding[left] || 0) + (padding[right] || 0);
  if (col.border) {
    return minWidth + 4;
  }
  return minWidth;
};
var getWindowWidth = function() {
  if (typeof process === "object" && process.stdout && process.stdout.columns) {
    return process.stdout.columns;
  }
  return 80;
};
var alignRight = function(str, width) {
  str = str.trim();
  const strWidth = mixin.stringWidth(str);
  if (strWidth < width) {
    return " ".repeat(width - strWidth) + str;
  }
  return str;
};
var alignCenter = function(str, width) {
  str = str.trim();
  const strWidth = mixin.stringWidth(str);
  if (strWidth >= width) {
    return str;
  }
  return " ".repeat(width - strWidth >> 1) + str;
};
function cliui(opts, _mixin) {
  mixin = _mixin;
  return new UI({
    width: (opts === null || opts === undefined ? undefined : opts.width) || getWindowWidth(),
    wrap: opts === null || opts === undefined ? undefined : opts.wrap
  });
}
var align = {
  right: alignRight,
  center: alignCenter
};
var top = 0;
var right = 1;
var bottom = 2;
var left = 3;

class UI {
  constructor(opts) {
    var _a;
    this.width = opts.width;
    this.wrap = (_a = opts.wrap) !== null && _a !== undefined ? _a : true;
    this.rows = [];
  }
  span(...args) {
    const cols = this.div(...args);
    cols.span = true;
  }
  resetOutput() {
    this.rows = [];
  }
  div(...args) {
    if (args.length === 0) {
      this.div("");
    }
    if (this.wrap && this.shouldApplyLayoutDSL(...args) && typeof args[0] === "string") {
      return this.applyLayoutDSL(args[0]);
    }
    const cols = args.map((arg) => {
      if (typeof arg === "string") {
        return this.colFromString(arg);
      }
      return arg;
    });
    this.rows.push(cols);
    return cols;
  }
  shouldApplyLayoutDSL(...args) {
    return args.length === 1 && typeof args[0] === "string" && /[\t\n]/.test(args[0]);
  }
  applyLayoutDSL(str) {
    const rows = str.split("\n").map((row) => row.split("\t"));
    let leftColumnWidth = 0;
    rows.forEach((columns) => {
      if (columns.length > 1 && mixin.stringWidth(columns[0]) > leftColumnWidth) {
        leftColumnWidth = Math.min(Math.floor(this.width * 0.5), mixin.stringWidth(columns[0]));
      }
    });
    rows.forEach((columns) => {
      this.div(...columns.map((r, i) => {
        return {
          text: r.trim(),
          padding: this.measurePadding(r),
          width: i === 0 && columns.length > 1 ? leftColumnWidth : undefined
        };
      }));
    });
    return this.rows[this.rows.length - 1];
  }
  colFromString(text) {
    return {
      text,
      padding: this.measurePadding(text)
    };
  }
  measurePadding(str) {
    const noAnsi = mixin.stripAnsi(str);
    return [0, noAnsi.match(/\s*$/)[0].length, 0, noAnsi.match(/^\s*/)[0].length];
  }
  toString() {
    const lines = [];
    this.rows.forEach((row) => {
      this.rowToString(row, lines);
    });
    return lines.filter((line) => !line.hidden).map((line) => line.text).join("\n");
  }
  rowToString(row, lines) {
    this.rasterize(row).forEach((rrow, r) => {
      let str = "";
      rrow.forEach((col, c) => {
        const { width } = row[c];
        const wrapWidth = this.negatePadding(row[c]);
        let ts = col;
        if (wrapWidth > mixin.stringWidth(col)) {
          ts += " ".repeat(wrapWidth - mixin.stringWidth(col));
        }
        if (row[c].align && row[c].align !== "left" && this.wrap) {
          const fn = align[row[c].align];
          ts = fn(ts, wrapWidth);
          if (mixin.stringWidth(ts) < wrapWidth) {
            ts += " ".repeat((width || 0) - mixin.stringWidth(ts) - 1);
          }
        }
        const padding = row[c].padding || [0, 0, 0, 0];
        if (padding[left]) {
          str += " ".repeat(padding[left]);
        }
        str += addBorder(row[c], ts, "| ");
        str += ts;
        str += addBorder(row[c], ts, " |");
        if (padding[right]) {
          str += " ".repeat(padding[right]);
        }
        if (r === 0 && lines.length > 0) {
          str = this.renderInline(str, lines[lines.length - 1]);
        }
      });
      lines.push({
        text: str.replace(/ +$/, ""),
        span: row.span
      });
    });
    return lines;
  }
  renderInline(source, previousLine) {
    const match = source.match(/^ */);
    const leadingWhitespace = match ? match[0].length : 0;
    const target = previousLine.text;
    const targetTextWidth = mixin.stringWidth(target.trimRight());
    if (!previousLine.span) {
      return source;
    }
    if (!this.wrap) {
      previousLine.hidden = true;
      return target + source;
    }
    if (leadingWhitespace < targetTextWidth) {
      return source;
    }
    previousLine.hidden = true;
    return target.trimRight() + " ".repeat(leadingWhitespace - targetTextWidth) + source.trimLeft();
  }
  rasterize(row) {
    const rrows = [];
    const widths = this.columnWidths(row);
    let wrapped;
    row.forEach((col, c) => {
      col.width = widths[c];
      if (this.wrap) {
        wrapped = mixin.wrap(col.text, this.negatePadding(col), { hard: true }).split("\n");
      } else {
        wrapped = col.text.split("\n");
      }
      if (col.border) {
        wrapped.unshift("." + "-".repeat(this.negatePadding(col) + 2) + ".");
        wrapped.push("'" + "-".repeat(this.negatePadding(col) + 2) + "'");
      }
      if (col.padding) {
        wrapped.unshift(...new Array(col.padding[top] || 0).fill(""));
        wrapped.push(...new Array(col.padding[bottom] || 0).fill(""));
      }
      wrapped.forEach((str, r) => {
        if (!rrows[r]) {
          rrows.push([]);
        }
        const rrow = rrows[r];
        for (let i = 0;i < c; i++) {
          if (rrow[i] === undefined) {
            rrow.push("");
          }
        }
        rrow.push(str);
      });
    });
    return rrows;
  }
  negatePadding(col) {
    let wrapWidth = col.width || 0;
    if (col.padding) {
      wrapWidth -= (col.padding[left] || 0) + (col.padding[right] || 0);
    }
    if (col.border) {
      wrapWidth -= 4;
    }
    return wrapWidth;
  }
  columnWidths(row) {
    if (!this.wrap) {
      return row.map((col) => {
        return col.width || mixin.stringWidth(col.text);
      });
    }
    let unset = row.length;
    let remainingWidth = this.width;
    const widths = row.map((col) => {
      if (col.width) {
        unset--;
        remainingWidth -= col.width;
        return col.width;
      }
      return;
    });
    const unsetWidth = unset ? Math.floor(remainingWidth / unset) : 0;
    return widths.map((w, i) => {
      if (w === undefined) {
        return Math.max(unsetWidth, _minWidth(row[i]));
      }
      return w;
    });
  }
}
var mixin;

// node_modules/cliui/build/lib/string-utils.js
function stripAnsi(str) {
  return str.replace(ansi, "");
}
function wrap(str, width) {
  const [start, end] = str.match(ansi) || ["", ""];
  str = stripAnsi(str);
  let wrapped = "";
  for (let i = 0;i < str.length; i++) {
    if (i !== 0 && i % width === 0) {
      wrapped += "\n";
    }
    wrapped += str.charAt(i);
  }
  if (start && end) {
    wrapped = `${start}${wrapped}${end}`;
  }
  return wrapped;
}
var ansi = new RegExp("\x1B(?:\\[(?:\\d+[ABCDEFGJKSTm]|\\d+;\\d+[Hfm]|" + "\\d+;\\d+;\\d+m|6n|s|u|\\?25[lh])|\\w)", "g");

// node_modules/cliui/index.mjs
function ui(opts) {
  return cliui(opts, {
    stringWidth: (str) => {
      return [...str].length;
    },
    stripAnsi,
    wrap
  });
}

// node_modules/escalade/sync/index.mjs
import {dirname, resolve} from "path";
import {readdirSync, statSync} from "fs";
function sync_default(start, callback) {
  let dir = resolve(".", start);
  let tmp, stats = statSync(dir);
  if (!stats.isDirectory()) {
    dir = dirname(dir);
  }
  while (true) {
    tmp = callback(dir, readdirSync(dir));
    if (tmp)
      return resolve(dir, tmp);
    dir = dirname(tmp = dir);
    if (tmp === dir)
      break;
  }
}

// node_modules/yargs/lib/platform-shims/esm.mjs
import {format as format3, inspect} from "util";
import {readFileSync as readFileSync3} from "fs";
import {fileURLToPath} from "url";

// node_modules/yargs/node_modules/yargs-parser/build/lib/index.js
import {format} from "util";
import {readFileSync} from "fs";
import {normalize, resolve as resolve2} from "path";

// node_modules/yargs/node_modules/yargs-parser/build/lib/string-utils.js
function camelCase(str) {
  const isCamelCase = str !== str.toLowerCase() && str !== str.toUpperCase();
  if (!isCamelCase) {
    str = str.toLowerCase();
  }
  if (str.indexOf("-") === -1 && str.indexOf("_") === -1) {
    return str;
  } else {
    let camelcase = "";
    let nextChrUpper = false;
    const leadingHyphens = str.match(/^-+/);
    for (let i = leadingHyphens ? leadingHyphens[0].length : 0;i < str.length; i++) {
      let chr = str.charAt(i);
      if (nextChrUpper) {
        nextChrUpper = false;
        chr = chr.toUpperCase();
      }
      if (i !== 0 && (chr === "-" || chr === "_")) {
        nextChrUpper = true;
      } else if (chr !== "-" && chr !== "_") {
        camelcase += chr;
      }
    }
    return camelcase;
  }
}
function decamelize(str, joinString) {
  const lowercase = str.toLowerCase();
  joinString = joinString || "-";
  let notCamelcase = "";
  for (let i = 0;i < str.length; i++) {
    const chrLower = lowercase.charAt(i);
    const chrString = str.charAt(i);
    if (chrLower !== chrString && i > 0) {
      notCamelcase += `${joinString}${lowercase.charAt(i)}`;
    } else {
      notCamelcase += chrString;
    }
  }
  return notCamelcase;
}
function looksLikeNumber(x) {
  if (x === null || x === undefined)
    return false;
  if (typeof x === "number")
    return true;
  if (/^0x[0-9a-f]+$/i.test(x))
    return true;
  if (/^0[^.]/.test(x))
    return false;
  return /^[-]?(?:\d+(?:\.\d*)?|\.\d+)(e[-+]?\d+)?$/.test(x);
}

// node_modules/yargs/node_modules/yargs-parser/build/lib/tokenize-arg-string.js
function tokenizeArgString(argString) {
  if (Array.isArray(argString)) {
    return argString.map((e) => typeof e !== "string" ? e + "" : e);
  }
  argString = argString.trim();
  let i = 0;
  let prevC = null;
  let c = null;
  let opening = null;
  const args = [];
  for (let ii = 0;ii < argString.length; ii++) {
    prevC = c;
    c = argString.charAt(ii);
    if (c === " " && !opening) {
      if (!(prevC === " ")) {
        i++;
      }
      continue;
    }
    if (c === opening) {
      opening = null;
    } else if ((c === "'" || c === '"') && !opening) {
      opening = c;
    }
    if (!args[i])
      args[i] = "";
    args[i] += c;
  }
  return args;
}

// node_modules/yargs/node_modules/yargs-parser/build/lib/yargs-parser-types.js
var DefaultValuesForTypeKey;
(function(DefaultValuesForTypeKey2) {
  DefaultValuesForTypeKey2["BOOLEAN"] = "boolean";
  DefaultValuesForTypeKey2["STRING"] = "string";
  DefaultValuesForTypeKey2["NUMBER"] = "number";
  DefaultValuesForTypeKey2["ARRAY"] = "array";
})(DefaultValuesForTypeKey || (DefaultValuesForTypeKey = {}));

// node_modules/yargs/node_modules/yargs-parser/build/lib/yargs-parser.js
var combineAliases = function(aliases) {
  const aliasArrays = [];
  const combined = Object.create(null);
  let change = true;
  Object.keys(aliases).forEach(function(key) {
    aliasArrays.push([].concat(aliases[key], key));
  });
  while (change) {
    change = false;
    for (let i = 0;i < aliasArrays.length; i++) {
      for (let ii = i + 1;ii < aliasArrays.length; ii++) {
        const intersect = aliasArrays[i].filter(function(v) {
          return aliasArrays[ii].indexOf(v) !== -1;
        });
        if (intersect.length) {
          aliasArrays[i] = aliasArrays[i].concat(aliasArrays[ii]);
          aliasArrays.splice(ii, 1);
          change = true;
          break;
        }
      }
    }
  }
  aliasArrays.forEach(function(aliasArray) {
    aliasArray = aliasArray.filter(function(v, i, self) {
      return self.indexOf(v) === i;
    });
    const lastAlias = aliasArray.pop();
    if (lastAlias !== undefined && typeof lastAlias === "string") {
      combined[lastAlias] = aliasArray;
    }
  });
  return combined;
};
var increment = function(orig) {
  return orig !== undefined ? orig + 1 : 1;
};
var sanitizeKey = function(key) {
  if (key === "__proto__")
    return "___proto___";
  return key;
};
var mixin2;

class YargsParser {
  constructor(_mixin) {
    mixin2 = _mixin;
  }
  parse(argsInput, options) {
    const opts = Object.assign({
      alias: undefined,
      array: undefined,
      boolean: undefined,
      config: undefined,
      configObjects: undefined,
      configuration: undefined,
      coerce: undefined,
      count: undefined,
      default: undefined,
      envPrefix: undefined,
      narg: undefined,
      normalize: undefined,
      string: undefined,
      number: undefined,
      __: undefined,
      key: undefined
    }, options);
    const args = tokenizeArgString(argsInput);
    const aliases = combineAliases(Object.assign(Object.create(null), opts.alias));
    const configuration = Object.assign({
      "boolean-negation": true,
      "camel-case-expansion": true,
      "combine-arrays": false,
      "dot-notation": true,
      "duplicate-arguments-array": true,
      "flatten-duplicate-arrays": true,
      "greedy-arrays": true,
      "halt-at-non-option": false,
      "nargs-eats-options": false,
      "negation-prefix": "no-",
      "parse-numbers": true,
      "parse-positional-numbers": true,
      "populate--": false,
      "set-placeholder-key": false,
      "short-option-groups": true,
      "strip-aliased": false,
      "strip-dashed": false,
      "unknown-options-as-args": false
    }, opts.configuration);
    const defaults = Object.assign(Object.create(null), opts.default);
    const configObjects = opts.configObjects || [];
    const envPrefix = opts.envPrefix;
    const notFlagsOption = configuration["populate--"];
    const notFlagsArgv = notFlagsOption ? "--" : "_";
    const newAliases = Object.create(null);
    const defaulted = Object.create(null);
    const __ = opts.__ || mixin2.format;
    const flags = {
      aliases: Object.create(null),
      arrays: Object.create(null),
      bools: Object.create(null),
      strings: Object.create(null),
      numbers: Object.create(null),
      counts: Object.create(null),
      normalize: Object.create(null),
      configs: Object.create(null),
      nargs: Object.create(null),
      coercions: Object.create(null),
      keys: []
    };
    const negative = /^-([0-9]+(\.[0-9]+)?|\.[0-9]+)$/;
    const negatedBoolean = new RegExp("^--" + configuration["negation-prefix"] + "(.+)");
    [].concat(opts.array || []).filter(Boolean).forEach(function(opt) {
      const key = typeof opt === "object" ? opt.key : opt;
      const assignment = Object.keys(opt).map(function(key2) {
        const arrayFlagKeys = {
          boolean: "bools",
          string: "strings",
          number: "numbers"
        };
        return arrayFlagKeys[key2];
      }).filter(Boolean).pop();
      if (assignment) {
        flags[assignment][key] = true;
      }
      flags.arrays[key] = true;
      flags.keys.push(key);
    });
    [].concat(opts.boolean || []).filter(Boolean).forEach(function(key) {
      flags.bools[key] = true;
      flags.keys.push(key);
    });
    [].concat(opts.string || []).filter(Boolean).forEach(function(key) {
      flags.strings[key] = true;
      flags.keys.push(key);
    });
    [].concat(opts.number || []).filter(Boolean).forEach(function(key) {
      flags.numbers[key] = true;
      flags.keys.push(key);
    });
    [].concat(opts.count || []).filter(Boolean).forEach(function(key) {
      flags.counts[key] = true;
      flags.keys.push(key);
    });
    [].concat(opts.normalize || []).filter(Boolean).forEach(function(key) {
      flags.normalize[key] = true;
      flags.keys.push(key);
    });
    if (typeof opts.narg === "object") {
      Object.entries(opts.narg).forEach(([key, value]) => {
        if (typeof value === "number") {
          flags.nargs[key] = value;
          flags.keys.push(key);
        }
      });
    }
    if (typeof opts.coerce === "object") {
      Object.entries(opts.coerce).forEach(([key, value]) => {
        if (typeof value === "function") {
          flags.coercions[key] = value;
          flags.keys.push(key);
        }
      });
    }
    if (typeof opts.config !== "undefined") {
      if (Array.isArray(opts.config) || typeof opts.config === "string") {
        [].concat(opts.config).filter(Boolean).forEach(function(key) {
          flags.configs[key] = true;
        });
      } else if (typeof opts.config === "object") {
        Object.entries(opts.config).forEach(([key, value]) => {
          if (typeof value === "boolean" || typeof value === "function") {
            flags.configs[key] = value;
          }
        });
      }
    }
    extendAliases(opts.key, aliases, opts.default, flags.arrays);
    Object.keys(defaults).forEach(function(key) {
      (flags.aliases[key] || []).forEach(function(alias) {
        defaults[alias] = defaults[key];
      });
    });
    let error = null;
    checkConfiguration();
    let notFlags = [];
    const argv = Object.assign(Object.create(null), { _: [] });
    const argvReturn = {};
    for (let i = 0;i < args.length; i++) {
      const arg = args[i];
      const truncatedArg = arg.replace(/^-{3,}/, "---");
      let broken;
      let key;
      let letters;
      let m;
      let next;
      let value;
      if (arg !== "--" && isUnknownOptionAsArg(arg)) {
        pushPositional(arg);
      } else if (truncatedArg.match(/---+(=|$)/)) {
        pushPositional(arg);
        continue;
      } else if (arg.match(/^--.+=/) || !configuration["short-option-groups"] && arg.match(/^-.+=/)) {
        m = arg.match(/^--?([^=]+)=([\s\S]*)$/);
        if (m !== null && Array.isArray(m) && m.length >= 3) {
          if (checkAllAliases(m[1], flags.arrays)) {
            i = eatArray(i, m[1], args, m[2]);
          } else if (checkAllAliases(m[1], flags.nargs) !== false) {
            i = eatNargs(i, m[1], args, m[2]);
          } else {
            setArg(m[1], m[2]);
          }
        }
      } else if (arg.match(negatedBoolean) && configuration["boolean-negation"]) {
        m = arg.match(negatedBoolean);
        if (m !== null && Array.isArray(m) && m.length >= 2) {
          key = m[1];
          setArg(key, checkAllAliases(key, flags.arrays) ? [false] : false);
        }
      } else if (arg.match(/^--.+/) || !configuration["short-option-groups"] && arg.match(/^-[^-]+/)) {
        m = arg.match(/^--?(.+)/);
        if (m !== null && Array.isArray(m) && m.length >= 2) {
          key = m[1];
          if (checkAllAliases(key, flags.arrays)) {
            i = eatArray(i, key, args);
          } else if (checkAllAliases(key, flags.nargs) !== false) {
            i = eatNargs(i, key, args);
          } else {
            next = args[i + 1];
            if (next !== undefined && (!next.match(/^-/) || next.match(negative)) && !checkAllAliases(key, flags.bools) && !checkAllAliases(key, flags.counts)) {
              setArg(key, next);
              i++;
            } else if (/^(true|false)$/.test(next)) {
              setArg(key, next);
              i++;
            } else {
              setArg(key, defaultValue(key));
            }
          }
        }
      } else if (arg.match(/^-.\..+=/)) {
        m = arg.match(/^-([^=]+)=([\s\S]*)$/);
        if (m !== null && Array.isArray(m) && m.length >= 3) {
          setArg(m[1], m[2]);
        }
      } else if (arg.match(/^-.\..+/) && !arg.match(negative)) {
        next = args[i + 1];
        m = arg.match(/^-(.\..+)/);
        if (m !== null && Array.isArray(m) && m.length >= 2) {
          key = m[1];
          if (next !== undefined && !next.match(/^-/) && !checkAllAliases(key, flags.bools) && !checkAllAliases(key, flags.counts)) {
            setArg(key, next);
            i++;
          } else {
            setArg(key, defaultValue(key));
          }
        }
      } else if (arg.match(/^-[^-]+/) && !arg.match(negative)) {
        letters = arg.slice(1, -1).split("");
        broken = false;
        for (let j = 0;j < letters.length; j++) {
          next = arg.slice(j + 2);
          if (letters[j + 1] && letters[j + 1] === "=") {
            value = arg.slice(j + 3);
            key = letters[j];
            if (checkAllAliases(key, flags.arrays)) {
              i = eatArray(i, key, args, value);
            } else if (checkAllAliases(key, flags.nargs) !== false) {
              i = eatNargs(i, key, args, value);
            } else {
              setArg(key, value);
            }
            broken = true;
            break;
          }
          if (next === "-") {
            setArg(letters[j], next);
            continue;
          }
          if (/[A-Za-z]/.test(letters[j]) && /^-?\d+(\.\d*)?(e-?\d+)?$/.test(next) && checkAllAliases(next, flags.bools) === false) {
            setArg(letters[j], next);
            broken = true;
            break;
          }
          if (letters[j + 1] && letters[j + 1].match(/\W/)) {
            setArg(letters[j], next);
            broken = true;
            break;
          } else {
            setArg(letters[j], defaultValue(letters[j]));
          }
        }
        key = arg.slice(-1)[0];
        if (!broken && key !== "-") {
          if (checkAllAliases(key, flags.arrays)) {
            i = eatArray(i, key, args);
          } else if (checkAllAliases(key, flags.nargs) !== false) {
            i = eatNargs(i, key, args);
          } else {
            next = args[i + 1];
            if (next !== undefined && (!/^(-|--)[^-]/.test(next) || next.match(negative)) && !checkAllAliases(key, flags.bools) && !checkAllAliases(key, flags.counts)) {
              setArg(key, next);
              i++;
            } else if (/^(true|false)$/.test(next)) {
              setArg(key, next);
              i++;
            } else {
              setArg(key, defaultValue(key));
            }
          }
        }
      } else if (arg.match(/^-[0-9]$/) && arg.match(negative) && checkAllAliases(arg.slice(1), flags.bools)) {
        key = arg.slice(1);
        setArg(key, defaultValue(key));
      } else if (arg === "--") {
        notFlags = args.slice(i + 1);
        break;
      } else if (configuration["halt-at-non-option"]) {
        notFlags = args.slice(i);
        break;
      } else {
        pushPositional(arg);
      }
    }
    applyEnvVars(argv, true);
    applyEnvVars(argv, false);
    setConfig(argv);
    setConfigObjects();
    applyDefaultsAndAliases(argv, flags.aliases, defaults, true);
    applyCoercions(argv);
    if (configuration["set-placeholder-key"])
      setPlaceholderKeys(argv);
    Object.keys(flags.counts).forEach(function(key) {
      if (!hasKey(argv, key.split(".")))
        setArg(key, 0);
    });
    if (notFlagsOption && notFlags.length)
      argv[notFlagsArgv] = [];
    notFlags.forEach(function(key) {
      argv[notFlagsArgv].push(key);
    });
    if (configuration["camel-case-expansion"] && configuration["strip-dashed"]) {
      Object.keys(argv).filter((key) => key !== "--" && key.includes("-")).forEach((key) => {
        delete argv[key];
      });
    }
    if (configuration["strip-aliased"]) {
      [].concat(...Object.keys(aliases).map((k) => aliases[k])).forEach((alias) => {
        if (configuration["camel-case-expansion"] && alias.includes("-")) {
          delete argv[alias.split(".").map((prop) => camelCase(prop)).join(".")];
        }
        delete argv[alias];
      });
    }
    function pushPositional(arg) {
      const maybeCoercedNumber = maybeCoerceNumber("_", arg);
      if (typeof maybeCoercedNumber === "string" || typeof maybeCoercedNumber === "number") {
        argv._.push(maybeCoercedNumber);
      }
    }
    function eatNargs(i, key, args2, argAfterEqualSign) {
      let ii;
      let toEat = checkAllAliases(key, flags.nargs);
      toEat = typeof toEat !== "number" || isNaN(toEat) ? 1 : toEat;
      if (toEat === 0) {
        if (!isUndefined(argAfterEqualSign)) {
          error = Error(__("Argument unexpected for: %s", key));
        }
        setArg(key, defaultValue(key));
        return i;
      }
      let available = isUndefined(argAfterEqualSign) ? 0 : 1;
      if (configuration["nargs-eats-options"]) {
        if (args2.length - (i + 1) + available < toEat) {
          error = Error(__("Not enough arguments following: %s", key));
        }
        available = toEat;
      } else {
        for (ii = i + 1;ii < args2.length; ii++) {
          if (!args2[ii].match(/^-[^0-9]/) || args2[ii].match(negative) || isUnknownOptionAsArg(args2[ii]))
            available++;
          else
            break;
        }
        if (available < toEat)
          error = Error(__("Not enough arguments following: %s", key));
      }
      let consumed = Math.min(available, toEat);
      if (!isUndefined(argAfterEqualSign) && consumed > 0) {
        setArg(key, argAfterEqualSign);
        consumed--;
      }
      for (ii = i + 1;ii < consumed + i + 1; ii++) {
        setArg(key, args2[ii]);
      }
      return i + consumed;
    }
    function eatArray(i, key, args2, argAfterEqualSign) {
      let argsToSet = [];
      let next = argAfterEqualSign || args2[i + 1];
      const nargsCount = checkAllAliases(key, flags.nargs);
      if (checkAllAliases(key, flags.bools) && !/^(true|false)$/.test(next)) {
        argsToSet.push(true);
      } else if (isUndefined(next) || isUndefined(argAfterEqualSign) && /^-/.test(next) && !negative.test(next) && !isUnknownOptionAsArg(next)) {
        if (defaults[key] !== undefined) {
          const defVal = defaults[key];
          argsToSet = Array.isArray(defVal) ? defVal : [defVal];
        }
      } else {
        if (!isUndefined(argAfterEqualSign)) {
          argsToSet.push(processValue(key, argAfterEqualSign));
        }
        for (let ii = i + 1;ii < args2.length; ii++) {
          if (!configuration["greedy-arrays"] && argsToSet.length > 0 || nargsCount && typeof nargsCount === "number" && argsToSet.length >= nargsCount)
            break;
          next = args2[ii];
          if (/^-/.test(next) && !negative.test(next) && !isUnknownOptionAsArg(next))
            break;
          i = ii;
          argsToSet.push(processValue(key, next));
        }
      }
      if (typeof nargsCount === "number" && (nargsCount && argsToSet.length < nargsCount || isNaN(nargsCount) && argsToSet.length === 0)) {
        error = Error(__("Not enough arguments following: %s", key));
      }
      setArg(key, argsToSet);
      return i;
    }
    function setArg(key, val) {
      if (/-/.test(key) && configuration["camel-case-expansion"]) {
        const alias = key.split(".").map(function(prop) {
          return camelCase(prop);
        }).join(".");
        addNewAlias(key, alias);
      }
      const value = processValue(key, val);
      const splitKey = key.split(".");
      setKey(argv, splitKey, value);
      if (flags.aliases[key]) {
        flags.aliases[key].forEach(function(x) {
          const keyProperties = x.split(".");
          setKey(argv, keyProperties, value);
        });
      }
      if (splitKey.length > 1 && configuration["dot-notation"]) {
        (flags.aliases[splitKey[0]] || []).forEach(function(x) {
          let keyProperties = x.split(".");
          const a = [].concat(splitKey);
          a.shift();
          keyProperties = keyProperties.concat(a);
          if (!(flags.aliases[key] || []).includes(keyProperties.join("."))) {
            setKey(argv, keyProperties, value);
          }
        });
      }
      if (checkAllAliases(key, flags.normalize) && !checkAllAliases(key, flags.arrays)) {
        const keys = [key].concat(flags.aliases[key] || []);
        keys.forEach(function(key2) {
          Object.defineProperty(argvReturn, key2, {
            enumerable: true,
            get() {
              return val;
            },
            set(value2) {
              val = typeof value2 === "string" ? mixin2.normalize(value2) : value2;
            }
          });
        });
      }
    }
    function addNewAlias(key, alias) {
      if (!(flags.aliases[key] && flags.aliases[key].length)) {
        flags.aliases[key] = [alias];
        newAliases[alias] = true;
      }
      if (!(flags.aliases[alias] && flags.aliases[alias].length)) {
        addNewAlias(alias, key);
      }
    }
    function processValue(key, val) {
      if (typeof val === "string" && (val[0] === "'" || val[0] === '"') && val[val.length - 1] === val[0]) {
        val = val.substring(1, val.length - 1);
      }
      if (checkAllAliases(key, flags.bools) || checkAllAliases(key, flags.counts)) {
        if (typeof val === "string")
          val = val === "true";
      }
      let value = Array.isArray(val) ? val.map(function(v) {
        return maybeCoerceNumber(key, v);
      }) : maybeCoerceNumber(key, val);
      if (checkAllAliases(key, flags.counts) && (isUndefined(value) || typeof value === "boolean")) {
        value = increment();
      }
      if (checkAllAliases(key, flags.normalize) && checkAllAliases(key, flags.arrays)) {
        if (Array.isArray(val))
          value = val.map((val2) => {
            return mixin2.normalize(val2);
          });
        else
          value = mixin2.normalize(val);
      }
      return value;
    }
    function maybeCoerceNumber(key, value) {
      if (!configuration["parse-positional-numbers"] && key === "_")
        return value;
      if (!checkAllAliases(key, flags.strings) && !checkAllAliases(key, flags.bools) && !Array.isArray(value)) {
        const shouldCoerceNumber = looksLikeNumber(value) && configuration["parse-numbers"] && Number.isSafeInteger(Math.floor(parseFloat(`${value}`)));
        if (shouldCoerceNumber || !isUndefined(value) && checkAllAliases(key, flags.numbers)) {
          value = Number(value);
        }
      }
      return value;
    }
    function setConfig(argv2) {
      const configLookup = Object.create(null);
      applyDefaultsAndAliases(configLookup, flags.aliases, defaults);
      Object.keys(flags.configs).forEach(function(configKey) {
        const configPath = argv2[configKey] || configLookup[configKey];
        if (configPath) {
          try {
            let config = null;
            const resolvedConfigPath = mixin2.resolve(mixin2.cwd(), configPath);
            const resolveConfig = flags.configs[configKey];
            if (typeof resolveConfig === "function") {
              try {
                config = resolveConfig(resolvedConfigPath);
              } catch (e) {
                config = e;
              }
              if (config instanceof Error) {
                error = config;
                return;
              }
            } else {
              config = mixin2.require(resolvedConfigPath);
            }
            setConfigObject(config);
          } catch (ex) {
            if (ex.name === "PermissionDenied")
              error = ex;
            else if (argv2[configKey])
              error = Error(__("Invalid JSON config file: %s", configPath));
          }
        }
      });
    }
    function setConfigObject(config, prev) {
      Object.keys(config).forEach(function(key) {
        const value = config[key];
        const fullKey = prev ? prev + "." + key : key;
        if (typeof value === "object" && value !== null && !Array.isArray(value) && configuration["dot-notation"]) {
          setConfigObject(value, fullKey);
        } else {
          if (!hasKey(argv, fullKey.split(".")) || checkAllAliases(fullKey, flags.arrays) && configuration["combine-arrays"]) {
            setArg(fullKey, value);
          }
        }
      });
    }
    function setConfigObjects() {
      if (typeof configObjects !== "undefined") {
        configObjects.forEach(function(configObject) {
          setConfigObject(configObject);
        });
      }
    }
    function applyEnvVars(argv2, configOnly) {
      if (typeof envPrefix === "undefined")
        return;
      const prefix = typeof envPrefix === "string" ? envPrefix : "";
      const env = mixin2.env();
      Object.keys(env).forEach(function(envVar) {
        if (prefix === "" || envVar.lastIndexOf(prefix, 0) === 0) {
          const keys = envVar.split("__").map(function(key, i) {
            if (i === 0) {
              key = key.substring(prefix.length);
            }
            return camelCase(key);
          });
          if ((configOnly && flags.configs[keys.join(".")] || !configOnly) && !hasKey(argv2, keys)) {
            setArg(keys.join("."), env[envVar]);
          }
        }
      });
    }
    function applyCoercions(argv2) {
      let coerce;
      const applied = new Set;
      Object.keys(argv2).forEach(function(key) {
        if (!applied.has(key)) {
          coerce = checkAllAliases(key, flags.coercions);
          if (typeof coerce === "function") {
            try {
              const value = maybeCoerceNumber(key, coerce(argv2[key]));
              [].concat(flags.aliases[key] || [], key).forEach((ali) => {
                applied.add(ali);
                argv2[ali] = value;
              });
            } catch (err) {
              error = err;
            }
          }
        }
      });
    }
    function setPlaceholderKeys(argv2) {
      flags.keys.forEach((key) => {
        if (~key.indexOf("."))
          return;
        if (typeof argv2[key] === "undefined")
          argv2[key] = undefined;
      });
      return argv2;
    }
    function applyDefaultsAndAliases(obj, aliases2, defaults2, canLog = false) {
      Object.keys(defaults2).forEach(function(key) {
        if (!hasKey(obj, key.split("."))) {
          setKey(obj, key.split("."), defaults2[key]);
          if (canLog)
            defaulted[key] = true;
          (aliases2[key] || []).forEach(function(x) {
            if (hasKey(obj, x.split(".")))
              return;
            setKey(obj, x.split("."), defaults2[key]);
          });
        }
      });
    }
    function hasKey(obj, keys) {
      let o = obj;
      if (!configuration["dot-notation"])
        keys = [keys.join(".")];
      keys.slice(0, -1).forEach(function(key2) {
        o = o[key2] || {};
      });
      const key = keys[keys.length - 1];
      if (typeof o !== "object")
        return false;
      else
        return key in o;
    }
    function setKey(obj, keys, value) {
      let o = obj;
      if (!configuration["dot-notation"])
        keys = [keys.join(".")];
      keys.slice(0, -1).forEach(function(key2) {
        key2 = sanitizeKey(key2);
        if (typeof o === "object" && o[key2] === undefined) {
          o[key2] = {};
        }
        if (typeof o[key2] !== "object" || Array.isArray(o[key2])) {
          if (Array.isArray(o[key2])) {
            o[key2].push({});
          } else {
            o[key2] = [o[key2], {}];
          }
          o = o[key2][o[key2].length - 1];
        } else {
          o = o[key2];
        }
      });
      const key = sanitizeKey(keys[keys.length - 1]);
      const isTypeArray = checkAllAliases(keys.join("."), flags.arrays);
      const isValueArray = Array.isArray(value);
      let duplicate = configuration["duplicate-arguments-array"];
      if (!duplicate && checkAllAliases(key, flags.nargs)) {
        duplicate = true;
        if (!isUndefined(o[key]) && flags.nargs[key] === 1 || Array.isArray(o[key]) && o[key].length === flags.nargs[key]) {
          o[key] = undefined;
        }
      }
      if (value === increment()) {
        o[key] = increment(o[key]);
      } else if (Array.isArray(o[key])) {
        if (duplicate && isTypeArray && isValueArray) {
          o[key] = configuration["flatten-duplicate-arrays"] ? o[key].concat(value) : (Array.isArray(o[key][0]) ? o[key] : [o[key]]).concat([value]);
        } else if (!duplicate && Boolean(isTypeArray) === Boolean(isValueArray)) {
          o[key] = value;
        } else {
          o[key] = o[key].concat([value]);
        }
      } else if (o[key] === undefined && isTypeArray) {
        o[key] = isValueArray ? value : [value];
      } else if (duplicate && !(o[key] === undefined || checkAllAliases(key, flags.counts) || checkAllAliases(key, flags.bools))) {
        o[key] = [o[key], value];
      } else {
        o[key] = value;
      }
    }
    function extendAliases(...args2) {
      args2.forEach(function(obj) {
        Object.keys(obj || {}).forEach(function(key) {
          if (flags.aliases[key])
            return;
          flags.aliases[key] = [].concat(aliases[key] || []);
          flags.aliases[key].concat(key).forEach(function(x) {
            if (/-/.test(x) && configuration["camel-case-expansion"]) {
              const c = camelCase(x);
              if (c !== key && flags.aliases[key].indexOf(c) === -1) {
                flags.aliases[key].push(c);
                newAliases[c] = true;
              }
            }
          });
          flags.aliases[key].concat(key).forEach(function(x) {
            if (x.length > 1 && /[A-Z]/.test(x) && configuration["camel-case-expansion"]) {
              const c = decamelize(x, "-");
              if (c !== key && flags.aliases[key].indexOf(c) === -1) {
                flags.aliases[key].push(c);
                newAliases[c] = true;
              }
            }
          });
          flags.aliases[key].forEach(function(x) {
            flags.aliases[x] = [key].concat(flags.aliases[key].filter(function(y) {
              return x !== y;
            }));
          });
        });
      });
    }
    function checkAllAliases(key, flag) {
      const toCheck = [].concat(flags.aliases[key] || [], key);
      const keys = Object.keys(flag);
      const setAlias = toCheck.find((key2) => keys.includes(key2));
      return setAlias ? flag[setAlias] : false;
    }
    function hasAnyFlag(key) {
      const flagsKeys = Object.keys(flags);
      const toCheck = [].concat(flagsKeys.map((k) => flags[k]));
      return toCheck.some(function(flag) {
        return Array.isArray(flag) ? flag.includes(key) : flag[key];
      });
    }
    function hasFlagsMatching(arg, ...patterns) {
      const toCheck = [].concat(...patterns);
      return toCheck.some(function(pattern) {
        const match = arg.match(pattern);
        return match && hasAnyFlag(match[1]);
      });
    }
    function hasAllShortFlags(arg) {
      if (arg.match(negative) || !arg.match(/^-[^-]+/)) {
        return false;
      }
      let hasAllFlags = true;
      let next;
      const letters = arg.slice(1).split("");
      for (let j = 0;j < letters.length; j++) {
        next = arg.slice(j + 2);
        if (!hasAnyFlag(letters[j])) {
          hasAllFlags = false;
          break;
        }
        if (letters[j + 1] && letters[j + 1] === "=" || next === "-" || /[A-Za-z]/.test(letters[j]) && /^-?\d+(\.\d*)?(e-?\d+)?$/.test(next) || letters[j + 1] && letters[j + 1].match(/\W/)) {
          break;
        }
      }
      return hasAllFlags;
    }
    function isUnknownOptionAsArg(arg) {
      return configuration["unknown-options-as-args"] && isUnknownOption(arg);
    }
    function isUnknownOption(arg) {
      arg = arg.replace(/^-{3,}/, "--");
      if (arg.match(negative)) {
        return false;
      }
      if (hasAllShortFlags(arg)) {
        return false;
      }
      const flagWithEquals = /^-+([^=]+?)=[\s\S]*$/;
      const normalFlag = /^-+([^=]+?)$/;
      const flagEndingInHyphen = /^-+([^=]+?)-$/;
      const flagEndingInDigits = /^-+([^=]+?\d+)$/;
      const flagEndingInNonWordCharacters = /^-+([^=]+?)\W+.*$/;
      return !hasFlagsMatching(arg, flagWithEquals, negatedBoolean, normalFlag, flagEndingInHyphen, flagEndingInDigits, flagEndingInNonWordCharacters);
    }
    function defaultValue(key) {
      if (!checkAllAliases(key, flags.bools) && !checkAllAliases(key, flags.counts) && (`${key}` in defaults)) {
        return defaults[key];
      } else {
        return defaultForType(guessType(key));
      }
    }
    function defaultForType(type) {
      const def = {
        [DefaultValuesForTypeKey.BOOLEAN]: true,
        [DefaultValuesForTypeKey.STRING]: "",
        [DefaultValuesForTypeKey.NUMBER]: undefined,
        [DefaultValuesForTypeKey.ARRAY]: []
      };
      return def[type];
    }
    function guessType(key) {
      let type = DefaultValuesForTypeKey.BOOLEAN;
      if (checkAllAliases(key, flags.strings))
        type = DefaultValuesForTypeKey.STRING;
      else if (checkAllAliases(key, flags.numbers))
        type = DefaultValuesForTypeKey.NUMBER;
      else if (checkAllAliases(key, flags.bools))
        type = DefaultValuesForTypeKey.BOOLEAN;
      else if (checkAllAliases(key, flags.arrays))
        type = DefaultValuesForTypeKey.ARRAY;
      return type;
    }
    function isUndefined(num) {
      return num === undefined;
    }
    function checkConfiguration() {
      Object.keys(flags.counts).find((key) => {
        if (checkAllAliases(key, flags.arrays)) {
          error = Error(__("Invalid configuration: %s, opts.count excludes opts.array.", key));
          return true;
        } else if (checkAllAliases(key, flags.nargs)) {
          error = Error(__("Invalid configuration: %s, opts.count excludes opts.narg.", key));
          return true;
        }
        return false;
      });
    }
    return {
      aliases: Object.assign({}, flags.aliases),
      argv: Object.assign(argvReturn, argv),
      configuration,
      defaulted: Object.assign({}, defaulted),
      error,
      newAliases: Object.assign({}, newAliases)
    };
  }
}

// node_modules/yargs/node_modules/yargs-parser/build/lib/index.js
var minNodeVersion = process && process.env && process.env.YARGS_MIN_NODE_VERSION ? Number(process.env.YARGS_MIN_NODE_VERSION) : 10;
if (process && process.version) {
  const major = Number(process.version.match(/v([^.]+)/)[1]);
  if (major < minNodeVersion) {
    throw Error(`yargs parser supports a minimum Node.js version of ${minNodeVersion}. Read our version support policy: https://github.com/yargs/yargs-parser#supported-nodejs-versions`);
  }
}
var env = process ? process.env : {};
var parser = new YargsParser({
  cwd: process.cwd,
  env: () => {
    return env;
  },
  format,
  normalize,
  resolve: resolve2,
  require: (path) => {
    if (typeof require !== "undefined") {
      return import.meta.require(path);
    } else if (path.match(/\.json$/)) {
      return readFileSync(path, "utf8");
    } else {
      throw Error("only .json config files are supported in ESM");
    }
  }
});
var yargsParser = function Parser(args, opts) {
  const result = parser.parse(args.slice(), opts);
  return result.argv;
};
yargsParser.detailed = function(args, opts) {
  return parser.parse(args.slice(), opts);
};
yargsParser.camelCase = camelCase;
yargsParser.decamelize = decamelize;
yargsParser.looksLikeNumber = looksLikeNumber;
var lib_default = yargsParser;

// node_modules/yargs/lib/platform-shims/esm.mjs
import {basename, dirname as dirname2, extname, relative, resolve as resolve4} from "path";

// node_modules/yargs/build/lib/utils/process-argv.js
var getProcessArgvBinIndex = function() {
  if (isBundledElectronApp())
    return 0;
  return 1;
};
var isBundledElectronApp = function() {
  return isElectronApp() && !process.defaultApp;
};
var isElectronApp = function() {
  return !!process.versions.electron;
};
function getProcessArgvBin() {
  return process.argv[getProcessArgvBinIndex()];
}

// node_modules/yargs/build/lib/yerror.js
class YError extends Error {
  constructor(msg) {
    super(msg || "yargs error");
    this.name = "YError";
    Error.captureStackTrace(this, YError);
  }
}

// node_modules/y18n/build/lib/platform-shims/node.js
import {readFileSync as readFileSync2, statSync as statSync2, writeFile} from "fs";
import {format as format2} from "util";
import {resolve as resolve3} from "path";
var node_default = {
  fs: {
    readFileSync: readFileSync2,
    writeFile
  },
  format: format2,
  resolve: resolve3,
  exists: (file) => {
    try {
      return statSync2(file).isFile();
    } catch (err) {
      return false;
    }
  }
};

// node_modules/y18n/build/lib/index.js
function y18n(opts, _shim) {
  shim = _shim;
  const y18n2 = new Y18N(opts);
  return {
    __: y18n2.__.bind(y18n2),
    __n: y18n2.__n.bind(y18n2),
    setLocale: y18n2.setLocale.bind(y18n2),
    getLocale: y18n2.getLocale.bind(y18n2),
    updateLocale: y18n2.updateLocale.bind(y18n2),
    locale: y18n2.locale
  };
}
var shim;

class Y18N {
  constructor(opts) {
    opts = opts || {};
    this.directory = opts.directory || "./locales";
    this.updateFiles = typeof opts.updateFiles === "boolean" ? opts.updateFiles : true;
    this.locale = opts.locale || "en";
    this.fallbackToLanguage = typeof opts.fallbackToLanguage === "boolean" ? opts.fallbackToLanguage : true;
    this.cache = Object.create(null);
    this.writeQueue = [];
  }
  __(...args) {
    if (typeof arguments[0] !== "string") {
      return this._taggedLiteral(arguments[0], ...arguments);
    }
    const str = args.shift();
    let cb = function() {
    };
    if (typeof args[args.length - 1] === "function")
      cb = args.pop();
    cb = cb || function() {
    };
    if (!this.cache[this.locale])
      this._readLocaleFile();
    if (!this.cache[this.locale][str] && this.updateFiles) {
      this.cache[this.locale][str] = str;
      this._enqueueWrite({
        directory: this.directory,
        locale: this.locale,
        cb
      });
    } else {
      cb();
    }
    return shim.format.apply(shim.format, [this.cache[this.locale][str] || str].concat(args));
  }
  __n() {
    const args = Array.prototype.slice.call(arguments);
    const singular = args.shift();
    const plural = args.shift();
    const quantity = args.shift();
    let cb = function() {
    };
    if (typeof args[args.length - 1] === "function")
      cb = args.pop();
    if (!this.cache[this.locale])
      this._readLocaleFile();
    let str = quantity === 1 ? singular : plural;
    if (this.cache[this.locale][singular]) {
      const entry = this.cache[this.locale][singular];
      str = entry[quantity === 1 ? "one" : "other"];
    }
    if (!this.cache[this.locale][singular] && this.updateFiles) {
      this.cache[this.locale][singular] = {
        one: singular,
        other: plural
      };
      this._enqueueWrite({
        directory: this.directory,
        locale: this.locale,
        cb
      });
    } else {
      cb();
    }
    const values = [str];
    if (~str.indexOf("%d"))
      values.push(quantity);
    return shim.format.apply(shim.format, values.concat(args));
  }
  setLocale(locale) {
    this.locale = locale;
  }
  getLocale() {
    return this.locale;
  }
  updateLocale(obj) {
    if (!this.cache[this.locale])
      this._readLocaleFile();
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        this.cache[this.locale][key] = obj[key];
      }
    }
  }
  _taggedLiteral(parts, ...args) {
    let str = "";
    parts.forEach(function(part, i) {
      const arg = args[i + 1];
      str += part;
      if (typeof arg !== "undefined") {
        str += "%s";
      }
    });
    return this.__.apply(this, [str].concat([].slice.call(args, 1)));
  }
  _enqueueWrite(work) {
    this.writeQueue.push(work);
    if (this.writeQueue.length === 1)
      this._processWriteQueue();
  }
  _processWriteQueue() {
    const _this = this;
    const work = this.writeQueue[0];
    const directory = work.directory;
    const locale = work.locale;
    const cb = work.cb;
    const languageFile = this._resolveLocaleFile(directory, locale);
    const serializedLocale = JSON.stringify(this.cache[locale], null, 2);
    shim.fs.writeFile(languageFile, serializedLocale, "utf-8", function(err) {
      _this.writeQueue.shift();
      if (_this.writeQueue.length > 0)
        _this._processWriteQueue();
      cb(err);
    });
  }
  _readLocaleFile() {
    let localeLookup = {};
    const languageFile = this._resolveLocaleFile(this.directory, this.locale);
    try {
      if (shim.fs.readFileSync) {
        localeLookup = JSON.parse(shim.fs.readFileSync(languageFile, "utf-8"));
      }
    } catch (err) {
      if (err instanceof SyntaxError) {
        err.message = "syntax error in " + languageFile;
      }
      if (err.code === "ENOENT")
        localeLookup = {};
      else
        throw err;
    }
    this.cache[this.locale] = localeLookup;
  }
  _resolveLocaleFile(directory, locale) {
    let file = shim.resolve(directory, "./", locale + ".json");
    if (this.fallbackToLanguage && !this._fileExistsSync(file) && ~locale.lastIndexOf("_")) {
      const languageFile = shim.resolve(directory, "./", locale.split("_")[0] + ".json");
      if (this._fileExistsSync(languageFile))
        file = languageFile;
    }
    return file;
  }
  _fileExistsSync(file) {
    return shim.exists(file);
  }
}

// node_modules/y18n/index.mjs
var y18n2 = (opts) => {
  return y18n(opts, node_default);
};
var y18n_default = y18n2;

// node_modules/yargs/lib/platform-shims/esm.mjs
var REQUIRE_ERROR = "require is not supported by ESM";
var REQUIRE_DIRECTORY_ERROR = "loading a directory of commands is not supported yet for ESM";
var mainFilename = fileURLToPath(import.meta.url).split("node_modules")[0];
var __dirname2 = fileURLToPath(import.meta.url);
var esm_default = {
  assert: {
    notStrictEqual,
    strictEqual
  },
  cliui: ui,
  findUp: sync_default,
  getEnv: (key) => {
    return process.env[key];
  },
  inspect,
  getCallerFile: () => {
    throw new YError(REQUIRE_DIRECTORY_ERROR);
  },
  getProcessArgvBin,
  mainFilename: mainFilename || process.cwd(),
  Parser: lib_default,
  path: {
    basename,
    dirname: dirname2,
    extname,
    relative,
    resolve: resolve4
  },
  process: {
    argv: () => process.argv,
    cwd: process.cwd,
    execPath: () => process.execPath,
    exit: process.exit,
    nextTick: process.nextTick,
    stdColumns: typeof process.stdout.columns !== "undefined" ? process.stdout.columns : null
  },
  readFileSync: readFileSync3,
  require: () => {
    throw new YError(REQUIRE_ERROR);
  },
  requireDirectory: () => {
    throw new YError(REQUIRE_DIRECTORY_ERROR);
  },
  stringWidth: (str) => {
    return [...str].length;
  },
  y18n: y18n_default({
    directory: resolve4(__dirname2, "../../../locales"),
    updateFiles: false
  })
};

// node_modules/yargs/build/lib/typings/common-types.js
function assertNotStrictEqual(actual, expected, shim2, message) {
  shim2.assert.notStrictEqual(actual, expected, message);
}
function assertSingleKey(actual, shim2) {
  shim2.assert.strictEqual(typeof actual, "string");
}
function objectKeys(object) {
  return Object.keys(object);
}

// node_modules/yargs/build/lib/utils/is-promise.js
function isPromise(maybePromise) {
  return !!maybePromise && !!maybePromise.then && typeof maybePromise.then === "function";
}

// node_modules/yargs/build/lib/parse-command.js
function parseCommand(cmd) {
  const extraSpacesStrippedCommand = cmd.replace(/\s{2,}/g, " ");
  const splitCommand = extraSpacesStrippedCommand.split(/\s+(?![^[]*]|[^<]*>)/);
  const bregex = /\.*[\][<>]/g;
  const firstCommand = splitCommand.shift();
  if (!firstCommand)
    throw new Error(`No command found in: ${cmd}`);
  const parsedCommand = {
    cmd: firstCommand.replace(bregex, ""),
    demanded: [],
    optional: []
  };
  splitCommand.forEach((cmd2, i) => {
    let variadic = false;
    cmd2 = cmd2.replace(/\s/g, "");
    if (/\.+[\]>]/.test(cmd2) && i === splitCommand.length - 1)
      variadic = true;
    if (/^\[/.test(cmd2)) {
      parsedCommand.optional.push({
        cmd: cmd2.replace(bregex, "").split("|"),
        variadic
      });
    } else {
      parsedCommand.demanded.push({
        cmd: cmd2.replace(bregex, "").split("|"),
        variadic
      });
    }
  });
  return parsedCommand;
}

// node_modules/yargs/build/lib/argsert.js
function argsert(arg1, arg2, arg3) {
  function parseArgs() {
    return typeof arg1 === "object" ? [{ demanded: [], optional: [] }, arg1, arg2] : [
      parseCommand(`cmd ${arg1}`),
      arg2,
      arg3
    ];
  }
  try {
    let position = 0;
    const [parsed, callerArguments, _length] = parseArgs();
    const args = [].slice.call(callerArguments);
    while (args.length && args[args.length - 1] === undefined)
      args.pop();
    const length = _length || args.length;
    if (length < parsed.demanded.length) {
      throw new YError(`Not enough arguments provided. Expected ${parsed.demanded.length} but received ${args.length}.`);
    }
    const totalCommands = parsed.demanded.length + parsed.optional.length;
    if (length > totalCommands) {
      throw new YError(`Too many arguments provided. Expected max ${totalCommands} but received ${length}.`);
    }
    parsed.demanded.forEach((demanded) => {
      const arg = args.shift();
      const observedType = guessType(arg);
      const matchingTypes = demanded.cmd.filter((type) => type === observedType || type === "*");
      if (matchingTypes.length === 0)
        argumentTypeError(observedType, demanded.cmd, position);
      position += 1;
    });
    parsed.optional.forEach((optional) => {
      if (args.length === 0)
        return;
      const arg = args.shift();
      const observedType = guessType(arg);
      const matchingTypes = optional.cmd.filter((type) => type === observedType || type === "*");
      if (matchingTypes.length === 0)
        argumentTypeError(observedType, optional.cmd, position);
      position += 1;
    });
  } catch (err) {
    console.warn(err.stack);
  }
}
var guessType = function(arg) {
  if (Array.isArray(arg)) {
    return "array";
  } else if (arg === null) {
    return "null";
  }
  return typeof arg;
};
var argumentTypeError = function(observedType, allowedTypes, position) {
  throw new YError(`Invalid ${positionName[position] || "manyith"} argument. Expected ${allowedTypes.join(" or ")} but received ${observedType}.`);
};
var positionName = ["first", "second", "third", "fourth", "fifth", "sixth"];

// node_modules/yargs/build/lib/middleware.js
function globalMiddlewareFactory(globalMiddleware, context) {
  return function(callback, applyBeforeValidation = false) {
    argsert("<array|function> [boolean]", [callback, applyBeforeValidation], arguments.length);
    if (Array.isArray(callback)) {
      for (let i = 0;i < callback.length; i++) {
        if (typeof callback[i] !== "function") {
          throw Error("middleware must be a function");
        }
        callback[i].applyBeforeValidation = applyBeforeValidation;
      }
      Array.prototype.push.apply(globalMiddleware, callback);
    } else if (typeof callback === "function") {
      callback.applyBeforeValidation = applyBeforeValidation;
      globalMiddleware.push(callback);
    }
    return context;
  };
}
function commandMiddlewareFactory(commandMiddleware) {
  if (!commandMiddleware)
    return [];
  return commandMiddleware.map((middleware) => {
    middleware.applyBeforeValidation = false;
    return middleware;
  });
}
function applyMiddleware(argv, yargs, middlewares, beforeValidation) {
  const beforeValidationError = new Error("middleware cannot return a promise when applyBeforeValidation is true");
  return middlewares.reduce((acc, middleware) => {
    if (middleware.applyBeforeValidation !== beforeValidation) {
      return acc;
    }
    if (isPromise(acc)) {
      return acc.then((initialObj) => Promise.all([
        initialObj,
        middleware(initialObj, yargs)
      ])).then(([initialObj, middlewareObj]) => Object.assign(initialObj, middlewareObj));
    } else {
      const result = middleware(acc, yargs);
      if (beforeValidation && isPromise(result))
        throw beforeValidationError;
      return isPromise(result) ? result.then((middlewareObj) => Object.assign(acc, middlewareObj)) : Object.assign(acc, result);
    }
  }, argv);
}

// node_modules/yargs/build/lib/utils/which-module.js
function whichModule(exported) {
  if (typeof require === "undefined")
    return null;
  for (let i = 0, files = Object.keys(require.cache), mod;i < files.length; i++) {
    mod = require.cache[files[i]];
    if (mod.exports === exported)
      return mod;
  }
  return null;
}

// node_modules/yargs/build/lib/command.js
function command(yargs, usage, validation, globalMiddleware = [], shim2) {
  const self = {};
  let handlers = {};
  let aliasMap = {};
  let defaultCommand;
  self.addHandler = function addHandler(cmd, description, builder, handler, commandMiddleware, deprecated) {
    let aliases = [];
    const middlewares = commandMiddlewareFactory(commandMiddleware);
    handler = handler || (() => {
    });
    if (Array.isArray(cmd)) {
      if (isCommandAndAliases(cmd)) {
        [cmd, ...aliases] = cmd;
      } else {
        for (const command2 of cmd) {
          self.addHandler(command2);
        }
      }
    } else if (isCommandHandlerDefinition(cmd)) {
      let command2 = Array.isArray(cmd.command) || typeof cmd.command === "string" ? cmd.command : moduleName(cmd);
      if (cmd.aliases)
        command2 = [].concat(command2).concat(cmd.aliases);
      self.addHandler(command2, extractDesc(cmd), cmd.builder, cmd.handler, cmd.middlewares, cmd.deprecated);
      return;
    } else if (isCommandBuilderDefinition(builder)) {
      self.addHandler([cmd].concat(aliases), description, builder.builder, builder.handler, builder.middlewares, builder.deprecated);
      return;
    }
    if (typeof cmd === "string") {
      const parsedCommand = parseCommand(cmd);
      aliases = aliases.map((alias) => parseCommand(alias).cmd);
      let isDefault = false;
      const parsedAliases = [parsedCommand.cmd].concat(aliases).filter((c) => {
        if (DEFAULT_MARKER.test(c)) {
          isDefault = true;
          return false;
        }
        return true;
      });
      if (parsedAliases.length === 0 && isDefault)
        parsedAliases.push("$0");
      if (isDefault) {
        parsedCommand.cmd = parsedAliases[0];
        aliases = parsedAliases.slice(1);
        cmd = cmd.replace(DEFAULT_MARKER, parsedCommand.cmd);
      }
      aliases.forEach((alias) => {
        aliasMap[alias] = parsedCommand.cmd;
      });
      if (description !== false) {
        usage.command(cmd, description, isDefault, aliases, deprecated);
      }
      handlers[parsedCommand.cmd] = {
        original: cmd,
        description,
        handler,
        builder: builder || {},
        middlewares,
        deprecated,
        demanded: parsedCommand.demanded,
        optional: parsedCommand.optional
      };
      if (isDefault)
        defaultCommand = handlers[parsedCommand.cmd];
    }
  };
  self.addDirectory = function addDirectory(dir, context, req, callerFile, opts) {
    opts = opts || {};
    if (typeof opts.recurse !== "boolean")
      opts.recurse = false;
    if (!Array.isArray(opts.extensions))
      opts.extensions = ["js"];
    const parentVisit = typeof opts.visit === "function" ? opts.visit : (o) => o;
    opts.visit = function visit(obj, joined, filename) {
      const visited = parentVisit(obj, joined, filename);
      if (visited) {
        if (~context.files.indexOf(joined))
          return visited;
        context.files.push(joined);
        self.addHandler(visited);
      }
      return visited;
    };
    shim2.requireDirectory({ require: req, filename: callerFile }, dir, opts);
  };
  function moduleName(obj) {
    const mod = whichModule(obj);
    if (!mod)
      throw new Error(`No command name given for module: ${shim2.inspect(obj)}`);
    return commandFromFilename(mod.filename);
  }
  function commandFromFilename(filename) {
    return shim2.path.basename(filename, shim2.path.extname(filename));
  }
  function extractDesc({ describe, description, desc }) {
    for (const test of [describe, description, desc]) {
      if (typeof test === "string" || test === false)
        return test;
      assertNotStrictEqual(test, true, shim2);
    }
    return false;
  }
  self.getCommands = () => Object.keys(handlers).concat(Object.keys(aliasMap));
  self.getCommandHandlers = () => handlers;
  self.hasDefaultCommand = () => !!defaultCommand;
  self.runCommand = function runCommand(command2, yargs2, parsed, commandIndex) {
    let aliases = parsed.aliases;
    const commandHandler = handlers[command2] || handlers[aliasMap[command2]] || defaultCommand;
    const currentContext = yargs2.getContext();
    let numFiles = currentContext.files.length;
    const parentCommands = currentContext.commands.slice();
    let innerArgv = parsed.argv;
    let positionalMap = {};
    if (command2) {
      currentContext.commands.push(command2);
      currentContext.fullCommands.push(commandHandler.original);
    }
    const builder = commandHandler.builder;
    if (isCommandBuilderCallback(builder)) {
      const builderOutput = builder(yargs2.reset(parsed.aliases));
      const innerYargs = isYargsInstance(builderOutput) ? builderOutput : yargs2;
      if (shouldUpdateUsage(innerYargs)) {
        innerYargs.getUsageInstance().usage(usageFromParentCommandsCommandHandler(parentCommands, commandHandler), commandHandler.description);
      }
      innerArgv = innerYargs._parseArgs(null, null, true, commandIndex);
      aliases = innerYargs.parsed.aliases;
    } else if (isCommandBuilderOptionDefinitions(builder)) {
      const innerYargs = yargs2.reset(parsed.aliases);
      if (shouldUpdateUsage(innerYargs)) {
        innerYargs.getUsageInstance().usage(usageFromParentCommandsCommandHandler(parentCommands, commandHandler), commandHandler.description);
      }
      Object.keys(commandHandler.builder).forEach((key) => {
        innerYargs.option(key, builder[key]);
      });
      innerArgv = innerYargs._parseArgs(null, null, true, commandIndex);
      aliases = innerYargs.parsed.aliases;
    }
    if (!yargs2._hasOutput()) {
      positionalMap = populatePositionals(commandHandler, innerArgv, currentContext);
    }
    const middlewares = globalMiddleware.slice(0).concat(commandHandler.middlewares);
    applyMiddleware(innerArgv, yargs2, middlewares, true);
    if (!yargs2._hasOutput()) {
      yargs2._runValidation(innerArgv, aliases, positionalMap, yargs2.parsed.error, !command2);
    }
    if (commandHandler.handler && !yargs2._hasOutput()) {
      yargs2._setHasOutput();
      const populateDoubleDash = !!yargs2.getOptions().configuration["populate--"];
      yargs2._postProcess(innerArgv, populateDoubleDash);
      innerArgv = applyMiddleware(innerArgv, yargs2, middlewares, false);
      let handlerResult;
      if (isPromise(innerArgv)) {
        handlerResult = innerArgv.then((argv) => commandHandler.handler(argv));
      } else {
        handlerResult = commandHandler.handler(innerArgv);
      }
      const handlerFinishCommand = yargs2.getHandlerFinishCommand();
      if (isPromise(handlerResult)) {
        yargs2.getUsageInstance().cacheHelpMessage();
        handlerResult.then((value) => {
          if (handlerFinishCommand) {
            handlerFinishCommand(value);
          }
        }).catch((error) => {
          try {
            yargs2.getUsageInstance().fail(null, error);
          } catch (err) {
          }
        }).then(() => {
          yargs2.getUsageInstance().clearCachedHelpMessage();
        });
      } else {
        if (handlerFinishCommand) {
          handlerFinishCommand(handlerResult);
        }
      }
    }
    if (command2) {
      currentContext.commands.pop();
      currentContext.fullCommands.pop();
    }
    numFiles = currentContext.files.length - numFiles;
    if (numFiles > 0)
      currentContext.files.splice(numFiles * -1, numFiles);
    return innerArgv;
  };
  function shouldUpdateUsage(yargs2) {
    return !yargs2.getUsageInstance().getUsageDisabled() && yargs2.getUsageInstance().getUsage().length === 0;
  }
  function usageFromParentCommandsCommandHandler(parentCommands, commandHandler) {
    const c = DEFAULT_MARKER.test(commandHandler.original) ? commandHandler.original.replace(DEFAULT_MARKER, "").trim() : commandHandler.original;
    const pc = parentCommands.filter((c2) => {
      return !DEFAULT_MARKER.test(c2);
    });
    pc.push(c);
    return `\$0 ${pc.join(" ")}`;
  }
  self.runDefaultBuilderOn = function(yargs2) {
    assertNotStrictEqual(defaultCommand, undefined, shim2);
    if (shouldUpdateUsage(yargs2)) {
      const commandString = DEFAULT_MARKER.test(defaultCommand.original) ? defaultCommand.original : defaultCommand.original.replace(/^[^[\]<>]*/, "$0 ");
      yargs2.getUsageInstance().usage(commandString, defaultCommand.description);
    }
    const builder = defaultCommand.builder;
    if (isCommandBuilderCallback(builder)) {
      builder(yargs2);
    } else if (!isCommandBuilderDefinition(builder)) {
      Object.keys(builder).forEach((key) => {
        yargs2.option(key, builder[key]);
      });
    }
  };
  function populatePositionals(commandHandler, argv, context) {
    argv._ = argv._.slice(context.commands.length);
    const demanded = commandHandler.demanded.slice(0);
    const optional = commandHandler.optional.slice(0);
    const positionalMap = {};
    validation.positionalCount(demanded.length, argv._.length);
    while (demanded.length) {
      const demand = demanded.shift();
      populatePositional(demand, argv, positionalMap);
    }
    while (optional.length) {
      const maybe = optional.shift();
      populatePositional(maybe, argv, positionalMap);
    }
    argv._ = context.commands.concat(argv._.map((a) => "" + a));
    postProcessPositionals(argv, positionalMap, self.cmdToParseOptions(commandHandler.original));
    return positionalMap;
  }
  function populatePositional(positional, argv, positionalMap) {
    const cmd = positional.cmd[0];
    if (positional.variadic) {
      positionalMap[cmd] = argv._.splice(0).map(String);
    } else {
      if (argv._.length)
        positionalMap[cmd] = [String(argv._.shift())];
    }
  }
  function postProcessPositionals(argv, positionalMap, parseOptions) {
    const options = Object.assign({}, yargs.getOptions());
    options.default = Object.assign(parseOptions.default, options.default);
    for (const key of Object.keys(parseOptions.alias)) {
      options.alias[key] = (options.alias[key] || []).concat(parseOptions.alias[key]);
    }
    options.array = options.array.concat(parseOptions.array);
    options.config = {};
    const unparsed = [];
    Object.keys(positionalMap).forEach((key) => {
      positionalMap[key].map((value) => {
        if (options.configuration["unknown-options-as-args"])
          options.key[key] = true;
        unparsed.push(`--${key}`);
        unparsed.push(value);
      });
    });
    if (!unparsed.length)
      return;
    const config = Object.assign({}, options.configuration, {
      "populate--": true
    });
    const parsed = shim2.Parser.detailed(unparsed, Object.assign({}, options, {
      configuration: config
    }));
    if (parsed.error) {
      yargs.getUsageInstance().fail(parsed.error.message, parsed.error);
    } else {
      const positionalKeys = Object.keys(positionalMap);
      Object.keys(positionalMap).forEach((key) => {
        positionalKeys.push(...parsed.aliases[key]);
      });
      Object.keys(parsed.argv).forEach((key) => {
        if (positionalKeys.indexOf(key) !== -1) {
          if (!positionalMap[key])
            positionalMap[key] = parsed.argv[key];
          argv[key] = parsed.argv[key];
        }
      });
    }
  }
  self.cmdToParseOptions = function(cmdString) {
    const parseOptions = {
      array: [],
      default: {},
      alias: {},
      demand: {}
    };
    const parsed = parseCommand(cmdString);
    parsed.demanded.forEach((d) => {
      const [cmd, ...aliases] = d.cmd;
      if (d.variadic) {
        parseOptions.array.push(cmd);
        parseOptions.default[cmd] = [];
      }
      parseOptions.alias[cmd] = aliases;
      parseOptions.demand[cmd] = true;
    });
    parsed.optional.forEach((o) => {
      const [cmd, ...aliases] = o.cmd;
      if (o.variadic) {
        parseOptions.array.push(cmd);
        parseOptions.default[cmd] = [];
      }
      parseOptions.alias[cmd] = aliases;
    });
    return parseOptions;
  };
  self.reset = () => {
    handlers = {};
    aliasMap = {};
    defaultCommand = undefined;
    return self;
  };
  const frozens = [];
  self.freeze = () => {
    frozens.push({
      handlers,
      aliasMap,
      defaultCommand
    });
  };
  self.unfreeze = () => {
    const frozen = frozens.pop();
    assertNotStrictEqual(frozen, undefined, shim2);
    ({ handlers, aliasMap, defaultCommand } = frozen);
  };
  return self;
}
function isCommandBuilderDefinition(builder) {
  return typeof builder === "object" && !!builder.builder && typeof builder.handler === "function";
}
var isCommandAndAliases = function(cmd) {
  if (cmd.every((c) => typeof c === "string")) {
    return true;
  } else {
    return false;
  }
};
function isCommandBuilderCallback(builder) {
  return typeof builder === "function";
}
var isCommandBuilderOptionDefinitions = function(builder) {
  return typeof builder === "object";
};
function isCommandHandlerDefinition(cmd) {
  return typeof cmd === "object" && !Array.isArray(cmd);
}
var DEFAULT_MARKER = /(^\*)|(^\$0)/;

// node_modules/yargs/build/lib/utils/obj-filter.js
function objFilter(original = {}, filter = () => true) {
  const obj = {};
  objectKeys(original).forEach((key) => {
    if (filter(key, original[key])) {
      obj[key] = original[key];
    }
  });
  return obj;
}

// node_modules/yargs/build/lib/utils/set-blocking.js
function setBlocking(blocking) {
  if (typeof process === "undefined")
    return;
  [process.stdout, process.stderr].forEach((_stream) => {
    const stream = _stream;
    if (stream._handle && stream.isTTY && typeof stream._handle.setBlocking === "function") {
      stream._handle.setBlocking(blocking);
    }
  });
}

// node_modules/yargs/build/lib/usage.js
function usage(yargs, y18n3, shim2) {
  const __ = y18n3.__;
  const self = {};
  const fails = [];
  self.failFn = function failFn(f) {
    fails.push(f);
  };
  let failMessage = null;
  let showHelpOnFail = true;
  self.showHelpOnFail = function showHelpOnFailFn(arg1 = true, arg2) {
    function parseFunctionArgs() {
      return typeof arg1 === "string" ? [true, arg1] : [arg1, arg2];
    }
    const [enabled, message] = parseFunctionArgs();
    failMessage = message;
    showHelpOnFail = enabled;
    return self;
  };
  let failureOutput = false;
  self.fail = function fail(msg, err) {
    const logger = yargs._getLoggerInstance();
    if (fails.length) {
      for (let i = fails.length - 1;i >= 0; --i) {
        fails[i](msg, err, self);
      }
    } else {
      if (yargs.getExitProcess())
        setBlocking(true);
      if (!failureOutput) {
        failureOutput = true;
        if (showHelpOnFail) {
          yargs.showHelp("error");
          logger.error();
        }
        if (msg || err)
          logger.error(msg || err);
        if (failMessage) {
          if (msg || err)
            logger.error("");
          logger.error(failMessage);
        }
      }
      err = err || new YError(msg);
      if (yargs.getExitProcess()) {
        return yargs.exit(1);
      } else if (yargs._hasParseCallback()) {
        return yargs.exit(1, err);
      } else {
        throw err;
      }
    }
  };
  let usages = [];
  let usageDisabled = false;
  self.usage = (msg, description) => {
    if (msg === null) {
      usageDisabled = true;
      usages = [];
      return self;
    }
    usageDisabled = false;
    usages.push([msg, description || ""]);
    return self;
  };
  self.getUsage = () => {
    return usages;
  };
  self.getUsageDisabled = () => {
    return usageDisabled;
  };
  self.getPositionalGroupName = () => {
    return __("Positionals:");
  };
  let examples = [];
  self.example = (cmd, description) => {
    examples.push([cmd, description || ""]);
  };
  let commands = [];
  self.command = function command(cmd, description, isDefault, aliases, deprecated = false) {
    if (isDefault) {
      commands = commands.map((cmdArray) => {
        cmdArray[2] = false;
        return cmdArray;
      });
    }
    commands.push([cmd, description || "", isDefault, aliases, deprecated]);
  };
  self.getCommands = () => commands;
  let descriptions = {};
  self.describe = function describe(keyOrKeys, desc) {
    if (Array.isArray(keyOrKeys)) {
      keyOrKeys.forEach((k) => {
        self.describe(k, desc);
      });
    } else if (typeof keyOrKeys === "object") {
      Object.keys(keyOrKeys).forEach((k) => {
        self.describe(k, keyOrKeys[k]);
      });
    } else {
      descriptions[keyOrKeys] = desc;
    }
  };
  self.getDescriptions = () => descriptions;
  let epilogs = [];
  self.epilog = (msg) => {
    epilogs.push(msg);
  };
  let wrapSet = false;
  let wrap2;
  self.wrap = (cols) => {
    wrapSet = true;
    wrap2 = cols;
  };
  function getWrap() {
    if (!wrapSet) {
      wrap2 = windowWidth();
      wrapSet = true;
    }
    return wrap2;
  }
  const deferY18nLookupPrefix = "__yargsString__:";
  self.deferY18nLookup = (str) => deferY18nLookupPrefix + str;
  self.help = function help() {
    if (cachedHelpMessage)
      return cachedHelpMessage;
    normalizeAliases();
    const base$0 = yargs.customScriptName ? yargs.$0 : shim2.path.basename(yargs.$0);
    const demandedOptions = yargs.getDemandedOptions();
    const demandedCommands = yargs.getDemandedCommands();
    const deprecatedOptions = yargs.getDeprecatedOptions();
    const groups = yargs.getGroups();
    const options = yargs.getOptions();
    let keys = [];
    keys = keys.concat(Object.keys(descriptions));
    keys = keys.concat(Object.keys(demandedOptions));
    keys = keys.concat(Object.keys(demandedCommands));
    keys = keys.concat(Object.keys(options.default));
    keys = keys.filter(filterHiddenOptions);
    keys = Object.keys(keys.reduce((acc, key) => {
      if (key !== "_")
        acc[key] = true;
      return acc;
    }, {}));
    const theWrap = getWrap();
    const ui2 = shim2.cliui({
      width: theWrap,
      wrap: !!theWrap
    });
    if (!usageDisabled) {
      if (usages.length) {
        usages.forEach((usage2) => {
          ui2.div(`${usage2[0].replace(/\$0/g, base$0)}`);
          if (usage2[1]) {
            ui2.div({ text: `${usage2[1]}`, padding: [1, 0, 0, 0] });
          }
        });
        ui2.div();
      } else if (commands.length) {
        let u = null;
        if (demandedCommands._) {
          u = `${base$0} <${__("command")}>\n`;
        } else {
          u = `${base$0} [${__("command")}]\n`;
        }
        ui2.div(`${u}`);
      }
    }
    if (commands.length) {
      ui2.div(__("Commands:"));
      const context = yargs.getContext();
      const parentCommands = context.commands.length ? `${context.commands.join(" ")} ` : "";
      if (yargs.getParserConfiguration()["sort-commands"] === true) {
        commands = commands.sort((a, b) => a[0].localeCompare(b[0]));
      }
      commands.forEach((command2) => {
        const commandString = `${base$0} ${parentCommands}${command2[0].replace(/^\$0 ?/, "")}`;
        ui2.span({
          text: commandString,
          padding: [0, 2, 0, 2],
          width: maxWidth(commands, theWrap, `${base$0}${parentCommands}`) + 4
        }, { text: command2[1] });
        const hints = [];
        if (command2[2])
          hints.push(`[${__("default")}]`);
        if (command2[3] && command2[3].length) {
          hints.push(`[${__("aliases:")} ${command2[3].join(", ")}]`);
        }
        if (command2[4]) {
          if (typeof command2[4] === "string") {
            hints.push(`[${__("deprecated: %s", command2[4])}]`);
          } else {
            hints.push(`[${__("deprecated")}]`);
          }
        }
        if (hints.length) {
          ui2.div({
            text: hints.join(" "),
            padding: [0, 0, 0, 2],
            align: "right"
          });
        } else {
          ui2.div();
        }
      });
      ui2.div();
    }
    const aliasKeys = (Object.keys(options.alias) || []).concat(Object.keys(yargs.parsed.newAliases) || []);
    keys = keys.filter((key) => !yargs.parsed.newAliases[key] && aliasKeys.every((alias) => (options.alias[alias] || []).indexOf(key) === -1));
    const defaultGroup = __("Options:");
    if (!groups[defaultGroup])
      groups[defaultGroup] = [];
    addUngroupedKeys(keys, options.alias, groups, defaultGroup);
    const isLongSwitch = (sw) => /^--/.test(getText(sw));
    const displayedGroups = Object.keys(groups).filter((groupName) => groups[groupName].length > 0).map((groupName) => {
      const normalizedKeys = groups[groupName].filter(filterHiddenOptions).map((key) => {
        if (~aliasKeys.indexOf(key))
          return key;
        for (let i = 0, aliasKey;(aliasKey = aliasKeys[i]) !== undefined; i++) {
          if (~(options.alias[aliasKey] || []).indexOf(key))
            return aliasKey;
        }
        return key;
      });
      return { groupName, normalizedKeys };
    }).filter(({ normalizedKeys }) => normalizedKeys.length > 0).map(({ groupName, normalizedKeys }) => {
      const switches = normalizedKeys.reduce((acc, key) => {
        acc[key] = [key].concat(options.alias[key] || []).map((sw) => {
          if (groupName === self.getPositionalGroupName())
            return sw;
          else {
            return (/^[0-9]$/.test(sw) ? ~options.boolean.indexOf(key) ? "-" : "--" : sw.length > 1 ? "--" : "-") + sw;
          }
        }).sort((sw1, sw2) => isLongSwitch(sw1) === isLongSwitch(sw2) ? 0 : isLongSwitch(sw1) ? 1 : -1).join(", ");
        return acc;
      }, {});
      return { groupName, normalizedKeys, switches };
    });
    const shortSwitchesUsed = displayedGroups.filter(({ groupName }) => groupName !== self.getPositionalGroupName()).some(({ normalizedKeys, switches }) => !normalizedKeys.every((key) => isLongSwitch(switches[key])));
    if (shortSwitchesUsed) {
      displayedGroups.filter(({ groupName }) => groupName !== self.getPositionalGroupName()).forEach(({ normalizedKeys, switches }) => {
        normalizedKeys.forEach((key) => {
          if (isLongSwitch(switches[key])) {
            switches[key] = addIndentation(switches[key], "-x, ".length);
          }
        });
      });
    }
    displayedGroups.forEach(({ groupName, normalizedKeys, switches }) => {
      ui2.div(groupName);
      normalizedKeys.forEach((key) => {
        const kswitch = switches[key];
        let desc = descriptions[key] || "";
        let type = null;
        if (~desc.lastIndexOf(deferY18nLookupPrefix))
          desc = __(desc.substring(deferY18nLookupPrefix.length));
        if (~options.boolean.indexOf(key))
          type = `[${__("boolean")}]`;
        if (~options.count.indexOf(key))
          type = `[${__("count")}]`;
        if (~options.string.indexOf(key))
          type = `[${__("string")}]`;
        if (~options.normalize.indexOf(key))
          type = `[${__("string")}]`;
        if (~options.array.indexOf(key))
          type = `[${__("array")}]`;
        if (~options.number.indexOf(key))
          type = `[${__("number")}]`;
        const deprecatedExtra = (deprecated) => typeof deprecated === "string" ? `[${__("deprecated: %s", deprecated)}]` : `[${__("deprecated")}]`;
        const extra = [
          key in deprecatedOptions ? deprecatedExtra(deprecatedOptions[key]) : null,
          type,
          key in demandedOptions ? `[${__("required")}]` : null,
          options.choices && options.choices[key] ? `[${__("choices:")} ${self.stringifiedValues(options.choices[key])}]` : null,
          defaultString(options.default[key], options.defaultDescription[key])
        ].filter(Boolean).join(" ");
        ui2.span({
          text: getText(kswitch),
          padding: [0, 2, 0, 2 + getIndentation(kswitch)],
          width: maxWidth(switches, theWrap) + 4
        }, desc);
        if (extra)
          ui2.div({ text: extra, padding: [0, 0, 0, 2], align: "right" });
        else
          ui2.div();
      });
      ui2.div();
    });
    if (examples.length) {
      ui2.div(__("Examples:"));
      examples.forEach((example) => {
        example[0] = example[0].replace(/\$0/g, base$0);
      });
      examples.forEach((example) => {
        if (example[1] === "") {
          ui2.div({
            text: example[0],
            padding: [0, 2, 0, 2]
          });
        } else {
          ui2.div({
            text: example[0],
            padding: [0, 2, 0, 2],
            width: maxWidth(examples, theWrap) + 4
          }, {
            text: example[1]
          });
        }
      });
      ui2.div();
    }
    if (epilogs.length > 0) {
      const e = epilogs.map((epilog) => epilog.replace(/\$0/g, base$0)).join("\n");
      ui2.div(`${e}\n`);
    }
    return ui2.toString().replace(/\s*$/, "");
  };
  function maxWidth(table, theWrap, modifier) {
    let width = 0;
    if (!Array.isArray(table)) {
      table = Object.values(table).map((v) => [v]);
    }
    table.forEach((v) => {
      width = Math.max(shim2.stringWidth(modifier ? `${modifier} ${getText(v[0])}` : getText(v[0])) + getIndentation(v[0]), width);
    });
    if (theWrap)
      width = Math.min(width, parseInt((theWrap * 0.5).toString(), 10));
    return width;
  }
  function normalizeAliases() {
    const demandedOptions = yargs.getDemandedOptions();
    const options = yargs.getOptions();
    (Object.keys(options.alias) || []).forEach((key) => {
      options.alias[key].forEach((alias) => {
        if (descriptions[alias])
          self.describe(key, descriptions[alias]);
        if (alias in demandedOptions)
          yargs.demandOption(key, demandedOptions[alias]);
        if (~options.boolean.indexOf(alias))
          yargs.boolean(key);
        if (~options.count.indexOf(alias))
          yargs.count(key);
        if (~options.string.indexOf(alias))
          yargs.string(key);
        if (~options.normalize.indexOf(alias))
          yargs.normalize(key);
        if (~options.array.indexOf(alias))
          yargs.array(key);
        if (~options.number.indexOf(alias))
          yargs.number(key);
      });
    });
  }
  let cachedHelpMessage;
  self.cacheHelpMessage = function() {
    cachedHelpMessage = this.help();
  };
  self.clearCachedHelpMessage = function() {
    cachedHelpMessage = undefined;
  };
  function addUngroupedKeys(keys, aliases, groups, defaultGroup) {
    let groupedKeys = [];
    let toCheck = null;
    Object.keys(groups).forEach((group) => {
      groupedKeys = groupedKeys.concat(groups[group]);
    });
    keys.forEach((key) => {
      toCheck = [key].concat(aliases[key]);
      if (!toCheck.some((k) => groupedKeys.indexOf(k) !== -1)) {
        groups[defaultGroup].push(key);
      }
    });
    return groupedKeys;
  }
  function filterHiddenOptions(key) {
    return yargs.getOptions().hiddenOptions.indexOf(key) < 0 || yargs.parsed.argv[yargs.getOptions().showHiddenOpt];
  }
  self.showHelp = (level) => {
    const logger = yargs._getLoggerInstance();
    if (!level)
      level = "error";
    const emit = typeof level === "function" ? level : logger[level];
    emit(self.help());
  };
  self.functionDescription = (fn) => {
    const description = fn.name ? shim2.Parser.decamelize(fn.name, "-") : __("generated-value");
    return ["(", description, ")"].join("");
  };
  self.stringifiedValues = function stringifiedValues(values, separator) {
    let string = "";
    const sep = separator || ", ";
    const array = [].concat(values);
    if (!values || !array.length)
      return string;
    array.forEach((value) => {
      if (string.length)
        string += sep;
      string += JSON.stringify(value);
    });
    return string;
  };
  function defaultString(value, defaultDescription) {
    let string = `[${__("default:")} `;
    if (value === undefined && !defaultDescription)
      return null;
    if (defaultDescription) {
      string += defaultDescription;
    } else {
      switch (typeof value) {
        case "string":
          string += `"${value}"`;
          break;
        case "object":
          string += JSON.stringify(value);
          break;
        default:
          string += value;
      }
    }
    return `${string}]`;
  }
  function windowWidth() {
    const maxWidth2 = 80;
    if (shim2.process.stdColumns) {
      return Math.min(maxWidth2, shim2.process.stdColumns);
    } else {
      return maxWidth2;
    }
  }
  let version = null;
  self.version = (ver) => {
    version = ver;
  };
  self.showVersion = () => {
    const logger = yargs._getLoggerInstance();
    logger.log(version);
  };
  self.reset = function reset(localLookup) {
    failMessage = null;
    failureOutput = false;
    usages = [];
    usageDisabled = false;
    epilogs = [];
    examples = [];
    commands = [];
    descriptions = objFilter(descriptions, (k) => !localLookup[k]);
    return self;
  };
  const frozens = [];
  self.freeze = function freeze() {
    frozens.push({
      failMessage,
      failureOutput,
      usages,
      usageDisabled,
      epilogs,
      examples,
      commands,
      descriptions
    });
  };
  self.unfreeze = function unfreeze() {
    const frozen = frozens.pop();
    assertNotStrictEqual(frozen, undefined, shim2);
    ({
      failMessage,
      failureOutput,
      usages,
      usageDisabled,
      epilogs,
      examples,
      commands,
      descriptions
    } = frozen);
  };
  return self;
}
var isIndentedText = function(text) {
  return typeof text === "object";
};
var addIndentation = function(text, indent) {
  return isIndentedText(text) ? { text: text.text, indentation: text.indentation + indent } : { text, indentation: indent };
};
var getIndentation = function(text) {
  return isIndentedText(text) ? text.indentation : 0;
};
var getText = function(text) {
  return isIndentedText(text) ? text.text : text;
};

// node_modules/yargs/build/lib/completion-templates.js
var completionShTemplate = `###-begin-{{app_name}}-completions-###
#
# yargs command completion script
#
# Installation: {{app_path}} {{completion_command}} >> ~/.bashrc
#    or {{app_path}} {{completion_command}} >> ~/.bash_profile on OSX.
#
_yargs_completions()
{
    local cur_word args type_list

    cur_word="\${COMP_WORDS[COMP_CWORD]}"
    args=("\${COMP_WORDS[@]}")

    # ask yargs to generate completions.
    type_list=$({{app_path}} --get-yargs-completions "\${args[@]}")

    COMPREPLY=( $(compgen -W "\${type_list}" -- \${cur_word}) )

    # if no match was found, fall back to filename completion
    if [ \${#COMPREPLY[@]} -eq 0 ]; then
      COMPREPLY=()
    fi

    return 0
}
complete -o default -F _yargs_completions {{app_name}}
###-end-{{app_name}}-completions-###
`;
var completionZshTemplate = `###-begin-{{app_name}}-completions-###
#
# yargs command completion script
#
# Installation: {{app_path}} {{completion_command}} >> ~/.zshrc
#    or {{app_path}} {{completion_command}} >> ~/.zsh_profile on OSX.
#
_{{app_name}}_yargs_completions()
{
  local reply
  local si=$IFS
  IFS=$'
' reply=($(COMP_CWORD="$((CURRENT-1))" COMP_LINE="$BUFFER" COMP_POINT="$CURSOR" {{app_path}} --get-yargs-completions "\${words[@]}"))
  IFS=$si
  _describe 'values' reply
}
compdef _{{app_name}}_yargs_completions {{app_name}}
###-end-{{app_name}}-completions-###
`;

// node_modules/yargs/build/lib/completion.js
function completion(yargs, usage2, command3, shim2) {
  const self = {
    completionKey: "get-yargs-completions"
  };
  let aliases;
  self.setParsed = function setParsed(parsed) {
    aliases = parsed.aliases;
  };
  const zshShell = shim2.getEnv("SHELL") && shim2.getEnv("SHELL").indexOf("zsh") !== -1 || shim2.getEnv("ZSH_NAME") && shim2.getEnv("ZSH_NAME").indexOf("zsh") !== -1;
  self.getCompletion = function getCompletion(args, done) {
    const completions = [];
    const current = args.length ? args[args.length - 1] : "";
    const argv = yargs.parse(args, true);
    const parentCommands = yargs.getContext().commands;
    function runCompletionFunction(argv2) {
      assertNotStrictEqual(completionFunction, null, shim2);
      if (isSyncCompletionFunction(completionFunction)) {
        const result = completionFunction(current, argv2);
        if (isPromise(result)) {
          return result.then((list) => {
            shim2.process.nextTick(() => {
              done(list);
            });
          }).catch((err) => {
            shim2.process.nextTick(() => {
              throw err;
            });
          });
        }
        return done(result);
      } else {
        return completionFunction(current, argv2, (completions2) => {
          done(completions2);
        });
      }
    }
    if (completionFunction) {
      return isPromise(argv) ? argv.then(runCompletionFunction) : runCompletionFunction(argv);
    }
    const handlers = command3.getCommandHandlers();
    for (let i = 0, ii = args.length;i < ii; ++i) {
      if (handlers[args[i]] && handlers[args[i]].builder) {
        const builder = handlers[args[i]].builder;
        if (isCommandBuilderCallback(builder)) {
          const y = yargs.reset();
          builder(y);
          return y.argv;
        }
      }
    }
    if (!current.match(/^-/) && parentCommands[parentCommands.length - 1] !== current) {
      usage2.getCommands().forEach((usageCommand) => {
        const commandName = parseCommand(usageCommand[0]).cmd;
        if (args.indexOf(commandName) === -1) {
          if (!zshShell) {
            completions.push(commandName);
          } else {
            const desc = usageCommand[1] || "";
            completions.push(commandName.replace(/:/g, "\\:") + ":" + desc);
          }
        }
      });
    }
    if (current.match(/^-/) || current === "" && completions.length === 0) {
      const descs = usage2.getDescriptions();
      const options = yargs.getOptions();
      Object.keys(options.key).forEach((key) => {
        const negable = !!options.configuration["boolean-negation"] && options.boolean.includes(key);
        let keyAndAliases = [key].concat(aliases[key] || []);
        if (negable)
          keyAndAliases = keyAndAliases.concat(keyAndAliases.map((key2) => `no-${key2}`));
        function completeOptionKey(key2) {
          const notInArgs = keyAndAliases.every((val) => args.indexOf(`--${val}`) === -1);
          if (notInArgs) {
            const startsByTwoDashes = (s) => /^--/.test(s);
            const isShortOption = (s) => /^[^0-9]$/.test(s);
            const dashes = !startsByTwoDashes(current) && isShortOption(key2) ? "-" : "--";
            if (!zshShell) {
              completions.push(dashes + key2);
            } else {
              const desc = descs[key2] || "";
              completions.push(dashes + `${key2.replace(/:/g, "\\:")}:${desc.replace("__yargsString__:", "")}`);
            }
          }
        }
        completeOptionKey(key);
        if (negable && !!options.default[key])
          completeOptionKey(`no-${key}`);
      });
    }
    done(completions);
  };
  self.generateCompletionScript = function generateCompletionScript($0, cmd) {
    let script = zshShell ? completionZshTemplate : completionShTemplate;
    const name = shim2.path.basename($0);
    if ($0.match(/\.js$/))
      $0 = `./${$0}`;
    script = script.replace(/{{app_name}}/g, name);
    script = script.replace(/{{completion_command}}/g, cmd);
    return script.replace(/{{app_path}}/g, $0);
  };
  let completionFunction = null;
  self.registerFunction = (fn) => {
    completionFunction = fn;
  };
  return self;
}
var isSyncCompletionFunction = function(completionFunction) {
  return completionFunction.length < 3;
};

// node_modules/yargs/build/lib/utils/levenshtein.js
function levenshtein(a, b) {
  if (a.length === 0)
    return b.length;
  if (b.length === 0)
    return a.length;
  const matrix = [];
  let i;
  for (i = 0;i <= b.length; i++) {
    matrix[i] = [i];
  }
  let j;
  for (j = 0;j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (i = 1;i <= b.length; i++) {
    for (j = 1;j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }
  return matrix[b.length][a.length];
}

// node_modules/yargs/build/lib/validation.js
function validation(yargs, usage2, y18n3, shim2) {
  const __ = y18n3.__;
  const __n = y18n3.__n;
  const self = {};
  self.nonOptionCount = function nonOptionCount(argv) {
    const demandedCommands = yargs.getDemandedCommands();
    const positionalCount = argv._.length + (argv["--"] ? argv["--"].length : 0);
    const _s = positionalCount - yargs.getContext().commands.length;
    if (demandedCommands._ && (_s < demandedCommands._.min || _s > demandedCommands._.max)) {
      if (_s < demandedCommands._.min) {
        if (demandedCommands._.minMsg !== undefined) {
          usage2.fail(demandedCommands._.minMsg ? demandedCommands._.minMsg.replace(/\$0/g, _s.toString()).replace(/\$1/, demandedCommands._.min.toString()) : null);
        } else {
          usage2.fail(__n("Not enough non-option arguments: got %s, need at least %s", "Not enough non-option arguments: got %s, need at least %s", _s, _s.toString(), demandedCommands._.min.toString()));
        }
      } else if (_s > demandedCommands._.max) {
        if (demandedCommands._.maxMsg !== undefined) {
          usage2.fail(demandedCommands._.maxMsg ? demandedCommands._.maxMsg.replace(/\$0/g, _s.toString()).replace(/\$1/, demandedCommands._.max.toString()) : null);
        } else {
          usage2.fail(__n("Too many non-option arguments: got %s, maximum of %s", "Too many non-option arguments: got %s, maximum of %s", _s, _s.toString(), demandedCommands._.max.toString()));
        }
      }
    }
  };
  self.positionalCount = function positionalCount(required, observed) {
    if (observed < required) {
      usage2.fail(__n("Not enough non-option arguments: got %s, need at least %s", "Not enough non-option arguments: got %s, need at least %s", observed, observed + "", required + ""));
    }
  };
  self.requiredArguments = function requiredArguments(argv) {
    const demandedOptions = yargs.getDemandedOptions();
    let missing = null;
    for (const key of Object.keys(demandedOptions)) {
      if (!Object.prototype.hasOwnProperty.call(argv, key) || typeof argv[key] === "undefined") {
        missing = missing || {};
        missing[key] = demandedOptions[key];
      }
    }
    if (missing) {
      const customMsgs = [];
      for (const key of Object.keys(missing)) {
        const msg = missing[key];
        if (msg && customMsgs.indexOf(msg) < 0) {
          customMsgs.push(msg);
        }
      }
      const customMsg = customMsgs.length ? `\n${customMsgs.join("\n")}` : "";
      usage2.fail(__n("Missing required argument: %s", "Missing required arguments: %s", Object.keys(missing).length, Object.keys(missing).join(", ") + customMsg));
    }
  };
  self.unknownArguments = function unknownArguments(argv, aliases, positionalMap, isDefaultCommand, checkPositionals = true) {
    const commandKeys = yargs.getCommandInstance().getCommands();
    const unknown = [];
    const currentContext = yargs.getContext();
    Object.keys(argv).forEach((key) => {
      if (specialKeys.indexOf(key) === -1 && !Object.prototype.hasOwnProperty.call(positionalMap, key) && !Object.prototype.hasOwnProperty.call(yargs._getParseContext(), key) && !self.isValidAndSomeAliasIsNotNew(key, aliases)) {
        unknown.push(key);
      }
    });
    if (checkPositionals && (currentContext.commands.length > 0 || commandKeys.length > 0 || isDefaultCommand)) {
      argv._.slice(currentContext.commands.length).forEach((key) => {
        if (commandKeys.indexOf("" + key) === -1) {
          unknown.push("" + key);
        }
      });
    }
    if (unknown.length > 0) {
      usage2.fail(__n("Unknown argument: %s", "Unknown arguments: %s", unknown.length, unknown.join(", ")));
    }
  };
  self.unknownCommands = function unknownCommands(argv) {
    const commandKeys = yargs.getCommandInstance().getCommands();
    const unknown = [];
    const currentContext = yargs.getContext();
    if (currentContext.commands.length > 0 || commandKeys.length > 0) {
      argv._.slice(currentContext.commands.length).forEach((key) => {
        if (commandKeys.indexOf("" + key) === -1) {
          unknown.push("" + key);
        }
      });
    }
    if (unknown.length > 0) {
      usage2.fail(__n("Unknown command: %s", "Unknown commands: %s", unknown.length, unknown.join(", ")));
      return true;
    } else {
      return false;
    }
  };
  self.isValidAndSomeAliasIsNotNew = function isValidAndSomeAliasIsNotNew(key, aliases) {
    if (!Object.prototype.hasOwnProperty.call(aliases, key)) {
      return false;
    }
    const newAliases = yargs.parsed.newAliases;
    for (const a of [key, ...aliases[key]]) {
      if (!Object.prototype.hasOwnProperty.call(newAliases, a) || !newAliases[key]) {
        return true;
      }
    }
    return false;
  };
  self.limitedChoices = function limitedChoices(argv) {
    const options = yargs.getOptions();
    const invalid = {};
    if (!Object.keys(options.choices).length)
      return;
    Object.keys(argv).forEach((key) => {
      if (specialKeys.indexOf(key) === -1 && Object.prototype.hasOwnProperty.call(options.choices, key)) {
        [].concat(argv[key]).forEach((value) => {
          if (options.choices[key].indexOf(value) === -1 && value !== undefined) {
            invalid[key] = (invalid[key] || []).concat(value);
          }
        });
      }
    });
    const invalidKeys = Object.keys(invalid);
    if (!invalidKeys.length)
      return;
    let msg = __("Invalid values:");
    invalidKeys.forEach((key) => {
      msg += `\n  ${__("Argument: %s, Given: %s, Choices: %s", key, usage2.stringifiedValues(invalid[key]), usage2.stringifiedValues(options.choices[key]))}`;
    });
    usage2.fail(msg);
  };
  let checks = [];
  self.check = function check(f, global2) {
    checks.push({
      func: f,
      global: global2
    });
  };
  self.customChecks = function customChecks(argv, aliases) {
    for (let i = 0, f;(f = checks[i]) !== undefined; i++) {
      const func = f.func;
      let result = null;
      try {
        result = func(argv, aliases);
      } catch (err) {
        usage2.fail(err.message ? err.message : err, err);
        continue;
      }
      if (!result) {
        usage2.fail(__("Argument check failed: %s", func.toString()));
      } else if (typeof result === "string" || result instanceof Error) {
        usage2.fail(result.toString(), result);
      }
    }
  };
  let implied = {};
  self.implies = function implies(key, value) {
    argsert("<string|object> [array|number|string]", [key, value], arguments.length);
    if (typeof key === "object") {
      Object.keys(key).forEach((k) => {
        self.implies(k, key[k]);
      });
    } else {
      yargs.global(key);
      if (!implied[key]) {
        implied[key] = [];
      }
      if (Array.isArray(value)) {
        value.forEach((i) => self.implies(key, i));
      } else {
        assertNotStrictEqual(value, undefined, shim2);
        implied[key].push(value);
      }
    }
  };
  self.getImplied = function getImplied() {
    return implied;
  };
  function keyExists(argv, val) {
    const num = Number(val);
    val = isNaN(num) ? val : num;
    if (typeof val === "number") {
      val = argv._.length >= val;
    } else if (val.match(/^--no-.+/)) {
      val = val.match(/^--no-(.+)/)[1];
      val = !argv[val];
    } else {
      val = argv[val];
    }
    return val;
  }
  self.implications = function implications(argv) {
    const implyFail = [];
    Object.keys(implied).forEach((key) => {
      const origKey = key;
      (implied[key] || []).forEach((value) => {
        let key2 = origKey;
        const origValue = value;
        key2 = keyExists(argv, key2);
        value = keyExists(argv, value);
        if (key2 && !value) {
          implyFail.push(` ${origKey} -> ${origValue}`);
        }
      });
    });
    if (implyFail.length) {
      let msg = `${__("Implications failed:")}\n`;
      implyFail.forEach((value) => {
        msg += value;
      });
      usage2.fail(msg);
    }
  };
  let conflicting = {};
  self.conflicts = function conflicts(key, value) {
    argsert("<string|object> [array|string]", [key, value], arguments.length);
    if (typeof key === "object") {
      Object.keys(key).forEach((k) => {
        self.conflicts(k, key[k]);
      });
    } else {
      yargs.global(key);
      if (!conflicting[key]) {
        conflicting[key] = [];
      }
      if (Array.isArray(value)) {
        value.forEach((i) => self.conflicts(key, i));
      } else {
        conflicting[key].push(value);
      }
    }
  };
  self.getConflicting = () => conflicting;
  self.conflicting = function conflictingFn(argv) {
    Object.keys(argv).forEach((key) => {
      if (conflicting[key]) {
        conflicting[key].forEach((value) => {
          if (value && argv[key] !== undefined && argv[value] !== undefined) {
            usage2.fail(__("Arguments %s and %s are mutually exclusive", key, value));
          }
        });
      }
    });
  };
  self.recommendCommands = function recommendCommands(cmd, potentialCommands) {
    const threshold = 3;
    potentialCommands = potentialCommands.sort((a, b) => b.length - a.length);
    let recommended = null;
    let bestDistance = Infinity;
    for (let i = 0, candidate;(candidate = potentialCommands[i]) !== undefined; i++) {
      const d = levenshtein(cmd, candidate);
      if (d <= threshold && d < bestDistance) {
        bestDistance = d;
        recommended = candidate;
      }
    }
    if (recommended)
      usage2.fail(__("Did you mean %s?", recommended));
  };
  self.reset = function reset(localLookup) {
    implied = objFilter(implied, (k) => !localLookup[k]);
    conflicting = objFilter(conflicting, (k) => !localLookup[k]);
    checks = checks.filter((c) => c.global);
    return self;
  };
  const frozens = [];
  self.freeze = function freeze() {
    frozens.push({
      implied,
      checks,
      conflicting
    });
  };
  self.unfreeze = function unfreeze() {
    const frozen = frozens.pop();
    assertNotStrictEqual(frozen, undefined, shim2);
    ({ implied, checks, conflicting } = frozen);
  };
  return self;
}
var specialKeys = ["$0", "--", "_"];

// node_modules/yargs/build/lib/utils/apply-extends.js
function applyExtends(config, cwd, mergeExtends, _shim) {
  shim2 = _shim;
  let defaultConfig = {};
  if (Object.prototype.hasOwnProperty.call(config, "extends")) {
    if (typeof config.extends !== "string")
      return defaultConfig;
    const isPath = /\.json|\..*rc$/.test(config.extends);
    let pathToDefault = null;
    if (!isPath) {
      try {
        pathToDefault = require.resolve(config.extends);
      } catch (_err) {
        return config;
      }
    } else {
      pathToDefault = getPathToDefaultConfig(cwd, config.extends);
    }
    checkForCircularExtends(pathToDefault);
    previouslyVisitedConfigs.push(pathToDefault);
    defaultConfig = isPath ? JSON.parse(shim2.readFileSync(pathToDefault, "utf8")) : import.meta.require(config.extends);
    delete config.extends;
    defaultConfig = applyExtends(defaultConfig, shim2.path.dirname(pathToDefault), mergeExtends, shim2);
  }
  previouslyVisitedConfigs = [];
  return mergeExtends ? mergeDeep(defaultConfig, config) : Object.assign({}, defaultConfig, config);
}
var checkForCircularExtends = function(cfgPath) {
  if (previouslyVisitedConfigs.indexOf(cfgPath) > -1) {
    throw new YError(`Circular extended configurations: '${cfgPath}'.`);
  }
};
var getPathToDefaultConfig = function(cwd, pathToExtend) {
  return shim2.path.resolve(cwd, pathToExtend);
};
var mergeDeep = function(config1, config2) {
  const target = {};
  function isObject(obj) {
    return obj && typeof obj === "object" && !Array.isArray(obj);
  }
  Object.assign(target, config1);
  for (const key of Object.keys(config2)) {
    if (isObject(config2[key]) && isObject(target[key])) {
      target[key] = mergeDeep(config1[key], config2[key]);
    } else {
      target[key] = config2[key];
    }
  }
  return target;
};
var previouslyVisitedConfigs = [];
var shim2;

// node_modules/yargs/build/lib/yargs-factory.js
function YargsWithShim(_shim) {
  shim3 = _shim;
  return Yargs;
}
var Yargs = function(processArgs = [], cwd = shim3.process.cwd(), parentRequire) {
  const self = {};
  let command4;
  let completion3 = null;
  let groups = {};
  const globalMiddleware = [];
  let output = "";
  const preservedGroups = {};
  let usage3;
  let validation3;
  let handlerFinishCommand = null;
  const y18n3 = shim3.y18n;
  self.middleware = globalMiddlewareFactory(globalMiddleware, self);
  self.scriptName = function(scriptName) {
    self.customScriptName = true;
    self.$0 = scriptName;
    return self;
  };
  let default$0;
  if (/\b(node|iojs|electron)(\.exe)?$/.test(shim3.process.argv()[0])) {
    default$0 = shim3.process.argv().slice(1, 2);
  } else {
    default$0 = shim3.process.argv().slice(0, 1);
  }
  self.$0 = default$0.map((x) => {
    const b = rebase(cwd, x);
    return x.match(/^(\/|([a-zA-Z]:)?\\)/) && b.length < x.length ? b : x;
  }).join(" ").trim();
  if (shim3.getEnv("_") && shim3.getProcessArgvBin() === shim3.getEnv("_")) {
    self.$0 = shim3.getEnv("_").replace(`${shim3.path.dirname(shim3.process.execPath())}/`, "");
  }
  const context = { resets: -1, commands: [], fullCommands: [], files: [] };
  self.getContext = () => context;
  let hasOutput = false;
  let exitError = null;
  self.exit = (code, err) => {
    hasOutput = true;
    exitError = err;
    if (exitProcess)
      shim3.process.exit(code);
  };
  let completionCommand = null;
  self.completion = function(cmd, desc, fn) {
    argsert("[string] [string|boolean|function] [function]", [cmd, desc, fn], arguments.length);
    if (typeof desc === "function") {
      fn = desc;
      desc = undefined;
    }
    completionCommand = cmd || completionCommand || "completion";
    if (!desc && desc !== false) {
      desc = "generate completion script";
    }
    self.command(completionCommand, desc);
    if (fn)
      completion3.registerFunction(fn);
    return self;
  };
  let options;
  self.resetOptions = self.reset = function resetOptions(aliases = {}) {
    context.resets++;
    options = options || {};
    const tmpOptions = {};
    tmpOptions.local = options.local ? options.local : [];
    tmpOptions.configObjects = options.configObjects ? options.configObjects : [];
    const localLookup = {};
    tmpOptions.local.forEach((l) => {
      localLookup[l] = true;
      (aliases[l] || []).forEach((a) => {
        localLookup[a] = true;
      });
    });
    Object.assign(preservedGroups, Object.keys(groups).reduce((acc, groupName) => {
      const keys = groups[groupName].filter((key) => !(key in localLookup));
      if (keys.length > 0) {
        acc[groupName] = keys;
      }
      return acc;
    }, {}));
    groups = {};
    const arrayOptions = [
      "array",
      "boolean",
      "string",
      "skipValidation",
      "count",
      "normalize",
      "number",
      "hiddenOptions"
    ];
    const objectOptions = [
      "narg",
      "key",
      "alias",
      "default",
      "defaultDescription",
      "config",
      "choices",
      "demandedOptions",
      "demandedCommands",
      "coerce",
      "deprecatedOptions"
    ];
    arrayOptions.forEach((k) => {
      tmpOptions[k] = (options[k] || []).filter((k2) => !localLookup[k2]);
    });
    objectOptions.forEach((k) => {
      tmpOptions[k] = objFilter(options[k], (k2) => !localLookup[k2]);
    });
    tmpOptions.envPrefix = options.envPrefix;
    options = tmpOptions;
    usage3 = usage3 ? usage3.reset(localLookup) : usage(self, y18n3, shim3);
    validation3 = validation3 ? validation3.reset(localLookup) : validation(self, usage3, y18n3, shim3);
    command4 = command4 ? command4.reset() : command(self, usage3, validation3, globalMiddleware, shim3);
    if (!completion3)
      completion3 = completion(self, usage3, command4, shim3);
    completionCommand = null;
    output = "";
    exitError = null;
    hasOutput = false;
    self.parsed = false;
    return self;
  };
  self.resetOptions();
  const frozens = [];
  function freeze() {
    frozens.push({
      options,
      configObjects: options.configObjects.slice(0),
      exitProcess,
      groups,
      strict,
      strictCommands,
      strictOptions,
      completionCommand,
      output,
      exitError,
      hasOutput,
      parsed: self.parsed,
      parseFn,
      parseContext,
      handlerFinishCommand
    });
    usage3.freeze();
    validation3.freeze();
    command4.freeze();
  }
  function unfreeze() {
    const frozen = frozens.pop();
    assertNotStrictEqual(frozen, undefined, shim3);
    let configObjects;
    ({
      options,
      configObjects,
      exitProcess,
      groups,
      output,
      exitError,
      hasOutput,
      parsed: self.parsed,
      strict,
      strictCommands,
      strictOptions,
      completionCommand,
      parseFn,
      parseContext,
      handlerFinishCommand
    } = frozen);
    options.configObjects = configObjects;
    usage3.unfreeze();
    validation3.unfreeze();
    command4.unfreeze();
  }
  self.boolean = function(keys) {
    argsert("<array|string>", [keys], arguments.length);
    populateParserHintArray("boolean", keys);
    return self;
  };
  self.array = function(keys) {
    argsert("<array|string>", [keys], arguments.length);
    populateParserHintArray("array", keys);
    return self;
  };
  self.number = function(keys) {
    argsert("<array|string>", [keys], arguments.length);
    populateParserHintArray("number", keys);
    return self;
  };
  self.normalize = function(keys) {
    argsert("<array|string>", [keys], arguments.length);
    populateParserHintArray("normalize", keys);
    return self;
  };
  self.count = function(keys) {
    argsert("<array|string>", [keys], arguments.length);
    populateParserHintArray("count", keys);
    return self;
  };
  self.string = function(keys) {
    argsert("<array|string>", [keys], arguments.length);
    populateParserHintArray("string", keys);
    return self;
  };
  self.requiresArg = function(keys) {
    argsert("<array|string|object> [number]", [keys], arguments.length);
    if (typeof keys === "string" && options.narg[keys]) {
      return self;
    } else {
      populateParserHintSingleValueDictionary(self.requiresArg, "narg", keys, NaN);
    }
    return self;
  };
  self.skipValidation = function(keys) {
    argsert("<array|string>", [keys], arguments.length);
    populateParserHintArray("skipValidation", keys);
    return self;
  };
  function populateParserHintArray(type, keys) {
    keys = [].concat(keys);
    keys.forEach((key) => {
      key = sanitizeKey2(key);
      options[type].push(key);
    });
  }
  self.nargs = function(key, value) {
    argsert("<string|object|array> [number]", [key, value], arguments.length);
    populateParserHintSingleValueDictionary(self.nargs, "narg", key, value);
    return self;
  };
  self.choices = function(key, value) {
    argsert("<object|string|array> [string|array]", [key, value], arguments.length);
    populateParserHintArrayDictionary(self.choices, "choices", key, value);
    return self;
  };
  self.alias = function(key, value) {
    argsert("<object|string|array> [string|array]", [key, value], arguments.length);
    populateParserHintArrayDictionary(self.alias, "alias", key, value);
    return self;
  };
  self.default = self.defaults = function(key, value, defaultDescription) {
    argsert("<object|string|array> [*] [string]", [key, value, defaultDescription], arguments.length);
    if (defaultDescription) {
      assertSingleKey(key, shim3);
      options.defaultDescription[key] = defaultDescription;
    }
    if (typeof value === "function") {
      assertSingleKey(key, shim3);
      if (!options.defaultDescription[key])
        options.defaultDescription[key] = usage3.functionDescription(value);
      value = value.call();
    }
    populateParserHintSingleValueDictionary(self.default, "default", key, value);
    return self;
  };
  self.describe = function(key, desc) {
    argsert("<object|string|array> [string]", [key, desc], arguments.length);
    setKey(key, true);
    usage3.describe(key, desc);
    return self;
  };
  function setKey(key, set) {
    populateParserHintSingleValueDictionary(setKey, "key", key, set);
    return self;
  }
  function demandOption(keys, msg) {
    argsert("<object|string|array> [string]", [keys, msg], arguments.length);
    populateParserHintSingleValueDictionary(self.demandOption, "demandedOptions", keys, msg);
    return self;
  }
  self.demandOption = demandOption;
  self.coerce = function(keys, value) {
    argsert("<object|string|array> [function]", [keys, value], arguments.length);
    populateParserHintSingleValueDictionary(self.coerce, "coerce", keys, value);
    return self;
  };
  function populateParserHintSingleValueDictionary(builder, type, key, value) {
    populateParserHintDictionary(builder, type, key, value, (type2, key2, value2) => {
      options[type2][key2] = value2;
    });
  }
  function populateParserHintArrayDictionary(builder, type, key, value) {
    populateParserHintDictionary(builder, type, key, value, (type2, key2, value2) => {
      options[type2][key2] = (options[type2][key2] || []).concat(value2);
    });
  }
  function populateParserHintDictionary(builder, type, key, value, singleKeyHandler) {
    if (Array.isArray(key)) {
      key.forEach((k) => {
        builder(k, value);
      });
    } else if (((key2) => typeof key2 === "object")(key)) {
      for (const k of objectKeys(key)) {
        builder(k, key[k]);
      }
    } else {
      singleKeyHandler(type, sanitizeKey2(key), value);
    }
  }
  function sanitizeKey2(key) {
    if (key === "__proto__")
      return "___proto___";
    return key;
  }
  function deleteFromParserHintObject(optionKey) {
    objectKeys(options).forEach((hintKey) => {
      if (((key) => key === "configObjects")(hintKey))
        return;
      const hint = options[hintKey];
      if (Array.isArray(hint)) {
        if (~hint.indexOf(optionKey))
          hint.splice(hint.indexOf(optionKey), 1);
      } else if (typeof hint === "object") {
        delete hint[optionKey];
      }
    });
    delete usage3.getDescriptions()[optionKey];
  }
  self.config = function config(key = "config", msg, parseFn2) {
    argsert("[object|string] [string|function] [function]", [key, msg, parseFn2], arguments.length);
    if (typeof key === "object" && !Array.isArray(key)) {
      key = applyExtends(key, cwd, self.getParserConfiguration()["deep-merge-config"] || false, shim3);
      options.configObjects = (options.configObjects || []).concat(key);
      return self;
    }
    if (typeof msg === "function") {
      parseFn2 = msg;
      msg = undefined;
    }
    self.describe(key, msg || usage3.deferY18nLookup("Path to JSON config file"));
    (Array.isArray(key) ? key : [key]).forEach((k) => {
      options.config[k] = parseFn2 || true;
    });
    return self;
  };
  self.example = function(cmd, description) {
    argsert("<string|array> [string]", [cmd, description], arguments.length);
    if (Array.isArray(cmd)) {
      cmd.forEach((exampleParams) => self.example(...exampleParams));
    } else {
      usage3.example(cmd, description);
    }
    return self;
  };
  self.command = function(cmd, description, builder, handler, middlewares, deprecated) {
    argsert("<string|array|object> [string|boolean] [function|object] [function] [array] [boolean|string]", [cmd, description, builder, handler, middlewares, deprecated], arguments.length);
    command4.addHandler(cmd, description, builder, handler, middlewares, deprecated);
    return self;
  };
  self.commandDir = function(dir, opts) {
    argsert("<string> [object]", [dir, opts], arguments.length);
    const req = parentRequire || shim3.require;
    command4.addDirectory(dir, self.getContext(), req, shim3.getCallerFile(), opts);
    return self;
  };
  self.demand = self.required = self.require = function demand(keys, max, msg) {
    if (Array.isArray(max)) {
      max.forEach((key) => {
        assertNotStrictEqual(msg, true, shim3);
        demandOption(key, msg);
      });
      max = Infinity;
    } else if (typeof max !== "number") {
      msg = max;
      max = Infinity;
    }
    if (typeof keys === "number") {
      assertNotStrictEqual(msg, true, shim3);
      self.demandCommand(keys, max, msg, msg);
    } else if (Array.isArray(keys)) {
      keys.forEach((key) => {
        assertNotStrictEqual(msg, true, shim3);
        demandOption(key, msg);
      });
    } else {
      if (typeof msg === "string") {
        demandOption(keys, msg);
      } else if (msg === true || typeof msg === "undefined") {
        demandOption(keys);
      }
    }
    return self;
  };
  self.demandCommand = function demandCommand(min = 1, max, minMsg, maxMsg) {
    argsert("[number] [number|string] [string|null|undefined] [string|null|undefined]", [min, max, minMsg, maxMsg], arguments.length);
    if (typeof max !== "number") {
      minMsg = max;
      max = Infinity;
    }
    self.global("_", false);
    options.demandedCommands._ = {
      min,
      max,
      minMsg,
      maxMsg
    };
    return self;
  };
  self.getDemandedOptions = () => {
    argsert([], 0);
    return options.demandedOptions;
  };
  self.getDemandedCommands = () => {
    argsert([], 0);
    return options.demandedCommands;
  };
  self.deprecateOption = function deprecateOption(option, message) {
    argsert("<string> [string|boolean]", [option, message], arguments.length);
    options.deprecatedOptions[option] = message;
    return self;
  };
  self.getDeprecatedOptions = () => {
    argsert([], 0);
    return options.deprecatedOptions;
  };
  self.implies = function(key, value) {
    argsert("<string|object> [number|string|array]", [key, value], arguments.length);
    validation3.implies(key, value);
    return self;
  };
  self.conflicts = function(key1, key2) {
    argsert("<string|object> [string|array]", [key1, key2], arguments.length);
    validation3.conflicts(key1, key2);
    return self;
  };
  self.usage = function(msg, description, builder, handler) {
    argsert("<string|null|undefined> [string|boolean] [function|object] [function]", [msg, description, builder, handler], arguments.length);
    if (description !== undefined) {
      assertNotStrictEqual(msg, null, shim3);
      if ((msg || "").match(/^\$0( |$)/)) {
        return self.command(msg, description, builder, handler);
      } else {
        throw new YError(".usage() description must start with $0 if being used as alias for .command()");
      }
    } else {
      usage3.usage(msg);
      return self;
    }
  };
  self.epilogue = self.epilog = function(msg) {
    argsert("<string>", [msg], arguments.length);
    usage3.epilog(msg);
    return self;
  };
  self.fail = function(f) {
    argsert("<function>", [f], arguments.length);
    usage3.failFn(f);
    return self;
  };
  self.onFinishCommand = function(f) {
    argsert("<function>", [f], arguments.length);
    handlerFinishCommand = f;
    return self;
  };
  self.getHandlerFinishCommand = () => handlerFinishCommand;
  self.check = function(f, _global) {
    argsert("<function> [boolean]", [f, _global], arguments.length);
    validation3.check(f, _global !== false);
    return self;
  };
  self.global = function global2(globals, global2) {
    argsert("<string|array> [boolean]", [globals, global2], arguments.length);
    globals = [].concat(globals);
    if (global2 !== false) {
      options.local = options.local.filter((l) => globals.indexOf(l) === -1);
    } else {
      globals.forEach((g) => {
        if (options.local.indexOf(g) === -1)
          options.local.push(g);
      });
    }
    return self;
  };
  self.pkgConf = function pkgConf(key, rootPath) {
    argsert("<string> [string]", [key, rootPath], arguments.length);
    let conf = null;
    const obj = pkgUp(rootPath || cwd);
    if (obj[key] && typeof obj[key] === "object") {
      conf = applyExtends(obj[key], rootPath || cwd, self.getParserConfiguration()["deep-merge-config"] || false, shim3);
      options.configObjects = (options.configObjects || []).concat(conf);
    }
    return self;
  };
  const pkgs = {};
  function pkgUp(rootPath) {
    const npath = rootPath || "*";
    if (pkgs[npath])
      return pkgs[npath];
    let obj = {};
    try {
      let startDir = rootPath || shim3.mainFilename;
      if (!rootPath && shim3.path.extname(startDir)) {
        startDir = shim3.path.dirname(startDir);
      }
      const pkgJsonPath = shim3.findUp(startDir, (dir, names) => {
        if (names.includes("package.json")) {
          return "package.json";
        } else {
          return;
        }
      });
      assertNotStrictEqual(pkgJsonPath, undefined, shim3);
      obj = JSON.parse(shim3.readFileSync(pkgJsonPath, "utf8"));
    } catch (_noop) {
    }
    pkgs[npath] = obj || {};
    return pkgs[npath];
  }
  let parseFn = null;
  let parseContext = null;
  self.parse = function parse(args, shortCircuit, _parseFn) {
    argsert("[string|array] [function|boolean|object] [function]", [args, shortCircuit, _parseFn], arguments.length);
    freeze();
    if (typeof args === "undefined") {
      const argv = self._parseArgs(processArgs);
      const tmpParsed = self.parsed;
      unfreeze();
      self.parsed = tmpParsed;
      return argv;
    }
    if (typeof shortCircuit === "object") {
      parseContext = shortCircuit;
      shortCircuit = _parseFn;
    }
    if (typeof shortCircuit === "function") {
      parseFn = shortCircuit;
      shortCircuit = false;
    }
    if (!shortCircuit)
      processArgs = args;
    if (parseFn)
      exitProcess = false;
    const parsed = self._parseArgs(args, !!shortCircuit);
    completion3.setParsed(self.parsed);
    if (parseFn)
      parseFn(exitError, parsed, output);
    unfreeze();
    return parsed;
  };
  self._getParseContext = () => parseContext || {};
  self._hasParseCallback = () => !!parseFn;
  self.option = self.options = function option(key, opt) {
    argsert("<string|object> [object]", [key, opt], arguments.length);
    if (typeof key === "object") {
      Object.keys(key).forEach((k) => {
        self.options(k, key[k]);
      });
    } else {
      if (typeof opt !== "object") {
        opt = {};
      }
      options.key[key] = true;
      if (opt.alias)
        self.alias(key, opt.alias);
      const deprecate = opt.deprecate || opt.deprecated;
      if (deprecate) {
        self.deprecateOption(key, deprecate);
      }
      const demand = opt.demand || opt.required || opt.require;
      if (demand) {
        self.demand(key, demand);
      }
      if (opt.demandOption) {
        self.demandOption(key, typeof opt.demandOption === "string" ? opt.demandOption : undefined);
      }
      if (opt.conflicts) {
        self.conflicts(key, opt.conflicts);
      }
      if ("default" in opt) {
        self.default(key, opt.default);
      }
      if (opt.implies !== undefined) {
        self.implies(key, opt.implies);
      }
      if (opt.nargs !== undefined) {
        self.nargs(key, opt.nargs);
      }
      if (opt.config) {
        self.config(key, opt.configParser);
      }
      if (opt.normalize) {
        self.normalize(key);
      }
      if (opt.choices) {
        self.choices(key, opt.choices);
      }
      if (opt.coerce) {
        self.coerce(key, opt.coerce);
      }
      if (opt.group) {
        self.group(key, opt.group);
      }
      if (opt.boolean || opt.type === "boolean") {
        self.boolean(key);
        if (opt.alias)
          self.boolean(opt.alias);
      }
      if (opt.array || opt.type === "array") {
        self.array(key);
        if (opt.alias)
          self.array(opt.alias);
      }
      if (opt.number || opt.type === "number") {
        self.number(key);
        if (opt.alias)
          self.number(opt.alias);
      }
      if (opt.string || opt.type === "string") {
        self.string(key);
        if (opt.alias)
          self.string(opt.alias);
      }
      if (opt.count || opt.type === "count") {
        self.count(key);
      }
      if (typeof opt.global === "boolean") {
        self.global(key, opt.global);
      }
      if (opt.defaultDescription) {
        options.defaultDescription[key] = opt.defaultDescription;
      }
      if (opt.skipValidation) {
        self.skipValidation(key);
      }
      const desc = opt.describe || opt.description || opt.desc;
      self.describe(key, desc);
      if (opt.hidden) {
        self.hide(key);
      }
      if (opt.requiresArg) {
        self.requiresArg(key);
      }
    }
    return self;
  };
  self.getOptions = () => options;
  self.positional = function(key, opts) {
    argsert("<string> <object>", [key, opts], arguments.length);
    if (context.resets === 0) {
      throw new YError(".positional() can only be called in a command's builder function");
    }
    const supportedOpts = [
      "default",
      "defaultDescription",
      "implies",
      "normalize",
      "choices",
      "conflicts",
      "coerce",
      "type",
      "describe",
      "desc",
      "description",
      "alias"
    ];
    opts = objFilter(opts, (k, v) => {
      let accept = supportedOpts.indexOf(k) !== -1;
      if (k === "type" && ["string", "number", "boolean"].indexOf(v) === -1)
        accept = false;
      return accept;
    });
    const fullCommand = context.fullCommands[context.fullCommands.length - 1];
    const parseOptions = fullCommand ? command4.cmdToParseOptions(fullCommand) : {
      array: [],
      alias: {},
      default: {},
      demand: {}
    };
    objectKeys(parseOptions).forEach((pk) => {
      const parseOption = parseOptions[pk];
      if (Array.isArray(parseOption)) {
        if (parseOption.indexOf(key) !== -1)
          opts[pk] = true;
      } else {
        if (parseOption[key] && !(pk in opts))
          opts[pk] = parseOption[key];
      }
    });
    self.group(key, usage3.getPositionalGroupName());
    return self.option(key, opts);
  };
  self.group = function group(opts, groupName) {
    argsert("<string|array> <string>", [opts, groupName], arguments.length);
    const existing = preservedGroups[groupName] || groups[groupName];
    if (preservedGroups[groupName]) {
      delete preservedGroups[groupName];
    }
    const seen = {};
    groups[groupName] = (existing || []).concat(opts).filter((key) => {
      if (seen[key])
        return false;
      return seen[key] = true;
    });
    return self;
  };
  self.getGroups = () => Object.assign({}, groups, preservedGroups);
  self.env = function(prefix) {
    argsert("[string|boolean]", [prefix], arguments.length);
    if (prefix === false)
      delete options.envPrefix;
    else
      options.envPrefix = prefix || "";
    return self;
  };
  self.wrap = function(cols) {
    argsert("<number|null|undefined>", [cols], arguments.length);
    usage3.wrap(cols);
    return self;
  };
  let strict = false;
  self.strict = function(enabled) {
    argsert("[boolean]", [enabled], arguments.length);
    strict = enabled !== false;
    return self;
  };
  self.getStrict = () => strict;
  let strictCommands = false;
  self.strictCommands = function(enabled) {
    argsert("[boolean]", [enabled], arguments.length);
    strictCommands = enabled !== false;
    return self;
  };
  self.getStrictCommands = () => strictCommands;
  let strictOptions = false;
  self.strictOptions = function(enabled) {
    argsert("[boolean]", [enabled], arguments.length);
    strictOptions = enabled !== false;
    return self;
  };
  self.getStrictOptions = () => strictOptions;
  let parserConfig = {};
  self.parserConfiguration = function parserConfiguration(config) {
    argsert("<object>", [config], arguments.length);
    parserConfig = config;
    return self;
  };
  self.getParserConfiguration = () => parserConfig;
  self.showHelp = function(level) {
    argsert("[string|function]", [level], arguments.length);
    if (!self.parsed)
      self._parseArgs(processArgs);
    if (command4.hasDefaultCommand()) {
      context.resets++;
      command4.runDefaultBuilderOn(self);
    }
    usage3.showHelp(level);
    return self;
  };
  let versionOpt = null;
  self.version = function version(opt, msg, ver) {
    const defaultVersionOpt = "version";
    argsert("[boolean|string] [string] [string]", [opt, msg, ver], arguments.length);
    if (versionOpt) {
      deleteFromParserHintObject(versionOpt);
      usage3.version(undefined);
      versionOpt = null;
    }
    if (arguments.length === 0) {
      ver = guessVersion();
      opt = defaultVersionOpt;
    } else if (arguments.length === 1) {
      if (opt === false) {
        return self;
      }
      ver = opt;
      opt = defaultVersionOpt;
    } else if (arguments.length === 2) {
      ver = msg;
      msg = undefined;
    }
    versionOpt = typeof opt === "string" ? opt : defaultVersionOpt;
    msg = msg || usage3.deferY18nLookup("Show version number");
    usage3.version(ver || undefined);
    self.boolean(versionOpt);
    self.describe(versionOpt, msg);
    return self;
  };
  function guessVersion() {
    const obj = pkgUp();
    return obj.version || "unknown";
  }
  let helpOpt = null;
  self.addHelpOpt = self.help = function addHelpOpt(opt, msg) {
    const defaultHelpOpt = "help";
    argsert("[string|boolean] [string]", [opt, msg], arguments.length);
    if (helpOpt) {
      deleteFromParserHintObject(helpOpt);
      helpOpt = null;
    }
    if (arguments.length === 1) {
      if (opt === false)
        return self;
    }
    helpOpt = typeof opt === "string" ? opt : defaultHelpOpt;
    self.boolean(helpOpt);
    self.describe(helpOpt, msg || usage3.deferY18nLookup("Show help"));
    return self;
  };
  const defaultShowHiddenOpt = "show-hidden";
  options.showHiddenOpt = defaultShowHiddenOpt;
  self.addShowHiddenOpt = self.showHidden = function addShowHiddenOpt(opt, msg) {
    argsert("[string|boolean] [string]", [opt, msg], arguments.length);
    if (arguments.length === 1) {
      if (opt === false)
        return self;
    }
    const showHiddenOpt = typeof opt === "string" ? opt : defaultShowHiddenOpt;
    self.boolean(showHiddenOpt);
    self.describe(showHiddenOpt, msg || usage3.deferY18nLookup("Show hidden options"));
    options.showHiddenOpt = showHiddenOpt;
    return self;
  };
  self.hide = function hide(key) {
    argsert("<string>", [key], arguments.length);
    options.hiddenOptions.push(key);
    return self;
  };
  self.showHelpOnFail = function showHelpOnFail(enabled, message) {
    argsert("[boolean|string] [string]", [enabled, message], arguments.length);
    usage3.showHelpOnFail(enabled, message);
    return self;
  };
  let exitProcess = true;
  self.exitProcess = function(enabled = true) {
    argsert("[boolean]", [enabled], arguments.length);
    exitProcess = enabled;
    return self;
  };
  self.getExitProcess = () => exitProcess;
  self.showCompletionScript = function($0, cmd) {
    argsert("[string] [string]", [$0, cmd], arguments.length);
    $0 = $0 || self.$0;
    _logger.log(completion3.generateCompletionScript($0, cmd || completionCommand || "completion"));
    return self;
  };
  self.getCompletion = function(args, done) {
    argsert("<array> <function>", [args, done], arguments.length);
    completion3.getCompletion(args, done);
  };
  self.locale = function(locale) {
    argsert("[string]", [locale], arguments.length);
    if (!locale) {
      guessLocale();
      return y18n3.getLocale();
    }
    detectLocale = false;
    y18n3.setLocale(locale);
    return self;
  };
  self.updateStrings = self.updateLocale = function(obj) {
    argsert("<object>", [obj], arguments.length);
    detectLocale = false;
    y18n3.updateLocale(obj);
    return self;
  };
  let detectLocale = true;
  self.detectLocale = function(detect) {
    argsert("<boolean>", [detect], arguments.length);
    detectLocale = detect;
    return self;
  };
  self.getDetectLocale = () => detectLocale;
  const _logger = {
    log(...args) {
      if (!self._hasParseCallback())
        console.log(...args);
      hasOutput = true;
      if (output.length)
        output += "\n";
      output += args.join(" ");
    },
    error(...args) {
      if (!self._hasParseCallback())
        console.error(...args);
      hasOutput = true;
      if (output.length)
        output += "\n";
      output += args.join(" ");
    }
  };
  self._getLoggerInstance = () => _logger;
  self._hasOutput = () => hasOutput;
  self._setHasOutput = () => {
    hasOutput = true;
  };
  let recommendCommands;
  self.recommendCommands = function(recommend = true) {
    argsert("[boolean]", [recommend], arguments.length);
    recommendCommands = recommend;
    return self;
  };
  self.getUsageInstance = () => usage3;
  self.getValidationInstance = () => validation3;
  self.getCommandInstance = () => command4;
  self.terminalWidth = () => {
    argsert([], 0);
    return shim3.process.stdColumns;
  };
  Object.defineProperty(self, "argv", {
    get: () => self._parseArgs(processArgs),
    enumerable: true
  });
  self._parseArgs = function parseArgs(args, shortCircuit, _calledFromCommand, commandIndex) {
    let skipValidation = !!_calledFromCommand;
    args = args || processArgs;
    options.__ = y18n3.__;
    options.configuration = self.getParserConfiguration();
    const populateDoubleDash = !!options.configuration["populate--"];
    const config = Object.assign({}, options.configuration, {
      "populate--": true
    });
    const parsed = shim3.Parser.detailed(args, Object.assign({}, options, {
      configuration: Object.assign({ "parse-positional-numbers": false }, config)
    }));
    let argv = parsed.argv;
    if (parseContext)
      argv = Object.assign({}, argv, parseContext);
    const aliases = parsed.aliases;
    argv.$0 = self.$0;
    self.parsed = parsed;
    try {
      guessLocale();
      if (shortCircuit) {
        return self._postProcess(argv, populateDoubleDash, _calledFromCommand);
      }
      if (helpOpt) {
        const helpCmds = [helpOpt].concat(aliases[helpOpt] || []).filter((k) => k.length > 1);
        if (~helpCmds.indexOf("" + argv._[argv._.length - 1])) {
          argv._.pop();
          argv[helpOpt] = true;
        }
      }
      const handlerKeys = command4.getCommands();
      const requestCompletions = completion3.completionKey in argv;
      const skipRecommendation = argv[helpOpt] || requestCompletions;
      const skipDefaultCommand = skipRecommendation && (handlerKeys.length > 1 || handlerKeys[0] !== "$0");
      if (argv._.length) {
        if (handlerKeys.length) {
          let firstUnknownCommand;
          for (let i = commandIndex || 0, cmd;argv._[i] !== undefined; i++) {
            cmd = String(argv._[i]);
            if (~handlerKeys.indexOf(cmd) && cmd !== completionCommand) {
              const innerArgv = command4.runCommand(cmd, self, parsed, i + 1);
              return self._postProcess(innerArgv, populateDoubleDash);
            } else if (!firstUnknownCommand && cmd !== completionCommand) {
              firstUnknownCommand = cmd;
              break;
            }
          }
          if (command4.hasDefaultCommand() && !skipDefaultCommand) {
            const innerArgv = command4.runCommand(null, self, parsed);
            return self._postProcess(innerArgv, populateDoubleDash);
          }
          if (recommendCommands && firstUnknownCommand && !skipRecommendation) {
            validation3.recommendCommands(firstUnknownCommand, handlerKeys);
          }
        }
        if (completionCommand && ~argv._.indexOf(completionCommand) && !requestCompletions) {
          if (exitProcess)
            setBlocking(true);
          self.showCompletionScript();
          self.exit(0);
        }
      } else if (command4.hasDefaultCommand() && !skipDefaultCommand) {
        const innerArgv = command4.runCommand(null, self, parsed);
        return self._postProcess(innerArgv, populateDoubleDash);
      }
      if (requestCompletions) {
        if (exitProcess)
          setBlocking(true);
        args = [].concat(args);
        const completionArgs = args.slice(args.indexOf(`--${completion3.completionKey}`) + 1);
        completion3.getCompletion(completionArgs, (completions) => {
          (completions || []).forEach((completion4) => {
            _logger.log(completion4);
          });
          self.exit(0);
        });
        return self._postProcess(argv, !populateDoubleDash, _calledFromCommand);
      }
      if (!hasOutput) {
        Object.keys(argv).forEach((key) => {
          if (key === helpOpt && argv[key]) {
            if (exitProcess)
              setBlocking(true);
            skipValidation = true;
            self.showHelp("log");
            self.exit(0);
          } else if (key === versionOpt && argv[key]) {
            if (exitProcess)
              setBlocking(true);
            skipValidation = true;
            usage3.showVersion();
            self.exit(0);
          }
        });
      }
      if (!skipValidation && options.skipValidation.length > 0) {
        skipValidation = Object.keys(argv).some((key) => options.skipValidation.indexOf(key) >= 0 && argv[key] === true);
      }
      if (!skipValidation) {
        if (parsed.error)
          throw new YError(parsed.error.message);
        if (!requestCompletions) {
          self._runValidation(argv, aliases, {}, parsed.error);
        }
      }
    } catch (err) {
      if (err instanceof YError)
        usage3.fail(err.message, err);
      else
        throw err;
    }
    return self._postProcess(argv, populateDoubleDash, _calledFromCommand);
  };
  self._postProcess = function(argv, populateDoubleDash, calledFromCommand = false) {
    if (isPromise(argv))
      return argv;
    if (calledFromCommand)
      return argv;
    if (!populateDoubleDash) {
      argv = self._copyDoubleDash(argv);
    }
    const parsePositionalNumbers = self.getParserConfiguration()["parse-positional-numbers"] || self.getParserConfiguration()["parse-positional-numbers"] === undefined;
    if (parsePositionalNumbers) {
      argv = self._parsePositionalNumbers(argv);
    }
    return argv;
  };
  self._copyDoubleDash = function(argv) {
    if (!argv._ || !argv["--"])
      return argv;
    argv._.push.apply(argv._, argv["--"]);
    try {
      delete argv["--"];
    } catch (_err) {
    }
    return argv;
  };
  self._parsePositionalNumbers = function(argv) {
    const args = argv["--"] ? argv["--"] : argv._;
    for (let i = 0, arg;(arg = args[i]) !== undefined; i++) {
      if (shim3.Parser.looksLikeNumber(arg) && Number.isSafeInteger(Math.floor(parseFloat(`${arg}`)))) {
        args[i] = Number(arg);
      }
    }
    return argv;
  };
  self._runValidation = function runValidation(argv, aliases, positionalMap, parseErrors, isDefaultCommand = false) {
    if (parseErrors)
      throw new YError(parseErrors.message);
    validation3.nonOptionCount(argv);
    validation3.requiredArguments(argv);
    let failedStrictCommands = false;
    if (strictCommands) {
      failedStrictCommands = validation3.unknownCommands(argv);
    }
    if (strict && !failedStrictCommands) {
      validation3.unknownArguments(argv, aliases, positionalMap, isDefaultCommand);
    } else if (strictOptions) {
      validation3.unknownArguments(argv, aliases, {}, false, false);
    }
    validation3.customChecks(argv, aliases);
    validation3.limitedChoices(argv);
    validation3.implications(argv);
    validation3.conflicting(argv);
  };
  function guessLocale() {
    if (!detectLocale)
      return;
    const locale = shim3.getEnv("LC_ALL") || shim3.getEnv("LC_MESSAGES") || shim3.getEnv("LANG") || shim3.getEnv("LANGUAGE") || "en_US";
    self.locale(locale.replace(/[.:].*/, ""));
  }
  self.help();
  self.version();
  return self;
};
function isYargsInstance(y) {
  return !!y && typeof y._parseArgs === "function";
}
var shim3;
var rebase = (base, dir) => shim3.path.relative(base, dir);

// node_modules/yargs/index.mjs
var Yargs2 = YargsWithShim(esm_default);
var yargs_default = Yargs2;

// src/output.ts
function debug(...data) {
  if (conf.debug) {
    console.error(font.gray(JSON.stringify(data, null, 4)));
  }
}
function step(data) {
  if (conf.verbose) {
    console.error(font.gray(data));
  }
}
var kill = function(error = 1, msg = "") {
  msg && console.error(+msg);
  process.exit(+error);
};
var font = {};
font.red = font.green = font.gray = (str) => str;
var conf = null;
var outputConfig = function(_conf) {
  conf = _conf;
};
var info = function(msg, data = "") {
  if (conf.quiet || conf.quietTotal) {
    return;
  }
  if (conf.output || conf.outputMatch)
    return console.error.apply(this, [font.gray(msg), data].filter(Boolean));
  console.log.apply(this, [msg, data].filter(Boolean));
};
var chat = function(msg, data = "") {
  if (conf.verbose) {
    info(msg, data);
  } else {
    debug([msg, data].filter(Boolean).join(" "));
  }
};
var error = function(msg, data = "") {
  if (conf.bail) {
    return die(msg, data);
  }
  if (!conf.quietTotal) {
    console.error.apply(this, [" \u274C", font.red(msg), data].filter(Boolean));
  }
  return false;
};
var die = function(msg = "", data = "", displayHelp = false) {
  if (displayHelp && !conf.quietTotal) {
    conf.showHelp();
  }
  msg && error(" \u274C " + msg, data);
  kill();
};

// src/engine.ts
function engine(_runtime, conf2 = { engine: "V8" }) {
  runtime = _runtime;
  outputConfig(conf2);
  step("Displaying steps for:");
  step(conf2);
  conf2.pattern = getPattern(conf2.pattern, conf2) || "";
  conf2.replacement = getReplacement(conf2.replacement, conf2) || "";
  if (conf2.replacementJs)
    conf2.replacementOri = conf2.replacement;
  conf2.regex = getRegex(conf2.pattern, conf2) || "";
  step(conf2);
  conf2.files = getFilePaths(conf2);
  if (!conf2.files.length) {
    if (conf2.contentWasPiped) {
      return doReplacement("[pipe-data]", conf2, conf2.pipeData);
    }
    return error(conf2.files.length + " files found");
  }
  chat(conf2.files.length + " files found");
  step(conf2);
  conf2.files.filter((filepath) => {
    if (fs.statSync(filepath).isFile()) {
      return true;
    }
    debug("Not a valid file:", filepath);
    return false;
  }).forEach((filepath) => openFile(filepath, conf2));
}
var openFile = function(file, conf2) {
  if (conf2.voidAsync) {
    chat("Open sync: " + file);
    var data = runtime.fileReadSync(file, conf2.encoding);
    return doReplacement(file, conf2, data);
  }
  chat("Open async: " + file);
  fs.readFile(file, conf2.encoding, function(err, data2) {
    if (err) {
      return error(err);
    }
    return doReplacement(file, conf2, data2);
  });
};
var doReplacement = function(filePath, conf2, content) {
  debug("Work on content from: " + filePath);
  if (conf2.replacementJs) {
    conf2.replacement = dynamicReplacement(filePath, conf2, content);
  }
  const result = content.replace(conf2.regex, conf2.replacement);
  if (conf2.outputMatch) {
    return;
  }
  if (conf2.output) {
    debug("Output result from: " + filePath);
    return process.stdout.write(result);
  }
  if (result === content) {
    debug("Nothing changed in: " + filePath);
    return;
  }
  content = "";
  if (conf2.simulate)
    return info(filePath);
  debug("Write updated content to: " + filePath);
  if (conf2.voidBackup) {
    return fs.writeFile(filePath, result, conf2.encoding, function(err) {
      if (err) {
        return error(err);
      }
      info(filePath);
    });
  }
  const oriFile = path.normalize(path.join(process.cwd(), filePath));
  const salt = new Date().toISOString().replace(re.colon, "_").replace("Z", "");
  const backupFile = oriFile + "." + salt + ".backup";
  if (conf2.voidAsync) {
    try {
      fs.renameSync(oriFile, backupFile);
      fs.writeFileSync(oriFile, result, conf2.encoding);
      if (!conf2.keepBackup) {
        fs.unlinkSync(backupFile);
      }
    } catch (e) {
      return error(e);
    }
    return info(filePath);
  }
  fs.rename(oriFile, backupFile, (err) => {
    if (err) {
      return error(err);
    }
    fs.writeFile(oriFile, result, conf2.encoding, (err2) => {
      if (err2) {
        return error(err2);
      }
      if (!conf2.keepBackup) {
        fs.unlink(backupFile, (err3) => {
          if (err3) {
            return error(err3);
          }
          info(filePath);
        });
      }
      return info(filePath);
    });
  });
};
var getPattern = function(pattern, conf2) {
  step("Get final pattern");
  pattern = replacePlaceholders(pattern, conf2);
  if (conf2.literal) {
    pattern = pattern.replace(re.regexSpecialChars, "\\$&");
  }
  step(pattern);
  return pattern;
};
var getReplacement = function(replacement, conf2) {
  step("Get final replacement");
  replacement = replacePlaceholders(replacement, conf2);
  if (conf2.outputMatch) {
    step("Output match");
    if (parseInt(process.versions.node) < 6) {
      return die("outputMatch is only supported in node 6+");
    }
    return function() {
      step(arguments);
      if (arguments.length === 3) {
        step("Printing full match");
        process.stdout.write(arguments[0] + "\n");
        return "";
      }
      for (var i = 1;i < arguments.length - 2; i++) {
        process.stdout.write(arguments[i]);
      }
      process.stdout.write("\n");
      return "";
    };
  }
  if (conf2.replacementJs && re.capturedGroupRef.test(conf2.replacement) && parseInt(process.versions.node) < 6) {
    return die("Captured groups for javascript replacement is only supported in node 6+");
  }
  step(replacement);
  return replacement;
};
var getRegex = function(pattern, conf2) {
  step("Get final regex with engine: " + conf2.engine);
  let regex;
  let flags = getFlags(conf2);
  switch (conf2.engine) {
    case "V8":
      try {
        regex = new RegExp(pattern, flags);
      } catch (e) {
        if (conf2.debug)
          throw new Error(e);
        die(e.message);
      }
      break;
    case "RE2":
      try {
        const RE2 = (()=>{ throw new Error(`Cannot require module "re2"`);})();
        regex = new RE2(pattern, flags);
      } catch (e) {
        if (conf2.debug)
          throw new Error(e);
        die(e.message);
      }
      break;
    default:
      die(`Engine ${conf2.engine} not supported`);
  }
  step(regex);
  return regex;
};
var getFlags = function(conf2) {
  step("Get flags");
  let flags = "";
  if (!conf2.voidGlobal) {
    flags += "g";
  }
  if (!conf2.voidIgnoreCase) {
    flags += "i";
  }
  if (!conf2.voidMultiline) {
    flags += "m";
  }
  if (conf2.dotAll) {
    flags += "s";
  }
  if (conf2.unicode) {
    flags += "u";
  }
  step(flags);
  return flags;
};
var readableSize = function(size) {
  if (size === 1) {
    return "1 Byte";
  }
  const i = Math.floor(Math.log(size) / Math.log(1024));
  return (size / Math.pow(1024, i)).toFixed(i ? 1 : 0) + " " + ["Bytes", "KB", "MB", "GB", "TB"][i];
};
var dynamicReplacement = function(_file_rr, _config_rr, _data_rr) {
  const _time_obj = now;
  const _time = localTimeString(_time_obj);
  const _pipe = _config_rr.pipeData, _text = _data_rr, _find = _config_rr.pattern, code_rr = _config_rr.replacementOri, _cwd = process.cwd(), _now = _time, _ = " ", _nl = "\n";
  let _file = "\u274C", _file_rel = "\u274C", _dirpath = "\u274C", _dirpath_rel = "\u274C", _dirname = "\u274C", _filename = "\u274C", _name = "\u274C", _ext = "\u274C", _mtime = "\u274C", _ctime = "\u274C", _mtime_obj = new Date(0), _ctime_obj = new Date(0), _bytes = -1, _size = "\u274C", dynamicContent = new Function("require", "fs", "globs", "path", "pipe", "pipe_", "find", "find_", "text", "text_", "file", "file_", "file_rel", "file_rel_", "dirpath", "dirpath_", "dirpath_rel", "dirpath_rel_", "dirname", "dirname_", "filename", "filename_", "name", "name_", "ext", "ext_", "cwd", "cwd_", "now", "now_", "time_obj", "time", "time_", "mtime_obj", "mtime", "mtime_", "ctime_obj", "ctime", "ctime_", "bytes", "bytes_", "size", "size_", "nl", "_", "__code_rr", 'var path = require("path");var __require_ = require;var r = function(file){var result = null;try{result = __require_(file);} catch (e){' + 'var dir = /^[\\/]/.test(file) ? "" : cwd;' + "result = __require_(path.resolve(dir, file));};return result;};require = r;return eval(__code_rr);");
  const needsByteOrSize = re.byteOrSize.test(_config_rr.replacement);
  const betterToReadfromFile = needsByteOrSize && 50000000 < _text.length;
  if (!_config_rr.contentWasPiped) {
    _file = path.normalize(path.join(_cwd, _file_rr));
    _file_rel = path.relative(_cwd, _file);
    const pathInfo = path.parse(_file);
    _dirpath = pathInfo.dir;
    _dirpath_rel = path.relative(_cwd, _dirpath);
    _dirname = (_file.match(re.folderName) || " _")[1];
    _filename = pathInfo.base;
    _name = pathInfo.name;
    _ext = pathInfo.ext;
    if (betterToReadfromFile || re.mctime.test(_config_rr.replacement)) {
      const fileStats = fs.statSync(_file);
      _bytes = fileStats.size;
      _size = readableSize(_bytes);
      _mtime_obj = fileStats.mtime;
      _ctime_obj = fileStats.ctime;
      _mtime = localTimeString(_mtime_obj);
      _ctime = localTimeString(_ctime_obj);
    }
  }
  if (needsByteOrSize && _bytes === -1) {
    _bytes = Buffer.from(_text).length;
    _size = readableSize(_bytes);
  }
  const glob = (a, b) => fGlob.sync(a, {
    unique: true,
    caseSensitiveMatch: !_config_rr.voidIgnoreCase,
    dot: true,
    ...b
  });
  if (!/\$\d/.test(_config_rr.replacement)) {
    return dynamicContent(require, fs, glob, path, _pipe, _pipe + _, _find, _find + _, _text, _text + _, _file, _file + _, _file_rel, _file_rel + _, _dirpath, _dirpath + _, _dirpath_rel, _dirpath_rel + _, _dirname, _dirname + _, _filename, _filename + _, _name, _name + _, _ext, _ext + _, _cwd, _cwd + _, _now, _now + _, _time_obj, _time, _time + _, _mtime_obj, _mtime, _mtime + _, _ctime_obj, _ctime, _ctime + _, _bytes, _bytes + _, _size, _size + _, _nl, _, code_rr);
  }
  return function() {
    step(arguments);
    const __pipe = _pipe, __text = _text, __find = _find, __file = _file, __file_rel = _file_rel, __dirpath = _dirpath, __dirpath_rel = _dirpath_rel, __dirname3 = _dirname, __filename2 = _filename, __name = _name, __ext = _ext, __cwd = _cwd, __now = _now, __time_obj = _time_obj, __time = _time, __mtime_obj = _mtime_obj, __mtime = _mtime, __ctime_obj = _ctime_obj, __ctime = _ctime, __bytes = _bytes, __size = _size, __nl = _nl, __ = _, __code_rr = code_rr;
    var capturedGroups = "";
    for (var i = 0;i < arguments.length - 2; i++) {
      capturedGroups += "var $" + i + "=" + JSON.stringify(arguments[i]) + "; ";
    }
    return dynamicContent(require, fs, glob, path, __pipe, __pipe + __, __find, __find + __, __text, __text + __, __file, __file + __, __file_rel, __file_rel + __, __dirpath, __dirpath + __, __dirpath_rel, __dirpath_rel + __, __dirname3, __dirname3 + __, __filename2, __filename2 + __, __name, __name + __, __ext, __ext + __, __cwd, __cwd + __, __now, __now + _, __time_obj, __time, __time + _, __mtime_obj, __mtime, __mtime + _, __ctime_obj, __ctime, __ctime + _, __bytes, __bytes + __, __size, __size + __, __nl, __, capturedGroups + __code_rr);
  };
};
var localTimeString = function(dateObj = new Date) {
  return `${dateObj.getFullYear()}-${("0" + (dateObj.getMonth() + 1)).slice(-2)}-${("0" + dateObj.getDate()).slice(-2)} ${("0" + dateObj.getHours()).slice(-2)}:${("0" + dateObj.getMinutes()).slice(-2)}:${("0" + dateObj.getSeconds()).slice(-2)}.${("00" + dateObj.getMilliseconds()).slice(-3)}`;
};
var replacePlaceholders = function(str = "", conf2) {
  if (!conf2.voidEuro) {
    str = str.replace(re.euro, "$");
  }
  if (!conf2.voidSection) {
    str = str.replace(re.section, "\\");
  }
  return str;
};
var getFilePaths = function(conf2) {
  const { includeGlob, excludeGlob, excludeRe, voidIgnoreCase } = conf2;
  let filesToInclude = fGlob.sync(includeGlob, {
    ignore: excludeGlob,
    onlyFiles: true,
    unique: true,
    caseSensitiveMatch: !voidIgnoreCase,
    dot: true
  });
  if (excludeRe.length) {
    excludeRe.map((el) => getRegex(getPattern(el, conf2), conf2)).forEach((re) => {
      filesToInclude = filesToInclude.filter((el) => !el.match(re));
    });
  }
  return filesToInclude;
};
var fs = require_lib();
var path = import.meta.require("path");
var fGlob = require_out4();
var globs = require_globs();
var now = new Date;
var re = {
  euro: /\u20AC/g,
  section: /\u00A7/g,
  mctime: /[mc]time/,
  colon: /:/g,
  capturedGroupRef: /\$\d/,
  regexSpecialChars: /[-\[\]{}()*+?.,\/\\^$|#\s]/g,
  byteOrSize: /bytes|size/,
  folderName: /[\\\/]+([^\\\/]+)[\\\/]+[^\\\/]+$/
};
var version = "PACKAGE_VERSION";
var runtime;

// src/cli.ts
function cli2conf(runtime2, args) {
  let pattern, replacement;
  let needHelp = 0;
  if (args.length < 2) {
    if (/-v|--?version$/i.test(args.slice(-1)[0])) {
      console.log(version);
      runtime2.exit(0);
    } else if (/-h|--?help$/i.test(args.slice(-1)[0])) {
      needHelp = 1;
    } else {
      needHelp = 2;
    }
  } else {
    [pattern, replacement] = args.splice(0, 2);
  }
  const argv = yargs_default(args).strict().usage("RexReplace v" + version + "\n\nRegexp search and replace for files using lookahead and backreference to matching groups in the replacement. Defaults to global multiline case-insensitive search.\n\n> rexreplace pattern replacement [fileGlob|option]+").usage(`> rexreplace 'Foo' 'xxx' myfile.md`, `'foobar' in myfile.md will become 'xxxbar'`).usage(`> rr xxx Foo myfile.md`, `The alias 'rr' can be used instead of 'rexreplace'`).example(`> rexreplace '(f?(o))o(.*)' '$3$1\u20AC2' myfile.md`, `'foobar' in myfile.md will become 'barfoo'`).example(`> rexreplace '^#' '##' *.md`, `All markdown files in this dir got all headlines moved one level deeper`).example(`> rexreplace 'a' 'b' 'myfile.md' 'src/**/*.*' `, `Provide multiple files or globs if needed`).version("v", "Print rexreplace version (can be given as only argument)", version).alias("v", "version").boolean("I").describe("I", "Void case insensitive search pattern.").alias("I", "void-ignore-case").boolean("G").describe("G", "Void global search (stop looking after the first match).").alias("G", "void-global").boolean("M").describe("M", "Void multiline search pattern. Makes ^ and $ match start/end of whole content rather than each line.").alias("M", "void-multiline").boolean("s").describe("s", "Have `.` also match newline.").alias("s", "dot-all").boolean("u").describe("u", "Treat pattern as a sequence of unicode code points.").alias("u", "unicode").default("e", "utf8").alias("e", "encoding").describe("e", "Encoding of files/piped data.").alias("E", "engine").describe("E", "What regex engine to use:").choices("E", ["V8"]).default("E", "V8").boolean("L").describe("L", "Literal string search (no regex used when searching)").alias("L", "literal").boolean("\u20AC").describe("\u20AC", "Void having '\u20AC' as alias for '$' in pattern and replacement parameters").alias("\u20AC", "void-euro").boolean("\xA7").describe("\xA7", "Void having '\xA7' as alias for '\\' in pattern and replacement parameters").alias("\xA7", "void-section").boolean("A").alias("A", "void-async").describe("A", `Handle files in a synchronous flow. Good to limit memory usage when handling large files. `).boolean("H").describe("H", "Halt on first error").alias("H", "halt").alias("H", "bail").default("H", false).boolean("q").describe("q", "Only display errors (no other info)").alias("q", "quiet").boolean("Q").describe("Q", "Never display errors or info").alias("Q", "quiet-total").boolean("B").describe("B", "Avoid temporary backing up files. Works async (independent of -A flag) and will speed up things but at one point data lives only in memory, and you might lose data if the process is forced closed.").alias("B", "void-backup").boolean("b").describe("b", "Keep the backup file with the original content.").alias("b", "keep-backup").boolean("o").describe("o", "Output the final result instead of saving to file. Will output the full content even if no replacement has taken place.").alias("o", "output").boolean("m").describe("m", `Output each match on a new line. Will not replace any content but you still need to provide a dummy value (like \`_\`) as replacement parameter. If search pattern does not contain matching groups the full match will be outputted. If search pattern _does_ contain matching groups only matching groups will be outputted (same line with no delimiter). `).alias("m", "output-match").boolean("T").alias("T", "trim-pipe").describe("T", `Trim piped data before processing. If piped data only consists of chars that can be trimmed (new line, space, tabs...) it will become an empty string. `).boolean("R").alias("R", "replacement-pipe").describe("R", `Replacement is being piped in. You still need to provide a dummy value (like \`_\`) as replacement parameter.`).conflicts("R", "g").conflicts("R", "G").boolean("g").describe("g", "Filename/globs will be piped in. If filename/globs are provided in command (-X flags are ok) the execution will halt").alias("g", "glob-pipe").conflicts("g", "G").boolean("S").describe("S", "Simulate output without changing any files").alias("S", "simulate").string("x").describe("x", "Exclude files with a path that matches this regular expression. Will follow same regex flags and setup as the main search. Can be used multiple times.").alias("x", "exclude-re").string("X").describe("X", "Exclude files found with this glob. Can be used multiple times.").alias("X", "exclude-glob").boolean("V").describe("V", "More chatty output").alias("V", "verbose").boolean("d").describe("d", "Print debug info").alias("d", "debug").boolean("j").alias("j", "replacement-js").describe("j", `Treat replacement as javascript source code. 
			The statement from the last expression will become the replacement string. 
			Purposefully implemented the most insecure way possible to remove _any_ incentive to consider running code from an untrusted party. 
			The full match will be available as a javascript variable named $0 while each captured group will be available as $1, $2, $3, ... and so on. 
			At some point, the $ char _will_ give you a headache when used from the command line, so use \u20AC0, \u20AC1, \u20AC2, \u20AC3... instead. 
			If the javascript source code references to the full match or a captured group the code will run once per match. Otherwise, it will run once per file. 
			
			The code has access to the following variables: 
			\`r\` as an alias for \`require\` with both expanded to understand a relative path even if it is not starting with \`./\`, 
			\`fs\` from node, 
			\`path\` from node, 
			\`glob\` proxy name for the .sync function of fast-glob from npm, 
			\`pipe\`: the data piped into the command (null if no piped data), 
			\`find\`: pattern searched for (the needle), 
			\`text\`: full text being searched i.e. file content or piped data (the haystack), 
			\`bytes\`: total size of the haystack in bytes, 
			\`size\`: human-friendly representation of the total size of the haystack, 
			\`time\`: String representing the local time when the command was invoked,
			\`time_obj\`: date object representing \`time\`,
			\`now\`: alias for \`time\`,
			\`cwd\`: current process working dir, 
			\`nl\`: a new-line char,
			\`_\`: a single space char (for easy string concatenation).
			
			The following values defaults to \`\u274C\` if haystack does not originate from a file:
			\`file\`: contains the full path of the active file being searched (including full filename), 
			\`file_rel\`: contains \`file\` relative to current process working dir, 
			\`dirpath\`: contains the full path without filename of the active file being searched, 
			\`dirpath_rel\`: contains \`dirpath\` relative to current process working dir, 
			\`filename\`: is the full filename of the active file being searched without path, 
			\`name\`: filename of the active file being searched with no extension, 
			\`ext\`: extension of the filename including leading dot, 
			\`mtime\`: ISO inspired representation of the last local modification time of the current file, 
			\`ctime\`: ISO representation of the local creation time of the current file. 
			\`mtime_obj\`: date object representing \`mtime\`, 
			\`ctime_obj\`: date object representing \`ctime\`. 
			
			All variables, except from module, date objects, \`nl\` and \`_\`, has a corresponding variable name followed by \`_\` where the content has an extra space at the end (for easy concatenation). 
			`).help("h").describe("h", "Display help.").alias("h", "help").epilog(`Inspiration: .oO(What should 'sed' have been by now?)`).parseSync();
  let conf2 = {};
  Object.keys(argv).forEach((key) => {
    if (1 < key.length && key.indexOf("-") < 0) {
      conf2[key] = argv[key];
    }
  });
  conf2.showHelp = yargs_default.showHelp;
  conf2.needHelp = needHelp;
  conf2.pattern = pattern;
  conf2.replacement = replacement;
  conf2.includeGlob = argv._;
  conf2.excludeGlob = [...argv.excludeGlob].filter(Boolean);
  conf2.excludeRe = [...argv.excludeRe].filter(Boolean);
  if (!conf2.replacementJs) {
    conf2.replacement = unescapeString(conf2.replacement);
  }
  return conf2;
}
var unescapeString = function(str = "") {
  return new Function(`return '${str.replace(/'/g, "\\'")}'`)();
};
function executeReplacement(runtime2, conf2, pipeData = null) {
  if (0 < conf2.needHelp) {
    runtime2.exit(conf2.needHelp - 1);
  }
  if (pipeData === null)
    return engine(runtime2, conf2);
  if (conf2.trimPipe) {
    pipeData = pipeData.trim();
  }
  if (conf2.replacementPipe) {
    step("Replacement from pipe");
    if (pipeData === null) {
      return die("You asked the piped data to be used as replacement - but no data arrived.");
    }
    conf2.replacement = pipeData;
    if (conf2.replacementJs)
      conf2.pipeData = pipeData;
    return engine(runtime2, conf2);
  }
  if (conf2.globPipe) {
    step("globs from pipe");
    if (conf2.pipeData === null) {
      return die("You asked the piped data to be use as files/globs to include - but no data arrived.");
    }
    if (conf2.includeGlob.length) {
      return die("Please pipe file/globs to include OR provide them as as parameters. Not both.");
    }
    conf2.globs = pipeData.split(/\r?\n/).filter(Boolean);
    if (conf2.replacementJs)
      conf2.pipeData = pipeData;
    return engine(runtime2, conf2);
  }
  if (conf2.includeGlob.length) {
    return die("Data is being piped in, but no flag indicating what to use it for. If you want to do replacements in the pipe then avoid having files/globs in the parameters");
  }
  step("Content being piped");
  conf2.pipeData = pipeData;
  conf2.output = true;
  process.stdout.setDefaultEncoding(conf2.encoding);
  return engine(runtime2, conf2);
}

// src/env/bun.ts
var import_fs_extra = __toESM(require_lib(), 1);
var runtime2 = {
  fileReadSync: (path2, encoding = "utf8") => import_fs_extra.default.readFileSync(path2, { encoding }),
  fileReadAsync: async (path2, encoding = "utf8") => {
    const file = Bun.file(path2);
    return file.text();
  },
  fileWriteSync: async (path2, data, encoding = "utf8") => {
    await Bun.write(path2, data);
  },
  fileWriteAsync: (path2, data, encoding = "utf8") => {
    return Bun.write(path2, data);
  },
  fileDeleteSync: (path2) => import_fs_extra.default.unlinkSync(path2),
  fileDeleteAsync: (path2) => import_fs_extra.default.unlink(path2),
  fileCopySync: async (originalPath, destinationPath) => {
    const input = Bun.file(originalPath);
    const output3 = Bun.file(destinationPath);
    await Bun.write(output3, input);
  },
  fileCopyAsync: (originalPath, destinationPath) => {
    const input = Bun.file(originalPath);
    const output3 = Bun.file(destinationPath);
    return Bun.write(output3, input);
  },
  exit: process.exit
};
(() => {
  let conf2 = cli2conf(runtime2, process.argv.slice(2));
  if (Boolean(process.stdin.isTTY))
    return executeReplacement(runtime2, conf2);
  process.stdin.setEncoding(conf2.encoding);
  let pipeData = "";
  process.stdin.on("readable", () => {
    let chunk = process.stdin.read();
    if (chunk !== null) {
      pipeData += chunk;
      while (chunk = process.stdin.read()) {
        pipeData += chunk;
      }
    }
  });
  process.stdin.on("end", () => {
    return executeReplacement(runtime2, conf2, pipeData);
  });
})();
export {
  runtime2 as runtime
};
