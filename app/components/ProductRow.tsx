export function ProductRow({ product }: any) {
    const getStatusBadge = (status: string) => {
        switch(status) {
            case "ACTIVE":
                return <s-badge tone="success">Active</s-badge>;
            case "DRAFT":
                return <s-badge tone="info">Draft</s-badge>;
            case "ARCHIVED":
                return <s-badge tone="critical">Archived</s-badge>;
            default:
                return <s-badge>Unlisted</s-badge>;
        }
    };

    return (
        <s-table-row>
            <s-table-cell>
                <s-checkbox/>
            </s-table-cell>
            <s-table-cell>
                <s-thumbnail src={product.featuredMedia?.preview?.image?.url} alt={product.featuredMedia?.preview?.image?.altText} />
            </s-table-cell>
            <s-table-cell>
                <s-paragraph>{product.title}</s-paragraph>
            </s-table-cell>
            <s-table-cell>
                {getStatusBadge(product.status)}
            </s-table-cell>
        </s-table-row>
    )
}