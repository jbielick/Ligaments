Ligaments
===============

Model-View (two-way) binding for Backbone.js

Currently in development.

##How to use
Include the ligaments.js file in your application after backbone.js and before any of your views or models are loaded or required.

ligaments.js uses `name` attributes on DOM elements within the view to inject model data on each change event. Any `change` or `input` event from an input element within the bound view will set the new data to the bound model and fire a `change` event.

To create a two-way binding between a view and a model, just call the `bindView()` method on any model and pass it the view you'd like to create a binding relationship with. Currently, there is no way to ~~divorce~~ unbind the view from the model.

Example:

```js
	var View = Backbone.View.extend({
		initialize: function(options) {
			this.model = new Model();
			this.model.bindView(this);
		}
	});

	new View();
```