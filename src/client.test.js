import { Client } from './client.js';

describe('sanity checks:', () => {
	test('client can be instantiated', () => {
		const c = new Client();
		expect(c.initialized()).toBe(true);
	});

	test('window.document is in the global scope', () => {
		  const element = document.createElement('div');
		  expect(element).not.toBeNull();
	});
});
