'use strict';

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var createHash = require('create-hash');

var _require = require('./types.js'),
    VarInt = _require.VarInt,
    VarString = _require.VarString,
    VarBuffer = _require.VarBuffer,
    VarHexBuffer = _require.VarHexBuffer,
    Time = _require.Time,
    BlockID = _require.BlockID,
    TreeHashInput = _require.TreeHashInput,
    ValidatorHashInput = _require.ValidatorHashInput;

var sha256 = hashFunc('sha256');

var tmhash = function tmhash() {
  return sha256.apply(void 0, arguments).slice(0, 20);
};

var blockHashFields = [['ChainID', 'chain_id', VarString], ['Height', 'height', VarInt], ['Time', 'time', Time], ['NumTxs', 'num_txs', VarInt], ['TotalTxs', 'total_txs', VarInt], ['LastBlockID', 'last_block_id', BlockID], ['LastCommit', 'last_commit_hash', VarHexBuffer], ['Data', 'data_hash', VarHexBuffer], ['Validators', 'validators_hash', VarHexBuffer], ['NextValidators', 'next_validators_hash', VarHexBuffer], ['App', 'app_hash', VarHexBuffer], ['Consensus', 'consensus_hash', VarHexBuffer], ['Results', 'last_results_hash', VarHexBuffer], ['Evidence', 'evidence_hash', VarHexBuffer], ['Proposer', 'proposer_address', VarHexBuffer]]; // sort fields by hash of name

blockHashFields.sort(function (_ref, _ref2) {
  var _ref3 = _slicedToArray(_ref, 1),
      keyA = _ref3[0];

  var _ref4 = _slicedToArray(_ref2, 1),
      keyB = _ref4[0];

  var bufA = Buffer.from(keyA);
  var bufB = Buffer.from(keyB);
  return bufA.compare(bufB);
});

function getBlockHash(header) {
  var hashes = blockHashFields.map(function (_ref5) {
    var _ref6 = _slicedToArray(_ref5, 3),
        key = _ref6[0],
        jsonKey = _ref6[1],
        type = _ref6[2];

    return kvHash(type, header[jsonKey], key);
  });
  return treeHash(hashes).toString('hex').toUpperCase();
}

function getValidatorSetHash(validators) {
  var hashes = validators.map(getValidatorHash);
  return treeHash(hashes).toString('hex').toUpperCase();
}

function getValidatorHash(validator) {
  var bytes = ValidatorHashInput.encode(validator);
  return tmhash(bytes);
}

function kvHash(type, value, key) {
  var encodedValue = '';

  if (value || typeof value === 'number') {
    encodedValue = type.encode(value); // some types have an "empty" value,
    // if we got that then use an empty buffer instead

    if (type.empty != null && encodedValue === type.empty) {
      encodedValue = Buffer.alloc(0);
    }
  }

  var valueHash = tmhash(encodedValue);
  return tmhash(VarString.encode(key), VarBuffer.encode(valueHash));
}

function treeHash(hashes) {
  if (hashes.length === 1) {
    return hashes[0];
  }

  var midpoint = Math.ceil(hashes.length / 2);
  var left = treeHash(hashes.slice(0, midpoint));
  var right = treeHash(hashes.slice(midpoint));
  var hashInput = TreeHashInput.encode({
    left: left,
    right: right
  });
  return tmhash(hashInput);
}

function hashFunc(algorithm) {
  return function () {
    var hash = createHash(algorithm);

    for (var _len = arguments.length, chunks = new Array(_len), _key = 0; _key < _len; _key++) {
      chunks[_key] = arguments[_key];
    }

    for (var _i2 = 0; _i2 < chunks.length; _i2++) {
      var data = chunks[_i2];
      hash.update(data);
    }

    return hash.digest();
  };
}

module.exports = {
  getBlockHash: getBlockHash,
  getValidatorHash: getValidatorHash,
  getValidatorSetHash: getValidatorSetHash,
  sha256: sha256,
  tmhash: tmhash
};