
if (this.goog) {
    goog.provide('Buffer');
}

var Buffer = (function() {

    'use strict';

    /**
     * Makes it easy to parse a FlatBuffers buffer, or any buffer, really.
     *
     * @constructor
     * @struct
     * @param {!ArrayBuffer} buffer
     */
    var Buffer = function(buffer) {

         /** @type {number} */
        this.pointer = 0;

        /**
         * @const
         * @type {!DataView}
         */
        this.dataview = new DataView(buffer);

        /**
         * Maps from a table name to a list of string-function pairs.
         *
         * @const
         * @type {!Object.<string,!Array>}
         */
        this.tables = {};

        /**
         * Maps from a vtable pointer to a list of offsets.
         *
         * @const
         * @type {!Object.<number,!Array>}
         */
        this.vtables = {};

        /**
         * Maps from a struct name to a list of string-function pairs.
         *
         * @const
         * @type {!Object.<string,!Array>}
         */
        this.structs = {};

        /** @type {boolean} */
        this.lendian = true;
    };


    /**
     * Read an instance of a struct or a table.
     *
     * @param {string} expectedType
     * @return {Object}
     */
    Buffer.prototype.object = function(expectedType) {

        var ptr = this.pointer,
            table = this.tables[expectedType],
            struct = this.structs[expectedType],
            obj = {},
            i,
            name,
            func;

        if (table) {
            this.pointer = ptr + this.uint32();
            var obj_ptr = this.pointer;
            var vtab = this.vtable(obj_ptr - this.int32());
            for (i = 0; i < vtab.length - 1; i++) {
                var offset = vtab[i + 1];
                if (table[i]) {
                    name = table[i].name;
                    func = table[i].func;
                    this.pointer = obj_ptr + offset;
                    obj[name] = func();
                }
            }
            this.pointer = ptr + 4;
            return obj;
        }

        if (struct) {
            for (i = 0; i < struct.length; i++) {
                name = struct[i].name;
                func = struct[i].func;
                obj[name] = func();
            }
            return obj;
        }

        return null;
    };


    /**
     * Read a vector of structs, tables, or scalars.
     * Can return a native JavaScript array, or a typed array.
     *
     * @param {(string|Function)} expectedType
     * @param {number=} dim optional dimensionality for typed arrays
     * @return {Object}
     */
    Buffer.prototype.vector = function(expectedType, dim) {

        var original = this.pointer;

        this.pointer = original + this.uint32();

        var count = this.uint32();

        // If we're given a typed array constructor, return a typed array.
        if (expectedType.BYTES_PER_ELEMENT) {
            var TypedArray = /** @type {Function} */ (expectedType);
            var nscalars = (dim || 1) * count;
            var arraybuffer = this.dataview.buffer;
            var tarray = new TypedArray(arraybuffer, this.pointer, nscalars);
            this.pointer = original + 4;
            return tarray;
        }

        var val = [];

        // If we're given a type string, parse each item as a table or struct.
        if (expectedType.length) {
            var str = /** @type {string} */ (expectedType);
            while (count--) {
                val.push(this.object(str));
            }
            this.pointer = original + 4;
            return val;
        }

        // If we're given a function, call it to parse each item.
        var func = /** @type {Function} */ (expectedType);
        while (count--) {
            val.push(func());
        }
        this.pointer = original + 4;
        return val;
    };


    /**
     * Called internally to parse (and cache) a table of offsets.
     *
     * @param {number} ptr
     * @return {Object}
     */
    Buffer.prototype.vtable = function(ptr) {
        var vtable = this.vtables[ptr];
        if (!vtable) {
            vtable = this.vtables[ptr] = [];
            var previous = this.pointer;
            this.pointer = ptr;
            var remaining = this.uint16();
            remaining -= 2;
            while (remaining > 0) {
                vtable.push(this.uint16());
                remaining -= 2;
            }
            this.pointer = previous;
        }
        return vtable;
    };


    /**
     * Register a table type with the parser.
     *
     * @param {string} name
     * @param {Array} fields ordered list of string-function pairs
     */
    Buffer.prototype.registerTable = function(name, fields) {
        var table = this.tables[name] = [];
        for (var i = 0; i < fields.length; i += 2) {
            table.push({
                name: fields[i],
                func: fields[i+1].bind(this)
            });
        }
    };


    /**
     * Register a struct type with the parser.
     *
     * @param {string} name
     * @param {Array} fields ordered list of string-function pairs
     */
    Buffer.prototype.registerStruct = function(name, fields) {
        var table = this.structs[name] = [];
        for (var i = 0; i < fields.length; i += 2) {
            table.push({
                name: fields[i],
                func: fields[i+1].bind(this)
            });
        }
    };


    /** @return {string} */
    Buffer.prototype.string = function() {
        var original = this.pointer;
        this.pointer = original + this.uint32();
        var nchars = this.uint32();
        var chars = new Uint8Array(this.dataview.buffer, this.pointer, nchars);
        this.pointer = original + 4;
        return String.fromCharCode.apply(null, chars);
    };


    /** @return {number} */
    Buffer.prototype.uint32 = function() {
        var val = this.dataview.getUint32(this.pointer, this.lendian);
        this.pointer += 4;
        return val;
    };


    /** @return {number} */
    Buffer.prototype.uint16 = function() {
        var val = this.dataview.getUint16(this.pointer, this.lendian);
        this.pointer += 2;
        return val;
    };


    /** @return {number} */
    Buffer.prototype.uint8 = function() {
        var val = this.dataview.getUint8(this.pointer);
        this.pointer += 1;
        return val;
    };


    /** @return {number} */
    Buffer.prototype.int32 = function() {
        var val = this.dataview.getInt32(this.pointer, this.lendian);
        this.pointer += 4;
        return val;
    };


    /** @return {number} */
    Buffer.prototype.int16 = function() {
        var val = this.dataview.getInt16(this.pointer, this.lendian);
        this.pointer += 2;
        return val;
    };


    /** @return {number} */
    Buffer.prototype.int8 = function() {
        var val = this.dataview.getInt8(this.pointer);
        this.pointer += 1;
        return val;
    };


    /** @return {number} */
    Buffer.prototype.float32 = function() {
        var val = this.dataview.getFloat32(this.pointer, this.lendian);
        this.pointer += 4;
        return val;
    };


    /** @return {number} */
    Buffer.prototype.float64 = function() {
        var val = this.dataview.getFloat64(this.pointer, this.lendian);
        this.pointer += 8;
        return val;
    };

    return Buffer;

})();
