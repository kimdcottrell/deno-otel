import { Router } from '@oak/acorn';

// Get the currently active context
const BOOKS = {
	'1': {
		title: 'The Hound of the Baskervilles',
		author: 'Doyle, Arthur Conan',
	},
	'2': {
		title: 'It',
		author: 'King, Stephen',
	},
};

const router = new Router();

router.get('/', (ctx) => {
	console.log(ctx); // testing tempo->logs in grafana
	return { hello: 'world' };
});

router.get('/books/:id', (ctx) => BOOKS[ctx.params.id]);

router.listen({ port: 4002 });
