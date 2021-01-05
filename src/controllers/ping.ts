import Express = require("express");

export default function (req: Express.Request, res: Express.Response) {
  res.send("<p>pong</p>");
}
