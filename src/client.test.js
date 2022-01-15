import { Client } from './client.js';

const indexHTML = `<!DOCTYPE html><html lang="en-US"><head><link class="applura" rel="alternate" href="http://localhost" /><title>Test document</title></head><body></body></html>`

beforeEach(() => {
	document.documentElement.innerHTML = indexHTML;
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

describe('listen', () => {
	test('will notify the subscriber when data has been fetched', async () => {
		//const html = window.document.createElement('html');
		//const head = window.document.createElement('head');
		//const alternateLink = window.document.createElement('link');
		//head.append(alternateLink);
		//html.append(head);
		//window.document.append(html);
		const c = new Client();
		const p = new Promise(( res ) => {
			c.listen(res);
		});
		const [ data, error, { assetOrigin }] = await p;
	});
})
