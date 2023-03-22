/*
    Copyright missing
*/

module.exports = function (RED) {
    "use strict";

    var _maxKeptMsgsCount;

    function maxKeptMsgsCount(node) { //copied from delay node
        if (_maxKeptMsgsCount === undefined) {
            var name = "nodeMessageBufferMaxLength";
            if (RED.settings.hasOwnProperty(name)) {
                _maxKeptMsgsCount = RED.settings[name];
            }
            else {
                _maxKeptMsgsCount = 0;
            }
        }
        return _maxKeptMsgsCount;
    }

    function RateLimitNode(config) {
        let node = this;
        RED.nodes.createNode(node, config);

        // backward compatibility to v0.0.9 and earlier
        if (typeof config.delay_action == "undefined") //idea repeat.js
        {
            config.delay_action = "ratelimit";
        }
        if (typeof config.drop_select == "undefined") {
            config.drop_select = "emit";
        }

        node.rateUnits = config.rateUnits;

        if (config.rateUnits === "millisecond") {
            node.nbRateUnits = config.nbRateUnits;
        } else if (config.rateUnits === "minute") {
            node.nbRateUnits = config.nbRateUnits * 60 * 1000;
        } else if (config.rateUnits === "hour") {
            node.nbRateUnits = config.nbRateUnits * 60 * 60 * 1000;
        } else if (config.rateUnits === "day") {
            node.nbRateUnits = config.nbRateUnits * 24 * 60 * 60 * 1000;
        } else {
            // Default to second
            node.nbRateUnits = config.nbRateUnits * 1000;
        }

        node.rate = config.rate;

        node.delay_action = config.delay_action;
        node.drop_select = config.drop_select;

        node.name = config.name;
        node.addcurrentcount = config.addcurrentcount;
        node.msgcounter = 0;

        /*
            initialize fifo buffer
        */
        node.buffer = [];

        //node.warn("node.nbRateUnits == " + node.nbRateUnits);

        node.on("input", function (msg, send, done) {
            function addTimeout() {
                setTimeout(function () {
                    /*
                        if buffer then send first in from buffer
                        and create new timeout
                        do not change counter
                        else reduce counter
                    */
                    //node.warn("setTimeout 1");
                    //node.warn("setTimeout 2 " + node.buffer.length);
                    if (node.buffer.length > 0) {
                        addTimeout();

                        const msgInfo = node.buffer.shift(); //parts copied from delay node
                        if (node.addcurrentcount) {
                            msgInfo.msg.CurrentCount = node.msgcounter;
                        }
                        //node.warn("setTimeout 3");
                        //node.warn("setTimeout 4 " + msgInfo.msg.payload);
                        msgInfo.send(msgInfo.msg); // send the first on the queue
                        msgInfo.done();
                    } else {
                        //node.warn("setTimeout 5");
                        if ((node.msgcounter) > 0) {
                            node.msgcounter -= 1;
                        } else {
                            //node.warn("(node.msgcounter !> 0) within callback of setTimeout. Check!");
                        }
                    }
                    //node.warn("setTimeout 6");

                    /*let currentCount = node.msgcounter || 0;
                    if (currentCount > 0) {
                        node.status({ fill: "blue", shape: "ring", text: currentCount });
                    } else {
                        node.status({});
                    }*/
                    updateStatus("by timeout");
                }, node.nbRateUnits);
            }

            if (node.delay_action === "ratelimit") {
                //default and only case before v0.0.10
                let currentCount = node.msgcounter || 0;

                if (currentCount < node.rate) {
                    node.msgcounter = currentCount + 1;
                    addTimeout();
                    if (node.addcurrentcount) {
                        msg.CurrentCount = currentCount + 1;
                    }
                    send([msg, null]);

                    /*if (node.msgcounter < node.rate) {
                        node.status({ fill: "blue", shape: "ring", text: node.msgcounter });
                    } else {
                        node.status({ fill: "red", shape: "ring", text: node.msgcounter });
                    }*/
                    updateStatus();
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


                    //node.warn("queue 1 " + node.buffer.length);
                    var max_msgs = maxKeptMsgsCount(node);
                    //node.warn("queue 2 " + max_msgs);
                    if ((max_msgs > 0) && (node.buffer.length >= max_msgs)) { //parts copied from delay node
                        node.buffer = [];
                        node.error(RED._("delay.errors.too-many"), msg);
                    } else {
                        //node.warn("queue 3 " + node.buffer.length);
                        //node.warn("queue 4 " + _maxKeptMsgsCount);
                        let m = RED.util.cloneMessage(msg);
                        node.buffer.push({ msg: m, send: send, done: done });
                        //node.warn("queue 5 " + node.buffer.length);
                    }
                    //node.warn("queue 6 " + node.buffer.length);

/*
var max_msgs = maxKeptMsgsCount(node);
                            if ((max_msgs > 0) && (node.buffer.length >= max_msgs)) {
                                node.buffer = [];
                                node.error(RED._("delay.errors.too-many"), msg);
                            } else if (msg.toFront === true) {
                                node.buffer.unshift({msg: m, send: send, done: done});
                                node.reportDepth();
                            } else {
                                node.buffer.push({msg: m, send: send, done: done});
                                node.reportDepth();
                            }
*/

                    updateStatus("by queue");




                    /*
                        don't do done because msg is not done yet. Will be called upon delayed sending.
                        //done();
                    */
                } else {
                    //default case before v0.0.10 if (node.drop_select === "emit") {
                    if (node.addcurrentcount) msg.CurrentCount = currentCount;
                    send([null, msg]);
                    done();
                }
            } else {
                //not defined, you should not get here
                done(Error("node.delay_action is not defined"));
            }
        });

        //on close is missing
        /*
            clear timeouts
            clear buffer
        */




        function updateStatus(str) {
            let color = "green";
            let currentCount = node.msgcounter || 0;
            if (currentCount > 0) {
                let bufLength = node.buffer.length;
                let txt = currentCount + " sent in timeframe";
                if (bufLength) txt += ", " + bufLength + " queued";
                if (str) txt += ", " + str;
                if (bufLength === 0) {
                    if (currentCount >= node.rate) {
                        color = "blue";
                    }
                } else {
                    color = "red";
                }
                node.status({ fill: color, shape: "ring", text: txt });
            } else {
                node.status({ fill: color, shape: "dot", text: "" });
            }
        }



    }
    RED.nodes.registerType("rate-limiter", RateLimitNode);
};

/*
    - persistence after restart node red?
*/
