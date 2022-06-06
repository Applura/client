function Doc(raw) {
    const obj = JSON.parse(raw);
    Object.defineProperty(this, 'raw', {value: raw});
    Object.defineProperty(this, 'obj', {value: obj});
    Object.defineProperty(this, 'clone', {
        value: function () {
            return new Doc(raw);
        },
    });
    if (obj.data) {
        Object.defineProperty(this, 'resources', {value: new Map()});
        Object.defineProperty(this, 'primary', {value: new Resource(doc.obj.data, doc)});
    }
}

function Resource(obj, doc) {
    Object.defineProperty(this, 'type', {value: obj.type, enumerable: true});
    Object.defineProperty(this, 'id', {value: obj.id, enumerable: true});
    doc.resources.set(`${obj.type}:${obj.id}`, this);
    for (const attribute in obj.attributes || {}) {
        Object.defineProperty(this, attribute, {
            value: obj.attributes[attribute],
            enumerable: true,
        });
    }
    for (const relationship in obj.relationships || {}) {
        Object.defineProperty(this, relationship, {
            value: new Relationship(obj.attributes[relationship], doc),
            enumerable: true,
        });
    }
}

function Relationship(obj, doc) {
    if ('data' in obj) {
        Object.defineProperty(this, 'data', {
            value: Array.isArray(obj.data)
                    ? obj.data.map(resolveFrom(doc))
                    : resolveFrom(doc)(obj.data),
            enumerable: true,
        });
    }
}

function resolveFrom(doc) {
    return (identifier) => {
        const test = match(identifier);
        if (test(doc.obj.data)) {
            return doc.resource;
        }
        if (doc.obj.included) {
            return doc.obj.included.find(test);
        }
        return identifier;
    }
}

function match(identifier) {
    return (resource) => identifier.type === resource.type && identifier.id === resource.id;
}
