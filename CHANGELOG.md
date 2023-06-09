- 0.0.18 (2023-04-23) small improvements when using control topic
- 0.0.15 (2023-04-13)
    - replaced JS Array with a much more efficient queue; complexity O(1); allows for queue size of hundred thousands without getting slower
    - added possibility to control behaviour via msg (reset, flush, flushreset, and change rate/time/queue)
- 0.0.13 (2023-03-29)
    - added max queue size
    - added queueing modes a) drop oldest message and b) drop new messages
    - added option to emit dropped messages on 2nd output also for queueing modes
    - removed mode "Send intermediate messages on 2nd output", because it can be set via Drop immtermediate messages + new checkbox to emit on 2nd output
- 0.0.12 (2023-03-23)
    - 2nd output not available for queueing and dropping msg
    - fixed issue with wrong status update when redeployed under load
- 0.0.11 (2023-03-22)
    - updates to documentation
- 0.0.10 (2023-03-22)
    - added queueing
    - time units can be a decimal number now (except for milliseconds)
    - added new menu items to edit screen
    - added more details to time selection dialog
    - added support for internationalization (en-US is default)
    - internal: added calls to done()
- 0.0.9 (2023-03-17) added Milliseconds
- 0.0.8 (2023-03-14) added keywords
- 0.0.7 (2023-03-14) added example
- 0.0.6 (2023-03-14) added README.md
- 0.0.5 (2023-03-14)
    - renamed node from rate-limit to rate-limiter to avoid naming conflict with existing other node
- 0.0.4 (2023-03-14) First official release
    - added to npm https://www.npmjs.com/package/@cameo69/node-red-ratelimit
    - added to Nodered.org https://flows.nodered.org/node/@cameo69/node-red-ratelimit
- 0.0.3 (2023-03-14) 
    - Working towards becoming an published node-red contrib node
    - change name to match newish node-red naming convention (node-red-contrib-ratelimit) --> @cameo69/node-red-ratelimit
- 0.0.2 (2023-03-14)
    - Still in experimental mode and making it being recognized as node-red contrib node
    - Add `node-red` keyword.
- 0.0.1 (2023-03-14) Initial commit
