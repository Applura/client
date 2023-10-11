import parse from './resource.js';
import {
  assertEquals,
  assertInstanceOf,
} from "https://deno.land/std@0.185.0/testing/asserts.ts";

const testDoc1 = {
  "data": {
    "type": "blog",
    "id": "blog:3",
    "attributes": {
      "title": "Blog"
    },
    "relationships": {
      "posts": {
        "data": [
          {
            "type": "article",
            "id": "article:1"
          }
        ]
      },
      "mainMenu": {
        "data": {
          "type": "nav:menu",
          "id": "nav:menu:main"
        }
      }
    },
    "links": {
      "self": {
        "href": "\/blog"
      },
    }
  },
  "included": [
    {
      "type": "nav:menu",
      "id": "nav:menu:main",
      "attributes": {
        "label": "Main navigation",
        "items": [
          {
            "href": "\/",
            "title": "Home"
          },
          {
            "href": "\/blog",
            "title": "Blog"
          }
        ]
      }
    },
    {
      "type": "article",
      "id": "article:1",
      "attributes": {
        "title": "Test article",
        "author": "Gabe Sullice",
        "date": "2023-10-02",
        "excerpt": "\u003Cp\u003EJust a few words about this post\u003C\/p\u003E"
      },
      "links": {
        "canonical": {
          "href": "\/blog\/test-article"
        }
      }
    }
  ]
}

const parsed = parse(testDoc1);
Deno.test("parse basic", () => {
  assertEquals(parsed.type, "blog");
  assertEquals(parsed.title, "Blog");
  // assertEquals(parsed.posts[0].title, 'Test article');
});

Deno.test("parse relationships", () => {
  assertEquals(parsed.posts.data[0].title, 'Test article');
  assertEquals(parsed.mainMenu.data.items[0].title, 'Home');
})

Deno.test("parse links", () => {
  assertEquals(parsed.links.get('self').href, '/blog');
  assertEquals(parsed.posts.data[0].links.get('canonical').href, '/blog/test-article')
  const selfLinks = parsed.links.getAll('self');
  assertEquals(selfLinks[0].href, '/blog');
});