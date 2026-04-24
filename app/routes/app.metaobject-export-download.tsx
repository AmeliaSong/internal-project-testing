import type { LoaderFunctionArgs } from "react-router";

import { authenticate } from "../shopify.server";
import {
  handleExportLoader,
  isExportResource,
} from "../features/import-export-metaobjects";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const requestUrl = new URL(request.url);
  const resourceParam = requestUrl.searchParams.get("resource");
  const resource = isExportResource(resourceParam) ? resourceParam : "metaobjects";
  const includeFieldValues = requestUrl.searchParams.get("includeFieldValues") === "1";
  const includeCommandColumn = requestUrl.searchParams.get("includeCommandColumn") === "1";

  return handleExportLoader(admin, resource, includeFieldValues, includeCommandColumn);
};
