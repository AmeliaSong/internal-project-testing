import { useLoaderData } from "react-router";

import type { LoaderFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
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

export default function TestingPageSean() {
  const { blogs } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Blog Information">
      {blogs.map((blogEdge) => {
        const blog = blogEdge.node;

        return (
          <div key={blog.id}>
            <h2>{blog.title}</h2>
            <p><strong>Handle:</strong> {blog.handle}</p>
            <br></br>

            {blog.articles.edges.map((articleEdge) => {
              const article = articleEdge.node;

              return (
                <>
                  <s-section key={article.id} heading={article.title}>
                    <h3>Summary</h3>
                    <p>{article.summary}</p>
                    <h3>Info: </h3>
                    <p>Images with no alt text: {}</p>
                    <div
                      dangerouslySetInnerHTML={{
                        __html: article.bodyHtml,
                      }}
                    />
                  </s-section>
                  <br></br>
                </>
              );
            })}
          </div>
        );
      })}
    </s-page>
  );
}