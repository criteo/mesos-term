import Express = require('express');
import Bluebird = require('bluebird');
import Jwt = require('jsonwebtoken');
import { env } from '../env_vars';
import { CustomRequest } from '../express_helpers';

const ParseDuration = require('parse-duration');

const JwtAsync: any = Bluebird.promisifyAll(Jwt);

export function DelegateGet(
  req: CustomRequest,
  res: Express.Response) {
  res.render('delegate', {
    user: req.user.cn,
    url: req.protocol + '://' + req.get('host')
  });
}

export function DelegatePost(
  req: CustomRequest,
  res: Express.Response) {

  if (!req.body.task_id) {
    res.status(406).send('Request must contain key `task_id`.');
    return;
  }

  if (!req.body.delegate_to) {
    res.status(406).send('Request must contain key `delegate_to`.');
    return;
  }

  if (!req.body.duration) {
    res.status(406).send('Request must contain key `duration`.');
    return;
  }

  const duration = req.body.duration;
  const expiresIn = ParseDuration(duration) / 1000;

  if (!expiresIn) {
    console.error(`Unable to parse duration ${req.body.duration}`);
    res.status(400).send(`Unable to parse duration ${req.body.duration}`);
    return;
  }

  const delegate_to = req.body.delegate_to.split(',');

  const payload = {
    task_id: req.body.task_id,
    delegate_to: delegate_to
  };
  const options = {
    expiresIn: expiresIn,
    issuer: req.user.cn
  };

  JwtAsync.signAsync(payload, env.JWT_SECRET, options)
    .then(function (token: string) {
      res.send(token);
    })
    .catch(function (err: Error) {
      console.error(`Unable to generate delegation token: ${err}`);
      res.status(503);
    });
}
