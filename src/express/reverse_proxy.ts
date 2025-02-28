import express, { Express } from 'express';
import { STATUS_CODE } from 'https://deno.land/std@0.221.0/http/status.ts';
import { context, trace } from 'npm:@opentelemetry/api@1';

function getRandomNumber(min: number, max: number) {
	return Math.floor(Math.random() * (max - min + 1) + min);
}

app.get('/rolldice', (req, res) => {
	res.send(getRandomNumber(1, 6).toString());
});

app.listen(4005, () => {
	console.log(`Listening for requests on http://localhost:4005`);
});
const toUrl = new URL('http://0.0.0.0:4005');
console.log('Proxying ' + toUrl.href);

// we want otel and it seems deno does not respect the npm otel collector, we MUST use the builtin stuff
Deno.serve({
	port: 4004,
}, async (request) => {
	const url = new URL(request.url);
	url.protocol = toUrl.protocol;
	url.hostname = toUrl.hostname;
	url.port = toUrl.port;
	let proxyResponse;
	try {
		proxyResponse = await fetch(url.href, {
			headers: request.headers,
			method: request.method,
			body: request.body,
			redirect: 'manual',
		});
	} catch {
		return new Response('Bad Gateway', {
			status: STATUS_CODE.BadGateway,
		});
	}
	return proxyResponse;
});
