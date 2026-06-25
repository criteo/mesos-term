import Express = require('express');
import Jwt = require('jsonwebtoken');
import ms = require('ms');
import { env } from '../env_vars';
import { Request } from '../express_helpers';

export function DelegateGet(
  req: Request,
  res: Express.Response) {
  res.render('delegate', {
    user: req.user.cn,
    url: req.protocol + '://' + req.get('host')
  });
}

export function DelegatePost(
  req: Request,
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
  const parsedDuration = ms(duration);
  const expiresIn = (typeof parsedDuration === 'number') ? parsedDuration / 1000 : undefined;

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

  try {
    const token = Jwt.sign(payload, env.JWT_SECRET, options);
    res.send(token);
  } catch (err) {
    console.error(`Unable to generate delegation token: ${err}`);
    res.status(503).send('Unable to generate delegation token');
  }
}
