**bufferjs** is a tiny BSD-licensed utility that makes it easy to parse [ArrayBuffer](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/ArrayBuffer) objects, especially when they have a [flatbuffers](https://google.github.io/flatbuffers/) layout.

### When it's useful

If you're a WebGL developer, you might find yourself requesting binary data from the server, and wanting to extract a typed array from it, along with some metadata:

```js
var xhr = new XMLHttpRequest();
xhr.open('GET', '/path/to/cooldata.bin', true);
xhr.responseType = 'arraybuffer';

xhr.onload = function(e) {
  var arraybuffer = this.response;
  // this is where I can use bufferjs!
};

xhr.send();
```

### Examples

Let's say the first two words in your binary chunk are little-endian 16-bit words, followed by a float.  Here's how you can extract 'em:

```js
var buf    = new Buffer(this.response),
    width  = buf.uint16(),
    height = buf.uint16();
    coolness = buf.float32();
```

Suppose the binary starts with a magic 4-byte identifier, followed by `uint32` count, followed by that many floats:

```js
var buf    = new Buffer(this.response),
    magic  = buf.uint32(),
    floats = buf.vector(Float32Array);
```

The `vector` method assumes that the data you're requesting is prefixed with a `uint32` length.

What if the encoded length value is actually a count of 3-tuples instead of scalars?  Easy:

```js
var coordinates  = buf.vector(Float32Array, 3);
```

How about length-prefixed strings?  Also easy:

```js
var firstName = buf.string(),
    lastName  = buf.string;
```

Strings must be encoded using 8-bit ASCII characters.  They have a length prefix _and_ a null-terminator.  If you need unicode support, you'll probably want to use a vector of 32-bit unsigned integers instead.  Or, you might consider using a more business-like protocol like JSON.  :)

### Structs

**bufferjs** lets you define simple POD structures:

```js

buf.registerStruct('Rocket', [
    'id', buf.uint32,
    'velocity', buf.float32,
    'weight', buf.float32
]);

var myRocket = buf.object('Rocket');
console.info(myRocket.id, myRocket.velocity);

```

Note that the second argument to `registerStruct` is a flat list of string-function pairs; it is not an object literal.

You can also parse a size-prefixed array of structs:

```js
var rockets  = buf.vector('Rocket');
```

Structs can also be nested:

```js

buf.registerStruct('Rocket', [
    'velocity', buf.float32,
    'engine', buf.object.bind(buf, 'Engine']
]);

```

Structs cannot contain vectors or strings, which brings us to...

### Tables

The `object` method an be used to parse both `struct` types and `table` types.  Tables are registered the same way that structs are, but they're encoded a bit differently:

```js

buf.registerTable('Rocket', [
    'id', buf.uint32,
    'engines', buf.vector.bind(buf, 'Engine')
    'data', buf.vector.bind(buffer, Uint16Array, 3),
]);

var myRocket = buf.object('Rocket');

```

Unlike structs, tables can have strings and vectors in them.  See the [flatbuffers](https://google.github.io/flatbuffers/) for more information about how they're laid out in memory.
