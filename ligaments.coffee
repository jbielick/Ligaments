###
 #  Backbone.Ligaments
 # 	  Declarative view-model data binding for Backbone.js
 #  
 #  Author: Josh Bielick
 #  License: GNU GENERAL PUBLIC LICENSE
 # 
###
Hash = new () ->
	@extract = (data, path) -> 
		if not (new RegExp "{|\[") .test path
			(_._get data, path) or []
		tokens = _._tokenize path
		context = set: [data]

		for token in tokens
			got = []
			for own item of context.set
				for key in item
					if _._matchToken key, token
						got.push item
			context.set = got
		context.set

	@parseModel = (el) ->
		$bound = $(el).find('[name], [data-ligament]')
		flat = {}

		$bound.each () -> 
			$this = $(this)
			name = $this.attr('name') || $this.attr('data-bind')
			if name
				name = name.replace /\[\]/g, () ->
					'['+$bound.filter('[name="'+name+'"]').index($this) + ']'
				if $this.is(':input') and (not $this.is(':checkbox') or $this.prop('checked')) and (not $this.is(':radio') or $this.prop(':checked'))
					flat[name] = $this.val()
				else
					flat[name] = $this.text()

		_._expand flat

	@matchToken = (key, token) ->
		if token is '{n}'
			Number(key) % 1 is 0
		if token is '{s}'
			typeof key is string
		if parseInt(token, 10) % 1 is 0
			key is parseInt token, 10
		key is token

	@expand = (flat) ->

		if (flat.constructor isnt Array)
			flat = [flat]

		for set in flat
			for own path, value of set
				tokens = _._tokenize(path).reverse()
				value = _.result set, path
				if tokens[0] is '{n}' or not isNaN Number tokens[0]
					(child = [])[tokens[0]] = value;
				else
					(child = {})[tokens[0]] = value;
				tokens.shift()
				for token in tokens
					if not isNaN Number token
						(parent = [])[parseInt(token, 10)] = child
					else
						(parent = {})[token] = child
					child = parent
				_._merge((out = out || out = {}), child)
		out

	@get = (data, path) ->
		tokens = _._tokenize path
		out = data

		for token in tokens
			if typeof out is 'object'
				if (_.isFunction out.get)
					out = out.get token
				else if out[token]?
					out = out[token]
				else
					undefined
			else
				undefined
		out

	@tokenize = (path) -> 
		if path.indexOf('[') is -1
			path.split '.'
		else
			_.map path.split('['), (v) ->
				v = v.replace /\]/, ''
				if v is '' then '{n}' else v

	@flatten = (data, separator = '.', depthLimit = false) ->
		data = _._merge {}, data
		path = ''
		stack = []

		while _.keys(data).length or data.length
			if _.isArray data
				key = data.length - 1
				el = data.pop()
			else
				key = _.keys(data)[0]
				el = data[key]
				delete data[key]
			if path.split(separator).length is depthLimit or typeof el isnt 'object' or el.nodeType
				(out = {})[path + key] = el
			else
				if _.keys(data).length > 0
					(stack = stack or []).push [data, path]
				data = el
				path += key + separator
			if (_.keys(data).length is 0 and stack.length > 0)
				curr = stack.pop()
				[data, path] = curr
		out

	@merge = (objects...) ->
		_this = @
		out = objects.shift()

		for object in objects
			for own key, value of object
				if out[key] and value and _.isObject(out[key]) and _.isObject(value)
					out[key] = _._merge out[key], value
				else
					out[key] = value
		out

	@dotToBracketNotation = (path, reverse = false) ->
		if not path
			throw new TypeError 'Not Enough Arguments'
		if reverse
			path.replace(/\]/g, '').split('[').join('.')
		else
			path.replace(/([\w]+)\.?/g, '[$1]').replace(/^\[(\w+)\]/, '$1')
	Hash

_.mixin
	_parseModel				: Hash.parseModel,
	_matchToken				: Hash.matchToken,
	_expand					: Hash.expand,
	_get					: Hash.get
	_tokenize				: Hash.tokenize,
	_flatten				: Hash.flatten,
	_merge					: Hash.merge,
	_dotToBracketNotation	: Hash.dotToBracketNotation

((factory) -> 
	if typeof define is 'function' and define.amd
		define ['underscore', 'backbone'], factory
	else
		factory _, Backbone
)( (_, Backbone) ->
	Ligaments = Backbone.Ligaments = (options) ->
		@cid = _.uniqueId('ligament');
		options || (options = {})
		@ensureArguments.call(this, options)
		_.extend @, _.pick(options, ligamentOptions)
		@bootstrap()
		@createBindings()
		@model.set(_._parseModel(@view.$el)) if not @readOnly
		# @model.trigger 'change', @model, _._flatten(@model.toJSON())

	ligamentOptions = ['view', 'model', 'readOnly', 'bindings']

	_.extend Ligaments.prototype, 
		createBindings: () ->
			ingest = _.bind @ingest, @
			inject = _.bind @inject, @

			@view.listenTo @model, 'change', inject
			if not @readOnly
				_.extend (@view.events || (@view.events = {})), 
					'change *[name]'		: ingest,
					'input *[name]'			: ingest,
					'change *[data-bind]' 	: ingest,
					'input *[data-bind]' 	: ingest
				@view.delegateEvents()
		ensureArguments: (options) ->
			if not options.view or not options.model
				throw new Error 'You must provide an instance of a Backbone view and model'
		ingest: (e) ->
			_this = this

			if not @readOnly
				$input = $ (@target = e.target)
				key = $input.attr('name') || $input.attr('data-bind')

				if key and key.indexOf '[' > -1
					key = key.replace(/\[\]/g, () => '[' + @view.$('[name]').filter('[name="' + key + '"]').index($input) + ']')
					key = _._dotToBracketNotation key, true

				if not $input.is(':checkbox') or $input.prop 'checked'
					value = $input.val()
				if $input.is 'select[multiple]'
					@model.unset key

				(data = {})[key] = value

				data = _._expand data

				(@model.parse data) if @parse and _.isFunction @model.parse

				if not value? then @model.unset key else @model.set data

				delete @target
		bootstrap: () ->
			@inject @model, bootstrap: _._flatten @model.toJSON()
		inject: (model, options) ->
			changed = options.bootstrap or model.changedAttributes()

			if @lockBinding then return @

			if _.isFunction @view.beforeInject then @view.beforeInject model, changed

			changed = _._flatten changed

			for own path, value of changed
				if not @binds or _.indexOf(@binds, path) > -1
					if /[0-9]+/.test path.split('').pop()
						path = path.split('.')
						path.pop()
						path = path.join('.')

					nameAttribute = _._dotToBracketNotation path
					eqNameSelector = nameAttribute.replace(/(.*\[)([0-9]+)?(\].*)/g, '[name="$1$3"]:eq($2)')
					nameSelectors = '[data-bind="'+path+'"], [name="'+path+'"] '+eqNameSelector+', [name="'+nameAttribute+'"]'

					$bound = @view.$(nameSelectors).not(@target)

					if $bound.is ':input'
						if $bound.length > 1
							$bound.prop('checked', false).filter('[value="'+value+'"]').prop 'checked', true
						else
							if $bound.is 'select[multiple]'
								$bound.val @model.get path
							else
								$bound.val value
					else if $bound.is 'img, svg'
						$bound.attr 'src', value
					else
						$bound.html value
)