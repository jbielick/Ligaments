/**
 * ligaments.js
 * 
 * Licensed under GNU GENERAL PUBLIC LICENSE
 *
 * Author: Josh Bielick (http://github.com/jbielick)
 */
var Hash = new function(_) {
	this.extract = function(data, path) {
		if(!new RegExp('[{\[]').test(path)) {
			return _._get(data, path) || [];
		}
		var tokens = _._tokenize(path),
			got = [],
			out = [],
			context = {set: [data]};

		for (var i = 0; i < tokens.length; i++) {
			got = []
			for (var z = 0; z < context.set.length; z++) {
				for (var key in context.set[z]) if (context.set[z].hasOwnProperty(key)) {
					if (_._matchToken(key, tokens[i])) {
						got.push(context.set[z][key]);
					}
				}
			}
			context.set = got;
		}
		return context.set;
	},
	this.parseModel = function(el, returnInputs) {
		var $bound = $(el).find('[name], [data-bind]'),
			flat = {},
			_$this,
			name;

		$bound.each(function() {
			_$this = $(this);
			name = _$this.attr('name');
			if (name) {
				name = name.replace(/\[.{0}\]/g, function() {return '[' + $bound.filter('[name="' + name + '"]').index(_$this) + ']'});
			}

			if (_$this.is(':input')) {
				if ((!_$this.is(':checkbox') || _$this.prop('checked')) && (!_$this.is(':radio') || _$this.prop('checked'))) {
					flat[name] = _$this.val();
				}
			} else {
				flat[name] = _$this.text();
			}
		});
		return this._expand(flat);
	},
	this.matchToken = function(key, token) {
		if (token === '{n}') {
			return (Number(key) % 1 === 0);
		}
		if (token === '{s}') {
			return typeof key === 'string';
		}
		if (Number(token) % 1 === 0) {
			return (key == token);
		}
		return (key === token);
	},
	this.expand = function(flattened) {
		var out = {}, path, tokens, parent, child, cleanPath, val, current;

		if(flattened.constructor !== Array) {
			flattened = [flattened];
		}

		for (var i = 0; i < flattened.length; i++) {
			current = flattened[i];
			for (var path in current) if (current.hasOwnProperty(path)) {
				tokens = _._tokenize(path).reverse();
				val = _.result(current, path);
				if (tokens[0] === '{n}' || !isNaN(Number(tokens[0])) ) {
					child = [];
					child[tokens[0]] = val;
				} else {
					child = {};
					child[tokens[0]] = val;
				}
				tokens.shift();
				for (var z = 0; z < tokens.length; z++) {
					if (!isNaN(Number(tokens[z]))) {
						(parent = [])[parseInt(tokens[z], 10)] = child;
					} else {
						(parent = {})[tokens[z]] = child;
					}
					child = parent;
				}
				this._merge(out, child);
			}
		}
		return out;
	},
	this.get = function(data, path) {
		var out = typeof data.toJSON === 'function' ? data.toJSON() : data,
			tokens = this._tokenize(path);

		for (var i = 0; i < tokens.length; i++) {
			if (typeof out === 'object') {
				if (typeof out.get === 'function') {
					out = out.get(tokens[i]);
				} else if ( typeof out[tokens[i]] !== 'undefined') {
					out = out[tokens[i]];
				} else {
					return null;
				}
			} else {
				return null;
			}
		}
		return out
	},
	this.insert = function(data, path, values, options) {
		var tokens = _._tokenize(path), token, nextPath, expand = {}
		if (path.indexOf('{') === -1 && path.indexOf('[]') === -1) {
			return this._simpleOp('insert', data, tokens, values, options);
		}
		if (_.keys(data).length) {
			token = tokens.shift();
			nextPath = tokens.join('.');
			for (var key in data) if (data.hasOwnProperty(key)) {
				if (_._matchToken(key, token)) {
					if(!nextPath) {
						data[key] = values;
					} else {
						data[key] = this._insert(data[key], nextPath, values);
					}
				}
			}
		} else {
			expand[path] = values;
			return this._expand([expand]);
		}
		return data;
	},
	this.remove = function(data, path) {
		var tokens = this._tokenize(path),
			match,
			token,
			nextPath,
			removed;

		if (path.indexOf('{') === -1) {
			return this.simpleOp('remove', data, tokens);
		}
		token = tokens.shift()
		nextPath = tokens.join('.')
		for (var key in data) if (data.hasOwnProperty(key)) {
			match = this._matchToken(key, token);
			if (match && typeof data[key] === 'object') {
				data[key] = this._remove(data[key], nextPath);
			} else if (match) {
				if (Array.isArray(data)) {
					data.splice(key,1);
				} else {
					delete data[key];
				}
			}
		}
		return data;
	},
	this.simpleOp = function(op, data, tokens, value, options) {
		var hold = data,
			removed;

		for (var i = 0; i < tokens.length; i++) {
			if (op === 'insert') {
				if (i === tokens.length-1) {
					if (hold) {
						hold[tokens[i]] = value;
					}
					return data;
				}
				if (typeof hold[tokens[i]] !== 'object') {
					if (!isNaN(Number(tokens[i+1]))) {
						hold[tokens[i]] = [];
					} else {
						hold[tokens[i]] = {};
					}
				}
				hold = hold[tokens[i]];
			} else if (op === 'remove') {
				if (i === tokens.length-1) {
					removed = _._insert({}, 'item', hold[tokens[i]]);
					if (Array.isArray(hold)) {
						hold.splice(tokens[i],1);
					} else {
						delete hold[tokens[i]];
					}
					data = removed.item;
					return data;
				}
				if (typeof hold[tokens[i]] === 'undefined') {
					return data;
				}
				hold = hold[tokens[i]];
			}
		}
	},
	this.tokenize = function(path, bracketed) {
		if (path.indexOf('[') === -1) {
			return path.split('.')
		} else {
			return _.map(path.split('['), function(v) {
				v = v.replace(/\]/, '');
				return v === '' ? '{n}' : v;
			});
		}
	},
	this.flatten = function(data, separator, depth) {
		var path = '',
			stack = [],
			out = {},
			data = _.extend({}, data),
			key,
			el,
			curr,
			separator = separator || '.',
			depth = depth || false,
			wrap = separator === '][';

		while (_.keys(data).length || data.length) {
			if (_.isArray(data)) {
				key = data.length-1;
				el = data.pop();
			} else {
				key = _.keys(data)[0];
				el = data[key];
				delete data[key];
			}
			if (path.split(separator).length === depth || typeof el !== 'object' || el == null || el.nodeType) {
				out[path + key] = el || '';
			} else {
				if (_.keys(data).length > 0) {
					stack.push([data, path]);
				}
				data = el;
				path += key + separator;
			}
			if (_.keys(data).length === 0 && stack.length) {
				curr = stack.pop();
				data = curr[0];
				path = curr[1];
			}
		}
		return out;
	},
	this.merge = function() {
		var _this = this,
			objects = Array.prototype.slice.call(arguments),
			out = objects.shift(),
			bucket,
			current;

		for (var i = 0; i < objects.length; i++) {
			current = objects[i];
			_.each(_.keys(current), function(key) {
				if (out[key] && current[key] && _.isObject(out[key]) && _.isObject(current[key])) {
					out[key] = _this._merge(out[key], current[key]);
				} else {
					out[key] = current[key];
				}
			});
		}
		return out;
	},
	this.dotToBracketNotation = function(path, reverse) {
		if (!path) {
			throw new TypeError('Not enough arguments');
		}
		if (reverse) {
			return path.replace(/\]/g, '').split('[').join('.');
		} else {
			return path.replace(/([\w]+)\.?/g, '[$1]').replace(/^\[(\w+)\]/, '$1');
		}
	}
	return this;
}(_);

