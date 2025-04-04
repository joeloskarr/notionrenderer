# Notion API Renderer

This is a renderer for the Notion API, built using [Next.js](https://nextjs.org). It allows you to render Notion pages and blocks with ease. However, certain features are not supported due to limitations in the Notion API.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Unsupported Features

The following features are not supported due to limitations in the Notion API:

- Synced blocks (works but not implemented).
- Full-width anything (Notion does not expose it through the API). A workaround would be possible.
- Small text pages (for the same reason, Notion does not expose this).
- Link Page blocks (API does not support).
- Table of contents - no smooth scrolling to the anchor.
- Mono/Serif fonts (Notion does not expose these changes through the API).
- External Object Instances.
- Embeds: Google Docs/Drive/Sheets are not supported as the API does not expose them. A workaround is to set them public and link directly as an embed.
- Database limitations:
  - Notion only exposes the default table view.
  - Grouped tables won't work.
  - Order of the database (columns or rows) is not exposed either.
  - The API does not provide decimals properly.
- Link previews (potentially possible to implement).
- Mentions and embeds generally work, except for some that require API access to unfurl (e.g., Reddit).

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

You will also need a Google Maps API Key to use Google Maps embed. Otherwise it will not render.