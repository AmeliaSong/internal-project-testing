import { type LoaderFunctionArgs } from "react-router";

import { authenticate } from "../shopify.server";

type DefinitionEdge = {
  node: {
    type: string;
    name: string;
  };
};

type DefinitionConnection = {
  edges: DefinitionEdge[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
};

type MetaobjectNode = {
  id: string;
  handle: string;
  fields?: Array<{
    key: string;
    value: string | null;
  }>;
};

type MetaobjectEdge = {
  node: MetaobjectNode;
};

type MetaobjectConnection = {
  edges: MetaobjectEdge[];
  pageInfo: {
    hasNextPage: boolean;
    endCursor: string | null;
  };
};

function csvEscape(value: unknown): string {
  const stringValue = value == null ? "" : String(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

async function fetchAllDefinitionEdges(admin: Awaited<ReturnType<typeof authenticate.admin>>["admin"]) {
  const allEdges: DefinitionEdge[] = [];
  let after: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const response: Response = await admin.graphql(
      `
      query GetMetaobjectDefinitions($after: String) {
        metaobjectDefinitions(first: 100, after: $after) {
          edges {
            node {
              type
              name
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
      `,
      { variables: { after } }
    );

    const json: any = await response.json();
    const connection: DefinitionConnection | undefined = json?.data?.metaobjectDefinitions;
    const edges = connection?.edges ?? [];
    allEdges.push(...edges);

    hasNextPage = Boolean(connection?.pageInfo?.hasNextPage);
    after = connection?.pageInfo?.endCursor ?? null;
  }

  return allEdges;
}

async function fetchAllMetaobjectsByType(
  admin: Awaited<ReturnType<typeof authenticate.admin>>["admin"],
  type: string,
  includeFieldValues: boolean
) {
  const allEntries: MetaobjectNode[] = [];
  let after: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const response: Response = await admin.graphql(
      `
      query GetMetaobjectsByType($type: String!, $after: String, $includeFieldValues: Boolean!) {
        metaobjects(type: $type, first: 250, after: $after) {
          edges {
            node {
              id
              handle
              fields @include(if: $includeFieldValues) {
                key
                value
              }
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
      `,
      { variables: { type, after, includeFieldValues } }
    );

    const json: any = await response.json();
    const connection: MetaobjectConnection | undefined = json?.data?.metaobjects;
    const entries = (connection?.edges ?? []).map((edge) => edge.node);
    allEntries.push(...entries);

    hasNextPage = Boolean(connection?.pageInfo?.hasNextPage);
    after = connection?.pageInfo?.endCursor ?? null;
  }

  return allEntries;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const requestUrl = new URL(request.url);
  const includeFieldValues = requestUrl.searchParams.get("includeFieldValues") === "1";

  const definitionEdges = await fetchAllDefinitionEdges(admin);

  const rows: string[] = [];

  for (const { node: definition } of definitionEdges) {
    const entries = await fetchAllMetaobjectsByType(admin, definition.type, includeFieldValues);

    for (const entry of entries) {
      if (includeFieldValues) {
        const fields = entry.fields ?? [];

        if (fields.length === 0) {
          rows.push([entry.handle, definition.type, definition.name, "", ""].map(csvEscape).join(","));
          continue;
        }

        for (const field of fields) {
          rows.push(
            [entry.handle, definition.type, definition.name, field.key, field.value ?? ""]
              .map(csvEscape)
              .join(",")
          );
        }
      } else {
        rows.push([entry.handle, definition.type, definition.name, "", ""].map(csvEscape).join(","));
      }
    }
  }

  const headerValues = ["handle", "definitionType", "definitionName", "field", "value"];
  const headerRow = headerValues.map(csvEscape).join(",");

  const csv = [headerRow, ...rows].join("\n");
  const filename = `metaobjects-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
};
