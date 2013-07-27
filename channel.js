(function (window, $, undefined) {

    function Channel(options) {

        var self = this,

            // The deferred object for the channel.  This is reinitialized every
            // time a read() operation is executed, and we rebind the callback to
            // the new deferred.
            channelDeferred,

            // Writes that have been queued up if there are no readers yet
            queuedWrites = [],

            // The callbacks associated through the read function
            callbacks = [],

            // The deferreds associated with the calbacks in a blocking Channel
            deferreds = [],

            // Default options
            defaults = {
                'blocking' : false
            },

            key;


        // Initialize options with default values
        options = typeof options === 'object' ? options : {};
        for (key in defaults) {
            if (typeof options[key] === 'undefined' || options[key === null]) {
                options[key] = defaults[key];
            }
        }

        // Proxy the users callback function to ensure that it returns a
        // suitable value to pass to $.when() (i.e., a Deferred or true)
        function getHandleReturnFunc(func, dfd) {
            return function() {
                var retVal = func.apply(this, arguments);
                if(retVal && typeof retVal.read === 'function') {
                    retVal.read(dfd.resolve);
                    return dfd;
                } else {
                    return dfd.resolve();  // Force immediate resolution of $.when
                }
            };
        }

        // Initialize our channelDeferred object.  This is called with every
        // read call to add in the new callback.  It is called with every write
        // call to ensure we recycle the channlDeferred so that old read callbacks
        // get bound to the new, unresolved channelDeferred
        function maybeInitializeDfd(force) {
            force = force === true ? true : false;
            if (!channelDeferred || channelDeferred.state() !== "pending" || force) {
                channelDeferred = new $.Deferred();
                var i, len, cbDfd;

                if(!options.blocking) {
                    // Handle non blocking channels.
                    // Bind all callabcks directly to the deferred, not to the
                    // returned promises.  This causes the same value from the
                    // inital write to get passed to every read, without our
                    // interaction.  This means, also, that return values from
                    // callbacks have no impact on execution
                    i = -1;
                    len = callbacks.length;
                    while (++i < len) {
                        channelDeferred.then(callbacks[i]);
                    }
                } else {
                    // For Blocking Channels, bind callbacks to the returned
                    // promises.  This means that you can return a deferred if
                    // you want your read to block.  However, we need to ensure
                    // the right value gets passed through, we dont want
                    // channels chaining return values through

                    // If we are re-initializing, we need to reject any previous
                    // deferreds that may still resolve.  We'll immediately rebind
                    // to them, based on the Channel deferred
                    i = -1;
                    len = deferreds.length;
                    while (++i < len) {
                        deferreds[i].reject("Invalidating and replacing with a new deferred.");
                    }

                    deferreds = [];

                    i = -1;
                    len = callbacks.length;
                    while (++i < len) {
                        // Create a deferred to indicate when this callback is done
                        cbDfd = new $.Deferred();

                        // Get a promise that resolves once the Channel deferred
                        // and all prior callback deferreds resolve
                        $.when.apply(this, [channelDeferred].concat(deferreds))
                              // Then run my callback.  If it returns a Channel,
                              // well resolve our deferred on a read from that
                              // channel.  If not, we'll resolve the deferred
                              // immediately
                              .then(getHandleReturnFunc(callbacks[i], cbDfd));

                        // Add my deferred to our queue
                        deferreds.push(cbDfd);
                    }
                }
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

            // Possibly reset our deferred if non-existant or already resolved
            // This will re-bind all existing callbacks to the new cb if needed
            maybeInitializeDfd(true);

            // If we had queuedWrites, now that we have a reader, write them
            while (queuedWrites.length > 0) {
                self.write.apply(self, queuedWrites.shift());
            }

            return self;
        };

        /**
         * Write a value to the channel.
         * @param  {Object} val The value to write to the channel
         * @return {Channel}    The channel object, for chaining purposes
         */
        this.write = function write() {
            if (callbacks.length === 0) {
                // There are no readers yet, queue this up
                queuedWrites.push(arguments);
            } else {
                // Possibly reset our deferred if non-existant or already resolved
                // This will re-bind all existing callbacks to the new cb if needed
                maybeInitializeDfd();

                // Resolve the deferred with the channel value
                channelDeferred.resolve.apply(this, arguments);
            }

            return self;
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

        // Local partial implementation
        function partial() {
            var pArgs = Array.prototype.slice.call(arguments, 0),
                func = pArgs.shift();
            return function() {
                var innerArgs = Array.prototype.slice.call(arguments, 0);
                return func.apply(this, pArgs.concat(innerArgs));
            };
        }

        // For each channel passed in, hook in our readValue function
        while (++i < len) {
            c = args[i];
            c.read(partial(cb, c));
        }
    };

    window.BlockingChannel = function BlockingChannel(options) {
        options = typeof options === 'object' ? options : {};
        options.blocking = true;
        Channel.call(this, options);
    };

    window.Channel = Channel;

}(this, jQuery));
