**flatbin** is a tiny BSD-licensed utility that makes it easy to parse [ArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer) objects, especially when they have a [flatbuffers](https://google.github.io/flatbuffers/) layout.

### Rationale

If you're a WebGL developer, you often want to request binary data from the server, and extract some typed arrays from it, along with some metadata:

```js
var xhr = new XMLHttpRequest();
xhr.open('GET', '/path/to/graphics_data.bin', true);
xhr.responseType = 'arraybuffer';

xhr.onload = function(e) {
    var arraybuffer = this.response;
    // Hey, this is where I can use flatbin!
};

xhr.send();
```

### Examples

Let's say the first two words in your binary chunk are little-endian 16-bit words, followed by a float.  Here's how you can extract 'em:

```js
var reader = new FLATBIN.Reader(this.response),
    width  = reader.uint16(),
    height = reader.uint16();
    coolness = reader.float32();
```

Suppose the binary starts with a magic 4-byte identifier, followed by `uint32` count, followed by that many floats.  You want those floats in a typed array that you can pass straight to WebGL.  Easy:

```js
var reader = new FLATBIN.Reader(this.response),
    magic  = reader.uint32(),
    floats = reader.vector(Float32Array);
```

The `vector` method assumes you're requesting a swath of data that has been prefixed with a `uint32` length.

By the way, that was a zero-copy operation!  The backing store of the returned typed array is the array buffer that was used to construct `Buffer`.

What if the encoded length value is actually a count of 3-tuples instead of scalars?  Easy:

```js
var coordinates  = reader.vector(Float32Array, 3);
```

How about length-prefixed strings?  Also easy:

```js
var firstName = reader.string(),
    lastName  = reader.string();
```

Strings must be encoded using 8-bit ASCII characters.  They have a length prefix _and_ a null-terminator.  If you need unicode support, you'll probably want to use a vector of 32-bit unsigned integers instead.  Or, you might consider using a more business-like protocol like JSON.  :)

### Structs

**binjs** lets you define simple POD structures:

```js
// Declare a struct type.
reader.registerStruct('Rocket', [
    'id', reader.uint32,
    'velocity', reader.float32,
    'weight', reader.float32
]);

// Extract an instance of the struct.
var myRocket = reader.object('Rocket');
console.info(myRocket.id, myRocket.velocity);

```

The second argument to `registerStruct` is a flat list of string-function pairs, not an object literal.  We want it to be clear that order is significant.

You can also extract a size-prefixed array of structs:

```js
var rockets  = reader.vector('Rocket');
```

Structs can be nested:

```js

reader.registerStruct('Rocket', [
    'velocity', reader.float32,
    'engine', reader.object.bind(reader, 'Engine']
]);

```

Structs cannot contain vectors or strings, which brings us to...

### Tables

The `object` method an be used to parse both `struct` types and `table` types.  Tables are registered in a similar way, but they're encoded a bit differently:

```js

reader.registerTable('Rocket', [
    'id', reader.uint32,
    'engines', reader.vector.bind(reader, 'Engine')
    'data', reader.vector.bind(buffer, Uint16Array, 3),
]);

var myRocket = reader.object('Rocket');
consle.info(myRocket.engines);

```

See the [flatbuffers](https://google.github.io/flatbuffers/) for more information about how tables are laid out in memory.
