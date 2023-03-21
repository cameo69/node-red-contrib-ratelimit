module.exports = function (RED) {
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
        } else {
            // Default to seconds
            this.nbRateUnits = config.nbRateUnits * 1000;
        }

        this.rate = config.rate;

        this.delay_action = config.delay_action;
        this.drop_select = config.drop_select;

        this.name = config.name;
        this.addcurrentcount = config.addcurrentcount;
        this.msgcounter = 0;

        /*
            initialize fifo buffer
        */

        let node = this;

        //node.warn("this.nbRateUnits == " + this.nbRateUnits);

        node.on("input", function (msg, send, done) {
            function addTimeout() {
                setTimeout(function () {
                    /*
                        if buffer then send first in from buffer
                        do not change counter
                        else reduce counter
                    */

                    if ((node.msgcounter || 0) > 0) {
                        node.msgcounter -= 1;
                    }

                    let currentCount = node.msgcounter || 0;
                    if (currentCount > 0) {
                        node.status({ fill: "blue", shape: "ring", text: currentCount });
                    } else {
                        node.status({});
                    }
                }, node.nbRateUnits);
            }

            if (node.delay_action === "new option") {
                //not defined yet
                done(Error("node.delay_action === 'new option'"));
            } else {
                //default case before v0.0.10
                let currentCount = node.msgcounter || 0;

                if (currentCount < node.rate) {
                    node.msgcounter = currentCount + 1;
                    addTimeout();
                    if (node.addcurrentcount) {
                        msg.CurrentCount = currentCount + 1;
                    }
                    send([msg, null]);

                    if (node.msgcounter < node.rate) {
                        node.status({ fill: "blue", shape: "ring", text: node.msgcounter });
                    } else {
                        node.status({ fill: "red", shape: "ring", text: node.msgcounter });
                    }
                    done();
                } else if (node.drop_select === "drop") {
                    //do nothing
                    done();
                } else if (node.drop_select === "queue") {
                    //queue
                    //node.warn("queueing is not implemented yet");
                    //done(Error("queueing is not implemented yet"));

                    /*
                        duplicate message
                        add to buffer
                        inc buffer count
                    */

                    done();
                } else {
                    //default case before v0.0.10 if (node.drop_select === "emit") {
                    if (node.addcurrentcount) msg.CurrentCount = currentCount;
                    send([null, msg]);
                    done();
                }
            }
        });

        //on close is missing
        /*
            clear timeouts
            clear buffer
        */
    }
    RED.nodes.registerType("rate-limiter", RateLimitNode);
};

/*
    - persistence after restart node red?
*/
