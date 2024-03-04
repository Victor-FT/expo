import OS from 'expo-router/os';
import { isDOMAvailable, canUseEventListeners, canUseViewport, isAsyncDebugging, } from './environment/browser';
function select(specifics) {
    if (specifics.hasOwnProperty(OS)) {
        return specifics[OS];
    }
    else if (OS !== 'web' && specifics.hasOwnProperty('native')) {
        return specifics.native;
    }
    else if (specifics.hasOwnProperty('default')) {
        return specifics.default;
    }
    // do nothing...
    return undefined;
}
const Platform = {
    /**
     * Denotes the currently running platform.
     * Can be one of ios, android, web.
     */
    OS,
    /**
     * Returns the value with the matching platform.
     * Object keys can be any of ios, android, native, web, default.
     *
     * @ios ios, native, default
     * @android android, native, default
     * @web web, default
     */
    select: select,
    /**
     * Denotes if the DOM API is available in the current environment.
     * The DOM is not available in native React runtimes and Node.js.
     */
    isDOMAvailable,
    /**
     * Denotes if the current environment can attach event listeners
     * to the window. This will return false in native React
     * runtimes and Node.js.
     */
    canUseEventListeners,
    /**
     * Denotes if the current environment can inspect properties of the
     * screen on which the current window is being rendered. This will
     * return false in native React runtimes and Node.js.
     */
    canUseViewport,
    /**
     * If the JavaScript is being executed in a remote JavaScript environment.
     * When `true`, synchronous native invocations cannot be executed.
     */
    isAsyncDebugging,
};
export default Platform;
//# sourceMappingURL=Platform.js.map