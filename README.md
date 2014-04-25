Backbone Ligaments
===============

Declarative data binding between Backbone Models and Views.

Currently in beta.

###About

ligaments.js binds DOM Elements to Model Attributes on the `name` attributes or `lg-bind` attribute declaration of elements within the view. 
`Model.changedAttributes()` are injected on each attribute change event. Backbone-Ligament is fully dot-path accessor friendly. You can use this with `Backbone.DeepModel`
and have full control over injecting, ingesting and binding nested attributes. Any `change` or `input` event from an element 
with a `name` attribute or `lg-bind` attribute within the bound backbone view instance's element will set the new data to the corresponding bound model attribute 
and fire a `change` event. The data will be set at the path indicated in the `name` or `lg-bind` attribute in dot-notation or bracket-notation.

```html
<input type="text" name="user[Profile][name]">
or
<input type="text" lg-bind="user.Profile.name">
```

When a change event occurs, the ingested data structure will look like this:

```js
{
  user: {
    Profile: {
      name: 'josh'
    }
  }
}

```

```html
<input type="text" name="photo[categories][0][name] value="r/awesome">
<input type="text" name="photo[categories][1][name] value="r/mildlyinteresting">
or 	
<input type="text" lg-bind="photo.categories.0.name" value="r/awesome">
<input type="text" lg-bind="photo.categories.1.name" value="r/mildlyinteresting">
```

When a change event occurs, the ingested data structure will look like this:

```js
{
  photo: {
    categories: [{
      name: 'r/awesome'
    },{
      name: 'r/mildlyinteresting'
    }]
  }
}

```

Suppose you want a a number input that keeps it's data type through its journey from the UI to the server. You can use `cast` option in the `bindings` options like the below example.

When providing a `cast` option for an attribute, simply provide a function to be called or an array like so `[parseInt, 10]` where parseInt is the function to be called, the value of your input will be provided as the first argument and `10` will be provided as the second argument—the radix. You can define as many constant arguments as you'd like by appending them to the array. 

```html 
with an input like so...
<input type="text" lg-bind="preciseMeasurement" value="0.006">
or
<input type="number" step="0.001" lg-bind="preciseMeasurement" value="0.006">
```

A casting function can be provided in the bindings option for that attribute. It can be a custom, anonymous or native // function.

```js
var view     = new MyViewClass(),
    model    = new MyModelClass(),
    ligament = new Backbone.Ligaments({
      model: model,
      view: view,
      bindings: {
        'preciseMeasurement': {
          cast: [parseFloat, 10]
      }
     });

```

And when the model ingests the value from that input, it will be passed through the cast function to modify it in any way you see fit.

###Usage:

Include the ligaments.js file in your application after backbone.js and before any of your views or models are loaded or required.

To create data binding between a view and a model, construct a new Ligaments instance by calling `Backbone.Ligaments(options)` method and pass it a object containing your view, model and other options. Currently, there is no way to ~~divorce~~ unbind the view from the model.

```js
	var viewInstance   = new MyViewClass(),
	    modelInstance  = new MyModelClass(),
	    ligament       = new Backbone.Ligaments({model: modelInstance, view: viewInstance});
```

All input changes in the view will then be ingested by the model and set to its attributes. 
Similarly the ligament will inject any attributes set on the model programmatically into into the view's bound elements.

##Features
====================

###beforeInject callback

In the example below, a model attribute might look like an ISO datetime string like `2014-04-25T01:53:36.998Z`. If you wanted this attribute, which is bound to an element in the view, to display this date in a human-friendly fashion, you can use beforeInject to mutate the value before it's injected into the view.

You may need to translate, mask or manipulate values before they are injected into the view. If a beforeInject method exists on the view that is bound, it will be called in the context of your view and provided the model and the hash returned by Backbone.Model.changedAttributes() method.

For example, if your model attribute createdAt stores a datetime string in an ISO/JSON format, but you'd like for it to display as a readable string in your view, check for the changed attribute createdAt in the changedAttributes argument of beforeInject and simply overwrite the value in the changedAttributes hash.

Doing so won't affect your model or Backbone's copy of changed and previous attributes, but will provide Ligaments with a translated value to inject into the view.

```js
	var ViewClass = Backbone.View.extend({
		el: '.appointmentItem',
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
    bindings: {
      first_name: {},
      last_name: {},
      phone: {
        cast: function(value) {
          return value.replace('-', '');
        }
      }
	});
```

###Compatibility

`Backbone.Ligaments` has been tested and works with `Backbone.DeepModel`
