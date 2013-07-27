JsChannels
==========

A minimal JavaScript Channels library

### Example Usage:

    // Simple read/write
    var c = new Channel();
    c.read(function (val) { console.log("Read from Channel: " + value); });
    c.write(1);


    // Simple read/write, with extra data
    var c = new Channel();
    c.read(function (v1, v2, v3, v4, v5) {
        console.log("Read from Channel: " + arguments);
    });
    c.write(1, 2, 3, 4, 5);


    // If no readers are available, the write will wait in the channel until a
    // reader comes along
    var c = new Channel();
    function read(val) {
        console.log("Read from Channel: " + value);
    }
    c.write(value);
    setTimeout(function() { c.read(read); }, 1000);


    // Many readers will execute in order
    var c = new Channel();
    c.read(function (val) { console.log("Read from Channel: " + value); });
    c.read(function (val) { console.log("Read again from Channel: " + value); });
    c.write(1);


    // Many writers will execute in order
    var c = new Channel();
    c.read(function (val) { console.log("Read from Channel: " + value); });
    c.write(1);
    c.write(2);
    c.write(3);


    // Blocking channels accept Deferred return values from reader functions
    var c = new BlockingChannel();
    c.read(function (val) {
        console.log("Blocking reading on this channel for 1s");
        var d = new $.Deferred();
        setTimeout(d.resolve, 1000);
        return d;
    });
    c.read(function (val) {
        console.log("The last reader unclobked, my turn!");
    });
    c.write(1);
