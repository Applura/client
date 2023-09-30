import parse from "./resource.js";
import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.203.0/assert/mod.ts";
import { UsageError } from "./errors.js";

Deno.test("parse: usage error", () => {
  assertThrows(() => parse({}), UsageError);
});

Deno.test("parse: attribute destructuring", () => {
  const { foo } = parse({
    data: {
      attributes: {
        foo: "bar",
      },
    },
  });
  assertEquals(foo, "bar");
});

Deno.test("parse: to-one relationship destructuring", () => {
  const { foo: { data: { type, id, bar } } } = parse({
    data: {
      relationships: {
        foo: {
          data: {
            type: "foo:type",
            id: "3bd6083aff810e",
          },
        },
      },
    },
    included: [{
      type: "foo:type",
      id: "3bd6083aff810e",
      attributes: {
        bar: "baz",
      },
    }],
  });
  assertEquals(type, "foo:type");
  assertEquals(id, "3bd6083aff810e");
  assertEquals(bar, "baz");
});

Deno.test("parse: to-many relationship destructuring", () => {
  const { foo: { data: bar } } = parse({
    data: {
      relationships: {
        foo: {
          data: [{
            type: "foo:type",
            id: "3bd6083aff810e",
          }, {
            type: "foo:type",
            id: "1852628f03668a",
          }],
        },
      },
    },
    included: [{
      type: "foo:type",
      id: "1852628f03668a",
      attributes: {
        bar: "qux",
      },
    }, {
      type: "foo:type",
      id: "3bd6083aff810e",
      attributes: {
        bar: "baz",
      },
    }],
  });
  assertEquals(2, bar.length);
  const [one, two] = bar;
  assertEquals(one.type, "foo:type");
  assertEquals(one.id, "3bd6083aff810e");
  assertEquals(one.bar, "baz");
  assertEquals(two.type, "foo:type");
  assertEquals(two.id, "1852628f03668a");
  assertEquals(two.bar, "qux");
});
