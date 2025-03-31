import type { NextApiRequest, NextApiResponse } from 'next'
import { server } from '@/app/config';

// Features not supported
// -- Synced blocks (works but not implemented)
// -- Full width pages (Notion does not expose it through API). Workaround would be possible
// -- Small text pages (for same reason, notion does not expose this)
// -- Link Page blocks (API does not support)
// -- TAble of contents - no smooth scrolling to the anchor
// -- Mono/Serif fonts (Notion does not expose these changes through the API). 

async function fetchChildrenRecursively(notion: any, blockId: string) {
    const children = [];
    let hasMore = true;
    let cursor = undefined;

    while (hasMore) {
        const response: any = await notion.blocks.children.list({
            block_id: blockId,
            page_size: 100,
            start_cursor: cursor,
        });
        children.push(...response.results);
        hasMore = response.has_more;
        cursor = response.next_cursor;

        for (const child of response.results) {
            if (child.has_children) {
                child.children = await fetchChildrenRecursively(notion, child.id);
            }
        }
    }

    return children;
}

async function fetchBookmarkMetadata(url: string) {
    try {
        const response = await fetch(server + `/api/bookmark-metadata?url=${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error('Failed to fetch metadata');
        return await response.json();
    } catch (error) {
        console.error('Metadata fetch failed:', error);
        return {
            title: new URL(url).hostname,
            description: '',
            favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`,
            image: null
        };
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    // Notion SDK for JavaScript
    const { Client } = require("@notionhq/client");
    const notion = new Client({ auth: process.env.NOTION_KEY });

    const masterBlockId = "1c4aaa7b98478094af20d0b836b15ca5"; // PageID
    const blocks = await notion.blocks.children.list({
        block_id: masterBlockId,
        page_size: 100,
    });

    const results = [];


    const parentPage = await notion.pages.retrieve({ page_id: masterBlockId });
    results.push({ master: parentPage });

    for (const block of blocks.results) {
        if (block.type === 'bookmark') {
            const url = block.bookmark.url;
            block.bookmark.metadata = await fetchBookmarkMetadata(url); // Fetch and store metadata
            results.push({ block });
        } else if (block.type === 'child_page') {
            const page = await notion.pages.retrieve({ page_id: block.id });
            results.push({ block, page });
        } else if (block.type === 'toggle') {
            const childrenResponse = await notion.blocks.children.list({
                block_id: block.id,
                page_size: 100,
            });
            block.children = childrenResponse.results;
            results.push({ block });
        } else if (block.type === 'synced_block') { //TODO: Works but Notion is not outputting it for some reason
            const syncedFromId = block.synced_block.synced_from?.block_id;
            if (syncedFromId && !blocks.results.some((b: any) => b.id === syncedFromId)) {
                const syncedBlock = await notion.blocks.retrieve({ block_id: syncedFromId });
                results.push({ block, syncedBlock });
            } else {
                results.push({ block });
            }
        } else if (block.type.includes("list")) {
            if (block.has_children) {
                block.children = await fetchChildrenRecursively(notion, block.id);
                results.push({ block: block });
            } else {
                results.push({ block });
            }
        } else {
            if (block.has_children) {
                block.children = await fetchChildrenRecursively(notion, block.id);
            }
            results.push({ block });
        }
    }
    return res.status(200).json(results);
}