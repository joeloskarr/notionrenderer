import type { NextApiRequest, NextApiResponse } from 'next'
import { isDev, server, serviceUrl } from '@/app/config';
import { extractIcon } from './renderer/utils'; // Import extractIcon from utils
import { fetchBookmarkMetadata } from './renderer/bookmark'; // Import fetchBookmarkMetadata
import crypto from 'crypto';

// Features not supported
// -- Synced blocks (works but not implemented)
// -- Full width anything (Notion does not expose it through API). Workaround would be possible
// -- Small text pages (for same reason, notion does not expose this)
// -- Link Page blocks (API does not support)
// -- TAble of contents - no smooth scrolling to the anchor
// -- Mono/Serif fonts (Notion does not expose these changes through the API). 
// -- External Object Instances
// -- Embeds: Google Docs/Drive/Sheets are not supported as the API does not expose them. Workaround is to set them public and link directly as embed.
// -- Database limitations: Notion only exposes the default table view.
// ------ Grouped tables won't wokr. 
// ------ Order of the database (columns or rows) are not exposed either
// ------ The API does provide decimals properly (at all).
// --- Link previews (potentially possible to implement)
// --- Mentions and embeds generally work. Exception some that require API access to unfurl (Reddit) 

async function processBlock(block: any, notion: any): Promise<any> {
    generateServiceUrl(block); // Update block directly

    if (block.type === 'bookmark') {
        const url = block.bookmark.url;
        block.bookmark.metadata = await fetchBookmarkMetadata(url); // Fetch and store metadata
    } else if (block.type === 'paragraph') {
        const richText = block.paragraph.rich_text;
        if (richText?.length > 0) {
            for (const text of richText) {
                if (text.type === 'mention' && text.mention.type === 'link_preview') {
                    const url = text.mention.link_preview.url;
                    text.mention.link_preview = await fetchBookmarkMetadata(url); // Fetch and store metadata
                    text.mention.link_preview.url = url; // Ensure the URL is preserved
                }
            }
        }
    } else if (block.type === 'link_preview') {
        const url = block.link_preview.url;
        block.link_preview = await fetchBookmarkMetadata(url); // Fetch and store metadata
        block.link_preview.url = url; // Ensure the URL is preserved
    } else if (block.type === 'child_page') {
        const page = await notion.pages.retrieve({ page_id: block.id });
        generateServiceUrl(page); // Update block directly
        block.page = page;
    } else if (block.type === 'toggle') {
        if (block.has_children === true) {
            block.children = await fetchChildrenRecursively(notion, block.id);
        }
    } else if (block.type === 'synced_block') {
        // TODO: Works but Notion is not outputting it for some reason
        // const syncedFromId = block.synced_block.synced_from?.block_id;
        // if (syncedFromId && !blocks.results.some((b: any) => b.id === syncedFromId)) {
        //     const syncedBlock = await notion.blocks.retrieve({ block_id: syncedFromId });
        //     return { block, syncedBlock };
        // }
    } else if (block.type.includes("numbered_list") || block.type.includes("bulleted_list")) {
        if (block.has_children === true) {
            block.children = await fetchChildrenRecursively(notion, block.id);
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
        }
    } else if (block.type === 'child_database') {
        let { database, rows } = await getDatabase(block.id, notion);
        generateServiceUrl(database);
        block.database = database;
        block.rows = rows; // Add rows to the block
    } else {
        if (block.has_children) {
            block.children = await fetchChildrenRecursively(notion, block.id);
        }
    }

    return block;
}

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

        for (const child of response.results) {
            try {
                children.push(await processBlock(child, notion));
            } catch (error) {
                console.error('Error processing block:', error);
                // Skip the block if an error occurs
                continue;
            }
        }

        hasMore = response.has_more;
        cursor = response.next_cursor;
    }

    return children;
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

async function generateBreadcrumb(notionPage: any, notion: any): Promise<{ name: string, icon?: string, service_url?: string }[]> {
    const breadcrumb: { name: string, icon?: string, service_url?: string }[] = [];
    let currentPage = notionPage;

    while (currentPage.parent) {
        const parentType = currentPage.parent.type;

        if (parentType === 'page_id' || parentType === 'database_id') {
            const parentId = (parentType === 'page_id' ? currentPage.parent.page_id : currentPage.parent.database_id);

            // Fetch the parent page or database using the Notion API
            const parentData = (parentType === 'page_id')
                ? await notion.pages.retrieve({ page_id: parentId })
                : await notion.databases.retrieve({ database_id: parentId });

            // Add the parent page's name, icon, public_url, and service_url to the breadcrumb

            let breadCrumbObject = {
                name: parentType === 'page_id'
                    ? parentData.properties?.title?.title?.[0]?.plain_text || 'Untitled' //Page
                    : parentData.title[0]?.plain_text || 'Untitled', //Database
                icon: extractIcon(parentData.icon),
            }
            if (breadCrumbObject.name == 'Untitled' && parentData.properties) {
                for (const key in parentData.properties) {
                    const property = parentData.properties[key];
                    if (property.id === 'title' && property.title?.[0]?.plain_text) {
                        breadCrumbObject.name = property.title[0].plain_text;
                        break;
                    }
                }
            }

            breadcrumb.unshift(breadCrumbObject);


            generateServiceUrl(parentData); // Update block directly
            breadcrumb[0].service_url = parentData.service_url;

            // Update the current page to the parent page
            currentPage = parentData;

            // Stop if the parent ID matches the current page's ID as it means we're at the top level
            if (parentId === notionPage.id) break;
        } else {
            break;
        }
    }


    let breadCrumbObject = {
        name: notionPage.object === 'page'
            ? notionPage.properties?.title?.title?.[0]?.plain_text || 'Untitled' //Page
            : notionPage.title[0]?.plain_text || 'Untitled', //Database
        icon: extractIcon(notionPage.icon),
    }
    // Add the initial notionPage as the last item in the breadcrumb
    if (breadCrumbObject.name == 'Untitled' && notionPage.properties) {
        for (const key in notionPage.properties) {
            const property = notionPage.properties[key];
            if (property.id === 'title' && property.title?.[0]?.plain_text) {
                breadCrumbObject.name = property.title[0].plain_text;
                break;
            }
        }
    }

    breadcrumb.push(breadCrumbObject);
    generateServiceUrl(notionPage); // Update block directly
    breadcrumb[breadcrumb.length - 1].service_url = notionPage.service_url;

    return breadcrumb;
}

