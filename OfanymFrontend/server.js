const
  express = require('express'),
  serveStatic = require('serve-static'),
  history = require('connect-history-api-fallback'),
  port = process.env.PORT || 5000,
  AccessControl = require('express-ip-access-control')

const app = express()

const options = {
  mode: 'allow',
  denys: [],
  allows: [process.env.ALLOWS.split(' ') ],
  forceConnectionAddress: false,
  log: function(clientIp, access) {
    console.log(clientIp + (access ? ' accessed.' : ' denied.'));
  },

  statusCode: 401,
  redirectTo: '',
  message: 'Unauthorized'
};

app.use(history())
app.use(serveStatic(__dirname + '/dist/spa'))
app.use(AccessControl(options));
app.listen(port)
