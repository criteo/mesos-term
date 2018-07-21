import Express = require('express');
import Bluebird = require('bluebird');
import Jwt = require('jsonwebtoken');
import { env } from '../env_vars';
const ParseDuration = require('parse-duration');

const JwtAsync: any = Bluebird.promisifyAll(Jwt);

export function DelegateGet(
  req: Express.Request,
  res: Express.Response) {
  res.render('delegate');
}

export function DelegatePost(
  req: Express.Request,
  res: Express.Response) {

  if (!req.body.task_id) {
    res.status(406).send('Request must contain key `task_id`.');
    return;
  }

  if (!req.body.delegate_to) {
    res.status(406).send('Request must contain key `delegate_to`.');
    return;
  }

  const duration = (req.body.expires_in) ? req.body.expires_in : '15m';
  const expires_in = ParseDuration(duration) / 1000;

  const task_id = req.body.task_id;
  const delegate_to = req.body.delegate_to.split(',');

  const payload = {
    task_id: req.body.task_id,
    delegate_to: delegate_to
  };
  const options = {
    expiresIn: 10 * 60,
    issuer: req.user.cn
  };

  const token = JwtAsync.signAsync(payload, env.JWT_SECRET, options)
    .then(function(token: string) {
      res.send(token);
    })
    .catch(function(err: Error) {
      console.error(`Unable to generate delegation token: ${err}`);
      res.status(503);
    });
}
