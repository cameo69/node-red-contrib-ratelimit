module.exports = function(RED) {
    function RateLimitNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;

        this.name = config.name;
        this.messages = config.messages;
        this.duration = config.duration;
        this.addcurrentcount = config.addcurrentcount;
        this.msgcounter = 0;

        node.on('input', function(msg) {
            
            const NoOfMsg = node.messages;
            const WindowInMilliSec = node.duration;
            const AddCurrentCount = node.addcurrentcount;

            function addTimeout() {
                setTimeout(() => {
                    let currentCount = node.msgcounter || 0;
                    node.msgcounter = currentCount - 1;
                }, WindowInMilliSec);
            }

let currentCount = node.msgcounter || 0;

if (currentCount < NoOfMsg) {
    node.msgcounter = currentCount + 1;
    addTimeout();
    if (AddCurrentCount) msg.CurrentCount = currentCount + 1;
    node.send([msg, null]);
} else {
    if (AddCurrentCount) msg.CurrentCount = currentCount;
    node.send([null, msg]);
}



        });
    }
    RED.nodes.registerType("rate-limit",RateLimitNode);
}
