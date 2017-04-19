const Hapi = require('hapi');
const Good = require('good');
const Joi = require('joi');
const Inert = require('inert');
const Vision = require('vision');
const HapiSwagger = require('hapi-swagger');

const server = new Hapi.Server();

server.connection({
    host: 'localhost',
    port: 3000,
    routes: {
        cors: true
    }
});


var state = {
    allIds: ["1", "2"],
    "entities": {
        "1": {
            id: "1",
            description: "Buy Beer!",
            purchased: false,
            added: new Date()
        },
        "2": {
            id: "2",
            description: "Buy Hairspray",
            purchased: true,
            added: new Date()
        }
    },
    maxId: 2
};

const detailLineSchema = Joi.object({
    id: Joi.number().required(),
    description: Joi.string(),
    purchased: Joi.bool(),
    added: Joi.date()
});

server.route({
    method: 'GET',
    path: '/shoppinglist',

    handler: function (request, reply) {
        return reply({
            _embedded: state.allIds.map(i => state.entities[i])
        });
    },
    config: {
        tags: ["api"],
        notes: ["Give you a list of your shopping items"],
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'Success!',
                        schema: Joi.object({
                            "_embedded": Joi.array().items(detailLineSchema)
                        })
                    }
                }
            }
        }

    }
});
server.route({
    method: 'GET',
    path: '/shoppinglist/{id}',
    handler: function (request, reply) {
        var entity = state.entities[request.params.id];
        if (!entity) {
            reply().code(404);
        } else {
            reply(entity);
        }
    },
    config: {
        tags: ["api"],
        notes: ["Allows you to retreive a single shopping item"],
        validate: {
            params: {
                id: Joi.number().required()
            }
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'Your shopping item',
                        schema: detailLineSchema
                    },
                    '404': {
                        description: 'No Item with that Id'
                    }
                }
            }
        }
    }
})
server.route({
    method: 'POST',
    path: '/shoppinglist/purchased',
    handler: function (request, reply) {
        // probably should check if the thing is there, but I'm tired.
        var entity = state.entities[request.payload.id];
        state.entities[entity.id].purchased = true;
        return reply(state.entities[entity.id]);
    },
    config: {
        tags: ["api"],
        notes: ["Allows you to put the item in the 'purchased' bucket"],
        validate: {
            payload: {
                description: Joi.string().max(50).min(3).required(),
                added: Joi.date().required(),
                id: Joi.number().required(),
                purchased: Joi.bool().required()
            }
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'Your item is purchased',
                        schema: detailLineSchema
                    }
                }
            }
        }
    }
});
server.route({
    method: 'POST',
    path: '/shoppinglist/unpurchased',
    handler: function (request, reply) {
        // probably should check if the thing is there, but I'm tired.
        var entity = state.entities[request.payload.id];
        state.entities[entity.id].purchased = false;
        return reply(state.entities[entity.id]);
    },
    config: {
        tags: ["api"],
        notes: ["Allows you to put your item in the 'unpurchased' bucket"],
        validate: {
            payload: {
                description: Joi.string().max(50).min(3).required(),
                added: Joi.date().required(),
                id: Joi.number().required(),
                purchased: Joi.bool().required()
            }
        },
        plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'Your item is unpurchased',
                        schema: detailLineSchema
                    }
                }
            }
        }

    }
});
server.route({
    method: 'POST',
    path: '/shoppinglist',
    handler: function (request, reply) {
        let entity = request.payload;
        state.maxId += 1;
        state.allIds = [state.maxId, ...state.allIds];
        entity.id = state.maxId.toString();
        entity.purchased = false;
        state.entities[entity.id] = entity;
        const url = request.connection.info.protocol +
            '://' +
            request.info.host +
            request.url.path + '/' +
            entity.id;
        return reply(entity)
            .code(201)
            .header("location", url);
    },
    config: {
        tags: ["api"],
        notes: ["Allows you to add an item to the api"],
        validate: {
            payload: {
                description: Joi.string().max(50).min(3).required(),
                added: Joi.date().required()
            }
        },
         plugins: {
            'hapi-swagger': {
                responses: {
                    '200': {
                        description: 'Your item is added',
                        schema: detailLineSchema
                    }
                }
            }
        }
    }
})

const options = {
    info: {
        'title': 'Shopping Api',
        'version': '0.1.0',
        'contact': {
            name: 'Jeff Gonzalez',
            email: 'jeff@hypertheory.com'
        }
    },
    'schemes': ['http'],
    host: 'localhost:3000'
};

server.register(
    [Inert,
        Vision, {
            'register': HapiSwagger,
            'options': options
        },
        {
            register: Good,
            options: {
                reporters: {
                    console: [{
                        module: 'good-squeeze',
                        name: 'Squeeze',
                        args: [{
                            response: '*',
                            log: '*'
                        }]
                    }, {
                        module: 'good-console'
                    }, 'stdout']
                }
            }
        }
    ], (err) => {

        if (err) {
            throw err; // something bad happened loading the plugin
        }

        server.start((err) => {

            if (err) {
                throw err;
            }
            server.log('info', 'Server running at: ' + server.info.uri);
        });
    });