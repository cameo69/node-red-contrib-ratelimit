/*
    Copyright missing
*/

module.exports = function (RED) {
    "use strict";

    var _maxKeptMsgsCount;
    const _statusUpdateMinTime = 100;
    const _statusUpdateHoldTime = 1000;

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

        // backward compatibility to v0.0.12 and earlier
        if (typeof config.buffer_size == "undefined") //idea repeat.js
        {
            config.buffer_size = 0;
        }
        if (typeof config.emit_msg_2nd == "undefined")
        {
            config.emit_msg_2nd = false;
        }
        if (config.drop_select === "emit") {
            config.drop_select = "drop";
            config.emit_msg_2nd = true;
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

        node.buffer_size = config.buffer_size;
        node.buffer_drop_old = (config.buffer_drop === "buffer_drop_old");

        node.outputs = config.outputs;

        node.name = config.name;
        node.emit_msg_2nd = config.emit_msg_2nd;
        node.addcurrentcount = config.addcurrentcount;
        node.msgcounter = 0;

        node.buffer = [];
        node.timeoutIDs = [];
        node.isOpen = true;
        node.canReportStatus = true;

        node.canWarn = true;

        if (node.delay_action === "ratelimit") {
            node.on("input", function (msg, send, done) {
                function addTimeout() {
                    function addTimeoutID(id) {
                        node.timeoutIDs.push(id);
                    }

                    (function() {
                        let tID = setTimeout(function () {
                            if ((node.msgcounter) > 0) {
                                node.msgcounter--;
                                updateStatus();
                            } else {
                                if (canWarn) {
                                    canWarn = false;
                                    setTimeout(() => {canWarn = true;},1000);
                                    node.warn(`(node.msgcounter = ${node.msgcounter} <= 0) within callback of setTimeout. Check!`);
                                }
                            }
                            sendFromQueue();

                            node.timeoutIDs.splice( node.timeoutIDs.findIndex(id => id === tID), 1);
                        }, node.nbRateUnits);
                        addTimeoutID(tID);
                    })();
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

                function send_emit_msg_2nd(msg, send) {
                    addCurrentCountToMsg(msg, node.msgcounter);
                    send([null, msg]);
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

                //} else if (node.drop_select === "drop") {
                //    done();

                } else if (node.drop_select === "queue") {
                    if (node.buffer_size > 0 && node.buffer.length >= node.buffer_size) {
                        if (node.buffer_drop_old) {
                            let oldmsg = node.buffer.shift();
                            if (node.emit_msg_2nd) {
                                send_emit_msg_2nd(oldmsg.msg, oldmsg.send);
                            }
                            oldmsg.done();

                            const m = RED.util.cloneMessage(msg);
                            node.buffer.push({ msg: m, send: send, done: done });
                        } else {
                            if (node.emit_msg_2nd) {
                                send_emit_msg_2nd(msg, send);
                            }
                            //updateStatus();
                            done();
                        }
                    } else {
                        const m = RED.util.cloneMessage(msg);
                        node.buffer.push({ msg: m, send: send, done: done });
                    }
                    updateStatus();

                } else {
                    //default case before v0.0.10 if (node.drop_select === "emit") {
                    //and as of v0.0.13 "emit" will be "drop" + emit_msg_2nd
                    if (node.emit_msg_2nd) {
                        send_emit_msg_2nd(msg, send);
                    }
                    //updateStatus();
                    done();
                }
            });

            node.on('close', function(removed, done) {
                node.isOpen = false;

                while(node.timeoutIDs.length) {
                    clearTimeout(node.timeoutIDs.pop());
                }
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
            function setStatusTimeOut(exec) {
                node.canReportStatus = false;
                clearTimeout(node.finalStatusID);
                exec(false);
                setTimeout(() => {
                    if (node.statusNeedsUpdate) {
                        setStatusTimeOut(exec);
                    } else {
                        node.canReportStatus = true;
                    }
                }, _statusUpdateMinTime);
                node.finalStatusID = setTimeout(() => {
                    exec(true);
                }, _statusUpdateHoldTime);
            }

            const doStatusUpdate = function (isFinal) {
                node.statusNeedsUpdate = false;
                let color = "green";
                let currentCount = node.msgcounter;
                const bufLength = node.buffer.length;
                if (bufLength > 0 || currentCount > 0 || !isFinal) {            
                    if (bufLength === 0) {
                        if (currentCount >= node.rate) {
                            color = "blue";
                        }
                    } else {
                        color = "red";
                        if (!isFinal && currentCount === node.rate - 1) {
                            currentCount = node.rate;
                        }
                    }
                    let txt = currentCount + " sent in timeframe";
                    if (bufLength) txt += ", " + bufLength + " queued";
                    //if (str) txt += ", " + str;
                    node.status({ fill: color, shape: "ring", text: txt }); //`${txt} - ${node.timeoutIDs.length}` });
                } else {
                    //node.status({ fill: color, shape: "dot", text: "" });
                    node.status({});
                }
            }

            if (!node.canReportStatus) {
                node.statusNeedsUpdate = true;    
                return;
            }
            setStatusTimeOut(doStatusUpdate);
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
