const concierge = require('concierge-bot'),
    fs = require('fs');

fs.writeFileSync('./github/config.json', fs.readFileSync('config.json'));

const platform = concierge({
    modules: [
        './config',
        './github',
        './versioner'
    ],
    integrations: ['github'],
    debug: 'silly',
    timestamp: true,
    loopback: {
        enabled: false,
        pipe: false
    }
});
