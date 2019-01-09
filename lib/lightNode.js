'use strict';

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

var old = require('old');

var EventEmitter = require('events');

var RpcClient = require('./rpc.js');

var _require = require('./verify.js'),
    verifyCommit = _require.verifyCommit,
    verifyCommitSigs = _require.verifyCommitSigs,
    verifyValidatorSet = _require.verifyValidatorSet,
    verify = _require.verify;

var _require2 = require('./common.js'),
    safeParseInt = _require2.safeParseInt;

var HOUR = 60 * 60 * 1000;
var FOUR_HOURS = 4 * HOUR;
var THIRTY_DAYS = 30 * 24 * HOUR; // TODO: support multiple peers
// (multiple connections to listen for headers,
// get current height from multiple peers before syncing,
// randomly select peer when requesting data,
// broadcast txs to many peers)
// TODO: on error, disconnect from peer and try again
// TODO: use time heuristic to ensure nodes can't DoS by
// sending fake high heights.
// (applies to getting height when getting status in `sync()`,
// and when receiving a block in `update()`)
// talks to nodes via RPC and does light-client verification
// of block headers.

var LightNode =
/*#__PURE__*/
function (_EventEmitter) {
  _inherits(LightNode, _EventEmitter);

  function LightNode(peer, state) {
    var _this;

    var opts = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    _classCallCheck(this, LightNode);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(LightNode).call(this));
    _this.maxAge = opts.maxAge || THIRTY_DAYS;

    if (state.header.height == null) {
      throw Error('Expected state header to have a height');
    }

    state.header.height = safeParseInt(state.header.height); // we should be able to trust this state since it was either
    // hardcoded into the client, or previously verified/stored,
    // but it doesn't hurt to do a sanity check. not required
    // for first block, since we might be deriving it from genesis

    if (state.header.height > 1 || state.commit != null) {
      verifyValidatorSet(state.validators, state.header.validators_hash);
      verifyCommit(state.header, state.commit, state.validators);
    }

    _this._state = state;
    _this.rpc = RpcClient(peer); // TODO: ensure we're using websocket

    _this.emitError = _this.emitError.bind(_assertThisInitialized(_assertThisInitialized(_this)));

    _this.rpc.on('error', _this.emitError);

    _this.handleError(_this.initialSync)().then(function () {
      return _this.emit('synced');
    });

    return _this;
  }

  _createClass(LightNode, [{
    key: "handleError",
    value: function handleError(func) {
      var _this2 = this;

      return function () {
        for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
          args[_key] = arguments[_key];
        }

        return func.call.apply(func, [_this2].concat(args)).catch(function (err) {
          return _this2.emitError(err);
        });
      };
    }
  }, {
    key: "emitError",
    value: function emitError(err) {
      this.rpc.close();
      this.emit('error', err);
    }
  }, {
    key: "state",
    value: function state() {
      // TODO: deep clone
      return Object.assign({}, this._state);
    }
  }, {
    key: "height",
    value: function height() {
      return this._state.header.height;
    } // sync from current state to latest block

  }, {
    key: "initialSync",
    value: function () {
      var _initialSync = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee() {
        var status, tip;
        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                _context.next = 2;
                return this.rpc.status();

              case 2:
                status = _context.sent;
                tip = safeParseInt(status.sync_info.latest_block_height);

                if (!(tip > this.height())) {
                  _context.next = 7;
                  break;
                }

                _context.next = 7;
                return this.syncTo(tip);

              case 7:
                this.handleError(this.subscribe)();

              case 8:
              case "end":
                return _context.stop();
            }
          }
        }, _callee, this);
      }));

      function initialSync() {
        return _initialSync.apply(this, arguments);
      }

      return initialSync;
    }() // binary search to find furthest block from our current state,
    // which is signed by 2/3+ voting power of our current validator set

  }, {
    key: "syncTo",
    value: function () {
      var _syncTo = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee2(nextHeight) {
        var targetHeight,
            _ref,
            _ref$signed_header,
            header,
            commit,
            height,
            midpoint,
            _args2 = arguments;

        return regeneratorRuntime.wrap(function _callee2$(_context2) {
          while (1) {
            switch (_context2.prev = _context2.next) {
              case 0:
                targetHeight = _args2.length > 1 && _args2[1] !== undefined ? _args2[1] : nextHeight;
                _context2.next = 3;
                return this.rpc.commit({
                  height: nextHeight
                });

              case 3:
                _ref = _context2.sent;
                _ref$signed_header = _ref.signed_header;
                header = _ref$signed_header.header;
                commit = _ref$signed_header.commit;
                header.height = safeParseInt(header.height);
                _context2.prev = 8;
                // test if this commit is signed by 2/3+ of our old set
                // (throws if not)
                verifyCommitSigs(header, commit, this._state.validators); // verifiable, let's update

                _context2.next = 12;
                return this.update(header, commit);

              case 12:
                if (!(nextHeight === targetHeight)) {
                  _context2.next = 14;
                  break;
                }

                return _context2.abrupt("return");

              case 14:
                return _context2.abrupt("return", this.syncTo(targetHeight));

              case 17:
                _context2.prev = 17;
                _context2.t0 = _context2["catch"](8);

                if (_context2.t0.insufficientVotingPower) {
                  _context2.next = 21;
                  break;
                }

                throw _context2.t0;

              case 21:
                // insufficient verifiable voting power error,
                // couldn't verify this header
                height = this.height();

                if (!(nextHeight === height + 1)) {
                  _context2.next = 24;
                  break;
                }

                throw Error('Could not verify transition');

              case 24:
                // let's try going halfway back and see if we can verify
                midpoint = height + Math.ceil((nextHeight - height) / 2);
                return _context2.abrupt("return", this.syncTo(midpoint, targetHeight));

              case 26:
              case "end":
                return _context2.stop();
            }
          }
        }, _callee2, this, [[8, 17]]);
      }));

      function syncTo(_x) {
        return _syncTo.apply(this, arguments);
      }

      return syncTo;
    }() // start verifying new blocks as they come in

  }, {
    key: "subscribe",
    value: function () {
      var _subscribe = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee4() {
        var _this3 = this;

        var query, syncing, targetHeight;
        return regeneratorRuntime.wrap(function _callee4$(_context4) {
          while (1) {
            switch (_context4.prev = _context4.next) {
              case 0:
                query = 'tm.event = \'NewBlockHeader\'';
                syncing = false;
                targetHeight = this.height();
                _context4.next = 5;
                return this.rpc.subscribe({
                  query: query
                }, this.handleError(
                /*#__PURE__*/
                function () {
                  var _ref3 = _asyncToGenerator(
                  /*#__PURE__*/
                  regeneratorRuntime.mark(function _callee3(_ref2) {
                    var header;
                    return regeneratorRuntime.wrap(function _callee3$(_context3) {
                      while (1) {
                        switch (_context3.prev = _context3.next) {
                          case 0:
                            header = _ref2.header;
                            header.height = safeParseInt(header.height);
                            targetHeight = header.height; // don't start another sync loop if we are in the middle of syncing

                            if (!syncing) {
                              _context3.next = 5;
                              break;
                            }

                            return _context3.abrupt("return");

                          case 5:
                            syncing = true; // sync one block at a time to target

                          case 6:
                            if (!(_this3.height() < targetHeight)) {
                              _context3.next = 11;
                              break;
                            }

                            _context3.next = 9;
                            return _this3.syncTo(_this3.height() + 1);

                          case 9:
                            _context3.next = 6;
                            break;

                          case 11:
                            // unlock
                            syncing = false;

                          case 12:
                          case "end":
                            return _context3.stop();
                        }
                      }
                    }, _callee3, this);
                  }));

                  return function (_x2) {
                    return _ref3.apply(this, arguments);
                  };
                }()));

              case 5:
              case "end":
                return _context4.stop();
            }
          }
        }, _callee4, this);
      }));

      function subscribe() {
        return _subscribe.apply(this, arguments);
      }

      return subscribe;
    }()
  }, {
    key: "update",
    value: function () {
      var _update = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee5(header, commit) {
        var height, prevTime, nextTime, res, validators, validatorSetChanged, _res, newState;

        return regeneratorRuntime.wrap(function _callee5$(_context5) {
          while (1) {
            switch (_context5.prev = _context5.next) {
              case 0:
                header.height = safeParseInt(header.height);
                height = header.height; // make sure we aren't syncing from longer than than the unbonding period

                prevTime = new Date(this._state.header.time).getTime();

                if (!(Date.now() - prevTime > this.maxAge)) {
                  _context5.next = 5;
                  break;
                }

                throw Error('Our state is too old, cannot update safely');

              case 5:
                // make sure new commit isn't too far in the future
                nextTime = new Date(header.time).getTime();

                if (!(nextTime - Date.now() > FOUR_HOURS)) {
                  _context5.next = 8;
                  break;
                }

                throw Error('Header time is too far in the future');

              case 8:
                if (!(commit == null)) {
                  _context5.next = 14;
                  break;
                }

                _context5.next = 11;
                return this.rpc.commit({
                  height: height
                });

              case 11:
                res = _context5.sent;
                commit = res.signed_header.commit;
                commit.header.height = safeParseInt(commit.header.height);

              case 14:
                validators = this._state.validators;
                validatorSetChanged = header.validators_hash !== this._state.header.validators_hash;

                if (!validatorSetChanged) {
                  _context5.next = 21;
                  break;
                }

                _context5.next = 19;
                return this.rpc.validators({
                  height: height
                });

              case 19:
                _res = _context5.sent;
                validators = _res.validators;

              case 21:
                newState = {
                  header: header,
                  commit: commit,
                  validators: validators
                };
                verify(this._state, newState);
                this._state = newState;
                this.emit('update', header, commit, validators);

              case 25:
              case "end":
                return _context5.stop();
            }
          }
        }, _callee5, this);
      }));

      function update(_x3, _x4) {
        return _update.apply(this, arguments);
      }

      return update;
    }()
  }, {
    key: "close",
    value: function close() {
      this.rpc.close();
    }
  }]);

  return LightNode;
}(EventEmitter);

module.exports = old(LightNode);