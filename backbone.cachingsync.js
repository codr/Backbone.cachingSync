//    Backbone.cachingSync v0.1

//    (c) 2012 Yiorgis Gozadinos, Riot AS.
//    Backbone.cachingSync is distributed under the MIT license.
//    http://github.com/ggozad/Backbone.cachingSync

(function ($, _, Backbone, Burry) {

    Backbone.cachingSync = function (wrapped, ns, default_ttl) {

        var burry = new Burry.Store(ns, default_ttl);

        function getItem (model, options) {
            var item = burry.get(model.id),
                d = $.Deferred(),
                updated = {},
                wp;

            wp = wrapped('read', model, options).done(function (attrs) {
                model.set(attrs);
                burry.set(model.id, model.toJSON());
            });

            if (typeof item !== 'undefined') {
                _.each(item, function (value, key) {
                    if (model.get(key) !== value) updated[key] = value;
                });
                d.resolve(updated);
            } else {
                wp.done(d.resolve).fail(d.reject);
            }

            return d.promise();
        }

        function getItems (collection, options) {
            var ids = burry.get('__ids__'),
                d = $.Deferred(),
                wp;

            wp = wrapped('read', collection, options).done(function (models) {
                _.each(models, function (model) { burry.set(model.id, model); });
                burry.set('__ids__', _.pluck(models, 'id'));
                collection.reset(models);
            });

            if (typeof ids !== 'undefined') {
                d.resolve(_.map(ids, function (id) {
                    json = burry.get(id);
                    json.id = id;
                    return json;
                }));
            } else {
                wp.done(d.resolve).fail(d.reject);
            }

            return d.promise();
        }

        function create (model, options) {
            var wp = wrapped('create', model, options)
                .done(function (newmodel) {
                    burry.set(newmodel.id, newmodel.attributes);
                    if (model.collection)
                        burry.set('__ids__', _(model.collection.models).chain()
                            .pluck('id')
                            .union([newmodel.id])
                            .without(undefined).value());

                });
            return wp.promise();
        }

        function update (model, options) {
            burry.set(model.id, model.attributes);
            return wrapped('update', model, options).promise();
        }

        function destroy (model, options) {
            burry.remove(model.id);
            return wrapped('update', model, options).promise();
        }

        return function (method, model, options) {
            var p;

            options = options || {};
            switch (method) {
                case 'read': p = typeof model.id !== 'undefined' ? getItem(model, options) : getItems(model, options); break;
                case 'create':  p = create(model, options); break;
                case 'update':  p = update(model, options); break;
                case 'delete':  p = destroy(model, options); break;
            }

            // Fallback for old-style callbacks.
            if (options.success) p.done(options.success);
            if (options.error) p.fail(options.error);

            return p;

        };
    };


})(this.jQuery, this._, this.Backbone, this.Burry);
