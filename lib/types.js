'use strict';

var struct = require('varstruct');

var Int64LE = struct.Int64LE;

var _require = require('./varint.js'),
    VarInt = _require.VarInt,
    UVarInt = _require.UVarInt;

var VarString = struct.VarString(UVarInt);
var VarBuffer = struct.VarBuffer(UVarInt);
var VarHexBuffer = {
  decode: function decode() {
    throw Error('Decode not implemented');
  },
  encode: function encode(value, buffer, offset) {
    value = Buffer.from(value, 'hex');
    var bytes = VarBuffer.encode(value, buffer, offset);
    VarHexBuffer.encode.bytes = VarBuffer.encode.bytes;
    return bytes;
  },
  encodingLength: function encodingLength(value) {
    var length = value.length / 2;
    return length + UVarInt.encodingLength(length);
  }
};
var Time = {
  encode: function encode(value) {
    if (value[value.length - 1] !== 'Z') {
      throw Error('Timestamp must be UTC timezone');
    }

    var millis = new Date(value).getTime();
    var seconds = Math.floor(millis / 1000); // ghetto, we're pulling the nanoseconds from the string

    var withoutZone = value.slice(0, -1);
    var nanosStr = withoutZone.split('.')[1] || '';
    var nanos = Number(nanosStr.padEnd(9, '0'));
    var buffer = Buffer.alloc(14);
    buffer[0] = 1 << 3 | 1; // field 1, typ3 1

    buffer.writeUInt32LE(seconds, 1);
    buffer[9] = 2 << 3 | 5; // field 2, typ3 5

    buffer.writeUInt32LE(nanos, 10);
    return buffer;
  }
};
var BlockID = {
  empty: Buffer.from('1200', 'hex'),
  encode: function encode(value) {
    // empty block id
    if (!value.hash) {
      return BlockID.empty;
    }

    var buffer = Buffer.alloc(48); // TODO: actually do amino encoding stuff
    // hash field

    buffer[0] = 0x0a;
    buffer[1] = 0x14; // length of hash (20)

    Buffer.from(value.hash, 'hex').copy(buffer, 2); // block parts

    buffer[22] = 0x12;
    buffer[23] = 0x18;
    buffer[24] = 0x08;
    buffer[25] = 0x02;
    buffer[26] = 0x12;
    buffer[27] = 0x14;
    Buffer.from(value.parts.hash, 'hex').copy(buffer, 28);
    return buffer;
  }
};
var TreeHashInput = struct([{
  name: 'left',
  type: VarBuffer
}, {
  name: 'right',
  type: VarBuffer
}]);
var pubkeyAminoPrefix = Buffer.from('1624DE6420', 'hex');
var PubKey = {
  decode: function decode(buffer) {
    var start = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    var end = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : buffer.length;
    throw Error('Decode not implemented');
  },
  encode: function encode(pub, buffer) {
    var offset = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 0;
    var length = PubKey.encodingLength(pub);
    buffer = buffer || Buffer.alloc(length);

    if (pub == null) {
      buffer[offset] = 0;
    } else {
      pubkeyAminoPrefix.copy(buffer, offset);
      Buffer.from(pub.value, 'base64').copy(buffer, offset + pubkeyAminoPrefix.length);
    }

    PubKey.encode.bytes = length;
    return buffer;
  },
  encodingLength: function encodingLength(pub) {
    if (pub == null) return 1;
    return 37;
  }
};
var ValidatorHashInput = {
  decode: function decode(buffer) {
    var start = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0;
    var end = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : buffer.length;
    throw Error('Decode not implemented');
  },
  encode: function encode(validator) {
    var length = ValidatorHashInput.encodingLength(validator);
    var buffer = Buffer.alloc(length); // address field

    buffer[0] = 0x0a;
    buffer[1] = 0x14;
    var address = Buffer.from(validator.address, 'hex');
    address.copy(buffer, 2); // pubkey field

    buffer[22] = 0x12;
    buffer[23] = 0x25;
    PubKey.encode(validator.pub_key, buffer, 24); // voting power field

    buffer[61] = 0x18;
    VarInt.encode(validator.voting_power, buffer, 62);
    ValidatorHashInput.encode.bytes = length;
    return buffer;
  },
  encodingLength: function encodingLength(validator) {
    return 62 + VarInt.encodingLength(validator.voting_power);
  }
};
module.exports = {
  VarInt: VarInt,
  UVarInt: UVarInt,
  VarString: VarString,
  VarBuffer: VarBuffer,
  VarHexBuffer: VarHexBuffer,
  Time: Time,
  BlockID: BlockID,
  TreeHashInput: TreeHashInput,
  ValidatorHashInput: ValidatorHashInput,
  PubKey: PubKey,
  Int64LE: Int64LE
};