###
 #  Backbone.Ligaments
 #    Declarative view-model data binding for Backbone.js
 #  
 #  Author: Josh Bielick
 #  License: GNU GENERAL PUBLIC LICENSE
 # 
###
((factory) -> 
  if typeof define is 'function' and define.amd
    define ['underscore', 'jquery'], factory
  else if exports? && typeof module is 'object'
    factory require('underscore'), require('jquery')
  else
    factory _, window.jQuery
)( (_, $) ->

  class Ligaments

    constructor: (options = {}) ->
      @cid = _.uniqueId 'ligament'
      @ensureArguments.apply this, arguments
      { @view, @model, @readOnly, @bindings, @blacklist, @whitelist } = options
      @createBindings()
      @bootstrapView() unless options.inject is false
      @model.set(@parseModel(), silent: true) unless @readOnly or not options.ingest
      return this

    createBindings: () ->
      _.bindAll @, 'ingest', 'inject'

      @view.listenTo @model, 'change', @inject

      unless @readOnly
        _.extend (@view.events || (@view.events = {})), 
          'change *[name]:not([lg-bind])'     : @ingest,
          'input *[name]:not([lg-bind])'      : @ingest,
          'change *[lg-bind]'                 : @ingest,
          'input *[lg-bind]'                  : @ingest
        @view.delegateEvents(@view.events)


    ensureArguments: () ->
      args = [].slice.call arguments
      unless args.length or args[0].view or args[0].model
        console.warn 'You must provide an instance of a Backbone View and Model'


    ingest: (e) ->
      _this = @

      unless @readOnly
        unless @blacklist and not path in @blacklist or @whitelist? and path in @whitelist
          $input = $(@target = e.currentTarget)
          path = $input.attr('lg-bind') || $input.attr('name')

          if path and path.indexOf '[' > -1
            path = path.replace(/\[\]/g, () => '[' + @view.$('[name]').filter("[name=\"#{path}\"]").index($input) + ']')
            path = @dotToBracketNotation path, true

          value = @getVal $input, path

          return null if $input.attr('lg-method') == 'inject'

          if $input.is 'select[multiple]'
            @model.unset path

          (data = {})[path] = value

          data = @expand data

          @model.parse data if @parse and _.isFunction @model.parse

          unless value? then @model.unset path else @model.set data

      delete @target

    bootstrapView: () ->
      @inject @model, bootstrapData: @model.toJSON()


    inject: (model, options) ->
      data = options.bootstrapData || model.changedAttributes()

      return @ if @lockBinding

      data = @flatten data

      @view.beforeInject model, data if _.isFunction @view.beforeInject

      for own path, value of data
        continue unless path? and path.length > 0
        unless (@blacklist? and not path in @blacklist) or (@whitelist? and path in @whitelist)
          $bound = @getBound path
          if $bound.length
            return null if $bound.attr('lg-method') == 'ingest'
            if $bound.is ':input'
              if $bound.is(':checkbox') or $bound.is(':radio')
                if $bound.length > 1
                  $boundTarget = $bound.prop('checked', false).filter("[value=\"#{value}\"]")
                else
                  $boundTarget = $bound
                $boundTarget.prop 'checked', () ->
                  lowerCaseString = value.toString().toLowerCase()
                  value and lowerCaseString isnt 'off' and lowerCaseString isnt 'false' and lowerCaseString isnt 'no'
              else if $bound.is 'select[multiple]'
                $bound.val @model.get path
              else
                $bound.val value
            else if $bound.is 'img, svg'
              $bound.attr 'src', value
            else
              $bound.html value


    parseModel: () ->
      $bound = @view.$ '[lg-bind], [name]'
      flat = {}

      $bound.each (idx, el) => 
        $el = $(el)
        path = $el.attr('lg-bind') or $el.attr('name')
        path = path.replace /\[\]/g, () ->
          '[' + $bound.filter("[lg-bind=\"#{path}\"], [name=\"#{path}\"]").index($el) + ']'

        if (value = @getVal($el, path))?
          flat[path] = value

      @expand flat


    getBound: (path) ->
      if /\.[0-9]+$/.test path
        path = path.split('.')
        path.pop()
        path = path.join('.')

      nameAttribute = @dotToBracketNotation path
      eqNameSelector = nameAttribute.replace(/(.*\[)([0-9]+)?(\].*)/g, '[name="$1$3"]:eq($2)')
      nameSelectors = "[lg-bind=\"#{path}\"], [name=\"#{path}\"] #{eqNameSelector}, [name=\"#{nameAttribute}\"]"
      @view.$(nameSelectors).not(@target)


    getVal: (input, path = '*') ->
      $input = $(input)
      if $input.is(':input')
        if (not $input.is(':checkbox') and not $input.is(':radio')) or $input.prop('checked')
           value = $input.val()
        else
          value = undefined
      else
        value = $input.text()

      if @bindings?[path]?.cast?
        castOptions = @bindings[path].cast
        if _.isFunction @bindings[path].cast
          args = []
          caster = castOptions
        else if  _.isArray @bindings[path].cast
          args = castOptions[1..]
          caster = castOptions[0]

        if !args || typeof caster isnt 'function'
          throw new Error "options.bindings[path].cast is expected to be a function or function + arguments array ex: {cast: [parseInt, 10]}"

        args.unshift(value)

        value = caster.apply(@model, args) || value

      value


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

      while (_.keys(data).length > 0)
        if _.isArray(data) and data.length > 0
          key = data.length - 1
          el = data.pop()
        else
          key = _.keys(data)[0]
          el = data[key]
          delete data[key]
        if not el? or 
          path.split(separator).length is depthLimit or
          typeof el isnt 'object' or
          el.nodeType or
          (typeof el is 'object' and (el.constructor is Date or el.constructor is RegExp or el.constructor is Function))
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

  if typeof window is 'object' && window.Backbone?
    Backbone.Ligament = Backbone.Ligaments = Ligaments
  else if typeof exports is 'object'
    module.exports = Ligaments
  else
    Ligaments
    
)