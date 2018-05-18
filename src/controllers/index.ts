import Express = require('express');

export default function(req: Express.Request, res: Express.Response) {
  res.send('Please provide a task ID like /mytask-id');
}
