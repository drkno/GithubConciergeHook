'use strict';

const config = require('./config.json');
const webhooks = require('github-webhook');

const server = webhooks(config);

server.webhookHandler.on('pull_request', event => {
    console.log(event);
});

server.listen(config.port);