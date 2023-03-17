module.exports = function(RED) {
    "use strict";

  function RateLimitNode(config) {
    RED.nodes.createNode(this, config);
    this.rateUnits = config.rateUnits;

    if (config.rateUnits === "millisecond") {
      this.nbRateUnits = config.nbRateUnits;
    } else if (config.rateUnits === "minute") {
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
    this.addcurrentcount = config.addcurrentcount;
    this.msgcounter = 0;
    var node = this;

    node.on("input", function(msg) {
      function addTimeout() {
        setTimeout(() => {
          if ((node.msgcounter || 0) > 0) node.msgcounter -= 1;
          
          let currentCount = (node.msgcounter || 0);
          if (currentCount > 0) {
            node.status({fill:"blue", shape:"ring", text: currentCount})
          } else {
            node.status({});
          }
        }, node.nbRateUnits);
      }

      let currentCount = node.msgcounter || 0;

      if (currentCount < node.rate) {
        node.msgcounter = currentCount + 1;
        addTimeout();
        if (node.addcurrentcount) msg.CurrentCount = currentCount + 1;
        node.send([msg, null]);
        
        if (node.msgcounter < node.rate) {
          node.status({fill:"blue", shape:"ring", text: node.msgcounter})
        } else {
          node.status({fill:"red", shape:"ring", text: node.msgcounter})
        }
      } else {
        if (node.addcurrentcount) msg.CurrentCount = currentCount;
        node.send([null, msg]);
      }
    });
  }
  RED.nodes.registerType("rate-limiter", RateLimitNode);
};
