import Assert = require("assert");

describe("mesos", function () {
  ["app1", "app2", "app3", "app4", "app5", "app6"].forEach((value: string) => {
    describe(`application ${value}`, () => {
      it("should have an instance", function () {
        Assert(this.mesosTaskIds[value]);
      });
    });
  });

  it("should have a state", function () {
    Assert(this.mesosState);
  });
});
