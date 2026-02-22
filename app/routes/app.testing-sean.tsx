import React, { useEffect, useState } from "react";
import { useLoaderData } from "react-router";

import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

// ...existing code...
type ArticleNode = {
  id: string;
  title: string;
  handle?: string;
  body?: string; // HTML string
  summary?: string;
};

type ArticleEdge = {
  node: ArticleNode;
};

type ArticlesConnection = {
  edges: ArticleEdge[];
};

type BlogNode = {
  id: string;
  title: string;
  handle: string;
  articles?: ArticlesConnection;
};

type BlogEdge = {
  node: BlogNode;
};

type ImgInfo = {
  src: string;
  alt: string;
  index: number;
};

export const loader = async ({
  request,
}: LoaderFunctionArgs): Promise<{ blogs: BlogEdge[] }> => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
      query GetBlogs {
        blogs(first: 5) {
          edges {
            node {
              id
              title
              handle
              articles(first: 5) {
                edges {
                  node {
                    id
                    title
                    handle
                    body
                    summary
                  }
                }
              }
            }
          }
        }
      }
    `
  );

  const responseJson = await response.json();

  return {
    blogs: responseJson.data.blogs.edges,
  };
};

function countImagesWithoutAlt(html?: string | null): number {
  if (!html) return 0;

  // Browser DOMParser when available (client-side)
  if (typeof DOMParser !== "undefined") {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const imgs = Array.from(doc.getElementsByTagName("img"));
      return imgs.filter(
        (img) => !img.hasAttribute("alt") || (img.getAttribute("alt") ?? "").trim() === ""
      ).length;
    } catch {
      // fall through to regex fallback
    }
  }

  // Fallback for non-DOM environments (simple, pragmatic)
  const tags = html.match(/<img\b[^>]*>/gi) || [];
  return tags.filter((tag) => {
    const m = tag.match(/alt\s*=\s*(['"])(.*?)\1/i);
    if (!m) return true; // no alt attribute
    return m[2].trim() === ""; // alt exists but empty
  }).length;
}

export default function TestingPageSean() {
  const { blogs = [] } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Blog Information">
      {blogs.map((blogEdge: BlogEdge) => {
        const blog = blogEdge.node;
        const articles = blog.articles?.edges ?? [];

        return (
          <div key={blog.id}>
            <h2>{blog.title}</h2>
            <p>
              <strong>Handle:</strong> {blog.handle}
            </p>
            <br />

            {articles.map((articleEdge: ArticleEdge) => {
              const article = articleEdge.node;

              return (
                <div key={article.id}>
                  <s-section heading={article.title}>
                    <h3>Summary</h3>
                    <p>{article.summary}</p>
                    <h3>Images</h3>
                    <ArticleImageAltEditor article={article} />
                  </s-section>
                  <br />
                </div>
              );
            })}
          </div>
        );
      })}
    </s-page>
  );
}

function extractImagesFromHtml(html?: string | null): ImgInfo[] {
  if (!html) return [];
  if (typeof DOMParser !== "undefined") {
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const imgs = Array.from(doc.getElementsByTagName("img"));
      return imgs.map((img, i) => ({
        src: img.getAttribute("src") ?? "",
        alt: img.getAttribute("alt") ?? "",
        index: i,
      }));
    } catch {
      // fall through to regex fallback
    }
  }

  const tags = html.match(/<img\b[^>]*>/gi) || [];
  return tags.map((tag, i) => {
    const srcMatch = tag.match(/src\s*=\s*(['"])(.*?)\1/i);
    const altMatch = tag.match(/alt\s*=\s*(['"])(.*?)\1/i);
    return {
      src: srcMatch ? srcMatch[2] : "",
      alt: altMatch ? altMatch[2] : "",
      index: i,
    };
  });
}

function ArticleImageAltEditor({ article }: { article: ArticleNode }) {
  const [mounted, setMounted] = useState(false);
  const [images, setImages] = useState<ImgInfo[]>([]);
  const [modifiedHtml, setModifiedHtml] = useState(article.body ?? "");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    setImages(extractImagesFromHtml(modifiedHtml));
  }, [mounted, modifiedHtml]);

  function updateAltAt(index: number, newAlt: string) {
    if (typeof DOMParser === "undefined") {
      setImages((prev) => prev.map((img) => (img.index === index ? { ...img, alt: newAlt } : img)));
      setModifiedHtml((prev) => {
        const tags = prev.match(/<img\b[^>]*>/gi) || [];
        const tag = tags[index];
        if (!tag) return prev;
        let newTag = tag;
        if (/alt\s*=/.test(tag)) {
          newTag = tag.replace(/alt\s*=\s*(['"])(.*?)\1/i, `alt="${newAlt}"`);
        } else {
          newTag = tag.replace(/<img\b/, `<img alt="${newAlt}"`);
        }
        return prev.replace(tag, newTag);
      });
      return;
    }

    const doc = new DOMParser().parseFromString(modifiedHtml, "text/html");
    const imgs = Array.from(doc.getElementsByTagName("img"));
    const target = imgs[index];
    if (!target) return;
    target.setAttribute("alt", newAlt);
    setModifiedHtml(doc.body.innerHTML);
    setImages(Array.from(doc.getElementsByTagName("img")).map((img, i) => ({
      src: img.getAttribute("src") ?? "",
      alt: img.getAttribute("alt") ?? "",
      index: i,
    })));
  }

  function updateAll() {
    if (typeof DOMParser === "undefined") return;
    const doc = new DOMParser().parseFromString(modifiedHtml, "text/html");
    const imgs = Array.from(doc.getElementsByTagName("img"));
    images.forEach((imgInfo) => {
      const el = imgs[imgInfo.index];
      if (el) el.setAttribute("alt", imgInfo.alt);
    });
    setModifiedHtml(doc.body.innerHTML);
  }

  return (
    <div>
      <p>Images with no alt text: {images.filter((i) => !i.alt || i.alt.trim() === "").length}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {images.map((imgInfo) => (
          <div key={imgInfo.index} style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <img src={imgInfo.src} alt={imgInfo.alt} style={{ maxWidth: 120, maxHeight: 80, objectFit: "contain" }} />
            <div>
              <input
                value={imgInfo.alt}
                onChange={(e) => setImages((prev) => prev.map((it) => (it.index === imgInfo.index ? { ...it, alt: e.target.value } : it)))}
              />
              <button onClick={() => updateAltAt(imgInfo.index, imgInfo.alt)}>Update</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "1rem" }}>
        <button onClick={updateAll}>Update All</button>
      </div>

      <h4>Preview</h4>
      <div dangerouslySetInnerHTML={{ __html: modifiedHtml ?? "" }} />
    </div>
  );
}