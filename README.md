JsChannels
==========

A minimal JavaScript Channels library (1.3k minified)

A Channel provides the following methods
* write(value1, value2, ...) - Write the values[s] to the Channel
* read(callback) - Assign a reader to the Channel
* unread(callback) - Remove a reader from the Channel
* block() - Block the Channel
* unblock() - Unblock the Channel

The Channel class provides two static utility methods:
* Channel.alts(callback, Channel, Channel, ...) - Associated a callback with many channels. Callbacks passed to alts will receive the Channel object as the first argument, followed by the arguments passed to Channel.write()
* Channel.select(callback, Channel, Channel, ...) - Associated a callback with many channels, for which the reader will execute on the first Channel to be wrtten to, an no others.  Callbacks passed to alts will receive the Channel object as the first argument, followed by the arguments passed to Channel.write()

When a channel is written to, all associated reader callbacks will be invoked,
in order of registration, with the values written to the channel.

If a no readers are available at the time of a write, the write (and subsequent
writes) will be queued on the Channel until the first reader is registered.

Reader callbacks are executed with the Channel object as the 'this' context

### Example Usage:

    // Simple read/write
    var c1 = new Channel();
    c1.read(function (val) { console.log("Read from Channel1: " + val); });
    c1.write(1);


    // Simple read/write, with extra data
    var c2 = new Channel();
    c2.read(function (v1, v2, v3, v4, v5) {
        console.log("Read from Channel2: " + arguments);
    });
    c2.write(1, 2, 3, 4, 5);


    // If no readers are available, the write will wait in the channel until a
    // reader comes along
    var c3 = new Channel();
    function read(val) {
        console.log("Read from Channel3: " + val);
    }
    c3.write(1);
    setTimeout(function() { c3.read(read); }, 1000);


    // Many readers will execute in order
    var c4 = new Channel();
    c4.read(function (val) { console.log("Read from Channel4: " + val); });
    c4.read(function (val) { console.log("Read again from Channel4: " + val); });
    c4.write(1);


    // Many writers will execute in order
    var c5 = new Channel();
    c5.read(function (val) { console.log("Read from Channel5: " + val); });
    c5.write(1);
    c5.write(2);
    c5.write(3);


    // Readers can block the channel if needed
    var c6 = new Channel();
    c6.read(function (val) {
        console.log("Blocking reading on this channel6 for 1s");
        this.block();
        setTimeout(this.unblock, 1000);
    });
    c6.read(function (val) {
        console.log("The last reader on channel 6 unblocked, my turn!");
    });
    c6.write(1);

    // Writers can block the channel if needed
    var c7 = new Channel();
    c7.read(function (val) { console.log("Read from Channel7: " + val); });
    c7.write(1);
    c7.block();
    c7.write(2);
    setTimeout(c7.unblock, 1000);

