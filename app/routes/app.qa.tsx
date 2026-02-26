export default function QATestingPage() {
  return (
    <s-page heading="QA Testing">
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
      <s-section heading="Find Products">
        <s-text-area label="Enter specifications" placeholder="Type your message here..." />
        <s-button variant="primary">Submit</s-button>
      </s-section>
      <s-section heading="Products Found">
        <s-table>
          <s-table-header-row>
            <s-table-header></s-table-header>
            <s-table-header></s-table-header>
            <s-table-header>Product</s-table-header>
            <s-table-header></s-table-header>
            <s-table-header></s-table-header>
          </s-table-header-row>
          <s-table-body>
            <s-table-row>
              <s-table-cell>
                <s-checkbox/>
              </s-table-cell>
              <s-table-cell>
                <s-thumbnail src="https://cdn.shopify.com/s/files/1/0667/1099/5010/files/Main_5127218a-8f6c-498f-b489-09242c0fab0a.jpg?v=1771449320" alt="Top and bottom view of a snowboard.The top view shows the text “hydrogen” in overlapping blue,\n pink and black font. The bottom view is a purple to blue gradient with white geometric pattern overlay." />
              </s-table-cell>
              <s-table-cell>
                <s-paragraph>The Draft Snowboard</s-paragraph>
              </s-table-cell>
            </s-table-row>
          </s-table-body>
        </s-table>
      </s-section>
    </s-page>
  );
}
