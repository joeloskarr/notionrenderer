// pages/api/bookmark-metadata.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { server } from '@/app/config';

function buildTree(blocks: any[]): any[] {
    const idToBlockMap: Record<string, any> = {};
    const rootBlocks: any[] = [];

    // Map blocks by their ID
    blocks.forEach(block => {
        idToBlockMap[block.id] = { ...block, children: [] };
    });

    // Build the tree structure
    blocks.forEach(block => {
        if (block.parent) {
            const parentBlock = idToBlockMap[block.parent];
            if (parentBlock) {
                parentBlock.children.push(idToBlockMap[block.id]);
            }
        } else {
            rootBlocks.push(idToBlockMap[block.id]);
        }
    });

    return rootBlocks;
}

function generateTreemap(tree: any[], ultimateParent: any, prefix = ''): any[] {
    const treemap: any[] = [];

    tree.forEach(node => {
        const line = `${prefix}${node.id} ${node.title}`;
        const children = node.children.length > 0 ? generateTreemap(node.children, ultimateParent, `${prefix}---`) : [];
        if (children.length > 0 && node.id != ultimateParent.id) {
            treemap.push([line, ...children]);
        } else if (children.length > 0 && node.id == ultimateParent.id) {
            treemap.push(line, ...children);
        } else {
            treemap.push([line]);
        }
    });

    return treemap;
}

function findUltimateParent(blocks: any[]): any | null {
    const idToBlockMap: Record<string, any> = {};

    // Map blocks by their ID
    blocks.forEach(block => {
        idToBlockMap[block.id] = block;
    });

    // Find the block with no parent
    for (const block of blocks) {
        if (!block.parent || !idToBlockMap[block.parent]) {
            return block; // This is the ultimate parent block
        }
    }

    return null; // No ultimate parent found
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    try {
        // Add CORS headers
        res.setHeader('Access-Control-Allow-Origin', 'http://46.101.7.7:3000, https://notionrooms.com'); // Replace with your frontend's origins
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

        if (req.method === 'OPTIONS') {
            res.status(200).end(); // Handle preflight requests
            return;
        }

        const masterBlockId = req.query.id as string; // BlockID
        const nk = req.query.nk as string; // Encrypted nk

        // Make an API call to crawl.ts using fetch
        const url = `${server}crawl?id=${masterBlockId}&nk=${nk}`;
        console.log(url);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            return res.status(500).json({ error: 'Failed to retrieve data from crawl.ts' });
        }

        const data = await response.json();

        // Process the response from crawl.ts
        if (!data || !data.blocks) {
            return res.status(500).json({ error: 'Failed to retrieve data from crawl.ts' });
        }

        // Find the ultimate parent block
        const ultimateParent = findUltimateParent(data.blocks);

        // Build the tree and generate the treemap
        const tree = buildTree(data.blocks);
        const treemap = generateTreemap(tree, ultimateParent);

        return res.status(200).json({ treemap, ultimateParent });
    } catch (error) {
        console.error('Error calling crawl.ts:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
