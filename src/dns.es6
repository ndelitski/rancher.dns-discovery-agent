import dns from 'native-dns';
import {info, trace, error} from './log';
import assert from 'assert';

export default class DNS {
  constructor() {
    this._answers = {};
    this._server = dns.createServer();
  }

  updateAnswers(answers) {
    this._answers = this._processAnswers(answers);
  }

  _processAnswers(answers) {
    return answers;
  }

  listen(port) {
    assert(port, '`port` is missing');
    this._server.serve(port);
    this._server
      .on('error', function (err, buff, req, res) {
        error(err);
      })
      .on('socketError', (err, socket) => {
        error(err);
      })
      .on('close', () => {
        info('dns server closed', this.address());
      })
      .on('listening', () => {
        info(`dns server listening port ${port}`);
      })
      .on('request', (request, response) => {
        trace(request);
        info(`requesting ${request.question[0].name}`);
        if (this._answers[request.question[0].name]) {
          this._answers[request.question[0].name].forEach((address) => {
            response.answer.push(dns.A({
              name: request.question[0].name,
              address,
              ttl: 600
            }));
          });
          response.send();
        } else {
          this._recurse(request.question[0], response);
        }
      });
  }

  _recurse(question, res) {
    var req = dns.Request({
      question: question,
      server: { address: '8.8.8.8', port: 53, type: 'udp' },
      timeout: 1000,
    });
    var start = new Date();

    req.on('timeout', function () {
      console.log('Timeout in making request');
    });

    req.on('message', function (err, {answer}) {
      trace('receive recurse answer', answer);
      if (!err) {
        res.answer = answer;
        res.send();
      }
    });
    req.on('end', function () {
      var delta = (Date.now()) - start;
      console.log('Finished processing request: ' + delta.toString() + 'ms');
    });

    req.send();
  }

  stop() {
    this._server.close();
  }
}
