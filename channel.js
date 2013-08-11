(function (window, undefined) {

    function Channel(options) {

        // Initialization
        // --------------

        var self = this,

            // Writes that have been queued up if there are no readers yet
            queuedWrites = [],

            // Callbacks associated through the read function
            callbacks = [],

            // Index of the currently processing callback for the most recent
            // write.  -1 means idle
            cbIndex = -1,

            // Arguments of our most recent write
            writeArgs = null,

            // Am I currently blocked?
            blocked = false,

            // Default options
            defaults = {};


        // Initialize options with default values
        options = typeof options === 'object' ? options : {};
        for (var key in defaults) {
            if (typeof options[key] === 'undefined' || options[key === null]) {
                options[key] = defaults[key];
            }
        }

        // Private functions
        // -----------------

        // Try to send the next queued up write onto the channel.  If we're blocked, does nothing
        function maybeSendQueuedWrites() {
            if (!blocked && queuedWrites.length > 0) {
                cbIndex = -1;
                writeArgs = queuedWrites.shift();
                doWrite.apply(this);
            }
        }

        // Write the current channel value onto the current reader.  Recurses on itself to process subsequent readers
        function doWrite() {

            if (++cbIndex >= callbacks.length || writeArgs === null) {
                // We're done writing to all callbacks
                cbIndex = -1;
                writeArgs = null;
                maybeSendQueuedWrites.apply(this);
                return;
            }

            // Run the current reader
            callbacks[cbIndex].apply(this, writeArgs);

            // If not blocked, recurse
            if (!blocked) {
                doWrite.apply(this);
            }
        }


        // Public functions
        // ----------------

        // Read a value from the channel and execute the indicated callback, *cb*.  The callback will be invoked with the Channel bound to the 'this' keyword.  Returns the Channel object for chaining.
        this.read = function read(cb) {
            callbacks.push(cb);
            maybeSendQueuedWrites.apply(this);
            return self;
        };

        // Remove a specified reader from the Channel.  Returns the Channel object for chaining.
        this.unread = function read(cb) {
            var i = -1, len = callbacks.length;
            while (++i < len) {
                if (callbacks[i] === cb) {
                    callbacks.splice(i, 1);
                    break;
                }
            }
            return self;
        };

        // Block the given channel from future reads/writes until unblocked.  Returns true if the channel was previously unblocked and is now blocked.  False otherwise.
        this.block = function block() {
            if (!blocked) {
                blocked = true;
                return true;
            }
            return false;
        };

        // Unblock the Channel.  Returns true if the channel was blocked and was successfully unblocked.  False otherwise.
        this.unblock = function unblock() {
            if (blocked) {
                blocked = false;
                doWrite.apply(this);
                return true;
            }
            return false;
        };

        // Write values to the channel.  The 'arguments' object from this function will be passed to each reader callback.  Returns the channel object for chaining.
        this.write = function write() {
            // Queue up the write if:
            // (1) there are no readers OR
            // (2) we already have writes queued up OR
            // (3) we're currently blocked OR
            // (4) we're in the middle of processing a previous write
            if (callbacks.length === 0 || queuedWrites.length > 0 || blocked || cbIndex >= 0) {
                queuedWrites.push(arguments);
            } else {
                // Write!
                writeArgs = arguments;
                doWrite.apply(this);
            }

            return self;
        };
    }

    // Static utility function to read from many channels with a single callback.  Accepts the callback function followed by one or more Channel objects to read from.
    Channel.alts = function (cb) {
        var args = Array.prototype.splice.call(arguments, 1),
            i = -1,
            len = args.length,
            c;

        // For each channel passed in, hook in our callback
        while (++i < len) {
            c = args[i];
            c.read(cb.bind(this, c));
        }
    };

    // Static utility function to read from one and only one of a series of Channels.  After the first available read, the reader callback is unbound from all channels so that it does not fire again.  Accepts the callback function followed by one or more Channel objects to read from.
    Channel.select = function (cb) {
        var args = Array.prototype.splice.call(arguments, 1),
            i = -1,
            len = args.length,
            c,
            wraps = [];

        // Get a wrapped function for this channel/callback combo.  The returned function is responsible for, on the first write from any of these channels, unbind itself and all of the other callbacks to prevent future reads, and then execute the indicated callback.
        function wrap(channel, callback) {
            return function wrapped(channel) {
                var j = -1, len = args.length;

                // Unbind this reader from all channels
                while (++j < len) {
                    args[j].unread(wraps[j]);
                }

                // Execute the callback in the appropriate Channel context
                return callback.apply(channel, arguments);
            }.bind(this, channel);
        }

        // For each channel passed in, cache the callback, and bind it
        while (++i < len) {
            c = args[i];
            wraps.push(wrap(c, cb));
            c.read(wraps[i]);
        }
    };

    window.Channel = Channel;

}(this));
