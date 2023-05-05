import Client, { bootstrap } from "./src/client.js";
import {
  ImplementationError,
  LibraryError,
  MissingContentTypeError,
  RequestError,
  ResponseError,
  ServerError,
  UnexpectedContentError,
  UnexpectedContentTypeError,
  UnprocessableResponseError,
  UsageError,
} from "./src/errors.js";

export default Client;
export { bootstrap };
export {
  ImplementationError,
  LibraryError,
  MissingContentTypeError,
  RequestError,
  ResponseError,
  ServerError,
  UnexpectedContentError,
  UnexpectedContentTypeError,
  UnprocessableResponseError,
  UsageError,
};
