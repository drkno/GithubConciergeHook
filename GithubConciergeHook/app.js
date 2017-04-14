'use strict';

const config = require('./config.json');
const webhooks = require('github-webhook');
const request = require('request');
const semver = require('semver');

const server = webhooks(config);

const getPackageJson = (name, branch, callback) => {
    request(`https://raw.githubusercontent.com/${name}/${branch}/package.json`, (error, response, body) => {
        callback(JSON.parse(body));
    });
};

const sendStatus = (status, event) => {
    console.log(status);
    console.log(event);
};

const verifyStatus = (event, master, pr) => {
    sendStatus(semver.lt(master.version, pr.version), event);
};

server.webhookHandler.on('pull_request', event => {
    console.log(event);
    const name = event.repository.full_name;
    const master = event.repository.default_branch;
    const remoteName = event.pull_request.head.repo.full_name;
    const current = event.pull_request.head.ref;

    if (remoteName === name && master === current) {
        return sendStatus(true, event);
    }

    getPackageJson(name, master, masterPackageJson => {
        getPackageJson(remoteName, current, verifyStatus.bind(this, event, masterPackageJson));
    });
});

server.listen(config.port);
