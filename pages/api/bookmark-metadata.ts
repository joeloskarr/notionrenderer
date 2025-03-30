// pages/api/bookmark-metadata.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';
import * as cheerio from 'cheerio';

interface Metadata {
    title: string;
    description: string;
    favicon: string;
    image: string | null;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<Metadata | { error: string }>
) {
    const { url } = req.query;

    if (!url || typeof url !== 'string') {
        return res.status(400).json({ error: 'Missing URL parameter' });
    }

    try {
        const { data, request } = await axios.get(url.toString(), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; Notion-Web-Bookmark-Parser/1.0)'
            }
        });

        const $ = cheerio.load(data);
        const finalUrl = request.res.responseUrl || url;
        const parsedUrl = new URL(finalUrl);

        const getMeta = (name: string) =>
            $(`meta[name="${name}"]`).attr('content') ||
            $(`meta[property="og:${name}"]`).attr('content') ||
            $(`meta[property="twitter:${name}"]`).attr('content');

        const metadata: Metadata = {
            title: $('title').first().text() || parsedUrl.hostname,
            description: getMeta('description') || '',
            favicon: `${parsedUrl.origin}/favicon.ico`,
            image: (() => {
                const image = getMeta('image') || null;
                if (image && image.startsWith('/')) {
                    return `${parsedUrl.origin}${image}`;
                }
                return image;
            })()
        };

        res.setHeader('Cache-Control', 'public, s-maxage=86400');
        return res.json(metadata);
    } catch (error) {
        const hostname = new URL(url as string).hostname;
        return res.json({
            title: hostname,
            description: '',
            image: null,
            favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
        });
    }
}
