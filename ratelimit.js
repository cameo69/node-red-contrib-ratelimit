module.exports = function(RED) {
    "use strict";

  function RateLimitNode(config) {
    RED.nodes.createNode(this, config);
        this.rateUnits = config.rateUnits;


        if (config.rateUnits === "minute") {
            this.nbRateUnits = config.nbRateUnits * 60 * 1000;
        } else if (config.rateUnits === "hour") {
            this.nbRateUnits = config.nbRateUnits * 60 * 60 * 1000;
        } else if (config.rateUnits === "day") {
            this.nbRateUnits = config.nbRateUnits * 24 * 60 * 60 * 1000;
        } else {  // Default to seconds
            this.nbRateUnits = config.nbRateUnits * 1000;
        }

        this.rate = config.rate;
                
    this.name = config.name;
    this.addcurrentcount = true; //config.addcurrentcount;
    this.msgcounter = 0;
    var node = this;

    node.on("input", function(msg) {
      function addTimeout() {
        setTimeout(() => {
          if ((node.msgcounter || 0) > 0) node.msgcounter -= 1;
        }, node.nbRateUnits);
      }

      let currentCount = node.msgcounter || 0;

      if (currentCount < node.rate) {
        node.msgcounter = currentCount + 1;
        addTimeout();
        if (node.addcurrentcount) msg.CurrentCount = currentCount + 1;
        node.send([msg, null]);
      } else {
        if (node.addcurrentcount) msg.CurrentCount = currentCount;
        node.send([null, msg]);
      }
    });
  }
  RED.nodes.registerType("rate-limit", RateLimitNode);
};
