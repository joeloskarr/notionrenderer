# Notion API Renderer

This is a renderer for the Notion API, built using [Next.js](https://nextjs.org). It allows you to render Notion pages and blocks with ease. However, certain features are not supported due to limitations in the Notion API.

# How to Use

1. **Get a Notion API Key**  
   - Visit [Notion Developers](https://developers.notion.com/) and generate an API key.

2. **Create an OAuth Flow and Approve Workspaces**  
   - Set up an OAuth flow to connect your application to Notion and approve the required workspaces.

3. **Deploy This Project to Vercel**  
   - Deploy the project to [Vercel](https://vercel.com/) for hosting.

4. **Include `notion_renderer.js` in Your Project**  
   - Add `notion_renderer.js` to your project. This is required for rendering specific elements like Twitter embeds and equations.

   *Side Note: You will also need a [FontAwesome](https://fontawesome.com/) account to use icons in your project.*

5. **Call the API**  
   - Use the following format to call the API:  
     ```
     yourserver.com/?id=[notion-block-id]
     ```
     Replace `[notion-block-id]` with the last part of your Notion URL. For example, if your Notion URL is:  
     `https://www.notion.so/Example-Page-125aaa7b9847805180c5dde2bdca0a45`  
     Then the `notion-block-id` is `125aaa7b9847805180c5dde2bdca0a45`.

6. **Receive Rendered HTML**  
   - The API will return the rendered HTML for the specified Notion block.
    

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
- Tables: Does not support row / column wide text colors or backgrounds as the API does not expose. Does support cell-level text formatting though.
- Buttons: not supported by api.
- Cover image: Position of the image is not supported by AI. For best experience ensure it looks good without any adjustments.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

You will also need a Google Maps API Key to use Google Maps embed. Otherwise it will not render.