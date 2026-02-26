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
    const cursor = formData.get("cursor") as string | null;
    const filterCursor = formData.get("filterCursor") as string | null;

    const response = await admin.graphql(
        `#graphql
            query getProducts($after: String) {
                products(first: 100, query: "status:active", after: $after) {
                    edges {
                        node {
                            id
                            title
                            status
                            description
                            featuredMedia {
                                preview {
                                    image {
                                        url
                                        altText
                                    }
                                }
                            }
                        }
                        cursor
                    }
                    pageInfo {
                        hasNextPage
                        hasPreviousPage
                        endCursor
                        startCursor
                    }
                }
            }
        `,
        {
            variables: {
                after: filters.length > 0 ? filterCursor : cursor || null
            }
        }
    );
    const responseJson = await response.json();
    let products = responseJson!.data!.products.edges;
    const pageInfo = responseJson!.data!.products.pageInfo;

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
            edges: products,
            pageInfo: filters.length === 0 ? pageInfo : null,
            nextFilterCursor: filters.length > 0 ? pageInfo.endCursor : null,
            hasMoreProducts: filters.length > 0 ? pageInfo.hasNextPage : false
        }
    };
};

export default function QAManualPage() {
    const [itemType, setItemType] = useState("products");
    const [currentFilteredPage, setCurrentFilteredPage] = useState(1);
    const [accumulatedFilteredProducts, setAccumulatedFilteredProducts] = useState<any[]>([]);
    const [filterCursor, setFilterCursor] = useState<string | null>(null);
    const [hasMoreFilteredProducts, setHasMoreFilteredProducts] = useState(false);
    const [lastSubmittedFilters, setLastSubmittedFilters] = useState<string>("");
    const ITEMS_PER_FILTERED_PAGE = 10;

    const fetcher = useFetcher<typeof action>();
    
    const isLoading =
    ["loading", "submitting"].includes(fetcher.state) &&
    fetcher.formMethod === "POST";

    const hasFilters = fetcher.data?.products && fetcher.data.products.pageInfo === null;
    
    // Detect when form is newly submitted vs pagination
    useEffect(() => {
        if (fetcher.state === "submitting") {
            const formElement = document.querySelector("form") as HTMLFormElement;
            if (formElement) {
                const formData = new FormData(formElement);
                const currentFilters = formData.getAll("filters").join(",");
                
                // If filters changed, reset accumulated products
                if (currentFilters !== lastSubmittedFilters) {
                    setAccumulatedFilteredProducts([]);
                    setFilterCursor(null);
                    setCurrentFilteredPage(1);
                    setHasMoreFilteredProducts(false);
                    setLastSubmittedFilters(currentFilters);
                }
            }
        }
    }, [fetcher.state, lastSubmittedFilters]);
    
    // Update accumulated products when new filtered data arrives
    useEffect(() => {
        if (hasFilters && fetcher.data?.products?.edges) {
            setAccumulatedFilteredProducts(prev => [...prev, ...fetcher.data!.products!.edges]);
            setFilterCursor(fetcher.data.products.nextFilterCursor);
            setHasMoreFilteredProducts(fetcher.data.products.hasMoreProducts);
        }
    }, [fetcher.data, hasFilters]);
    
    // For filtered results, paginate locally
    let displayedProducts = accumulatedFilteredProducts;
    let currentPageProducts = displayedProducts;
    let totalFilteredPages = 1;

    if (hasFilters) {
        totalFilteredPages = Math.ceil(displayedProducts.length / ITEMS_PER_FILTERED_PAGE);
        const startIdx = (currentFilteredPage - 1) * ITEMS_PER_FILTERED_PAGE;
        const endIdx = startIdx + ITEMS_PER_FILTERED_PAGE;
        currentPageProducts = displayedProducts.slice(startIdx, endIdx);
        
        // Check if we need to fetch more data
        const itemsNeededForPage = currentFilteredPage * ITEMS_PER_FILTERED_PAGE;
        if (displayedProducts.length < itemsNeededForPage && hasMoreFilteredProducts && !isLoading) {
            // Auto-fetch next batch if we don't have enough items for requested page
            const formElement = document.querySelector("form") as HTMLFormElement;
            if (formElement) {
                const formData = new FormData(formElement);
                formData.set("filterCursor", filterCursor || "");
                formData.delete("cursor");
                fetcher.submit(formData, { method: "POST" });
            }
        }
    }

    const handleNextPage = () => {
        if (hasFilters) {
            // Local pagination for filtered results
            if (currentFilteredPage < totalFilteredPages) {
                setCurrentFilteredPage(currentFilteredPage + 1);
            }
        } else {
            // Server-side pagination for unfiltered results
            const nextCursor = fetcher.data?.products?.pageInfo?.endCursor;
            if (nextCursor && fetcher.data) {
                const formElement = document.querySelector("form") as HTMLFormElement;
                if (formElement) {
                    const formData = new FormData(formElement);
                    formData.set("cursor", nextCursor);
                    formData.delete("filterCursor");
                    fetcher.submit(formData, { method: "POST" });
                }
            }
        }
    };

    const handlePreviousPage = () => {
        if (hasFilters) {
            // Local pagination for filtered results
            if (currentFilteredPage > 1) {
                setCurrentFilteredPage(currentFilteredPage - 1);
            }
        } else {
            // Reset to first page for unfiltered results
            const formElement = document.querySelector("form") as HTMLFormElement;
            if (formElement) {
                const formData = new FormData(formElement);
                formData.delete("cursor");
                fetcher.submit(formData, { method: "POST" });
            }
        }
    };

    return (
        <s-page heading="QA Testing - Manual">
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
                    {currentPageProducts.map((product: any) => (
                        <ProductRow key={product.node.id} product={product.node} />
                    ))}
                </s-table-body>
                </s-table>
                <div style={{ marginTop: "16px", display: "flex", gap: "8px", alignItems: "center" }}>
                    <s-button
                        disabled={hasFilters ? currentFilteredPage === 1 : !fetcher.data?.products?.pageInfo?.hasPreviousPage || isLoading}
                        onClick={handlePreviousPage}
                    >
                        Previous
                    </s-button>
                    <span>
                        {hasFilters 
                            ? `Page ${currentFilteredPage} of ${totalFilteredPages}${hasMoreFilteredProducts && currentFilteredPage === totalFilteredPages ? '+' : ''}` 
                            : "Page 1"}
                    </span>
                    <s-button
                        disabled={hasFilters ? (currentFilteredPage === totalFilteredPages && !hasMoreFilteredProducts) : !fetcher.data?.products?.pageInfo?.hasNextPage || isLoading}
                        onClick={handleNextPage}
                    >
                        Next
                    </s-button>
                </div>
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
