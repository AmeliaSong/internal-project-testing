import { useState } from "react";

const SITEMAP_URL =
  "https://test-1111111111111111111111111111111111711111111111128302.myshopify.com/sitemap.xml";

export default function SitemapViewer() {
  const [sitemapXml, setSitemapXml] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFetchSitemap = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${SITEMAP_URL}`, {
        headers: {
          Accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
        },
      });
      if (!res.ok) throw new Error("Failed to fetch sitemap");

      const xmlText = await res.text();
      setSitemapXml(xmlText);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <s-page heading="Sitemap Export">
      <s-section>
        <s-stack gap="base">
          <s-heading>Sitemap Viewer</s-heading>
          <s-button
            onClick={handleFetchSitemap}
          >
            Download Sitemap XML
          </s-button>

          {loading && <s-text>Loading...</s-text>}
          {error && 
            <s-badge icon="alert-triangle" tone="critical">{error}</s-badge>
          }

          {sitemapXml && (
            <s-box
              borderWidth="base"
              borderRadius="base"
            >
              <pre>
                {sitemapXml}
              </pre>
            </s-box>
          )}
        </s-stack>
      </s-section>
    </s-page>
  );
}