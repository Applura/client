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

        await t.step('204 No Content', async () => {
            server.respondWith(new Response(null, {
                status: 204,
                headers: {
                    'content-type': 'application/vnd.api+json',
                },
            }))
            client.refresh();
            const { resource, problem } = (await loop.next()).value;
            const {status} = client.response();
            assertEquals(status, 204);
            assertEquals(resource, null);
            assertEquals(problem, undefined);
        });
    });

    server.stop();
    await serverShutdown;
});
