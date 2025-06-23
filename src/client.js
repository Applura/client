import {
  ImplementationError,
  LibraryError,
  MissingContentTypeError,
  RequestError,
  ServerError,
  UnexpectedContentError,
  UnexpectedContentTypeError,
  UsageError,
} from "./errors.js";

import { consume } from "@applura/ouroboros";

function ensureURL(target, baseURL) {
  if (typeof target === "string") {
    return new URL(target, baseURL);
  } else if (target instanceof URL) {
    return target;
  } else if ("href" in target) {
    return new URL(target.href, baseURL);
  }
  throw new UsageError(
    "url target must be a string, a URL object, or an object with an href property",
  );
}

function addToHistory(apiURL, browserURL) {
  if (history?.state?.url) {
    history.pushState({ url: apiURL.href }, "", browserURL);
  } else {
    history.replaceState({ url: apiURL.href }, "", browserURL);
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

function request(url, options) {
  if (options.credentials) {
    throw new UsageError(
      'cannot change client credentials behavior. default value: "include"',
    );
  }
  const init = {
    ...options,
    credentials: "include",
    headers: {
      ...(options.headers || {}),
      "accept": "application/vnd.api+json, application/problem+json",
    },
  };
  return fetch(url, init);
}

/**
 * Determines if the given URL is a local URL using a few heuristics.
 *
 * If the URL is not HTTP, for instance a data: URI, then this method returns false.
 *
 * If the URL's hostname local.applura.app the hostname is assumed to be "local", i.e. targeting a server on the
 * developer's own machine. If the hostname is any other value, then this method returns false.
 *
 * @param {Location} url
 *
 * @return {boolean}
 */
export function isLocalURL(url) {
  const isHTTP = ["http:", "https:"].includes(url.protocol);
  const isLocalHost = ["applura.site", "localhost"].includes(url.hostname);
  return isHTTP && isLocalHost;
}

export function bootstrap() {
  console.assert(
    !!window,
    "bootstrap error: must be called from within a browser context",
  );
  const link = window.document.querySelector(
    'head link[rel*="alternate"][type="application/vnd.api+json"]',
  );
  console.assert(!!link, "bootstrap error: missing initial resource link");
  const initialURL = isLocalURL(window.location)
    ? new URL(
      `${window.location.pathname}${window.location.search}${window.location.hash}`,
      link.getAttribute("href"),
    )
    : new URL(link.getAttribute("href"));
  const client = new Client(initialURL.href);

  // Add click event listener to div#app
  const appDiv = document.getElementById("app");
  console.assert(!!appDiv, "bootstrap error: missing div#app element");
  appDiv.addEventListener("click", (event) => {
    // Check if the target is an anchor element
    if (!(event.target instanceof HTMLAnchorElement)) return;

    const anchor = event.target;
    const href = anchor.href; // Safe to access href directly

    // Check if href is external or has a non-web protocol
    let url;
    try {
      url = new URL(href, appDiv.baseURI);
    } catch {
      console.warn(`Invalid href: ${href}`);
      return;
    }
    const isExternal = url.protocol !== "http:" && url.protocol !== "https:" ||
      url.origin !== new URL(appDiv.baseURI).origin;
    if (isExternal) return;

    // Check if anchor has a type attribute (opt-out)
    if (anchor.hasAttribute("type")) return;

    // Check if anchor has a download attribute
    if (anchor.hasAttribute("download")) return;

    // Check if anchor has a target attribute that is not _blank
    if (
      anchor.hasAttribute("target") &&
      anchor.getAttribute("target") !== "_blank"
    ) return;

    // Prevent default behavior and stop propagation
    event.preventDefault();
    event.stopPropagation();

    // Use normalized href
    const normalizedHREF = url.href;

    // Call the client's follow function
    client.follow(normalizedHREF);
  });

  // Register a global listener for history updates
  addEventListener("popstate", (event) => {
    // Not navigating without a state.
    if (event.state) {
      // Not navigating on a "back".
      if ("url" in event.state) {
        navigate = false;
        client.follow(event.state.url, {}).finally(() => {
          navigate = true;
        });
      }
    }
  });

  return client;
}

export default function Client(initialURL) {
  let tracking;
  let stopped = false;
  let send;
  let lastURL, lastResource, lastProblem, lastResponse;
  let highWater = 0;
  let isLivePreviewListenerRegistered = false;
  const baseURL = lastURL = ensureURL(initialURL);

  const update = (id, { resource, problem, url }) => {
    if (id < highWater) {
      return;
    }
    lastResource = resource || lastResource;
    lastProblem = problem instanceof LibraryError ? problem.detail : problem;
    lastURL = url || lastURL;
    send();
  };

  const registerLivePreviewListener = (livePreviewConfig) => {
    const { origin } = livePreviewConfig;
    if (origin) {
      // Register a global listener for live preview updates.
      addEventListener("message", (message) => {
        if (message.origin !== origin) {
          return;
        }
        const { type } = message.data;
        if (type === "update") {
          const { targetURL } = message.data;
          this.follow(targetURL);
        }
      });
      isLivePreviewListenerRegistered = true;
    }
  };

  this.start = async function* () {
    tracking = true;
    let first = true;
    while (tracking) {
      yield new Promise((resolve) => {
        send = () => {
          resolve({ resource: lastResource, problem: lastProblem });
        };
        if (first) {
          this.follow(lastURL);
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
    if (
      url.origin !== baseURL.origin ||
      typeof link === "object" && "type" in link &&
        link.type.startsWith("text/html")
    ) {
      window.location = url;
      return false;
    }
    const response = lastResponse = await request(url, options);
    if (response.status === 204) {
      return true;
    }
    if (!response.headers.has("content-type")) {
      const problem = new MissingContentTypeError(
        "the server responded without specifying a MIME type via the content-type HTTP response header",
        { response },
      );
      await response.body.cancel("missing content-type");
      update(id, { problem, url });
      return false;
    }
    const mimeType = response.headers.get("content-type");
    if (
      !(mimeType.startsWith("application/vnd.api+json") ||
        mimeType.startsWith("application/problem+json"))
    ) {
      const problem = new UnexpectedContentTypeError(
        `the server responded in with an unrecognizable media type: ${mimeType}`,
        { response },
      );
      await response.body.cancel("unacceptable content-type");
      update(id, { problem, url });
      return false;
    }
    let doc;
    try {
      doc = await response.json();
    } catch (e) {
      const problem = new UnexpectedContentError(
        `could not parse response as JSON despite the content-type header claiming to be ${mimeType}: ${e.reason}`,
        { response, cause: e },
      );
      update(id, { problem, url });
      return false;
    }
    if (response.ok) {
      let resource;
      try {
        resource = consume(doc);
      } catch (e) {
        throw new ImplementationError("could not parse JSON:API document", {
          cause: e,
        });
      }
      const livePreview = doc?.meta?.applura?.livePreview;
      if (livePreview && !isLivePreviewListenerRegistered) {
        registerLivePreviewListener(livePreview);
      }
      if (navigate) {
        if (id === highWater) {
          const htmlAlternateLinkEntry = Object.entries(doc?.data?.links || {})
            .find(([key, link]) => {
              return (link?.rel || key) === "alternate" &&
                (link?.type || "").startsWith("text/html");
            });
          if (htmlAlternateLinkEntry) {
            const [, htmlAlternateLink] = htmlAlternateLinkEntry;
            addToHistory(
              url,
              ensureURL(htmlAlternateLink || window.location.href),
            );
          }
        }
      }
      update(id, { resource, url });
      return true;
    }
    console.assert(
      mimeType.startsWith("application/vnd.api+json") ||
        mimeType.startsWith("application/problem+json"),
    );
    const errorDetail = mimeType.startsWith("application/problem+json")
      ? doc.detail
      : (doc.errors || []).filter((e) => e.detail).map((e) =>
        `detail: ${e.detail}`
      ).join(", ");
    if (response.status >= 400 && response.status <= 499) {
      const problem = new RequestError(
        [
          "request error",
          `${response.status} ${response.statusText}`,
          errorDetail,
        ].join(": "),
        { response },
      );
      update(id, { problem, url });
    } else if (response.status >= 500 && response.status <= 599) {
      const problem = new ServerError(response, [
        "response error",
        `${response.status} ${response.statusText}`,
        errorDetail,
      ], { response });
      update(id, { problem, url });
    } else {
      throw new ImplementationError(
        `unhandled response type: ${response.status} ${response.statusText}`,
      );
    }
    return false;
  };

  this.resource = function () {
    return lastResource;
  };

  this.response = function () {
    return lastResponse;
  };

  this.refresh = function () {
    return this.follow(lastURL);
  };
}
