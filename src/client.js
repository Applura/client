import {ClientError, LibraryError, ServerError, UnrecognizedError, UsageError} from "./errors.js";

const JSONAPIMediaType = 'application/vnd.api+json';

class Client {

	#initialized = false;

	#lastData = null;

	#lastError = null;

	#subscriber = null;

	constructor() {
		this.#initialize();
	}

	initialized() {
		return this.#initialized;
	}

	listen(subscriber) {
		if (typeof subscriber !== 'function') {
			throw new UsageError('subscriber must be a function');
		}
		this.#subscriber = subscriber;
		this.#notify();
	}

	#initialize() {
		console.log(window.document.documentElement.innerHTML);
		const alternateLink = window.document.querySelector('head link[rel="alternate"]')
		if (!alternateLink) {
			throw new UsageError('a client should not be instantiated in a document context that does not have an "alternate" link provided by an Applura server');
		}
		const requestURL = alternateLink.getAttribute('href');
		if (!requestURL) {
			throw new UsageError('a client should not be instantiated in a document context that does not have an "alternate" link with a valid href');
		}
		this.#getURL(requestURL).then(this.#handleResponse).catch(( reason ) => {
			this.#lastError = new UnrecognizedError(reason)
			this.#notify();
		});
		this.#initialized = true;
	}

	#notify() {
		if (typeof this.#subscriber !== 'function') {
			return;
		}
		if (!this.#lastData && !this.#lastError) {
			return;
		}
		this.#subscriber([this.#lastData, this.#lastError]);
	}

	#getURL(url) {
		const request = new Request(url, {
			headers: {
				accept: JSONAPIMediaType,
			},
			credentials: "include",
		})
		return self.#doRequest(request);
	}

	/**
	 * @param {Request} request
	 * @returns {Promise<Response>}
	 */
	static #doRequest(request) {
		return fetch(request);
	}

	/**
	 * @param {Response} response
	 *   A fetch response.
	 * @returns {Promise<void>}
	 */
	async #handleResponse(response) {
		try {
			const payload = await readPayload(response);
			if (response.ok) {
				this.#lastData = payload.data;
				this.#lastError = null;
			} else {
				let reason = `${response.status} ${response.statusText}`;
				if (payload.errors && payload.errors[0].detail) {
					reason = `${reason}: ${payload.errors[0].detail}`
				}
				if (response.status >= 400 && response.status < 500) {
					this.#lastError = new ClientError(reason, response)
				} else {
					this.#lastError = new ServerError(reason, response)
				}
			}
		} catch (e) {
			if (e instanceof LibraryError) {
				this.#lastError = e;
			} else {
				this.#lastError = new UnrecognizedError(e);
			}
		} finally {
			this.#notify();
		}
	}

}

async function readPayload(response) {
	const contentLength = response.headers.get('content-length');
	if (!contentLength || parseInt(contentLength) === 0) {
		if (response.status === 200) {
			throw new ServerError('empty response body', response);
		}
		return null;
	}
	const contentType = response.headers.get('content-type');
	if (!contentType) {
		throw new ServerError('unspecified content type', response);
	}
	if (contentType !== JSONAPIMediaType) {
		throw new ServerError(`unrecognized content type: ${contentType}`, response);
	}
	const payload = await response.json();
	if (typeof payload !== 'object' || !payload.data) {
		throw new ServerError('unreadable response body', response);
	}
	return payload;
}

export { Client };
