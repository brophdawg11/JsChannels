JsChannels
==========

A minimal JavaScript Channels library (1.3k minified)

A Channel provides two methods:
* read(callback)
* write(value1, value2, ...)

When a channel is written to, all associated reader callbacks will be invoked,
in order of registration, with the values written to the channel.

If a no readers are available at the time of a write, the write (and subsequent
writes) will be queued on the Channel until the first reader is registered.

BlockingChannels allow the readers to perform asyncronous operations, delaying
subsequent reader invocation.  Reader callbacks attached to blocking channels can
return a Channel object and must call write() on that Channel once the reader
async operations are complete, which iwll allow continued execution of subsequent
readers.

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


    // Blocking channels accept Deferred return values from reader functions
    var c6 = new BlockingChannel();
    c6.read(function (val) {
        console.log("Blocking reading on this channel6 for 1s");
        var c = new Channel();
        setTimeout(c.write, 1000);
        return c;
    });
    c6.read(function (val) {
        console.log("The last reader on channel 6 unblocked, my turn!");
    });
    c6.write(1);
