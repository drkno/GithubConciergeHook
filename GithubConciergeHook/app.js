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
    const data = {
        status: status,
        context: 'package.json Version',
        description: status === 'success' ? 'The version number has been updated.' : 'Please update the package.json version number.'
    };
    request.post({
        url: event.payload.pull_request.statuses_url,
        headers: {
            Authorization: `token ${config.token}`,
            'Content-Type': 'application/json',
            'User-Agent': 'GithubConciergeHook',
            body: data
        }
    }, (_, __, body) => {
        console.log(body);
    });
};

const verifyStatus = (event, master, pr) => {
    sendStatus(semver.lt(master.version, pr.version) ? 'success' : 'failure', event);
};

server.webhookHandler.on('pull_request', event => {
    sendStatus('pending', event);

    const name = event.payload.repository.full_name;
    const master = event.payload.repository.default_branch;
    const remoteName = event.payload.pull_request.head.repo.full_name;
    const current = event.payload.pull_request.head.ref;

    if (remoteName === name && master === current) {
        return sendStatus('success', event);
    }

    getPackageJson(name, master, masterPackageJson => {
        getPackageJson(remoteName, current, verifyStatus.bind(this, event, masterPackageJson));
    });
});

server.listen(config.port);
