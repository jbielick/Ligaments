###
 #  Backbone.Ligaments
 # 	  Declarative view-model data binding for Backbone.js
 #  
 #  Author: Josh Bielick
 #  License: GNU GENERAL PUBLIC LICENSE
 # 
###

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
		@bootstrap() unless options.bootstrap is false
		@createBindings()
		@model.set(@parseModel()) if not @readOnly and options.ingest isnt false

	ligamentOptions = ['view', 'model', 'readOnly', 'bindings']

	_.extend Ligaments.prototype, 
		createBindings: () ->
			ingest = _.bind @ingest, @
			inject = _.bind @inject, @

			@view.listenTo @model, 'change', inject
			if not @readOnly
				_.extend (@view.events || (@view.events = {})), 
					'change *[name]:not([data-bind])'			: ingest,
					'input *[name]:not([data-bind])'			: ingest,
					'change *[data-bind]' 						: ingest,
					'input *[data-bind]' 						: ingest
				@view.delegateEvents(@view.events)
		ensureArguments: (options) ->
			if not options.view or not options.model
				console.warn 'You must provide an instance of a Backbone view and model'
		ingest: (e) ->
			_this = this

			if not @readOnly
				$input = $ (@target = e.target)
				key = $input.data('bind') or $input.attr('name')

				if key and key.indexOf '[' > -1
					key = key.replace(/\[\]/g, () => '[' + @view.$('[name]').filter('[name="' + key + '"]').index($input) + ']')
					key = @dotToBracketNotation key, true

				value = @getVal($input)

				if $input.is 'select[multiple]'
					@model.unset key

				(data = {})[key] = value

				data = @expand data

				(@model.parse data) if @parse and _.isFunction @model.parse

				if not value? then @model.unset key else @model.set data

				delete @target
		bootstrap: () ->
			@inject @model, bootstrap: @flatten @model.toJSON()
		inject: (model, options) ->
			changed = options.bootstrap or model.changedAttributes()

			if @lockBinding then return @

			if _.isFunction @view.beforeInject then @view.beforeInject model, changed

			changed = @flatten changed

			for own path, value of changed
				if not @binds or _.indexOf(@binds, path) > -1
					$bound = @getBound(path)

					if $bound.length
						if $bound.is ':input'
							if $bound.is ':checkbox'
								if $bound.length > 1
									$checkbox = $bound.prop('checked', false).filter('[value="'+value+'"]')
								else
									$checkbox = $bound
								$bound.prop('checked', () -> 
									return value and value.toString().toLowerCase() isnt 'off' and (value.toString().toLowerCase() isnt 'false')
								)
							else if $bound.is 'select[multiple]'
								$bound.val @model.get path
							else
								$bound.val value
						else if $bound.is 'img, svg'
							$bound.attr 'src', value
						else
							$bound.html value
		parseModel: () ->
			$bound = @view.$el.find('[name], [data-bind]')
			flat = {}

			$bound.each (idx, el) => 
				$this = $(el)
				name = $this.data('bind') or $this.attr('name')
				name = name.replace /\[\]/g, () ->
					'['+$bound.filter('[data-bind="'+name+'"], [name="'+name+'"]').index($this) + ']'

				if (typeof @getVal($this) isnt 'undefined')
					flat[name] = @getVal($this);

			@expand flat
		getBound: (path) ->
			if /[0-9]+/.test path.split('').pop()
				path = path.split('.')
				path.pop()
				path = path.join('.')

			nameAttribute = @dotToBracketNotation path
			eqNameSelector = nameAttribute.replace(/(.*\[)([0-9]+)?(\].*)/g, '[name="$1$3"]:eq($2)')
			nameSelectors = '[data-bind="'+path+'"], [name="'+path+'"] '+eqNameSelector+', [name="'+nameAttribute+'"]'

			@view.$(nameSelectors).not(@target)
		getVal: (input) ->
			$input = $(input)
			if $input.is(':input')
				if (not $input.is(':checkbox') and not $input.is(':radio')) or $input.prop('checked')
					$input.val()
				else
					undefined
			else
				$input.text()
		matchToken: (key, token) ->
			if token is '{n}'
				Number(key) % 1 is 0
			if token is '{s}'
				typeof key is string
			if parseInt(token, 10) % 1 is 0
				key is parseInt token, 10
			key is token
		expand: (flat) ->
			if (flat.constructor isnt Array)
				flat = [flat]
			for set in flat
				for own path, value of set
					tokens = @tokenize(path).reverse()
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
					@merge((out = out || out = {}), child)
			out
		flatten: (data, separator = '.', depthLimit = false) ->
			data = @merge {}, data
			path = ''
			stack = []
			out = {}

			while (_.keys(data).length)
				if _.isArray(data) and data.length > 0
					key = data.length - 1
					el = data.pop()
				else
					key = _.keys(data)[0]
					el = data[key]
					delete data[key]
				if not el? or path.split(separator).length is depthLimit or typeof el isnt 'object' or el.nodeType or (typeof el is 'object' and (el.constructor is Date or el.constructor is RegExp or el.constructor is Function)) or el.constructor isnt Object
					out[path + key] = el
				else
					if _.keys(data).length > 0
						stack.push [data, path]
					data = el
					path += key + separator
				if (_.keys(data).length is 0 and stack.length > 0)
					curr = stack.pop()
					[data, path] = curr
			out
		merge: (objects...) ->
			out = objects.shift()
			for object in objects
				for own key, value of object
					if out[key] and value and (_.isObject(out[key]) and _.isObject(value) or out[key].constructor is Array)
						out[key] = @merge out[key], value
					else
						out[key] = value
			out
		dotToBracketNotation: (path, reverse = false) ->
			if not path
				throw new TypeError 'Not Enough Arguments'
			if reverse
				path.replace(/\]/g, '').split('[').join('.')
			else
				path.replace(/([\w]+)\.?/g, '[$1]').replace(/^\[(\w+)\]/, '$1')
		tokenize: (path) -> 
			if path.indexOf('[') is -1
				path.split '.'
			else
				_.map path.split('['), (v) ->
					v = v.replace /\]/, ''
					if v is '' then '{n}' else v
)
