import { rootNotionId, server } from "@/app/config";
import Head from "next/head";


async function fetchPageById({ pageId }: { pageId: any }) {
  // Replace with actual implementation to fetch a page by ID
  return { id: pageId, title: "Default Title" }; // Example fallback
}

export async function getStaticPaths() {
  console.log("what the");

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
      params: { pageId: block.id },
    }));

    return { paths, fallback: false };
  } catch (error) {
    console.error("Error fetching pages:", error);
    return { paths: [], fallback: false };
  }
}

export async function getStaticProps({ params }: { params: any }) {
  console.log("whatttttt", params.pageId);
  try {
    let url = `${server}renderer?id=${params.pageId}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const html = await response.json();

    return { props: { html } };
  } catch (error) {
    console.error("Error fetching page:", error);
    return { props: { page: { title: "Error loading page" } } };
  }
}

interface PageProps {
  html: any;
}

export default function Page({ html }: PageProps) {
  return (
    <>
      <Head>
        <title>Notion Renderer</title>
        <script src="https://cdn.jsdelivr.net/npm/prismjs@1.30.0/prism.min.js"></script>
        <script src="https://kit.fontawesome.com/7594385887.js"></script>
        <link href="https://cdn.jsdelivr.net/npm/prismjs@1.30.0/themes/prism.min.css" rel="stylesheet" />
        <script src="/notion-renderer.js"></script>
        <link href="/notion.css" rel="stylesheet" />
        <meta name="description" content="Rendered Notion Page" />
      </Head>
      <div>
        <main>
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </main>
      </div>
    </>
  );
}
