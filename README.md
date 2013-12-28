Backbone Ligaments
===============

Declarative MVVM (two-way or one-way) data binding between Backbone Models and Views.

Currently in development.

##How to use
Include the ligaments.js file in your application after backbone.js and before any of your views or models are loaded or required.

ligaments.js binds DOM Elements to Model Attributes on the `name` attributes of elements within the view. 
`Model.changedAttributes()` are injected on each change event. Any `change` or `input` event from an input, textarea, or select element within the bound view will set the new data to the bound model and fire a `change` event.

To create a two-way binding between a view and a model, construct a new Ligaments instance by calling `Backbone.Ligaments(options)` method and pass it a hash containing your view, model and other options. Currently, there is no way to ~~divorce~~ unbind the view from the model.

Example:

```js

	var ViewClass = Backbone.View.extend({el: '.MyElement'});

	var ModelClass = Backbone.Model.extend();

	new Backbone.Ligaments({model: new ModelClass(), view: new ViewClass()});

```