/*! For license information please see chat.bundle.js.LICENSE.txt */
( () => {
  "use strict";
  var t = {
      25740: (t, e, r) => {
          function n(t) {
              return n = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(t) {
                  return typeof t
              }
              : function(t) {
                  return t && "function" == typeof Symbol && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t
              }
              ,
              n(t)
          }
          function o(t) {
              var e = "function" == typeof Map ? new Map : void 0;
              return o = function(t) {
                  if (null === t || !function(t) {
                      try {
                          return -1 !== Function.toString.call(t).indexOf("[native code]")
                      } catch (e) {
                          return "function" == typeof t
                      }
                  }(t))
                      return t;
                  if ("function" != typeof t)
                      throw new TypeError("Super expression must either be null or a function");
                  if (void 0 !== e) {
                      if (e.has(t))
                          return e.get(t);
                      e.set(t, r)
                  }
                  function r() {
                      return function(t, e, r) {
                          if (i())
                              return Reflect.construct.apply(null, arguments);
                          var n = [null];
                          n.push.apply(n, e);
                          var o = new (t.bind.apply(t, n));
                          return r && a(o, r.prototype),
                          o
                      }(t, arguments, c(this).constructor)
                  }
                  return r.prototype = Object.create(t.prototype, {
                      constructor: {
                          value: r,
                          enumerable: !1,
                          writable: !0,
                          configurable: !0
                      }
                  }),
                  a(r, t)
              }
              ,
              o(t)
          }
          function i() {
              try {
                  var t = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], (function() {}
                  )))
              } catch (t) {}
              return (i = function() {
                  return !!t
              }
              )()
          }
          function a(t, e) {
              return a = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t, e) {
                  return t.__proto__ = e,
                  t
              }
              ,
              a(t, e)
          }
          function c(t) {
              return c = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t) {
                  return t.__proto__ || Object.getPrototypeOf(t)
              }
              ,
              c(t)
          }
          r.d(e, {
              y1: () => u
          });
          var u = function(t) {
              function e(t) {
                  var r;
                  return function(t, e) {
                      if (!(t instanceof e))
                          throw new TypeError("Cannot call a class as a function")
                  }(this, e),
                  (r = function(t, e, r) {
                      return e = c(e),
                      function(t, e) {
                          if (e && ("object" == n(e) || "function" == typeof e))
                              return e;
                          if (void 0 !== e)
                              throw new TypeError("Derived constructors may only return object or undefined");
                          return function(t) {
                              if (void 0 === t)
                                  throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
                              return t
                          }(t)
                      }(t, i() ? Reflect.construct(e, r || [], c(t).constructor) : e.apply(t, r))
                  }(this, e, [t])).name = "CanceledError",
                  r
              }
              return function(t, e) {
                  if ("function" != typeof e && null !== e)
                      throw new TypeError("Super expression must either be null or a function");
                  t.prototype = Object.create(e && e.prototype, {
                      constructor: {
                          value: t,
                          writable: !0,
                          configurable: !0
                      }
                  }),
                  Object.defineProperty(t, "prototype", {
                      writable: !1
                  }),
                  e && a(t, e)
              }(e, t),
              r = e,
              Object.defineProperty(r, "prototype", {
                  writable: !1
              }),
              r;
              var r
          }(o(Error))
      }
      ,
      37524: (t, e, r) => {
          r.d(e, {
              yz: () => u
          });
          var n = r(27002);
          function o(t) {
              return o = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(t) {
                  return typeof t
              }
              : function(t) {
                  return t && "function" == typeof Symbol && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t
              }
              ,
              o(t)
          }
          function i(t, e) {
              var r = Object.keys(t);
              if (Object.getOwnPropertySymbols) {
                  var n = Object.getOwnPropertySymbols(t);
                  e && (n = n.filter((function(e) {
                      return Object.getOwnPropertyDescriptor(t, e).enumerable
                  }
                  ))),
                  r.push.apply(r, n)
              }
              return r
          }
          function a(t) {
              for (var e = 1; e < arguments.length; e++) {
                  var r = null != arguments[e] ? arguments[e] : {};
                  e % 2 ? i(Object(r), !0).forEach((function(e) {
                      c(t, e, r[e])
                  }
                  )) : Object.getOwnPropertyDescriptors ? Object.defineProperties(t, Object.getOwnPropertyDescriptors(r)) : i(Object(r)).forEach((function(e) {
                      Object.defineProperty(t, e, Object.getOwnPropertyDescriptor(r, e))
                  }
                  ))
              }
              return t
          }
          function c(t, e, r) {
              return (e = function(t) {
                  var e = function(t) {
                      if ("object" != o(t) || !t)
                          return t;
                      var e = t[Symbol.toPrimitive];
                      if (void 0 !== e) {
                          var r = e.call(t, "string");
                          if ("object" != o(r))
                              return r;
                          throw new TypeError("@@toPrimitive must return a primitive value.")
                      }
                      return String(t)
                  }(t);
                  return "symbol" == o(e) ? e : e + ""
              }(e))in t ? Object.defineProperty(t, e, {
                  value: r,
                  enumerable: !0,
                  configurable: !0,
                  writable: !0
              }) : t[e] = r,
              t
          }
          var u = !1
            , l = Object.freeze({
              isKubeStaging: !1,
              frontChatServerBaseDomain: "chat-server.frontapp.com",
              frontSettingsDomain: "chat.frontapp.com",
              sendMessagesUrl: "https://chat-webhook.frontapp.com/front-chat"
          });
          u && window.shouldForceProd ? a(a({}, n), l) : u && window.shouldForceLocal && a(a({}, n), {}, {
              isLocal: !0,
              isKubeStaging: !1,
              frontChatServerBaseDomain: "localhost:3009",
              frontSettingsDomain: "localhost:3009/local",
              sendMessagesUrl: "http://localhost:3002/front-chat"
          })
      }
      ,
      80117: (t, e, r) => {
          r.d(e, {
              tH: () => h
          });
          var n = r(25740);
          function o(t) {
              return o = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(t) {
                  return typeof t
              }
              : function(t) {
                  return t && "function" == typeof Symbol && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t
              }
              ,
              o(t)
          }
          function i() {
              i = function() {
                  return e
              }
              ;
              var t, e = {}, r = Object.prototype, n = r.hasOwnProperty, a = Object.defineProperty || function(t, e, r) {
                  t[e] = r.value
              }
              , c = "function" == typeof Symbol ? Symbol : {}, u = c.iterator || "@@iterator", l = c.asyncIterator || "@@asyncIterator", s = c.toStringTag || "@@toStringTag";
              function f(t, e, r) {
                  return Object.defineProperty(t, e, {
                      value: r,
                      enumerable: !0,
                      configurable: !0,
                      writable: !0
                  }),
                  t[e]
              }
              try {
                  f({}, "")
              } catch (t) {
                  f = function(t, e, r) {
                      return t[e] = r
                  }
              }
              function h(t, e, r, n) {
                  var o = e && e.prototype instanceof w ? e : w
                    , i = Object.create(o.prototype)
                    , c = new T(n || []);
                  return a(i, "_invoke", {
                      value: C(t, r, c)
                  }),
                  i
              }
              function p(t, e, r) {
                  try {
                      return {
                          type: "normal",
                          arg: t.call(e, r)
                      }
                  } catch (t) {
                      return {
                          type: "throw",
                          arg: t
                      }
                  }
              }
              e.wrap = h;
              var y = "suspendedStart"
                , d = "suspendedYield"
                , v = "executing"
                , m = "completed"
                , g = {};
              function w() {}
              function b() {}
              function E() {}
              var x = {};
              f(x, u, (function() {
                  return this
              }
              ));
              var O = Object.getPrototypeOf
                , L = O && O(O(A([])));
              L && L !== r && n.call(L, u) && (x = L);
              var S = E.prototype = w.prototype = Object.create(x);
              function j(t) {
                  ["next", "throw", "return"].forEach((function(e) {
                      f(t, e, (function(t) {
                          return this._invoke(e, t)
                      }
                      ))
                  }
                  ))
              }
              function F(t, e) {
                  function r(i, a, c, u) {
                      var l = p(t[i], t, a);
                      if ("throw" !== l.type) {
                          var s = l.arg
                            , f = s.value;
                          return f && "object" == o(f) && n.call(f, "__await") ? e.resolve(f.__await).then((function(t) {
                              r("next", t, c, u)
                          }
                          ), (function(t) {
                              r("throw", t, c, u)
                          }
                          )) : e.resolve(f).then((function(t) {
                              s.value = t,
                              c(s)
                          }
                          ), (function(t) {
                              return r("throw", t, c, u)
                          }
                          ))
                      }
                      u(l.arg)
                  }
                  var i;
                  a(this, "_invoke", {
                      value: function(t, n) {
                          function o() {
                              return new e((function(e, o) {
                                  r(t, n, e, o)
                              }
                              ))
                          }
                          return i = i ? i.then(o, o) : o()
                      }
                  })
              }
              function C(e, r, n) {
                  var o = y;
                  return function(i, a) {
                      if (o === v)
                          throw Error("Generator is already running");
                      if (o === m) {
                          if ("throw" === i)
                              throw a;
                          return {
                              value: t,
                              done: !0
                          }
                      }
                      for (n.method = i,
                      n.arg = a; ; ) {
                          var c = n.delegate;
                          if (c) {
                              var u = _(c, n);
                              if (u) {
                                  if (u === g)
                                      continue;
                                  return u
                              }
                          }
                          if ("next" === n.method)
                              n.sent = n._sent = n.arg;
                          else if ("throw" === n.method) {
                              if (o === y)
                                  throw o = m,
                                  n.arg;
                              n.dispatchException(n.arg)
                          } else
                              "return" === n.method && n.abrupt("return", n.arg);
                          o = v;
                          var l = p(e, r, n);
                          if ("normal" === l.type) {
                              if (o = n.done ? m : d,
                              l.arg === g)
                                  continue;
                              return {
                                  value: l.arg,
                                  done: n.done
                              }
                          }
                          "throw" === l.type && (o = m,
                          n.method = "throw",
                          n.arg = l.arg)
                      }
                  }
              }
              function _(e, r) {
                  var n = r.method
                    , o = e.iterator[n];
                  if (o === t)
                      return r.delegate = null,
                      "throw" === n && e.iterator.return && (r.method = "return",
                      r.arg = t,
                      _(e, r),
                      "throw" === r.method) || "return" !== n && (r.method = "throw",
                      r.arg = new TypeError("The iterator does not provide a '" + n + "' method")),
                      g;
                  var i = p(o, e.iterator, r.arg);
                  if ("throw" === i.type)
                      return r.method = "throw",
                      r.arg = i.arg,
                      r.delegate = null,
                      g;
                  var a = i.arg;
                  return a ? a.done ? (r[e.resultName] = a.value,
                  r.next = e.nextLoc,
                  "return" !== r.method && (r.method = "next",
                  r.arg = t),
                  r.delegate = null,
                  g) : a : (r.method = "throw",
                  r.arg = new TypeError("iterator result is not an object"),
                  r.delegate = null,
                  g)
              }
              function P(t) {
                  var e = {
                      tryLoc: t[0]
                  };
                  1 in t && (e.catchLoc = t[1]),
                  2 in t && (e.finallyLoc = t[2],
                  e.afterLoc = t[3]),
                  this.tryEntries.push(e)
              }
              function k(t) {
                  var e = t.completion || {};
                  e.type = "normal",
                  delete e.arg,
                  t.completion = e
              }
              function T(t) {
                  this.tryEntries = [{
                      tryLoc: "root"
                  }],
                  t.forEach(P, this),
                  this.reset(!0)
              }
              function A(e) {
                  if (e || "" === e) {
                      var r = e[u];
                      if (r)
                          return r.call(e);
                      if ("function" == typeof e.next)
                          return e;
                      if (!isNaN(e.length)) {
                          var i = -1
                            , a = function r() {
                              for (; ++i < e.length; )
                                  if (n.call(e, i))
                                      return r.value = e[i],
                                      r.done = !1,
                                      r;
                              return r.value = t,
                              r.done = !0,
                              r
                          };
                          return a.next = a
                      }
                  }
                  throw new TypeError(o(e) + " is not iterable")
              }
              return b.prototype = E,
              a(S, "constructor", {
                  value: E,
                  configurable: !0
              }),
              a(E, "constructor", {
                  value: b,
                  configurable: !0
              }),
              b.displayName = f(E, s, "GeneratorFunction"),
              e.isGeneratorFunction = function(t) {
                  var e = "function" == typeof t && t.constructor;
                  return !!e && (e === b || "GeneratorFunction" === (e.displayName || e.name))
              }
              ,
              e.mark = function(t) {
                  return Object.setPrototypeOf ? Object.setPrototypeOf(t, E) : (t.__proto__ = E,
                  f(t, s, "GeneratorFunction")),
                  t.prototype = Object.create(S),
                  t
              }
              ,
              e.awrap = function(t) {
                  return {
                      __await: t
                  }
              }
              ,
              j(F.prototype),
              f(F.prototype, l, (function() {
                  return this
              }
              )),
              e.AsyncIterator = F,
              e.async = function(t, r, n, o, i) {
                  void 0 === i && (i = Promise);
                  var a = new F(h(t, r, n, o),i);
                  return e.isGeneratorFunction(r) ? a : a.next().then((function(t) {
                      return t.done ? t.value : a.next()
                  }
                  ))
              }
              ,
              j(S),
              f(S, s, "Generator"),
              f(S, u, (function() {
                  return this
              }
              )),
              f(S, "toString", (function() {
                  return "[object Generator]"
              }
              )),
              e.keys = function(t) {
                  var e = Object(t)
                    , r = [];
                  for (var n in e)
                      r.push(n);
                  return r.reverse(),
                  function t() {
                      for (; r.length; ) {
                          var n = r.pop();
                          if (n in e)
                              return t.value = n,
                              t.done = !1,
                              t
                      }
                      return t.done = !0,
                      t
                  }
              }
              ,
              e.values = A,
              T.prototype = {
                  constructor: T,
                  reset: function(e) {
                      if (this.prev = 0,
                      this.next = 0,
                      this.sent = this._sent = t,
                      this.done = !1,
                      this.delegate = null,
                      this.method = "next",
                      this.arg = t,
                      this.tryEntries.forEach(k),
                      !e)
                          for (var r in this)
                              "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t)
                  },
                  stop: function() {
                      this.done = !0;
                      var t = this.tryEntries[0].completion;
                      if ("throw" === t.type)
                          throw t.arg;
                      return this.rval
                  },
                  dispatchException: function(e) {
                      if (this.done)
                          throw e;
                      var r = this;
                      function o(n, o) {
                          return c.type = "throw",
                          c.arg = e,
                          r.next = n,
                          o && (r.method = "next",
                          r.arg = t),
                          !!o
                      }
                      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
                          var a = this.tryEntries[i]
                            , c = a.completion;
                          if ("root" === a.tryLoc)
                              return o("end");
                          if (a.tryLoc <= this.prev) {
                              var u = n.call(a, "catchLoc")
                                , l = n.call(a, "finallyLoc");
                              if (u && l) {
                                  if (this.prev < a.catchLoc)
                                      return o(a.catchLoc, !0);
                                  if (this.prev < a.finallyLoc)
                                      return o(a.finallyLoc)
                              } else if (u) {
                                  if (this.prev < a.catchLoc)
                                      return o(a.catchLoc, !0)
                              } else {
                                  if (!l)
                                      throw Error("try statement without catch or finally");
                                  if (this.prev < a.finallyLoc)
                                      return o(a.finallyLoc)
                              }
                          }
                      }
                  },
                  abrupt: function(t, e) {
                      for (var r = this.tryEntries.length - 1; r >= 0; --r) {
                          var o = this.tryEntries[r];
                          if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) {
                              var i = o;
                              break
                          }
                      }
                      i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null);
                      var a = i ? i.completion : {};
                      return a.type = t,
                      a.arg = e,
                      i ? (this.method = "next",
                      this.next = i.finallyLoc,
                      g) : this.complete(a)
                  },
                  complete: function(t, e) {
                      if ("throw" === t.type)
                          throw t.arg;
                      return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg,
                      this.method = "return",
                      this.next = "end") : "normal" === t.type && e && (this.next = e),
                      g
                  },
                  finish: function(t) {
                      for (var e = this.tryEntries.length - 1; e >= 0; --e) {
                          var r = this.tryEntries[e];
                          if (r.finallyLoc === t)
                              return this.complete(r.completion, r.afterLoc),
                              k(r),
                              g
                      }
                  },
                  catch: function(t) {
                      for (var e = this.tryEntries.length - 1; e >= 0; --e) {
                          var r = this.tryEntries[e];
                          if (r.tryLoc === t) {
                              var n = r.completion;
                              if ("throw" === n.type) {
                                  var o = n.arg;
                                  k(r)
                              }
                              return o
                          }
                      }
                      throw Error("illegal catch attempt")
                  },
                  delegateYield: function(e, r, n) {
                      return this.delegate = {
                          iterator: A(e),
                          resultName: r,
                          nextLoc: n
                      },
                      "next" === this.method && (this.arg = t),
                      g
                  }
              },
              e
          }
          function a(t, e, r, n, o, i, a) {
              try {
                  var c = t[i](a)
                    , u = c.value
              } catch (t) {
                  return void r(t)
              }
              c.done ? e(u) : Promise.resolve(u).then(n, o)
          }
          function c(t) {
              return function() {
                  var e = this
                    , r = arguments;
                  return new Promise((function(n, o) {
                      var i = t.apply(e, r);
                      function c(t) {
                          a(i, n, o, c, u, "next", t)
                      }
                      function u(t) {
                          a(i, n, o, c, u, "throw", t)
                      }
                      c(void 0)
                  }
                  ))
              }
          }
          var u = 10
            , l = 50;
          function s(t, e) {
              return f.apply(this, arguments)
          }
          function f() {
              return (f = c(i().mark((function t(e, r) {
                  var o;
                  return i().wrap((function(t) {
                      for (; ; )
                          switch (t.prev = t.next) {
                          case 0:
                              return o = !1,
                              r && r.addEventListener("abort", (function() {
                                  o = !0
                              }
                              )),
                              t.abrupt("return", new Promise((function(t, r) {
                                  setTimeout((function() {
                                      o ? r(new n.y1("setTimeoutAsync was aborted")) : t(void 0)
                                  }
                                  ), e)
                              }
                              )));
                          case 3:
                          case "end":
                              return t.stop()
                          }
                  }
                  ), t)
              }
              )))).apply(this, arguments)
          }
          function h(t) {
              return p.apply(this, arguments)
          }
          function p() {
              return p = c(i().mark((function t(e) {
                  var r, n, o, a, c, f, p, y, d = arguments;
                  return i().wrap((function(t) {
                      for (; ; )
                          switch (t.prev = t.next) {
                          case 0:
                              return a = d.length > 2 && void 0 !== d[2] ? d[2] : 0,
                              c = null !== (r = (o = d.length > 1 && void 0 !== d[1] ? d[1] : {}).maxRetryAttempts) && void 0 !== r ? r : u,
                              f = null !== (n = o.retryDelayMultiplier) && void 0 !== n ? n : l,
                              t.prev = 4,
                              t.next = 7,
                              e();
                          case 7:
                              return t.abrupt("return", t.sent);
                          case 10:
                              if (t.prev = 10,
                              t.t0 = t.catch(4),
                              !((p = a + 1) >= c)) {
                                  t.next = 15;
                                  break
                              }
                              throw t.t0;
                          case 15:
                              return y = (Math.pow(2, a) - 1) * f,
                              t.next = 18,
                              s(y);
                          case 18:
                              return t.abrupt("return", h(e, o, p));
                          case 19:
                          case "end":
                              return t.stop()
                          }
                  }
                  ), t, null, [[4, 10]])
              }
              ))),
              p.apply(this, arguments)
          }
      }
      ,
      59505: (t, e, r) => {
          r.d(e, {
              Pu: () => s,
              Vs: () => f,
              ah: () => c,
              cN: () => h,
              dD: () => d,
              kD: () => l,
              mk: () => u,
              uF: () => y
          });
          var n = "ACTION"
            , o = "ON_EVENT_HANDLER"
            , i = "GETTER"
            , a = "unreadChange"
            , c = "init"
            , u = "previewSettings"
            , l = "previewChatbot"
            , s = "debug"
            , f = "debugContextDocument"
            , h = "debugContextScreenshot"
            , p = [{
              name: c,
              type: n
          }, {
              name: "identity",
              type: n
          }, {
              name: "shutdown",
              type: n
          }, {
              name: "restart",
              type: n
          }, {
              name: "hide",
              type: n
          }, {
              name: "show",
              type: n
          }, {
              name: "triggerMessage",
              type: n
          }, {
              name: "setPageInset",
              type: n
          }, {
              name: "onUnreadChange",
              type: o,
              event: a
          }, {
              name: "offUnreadChange",
              type: "OFF_EVENT_HANDLER",
              event: a
          }, {
              name: "unread_count",
              type: i
          }, {
              name: "user_id",
              type: i
          }, {
              name: s,
              type: "DEBUG"
          }, {
              name: "onContactFormSubmit",
              type: o,
              event: "contactFormSubmit"
          }, {
              name: "onInboundMessageReceived",
              type: o,
              event: "inboundMessageReceived"
          }, {
              name: "onWindowVisibilityChanged",
              type: o,
              event: "windowVisibilityChanged"
          }, {
              name: u,
              type: n
          }, {
              name: l,
              type: n
          }, {
              name: "navigate",
              type: n
          }, {
              name: f,
              type: n
          }, {
              name: h,
              type: n
          }, {
              name: "debugFetchNewSuggestions",
              type: n
          }]
            , y = p.map((function(t) {
              return t.name
          }
          ))
            , d = function(t, e, r) {
              var n = p.find((function(e) {
                  return e.name === t
              }
              ));
              if (n)
                  return r(n);
              console.error('[FrontChat] Command not found: "'.concat(t, '"'))
          }
      }
      ,
      52267: (t, e, r) => {
          r.d(e, {
              I5: () => y,
              Xo: () => m
          });
          var n = r(37524)
            , o = r(80117)
            , i = r(59505);
          function a(t) {
              return a = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(t) {
                  return typeof t
              }
              : function(t) {
                  return t && "function" == typeof Symbol && t.constructor === Symbol && t !== Symbol.prototype ? "symbol" : typeof t
              }
              ,
              a(t)
          }
          function c() {
              c = function() {
                  return e
              }
              ;
              var t, e = {}, r = Object.prototype, n = r.hasOwnProperty, o = Object.defineProperty || function(t, e, r) {
                  t[e] = r.value
              }
              , i = "function" == typeof Symbol ? Symbol : {}, u = i.iterator || "@@iterator", l = i.asyncIterator || "@@asyncIterator", s = i.toStringTag || "@@toStringTag";
              function f(t, e, r) {
                  return Object.defineProperty(t, e, {
                      value: r,
                      enumerable: !0,
                      configurable: !0,
                      writable: !0
                  }),
                  t[e]
              }
              try {
                  f({}, "")
              } catch (t) {
                  f = function(t, e, r) {
                      return t[e] = r
                  }
              }
              function h(t, e, r, n) {
                  var i = e && e.prototype instanceof w ? e : w
                    , a = Object.create(i.prototype)
                    , c = new T(n || []);
                  return o(a, "_invoke", {
                      value: C(t, r, c)
                  }),
                  a
              }
              function p(t, e, r) {
                  try {
                      return {
                          type: "normal",
                          arg: t.call(e, r)
                      }
                  } catch (t) {
                      return {
                          type: "throw",
                          arg: t
                      }
                  }
              }
              e.wrap = h;
              var y = "suspendedStart"
                , d = "suspendedYield"
                , v = "executing"
                , m = "completed"
                , g = {};
              function w() {}
              function b() {}
              function E() {}
              var x = {};
              f(x, u, (function() {
                  return this
              }
              ));
              var O = Object.getPrototypeOf
                , L = O && O(O(A([])));
              L && L !== r && n.call(L, u) && (x = L);
              var S = E.prototype = w.prototype = Object.create(x);
              function j(t) {
                  ["next", "throw", "return"].forEach((function(e) {
                      f(t, e, (function(t) {
                          return this._invoke(e, t)
                      }
                      ))
                  }
                  ))
              }
              function F(t, e) {
                  function r(o, i, c, u) {
                      var l = p(t[o], t, i);
                      if ("throw" !== l.type) {
                          var s = l.arg
                            , f = s.value;
                          return f && "object" == a(f) && n.call(f, "__await") ? e.resolve(f.__await).then((function(t) {
                              r("next", t, c, u)
                          }
                          ), (function(t) {
                              r("throw", t, c, u)
                          }
                          )) : e.resolve(f).then((function(t) {
                              s.value = t,
                              c(s)
                          }
                          ), (function(t) {
                              return r("throw", t, c, u)
                          }
                          ))
                      }
                      u(l.arg)
                  }
                  var i;
                  o(this, "_invoke", {
                      value: function(t, n) {
                          function o() {
                              return new e((function(e, o) {
                                  r(t, n, e, o)
                              }
                              ))
                          }
                          return i = i ? i.then(o, o) : o()
                      }
                  })
              }
              function C(e, r, n) {
                  var o = y;
                  return function(i, a) {
                      if (o === v)
                          throw Error("Generator is already running");
                      if (o === m) {
                          if ("throw" === i)
                              throw a;
                          return {
                              value: t,
                              done: !0
                          }
                      }
                      for (n.method = i,
                      n.arg = a; ; ) {
                          var c = n.delegate;
                          if (c) {
                              var u = _(c, n);
                              if (u) {
                                  if (u === g)
                                      continue;
                                  return u
                              }
                          }
                          if ("next" === n.method)
                              n.sent = n._sent = n.arg;
                          else if ("throw" === n.method) {
                              if (o === y)
                                  throw o = m,
                                  n.arg;
                              n.dispatchException(n.arg)
                          } else
                              "return" === n.method && n.abrupt("return", n.arg);
                          o = v;
                          var l = p(e, r, n);
                          if ("normal" === l.type) {
                              if (o = n.done ? m : d,
                              l.arg === g)
                                  continue;
                              return {
                                  value: l.arg,
                                  done: n.done
                              }
                          }
                          "throw" === l.type && (o = m,
                          n.method = "throw",
                          n.arg = l.arg)
                      }
                  }
              }
              function _(e, r) {
                  var n = r.method
                    , o = e.iterator[n];
                  if (o === t)
                      return r.delegate = null,
                      "throw" === n && e.iterator.return && (r.method = "return",
                      r.arg = t,
                      _(e, r),
                      "throw" === r.method) || "return" !== n && (r.method = "throw",
                      r.arg = new TypeError("The iterator does not provide a '" + n + "' method")),
                      g;
                  var i = p(o, e.iterator, r.arg);
                  if ("throw" === i.type)
                      return r.method = "throw",
                      r.arg = i.arg,
                      r.delegate = null,
                      g;
                  var a = i.arg;
                  return a ? a.done ? (r[e.resultName] = a.value,
                  r.next = e.nextLoc,
                  "return" !== r.method && (r.method = "next",
                  r.arg = t),
                  r.delegate = null,
                  g) : a : (r.method = "throw",
                  r.arg = new TypeError("iterator result is not an object"),
                  r.delegate = null,
                  g)
              }
              function P(t) {
                  var e = {
                      tryLoc: t[0]
                  };
                  1 in t && (e.catchLoc = t[1]),
                  2 in t && (e.finallyLoc = t[2],
                  e.afterLoc = t[3]),
                  this.tryEntries.push(e)
              }
              function k(t) {
                  var e = t.completion || {};
                  e.type = "normal",
                  delete e.arg,
                  t.completion = e
              }
              function T(t) {
                  this.tryEntries = [{
                      tryLoc: "root"
                  }],
                  t.forEach(P, this),
                  this.reset(!0)
              }
              function A(e) {
                  if (e || "" === e) {
                      var r = e[u];
                      if (r)
                          return r.call(e);
                      if ("function" == typeof e.next)
                          return e;
                      if (!isNaN(e.length)) {
                          var o = -1
                            , i = function r() {
                              for (; ++o < e.length; )
                                  if (n.call(e, o))
                                      return r.value = e[o],
                                      r.done = !1,
                                      r;
                              return r.value = t,
                              r.done = !0,
                              r
                          };
                          return i.next = i
                      }
                  }
                  throw new TypeError(a(e) + " is not iterable")
              }
              return b.prototype = E,
              o(S, "constructor", {
                  value: E,
                  configurable: !0
              }),
              o(E, "constructor", {
                  value: b,
                  configurable: !0
              }),
              b.displayName = f(E, s, "GeneratorFunction"),
              e.isGeneratorFunction = function(t) {
                  var e = "function" == typeof t && t.constructor;
                  return !!e && (e === b || "GeneratorFunction" === (e.displayName || e.name))
              }
              ,
              e.mark = function(t) {
                  return Object.setPrototypeOf ? Object.setPrototypeOf(t, E) : (t.__proto__ = E,
                  f(t, s, "GeneratorFunction")),
                  t.prototype = Object.create(S),
                  t
              }
              ,
              e.awrap = function(t) {
                  return {
                      __await: t
                  }
              }
              ,
              j(F.prototype),
              f(F.prototype, l, (function() {
                  return this
              }
              )),
              e.AsyncIterator = F,
              e.async = function(t, r, n, o, i) {
                  void 0 === i && (i = Promise);
                  var a = new F(h(t, r, n, o),i);
                  return e.isGeneratorFunction(r) ? a : a.next().then((function(t) {
                      return t.done ? t.value : a.next()
                  }
                  ))
              }
              ,
              j(S),
              f(S, s, "Generator"),
              f(S, u, (function() {
                  return this
              }
              )),
              f(S, "toString", (function() {
                  return "[object Generator]"
              }
              )),
              e.keys = function(t) {
                  var e = Object(t)
                    , r = [];
                  for (var n in e)
                      r.push(n);
                  return r.reverse(),
                  function t() {
                      for (; r.length; ) {
                          var n = r.pop();
                          if (n in e)
                              return t.value = n,
                              t.done = !1,
                              t
                      }
                      return t.done = !0,
                      t
                  }
              }
              ,
              e.values = A,
              T.prototype = {
                  constructor: T,
                  reset: function(e) {
                      if (this.prev = 0,
                      this.next = 0,
                      this.sent = this._sent = t,
                      this.done = !1,
                      this.delegate = null,
                      this.method = "next",
                      this.arg = t,
                      this.tryEntries.forEach(k),
                      !e)
                          for (var r in this)
                              "t" === r.charAt(0) && n.call(this, r) && !isNaN(+r.slice(1)) && (this[r] = t)
                  },
                  stop: function() {
                      this.done = !0;
                      var t = this.tryEntries[0].completion;
                      if ("throw" === t.type)
                          throw t.arg;
                      return this.rval
                  },
                  dispatchException: function(e) {
                      if (this.done)
                          throw e;
                      var r = this;
                      function o(n, o) {
                          return c.type = "throw",
                          c.arg = e,
                          r.next = n,
                          o && (r.method = "next",
                          r.arg = t),
                          !!o
                      }
                      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
                          var a = this.tryEntries[i]
                            , c = a.completion;
                          if ("root" === a.tryLoc)
                              return o("end");
                          if (a.tryLoc <= this.prev) {
                              var u = n.call(a, "catchLoc")
                                , l = n.call(a, "finallyLoc");
                              if (u && l) {
                                  if (this.prev < a.catchLoc)
                                      return o(a.catchLoc, !0);
                                  if (this.prev < a.finallyLoc)
                                      return o(a.finallyLoc)
                              } else if (u) {
                                  if (this.prev < a.catchLoc)
                                      return o(a.catchLoc, !0)
                              } else {
                                  if (!l)
                                      throw Error("try statement without catch or finally");
                                  if (this.prev < a.finallyLoc)
                                      return o(a.finallyLoc)
                              }
                          }
                      }
                  },
                  abrupt: function(t, e) {
                      for (var r = this.tryEntries.length - 1; r >= 0; --r) {
                          var o = this.tryEntries[r];
                          if (o.tryLoc <= this.prev && n.call(o, "finallyLoc") && this.prev < o.finallyLoc) {
                              var i = o;
                              break
                          }
                      }
                      i && ("break" === t || "continue" === t) && i.tryLoc <= e && e <= i.finallyLoc && (i = null);
                      var a = i ? i.completion : {};
                      return a.type = t,
                      a.arg = e,
                      i ? (this.method = "next",
                      this.next = i.finallyLoc,
                      g) : this.complete(a)
                  },
                  complete: function(t, e) {
                      if ("throw" === t.type)
                          throw t.arg;
                      return "break" === t.type || "continue" === t.type ? this.next = t.arg : "return" === t.type ? (this.rval = this.arg = t.arg,
                      this.method = "return",
                      this.next = "end") : "normal" === t.type && e && (this.next = e),
                      g
                  },
                  finish: function(t) {
                      for (var e = this.tryEntries.length - 1; e >= 0; --e) {
                          var r = this.tryEntries[e];
                          if (r.finallyLoc === t)
                              return this.complete(r.completion, r.afterLoc),
                              k(r),
                              g
                      }
                  },
                  catch: function(t) {
                      for (var e = this.tryEntries.length - 1; e >= 0; --e) {
                          var r = this.tryEntries[e];
                          if (r.tryLoc === t) {
                              var n = r.completion;
                              if ("throw" === n.type) {
                                  var o = n.arg;
                                  k(r)
                              }
                              return o
                          }
                      }
                      throw Error("illegal catch attempt")
                  },
                  delegateYield: function(e, r, n) {
                      return this.delegate = {
                          iterator: A(e),
                          resultName: r,
                          nextLoc: n
                      },
                      "next" === this.method && (this.arg = t),
                      g
                  }
              },
              e
          }
          function u(t, e, r, n, o, i, a) {
              try {
                  var c = t[i](a)
                    , u = c.value
              } catch (t) {
                  return void r(t)
              }
              c.done ? e(u) : Promise.resolve(u).then(n, o)
          }
          function l(t) {
              return function() {
                  var e = this
                    , r = arguments;
                  return new Promise((function(n, o) {
                      var i = t.apply(e, r);
                      function a(t) {
                          u(i, n, o, a, c, "next", t)
                      }
                      function c(t) {
                          u(i, n, o, a, c, "throw", t)
                      }
                      a(void 0)
                  }
                  ))
              }
          }
          function s(t, e) {
              (null == e || e > t.length) && (e = t.length);
              for (var r = 0, n = Array(e); r < e; r++)
                  n[r] = t[r];
              return n
          }
          var f = "__frontCmdQueue"
            , h = [i.ah, i.mk, i.kD];
          function p() {
              var t = document.getElementById("front-chat-iframe");
              return null != t ? t : void 0
          }
          var y = function() {
              window[f] = [],
              window.FrontChat = function(t, e) {
                  return (0,
                  i.dD)(t, e, (function() {
                      return window[f] && window[f].push([t, e])
                  }
                  ))
              }
          }
            , d = function() {
              var t;
              Object.prototype.hasOwnProperty.call(window, f) && (null === (t = window[f]) || void 0 === t || t.forEach((function(t) {
                  var e, r, n = (r = 2,
                  function(t) {
                      if (Array.isArray(t))
                          return t
                  }(e = t) || function(t, e) {
                      var r = null == t ? null : "undefined" != typeof Symbol && t[Symbol.iterator] || t["@@iterator"];
                      if (null != r) {
                          var n, o, i, a, c = [], u = !0, l = !1;
                          try {
                              if (i = (r = r.call(t)).next,
                              0 === e) {
                                  if (Object(r) !== r)
                                      return;
                                  u = !1
                              } else
                                  for (; !(u = (n = i.call(r)).done) && (c.push(n.value),
                                  c.length !== e); u = !0)
                                      ;
                          } catch (t) {
                              l = !0,
                              o = t
                          } finally {
                              try {
                                  if (!u && null != r.return && (a = r.return(),
                                  Object(a) !== a))
                                      return
                              } finally {
                                  if (l)
                                      throw o
                              }
                          }
                          return c
                      }
                  }(e, r) || function(t, e) {
                      if (t) {
                          if ("string" == typeof t)
                              return s(t, e);
                          var r = {}.toString.call(t).slice(8, -1);
                          return "Object" === r && t.constructor && (r = t.constructor.name),
                          "Map" === r || "Set" === r ? Array.from(t) : "Arguments" === r || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(r) ? s(t, e) : void 0
                      }
                  }(e, r) || function() {
                      throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.")
                  }()), o = n[0], i = n[1];
                  return window.FrontChat && window.FrontChat(o, i)
              }
              )),
              delete window[f])
          };
          function v() {
              var t = arguments.length > 0 && void 0 !== arguments[0] && arguments[0]
                , e = p()
                , r = null == e ? void 0 : e.contentWindow;
              if (r) {
                  var n, o, i = !1, a = function() {
                      t && (e.style.top = "",
                      e.style.maxHeight = "",
                      e.style.overflow = "",
                      n && (document.body.style.height = n.height,
                      document.body.style.maxHeight = n.maxHeight,
                      document.body.style.overflow = n.overflow,
                      n = void 0),
                      o && (document.documentElement.style.height = o.height,
                      document.documentElement.style.maxHeight = o.maxHeight,
                      document.documentElement.style.overflow = o.overflow,
                      o = void 0))
                  };
                  r.frontChatResize = function(r) {
                      var n = r.placementLocation
                        , o = r.bottomSpacing
                        , c = r.sideSpacing
                        , u = r.width
                        , l = r.height
                        , s = r.isFullscreen
                        , f = i
                        , h = null != s && s;
                      e.style.width = u,
                      e.style.height = l,
                      e.style.bottom = o,
                      "bottom_left" === n ? e.style.left = c : e.style.right = c,
                      t && f && !h && a(),
                      i = h
                  }
                  ,
                  function(t, e, r, n, o) {
                      if (r && window.visualViewport) {
                          var a = null
                            , c = !1;
                          window.visualViewport.addEventListener("resize", (function() {
                              var t = window.visualViewport;
                              if (t)
                                  if (i) {
                                      null !== a && (c = !0,
                                      cancelAnimationFrame(a),
                                      a = null);
                                      var e = t.height
                                        , r = e
                                        , u = 0
                                        , l = !1
                                        , s = 0;
                                      c = !1;
                                      var f = function() {
                                          if (!c) {
                                              var t = window.visualViewport;
                                              if (t) {
                                                  var o = t.height;
                                                  if (o !== e && (l = !0),
                                                  o !== r ? (s = 0,
                                                  r = o) : s++,
                                                  l && s >= 3) {
                                                      var i = "".concat(o, "px");
                                                      return n(i),
                                                      document.body.scrollIntoView({
                                                          behavior: "instant",
                                                          block: "start"
                                                      }),
                                                      void (a = null)
                                                  }
                                                  if (u >= 30) {
                                                      var h = "".concat(o, "px");
                                                      return n(h),
                                                      document.body.scrollIntoView({
                                                          behavior: "instant",
                                                          block: "start"
                                                      }),
                                                      void (a = null)
                                                  }
                                                  u++,
                                                  a = requestAnimationFrame(f)
                                              }
                                          }
                                      };
                                      a = requestAnimationFrame(f)
                                  } else
                                      o()
                          }
                          ))
                      }
                  }(0, 0, t, (function(r) {
                      t && (n || (n = {
                          height: document.body.style.height,
                          maxHeight: document.body.style.maxHeight,
                          overflow: document.body.style.overflow
                      }),
                      o || (o = {
                          height: document.documentElement.style.height,
                          maxHeight: document.documentElement.style.maxHeight,
                          overflow: document.documentElement.style.overflow
                      }),
                      e.style.top = "0",
                      e.style.height = r,
                      e.style.maxHeight = r,
                      e.style.overflow = "hidden",
                      e.style.bottom = "",
                      document.body.style.height = r,
                      document.body.style.maxHeight = r,
                      document.body.style.overflow = "hidden",
                      document.documentElement.style.height = r,
                      document.documentElement.style.maxHeight = r,
                      document.documentElement.style.overflow = "hidden")
                  }
                  ), a)
              } else
                  console.error("[FrontChat] Cannot find #front-chat-iframe window")
          }
          function m(t, e, r, o) {
              var a;
              window.FrontChat = function(c, u) {
                  if (c === i.Pu && t && console.debug("[FrontChat][Front] SDK ".concat(t)),
                  i.uF.includes(c))
                      if (o) {
                          if (h.includes(c)) {
                              a = o.cloneNode();
                              var l = document.createElement("div");
                              l.setAttribute("id", "front-chat-container");
                              var s = document.createElement("script");
                              s.setAttribute("type", "text/javascript");
                              var f = "app.bundle.js?v=".concat(e)
                                , y = (null != r ? r : "") + f;
                              s.setAttribute("src", y),
                              "string" == typeof (null == u ? void 0 : u.nonce) && s.setAttribute("nonce", u.nonce),
                              a.srcdoc = '<!DOCTYPE html>\n<html>\n<head>\n  <meta name="viewport" content="width=device-width, initial-scale=1.0, interactive-widget=resizes-content">\n</head>\n<body>\n  '.concat(l.outerHTML).concat(s.outerHTML, "\n</body>\n</html>"),
                              a.onload = function() {
                                  !function() {
                                      var t = p()
                                        , e = null == t ? void 0 : t.contentWindow;
                                      e ? e.runEachCmdFromQueueAPI = d : console.error("[FrontChat] Cannot find #front-chat-iframe window")
                                  }(),
                                  v(Boolean(null == u ? void 0 : u.shouldResizeViewport)),
                                  g(a, c, u)
                              }
                              ;
                              var m = window.document.getElementById("front-chat-iframe");
                              return m && m.remove(),
                              void document.body.appendChild(a)
                          }
                          var w = n.yz ? p() : a;
                          if (c === i.Vs) {
                              var E = window.document.cloneNode(!0).body.outerHTML;
                              return g(w, c, {
                                  pageRaw: E
                              })
                          }
                          if (c !== i.cN)
                              return g(w, c, u);
                          (function() {
                              return b.apply(this, arguments)
                          }
                          )().then((function(t) {
                              return g(w, c, {
                                  screenshotDataUrl: null != t ? t : ""
                              })
                          }
                          )).catch(console.error)
                      } else
                          console.error("[FrontChat] Cannot find #front-chat-iframe");
                  else
                      console.error('[FrontChat] Command not found: "'.concat(c, '"'))
              }
          }
          function g(t, e, r) {
              if (h.includes(e))
                  (0,
                  o.tH)(l(c().mark((function n() {
                      return c().wrap((function(n) {
                          for (; ; )
                              switch (n.prev = n.next) {
                              case 0:
                                  return n.abrupt("return", w(t, e, r));
                              case 1:
                              case "end":
                                  return n.stop()
                              }
                      }
                      ), n)
                  }
                  )))).catch(console.error);
              else
                  try {
                      return w(t, e, r)
                  } catch (t) {
                      console.error(t)
                  }
          }
          function w(t, e, r) {
              var n = null == t ? void 0 : t.contentWindow;
              if (!n)
                  throw new Error("[FrontChat] Cannot find #front-chat-iframe");
              if (!n.FrontChatApp)
                  throw new Error("[FrontChat] Have not finished setting up FrontChatApp");
              return n.FrontChatApp(e, r)
          }
          function b() {
              return (b = l(c().mark((function t() {
                  var e, r, n, o, i, a;
                  return c().wrap((function(t) {
                      for (; ; )
                          switch (t.prev = t.next) {
                          case 0:
                              return t.prev = 0,
                              t.next = 3,
                              navigator.mediaDevices.getDisplayMedia({
                                  video: !0,
                                  audio: !1
                              });
                          case 3:
                              return e = t.sent,
                              r = e.getVideoTracks()[0],
                              n = new ImageCapture(r),
                              t.next = 8,
                              n.grabFrame();
                          case 8:
                              return o = t.sent,
                              (i = document.createElement("canvas")).width = o.width,
                              i.height = o.height,
                              i.getContext("2d").drawImage(o, 0, 0),
                              a = i.toDataURL("image/png"),
                              r.stop(),
                              t.abrupt("return", a);
                          case 19:
                              return t.prev = 19,
                              t.t0 = t.catch(0),
                              console.error(t.t0),
                              t.abrupt("return", void 0);
                          case 23:
                          case "end":
                              return t.stop()
                          }
                  }
                  ), t, null, [[0, 19]])
              }
              )))).apply(this, arguments)
          }
          n.yz && (window.attachFrontChatResize = v,
          window.attachMutationObserver = function(t, e) {
              new MutationObserver(e).observe(t, {
                  attributes: !0,
                  childList: !0,
                  subtree: !0
              })
          }
          ,
          window.cloneHeadIntoFrontChatIframe = function() {
              var t = document.getElementById("front-chat-iframe")
                , e = null == t ? void 0 : t.contentDocument;
              if (e) {
                  var r = document.head.innerHTML;
                  e.head.innerHTML = r
              }
          }
          )
      }
      ,
      27002: t => {
          t.exports = JSON.parse('{"frontSettingsDomain":"chat.frontapp.com","bugsnagKey":"09cd7060698418978d6775e5822061af","frontChatServerBaseDomain":"chat-server.frontapp.com","chatIdentityInitializeEndpoint":"/initialize","chatIdentityTokenEndpoint":"/token","loadMessagesEndpoint":"/conversations","sendMessagesUrl":"https://chat-webhook.frontapp.com/front-chat","sendAttachmentEndpoint":"/attachment","ablyAuthEndpoint":"/ably/auth","chatSeenEndpoint":"/seen","isKubeStaging":false,"chatAssetsUrl":"https://chat-assets.frontapp.com"}')
      }
  }
    , e = {};
  function r(n) {
      var o = e[n];
      if (void 0 !== o)
          return o.exports;
      var i = e[n] = {
          exports: {}
      };
      return t[n](i, i.exports, r),
      i.exports
  }
  r.d = (t, e) => {
      for (var n in e)
          r.o(e, n) && !r.o(t, n) && Object.defineProperty(t, n, {
              enumerable: !0,
              get: e[n]
          })
  }
  ,
  r.o = (t, e) => Object.prototype.hasOwnProperty.call(t, e);
  var n = r(52267);
  !function() {
      try {
          console.info("[FrontChat][Front] SDK ".concat("Version: 9.73.9")),
          (0,
          n.I5)();
          var t = document.createElement("iframe");
          t.id = "front-chat-iframe",
          t.title = "Front Chat",
          t.style.position = "fixed",
          t.style.border = "none",
          t.style.zIndex = 99999999,
          t.style.colorScheme = "normal",
          t.style.height = 0,
          t.style.width = 0,
          (0,
          n.Xo)("Version: 9.73.9", "e3d1e408", "https://chat-assets.frontapp.com/v1/", t)
      } catch (t) {
          console.error("[FrontChat][Front] Failed to initialize Front Chat SDK", t)
      }
  }()
}
)();
