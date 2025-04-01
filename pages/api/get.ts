import type { NextApiRequest, NextApiResponse } from 'next'
import { server } from '@/app/config';

// Features not supported
// -- Synced blocks (works but not implemented)
// -- Full width anything (Notion does not expose it through API). Workaround would be possible
// -- Small text pages (for same reason, notion does not expose this)
// -- Link Page blocks (API does not support)
// -- TAble of contents - no smooth scrolling to the anchor
// -- Mono/Serif fonts (Notion does not expose these changes through the API). 
// -- External Object Instances
// -- Database limitations: Notion only exposes the default table view. Order of the database (columns or rows) are not exposed either.

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

function extractIcon(icon: any) {
    if (!icon) return null;
    if (icon.type === 'external') return icon.external.url;
    if (icon.type === 'emoji') return icon.emoji;
    if (icon.type === 'file') return icon.file.url;
    return null;
}

async function isImageUrl(url: string): Promise<boolean> {
    try {
        const response = await fetch(url, { method: 'GET' });
        const contentType = response.headers.get('content-type');
        return contentType?.startsWith('image/') || false;
    } catch (error) {
        console.error('Failed to check if URL is an image:', error);
        return false;
    }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    // Notion SDK for JavaScript
    const { Client } = require("@notionhq/client");
    const notion = new Client({ auth: process.env.NOTION_KEY });
    const results = [];
    const masterBlockId = "1c4aaa7b9847804fa1eecd789b8387c3"; // PageID

    let blocks;

    try {
        blocks = await notion.blocks.children.list({
            block_id: masterBlockId,
            page_size: 100,
        });

        // HANDLE SOLE DATABASE
        if (blocks.results.length <= 1) {
            let { database, rows } = await getDatabase(masterBlockId, notion);
            let block = {
                database: database,
                rows: rows, // Add rows to the block
                type: "",
            }
            let master = { ...database }
            block.type = "child_database";
            results.push({ master })
            results.push({ block });
            return res.status(200).json(results);
        }

    } catch (error: any) {
        if (error.code === "validation_error") return res.status(400).json({ message: "Invalid ID", status: 400 });
        else return res.status(400).json({ message: "Unknown Error", status: 400 });
    }


    const parentPage = await notion.pages.retrieve({ page_id: masterBlockId });

    // HANDLE SOLE SUB DATABASE PAGE
    results.push({ master: parentPage });
    if (parentPage.parent.type === "database_id") {
        let block = { ...parentPage }; //Hack, to make a database resemble a "normal block"
        block.type = "database_row"; // Change type to child_database
        block.database = parentPage; // But the database is actually in the database property, just like it would be in a normal block
        results.push({ block });
    }

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
            // const syncedFromId = block.synced_block.synced_from?.block_id;
            // if (syncedFromId && !blocks.results.some((b: any) => b.id === syncedFromId)) {
            //     const syncedBlock = await notion.blocks.retrieve({ block_id: syncedFromId });
            //     results.push({ block, syncedBlock });
            // } else {
            //     results.push({ block });
            // }
        } else if (block.type.includes("numbered_list") || block.type.includes("bulleted_list")) {
            if (block.has_children === true) {
                block.children = await fetchChildrenRecursively(notion, block.id);
                results.push({ block: block });
            } else {
                results.push({ block });
            }
        } else if (block.type === 'column_list') {
            if (block.has_children === true) {
                block.children = await fetchChildrenRecursively(notion, block.id);

                // Calculate the number of first-layer children with type "column"
                const columnCount = block.children.filter((child: any) => child.type === 'column').length;

                // Add the column count to each "column" child
                block.children.forEach((child: any) => {
                    if (child.type === 'column') {
                        child.columns = columnCount;
                    }
                });
                results.push({ block });
            } else
                results.push({ block });
        } else if (block.type === 'child_database') {
            let { database, rows } = await getDatabase(block.id, notion);
            block.database = database;
            block.rows = rows; // Add rows to the block
            results.push({ block });
        } else {
            if (block.has_children) {
                block.children = await fetchChildrenRecursively(notion, block.id);
            }
            results.push({ block });
        }
    }
    return res.status(200).json(results);
}

async function getDatabase(id: string, notion: any): Promise<any> {
    const database = await notion.databases.retrieve({ database_id: id });
    const rows = await getDatabaseRows(id, notion);
    return { database, rows };
}

async function getDatabaseRows(id: string, notion: any): Promise<any> {
    // Query all rows of the database
    const rowsResults = await notion.databases.query({ database_id: id });
    const rows = rowsResults.results;
    // Store database icon
    for (const row of rows) {
        const page = await notion.pages.retrieve({ page_id: row.id });
        row.icon = extractIcon(page.icon); // Extract and store the icon

        // Check if the row includes an object of type 'people'
        if (row.properties) {
            for (const key in row.properties) {
                const property = row.properties[key];
                if (property.type === 'people' && property.people.length > 0) {
                    for (const person of property.people) {
                        if (person.id) {
                            try {
                                person.data = await notion.users.retrieve({ user_id: person.id }); // Fetch and store user data
                            } catch (error: any) {
                                person.data = error; // Likely not sufficient permissions for this.
                            }
                        }
                    }
                }
                // Check if the property type is 'file' and determine if it's an image
                if (property.type === 'files' && property.files.length > 0) {
                    for (const file of property.files) {
                        const fileUrl = file.external?.url || file.file?.url;
                        file.isImage = await isImageUrl(fileUrl); // Add isImage property
                    }
                }
            }
        }
    }

    return rows;
}
