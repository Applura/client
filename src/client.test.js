import fs from 'fs';
import path from 'path';
import { Client } from './client.js';

beforeEach(() => {
	document.documentElement.innerHTML = fs.readFileSync(path.resolve('src/__testdata__/index.html')).toString();
});

describe('sanity checks:', () => {
	test('client can be instantiated', () => {
		const c = new Client();
		expect(c.initialized()).toBe(true);
	});

	test('window.document is in the global scope', () => {
		  const element = window.document.createElement('div');
		  expect(element).not.toBeNull();
	});
});

describe('Client.listen:', () => {
	test('should call the subscriber with data, no error, and simple state', async () => {
		const payload = {
			data: {
				attributes: {
					name: "bob",
				},
			},
		};
		fetchMock.mockResponse(() => {
			const body = JSON.stringify(payload);
			return new Promise( ( res ) => {
				res({
					status: 200,
					headers: {
						'content-type': 'application/vnd.api+json',
						'content-length': body.length,
					},
					body,
				});
			});
		});
		const c = new Client();
		const p = new Promise(( res ) => {
			c.listen(res);
		});
		const [data, error, state] = await p;
		expect(error).toBeNull();
		expect(data).toMatchObject(payload.data);
		expect(state.pending).toBe(false);
		expect(state.assetOrigin).toBe("https://cdn.applura.com/47d2a6c1-de8c-4e3e-ba4c-a8612c2c11ce");
	});
})
