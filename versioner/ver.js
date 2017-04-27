const request = require('request');
const semver = require('semver');
const files = ['package.json', 'kassy.json', 'bower.json'];

exports.match = event => event.thread_id === 'pull_request';

const getJsonFile = (file, name, branch, ...other) => {
    return new Promise(resolve => {
        request(`https://raw.githubusercontent.com/${name}/${branch}/${file}`, (error, response, body) => {
            if (error || !body || body === null) {
                throw new Error(error);
            }
            resolve(other.concat(JSON.parse(body)));
        });
    });    
};

exports.run = (api, event) => {
    const name = event.payload.repository.full_name;
    const master = event.payload.repository.default_branch;
    const remoteName = event.payload.pull_request.head.repo.full_name;
    const current = event.payload.pull_request.head.ref;
    const sha = event.payload.pull_request.head.sha;

    api.createStatus('pending', $$`context`, $$`pending`, name, sha);
    
    const verifyStatus = data => {
        if (semver.lt(data[0].version, data[1].version)) {
            api.createStatus('success', $$`context`, $$`success`, name, sha);
        }
        else {
            api.createStatus('failure', $$`context`, $$`failure`, name, sha);
        }
    };
    
    let i = 0;
    const check = () => {
        const file = files[i++];
        if (!file) {
            return api.createStatus('success', $$`context`, $$`success`, name, sha);
        }
        getJsonFile(file, name, master)
            .then(data => getJsonFile(file, remoteName, current, data))
            .then(verifyStatus)
            .catch(check);
    };
};
