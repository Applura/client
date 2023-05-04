import Client from './client.js';
import { assertEquals } from "https://deno.land/std@0.185.0/testing/asserts.ts";
import TestServer from "./internal/testing/server.js";

Deno.test('Client', async (t) => {
    const serverOptions = { hostname: '0.0.0.0', port: 3003 };
    const server = new TestServer(serverOptions);
    const client = new Client(`http://${serverOptions.hostname}:${serverOptions.port}`);

    const serverShutdown = server.start();
    const loop = client.start();

    // doTest wraps t.step in order to disable the sanitizeOps and sanitizeResources options by default. These must be
    // disabled because the server (in the Deno standard library) leaves a hanging async operation. This is an upstream
    // problem. From time to time, these should be re-enabled in case the upstream problem has been resolved.
    const doTest = async (name, fn) => await t.step({name, fn, sanitizeOps: false, sanitizeResources: false});

    await doTest('can process HTTP responses', async (t) => {
        await t.step('200 OK', async () => {
            server.respondWith(new Response('{"data":{"type":"empty","id":"resource"}}', {
                status: 200,
                headers: {
                    'content-type': 'application/vnd.api+json',
                },
            }))
            const { resource, problem } = (await loop.next()).value;
            const {status} = client.response();
            assertEquals(status, 200);
            assertEquals(resource.type, 'empty');
            assertEquals(problem, undefined);
        });

        // A 204 No Content response should not trigger a new event loop, but the latest response should be accessible.
        await t.step('204 No Content', async () => {
            // sink connects to the event loop and counts the number of events that it dispatches. The sink promise will
            // resolve when disconnect is called.
            let disconnect;
            const sink = new Promise(async (resolve) => {
                let count = 0;
                disconnect = () => {
                    resolve(count);
                };
                for await (const event of loop) {
                    count++;
                }
            });
            server.respondWith(new Response('{"data":{"type":"myType","id":"200 resource"}}', {
                status: 200,
                headers: {
                    'content-type': 'application/vnd.api+json',
                },
            }))
            await client.refresh();
            assertEquals(client.response().status, 200);
            assertEquals(client.resource().id, '200 resource');
            // Now, set up and request a 204 response. The client's last response should be updated, but the last
            // resource shouldn't change.
            server.respondWith(new Response(null, {
                status: 204,
                headers: {
                    'content-type': 'application/vnd.api+json',
                },
            }))
            await client.refresh();
            assertEquals(client.response().status, 204);
            assertEquals(client.resource().id, '200 resource');
            // Disconnect the sink and wait for it to return the count of how many events it received.
            disconnect();
            const count = await sink;
            // It should have only received a single event since the 204 response should not have triggered a new event.
            assertEquals(count, 1);
        });
    });

    server.stop();
    await serverShutdown;
});
