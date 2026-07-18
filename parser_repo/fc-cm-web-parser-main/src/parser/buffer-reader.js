export class BufferReader {
    static bigSizeBytes(num) {
        if (num < 0xfdn) return 1;
        if (num < 0x10000n) return 3;
        if (num < 0x100000000n) return 5;
        return 9;
    }

    constructor(arrayBuffer) {
        this._buffer = arrayBuffer;
        this._view = new DataView(arrayBuffer.buffer.slice(
            arrayBuffer.byteOffset,
            arrayBuffer.byteOffset + arrayBuffer.byteLength
        ));
        this._position = 0;
        this._lastReadBytes = 0;
    }

    get position() { return this._position; }
    set position(val) { this._position = val; }
    get eof() { return this._position >= this._buffer.length; }
    get buffer() { return this._buffer; }
    get lastReadBytes() { return this._lastReadBytes; }

    readUInt8() { return this._readNumber(1, 'getUint8'); }
    readUInt16LE() { return this._readNumber(2, 'getUint16', true); }
    readUInt16BE() { return this._readNumber(2, 'getUint16', false); }
    readUInt32LE() { return this._readNumber(4, 'getUint32', true); }
    readUInt32BE() { return this._readNumber(4, 'getUint32', false); }
    readUInt64BE() { return this._readBigInt(8, false); }
    readUInt64LE() { return this._readBigInt(8, true); }
    readUIntLE(len) { return this._readNumber(len, 'getUint' + (len * 8), true); }
    readUIntBE(len) { return this._readNumber(len, 'getUint' + (len * 8), false); }

    readVarUint() {
        const size = this.readUInt8();
        if (size < 0xfd) return BigInt(size);
        if (size === 0xfd) return BigInt(this.readUInt16LE());
        if (size === 0xfe) return BigInt(this.readUInt32LE());
        return this.readUInt64LE();
    }

    readBigSize() {
        const size = this.readUInt8();
        if (size < 0xfd) return BigInt(size);
        if (size === 0xfd) return BigInt(this.readUInt16BE());
        if (size === 0xfe) return BigInt(this.readUInt32BE());
        return this.readUInt64BE();
    }

    readBytes(len) {
        const slice = this._buffer.slice(this._position, this._position + len);
        this._position += len;
        this._lastReadBytes = len;
        return slice;
    }

    peakBytes(len) {
        return this._buffer.slice(this._position, this._position + len);
    }

    readTUInt16() { return this._readTUInt(2); }
    readTUInt32() { return this._readTUInt(4); }
    readTUInt64() { return this._readTUInt(8, true); }

    _readNumber(len, method, littleEndian = false) {
        const result = this._view[method](this._position, littleEndian);
        this._position += len;
        this._lastReadBytes = len;
        return result;
    }

    _readBigInt(len, littleEndian = false) {
        let hex = Array.from(this.readBytes(len)).map(b => b.toString(16).padStart(2, '0')).join('');
        if (littleEndian) hex = hex.match(/../g).reverse().join('');
        return BigInt('0x' + hex);
    }

    _readTUInt(maxLen, isBigInt = false) {
        const size = Math.min(maxLen, this._buffer.length - this._position);
        if (size === 0) return isBigInt ? 0n : 0;
        return isBigInt ? this._readBigInt(size, false) : this._readNumber(size, 'getUint' + (size * 8), false);
    }
}
