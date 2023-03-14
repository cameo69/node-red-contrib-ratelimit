module.exports = function(RED) {
    function RateLimitNode(config) {
        RED.nodes.createNode(this,config);
        var node = this;

        const NoOfMsg = this.rate.messages;
        const WindowInMilliSec = this.rate.duration;

        node.on('input', function(msg) {
            
            //const NoOfMsg = 2;
//const WindowInMilliSec = 5000;
const AddCurrentCount = true;

function addTimeout() {
    setTimeout(() => {
        let currentCount = context.get('msgcounter') || 0;
        context.set('msgcounter', currentCount -1 );
    }, WindowInMilliSec);
}

let currentCount = context.get('msgcounter') || 0;
if (currentCount < NoOfMsg) {
    context.set('msgcounter', currentCount + 1);
    addTimeout();
    if (AddCurrentCount) msg.CurrentCount = currentCount + 1;
    node.send([msg, null]);
} else {
    if (AddCurrentCount) msg.CurrentCount = currentCount;
    node.send([null, msg]);
}



        });
    }
    RED.nodes.registerType("rate-limit",RateLimitNode, {
        rate: {
            messages: {type: "number"},
            weatduration: {type: "number"}
        }
    });
}