_.mixin({
	_extract: Hash.extract,
	_parseModel: Hash.parseModel,
	_matchToken: Hash.matchToken,
	_expand: Hash.expand,
	_get: Hash.get,
	_insert: Hash.insert,
	_remove: Hash.remove,
	_simpleOp: Hash.simpleOp,
	_tokenize: Hash.tokenize,
	_flatten: Hash.flatten,
	_merge: Hash.merge,
	_dotToBracketNotation: Hash.dotToBracketNotation
});

;(function(factory) {
    if (typeof define === 'function' && define.amd) {
        define(['underscore', 'backbone'], factory);
    } else {
        factory(_, Backbone);
    }
}(function(_, Backbone) {

	var Ligaments = Backbone.Ligaments = function(options) {
		var data;
		this.cid = _.uniqueId('ligament');
		options || (options = {});
		this.ensureArguments.call(this, options);
		_.extend(this, _.pick(options, ligamentOptions));
		this.bootstrap();
		this.createBindings();
		data = _._parseModel(this.view.$el);
		if (this.parse) {
			data = this.model.parse(data) || data;
		}
		if (!this.readOnly) {
			this.model.set(data);
		}
		// this.model.trigger('change', this.model, _._flatten(this.model.toJSON()));
	};

	var ligamentOptions	 = ['readOnly', 'view', 'model', 'bindings', 'binds', 'parse'];

	_.extend(Ligaments.prototype, {
		createBindings: function() {
			var ingest = _.bind(this.ingest, this);
			var inject = _.bind(this.inject, this);

			this.view.listenTo(this.model, 'change', inject);

			if (!this.readOnly) {
				_.extend((this.view.events || (this.view.events = {})), {
					'change *[name]'		: ingest,
					'input *[name]'			: ingest,
					'change *[data-bind]' 	: ingest,
					'input *[data-bind]' 	: ingest
				});
				this.view.delegateEvents();
			}
		},
		ensureArguments: function(options) {
			if (!options.view || !options.model) {
				throw new Error('You must provide an instance of a Backbone view and model');
			}
		},
		ingest: function(e) {
			var _this = this,
				$input,
				key,
				value,
				data;

			if (!this.readOnly) {
				this.target = e.target;

				$input = $(e.target);
				key = $input.attr('name');

				if (key && key.indexOf('[')) {
					key = key.replace(/\[\]/g, function() {return '[' + _this.view.$('[name]').filter('[name="' + key + '"]').index($input) + ']'});
					key = _._dotToBracketNotation(key, true);
				}

				if (!$input.is(':checkbox') || $input.prop('checked')) {
					value = $input.val();
				}
				if ($input.is('select[multiple]')) {
					this.model.unset(key);
				}
				
				(data = {})[key] = value;
				data = _._expand(data);
				if (this.parse) {
					data = this.model.parse(data) || data;
				}

				if (value === undefined) {
					this.model.unset(key);
				} else {
					this.model.set(data);
				}

				delete this.target;
			}
		},
		bootstrap: function() {
			this.inject(this.model, {bootstrap: _._flatten(this.model.toJSON())});
		},
		inject: function(model, options) {
			var _this = this,
				view = this.view,
				changed = options.bootstrap || model.changedAttributes();

			if (view.lockBinding) {
				return this;
			}

			if (_.isFunction(view.beforeInject)) {
				view.beforeInject(model, changed);
			}

			changed = _._flatten(changed);

			_.each(changed, function(value, path) {
				if (!_this.binds || _.indexOf(_this.binds, path) > -1) {

					if (/[0-9]+/.test(path.split('').pop())) {
						path = path.split('.');
						path.pop();
						path = path.join('.');
					}
					var nameAttr = _._dotToBracketNotation(path),
						nameSelector = nameAttr.replace(/(.*\[)([0-9]+)?(\].*)/g, '[name="$1$3"]:eq($2)'),
						$bound = view.$('[name="'+path+'"], '+nameSelector+', [name="'+nameAttr+'"]').not(_this.target);

					if ($bound.is(':input')) {
						if ($bound.length > 1) {
							$bound.prop('checked', false).filter('[value="'+value+'"]').prop('checked', true);	
						} else {
							if ($bound.is('select[multiple]')) {
								$bound.val(_this.model.get(path));
							} else {
								$bound.val(value);
							}
						}
					} else if ($bound.is('img, svg')) {
						$bound.attr('src', value);
					} else {
						$bound.html(value);
					}
				}
			});
		}
	});
}));
