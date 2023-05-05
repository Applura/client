import { Server } from "https://deno.land/std@0.185.0/http/server.ts";

export default function TestServer({ hostname, port }) {
  const notImplemented = new Response(null, { status: 501 });
  const responses = [];
  const server = new Server({
    hostname,
    port,
    handler: () => responses.shift() || notImplemented,
  });
  return {
    start: async () => {
      await server.listenAndServe();
    },
    respondWith: (nextResponse) => {
      responses.splice(0, responses.length, nextResponse);
    },
    queueResponse: (nextResponse) => responses.push(nextResponse),
    queueResponses: (nextResponses) => responses.push(...nextResponses),
    stop: () => {
      server.close();
    },
  };
}
