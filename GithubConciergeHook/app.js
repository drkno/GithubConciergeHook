'use strict';

const config = require('./config.json');
const webhooks = require('github-webhook');
const request = require('request');
const semver = require('semver');
const githubApi = require('github');
const fs = require('fs');

const github = new githubApi({
    headers: {
        'User-Agent': 'GithubConciergeHook'
    }
});

if (!config.token) {
    github.authenticate({
        type: 'oauth',
        key: config.clientId,
        secret: config.clientSecret
    });

    github.authorization.create({
            scopes: ['public_repo', 'repo:status', 'repo'],
            note: 'Reporting versioning status',
            note_url: 'https://github.com/mrkno/GithubConciergeHook'
        },
        (err, res) => {
            if (res && res.token) {
                config.token = res.token;
                fs.writeFileSync('config.json', JSON.stringify(config, null, 4));
                github.authenticate({
                    type: 'oauth',
                    token: config.token
                });
            } else {
                throw err;
            }
        });
} else {
    github.authenticate({
        type: 'oauth',
        token: config.token
    });
}

const server = webhooks(config);

const getPackageJson = (name, branch, callback) => {
    request(`https://raw.githubusercontent.com/${name}/${branch}/package.json`, (error, response, body) => {
        callback(JSON.parse(body));
    });
};

const sendStatus = (status, event) => {
    github.repos.createStatus({
        state: status,
        context: 'package.json Version',
        description: status === 'success' ? 'The version number has been updated.' : 'Please update the package.json version number.',
        owner: event.payload.repository.full_name.split('/')[0],
        repo: event.payload.repository.full_name.split('/')[1],
        sha: event.payload.pull_request.head.sha
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
