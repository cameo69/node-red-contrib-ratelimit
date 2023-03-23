/*
    Copyright missing
*/

module.exports = function (RED) {
    "use strict";

    var _maxKeptMsgsCount;

    function maxKeptMsgsCount(node) { //copied from delay node
        if (_maxKeptMsgsCount === undefined) {
            const name = "nodeMessageBufferMaxLength";
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
        const node = this;
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

        node.outputs = config.outputs;

        //node.warn("node.outputs: " + node.outputs);
        //node.warn("config.outputs: " + config.outputs);
        //node.warn("this.outputs: " + this.outputs);
        //node.warn("node.drop_select: " + node.drop_select);

        node.name = config.name;
        node.addcurrentcount = config.addcurrentcount;
        node.msgcounter = 0;

        node.buffer = [];
        node.timeoutIDs = [];
        node.isOpen = true;

        node.warn("node.buffer.length: " + node.buffer.length);
        node.warn("node.timeoutIDs.length: " + node.timeoutIDs.length);
        node.warn("node.nbRateUnits == " + node.nbRateUnits);
        //node.warn("quite on top before registering");

        if (node.delay_action === "ratelimit") {
            node.on("input", function (msg, send, done) {
                function addTimeout() {
                    function addTimeoutID(id) {
                        node.timeoutIDs.push(id);
                    }

                    addTimeoutID(setTimeout(function () {
                        if ((node.msgcounter) > 0) {
                            node.msgcounter--;
                            updateStatus("by timeout");
                        } else {
                            node.warn("(node.msgcounter <= 0) within callback of setTimeout. Check!");
                        }
                        sendFromQueue();
                    }, node.nbRateUnits));
                }

                function sendFromQueue() {
                    if (node.isOpen && node.msgcounter < node.rate && node.buffer.length > 0) {
                        const currentCounter = ++node.msgcounter;
                        const msgInfo = node.buffer.shift();
                        addCurrentCountToMsg(msgInfo.msg, currentCounter);
                        msgInfo.send(msgInfo.msg);
                        addTimeout();
                        updateStatus();
                        msgInfo.done();
                        sendFromQueue();
                    }
                }

                if (!node.isOpen) {
                    done();
                    return;
                }

                if (node.msgcounter < node.rate) {
                    const currentCounter = ++node.msgcounter;
                    addCurrentCountToMsg(msg, currentCounter);
                    if (node.outputs == 1) {
                        send(msg);
                    } else {
                        send([msg, null]);
                    }
                    addTimeout();
                    updateStatus();
                    done();

                } else if (node.drop_select === "drop") {
                    done();

                } else if (node.drop_select === "queue") {
                    const max_msgs = maxKeptMsgsCount(node);
                    if ((max_msgs > 0) && (node.buffer.length >= max_msgs)) { //parts copied from delay node
                        node.buffer = [];
                        node.error(RED._("delay.errors.too-many"), msg);
                    } else {
                        const m = RED.util.cloneMessage(msg);
                        node.buffer.push({ msg: m, send: send, done: done });
                    }
                    updateStatus("by queue");

                } else {
                    //default case before v0.0.10 if (node.drop_select === "emit") {
                    addCurrentCountToMsg(msg, node.msgcounter);
                    send([null, msg]);
                    //updateStatus();
                    done();
                }
            });

            node.on('close', function(removed, done) {
                node.warn("called on_close, start");
                node.isOpen = false;

                while(node.timeoutIDs.length) {
                    clearTimeout(node.timeoutIDs.pop());
                }
                node.warn("called on_close, middle");
                node.warn("called on_close, node.timeoutIDs.length: " + node.timeoutIDs.length);

                while(node.buffer.length) { //https://stackoverflow.com/questions/8860188/javascript-clear-all-timeouts
                    node.buffer.pop().done();
                }
                node.msgcounter = 0;
                node.status({});
                done();
            });

        } else {
            //not defined, you should not get here, never!
            done(Error("node.delay_action is not defined"));
        }


        function updateStatus(str) {
            let color = "green";
            const currentCount = node.msgcounter;
            if (currentCount > 0) {
                const bufLength = node.buffer.length;
                let txt = currentCount + " sent in timeframe";
                if (bufLength) txt += ", " + bufLength + " queued";
                //if (str) txt += ", " + str;
                if (bufLength === 0) {
                    if (currentCount >= node.rate) {
                        color = "blue";
                    }
                } else {
                    color = "red";
                }
                node.status({ fill: color, shape: "ring", text: txt });
            } else {
                //node.status({ fill: color, shape: "dot", text: "" });
                node.status({});
            }
        }

        function addCurrentCountToMsg(msg, currentMsgCounter) {
            if (node.addcurrentcount) {
                msg.CurrentCount = currentMsgCounter;
            }
        }

/*
        function variSend(send, o) {
            let ar = [];
            for (let i = 0; i < node.outputs; i++) {
                ar += o[i] ?? null;
            }
            send([o[0]]);
        }
*/

    }
    RED.nodes.registerType("rate-limiter", RateLimitNode);
};

/*
    - persistence after restart node red?
*/
