const match = (identifier) => (resource) => identifier.type === resource.type && identifier.id === resource.id;

function linkset(linksObject) {
	return Object.entries(linksObject).map(([key, link]) => {
		return {rel: key, ...link};
	}).reduce((set, link) => {
		return {...set, [link.rel]: [link, ...(set[link.rel] ? set[link.rel] : [])]};
	}, {});
}

function resolve(relationship, resources) {
	const resolved = {};
	const hasLinks = 'links' in data;
	if (hasLinks) {
		Object.defineProperty(resolved, 'linkset', linkset(relationship.links));
	}
	Object.defineProperty(resolved, 'data', {
		get() {
			if (!Array.isArray(relationship.data)) {
				return flatten(resources.find(match(relationship.data)), resources);
			}
			return relationship.data.map((identifier) => flatten(resources.find(match(identifier))));
		},
	});
	return resolved;
}

export default function parse(doc) {
	const { data, included, errors } = doc;
	if (errors) {
		throw new Error('cannot parse error documents');
	}
	if (Array.isArray(data)) {
		throw new Error('cannot parse collection documents');
	}
	const parsed = {};
	const attributes = data.attributes || {};
	const relationships = data.relationships || {};
	const hasLinks = 'links' in data;
	for (let member in attributes) {
		Object.defineProperty(parsed, member, {value: attributes[member]});
	}
	for (let member in relationships) {
		Object.defineProperty(parsed, member, {
			get() {
				return resolve(relationships[member], [data, ...included]);
			},
		});
	}
	if (hasLinks) {
		parsed.defineProperty(parsed, 'linkset', {value: linkset(data.links)});
	}
	return parsed;
}