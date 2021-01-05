import AppsHelpers = require("../apps_helpers");

describe("errors", function () {
  this.timeout(30000);
  this.retries(3);

  AppsHelpers.testNoTaskId("john", "bad-task-id");
});
