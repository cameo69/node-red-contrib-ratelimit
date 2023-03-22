# @cameo69/node-red-ratelimit
A simple node that offers rate limiting based on a sliding window.

This allows to let bursts of messages pass but limit the passage of constant high message rates.

User can specify a max number of messages (n) for a time period (t).
Messages within the given limit will be sent to output 1, messages exceeding the limit will be dropped, sent to output 2, or queued.
The relevant time period is between now()-t and now().
For every incoming message it is checked if the number of messages sent in the time frame is below n; and if yes, the message will be sent to output 1; otherwise it is dropped, sent to output 2, or queued.
If messages are queued, they will be release on output 1 whenever they will not exceed the set rate limit.

## Node

<img width="235" alt="image" src="https://user-images.githubusercontent.com/44269764/225152504-e0ed9da0-5078-44aa-959d-f0a80908a3b2.png">

## Settings dialog

<img width="547" alt="image" src="https://user-images.githubusercontent.com/44269764/226915998-d6169ecd-993d-489c-ac19-664db87fc5e9.png">

## Example

![output_rate-limiter01](https://user-images.githubusercontent.com/44269764/225151405-70633686-777a-4feb-a8ae-2521ec78e505.gif)

## Links

[Nodered.org](https://flows.nodered.org/node/@cameo69/node-red-ratelimit) https://flows.nodered.org/node/@cameo69/node-red-ratelimit

[npm](https://www.npmjs.com/package/@cameo69/node-red-ratelimit) https://www.npmjs.com/package/@cameo69/node-red-ratelimit

[GitHub](https://github.com/cameo69/node-red-contrib-ratelimit) https://github.com/cameo69/node-red-contrib-ratelimit
