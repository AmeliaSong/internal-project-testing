import { type LoaderFunctionArgs } from "react-router";

import { authenticate } from "../shopify.server";

type MetaobjectDefinition = {
  type: string;
  name: string;
};

type MetaobjectField = {
  key: string;
  value: string | null;
};

type MetaobjectNode = {
  id: string;
  type: string;
  handle: string;
  displayName: string | null;
  updatedAt: string;
  fields: MetaobjectField[];
};

type GraphqlPageInfo = {
  hasNextPage: boolean;
  endCursor: string | null;
};

type ExportRow = {
  id: string;
  handle: string;
  definitionHandle: string;
  definitionName: string;
  displayName: string;
  updatedAt: string;
  fields: Record<string, string>;
};

const DEF_PAGE_SIZE = 100;
const METAOBJECT_PAGE_SIZE = 250;

async function graphqlJson<T>(
  admin: any,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const res = await admin.graphql(query, variables ? { variables } : undefined);
  const json = await res.json();

  if (json.errors?.length) {
    throw new Error(json.errors.map((e: { message: string }) => e.message).join("; "));
  }

  return json as T;
}

async function fetchAllDefinitions(admin: any): Promise<MetaobjectDefinition[]> {
  const definitions: MetaobjectDefinition[] = [];
  let hasNextPage = true;
  let after: string | null = null;

  while (hasNextPage) {
    type DefinitionsResponse = {
      data: {
        metaobjectDefinitions: {
          edges: { node: MetaobjectDefinition }[];
          pageInfo: GraphqlPageInfo;
        };
      };
    };

    const json: DefinitionsResponse = await graphqlJson<DefinitionsResponse>(
      admin,
      `
      query MetaobjectDefinitions($first: Int!, $after: String) {
        metaobjectDefinitions(first: $first, after: $after) {
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
      { first: DEF_PAGE_SIZE, after },
    );

    const page: DefinitionsResponse["data"]["metaobjectDefinitions"] =
      json.data.metaobjectDefinitions;
    definitions.push(...page.edges.map((edge: { node: MetaobjectDefinition }) => edge.node));
    hasNextPage = page.pageInfo.hasNextPage;
    after = page.pageInfo.endCursor;
  }

  return definitions;
}

async function fetchAllMetaobjectsForType(
  admin: any,
  type: string,
): Promise<MetaobjectNode[]> {
  const entries: MetaobjectNode[] = [];
  let hasNextPage = true;
  let after: string | null = null;

  while (hasNextPage) {
    type MetaobjectsResponse = {
      data: {
        metaobjects: {
          edges: { node: MetaobjectNode }[];
          pageInfo: GraphqlPageInfo;
        };
      };
    };

    const json: MetaobjectsResponse = await graphqlJson<MetaobjectsResponse>(
      admin,
      `
      query MetaobjectsByType($type: String!, $first: Int!, $after: String) {
        metaobjects(type: $type, first: $first, after: $after) {
          edges {
            node {
              id
              type
              handle
              displayName
              updatedAt
              fields {
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
      { type, first: METAOBJECT_PAGE_SIZE, after },
    );

    const page: MetaobjectsResponse["data"]["metaobjects"] = json.data.metaobjects;
    entries.push(...page.edges.map((edge: { node: MetaobjectNode }) => edge.node));
    hasNextPage = page.pageInfo.hasNextPage;
    after = page.pageInfo.endCursor;
  }

  return entries;
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes("\n") || value.includes("\r") || value.includes('"')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function toCsv(rows: ExportRow[], fieldKeys: string[]): string {
  const headers = [
    "id",
    "handle",
    "definition: handle",
    "definition: name",
    "display name",
    "updated at",
    ...fieldKeys.map((fieldKey) => `field: ${fieldKey}`),
  ];

  const lines = [headers.map(escapeCsv).join(",")];

  rows.forEach((row) => {
    const line = [
      row.id,
      row.handle,
      row.definitionHandle,
      row.definitionName,
      row.displayName,
      row.updatedAt,
      ...fieldKeys.map((fieldKey) => row.fields[fieldKey] ?? ""),
    ];

    lines.push(line.map(escapeCsv).join(","));
  });

  return `${lines.join("\n")}\n`;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  try {
    const definitions = await fetchAllDefinitions(admin);

    const rows: ExportRow[] = [];
    const fieldKeySet = new Set<string>();

    for (const definition of definitions) {
      const entries = await fetchAllMetaobjectsForType(admin, definition.type);

      entries.forEach((entry) => {
        const rowFields: Record<string, string> = {};

        entry.fields.forEach((field) => {
          rowFields[field.key] = field.value ?? "";
          fieldKeySet.add(field.key);
        });

        rows.push({
          id: entry.id,
          handle: entry.handle,
          definitionHandle: entry.type,
          definitionName: definition.name,
          displayName: entry.displayName ?? "",
          updatedAt: entry.updatedAt,
          fields: rowFields,
        });
      });
    }

    const orderedFieldKeys = Array.from(fieldKeySet).sort((a, b) => a.localeCompare(b));
    const csv = toCsv(rows, orderedFieldKeys);
    const timestamp = new Date().toISOString().replaceAll(":", "-");

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="metaobjects-export-${timestamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to export metaobjects";
    return new Response(message, { status: 500 });
  }
};
