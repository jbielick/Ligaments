/**
 * Create needed mixin methods for Underscore
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
		var $bound = $(el).find('[name], [data-ligament]'),
			flat = {},
			name;

		$bound.each(function() {
			var _$this = $(this);
			name = _$this.attr('name');
			if (name) {
				name = name.replace(/\[.{0}\]/g, function() {return '[' + $bound.filter('[name="' + name + '"]').index(_$this) + ']'});
			}
			flat[name] = _$this.val();
		});
		return _._expand(flat);
	},
	this.matchToken = function(key, token) {
		if (token === '{n}')
			return (Number(key) % 1 === 0)
		if (token === '{s}')
			return typeof key === 'string'
		if (Number(token) % 1 === 0)
			return (key == token)
		return (key === token)
	},
	this.expand = function(data) {
		var path, tokens, parent, child, out = {}, cleanPath, val, curr;
			
		if(!data.length) {
			data = [data];
		}
		
		for (var i = 0; i < data.length; i++) {
			curr = data[i];
			for (var path in curr) if (curr.hasOwnProperty(path)) {
				tokens = _._tokenize(path).reverse();
				val = typeof curr[path] === 'function' ? curr[path]() : curr[path]
				if (tokens[0] === '{n}' || !isNaN(Number(tokens[0])) ) {
					child = [];
					child[tokens[0]] = val;
				} else {
					child = {};
					child[tokens[0]] = val;
				}
				tokens.shift();
				for (var z = 0; z < tokens.length; z++) {
					if (tokens[z] === '{n}' || !isNaN(Number(tokens[z]))) {
						parent = [], parent[tokens[z]] = child
					} else {
						parent = {}, parent[tokens[z]] = child
					}
					child = parent;
				}
				out = _._merge(true, out, child);
			}
		}
		return out;
	},
	this.get = function(data, path) {
		var out = typeof data.toJSON === 'function' ? data.toJSON() : data,
			tokens = _._tokenize(path);
		
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
			return _._simpleOp('insert', data, tokens, values, options)
		}
		if (_.keys(data).length) {
			token = tokens.shift()
			nextPath = tokens.join('.')
			for (var key in data) if (data.hasOwnProperty(key)) {
				if (_._matchToken(key, token)) {
					if(!nextPath) {
						data[key] = values
					} else {
						data[key] = _._insert(data[key], nextPath, values)
					}
				}
			}
		} else {
			expand[path] = values
			return _._expand([expand])
		}
		return data
	},
	this.remove = function(data, path) {
		var tokens = _._tokenize(path), match, token, nextPath, removed
		if (path.indexOf('{') === -1) {
			return _._simpleOp('remove', data, tokens)
		}
		token = tokens.shift()
		nextPath = tokens.join('.')
		for (var key in data) if (data.hasOwnProperty(key)) {
			match = _._matchToken(key, token)
			if (match && typeof data[key] === 'object') {
				data[key] = _.remove(data[key], nextPath)
			} else if (match) {
				if (Array.isArray(data)) {
					data.splice(key,1)
				} else {
					delete data[key]
				}
			}
		}
		return data
	},
	this.simpleOp = function(op, data, tokens, value, options) {
		var hold = data, removed
		for (var i = 0; i < tokens.length; i++) {
			if (op === 'insert') {
				if (i === tokens.length-1) {
					if (hold && typeof hold.set === 'function') {
						hold.set(tokens[i], value, options);
					} else if (hold) {
						hold[tokens[i]] = value
					}
					return data
				}
				if ((typeof hold[tokens[i]] !== 'object' && !hold.get && !hold.at)
					|| (typeof hold.at === 'function' && typeof hold.at(tokens[i]) !== 'object')
					|| (typeof hold.attributes && hold.get === 'function' && typeof hold.get(tokens[i]) !== 'object')) {
					if (!isNaN(Number(tokens[i+1]))) {
						if (typeof hold.set === 'function') {
							hold.set(tokens[i], [], options);
						} else {
							hold[tokens[i]] = [];
						}
					} else {
						if (typeof hold.set === 'function') {
							hold.set(tokens[i], {}, options);
						} else {
							hold[tokens[i]] = {};
						}
					}
				}
				if (typeof hold.at === 'function') {
					hold = hold.at(Number(tokens[i]));
				} else if (typeof hold.get === 'function') {
					hold = hold.get(tokens[i]);
				} else {
					hold = hold[tokens[i]];
				}
			} else if (op === 'remove') {
				if (i === tokens.length-1) {
					removed = _._insert({}, 'item', hold[tokens[i]])
					if (Array.isArray(hold)) {
						hold.splice(tokens[i],1)
					} else {
						delete hold[tokens[i]]
					}
					data = removed.item
					return data
				}
				if (typeof hold[tokens[i]] === 'undefined') {
					return data
				}
				hold = hold[tokens[i]]
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
			wrap = separator === ']['

		while (_.keys(data).length || data.length) {
			if (_.isArray(data)) {
				key = data.length-1
				el = data.pop()
			} else {
				key = _.keys(data)[0];
				el = data[key];
				delete data[key];
			}
			if (path.split(separator).length === depth || typeof el !== 'object' || el == null || el.nodeType) {
				out[path + key] = el || '';
			} else {
				if (_.keys(data).length > 0) {
					stack.push([data,path]);
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
		return out
	},
	this.merge = function() {
		var obs = Array.prototype.slice.call(arguments), out, dest = false
		
		if (typeof arguments[0] === 'boolean')
			dest = obs.shift()
			
		out = obs.shift()
		for (var i = 0; i < obs.length; i++) {
			for (var key in obs[i]) if (obs[i].hasOwnProperty(key)) {
				if (typeof obs[i][key] === 'object' && out[key] && !obs[i][key].nodeType)
					out[key] = _._merge(dest, out[key], obs[i][key])
				else
					out[key] = obs[i][key]
			}
		}
		return out
	},
	this.dotToBracketNotation = function(path, reverse) {
		if (!path) {
			throw new TypeError('Not enough arguments');
		}
		if (reverse) {
			return path.replace(/\[(\w+)\]/g, '.$1');
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

_.extend(Backbone.Model.prototype, {
	bindView: function(view, readOnly) {
		var _this = this;

		this.views = this.views || [];
		this.readOnly = readOnly || false;
		this.views.push(view);

		view.listenTo(this, 'change', function() {
			_this._inject.call(_this, view);
		});

		if (!this.readOnly) {
			this.set(_._parseModel(view.$el));
			view.events = _.extend((view.events || {}), {
				'input *[name]': function(e) {
					_this.target = e.target;
					_this._set(e, this);
					delete _this.target;
				},
				'change *[name]': function(e) {
					_this.target = e.target;
					_this._set(e, this);
					delete _this.target;
				}
			});
		}

		return this;
	},
	_set: function(e, view) {
		var tokens = _._tokenize(e.target.getAttribute('name')),
			val = $(e.target).val();

		this.set(_.extend(this.toJSON(), _._parseModel(view.$el)));
		this.trigger('input', e, this);
	},
	_inject: function(view) {
		if (this.lockBinding) {
			return this;
		}
		var _this = this,
			changed = _._flatten(view.beforeRender ? (view.beforeRender(this.changed) || this.changed) : this.changed);
		_.each(changed, function(v, k) {
			_.each(_this.views, function(view) {
				var $bound = view.$('[name="'+k+'"], [name="'+_._dotToBracketNotation(k)+'"]').not(_this.target);
				if ($bound.is(':input')) {
					$bound.val(v);
				} else if ($bound.is('img')) {
					$bound.attr('src', v);
				} else {
					$bound.html(v);
				}
			});
		});
	}
})
