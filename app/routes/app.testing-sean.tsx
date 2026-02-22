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
              const missingAltCount = countImagesWithoutAlt(article.body);

              return (
                <div key={article.id}>
                  <s-section heading={article.title}>
                    <h3>Summary</h3>
                    <p>{article.summary}</p>
                    <h3>Info: </h3>
                    <p>Images with no alt text: {missingAltCount}</p>
                    <div
                      dangerouslySetInnerHTML={{
                        __html: article.body ?? "",
                      }}
                    />
                  </s-section>
                  <br></br>
                </div>
              );
            })}
          </div>
        );
      })}
    </s-page>
  );
}