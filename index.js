import Client, { bootstrap } from "./src/client.js";
import {
    LibraryError,
    ImplementationError,
    UsageError,
    RequestError,
    ResponseError,
    ServerError,
    UnprocessableResponseError,
    MissingContentTypeError,
    UnexpectedContentTypeError,
    UnexpectedContentError,
} from './src/errors.js';

export default Client
export { bootstrap };
export {
    LibraryError,
    ImplementationError,
    UsageError,
    RequestError,
    ResponseError,
    ServerError,
    UnprocessableResponseError,
    MissingContentTypeError,
    UnexpectedContentTypeError,
    UnexpectedContentError,
}
