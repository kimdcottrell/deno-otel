import { Server } from "@socket_io/deno";
import { Application } from "@oak/oak";

const app = new Application();

app.use(async (context, next) => {
	try {
		await context.send({
			root: `${Deno.cwd()}/client`,
			index: "index.html",
		});
	} catch {
		// this is what makes it possible for /websocket.js to be served
		await next();
	}
});

const io = new Server({
	path: "/ws/",
});

// server
io.on("connection", (socket) => {
	console.log(`socket ${socket.id} connected`);

	socket.on("chat message", (msg) => {
		io.emit("chat message", msg);
	});

	socket.on("disconnect", (reason) => {
		console.log(`socket ${socket.id} disconnected due to ${reason}`);
	});
});

const handler = io.handler(async (req) => {
	console.log(req); // testing tempo->logs in grafana
	return await app.handle(req) || new Response("501", { status: 501 });
});

Deno.serve({
	handler,
	port: 4000,
});
