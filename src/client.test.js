import { Client } from './client.js';

describe('sanity checks:', () => {
	test('client can be instantiated', () => {
		const c = new Client();
		expect(c.initialized()).toBe(true);
	});
});
