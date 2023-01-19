import {
    ImplementationError,
    MissingContentTypeError, RequestError, ServerError, UnexpectedContentError,
    UnexpectedContentTypeError,
    UsageError
} from "./errors.js";

import parse from "./resource.js";

function ensureURL(target, baseURL) {
    if (typeof target === 'string') {
        return new URL(target, baseURL);
    } else if (target instanceof URL) {
        return target;
    } else if ('href' in target) {
        return new URL(target.href, baseURL);
    }
    throw new UsageError('url target must be a string, a URL object, or an object with an href property');
}

function addToHistory(apiURL, browserURL) {
    if (history?.state?.url) {
        history.pushState({ url: apiURL.href }, '', browserURL);
    } else {
        history.replaceState({ url: apiURL.href }, '', browserURL);
    }
}

/**
 * This is an internal property that can be disabled on popstate to avoid adding history.
 *
 * For example, is used to disable pushing to history on an initial page load inside the
 * bootstrap function.
 *
 * @type {boolean}
 */
let navigate = true;

async function request(url, options) {
    if (options.credentials) {
        throw new UsageError('cannot change client credentials behavior. default value: "include"')
    }
    const init = {
        ...options,
        credentials: 'include',
        headers: {
            ...(options.headers || {}),
            'accept': 'application/vnd.api+json',
        },
    };
    return fetch(url, init);
}

export function bootstrap() {
    console.assert(!!window, 'boostrap error: must be called from within a browser context');
    const link = window.document.querySelector('head link[rel*="alternate"][type="application/vnd.api+json"]');
    console.assert(!!link, 'bootstrap error: missing initial resource link');
    const isLocal = ['http:', 'https:'].includes(window.location.protocol) && ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const initialURL = isLocal
        ? new URL( `${window.location.pathname}${window.location.search}${window.location.hash}`, link.getAttribute('href'))
        : new URL(link.getAttribute('href'));
    const client = new Client(initialURL.href);
    window.addEventListener('popstate', (event) => {
        // Not navigating on a "back".
        if ('url' in event.state) {
            navigate = false;
            client.follow(event.state.url, {}).finally(() => {
                navigate = true;
            });
        }
    });
    return client;
}

export default function Client(initialURL) {
    let tracking;
    let stopped = false;
    let send;
    let lastURL, lastResource, lastProblem, lastResponse;
    let baseURL = lastURL = ensureURL(initialURL)
    let highWater = 0;

    const update = ( id, { resource, problem, response, url } ) => {
        if (id < highWater) {
            return;
        }
        lastResource = resource || lastResource;
        lastProblem = problem || lastProblem;
        lastResponse = response || lastResponse;
        lastURL = url || lastURL;
        send();
    }

    this.start = async function* () {
        tracking = true;
        let first = true;
        while (tracking) {
            yield new Promise((resolve) => {
                send = () => {
                    resolve({ resource: lastResource, problem: lastProblem });
                };
                if (first) {
                    this.follow(initialURL);
                    first = false;
                }
            });
        }
    };

    this.stop = function () {
        if (stopped) {
            return;
        }
        tracking = false;
        send();
        stopped = true;
    };

    this.follow = async function (link, options = {}) {
        const id = ++highWater;
        const url = ensureURL(link, baseURL);
        if (url.origin !== baseURL.origin || typeof link === 'object' && 'type' in link && link.type.startsWith('text/html')) {
            window.location = url;
            return false;
        }
        const response = await request(url, options);
        if (response.status === 204) {
            return true;
        }
        if (!response.headers.has('content-type')) {
            const problem = new MissingContentTypeError('the server responded without specifying a MIME type via the content-type HTTP response header', {response});
            update(id, { problem, response, url });
            return false;
        }
        const mimeType = response.headers.get('content-type');
        if (!mimeType.startsWith('application/vnd.api+json')) {
            const problem = new UnexpectedContentTypeError(response, `the server responded in with an unrecognizable media type: ${mimeType}`, {response});
            update(id, { problem, response, url });
            return false;
        }
        let doc
        try {
            doc = await response.json();
        } catch (e) {
            const problem = new UnexpectedContentError(`could not parse response as JSON despite the content-type header claiming to be ${mimeType}: ${e.reason}`, { response, cause: e });
            update(id, { problem, response, url });
            return false;
        }
        if (response.ok) {
            let resource;
            try {
                resource = parse(doc);
            } catch (e) {
                throw new ImplementationError('could not parse JSON:API document', {cause: e});
            }
            if (navigate) {
                if (id === highWater) {
                    const htmlAlternateLink = Object.entries(doc?.data?.links || {}).find(([key, link]) => {
                        return (link?.rel || key) === 'alternate' && (link?.type || '').startsWith('text/html');
                    });
                    addToHistory(url, ensureURL(htmlAlternateLink || window.location.href));
                }
            }
            update(id, { resource, response, url });
            return true;
        }
        const errorDetails = (doc.errors || []).filter((e) => e.detail).map((e) => `detail: ${e.detail}`)
        if (response.status >= 400 && response.status <= 499) {
            const problem = new RequestError(['request error', `${response.status} ${response.statusText}`, ...errorDetails].join(': '), {doc, response})
            update(id, { problem, response, url });
        } else if (response.status >= 500 && response.status <= 599) {
            const problem = new ServerError(response, ['response error', `${response.status} ${response.statusText}`, ...errorDetails], {doc, response});
            update(id, { problem, response, url });
        } else {
            throw new ImplementationError(`unhandled response type: ${response.status} ${response.statusText}`);
        }
        return false;
    }

    this.resource = function () {
        return lastResource;
    }

    this.response = function () {
        return lastResponse;
    }

    this.refresh = function () {
        return this.follow(lastURL);
    }
}
