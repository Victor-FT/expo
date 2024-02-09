"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createHandler = exports.CLIENT_MODULE_MAP = void 0;
const node_stream_1 = require("node:stream");
// import { createServer as createViteServer } from 'vite';
// import viteReact from '@vitejs/plugin-react';
// import type { Config } from '../../config.js';
// import { resolveConfig } from '../config.js';
const path_js_1 = require("../rsc/path.js");
const stream_1 = require("../rsc/stream");
const html_renderer_1 = require("./html-renderer");
const utils_1 = require("./utils");
// import {
//   initializeWorker,
//   registerReloadCallback,
//   registerImportCallback,
//   registerModuleCallback,
//   renderRscWithWorker,
//   getSsrConfigWithWorker,
// } from './dev-worker-api.js';
// import { patchReactRefresh } from '../plugins/patch-react-refresh.js';
// import { rscIndexPlugin } from '../plugins/vite-plugin-rsc-index.js';
// import {
//   rscHmrPlugin,
//   hotImport,
//   moduleImport,
// } from '../plugins/vite-plugin-rsc-hmr.js';
// import { rscEnvPlugin } from '../plugins/vite-plugin-rsc-env.js';
// import type { BaseReq, BaseRes, Handler } from './types.js';
// import { mergeUserViteConfig } from '../utils/merge-vite-config.js';
exports.CLIENT_MODULE_MAP = {
    react: require('react'),
    'rd-server': require('react-dom/server.edge'),
    'rsdw-client': require('react-server-dom-webpack/client.edge'),
    'waku-client': require('expo-router/build/rsc/client.js'),
};
function createHandler(options) {
    const { ssr,
    // unstable_prehook, unstable_posthook
     } = options;
    //   if (!unstable_prehook && unstable_posthook) {
    //     throw new Error('prehook is required if posthook is provided');
    //   }
    globalThis.__WAKU_PRIVATE_ENV__ = options.env || {};
    const loadServerFile = async (fileURL) => {
        return options.ssrLoadModule((0, path_js_1.fileURLToFilePath)(fileURL));
    };
    const transformIndexHtml = async (pathname) => {
        // const vite = await vitePromise;
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        let headSent = false;
        return new TransformStream({
            transform(chunk, controller) {
                if (!(chunk instanceof Uint8Array)) {
                    throw new Error('Unknown chunk type');
                }
                if (!headSent) {
                    headSent = true;
                    let data = decoder.decode(chunk);
                    // FIXME without removing async, Vite will move it
                    // to the proxy cache, which breaks __WAKU_PUSH__.
                    data = data.replace(/<script type="module" async>/, '<script>');
                    return new Promise((resolve) => {
                        options.transformIndexHtml(pathname, data).then((result) => {
                            controller.enqueue(encoder.encode(result));
                            resolve();
                        });
                    });
                }
                controller.enqueue(chunk);
            },
            flush() {
                if (!headSent) {
                    throw new Error('head not yet sent');
                }
            },
        });
    };
    return async (req, res, next) => {
        const basePrefix = options.config.basePath + options.config.rscPath + '/';
        const handleError = (err) => {
            if ((0, utils_1.hasStatusCode)(err)) {
                res.setStatus(err.statusCode);
            }
            else {
                console.info('Cannot render RSC', err);
                res.setStatus(500);
            }
            (0, stream_1.endStream)(res.stream, String(err));
        };
        let context;
        try {
            //   context = unstable_prehook?.(req, res);
        }
        catch (e) {
            handleError(e);
            return;
        }
        const { config } = options;
        if (ssr) {
            try {
                const readable = await (0, html_renderer_1.renderHtml)({
                    config: config,
                    pathname: req.url.pathname,
                    searchParams: req.url.searchParams,
                    htmlHead: `${options.config.htmlHead}
<script src="${options.config.basePath}${options.config.srcDir}/${options.config.mainJs}" async type="module"></script>`,
                    renderRscForHtml: async (input, searchParams) => {
                        const [readable, nextCtx] = await options.renderRscWithWorker({
                            input,
                            searchParamsString: searchParams.toString(),
                            method: 'GET',
                            contentType: undefined,
                            config: options.config,
                            context,
                        });
                        context = nextCtx;
                        return readable;
                    },
                    getSsrConfigForHtml: (pathname, options) => getSsrConfigWithWorker(config, pathname, options),
                    loadClientModule: (key) => exports.CLIENT_MODULE_MAP[key],
                    isDev: true,
                    rootDir: options.projectRoot,
                    loadServerFile,
                });
                if (readable) {
                    //   unstable_posthook?.(req, res, context as Context);
                    res.setHeader('content-type', 'text/html; charset=utf-8');
                    readable.pipeThrough(await transformIndexHtml(req.url.pathname)).pipeTo(res.stream);
                    return;
                }
            }
            catch (e) {
                handleError(e);
                return;
            }
        }
        if (req.url.pathname.startsWith(basePrefix)) {
            const { method, contentType } = req;
            if (method !== 'GET' && method !== 'POST') {
                throw new Error(`Unsupported method '${method}'`);
            }
            try {
                const input = (0, utils_1.decodeInput)(req.url.pathname.slice(basePrefix.length));
                const [readable, nextCtx] = await options.renderRscWithWorker({
                    input,
                    searchParamsString: req.url.searchParams.toString(),
                    method,
                    contentType,
                    config: options.config,
                    context,
                    stream: req.stream,
                });
                // unstable_posthook?.(req, res, nextCtx as Context);
                readable.pipeTo(res.stream);
            }
            catch (e) {
                handleError(e);
            }
            return;
        }
        // HACK re-export "?v=..." URL to avoid dual module hazard.
        const viteUrl = req.url.toString().slice(req.url.origin.length);
        // const fname = viteUrl.startsWith(options.config.basePath + '@fs/')
        //   ? decodeFilePathFromAbsolute(
        //       viteUrl.slice(options.config.basePath.length + '@fs'.length),
        //     )
        //   : joinPath(options.projectRoot, viteUrl);
        // for (const item of vite.moduleGraph.idToModuleMap.values()) {
        //   if (
        //     item.file === fname &&
        //     item.url !== viteUrl &&
        //     !item.url.includes('?html-proxy')
        //   ) {
        //     const { code } = (await vite.transformRequest(item.url))!;
        //     res.setHeader('Content-Type', 'application/javascript');
        //     res.setStatus(200);
        //     let exports = `export * from "${item.url}";`;
        //     // `export *` does not re-export `default`
        //     if (code.includes('export default')) {
        //       exports += `export { default } from "${item.url}";`;
        //     }
        //     endStream(res.stream, exports);
        //     return;
        //   }
        // }
        const viteReq = node_stream_1.Readable.fromWeb(req.stream);
        viteReq.method = req.method;
        viteReq.url = viteUrl;
        viteReq.headers = { 'content-type': req.contentType };
        const viteRes = node_stream_1.Writable.fromWeb(res.stream);
        Object.defineProperty(viteRes, 'statusCode', {
            set(code) {
                res.setStatus(code);
            },
        });
        const headers = new Map();
        viteRes.setHeader = (name, value) => {
            headers.set(name, value);
            res.setHeader(name, value);
        };
        viteRes.getHeader = (name) => headers.get(name);
        viteRes.writeHead = (code, headers) => {
            res.setStatus(code);
            for (const [name, value] of Object.entries(headers || {})) {
                viteRes.setHeader(name, value);
            }
        };
        // vite.middlewares(viteReq, viteRes, next);
        // TODO: End request
        return;
    };
}
exports.createHandler = createHandler;
//# sourceMappingURL=handler-dev.js.map