export default function AdditionalPage() {
  return (
    <s-page heading="Testing page Sean">
      <s-section heading="Multiple pages">
        <s-paragraph>
          Blog information:
        </s-paragraph>
        <s-paragraph>
          blah <code>yes</code>
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
    </s-page>
  );
}
