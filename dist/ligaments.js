
/*
  *  Backbone.Ligaments
  * 	  Declarative view-model data binding for Backbone.js
  *  
  *  Author: Josh Bielick
  *  License: GNU GENERAL PUBLIC LICENSE
  *
 */

(function() {
  var __hasProp = {}.hasOwnProperty,
    __slice = [].slice;

  (function(factory) {
    if (typeof define === 'function' && define.amd) {
      return define(['underscore', 'backbone'], factory);
    } else {
      return factory(_, Backbone);
    }
  })(function(_, Backbone) {
    var Ligaments, ligamentOptions;
    Ligaments = Backbone.Ligaments = function(options) {
      this.cid = _.uniqueId('ligament');
      options || (options = {});
      this.ensureArguments.call(this, options);
      _.extend(this, _.pick(options, ligamentOptions));
      if (options.bootstrap !== false) {
        this.bootstrap();
      }
      this.createBindings();
      if (!this.readOnly && options.ingest !== false) {
        return this.model.set(this.parseModel());
      }
    };
    ligamentOptions = ['view', 'model', 'readOnly', 'bindings'];
    return _.extend(Ligaments.prototype, {
      createBindings: function() {
        var ingest, inject;
        ingest = _.bind(this.ingest, this);
        inject = _.bind(this.inject, this);
        this.view.listenTo(this.model, 'change', inject);
        if (!this.readOnly) {
          _.extend(this.view.events || (this.view.events = {}), {
            'change *[name]:not([data-bind])': ingest,
            'input *[name]:not([data-bind])': ingest,
            'change *[data-bind]': ingest,
            'input *[data-bind]': ingest
          });
          return this.view.delegateEvents(this.view.events);
        }
      },
      ensureArguments: function(options) {
        if (!options.view || !options.model) {
          return console.warn('You must provide an instance of a Backbone view and model');
        }
      },
      ingest: function(e) {
        var $input, data, key, value, _this;
        _this = this;
        if (!this.readOnly) {
          $input = $((this.target = e.target));
          key = $input.data('bind') || $input.attr('name');
          if (key && key.indexOf('[' > -1)) {
            key = key.replace(/\[\]/g, (function(_this) {
              return function() {
                return '[' + _this.view.$('[name]').filter('[name="' + key + '"]').index($input) + ']';
              };
            })(this));
            key = this.dotToBracketNotation(key, true);
          }
          value = this.getVal($input);
          if ($input.is('select[multiple]')) {
            this.model.unset(key);
          }
          (data = {})[key] = value;
          data = this.expand(data);
          if (this.parse && _.isFunction(this.model.parse)) {
            this.model.parse(data);
          }
          if (value == null) {
            this.model.unset(key);
          } else {
            this.model.set(data);
          }
          return delete this.target;
        }
      },
      bootstrap: function() {
        return this.inject(this.model, {
          bootstrap: this.flatten(this.model.toJSON())
        });
      },
      inject: function(model, options) {
        var $bound, $checkbox, changed, path, value, _results;
        changed = options.bootstrap || model.changedAttributes();
        if (this.lockBinding) {
          return this;
        }
        if (_.isFunction(this.view.beforeInject)) {
          this.view.beforeInject(model, changed);
        }
        changed = this.flatten(changed);
        _results = [];
        for (path in changed) {
          if (!__hasProp.call(changed, path)) continue;
          value = changed[path];
          if (!this.binds || _.indexOf(this.binds, path) > -1) {
            $bound = this.getBound(path);
            if ($bound.length) {
              if ($bound.is(':input')) {
                if ($bound.is(':checkbox')) {
                  if ($bound.length > 1) {
                    $checkbox = $bound.prop('checked', false).filter('[value="' + value + '"]');
                  } else {
                    $checkbox = $bound;
                  }
                  _results.push($bound.prop('checked', function() {
                    return value && value.toString().toLowerCase() !== 'off' && (value.toString().toLowerCase() !== 'false');
                  }));
                } else if ($bound.is('select[multiple]')) {
                  _results.push($bound.val(this.model.get(path)));
                } else {
                  _results.push($bound.val(value));
                }
              } else if ($bound.is('img, svg')) {
                _results.push($bound.attr('src', value));
              } else {
                _results.push($bound.html(value));
              }
            } else {
              _results.push(void 0);
            }
          } else {
            _results.push(void 0);
          }
        }
        return _results;
      },
      parseModel: function() {
        var $bound, flat;
        $bound = this.view.$el.find('[name], [data-bind]');
        flat = {};
        $bound.each((function(_this) {
          return function(idx, el) {
            var $this, name;
            $this = $(el);
            name = $this.data('bind') || $this.attr('name');
            name = name.replace(/\[\]/g, function() {
              return '[' + $bound.filter('[data-bind="' + name + '"], [name="' + name + '"]').index($this) + ']';
            });
            if (typeof _this.getVal($this) !== 'undefined') {
              return flat[name] = _this.getVal($this);
            }
          };
        })(this));
        return this.expand(flat);
      },
      getBound: function(path) {
        var eqNameSelector, nameAttribute, nameSelectors;
        if (/[0-9]+/.test(path.split('').pop())) {
          path = path.split('.');
          path.pop();
          path = path.join('.');
        }
        nameAttribute = this.dotToBracketNotation(path);
        eqNameSelector = nameAttribute.replace(/(.*\[)([0-9]+)?(\].*)/g, '[name="$1$3"]:eq($2)');
        nameSelectors = '[data-bind="' + path + '"], [name="' + path + '"] ' + eqNameSelector + ', [name="' + nameAttribute + '"]';
        return this.view.$(nameSelectors).not(this.target);
      },
      getVal: function(input) {
        var $input;
        $input = $(input);
        if ($input.is(':input')) {
          if ((!$input.is(':checkbox') && !$input.is(':radio')) || $input.prop('checked')) {
            return $input.val();
          } else {
            return void 0;
          }
        } else {
          return $input.text();
        }
      },
      matchToken: function(key, token) {
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
      },
      expand: function(flat) {
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
      },
      flatten: function(data, separator, depthLimit) {
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
        while ((_.keys(data).length)) {
          if (_.isArray(data) && data.length > 0) {
            key = data.length - 1;
            el = data.pop();
          } else {
            key = _.keys(data)[0];
            el = data[key];
            delete data[key];
          }
          if ((el == null) || path.split(separator).length === depthLimit || typeof el !== 'object' || el.nodeType || (typeof el === 'object' && (el.constructor === Date || el.constructor === RegExp || el.constructor === Function)) || el.constructor !== Object) {
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
      },
      merge: function() {
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
      },
      dotToBracketNotation: function(path, reverse) {
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
      },
      tokenize: function(path) {
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
      }
    });
  });

}).call(this);
