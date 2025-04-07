import { rootNotionId, server } from "@/app/config";
import Head from "next/head";
import Script from "next/script"; // Import next/script

export async function getStaticPaths() {
  try {
    let url = `${server}crawl?id=${rootNotionId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const { blocks } = await response.json();

    // Extract ids from blocks and create paths array
    const paths = blocks.map((block: { id: string }) => ({
      params: { pageId: block.id }, // Ensure this matches the dynamic route [pageId]
    }));

    //console.log("Generated paths:", paths);

    return { paths, fallback: 'blocking' }; // Changed fallback to 'blocking'
  } catch (error) {
    console.error("Error fetching pages:", error);
    return { paths: [], fallback: false };
  }
}

export async function getStaticProps({ params }: { params: any }) {
  console.log("this is going to renderer", params.pageId);

  if (!params || !params.pageId || params.pageId == 'null') {
    return { props: { html: "<h1>Error loading page</h1>", metadata: { title: "Error", favicon: null } } }; // Provide fallback metadata
  }

  try {
    let url = `${server}renderer?id=${params.pageId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch page data: ${response.statusText}`);
    }

    const json = await response.json();

    return { props: { html: json.html, metadata: json.headers } }; // Pass headers as metadata
  } catch (error) {
    console.error("Error fetching page:", error);
    return { props: { html: "<h1>Error loading page</h1>", metadata: { title: "Error", favicon: null } } }; // Provide fallback metadata
  }
}

interface PageProps {
  metadata: any,
  html: any;
}

export default function Page({ metadata, html }: PageProps) {

  const isEmoji = (str: string) => /^[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+$/u.test(str);

  const favicon = isEmoji(metadata.favicon)
    ? `data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>${metadata.favicon}</text></svg>`
    : metadata.favicon;

  return (
    <>
      <Head>
        <title>{metadata.title}</title>
        <link href="https://cdn.jsdelivr.net/npm/prismjs@1.30.0/themes/prism.min.css" rel="stylesheet" />
        <link href="/notion.css" rel="stylesheet" />
        <link rel="icon" href={favicon} />
        <meta name="description" content="Rendered Notion Page" />
      </Head>
      <Script src="https://kit.fontawesome.com/7594385887.js" strategy="afterInteractive" />
      <Script src="https://cdn.jsdelivr.net/npm/prismjs@1.30.0/prism.min.js" strategy="afterInteractive" />
      <Script src="https://cdn.jsdelivr.net/npm/prismjs@1.30.0/components/prism-core.min.js" strategy="afterInteractive" />
      <Script src="https://cdn.jsdelivr.net/npm/prismjs@1.30.0/plugins/autoloader/prism-autoloader.min.js" strategy="afterInteractive" />
      <Script src="/notion-renderer.js" strategy="afterInteractive" />
      <div>
        <main>
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </main>
      </div>
    </>
  );
}
