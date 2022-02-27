/*
|--------------------------------------------------------------------------
| Socket
|--------------------------------------------------------------------------
|
| League Client uses a websocket connection to communicate changes from the LCU itself to the UX.
| We can connect to the socket using the proper credentials and subscribe to events.
|
*/

import https from "https";
import WebSocket from "ws";

class LeagueWebSocket extends WebSocket {

    /**
     * Connect to LCU websocket.
     *
     * @param {string} url
     * @param {Object} options
     */
    constructor(url, options) {

        super(url, options);

        this.subscriptions = new Map();
        this._socketListener = undefined;

        // Subscribe to Json API
        this.on("open", () => {

            // State notification
            this._socketListener();

            this.send(JSON.stringify([5, "OnJsonApiEvent"]));
        });

        // Attach the LeagueWebSocket subscription hook
        this.on("message", (message) => {

            // Attempt to parse into JSON and dispatch events
            try {

                const json = JSON.parse(message);
                const [res] = json.slice(2);

                if (this.subscriptions.has(res.uri)) {

                    this.subscriptions.get(res.uri)?.forEach((callback) => {
                        callback(res.data, res);
                    });
                }
            } catch (error) {
            }
        });

        this.on("unexpected-response", (message) => {
            console.log(message);
        });

        this.on("error", (error) => {

        });

        this.on("close", () => {

        });
    }

    /**
     * Subscribe to a LCU event.
     *
     * @param {string} path
     * @param {function} callback
     */
    subscribe(path, callback) {

        const eventPath = `/${trim(path)}`;

        if (!this.subscriptions.has(eventPath)) {

            this.subscriptions.set(eventPath, [callback]);
        } else {

            this.subscriptions.get(eventPath)?.push(callback);
        }
    }

    /**
     * Unsubscribe from a LCU event.
     *
     * @param {string} path
     */
    unsubscribe(path) {

        const eventPath = `/${trim(path)}`;
        this.subscriptions.delete(eventPath);
    }

    onSocketOpen(listener) {

        this._socketListener = listener;
    }
}


/**
 * Return a new Websocket instance.
 *
 * @param {Object} credentials
 * @param {string} credentials.password
 * @param {number} credentials.port
 * @returns {LeagueWebSocket}
 */
function connect(credentials) {

    const url = `wss://riot:${credentials.password}@127.0.0.1:${credentials.port}`;

    return new LeagueWebSocket(url, {
        headers: {
            Authorization: "Basic " + Buffer.from(`riot:${credentials.password}`).toString('base64')
        },
        agent: new https.Agent({
            rejectUnauthorized: false
        })
    });
}

/**
 * Trim slashes in front of a string.
 *
 * @param {string} string
 * @returns {string}
 */
function trim(string) {

    let result = string;

    while (result.startsWith("/")) {
        result = result.substr(1);
    }

    return result;
}

export { connect }