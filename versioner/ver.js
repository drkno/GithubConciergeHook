const request = require('request');
const semver = require('semver');
const files = ['package.json', 'kassy.json', 'bower.json'];

exports.match = event => event.thread_id === 'pull_request';

const getJsonFile = (file, name, branch) => {
    return new Promise((resolve, reject) => {
        const url = `https://raw.githubusercontent.com/${name}/${branch}/${file}`;
        LOG.debug('Getting JSON file from ' + url);
        request(url, (error, response, body) => {
            if (error || !body || body === null || response.statusCode >= 400) {
                LOG.debug(`An error occurred while getting the file (response=${response ? response.statusCode : '???'}).`);
                return reject(error);
            }
            LOG.silly(body);
            resolve(JSON.parse(body));
        });
    });    
};

const toSemver = input => {
    input += '';
    if (/^[0-9]+(\.[0-9]+)?$/.test(input)) {
        const spl = input.split('.');
        for (let i = spl.length; i < 3; i++) {
            spl.push('0');
        }
        return spl.join('.');
    }
    return input;
};

exports.run = (api, event) => {
    const name = event.payload.repository.full_name;
    const master = event.payload.repository.default_branch;
    const remoteName = event.payload.pull_request.head.repo.full_name;
    const current = event.payload.pull_request.head.ref;
    const sha = event.payload.pull_request.head.sha;

    api.createStatus('pending', $$`context`, $$`pending`, name, sha);

    const verifyStatus = (master, branch) => {
        LOG.debug(`Comparing version ${master.version} to ${branch.version}.`);
        return semver.lt(toSemver(master.version), toSemver(branch.version)) ? 'success' : 'failure';
    };

    const skipStatus = () => {
        LOG.debug(`Skipping ${file} due to errors.`);
        return false;
    };
    
    const promises = [];
    for (let file of files) {
        promises.push(Promise.all([
            getJsonFile(file, name, master),
            getJsonFile(file, remoteName, current)
        ])
        .catch(skipStatus)
        .then(verifyStatus));
    }
    Promise.all(promises).then(res => {
        if (res.some(r => 'failure')) {
            LOG.debug('Sending failure status.');
            api.createStatus('failure', $$`context`, $$`failure`, name, sha);
        }
        else if (res.some(r => 'success')) {
            LOG.debug('Sending success status.');
            api.createStatus('success', $$`context`, $$`success`, name, sha);
        }
        else {
            LOG.debug('Sending success status based on no version number being found.');
            api.createStatus('success', $$`context`, $$`invalid`, name, sha);
        }
    });
};
