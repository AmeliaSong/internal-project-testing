import React, { useEffect, useState } from "react";
import {
  useLoaderData,
  useFetcher,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "react-router";

import { authenticate } from "../shopify.server";

/* =========================
   TYPES
========================= */

type ArticleNode = {
  id: string;
  title: string;
  handle?: string;
  body?: string;
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

/* =========================
   LOADER (READ)
========================= */

export const loader = async ({
  request,
}: LoaderFunctionArgs): Promise<{ blogs: BlogEdge[] }> => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`
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
  `);

  const json = await response.json();

  return {
    blogs: json.data.blogs.edges,
  };
};

/* =========================
   ACTION (WRITE)
========================= */

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();

  const articleId = formData.get("articleId") as string;
  const body = formData.get("body") as string;

  const response = await admin.graphql(
  `
  mutation articleUpdate($id: ID!, $article: ArticleUpdateInput!) {
    articleUpdate(id: $id, article: $article) {
      article {
        id
        body
      }
      userErrors {
        field
        message
      }
    }
  }
  `,
  {
    variables: {
      id: articleId,
      article: {
        body: body,
      },
    },
  }
);

  const json = await response.json();

  console.log("Mutation response:", json);

  return json;
};

/* =========================
   MAIN PAGE
========================= */

export default function TestingPageSean() {
  const { blogs = [] } = useLoaderData<typeof loader>();

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Blog Information</h1>

      {blogs.map((blogEdge) => {
        const blog = blogEdge.node;
        const articles = blog.articles?.edges ?? [];

        return (
          <div key={blog.id} style={{ marginBottom: "3rem" }}>
            <h2>{blog.title}</h2>
            <p>
              <strong>Handle:</strong> {blog.handle}
            </p>

            {articles.map((articleEdge) => {
              const article = articleEdge.node;

              return (
                <>
                  <s-section heading="Multiple pages" key={article.id}>
                    <h3>{article.title}</h3>
                    <p>{article.summary}</p>

                    <ArticleImageAltEditor article={article} />
                  </s-section>
                  <br></br>
                </>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/* =========================
   IMAGE EDITOR COMPONENT
========================= */

function extractImagesFromHtml(html?: string | null): ImgInfo[] {
  if (!html) return [];

  const doc = new DOMParser().parseFromString(html, "text/html");
  const imgs = Array.from(doc.getElementsByTagName("img"));

  return imgs.map((img, i) => ({
    src: img.getAttribute("src") ?? "",
    alt: img.getAttribute("alt") ?? "",
    index: i,
  }));
}

function ArticleImageAltEditor({ article }: { article: ArticleNode }) {
  const fetcher = useFetcher();

  const [images, setImages] = useState<ImgInfo[]>([]);
  const [modifiedHtml, setModifiedHtml] = useState(article.body ?? "");

  useEffect(() => {
    setImages(extractImagesFromHtml(modifiedHtml));
  }, [modifiedHtml]);

  function updateAlt(index: number, newAlt: string) {
    const doc = new DOMParser().parseFromString(modifiedHtml, "text/html");
    const imgs = Array.from(doc.getElementsByTagName("img"));

    if (!imgs[index]) return;

    imgs[index].setAttribute("alt", newAlt);

    setModifiedHtml(doc.body.innerHTML);
  }

  function saveToShopify() {
    fetcher.submit(
      {
        articleId: article.id,
        body: modifiedHtml,
      },
      { method: "post" }
    );
  }

  const missingAltCount = images.filter(
    (i) => !i.alt || i.alt.trim() === ""
  ).length;

  return (
    <div style={{ marginTop: "1rem" }}>
      <p>
        <strong>Images missing alt text:</strong> {missingAltCount}
      </p>

      {images.map((img, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: "1rem",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <img
            src={img.src}
            alt={img.alt}
            style={{ width: 120, height: 80, objectFit: "contain" }}
          />

          <input
            value={img.alt}
            onChange={(e) => updateAlt(i, e.target.value)}
            placeholder="Enter alt text"
          />
        </div>
      ))}

      <button
        onClick={saveToShopify}
        style={{
          marginTop: "1rem",
          padding: "0.5rem 1rem",
          cursor: "pointer",
        }}
      >
        Save to Shopify
      </button>

      {/* <h4 style={{ marginTop: "2rem" }}>Preview</h4>
      <div
        dangerouslySetInnerHTML={{ __html: modifiedHtml }}
        style={{ border: "1px solid #ddd", padding: "1rem" }}
      /> */}
    </div>
  );
}