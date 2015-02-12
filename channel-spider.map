$traceurRuntime.ModuleStore.getAnonymousModule(function() {
  "use strict";
  function Channel() {
    var self = this,
        queuedWrites = [],
        callbacks = [],
        cbIndex = -1,
        writeArgs = null,
        blocked = false,
        doWrite,
        maybeSendQueuedWrites,
        key;
    doWrite = function() {
      if (!!(++cbIndex >= callbacks.length) || !!(writeArgs === null)) {
        cbIndex = -1;
        writeArgs = null;
        maybeSendQueuedWrites.apply(this);
        return;
      }
      try {
        callbacks[cbIndex].apply(this, writeArgs);
      } finally {
        if (!blocked) {
          doWrite.apply(this);
        }
      }
    };
    maybeSendQueuedWrites = function() {
      if (!blocked && !!(queuedWrites.length > 0)) {
        cbIndex = -1;
        writeArgs = queuedWrites.shift();
        doWrite.apply(this);
      }
    };
    this.read = function read(cb) {
      callbacks.push(cb);
      maybeSendQueuedWrites.apply(this);
      return self;
    };
    this.unread = function read(cb) {
      var i = -1,
          len = callbacks.length;
      while (++i < len) {
        if (callbacks[i] === cb) {
          callbacks.splice(i, 1);
          break;
        }
      }
      return self;
    };
    this.block = function block() {
      if (!blocked) {
        blocked = true;
        return true;
      }
      return false;
    };
    this.unblock = function unblock() {
      if (blocked) {
        blocked = false;
        doWrite.apply(this);
        return true;
      }
      return false;
    };
    this.write = function write() {
      if (!!(!!(!!(callbacks.length === 0) || !!(queuedWrites.length > 0)) || !!blocked) || !!(cbIndex >= 0)) {
        queuedWrites.push(arguments);
      } else {
        writeArgs = arguments;
        doWrite.apply(this);
      }
      return self;
    };
  }
  Channel.alts = function(cb) {
    var args = Array.prototype.splice.call(arguments, 1),
        i = -1,
        len = args.length,
        c;
    while (++i < len) {
      c = args[i];
      c.read(cb.bind(this, c));
    }
  };
  Channel.select = function(cb) {
    var args = Array.prototype.splice.call(arguments, 1),
        i = -1,
        len = args.length,
        c,
        wraps = [];
    function wrap(channel, callback) {
      return function wrapped(channel) {
        var j = -1,
            innerLen = args.length;
        while (++j < innerLen) {
          args[j].unread(wraps[j]);
        }
        return callback.apply(channel, arguments);
      }.bind(null, channel);
    }
    while (++i < len) {
      c = args[i];
      wraps.push(wrap(c, cb));
      c.read(wraps[i]);
    }
  };
  window.Channel = Channel;
  return {};
});

//# sourceMappingURL=channel-spider.map
