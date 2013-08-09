(function (window, undefined) {

    function Channel(options) {

        var self = this,

            // Writes that have been queued up if there are no readers yet
            queuedWrites = [],

            // The callbacks associated through the read function
            callbacks = [],

            // What indexed callback are we on?  -1 -> idle
            cbIndex = -1,

            // What are the arguments of our most recent write?
            writeArgs = null,

            // Am I currently blocked?
            blocked = false,

            // Default options
            defaults = {},

            key;


        // Initialize options with default values
        options = typeof options === 'object' ? options : {};
        for (key in defaults) {
            if (typeof options[key] === 'undefined' || options[key === null]) {
                options[key] = defaults[key];
            }
        }


        function maybeSendQueuedWrites() {
            // If we had queuedWrites, now that we have a reader, write them
            if (!blocked && queuedWrites.length > 0) {
                cbIndex = -1;
                writeArgs = queuedWrites.shift();
                doWrite.apply(this);
            }
        }

        function doWrite() {

            if (cbIndex + 1 >= callbacks.length || writeArgs === null) {
                // We're done writing to all callbacks
                cbIndex = -1;
                writeArgs = null;
                maybeSendQueuedWrites.apply(this);
                return;
            }

            // Run the current reader
            callbacks[cbIndex + 1].apply(this, writeArgs);
            cbIndex++;

            // If not blocked, recurse
            if (!blocked) {
                doWrite.apply(this);
            }
        }

        /**
         * Read a value from the channel and execute the associated callback.
         * @param  {Function} cb The callback to be invoked with the value read
         *                       from the channel
         * @return {Channel}     The channel object, for chaining purposes
         */
        this.read = function read(cb) {
            // Add this callback to the queue
            callbacks.push(cb);
            maybeSendQueuedWrites.apply(this);
            return self;
        };

        /**
         * Remove a specified reader from the Channel
         * @param  {Function} cb The reader to remove
         * @return {Channe;l}    The Channel for chaining
         */
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

        /**
         * Block the given channel from future reads/writes until unblocked.
         * @return {Booean} True if the channel was unblocked and successfully blocked
         *                  False if the channel was already blocked.
         */
        this.block = function block() {
            if (!blocked) {
                blocked = true;
                return true;
            }
            return false;
        };

        /**
         * Unblock the Channel
         * @return {Boolean} True if the channel was blocked and was
         * successfully unblocked.  False if it was already unblocked
         */
        this.unblock = function unblock() {
            if (blocked) {
                blocked = false;
                doWrite.apply(this);
                return true;
            }
            return false;
        };

        /**
         * Write a value to the channel.
         * @param  {Object} val The value to write to the channel
         * @return {Channel}    The channel object, for chaining purposes
         */
        this.write = function write() {
            if (callbacks.length === 0 || queuedWrites.length > 0 || blocked) {
                // There are no readers yet, queue this up
                queuedWrites.push(arguments);
            } else {
                // Write!
                writeArgs = arguments;
                doWrite.apply(this);
            }

            return self;
        };
    }

    // Local partial implementation
    function partial() {
        var pArgs = Array.prototype.slice.call(arguments, 0),
            func = pArgs.shift();
        return function() {
            var innerArgs = Array.prototype.slice.call(arguments, 0);
            return func.apply(this, pArgs.concat(innerArgs));
        };
    }

    /**
     * Provide a mechanism to read from many channels with a single callback
     * @param {Function} cb Callback function to be executed when any of the
     *                      specified channels is written to.  Will be passed
     *                      the Channel, followed by all written values
     * @param {Channel}  channel The Channel to read from.  Pass as many as you want
     */
    Channel.alts = function (cb) {
        // Shift off the callback from the arguments array
        var args = Array.prototype.splice.call(arguments, 1),
            i = -1,
            len = args.length,
            c;

        // For each channel passed in, hook in our callback
        while (++i < len) {
            c = args[i];
            c.read(partial(cb, c));
        }
    };

    /**
     * Provide a mechanism to read from one of a series of callbacks.  After the
     * read, the callback is unbound from all channels so that it does not fire
     * again.
     *
     * @param {Function} cb Callback function to be executed when the first of the
     *                      specified channels is written to.  Will be passed
     *                      the Channel, followed by all written values
     * @param {Channel}  channel The Channel to read from.  Pass as many as you want
     */
    Channel.select = function (cb) {
        // Shift off the callback from the arguments array
        var args = Array.prototype.splice.call(arguments, 1),
            i = -1,
            len = args.length,
            c,
            wraps = [];

        // Get a wrapped function for this channel/callback combo
        function wrap (channel, callback) {
            return partial(function wrapped(channel) {
                var j = -1,
                    len = args.length;
                console.log("J is " + j);

                // Unbind this reader from all channels
                while (++j < len) {
                    args[j].unread(wraps[j]);
                }

                return callback.apply(channel, arguments);
            }, channel);
        }

        // For each channel passed in, cache the callback, and bind it
        while (++i < len) {
            c = args[i];
            wraps.push(wrap(c,cb));
            c.read(wraps[i]);
        }
    };

    window.Channel = Channel;

}(this));
