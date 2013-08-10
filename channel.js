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


        // Try to send the next queued up write onto the channel.  If we're
        // blocked, does nothing
        function maybeSendQueuedWrites() {
            // If we had queuedWrites, now that we have a reader, write them
            if (!blocked && queuedWrites.length > 0) {
                cbIndex = -1;
                writeArgs = queuedWrites.shift();
                doWrite.apply(this);
            }
        }

        // Write the current channel value onto the current reader.  Recurses
        // on itself to process subsequent readers
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
         * @return {Channel}    The Channel for chaining
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
            if (callbacks.length === 0 || queuedWrites.length > 0 || blocked || cbIndex >= 0) {
                // Queue up the write if:
                // there are no readers OR
                // we already have writes queued up OR
                // we're currently blocked OR
                // we're in the middle of processing a previous write
                queuedWrites.push(arguments);
            } else {
                // Write!
                writeArgs = arguments;
                doWrite.apply(this);
            }

            return self;
        };
    }

    /**
     * Utility function to read from many channels with a single callback
     * @param {Function} cb Callback function to be executed when any of the
     *                      specified channels is written to.  Will be passed
     *                      the Channel, followed by all written values
     * @param {Channel}  channel The Channel to read from.  Pass as many as you
     *                           want, comma separated
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
            c.read(cb.bind(this, c));
        }
    };

    /**
     * Utility function to read from one and only one of a series of Channels.
     * After the first available read, the reader callback is unbound from all
     * channels so that it does not fire again.
     *
     * @param {Function} cb Callback function to be executed when the first of the
     *                      specified channels is written to.  Will be passed
     *                      the Channel, followed by all written values
     * @param {Channel}  channel The Channel to read from.  Pass as many as you
     *                           want, comma separated
     */
    Channel.select = function (cb) {
        // Shift off the callback from the arguments array
        var args = Array.prototype.splice.call(arguments, 1),
            i = -1,
            len = args.length,
            c,
            wraps = [];

        // Get a wrapped function for this channel/callback combo
        function wrap(channel, callback) {
            return function wrapped(channel) {
                var j = -1,
                    len = args.length;
                console.log("J is " + j);

                // Unbind this reader from all channels
                while (++j < len) {
                    args[j].unread(wraps[j]);
                }

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
