'use client';
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Router = exports.Link = exports.useLocation = exports.usePrefetchLocation = exports.useChangeLocation = void 0;
const react_1 = require("react");
const common_js_1 = require("./common.js");
const client_js_1 = require("../client.js");
const parseLocation = () => {
    if (globalThis.__WAKU_ROUTER_404__) {
        return { path: '/404', searchParams: new URLSearchParams() };
    }
    const { pathname, search } = window.location;
    const searchParams = new URLSearchParams(search);
    if (searchParams.has(common_js_1.PARAM_KEY_SKIP)) {
        console.warn(`The search param "${common_js_1.PARAM_KEY_SKIP}" is reserved`);
    }
    return { path: pathname, searchParams };
};
const RouterContext = (0, react_1.createContext)(null);
function useChangeLocation() {
    const value = (0, react_1.useContext)(RouterContext);
    if (!value) {
        return () => {
            throw new Error('Missing Router');
        };
    }
    return value.changeLocation;
}
exports.useChangeLocation = useChangeLocation;
function usePrefetchLocation() {
    const value = (0, react_1.useContext)(RouterContext);
    if (!value) {
        return () => {
            throw new Error('Missing Router');
        };
    }
    return value.prefetchLocation;
}
exports.usePrefetchLocation = usePrefetchLocation;
function useLocation() {
    const value = (0, react_1.useContext)(RouterContext);
    if (!value) {
        throw new Error('Missing Router');
    }
    return value.loc;
}
exports.useLocation = useLocation;
function Link({ to, children, pending, notPending, unstable_prefetchOnEnter, ...props }) {
    if (!to.startsWith('/')) {
        throw new Error('Link must start with "/"');
    }
    const value = (0, react_1.useContext)(RouterContext);
    const changeLocation = value
        ? value.changeLocation
        : () => {
            throw new Error('Missing Router');
        };
    const prefetchLocation = value
        ? value.prefetchLocation
        : () => {
            throw new Error('Missing Router');
        };
    const [isPending, startTransition] = (0, react_1.useTransition)();
    const onClick = (event) => {
        event.preventDefault();
        const url = new URL(to, window.location.href);
        if (url.href !== window.location.href) {
            prefetchLocation(url.pathname, url.searchParams);
            startTransition(() => {
                changeLocation(url.pathname, url.searchParams, url.hash);
            });
        }
        props.onClick?.(event);
    };
    const onMouseEnter = unstable_prefetchOnEnter
        ? (event) => {
            const url = new URL(to, window.location.href);
            if (url.href !== window.location.href) {
                prefetchLocation(url.pathname, url.searchParams);
            }
            props.onMouseEnter?.(event);
        }
        : props.onMouseEnter;
    const ele = (0, react_1.createElement)('a', { ...props, href: to, onClick, onMouseEnter }, children);
    if (isPending && pending !== undefined) {
        return (0, react_1.createElement)(react_1.Fragment, null, ele, pending);
    }
    if (!isPending && notPending !== undefined) {
        return (0, react_1.createElement)(react_1.Fragment, null, ele, notPending);
    }
    return ele;
}
exports.Link = Link;
const getDocumentSkipList = (componentIds, props, cached) => {
    const ele = document.querySelector('meta[name="expo-should-skip"]');
    if (!ele) {
        return [];
    }
    const shouldSkip = JSON.parse(ele.content);
    return (0, common_js_1.getSkipList)(shouldSkip, componentIds, props, cached);
};
const equalRouteProps = (a, b) => {
    if (a.path !== b.path) {
        return false;
    }
    if (a.searchParams.size !== b.searchParams.size) {
        return false;
    }
    if (Array.from(a.searchParams.entries()).some(([key, value]) => value !== b.searchParams.get(key))) {
        return false;
    }
    return true;
};
function InnerRouter(props) {
    const refetch = (0, client_js_1.useRefetch)();
    // const { current: skipList } = useSkipMeta();
    const [loc, setLoc] = (0, react_1.useState)(parseLocation);
    const componentIds = (0, common_js_1.getComponentIds)(loc.path);
    // TODO: strip when "is exporting".
    if (process.env.NODE_ENV === 'development') {
        const refetchRoute = () => {
            const loc = parseLocation();
            const input = (0, common_js_1.getInputString)(loc.path);
            refetch(input, loc.searchParams);
        };
        globalThis.__WAKU_RSC_RELOAD_LISTENERS__ ||= [];
        const index = globalThis.__WAKU_RSC_RELOAD_LISTENERS__.indexOf(globalThis.__WAKU_REFETCH_ROUTE__);
        if (index !== -1) {
            globalThis.__WAKU_RSC_RELOAD_LISTENERS__.splice(index, 1, refetchRoute);
        }
        else {
            globalThis.__WAKU_RSC_RELOAD_LISTENERS__.unshift(refetchRoute);
        }
        globalThis.__WAKU_REFETCH_ROUTE__ = refetchRoute;
    }
    const [cached, setCached] = (0, react_1.useState)(() => {
        return Object.fromEntries(componentIds.map((id) => [id, loc]));
    });
    const cachedRef = (0, react_1.useRef)(cached);
    (0, react_1.useEffect)(() => {
        cachedRef.current = cached;
    }, [cached]);
    const changeLocation = (0, react_1.useCallback)((path, searchParams, hash, method = 'pushState', scrollTo = { top: 0, left: 0 }) => {
        const url = new URL(window.location.href);
        if (typeof path === 'string') {
            url.pathname = path;
        }
        if (searchParams) {
            url.search = '?' + searchParams.toString();
        }
        if (typeof hash === 'string') {
            url.hash = hash;
        }
        if (method) {
            window.history[method](window.history.state, '', url);
        }
        const loc = parseLocation();
        setLoc(loc);
        if (scrollTo) {
            window.scrollTo(scrollTo);
        }
        const componentIds = (0, common_js_1.getComponentIds)(loc.path);
        if (!method &&
            componentIds.every((id) => {
                const cachedLoc = cachedRef.current[id];
                return cachedLoc && equalRouteProps(cachedLoc, loc);
            })) {
            return; // everything is cached
        }
        // const skip = getSkipList(skipList, componentIds, loc, cachedRef.current);
        const skip = getDocumentSkipList(componentIds, loc, cachedRef.current);
        if (componentIds.every((id) => skip.includes(id))) {
            return; // everything is skipped
        }
        const input = (0, common_js_1.getInputString)(loc.path);
        refetch(input, new URLSearchParams([
            ...Array.from(loc.searchParams.entries()),
            ...skip.map((id) => [common_js_1.PARAM_KEY_SKIP, id]),
        ]));
        setCached((prev) => ({
            ...prev,
            ...Object.fromEntries(componentIds.flatMap((id) => (skip.includes(id) ? [] : [[id, loc]]))),
        }));
    }, [refetch]);
    const prefetchLocation = (0, react_1.useCallback)((path, searchParams) => {
        const componentIds = (0, common_js_1.getComponentIds)(path);
        const routeProps = { path, searchParams };
        // const skip = getSkipList(skipList, componentIds, routeProps, cachedRef.current);
        const skip = getDocumentSkipList(componentIds, routeProps, cachedRef.current);
        if (componentIds.every((id) => skip.includes(id))) {
            return; // everything is cached
        }
        const input = (0, common_js_1.getInputString)(path);
        const searchParamsString = new URLSearchParams([
            ...Array.from(searchParams.entries()),
            ...skip.map((id) => [common_js_1.PARAM_KEY_SKIP, id]),
        ]).toString();
        (0, client_js_1.prefetchRSC)(input, searchParamsString);
        globalThis.__WAKU_ROUTER_PREFETCH__?.(path);
    }, []);
    (0, react_1.useEffect)(() => {
        const callback = () => {
            const loc = parseLocation();
            changeLocation(loc.path, loc.searchParams, '', false, false);
        };
        window.addEventListener('popstate', callback);
        return () => window.removeEventListener('popstate', callback);
    }, [changeLocation]);
    const children = componentIds.reduceRight((acc, id) => (0, react_1.createElement)(client_js_1.Slot, { id, fallback: acc }, acc), null);
    return (0, react_1.createElement)(react_1.Fragment, null, (0, react_1.createElement)(client_js_1.Slot, { id: common_js_1.SHOULD_SKIP_ID }), (0, react_1.createElement)(RouterContext.Provider, { value: { loc, changeLocation, prefetchLocation } }, 
    // props.children
    children));
}
function Router({ children }) {
    const loc = parseLocation();
    const initialInput = (0, common_js_1.getInputString)(loc.path);
    const initialSearchParamsString = loc.searchParams.toString();
    return (0, react_1.createElement)(client_js_1.Root, { initialInput, initialSearchParamsString }, (0, react_1.createElement)(InnerRouter, { children }));
}
exports.Router = Router;
//# sourceMappingURL=client.js.map