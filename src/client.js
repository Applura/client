import {
    ImplementationError,
    MissingContentTypeError, RequestError, ServerError, UnexpectedContentError,
    UnexpectedContentTypeError,
    UsageError
} from "./errors.js";

import parse from "./parse.js";

function ensureURL(target, baseURL) {
    if (typeof target === 'string') {
        return new URL(target, baseURL);
    } else if (target instanceof URL) {
        return target;
    } else if (target.href) {
        return new URL(target.href, baseURL);
    }
    throw new UsageError('url target must be a string, an URL object, or an object with an href property');
}

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
    return new Client(link.getAttribute('href'));
}

export default function Client(initialURL) {
    let tracking;
    let stopped = false;
    let send;
    let lastURL, lastResource, lastProblem, lastResponse;
    let baseURL = lastURL = ensureURL(initialURL)

    this.start = async function* () {
        tracking = true;
        let first = true;
        while (tracking) {
            yield new Promise((resolve) => {
                send = () => {
                    resolve({ resource: lastResource, problem: lastProblem });
                };
            });
            if (first) {
                await this.follow(initialURL);
                first = false;
            }
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

    this.follow = async function (link, options) {
        const url = lastURL = ensureURL(link, baseURL);
        const response = lastResponse = await request(url, options);
        if (response.status === 204) {
            return true;
        }
        if (!response.headers.has('content-type')) {
            lastProblem = new MissingContentTypeError('the server responded without specifying a MIME type via the content-type HTTP response header', {response});
            send();
        }
        const mimeType = response.headers.get('content-type');
        if (!mimeType.startsWith('application/vnd.api+json')) {
            lastProblem = new UnexpectedContentTypeError(response, `the server responded in with an unrecognizable media type: ${mimeType}`, {response});
            send();
        }
        let doc
        try {
            doc = await response.json();
        } catch (e) {
            lastProblem = new UnexpectedContentError(`could not parse response as JSON despite the content-type header claiming to be ${mimeType}: ${e.reason}`, { response, cause: e });
            send();
            return false;
        }
        if (response.ok) {
            try {
                lastResource = parse(doc);
                send();
            } catch (e) {
                throw new ImplementationError('could not parse JSON:API document', {cause: e});
            }
            return true;
        }
        const errorDetails = (doc.errors || []).filter((e) => e.detail).map((e) => `detail: ${e.detail}`)
        if (response.status >= 400 && response.status <= 499) {
            lastProblem = new RequestError(['request error', `${response.status} ${response.statusText}`, ...errorDetails].join(': '), {doc, response})
            send();
        } else if (response.status >= 500 && response.status <= 599) {
            lastProblem = new ServerError(response, ['response error', `${response.status} ${response.statusText}`, ...errorDetails], {doc, response});
            send();
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
