const Hapi = require('hapi');
const Good = require('good');
const Joi = require('joi');


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


server.route({
    method: 'GET',
    path: '/shoppinglist',
    handler: function (request, reply) {
        return reply({
            _embedded: state.allIds.map(i => state.entities[i])
        });
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
        validate: {
            params: {
                id: Joi.number().required()
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
        validate: {
            payload: {
                description: Joi.string().max(50).min(3).required(),
                added: Joi.date().required(),
                id: Joi.number().required(),
                purchased: Joi.bool().required()
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
        validate: {
            payload: {
                description: Joi.string().max(50).min(3).required(),
                added: Joi.date().required(),
                id: Joi.number().required(),
                purchased: Joi.bool().required()
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
        validate: {
            payload: {
                description: Joi.string().max(50).min(3).required(),
                added: Joi.date().required()
            }
        }
    }
})


server.register({
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
}, (err) => {

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