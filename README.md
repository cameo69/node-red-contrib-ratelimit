# node-red-contrib-ratelimit
A simple node that offers rate limiting based on a sliding window.

User can specify a max number of messages (n) for a time period (t).
Messages within the given limit will be sent to output 1, messages exceeding the limit will be sent to output 2.
The relevant time period is between now()-t and now().
For every incoming message it is checked if the number of messages sent in the time frame is below n; and if yes, the message will be sent to output 1; otherwise it is sent to output 2.
