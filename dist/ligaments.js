
/*
  *  Backbone.Ligaments
  *    Declarative view-model data binding for Backbone.js
  *  
  *  Author: Josh Bielick
  *  License: GNU GENERAL PUBLIC LICENSE
  *
 */

(function() {
  var __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; },
    __hasProp = {}.hasOwnProperty,
    __slice = [].slice;

  (function(factory) {
    if (typeof define === 'function' && define.amd) {
      return define(['underscore', 'jquery'], factory);
    } else if ((typeof exports !== "undefined" && exports !== null) && typeof module === 'object') {
      return factory(require('underscore'), require('jquery'));
    } else {
      return factory(_, window.jQuery);
    }
  })(function(_, $) {
    var Ligaments;
    Ligaments = (function() {
      function Ligaments(options) {
        if (options == null) {
          options = {};
        }
        this.cid = _.uniqueId('ligament');
        this.ensureArguments.apply(this, arguments);
        this.view = options.view, this.model = options.model, this.readOnly = options.readOnly, this.bindings = options.bindings, this.blacklist = options.blacklist, this.whitelist = options.whitelist;
        this.createBindings();
        if (options.inject !== false) {
          this.bootstrapView();
        }
        if (!(this.readOnly || !options.ingest)) {
          this.model.set(this.parseModel(), {
            silent: true
          });
        }
        return this;
      }

      Ligaments.prototype.createBindings = function() {
        _.bindAll(this, 'ingest', 'inject');
        this.view.listenTo(this.model, 'change', this.inject);
        if (!this.readOnly) {
          _.extend(this.view.events || (this.view.events = {}), {
            'change *[name]:not([lg-bind])': this.ingest,
            'input *[name]:not([lg-bind])': this.ingest,
            'change *[lg-bind]': this.ingest,
            'input *[lg-bind]': this.ingest
          });
          return this.view.delegateEvents(this.view.events);
        }
      };

      Ligaments.prototype.ensureArguments = function() {
        var args;
        args = [].slice.call(arguments);
        if (!(args.length || args[0].view || args[0].model)) {
          return console.warn('You must provide an instance of a Backbone View and Model');
        }
      };

      Ligaments.prototype.ingest = function(e) {
        var $input, data, path, value, _ref, _this;
        _this = this;
        if (!this.readOnly) {
          if (!(this.blacklist && (_ref = !path, __indexOf.call(this.blacklist, _ref) >= 0) || (this.whitelist != null) && __indexOf.call(this.whitelist, path) >= 0)) {
            $input = $(this.target = e.currentTarget);
            path = $input.attr('lg-bind') || $input.attr('name');
            if (path && path.indexOf('[' > -1)) {
              path = path.replace(/\[\]/g, (function(_this) {
                return function() {
                  return '[' + _this.view.$('[name]').filter("[name=\"" + path + "\"]").index($input) + ']';
                };
              })(this));
              path = this.dotToBracketNotation(path, true);
            }
            value = this.getVal($input, path);
            if ($input.attr('lg-method') === 'inject') {
              return null;
            }
            if ($input.is('select[multiple]')) {
              this.model.unset(path);
            }
            (data = {})[path] = value;
            data = this.expand(data);
            if (this.parse && _.isFunction(this.model.parse)) {
              this.model.parse(data);
            }
            if (value == null) {
              this.model.unset(path);
            } else {
              this.model.set(data);
            }
          }
        }
        return delete this.target;
      };

      Ligaments.prototype.bootstrapView = function() {
        return this.inject(this.model, {
          bootstrapData: this.model.toJSON()
        });
      };

      Ligaments.prototype.inject = function(model, options) {
        var $bound, $boundTarget, data, path, value, _ref;
        data = options.bootstrapData || model.changedAttributes();
        if (this.lockBinding) {
          return this;
        }
        data = this.flatten(data);
        if (_.isFunction(this.view.beforeInject)) {
          this.view.beforeInject(model, data);
        }
        for (path in data) {
          if (!__hasProp.call(data, path)) continue;
          value = data[path];
          if (!((path != null) && path.length > 0)) {
            continue;
          }
          if (!(((this.blacklist != null) && (_ref = !path, __indexOf.call(this.blacklist, _ref) >= 0)) || ((this.whitelist != null) && __indexOf.call(this.whitelist, path) >= 0))) {
            $bound = this.getBound(path);
            if ($bound.length) {
              if ($bound.attr('lg-method') === 'ingest') {
                return null;
              }
              if ($bound.is(':input')) {
                if ($bound.is(':checkbox') || $bound.is(':radio')) {
                  if ($bound.length > 1) {
                    $boundTarget = $bound.prop('checked', false).filter("[value=\"" + value + "\"]");
                  } else {
                    $boundTarget = $bound;
                  }
                  $boundTarget.prop('checked', function() {
                    var lowerCaseString;
                    lowerCaseString = value.toString().toLowerCase();
                    return value && lowerCaseString !== 'off' && lowerCaseString !== 'false' && lowerCaseString !== 'no';
                  });
                } else if ($bound.is('select[multiple]')) {
                  $bound.val(this.model.get(path));
                } else {
                  $bound.val(value);
                }
              } else if ($bound.is('img, svg')) {
                $bound.attr('src', value);
              } else {
                $bound.html(value);
              }
            }
          }
        }
      };

      Ligaments.prototype.parseModel = function() {
        var $bound, flat;
        $bound = this.view.$('[lg-bind], [name]');
        flat = {};
        $bound.each((function(_this) {
          return function(idx, el) {
            var $el, path, value;
            $el = $(el);
            path = $el.attr('lg-bind') || $el.attr('name');
            path = path.replace(/\[\]/g, function() {
              return '[' + $bound.filter("[lg-bind=\"" + path + "\"], [name=\"" + path + "\"]").index($el) + ']';
            });
            if ((value = _this.getVal($el, path)) != null) {
              return flat[path] = value;
            }
          };
        })(this));
        return this.expand(flat);
      };

      Ligaments.prototype.getBound = function(path) {
        var eqNameSelector, nameAttribute, nameSelectors;
        if (/[0-9]+/.test(path.split('').pop())) {
          path = path.split('.');
          path.pop();
          path = path.join('.');
        }
        nameAttribute = this.dotToBracketNotation(path);
        eqNameSelector = nameAttribute.replace(/(.*\[)([0-9]+)?(\].*)/g, '[name="$1$3"]:eq($2)');
        nameSelectors = "[lg-bind=\"" + path + "\"], [name=\"" + path + "\"] " + eqNameSelector + ", [name=\"" + nameAttribute + "\"]";
        return this.view.$(nameSelectors).not(this.target);
      };

      Ligaments.prototype.getVal = function(input, path) {
        var $input, args, castOptions, caster, value, _ref, _ref1;
        if (path == null) {
          path = '*';
        }
        $input = $(input);
        if ($input.is(':input')) {
          if ((!$input.is(':checkbox') && !$input.is(':radio')) || $input.prop('checked')) {
            value = $input.val();
          } else {
            value = void 0;
          }
        } else {
          value = $input.text();
        }
        if (((_ref = this.bindings) != null ? (_ref1 = _ref[path]) != null ? _ref1.cast : void 0 : void 0) != null) {
          castOptions = this.bindings[path].cast;
          if (_.isFunction(this.bindings[path].cast)) {
            args = [];
            caster = castOptions;
          } else if (_.isArray(this.bindings[path].cast)) {
            args = castOptions.slice(1);
            caster = castOptions[0];
          }
          if (!args || typeof caster !== 'function') {
            throw new Error("options.bindings[path].cast is expected to be a function or function + arguments array ex: {cast: [parseInt, 10]}");
          }
          args.unshift(value);
          value = caster.apply(this.model, args) || value;
        }
        return value;
      };

      Ligaments.prototype.matchToken = function(key, token) {
        if (token === '{n}') {
          Number(key) % 1 === 0;
        }
        if (token === '{s}') {
          typeof key === string;
        }
        if (parseInt(token, 10) % 1 === 0) {
          key === parseInt(token, 10);
        }
        return key === token;
      };

      Ligaments.prototype.expand = function(flat) {
        var child, out, parent, path, set, token, tokens, value, _i, _j, _len, _len1;
        if (flat.constructor !== Array) {
          flat = [flat];
        }
        for (_i = 0, _len = flat.length; _i < _len; _i++) {
          set = flat[_i];
          for (path in set) {
            if (!__hasProp.call(set, path)) continue;
            value = set[path];
            tokens = this.tokenize(path).reverse();
            value = _.result(set, path);
            if (tokens[0] === '{n}' || !isNaN(Number(tokens[0]))) {
              (child = [])[tokens[0]] = value;
            } else {
              (child = {})[tokens[0]] = value;
            }
            tokens.shift();
            for (_j = 0, _len1 = tokens.length; _j < _len1; _j++) {
              token = tokens[_j];
              if (!isNaN(Number(token))) {
                (parent = [])[parseInt(token, 10)] = child;
              } else {
                (parent = {})[token] = child;
              }
              child = parent;
            }
            this.merge((out = out || (out = {})), child);
          }
        }
        return out;
      };

      Ligaments.prototype.flatten = function(data, separator, depthLimit) {
        var curr, el, key, out, path, stack;
        if (separator == null) {
          separator = '.';
        }
        if (depthLimit == null) {
          depthLimit = false;
        }
        data = this.merge({}, data);
        path = '';
        stack = [];
        out = {};
        while (_.keys(data).length > 0) {
          if (_.isArray(data) && data.length > 0) {
            key = data.length - 1;
            el = data.pop();
          } else {
            key = _.keys(data)[0];
            el = data[key];
            delete data[key];
          }
          if ((el == null) || path.split(separator).length === depthLimit || typeof el !== 'object' || el.nodeType || (typeof el === 'object' && (el.constructor === Date || el.constructor === RegExp || el.constructor === Function))) {
            out[path + key] = el;
          } else {
            if (_.keys(data).length > 0) {
              stack.push([data, path]);
            }
            data = el;
            path += key + separator;
          }
          if (_.keys(data).length === 0 && stack.length > 0) {
            curr = stack.pop();
            data = curr[0], path = curr[1];
          }
        }
        return out;
      };

      Ligaments.prototype.merge = function() {
        var key, object, objects, out, value, _i, _len;
        objects = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        out = objects.shift();
        for (_i = 0, _len = objects.length; _i < _len; _i++) {
          object = objects[_i];
          for (key in object) {
            if (!__hasProp.call(object, key)) continue;
            value = object[key];
            if (out[key] && value && (_.isObject(out[key]) && _.isObject(value) || out[key].constructor === Array)) {
              out[key] = this.merge(out[key], value);
            } else {
              out[key] = value;
            }
          }
        }
        return out;
      };

      Ligaments.prototype.dotToBracketNotation = function(path, reverse) {
        if (reverse == null) {
          reverse = false;
        }
        if (!path) {
          throw new TypeError('Not Enough Arguments');
        }
        if (reverse) {
          return path.replace(/\]/g, '').split('[').join('.');
        } else {
          return path.replace(/([\w]+)\.?/g, '[$1]').replace(/^\[(\w+)\]/, '$1');
        }
      };

      Ligaments.prototype.tokenize = function(path) {
        if (path.indexOf('[') === -1) {
          return path.split('.');
        } else {
          return _.map(path.split('['), function(v) {
            v = v.replace(/\]/, '');
            if (v === '') {
              return '{n}';
            } else {
              return v;
            }
          });
        }
      };

      return Ligaments;

    })();
    if (typeof window === 'object' && (window.Backbone != null)) {
      return Backbone.Ligament = Backbone.Ligaments = Ligaments;
    } else if (typeof exports === 'object') {
      return module.exports = Ligaments;
    } else {
      return Ligaments;
    }
  });

}).call(this);
