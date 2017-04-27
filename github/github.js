const webhooks = require('github-webhook');
const GithubApi = require('github');

class GithubIntegration extends shim {   
    start(callback) {
        this._callback = callback;
        this._github = new GithubApi({
            headers: {
                'User-Agent': 'GithubConciergeHook'
            }
        });
        this._github.authenticate({
            type: 'oauth',
            token: this.config.token
        });
        this._server = webhooks(this.config);
        this._server.webhookHandler.on('pull_request', this._on_web_event.bind(this, 'pull_request'));
        this._server.listen(this.config.port);
    }

    _on_web_event(event_name, event) {
        event.thread_id = event_name;
        this._callback(this, event);
    }

    stop() {
        this._server.close();
        this._github = null;
        this._callback = null;
    }
    
    getApi() {
        return this;
    }

    sendMessage(message, thread) {
        console.warn(`${thread}: ${message}`);
    }

    createStatus(state, context, description, repo, sha) {
        this._github.repos.createStatus({
            state: state,
            context: context,
            description: description,
            owner: repo.split('/')[0],
            repo: repo.split('/')[1],
            sha: sha
        });
    }
};

module.exports = new GithubIntegration();
