/**
 * Wraps the default Error object.
 */
export class LibraryError extends Error {

    constructor(reason) {
        super(reason);
    }

}

/**
 * Raised when a runtime problem that can't be handled occurs.
 */
export class UnrecognizedError extends LibraryError {

    cause;

    constructor(cause) {
        super('unrecognized error');
        this.cause = cause;
    }
}

/**
 * Base class for Client and Server errors.
 */
class HTTPError extends LibraryError {

    response;

    constructor(reason, response) {
        super(reason);
        this.response = response;
    }

}

/**
 * Raised by a 400-level status code or internal issue.
 */
export class ClientError extends HTTPError {}

/**
 * Raised by a 500-level status code.
 */
export class ServerError extends HTTPError {}

/**
 * Raised by incorrect usage of this library.
 */
export class UsageError extends LibraryError {}
