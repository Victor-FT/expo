"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.respond = exports.convertRequest = exports.convertHeaders = exports.createRequestHandler = void 0;
const abort_controller_1 = require("abort-controller");
const node_fetch_1 = require("node-fetch");
const __1 = require("..");
const environment_1 = require("../environment");
const stream_1 = require("../stream");
/**
 * Returns a request handler for Express that serves the response using Remix.
 */
function createRequestHandler({ build }) {
    const handleRequest = (0, __1.createRequestHandler)(build);
    return async (req, res, next) => {
        try {
            const request = convertRequest(req, res);
            const response = await handleRequest(request);
            await respond(res, response);
        }
        catch (error) {
            // Express doesn't support async functions, so we have to pass along the
            // error manually using next().
            next(error);
        }
    };
}
exports.createRequestHandler = createRequestHandler;
function convertHeaders(requestHeaders) {
    const headers = new node_fetch_1.Headers();
    for (const [key, values] of Object.entries(requestHeaders)) {
        if (values) {
            if (Array.isArray(values)) {
                for (const value of values) {
                    headers.append(key, value);
                }
            }
            else {
                headers.set(key, values);
            }
        }
    }
    return headers;
}
exports.convertHeaders = convertHeaders;
function convertRequest(req, res) {
    const url = new URL(`${req.protocol}://${req.get('host')}${req.url}`);
    // Abort action/loaders once we can no longer write a response
    const controller = new abort_controller_1.AbortController();
    res.on('close', () => controller.abort());
    const init = {
        method: req.method,
        headers: convertHeaders(req.headers),
        // Cast until reason/throwIfAborted added
        // https://github.com/mysticatea/abort-controller/issues/36
        signal: controller.signal,
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        init.body = req;
    }
    return new environment_1.ExpoRequest(url.href, init);
}
exports.convertRequest = convertRequest;
async function respond(res, expoRes) {
    res.statusMessage = expoRes.statusText;
    res.status(expoRes.status);
    for (let [key, values] of Object.entries(expoRes.headers.raw())) {
        for (let value of values) {
            res.append(key, value);
        }
    }
    if (expoRes.body) {
        await (0, stream_1.writeReadableStreamToWritable)(
        // @ts-expect-error: TODO
        expoRes.body, res);
    }
    else {
        res.end();
    }
}
exports.respond = respond;
