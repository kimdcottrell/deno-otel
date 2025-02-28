import { Server } from 'https://deno.land/x/socket_io@0.2.1/mod.ts';

const io = new Server({
	path: '/ws/',
});

io.on('connection', (socket) => {
	console.log(`socket ${socket.id} connected`);

	socket.on('chat message', (msg) => {
		io.emit('chat message', msg);
	});

	socket.on('disconnect', (reason) => {
		console.log(`socket ${socket.id} disconnected due to ${reason}`);
	});
});

const INDEX_ROUTE = new URLPattern({ pathname: '/' });
const SCRIPT_ROUTE = new URLPattern({ pathname: '/websocket.js' });

const handler = io.handler(async (req) => {
	console.log(req); // testing tempo->logs in grafana
	if (INDEX_ROUTE.exec(req.url)) {
		const body = await Deno.readTextFile(
			`${Deno.cwd()}/client/index.html`,
		);
		return new Response(
			new TextEncoder().encode(body),
		);
	}

	if (SCRIPT_ROUTE.exec(req.url)) {
		const body = await Deno.readTextFile(
			`${Deno.cwd()}/client/websocket.js`,
		);
		return new Response(
			new TextEncoder().encode(body),
			{
				headers: {
					'content-type': 'text/javascript',
				},
			},
		);
	}
});

Deno.serve({
	onListen({ hostname, port }) {
		const default_logging = {
			hostname: hostname,
			port: port,
			local_machine_guid: Deno.env.get('LOCAL_MACHINE_GID'),
		};
		console.log(JSON.stringify(default_logging)); // more testing for grafana logs
	},
	handler: handler,
	port: 4000,
});
