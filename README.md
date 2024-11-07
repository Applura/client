## Applura client

This is the official JavaScript client for front-end applications using an
Applura back end. It is only intended for browser use.

## Installation

Add the following HTML elements to the `<head>` of your project's `index.html`
file. Like so:

```html
<script type="importmap">
  {
    "imports": {
      "@applura/client": "https://cdn.applura.com/dist/js/client/v2.js"
    }
  }
</script>
<link
  rel="preload"
  as="script"
  href="https://cdn.applura.com/dist/js/client/v2.js"
  crossorigin
/>
```

> Note: This CDN URL is the standard and only supported way to import the
> client. Applura does not publish an officially supported package for
> compile-time import. [Learn more](#browser-only-import) about browser-only
> imports.

## Usage

### Starting the event loop

Once the module is added to your HTML document's header element, you should
import the client's `bootstrap` function. Usually, this import will be added to
your project's `index.js` file. Like so:

```javascript
import { bootstrap } from "@applura/client";
```

Next, obtain a new client instance by calling the `bootstrap` function. Like so:

```javascript
const client = bootstrap();
```

Finally, within your front-end application component (e.g. `app.jsx`) start
listening for events in an
[asynchronous loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of).
Like so:

```javascript
const { start, stop } = client;
for await (const { resource, problem } of start()) {
  // Update your application state using "resource" or handle the "problem".
}
// You can exit the event loop by calling the "stop" function.
stop();
```

This is known as _the event loop_ and it is critical to the Applura way of
building applications as well as many high-performance user interfaces.

### Navigating your application

End-users can navigate between your application resources by following links.

To follow a link, wait for an interaction (such as a click) and pass a link
object from your resource or a URL to the client's `follow` function. For
example:

```javascript
const { follow } = client;
const { myLink } = resource;
const handleClick = (e) => {
  e.preventDefault();
  // When possible, prefer passing a link object instead over URL strings.
  // I.e., "myLink" not "myLink.href".
  follow(myLink);
};
return <a href={myLink.href} onClick={handleClick}>{myLink.title}</a>;
```

The `follow` function will fetch the target resource and send an event to your
event loop when it has finished the fetch. After that fetch completes, you'll be
able to update your application state using the new resource.

> Note: `follow` returns a promise that resolves to a boolean value indicating
> whether the fetch succeeded. This functionality can be used to display and
> hide loading animations.

## Browser-only import

Importing the client module from the Applura CDN is the standard and only
supported way to import the client module. Applura does not publish an
officially supported package for compile-time import. Why?

In short: so that we can deliver security, performance, and reliability
improvements to our customers' applications in real-time.

We will never intentionally publish an API breaking change to the same URL. In
other words, major version updates will only be published at new URLs so that
your application never receives an unexpected update.

The module source is published here under an open source license. We do not
minify the production module nor do we remove comments. We do this so that it
can be reviewed, audited, and debugged by anyone. Even without those minor
optimizations, it is under 5kb and Brotli compressed to ensure your application
remains fast and responsive.

> Note: A reason that CDN URLs are often discouraged is to protect your
> application from outage unrelated to your own infrastructure. In our case,
> this does not apply since the client module is served from the exact same CDN
> as your front-end application.
