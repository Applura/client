import { Server } from "https://deno.land/std@0.185.0/http/server.ts";

export default function TestServer({ hostname, port }) {
    const notImplemented = new Response(null, { status: 501 });
    let response = notImplemented;
    const server = new Server({
        port,
        handler: () => {
            const serve = response;
            response = notImplemented;
            return serve;
        }
    });
    return {
        start: async () => {
            await server.listenAndServe();
        },
        respondWith: (nextResponse) => {
            response = nextResponse;
        },
        stop: () => {
            server.close();
        },
    }
}
