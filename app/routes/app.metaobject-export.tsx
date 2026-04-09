import React, { useState } from "react";
import { type LoaderFunctionArgs } from "react-router";

import { authenticate } from "../shopify.server";

const DOWNLOAD_PATH = "/app/metaobject-export-download";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

function parseFilename(contentDisposition: string | null): string {
  if (!contentDisposition) return "metaobjects-export.csv";
  const match = contentDisposition.match(/filename="?([^\"]+)"?/i);
  return match?.[1] ?? "metaobjects-export.csv";
}

export default function MetaobjectExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [includeFieldValues, setIncludeFieldValues] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    setErrorMessage(null);

    try {
      const params = new URLSearchParams();
      if (includeFieldValues) {
        params.set("includeFieldValues", "1");
      }

      const response = await fetch(`${DOWNLOAD_PATH}${params.toString() ? `?${params.toString()}` : ""}`, {
        method: "GET",
        headers: {
          Accept: "text/csv",
        },
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to export metaobjects");
      }

      const blob = await response.blob();
      const filename = parseFilename(response.headers.get("Content-Disposition"));
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ padding: "1rem", maxWidth: "700px" }}>
      <h1>Metaobject Export</h1>
      <p>
        Export all metaobjects into a CSV where each row is one metaobject entry with core columns:
        type, name, ID, and handle.
      </p>

      <label style={{ display: "block", marginBottom: "0.75rem" }}>
        <input
          type="checkbox"
          checked={includeFieldValues}
          onChange={(event) => setIncludeFieldValues(event.currentTarget.checked)}
          disabled={isExporting}
          style={{ marginRight: "0.5rem" }}
        />
        Include metaobject field values
      </label>

      <button type="button" onClick={handleExport} disabled={isExporting}>
        {isExporting ? "Exporting..." : "Export all metaobjects to CSV"}
      </button>

      {isExporting ? (
        <div style={{ marginTop: "1rem" }}>
          <p>Preparing CSV export. This can take a while for large catalogs.</p>
          <progress style={{ width: "100%" }} />
        </div>
      ) : null}

      {errorMessage ? <p style={{ color: "#b00020", marginTop: "0.75rem" }}>{errorMessage}</p> : null}
    </div>
  );
}
