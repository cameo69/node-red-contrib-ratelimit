# @cameo69/node-red-ratelimit
A simple node that offers rate limiting based on a sliding window.

# General rate limiting

Rate limiting based on a sliding window means that for any specified time interval no more than the specified number of messages will pass the rate-limiter node.
Rate-limiter node will not delay any messages if the rate limit is not reached.

That means even bursts of messages are allowed to pass within the given limit, while the passage of constant high message rates can be avoided.
This is unlike the default delay-node (in rate limit mode), which will put a fixed time between each message even before the set rate limit is reached.

## Messages per time period

The User can specify a maximum number of messages (n) for a time period (t).

<img width="513" alt="image" src="https://user-images.githubusercontent.com/44269764/228315434-6e03fe25-b80f-41ee-807e-b4cb26766d84.png">

For every incoming message the node checks if the number of messages sent in the last time frame t is below n;
if yes, the message will be sent to output 1;
if no, the message will be dropped, sent to output 2, or queued. Depending on the settings.
If messages are queued, they will be release on output 1 whenever they will not exceed the set rate limit.

## Application

A classic application could be the input protection of a flow that receives messages from the outside world, e.g. web requests or commands via MQTT.
If the message rate is normal, messages are forwarded without any delay; but if there is too high volume, the messages are limited.

# Settings of @cameo69/node-red-ratelimit

## Modes of rate limiting

Rate-limiter node can operate in 2 rate-limiting modes:
- Queue intermediate messages
- Drop intermediate messages

Modes can be selected via dropdown menu in the node's editor.

### Drop intermediate messages

In drop mode, rate-limiter will drop all messages above the limit. They will never reach the output 1.

<img width="545" alt="image" src="https://user-images.githubusercontent.com/44269764/228514748-237cda4d-6e88-4b8b-9703-1386a271c317.png">

There is a checkbox that allows sending those dropped messages to output 2.

#### Example 1, drop intermediate

Let's assume this setting:

<img width="544" alt="image" src="https://user-images.githubusercontent.com/44269764/228341160-a7e6f4cf-ba75-4875-8ce7-0ed4d3c3449a.png">

The animation shows messages that are allowed to pass (green) and dropped messages (red) when the rate limit is reached.

![output_rate-limiter03](https://user-images.githubusercontent.com/44269764/228509274-87d987d2-c581-44cf-91c6-822baca38a0f.gif)

### Queue intermediate messages

In queueing mode, rate-limiter allows to buffer messages that could not be sent immediately because they would have violated the rate limit. The messages will be sent as soon as they will not violate the rate limit.

<img width="392" alt="image" src="https://user-images.githubusercontent.com/44269764/228321919-015a4fc3-6085-4423-b22e-1e1fbd3425c1.png">

Additionally, the user can set a maximum queue size. If the number of queued messages reaches the limit further messages can (depending on the setting) either be dropped or added to the queue while the oldest messages in the queue will be dropped.

#### Drop oldest message if queue is full

<img width="392" alt="image" src="https://user-images.githubusercontent.com/44269764/228513521-16287514-6691-4367-a185-5571c7107be6.png">

#### Drop new messages if queue is full

<img width="392" alt="image" src="https://user-images.githubusercontent.com/44269764/228512079-24f24ecd-f7b8-4255-ad14-c54a3eeaaf47.png">

#### Example 2, queueing unlimited

For example let's assume this setting:

<img width="545" alt="image" src="https://user-images.githubusercontent.com/44269764/228323582-407bbb26-c911-4731-a035-f36406da9ff8.png">

- The rate is set to 5 msg(s) per 10 seconds. --> Means if there is equal or less than 5 messages received in 10 seconds, they are sent to output 1.
- Queue intermediate messages --> All messages above the limit of 5 messages will be buffered for later sending and...
- Queue Max Size equals 0 which means with no limit --> No message will be dropped.

If the node receives for example 6 messages within 10 secoonds, only 5 are sent immediately, and the 6th message will be sent exactly 10 secoonds after the first message, because then there were only 4 messages sent in the past 10 seconds, hence the 6th can be sent before the limit is reached again.

## Node

<img width="308" alt="image" src="https://user-images.githubusercontent.com/44269764/228511622-92e91237-057e-4a7f-b383-5b318d0ff01e.png">

## Settings dialog

<img width="549" alt="image" src="https://user-images.githubusercontent.com/44269764/228511190-7d0dbf9a-4965-49ef-a9ee-98d2396900f5.png">

## Example

![output_rate-limiter01](https://user-images.githubusercontent.com/44269764/225151405-70633686-777a-4feb-a8ae-2521ec78e505.gif)

## Links

[Nodered.org](https://flows.nodered.org/node/@cameo69/node-red-ratelimit) https://flows.nodered.org/node/@cameo69/node-red-ratelimit

[npm](https://www.npmjs.com/package/@cameo69/node-red-ratelimit) https://www.npmjs.com/package/@cameo69/node-red-ratelimit

[GitHub](https://github.com/cameo69/node-red-contrib-ratelimit) https://github.com/cameo69/node-red-contrib-ratelimit
