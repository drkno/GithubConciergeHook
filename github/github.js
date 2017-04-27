const webhooks = require('github-webhook');
const GithubApi = require('github');

class GithubIntegration {   
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
        event.event_name = event_name;
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

    createStatus(state, context, description, repo, sha) {
        this._github.repos.createStatus({
            state: status,
            context: context,
            description: description,
            owner: repo.split('/')[0],
            repo: repo.split('/')[1],
            sha: sha
        });
    }
};

module.exports = new GithubIntegration();