function generateServiceUrl(block: any): void {
    const url = block.public_url || block.url;
    const url2 = block[block.type]?.public_url || block[block.type]?.url
    if (url) {
        const idMatch = url.match(/([a-zA-Z0-9]+)$/);
        const id = idMatch ? idMatch[1] : '';
        block.service_url = serviceUrl + `${id}`;
    } else if (url2) {
        const url2 = block[block.type]?.public_url || block[block.type]?.url
        const idMatch = url2.match(/([a-zA-Z0-9]+)$/);
        const id = idMatch ? idMatch[1] : '';
        block[block.type].service_url = serviceUrl + `${id}`;
    }
    else {
        block.service_url = '';
        return;
    }
}

function decryptNk(encryptedNk: string): string {
    const key = process.env.NK_ENCRYPT_KEY || '';
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key, 'hex'), Buffer.alloc(16, 0));
    let decrypted = decipher.update(encryptedNk, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {

    const encryptedNk = req.query.nk as string;
    if (!encryptedNk) {
        return res.status(400).json({ message: "Missing 'nk' query parameter", status: 400 });
    }

    let decryptedNk: string;
    try {
        decryptedNk = decryptNk(encryptedNk);
    } catch (error) {
        console.error('Failed to decrypt nk:', error);
        return res.status(400).json({ message: "Invalid 'nk' query parameter", status: 400 });
    }

    const { Client } = require("@notionhq/client");
    const notion = new Client({ auth: decryptedNk });
    const results = [];
    const test_page_Id = "1c4aaa7b9847809995d5d0b31fc6bcd1"; // PageID
    const masterBlockId = req.query.id as string; // BlockID

    let blocks;


    // Get the page the blocks reside on

    let notionPage;

    try {
        // Get all the Notion blocks
        blocks = await notion.blocks.children.list({
            block_id: masterBlockId,
            page_size: 100,
        });

        // HANDLE SOLE DATABASE
        if (blocks.results.length <= 1) {
            notionPage = await notion.pages.retrieve({ page_id: masterBlockId }); //Get the page; IF success, it's a Row-page.
        }

    } catch (error: any) {
        console.log("testing this", error);
        if (error.code === "validation_error") return res.status(400).json({ message: "Invalid ID", status: 400 });

        if (error.code === "object_not_found") {
            try {
                // HANDLE SOLE DATABASE
                let { database, rows } = await getDatabase(masterBlockId, notion);

                if (!database || rows.length === 0) {
                    return res.status(500).json({ message: "Not Found", status: 500 });
                }

                let block = {
                    database: database,
                    rows: rows, // Add rows to the block
                    type: "child_database",
                };
                let master = { ...database };
                master.breadcrumb = await generateBreadcrumb(database, notion);
                results.push({ master });
                results.push({ block });

                return res.status(200).json(results);
            } catch (error) {
                console.error('Error handling sole database:', error);
                return res.status(500).json({ message: "Failed to handle sole database", status: 500 });
            }
        }

        else {
            console.error(error);
            return res.status(400).json({ message: "Unknown Error", status: 400 });
        }
    }

    notionPage = await notion.pages.retrieve({ page_id: masterBlockId });

    // Get the breadcrumb for the page
    const breadcrumb = await generateBreadcrumb(notionPage, notion);
    notionPage.breadcrumb = breadcrumb;

    // HANDLE SOLE SUB DATABASE PAGE
    results.push({ master: notionPage });
    if (notionPage.parent.type === "database_id") {
        let block = { ...notionPage }; //Hack, to make a database resemble a "normal block"
        block.type = "database_row"; // Change type to child_database
        block.database = notionPage; // But the database is actually in the database property, just like it would be in a normal block
        results.push({ block });
    }

    for (const block of blocks.results) {
        try {
            results.push({ block: await processBlock(block, notion) });
        } catch (error) {
            console.error('Error processing block:', error);
            // Skip the block if an error occurs
            continue;
        }
    }

    return res.status(200).json(results);
}
async function getDatabase(id: string, notion: any): Promise<any> {
    try {
        const database = await notion.databases.retrieve({ database_id: id });
        const rows = await getDatabaseRows(id, notion);
        return { database, rows };
    } catch (error) {
        console.error('Failed to retrieve database:', error);
        return { database: null, rows: [], error: 'Unable to fetch database' };
    }
}

async function getDatabaseRows(id: string, notion: any): Promise<any> {
    // Query all rows of the database
    const rowsResults = await notion.databases.query({ database_id: id });
    const rows = rowsResults.results;

    // Store database icon and generate service_url
    for (const row of rows) {
        const page = await notion.pages.retrieve({ page_id: row.id });
        row.icon = extractIcon(page.icon); // Extract and store the icon
        generateServiceUrl(row); // Update block directly


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
