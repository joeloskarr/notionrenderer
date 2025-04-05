import type { NextApiRequest, NextApiResponse } from 'next'
import { isDev, server } from '@/app/config';


export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    // Notion SDK for JavaScript
    const { Client } = require("@notionhq/client");
    const notion = new Client({ auth: process.env.NOTION_KEY });
    const masterBlockId = req.query.id as string; // BlockID

    let blocks;


    interface CrawlData {
        id: string;
        type: string;
        title: string;
        url: string;
    }

    let uniquePages = new Set<CrawlData>();


    let notionPage;

    async function processBlockRecursively(blockId: string, notion: any, uniquePages: Set<CrawlData>) {
        const blocks = await notion.blocks.children.list({
            block_id: blockId,
            page_size: 100,
        });

        for (const block of blocks.results) {
            console.log(block);
            if (block.object === 'page') {
                const page = await notion.pages.retrieve({ page_id: block.id });
                const entry: CrawlData = {
                    id: page.id,
                    type: page.object,
                    title: page?.properties?.title?.title[0]?.plain_text || 'Untitled',
                    url: page.url,
                };
                uniquePages.add(entry);

                if (block.has_children) {
                    await processBlockRecursively(block.id, notion, uniquePages);
                }
            } else if (block.object === 'database' || block.type === 'child_database') {
                if (true) return; //TODO: We could implement this, but we won't. For Notion Rooms, it
                const database = await notion.databases.retrieve({ database_id: block.id });
                const entry: CrawlData = {
                    id: database.id,
                    type: database.object,
                    title: database.title[0]?.plain_text || 'Untitled',
                    url: database.url,
                };
                uniquePages.add(entry);

                const rows = await notion.databases.query({ database_id: block.id });
                for (const row of rows.results) {
                    await processBlockRecursively(row.id, notion, uniquePages);

                }
            } else if (block.type === 'child_page') {
                const page = await notion.pages.retrieve({ page_id: block.id });
                const entry: CrawlData = {
                    id: page.id,
                    type: 'child_page',
                    title: page?.properties?.title?.title[0]?.plain_text || 'Untitled',
                    url: page.url,
                };
                uniquePages.add(entry);

                if (block.has_children) {
                    await processBlockRecursively(block.id, notion, uniquePages);
                }
            }
        }
    }

    function findChildrenRecursively(parentId: string, allPages: any[]): any[] {
        const children = allPages.filter(page => page.parent?.page_id === parentId);
        const result = [];

        for (const child of children) {
            result.push(child);
            result.push(...findChildrenRecursively(child.id, allPages));
        }

        return result;
    }

    try {

        // Get all the Notion blocks
        blocks = await notion.blocks.children.list({
            block_id: masterBlockId,
            page_size: 100,
        });


        notionPage = await notion.pages.retrieve({ page_id: masterBlockId });

        // Format masterBlockId to include dashes
        const formatId = (id: string): string => {
            return id.replace(
                /(\w{8})(\w{4})(\w{4})(\w{4})(\w{12})/,
                '$1-$2-$3-$4-$5'
            );
        };

        const splitMasterBlockId = formatId(masterBlockId);

        let entry: CrawlData = {
            id: notionPage.id,
            type: notionPage.object,
            title: notionPage?.properties?.title?.title[0]?.plain_text || notionPage?.title[0]?.plain_text,
            url: notionPage.url
        };

        uniquePages.add(entry);

        let response;
        let startCursor: string | undefined = undefined;
        const allPages = [];

        do {
            response = await notion.search({
                filter: {
                    value: 'page',
                    property: 'object'
                },
                sort: {
                    direction: 'ascending',
                    timestamp: 'last_edited_time'
                },
                start_cursor: startCursor,
            });

            allPages.push(...response.results);
            startCursor = response.next_cursor;

        } while (response.has_more);

        // Process allPages to find children recursively
        const rootBlock = allPages.find(page => page.id === splitMasterBlockId);
        if (!rootBlock) {
            console.error('Master block not found');
        }

        const allChildBlocks = findChildrenRecursively(splitMasterBlockId, allPages);

        // Include the root block in the response
        const result = [rootBlock, ...allChildBlocks].map(block => ({
            id: block.id,
            type: block.object,
            title: block.properties?.title?.title[0]?.plain_text || 'Untitled',
            url: block.url,
        }));

        res.status(200).json({ blocks: result });

    }
    catch (error: any) {
        console.error("Error processing blocks:", error);
        return res.status(500).json({ error: 'Failed to process blocks' });
    }

}



