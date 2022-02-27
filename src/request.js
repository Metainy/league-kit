/*
|--------------------------------------------------------------------------
| Request
|--------------------------------------------------------------------------
|
| Supports sending HTTP requests to any of the League Client API endpoints.
| Also provides a method for gathering data during an active game.
|
*/

import fetch from "node-fetch";
import https from "https";

/**
 * Send a request to League client API.
 *
 * @param {Object} credentials
 * @param {string} credentials.password
 * @param {number} credentials.port
 * @param {Object} options
 * @param {string} options.url
 * @param {string} [options.method]
 * @param {string} [options.body]
 */
async function request(credentials, options) {

    const trimmedURI = trim(options.url);
    const url = `https://127.0.0.1:${credentials.port}/${trimmedURI}`;
    const hasBody = options.method !== "GET" && options.body !== undefined;

    const response = await fetch(url, {
        method: options.method || "GET",
        body: hasBody ? JSON.stringify(options.body) : undefined,
        headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "Authorization": "Basic " + Buffer.from(`riot:${credentials.password}`).toString("base64")
        },
        agent: new https.Agent({
            rejectUnauthorized: false
        })
    });

    return await response.json();
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

export { request };