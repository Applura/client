import { parse } from "@applura/ouroboros";
import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std/testing/asserts.ts";
import { UsageError } from "./errors.js";

Deno.test("parse: usage error", () => {
  assertThrows(() => parse(JSON.stringify({})), new UsageError("Test error"));
});

Deno.test("parse: attribute destructuring", () => {
  const jsonString = JSON.stringify({
    data: {
      attributes: {
        foo: "bar",
      },
    },
  });
  const { foo } = parse(jsonString);
  assertEquals(foo, "bar");
});

Deno.test("parse: to-one relationship destructuring", () => {
  const jsonString = JSON.stringify({
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
  const { foo: { type, id, bar } } = parse(jsonString);
  assertEquals(type, "foo:type");
  assertEquals(id, "3bd6083aff810e");
  assertEquals(bar, "baz");
});

Deno.test("parse: to-many relationship destructuring", () => {
  const jsonString = JSON.stringify({
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

  const { foo } = parse(jsonString);
  assertEquals(2, foo.length);
  const [one, two] = foo;
  assertEquals(one.type, "foo:type");
  assertEquals(one.id, "3bd6083aff810e");
  assertEquals(one.bar, "baz");
  assertEquals(two.type, "foo:type");
  assertEquals(two.id, "1852628f03668a");
  assertEquals(two.bar, "qux");
});
