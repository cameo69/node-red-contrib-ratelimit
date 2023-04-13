/*
ISC License

Copyright (c) 2023 cameo69

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
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

    function QueueLinked() { //based on code by Blindman67 https://codereview.stackexchange.com/questions/255698/queue-with-o1-enqueue-and-dequeue-with-js-arrays
        var head, tail;
        var l = 0;
        return Object.freeze({     
            push(value) { 
                const link = {value, next: undefined, previous: undefined};
                if (tail) link.previous = tail;
                tail = head ? tail.next = link : head = link;
                l++;
            },
            shift() {
                if (head) {
                    const value = head.value;
                    head = head.next;
                    if (head) {
                        head.previous = undefined;
                    } else {
                        tail = undefined;
                    }
                    l--;
                    return value;
                }
            },
            pop() {
                if (tail) {
                    const value = tail.value;
                    tail = tail.previous;
                    if (tail) {
                        tail.next = undefined;
                    } else {
                        head = undefined;
                    }
                    l--;
                    return value;
                }
            },
            peek() { return head?.value },
            len() { return l },
            isEmpty() { return (l === 0) },
            removeFirstOccurrence(v) {
                //let idx = 1;
                if (head) {
                    if (head.value === v) {
                        head = head.next;
                        l--;
                        return true;
                        //return idx;
                    }
    
                    let lastHead = head;
                    let currentPos = head.next;
    
                    while (currentPos) {    
                        //idx++;
                        if (currentPos.value === v) {
                            lastHead.next = currentPos.next;
                            if (currentPos === tail) {
                                tail = lastHead;
                            }
                            l--;
                            return true;
                            //return idx;
                        }
                        lastHead = currentPos;
                        currentPos = currentPos.next;
                    }
                }
                return false;
                //return -1;
            }
        });
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

        // backward compatibility to v0.0.13 and earlier
        if (typeof config.control_topic == "undefined")
        {
            config.control_topic = "";
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

        node.buffer = QueueLinked();
        node.timeoutLinkedIDs = QueueLinked();

        node.org_rate = Object.freeze({"rate": node.rate, "nbRateUnits": node.nbRateUnits, "buffer_size": node.buffer_size});
        node.useControlTopic = (typeof config.control_topic === "string" && config.control_topic !== "");
        node.control_topic = config.control_topic;

        node.isOpen = true;
        node.canReportStatus = true;

        node.canWarn = true;

        if (node.delay_action === "ratelimit") {
            node.on("input", function (msg, send, done) {
                function addTimeout() {
                    function addTimeoutID(id) {
                        node.timeoutLinkedIDs.push(id);
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

                            let erg = node.timeoutLinkedIDs.removeFirstOccurrence(tID);
                            //node.send([null, {payload: erg}]);
                            if (!erg) {
                                node.error("if (!erg) {")
                            };
                        }, node.nbRateUnits);
                        addTimeoutID(tID);
                    })();
                }

                function sendFromQueue() {
                    while (node.isOpen && node.msgcounter < node.rate && !node.buffer.isEmpty()) {
                        const currentCounter = ++node.msgcounter;
                        const msgInfo = node.buffer.shift();
                        addCurrentCountToMsg(msgInfo.msg, currentCounter);
                        msgInfo.send(msgInfo.msg);
                        addTimeout();
                        updateStatus();
                        msgInfo.done();
                    }
                }

                function flushQueue() {
                    while (node.isOpen && !node.buffer.isEmpty()) {
                        const currentCounter = ++node.msgcounter;
                        const msgInfo = node.buffer.shift();
                        addCurrentCountToMsg(msgInfo.msg, currentCounter);
                        msgInfo.send(msgInfo.msg);
                        addTimeout();
                        updateStatus();
                        msgInfo.done();
                    }
                }

                function flushResetQueue() {
                    node.isOpen = false;
                    while (!node.buffer.isEmpty()) {
                        const currentCounter = ++node.msgcounter;
                        const msgInfo = node.buffer.shift();
                        addCurrentCountToMsg(msgInfo.msg, currentCounter);
                        msgInfo.send(msgInfo.msg);
                        //addTimeout();
                        //updateStatus();
                        msgInfo.done();
                    }
                    resetQueue();
                }

                function resetQueue() {
                    node.isOpen = false;

                    while(!node.timeoutLinkedIDs.isEmpty()) {
                        let id = node.timeoutLinkedIDs.shift();
                        clearTimeout(id);
                    }
                
                    while(!node.buffer.isEmpty()) {
                        node.buffer.shift().done();
                    }
                
                    node.msgcounter = 0;

                    node.rate = node.org_rate.rate;
                    node.nbRateUnits = node.org_rate.nbRateUnits;
                    node.buffer_size = node.org_rate.buffer_size;

                    //node.status({});
                    updateStatus();
                    node.isOpen = true;
                }

                function send_emit_msg_2nd(msg, send) {
                    addCurrentCountToMsg(msg, node.msgcounter);
                    send([null, msg]);
                }

                if (node.useControlTopic && msg.topic === node.control_topic) {
                    if (msg.payload === "status") {
                        msg.payload = {
                            "buffer_len": node.buffer.len(),
                            "timeoutLinkedIDs_len": node.timeoutLinkedIDs.len()
                        };

                        if (node.outputs == 1) {
                            send(msg);
                        } else {
                            send([msg, null]);
                        }
                    } else if (msg.payload === "flush") {
                        flushQueue();
                    } else if (msg.payload === "flushreset") {
                        flushResetQueue();
                    } else if (msg.payload === "reset") {
                        resetQueue();
                    } else if (typeof msg.payload === "object") {
                        function isPositiveInteger(n) {
                            return 0 === n % (!isNaN(parseFloat(n)) && 0 <= ~~n);
                        }

                        if ((typeof msg.payload.rate === "number") && isPositiveInteger(msg.payload.rate) && (msg.payload.rate > 0)) {
                            node.rate = msg.payload.rate;
                        }
                        if ((typeof msg.payload.time === "number") && isPositiveInteger(msg.payload.time) && (msg.payload.time > 0)) {
                            node.nbRateUnits = msg.payload.time;
                        }
                        if ((typeof msg.payload.queue === "number") && isPositiveInteger(msg.payload.queue)) {
                            node.buffer_size = msg.payload.queue;
                            if (true || node.drop_select === "queue") {
                                while (node.buffer.len() > node.buffer_size) {
                                    if (node.emit_msg_2nd) {
                                        let oldmsg;
                                        if (node.buffer_drop_old) {
                                            oldmsg = node.buffer.shift();
                                        } else {
                                            oldmsg = node.buffer.pop();
                                        }
                                        send_emit_msg_2nd(oldmsg.msg, oldmsg.send);
                                        oldmsg.done();
                                    } else {
                                        if (node.buffer_drop_old) {
                                            node.buffer.shift().done();
                                        } else {
                                            node.buffer.pop().done();
                                        }
                                    }
                                }
                            }
                        }
                    }

                    done();
                    return;
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
                    if (node.buffer_size > 0 && node.buffer.len() >= node.buffer_size) {
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

                while(!node.timeoutLinkedIDs.isEmpty()) {
                    let id = node.timeoutLinkedIDs.shift();
                    clearTimeout(id);
                    //node.timeoutLinkedIDs.shift()
                }

                while(!node.buffer.isEmpty()) {
                    node.buffer.shift().done();
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
                const bufLength = node.buffer.len();
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
                    node.status({ fill: color, shape: "ring", text: txt });
                    //node.status({ fill: color, shape: "ring", text: `${txt} - ${node.timeoutLinkedIDs.len()}` });
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

    }
    RED.nodes.registerType("rate-limiter", RateLimitNode);
};

/*
    - possibility to control via command 'control'? --> reset, flush, trigger, status...)
    - persistence after restart node red?
    - blocking gate (stores all/parts (for given time period?) and only releases after certain time -> flush or rate)
    - threshold gate (like blocking gate, but releases when certain amount per time (rate) is reached, else drop/2nd)
    - better implementation of queue (suited for high speeds)
    - burst generation mode
*/
