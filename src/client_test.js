import Client from './client.js';
import { assertEquals } from "https://deno.land/std@0.185.0/testing/asserts.ts";
import TestServer from "./internal/testing/server.js";

Deno.test('Client', async (t) => {
    const serverOptions = { hostname: '0.0.0.0', port: 3003 };
    const serverURL = `http://${serverOptions.hostname}:${serverOptions.port}`;
    const server = new TestServer(serverOptions);

    const serverShutdown = server.start();

    // doTest wraps t.step in order to disable the sanitizeOps and sanitizeResources options by default. These must be
    // disabled because the server (in the Deno standard library) leaves a hanging async operation. This is an upstream
    // problem. From time to time, these should be re-enabled in case the upstream problem has been resolved.
    const doTest = async (name, fn) => await t.step({name, fn, sanitizeOps: false, sanitizeResources: false});

    await doTest('can process HTTP responses', async (t) => {
        await t.step('200 OK', async () => {
            const client = new Client(serverURL);
            const loop = client.start();
            server.respondWith(new Response(
                '{"data":{"type":"empty","id":"resource"}}',
                {
                    status: 200,
                    headers: {
                        'content-type': 'application/vnd.api+json',
                    },
                },
            ))
            const { resource, problem } = (await loop.next()).value;
            const {status} = client.response();
            assertEquals(status, 200);
            assertEquals(resource.type, 'empty');
            assertEquals(problem, undefined);
            client.stop();
        });

        // A 204 No Content response should not trigger a new event loop, but the latest response should be accessible.
        await t.step('204 No Content', async (t) => {
            const client = new Client(serverURL);
            const tests = Object.entries({
                'preliminary request': async () => {
                    assertEquals(client.response().status, 200);
                    assertEquals(client.resource().id, '200 resource');
                },
                'primary request': async () => {
                    assertEquals(client.response().status, 204);
                    assertEquals(client.resource().id, '200 resource');
                },
                'closing request': async () => {
                    assertEquals(client.response().status, 200);
                    assertEquals(client.resource().id, 'another 200 resource');
                },
            });
            server.queueResponses([
                new Response('{"data":{"type":"myType","id":"200 resource"}}', {
                    status: 200,
                    headers: {
                        'content-type': 'application/vnd.api+json',
                    },
                }),
                new Response(null, {
                    status: 204,
                    headers: {
                        'content-type': 'application/vnd.api+json',
                    },
                }),
                new Response('{"data":{"type":"myType","id":"another 200 resource"}}', {
                    status: 200,
                    headers: {
                        'content-type': 'application/vnd.api+json',
                    },
                }),
            ]);
            const performTest = async ([name, test]) => await t.step(name, test);
            let testIndex = 0;
            let eventCount = 0;
            for await (const event of client.start()) {
                eventCount++;
                await performTest(tests[testIndex]);
                testIndex++
                // Since the 204 response won't advance this loop, its test must be triggered as a special case.
                if (tests[testIndex] && tests[testIndex][0] === 'primary request') {
                    await client.follow(serverURL);
                    await performTest(tests[testIndex]);
                    testIndex++
                }
                if (testIndex === tests.length) {
                    client.stop();
                    break;
                }
                client.follow(serverURL);
            }
            assertEquals(eventCount, 2);
        });
    });

    server.stop();
    await serverShutdown;
});
