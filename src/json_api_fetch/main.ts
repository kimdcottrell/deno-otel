export default {
	async fetch(req) {
		const JSON_ROUTE = new URLPattern({ pathname: '/json' });
		console.log(req); // testing tempo->logs in grafana
		if (JSON_ROUTE.exec(req.url)) {
			return Response.json({ hello: 'world' });
		}
	},
};
