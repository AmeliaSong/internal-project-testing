import { useAppBridge } from "@shopify/app-bridge-react";
import { CollectionParameters } from "app/components/CollectionParameters";
import { ImageParameters } from "app/components/ImageParameters";
import { ProductParameters } from "app/components/ProductParameters";
import { ProductRow } from "app/components/ProductRow";
import { authenticate } from "app/shopify.server";
import { useEffect, useState } from "react";
import { ActionFunctionArgs, LoaderFunctionArgs, useFetcher } from "react-router";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);

  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
    const { admin } = await authenticate.admin(request);
    const formData = await request.formData();
    const filtersRaw = formData.getAll("filters");
    // Split comma-separated values into individual filters
    const filters = filtersRaw.flatMap(f => (f as string).split(","));

    const response = await admin.graphql(
        `#graphql
            query getProducts {
                products(first: 100, query: "status:active") {
                    edges {
                        node {
                            id
                            title
                            handle
                            description
                            descriptionHtml
                            status
                            featuredMedia {
                                preview {
                                    image {
                                        url
                                        altText
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
    let products = responseJson!.data!.products.edges;

    console.log("Filters applied:", filters);
    console.log("Products before filtering:", products.length);

    // Apply filters
    if (filters.length > 0) {
        products = products.filter((edge: any) => {
            const product = edge.node;
            const hasImages = product.featuredMedia?.preview?.image?.url;
            const hasDescription = product.description && product.description.trim().length > 0;

            if (filters.includes("missing-images") && hasImages) {
                return false;
            }
            if (filters.includes("blank-description") && hasDescription) {
                return false;
            }
            return true;
        });
    }

    console.log("Products after filtering:", products.length);

    return {
        products: {
        edges: products
        }
    };
};

export default function QAManualPage() {
    const [itemType, setItemType] = useState("products");

    const fetcher = useFetcher<typeof action>();
    
    const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";

    return (
        <s-page heading="QA Testing - Manual">
        <s-section slot="aside" heading="About">
            <s-paragraph>
            Write a paragraph later about what this page is for and how to use it.
            </s-paragraph>
        </s-section>
        <s-section slot="aside" heading="Resources">
            <s-unordered-list>
            <s-list-item>
                <s-link
                href="https://shopify.dev/docs/apps/design-guidelines/navigation#app-nav"
                target="_blank"
                >
                App nav best practices
                </s-link>
            </s-list-item>
            </s-unordered-list>
        </s-section>
        <s-section heading="Search Parameters">
            <fetcher.Form method="post">
                <s-select label="Item Type" value={itemType} onChange={(e) => setItemType((e.target as HTMLSelectElement).value)}>
                    <s-option value="products">Products</s-option>
                    <s-option value="collections">Collections</s-option>
                    <s-option value="images">Images</s-option>
                </s-select>
                {itemType === "products" && <ProductParameters/>}
                {itemType === "collections" && <CollectionParameters/>}
                {itemType === "images" && <ImageParameters/>}
                <s-button
                    type="submit"
                    {...(isLoading ? { loading: true } : {})}
                >
                    Submit
                </s-button>
            </fetcher.Form>
        </s-section>

        {itemType === "products" && fetcher.data?.products && 
            <s-section heading="Products Found">
                <s-table>
                <s-table-header-row>
                    <s-table-header></s-table-header>
                    <s-table-header></s-table-header>
                    <s-table-header>Product</s-table-header>
                    <s-table-header>Status</s-table-header>
                    <s-table-header></s-table-header>
                </s-table-header-row>
                <s-table-body>
                    {fetcher.data?.products.edges.map((product: any) => (
                        <ProductRow key={product.node.id} product={product.node} />
                    ))}
                </s-table-body>
                </s-table>
            </s-section>
        }
        {itemType === "collections" && fetcher.data?.products && 
            <s-section heading="Collections Found">
                <s-table>
                <s-table-header-row>
                    <s-table-header></s-table-header>
                    <s-table-header></s-table-header>
                    <s-table-header>Collection name</s-table-header>
                    <s-table-header></s-table-header>
                    <s-table-header></s-table-header>
                </s-table-header-row>
                <s-table-body>
                    <ProductRow/>
                </s-table-body>
                </s-table>
            </s-section>
        }
        {itemType === "images" && fetcher.data?.products && 
            <s-section heading="Images Found">
                <s-table>
                <s-table-header-row>
                    <s-table-header></s-table-header>
                    <s-table-header></s-table-header>
                    <s-table-header>Image name</s-table-header>
                    <s-table-header></s-table-header>
                    <s-table-header></s-table-header>
                </s-table-header-row>
                <s-table-body>
                    <ProductRow/>
                </s-table-body>
                </s-table>
            </s-section>
        }
        </s-page>
    );
}
