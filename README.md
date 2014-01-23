Backbone Ligaments
===============

Declarative data binding between Backbone Models and Views.

Currently in beta.

###About

ligaments.js binds DOM Elements to Model Attributes on the `name` attributes of elements within the view. 
`Model.changedAttributes()` are injected on each change event. Any `change` or `input` event from an element with a `name` attribute or `data-bind` attribute within the bound view will set the new data to the bound model and fire a `change` event. The data will be set at the path indicated in the `name` or `data-bind` attribute in dot-notation or bracket-notation.

```js
// name="data[User][Profile][name]
// yields

{
	data: {
		User: {
			Profile: {
				name: '.val() or .text()'
			}
		}
	}
}

```

###Usage:

Include the ligaments.js file in your application after backbone.js and before any of your views or models are loaded or required.

To create data binding between a view and a model, construct a new Ligaments instance by calling `Backbone.Ligaments(options)` method and pass it a object containing your view, model and other options. Currently, there is no way to ~~divorce~~ unbind the view from the model.

```js
	var ViewClass = Backbone.View.extend({el: '.MyView'});
	var ModelClass = Backbone.Model.extend();
	new Backbone.Ligaments({model: new ModelClass(), view: new ViewClass()});
```

All input changes in the view will then be ingested by the model and set to its attributes. Since `{readOnly: true}` wasn't set in the options, Ligaments will default to two-way binding&mdash;that is, any attributes set on the model programmatically will be injected into the view.


####Example:

```js
	var ViewClass = Backbone.View.extend({el: '.MyElement'});

	var ModelClass = Backbone.Model.extend();

	new Backbone.Ligaments({model: new ModelClass(), view: new ViewClass()});
```

##Features
====================

###beforeInject callback

`Backbone.View.beforeInject(model, changedAttributes)`

You may need to translate, mask or manipulate values before they are injected into the view. If a beforeInject method exists on the view that is bound, it will be called in the context of your view and provided the model and the hash returned by Backbone.Model.changedAttributes() method.

For example, if your model attribute createdAt stores a datetime string in an ISO/JSON format, but you'd like for it to display as a readable string in your view, check for the changed attribute createdAt in the changedAttributes argument of beforeInject and simply overwrite the value in the changedAttributes hash.

Doing so won't affect your model or Backbone's copy of changed and previous attributes, but will provide Ligaments with a translated value to inject into the view.

```js
	var ViewClass = Backbone.View.extend({
		el: '.meta',
		beforeInject: function(model, changed) {
			if (changed.createdAt) {
				changed.createdAt = (new Date(changed.createdAt)).toLocaleString();
			}
		}
	});
```

###Selective Bindings

By default, Backbone.Ligaments will bind all attributes. If you'd like for Backbone.Ligaments to only bind select attributes between your view and model, add an array of attribute names to the binds property of the options hash if you'd like to only bind certain attributes.

```js
	new Backbone.Ligaments({
		model: UserModel,
		view: UserView,
		binds: [
			'first_name',
			'last_name'
		]
	});
```

###Compatibility

`Backbone.Ligaments` has been tested and works with `Backbone.DeepModel`
