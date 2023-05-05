import { UsageError } from "./errors.js";

export default function parse(doc) {
  if (!("data" in doc)) {
    throw new UsageError(
      "the parse function only supports JSON:API documents with primary data",
    );
  }
  return (new Doc(doc)).primary;
}

function Doc(obj) {
  if ("data" in obj) {
    Object.defineProperty(this, "resources", { value: new Map() });
    Object.defineProperty(this, "primary", {
      value: new Resource(obj.data, this),
    });
  }
  if ("included" in obj) {
    for (const include of obj.included) {
      this.resources.set(
        `${include.type}:${include.id}`,
        new Resource(include, this),
      );
    }
  }
}

function Resource(obj, doc) {
  Object.defineProperty(this, "type", { value: obj.type, enumerable: true });
  Object.defineProperty(this, "id", { value: obj.id, enumerable: true });
  if ("attributes" in obj) {
    for (const attribute in obj.attributes) {
      Object.defineProperty(this, attribute, {
        value: obj.attributes[attribute],
        enumerable: true,
      });
    }
  }
  if ("relationships" in obj) {
    for (const relationship in obj.relationships) {
      Object.defineProperty(this, relationship, {
        value: new Relationship(obj.relationships[relationship], doc),
        enumerable: true,
      });
    }
  }
  if ("links" in obj) {
    Object.defineProperty(this, "links", {
      value: new Links(obj.links),
      enumerable: true,
    });
  }
  doc.resources.set(`${obj.type}:${obj.id}`, this);
}

function Relationship(obj, doc) {
  if ("data" in obj) {
    if (Array.isArray(obj.data)) {
      Object.defineProperty(this, "data", {
        get: () => obj.data.map(resolveFrom(doc)),
        enumerable: true,
      });
    } else {
      Object.defineProperty(this, "data", {
        get: () => resolveFrom(doc)(obj.data),
        enumerable: true,
      });
    }
  }
  if ("links" in obj) {
    Object.defineProperty(this, "links", {
      value: obj.links,
      enumerable: true,
    });
  }
}

function Links(obj) {
  const links = [];
  for (const key in obj) {
    links.push(new Link(obj[key], key));
  }
  Object.defineProperty(this, Symbol.iterator, {
    value: function () {
      let i = 0;
      return {
        next: function () {
          return (i++ < links.length) ? { value: links[i] } : { done: true };
        },
      };
    },
  });
  Object.defineProperty(this, "get", {
    value: function (rel) {
      return links.find((link) => link.rel === rel);
    },
  });
  Object.defineProperty(this, "getAll", {
    value: function (rel) {
      return links.filter((link) => link.rel === rel);
    },
  });
  Object.defineProperty(this, "has", {
    value: function (rel) {
      return links.some((link) => link.rel === rel);
    },
  });
}

function Link(raw, key) {
  const link = typeof raw === "string" ? { href: raw } : raw;
  if ("rel" in link === false) {
    link.rel = key;
  }
  for (const attr in link) {
    Object.defineProperty(this, attr, { value: link[attr], enumerable: true });
  }
}

function resolveFrom(doc) {
  return (identifier) => {
    return doc.resources.get(`${identifier.type}:${identifier.id}`);
  };
}
