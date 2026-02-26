import { authenticate } from "../shopify.server";

/**
 * Gets the first 5 products from the Shopify store
 */
export async function getFirst5Products(request: Request) {
  const { admin } = await authenticate.admin(request);

  const response = await admin?.graphql(
    `
      query {
        products(first: 5) {
          edges {
            node {
              id
              title
              handle
              status
              vendor
            }
          }
        }
      }
    `
  );

  const data = await response?.json();
  return data?.data?.products?.edges || [];
}