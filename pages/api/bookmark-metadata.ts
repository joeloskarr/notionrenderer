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
        console.log("error?");
        return res.status(400).json({ error: 'Missing URL parameter' });
    }

    try {
        const { data, request } = await axios.get(url.toString(), {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache'
            }
        });


        const $ = cheerio.load(data);
        const finalUrl = request.res.responseUrl || url;
        const parsedUrl = new URL(finalUrl);

        const getMeta = (name: string) =>
            $(`meta[property="twitter:${name}"]`).attr('content') ||
            $(`meta[name="${name}"]`).attr('content') ||
            $(`meta[property="og:${name}"]`).attr('content')

        const metadata: Metadata = {
            title: $('title').first().text() || parsedUrl.hostname,
            description: getMeta('description') || '',
            favicon: (() => {
                const iconLink = $('link[rel="icon"]').attr('href');
                if (iconLink) {
                    return iconLink.startsWith('http') ? iconLink : `${parsedUrl.origin}${iconLink}`;
                }
                return `${parsedUrl.origin}/favicon.ico`;
            })(),
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
        console.log(error);
        const hostname = new URL(url as string).hostname;
        return res.json({
            title: hostname,
            description: '',
            image: null,
            favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`
        });
    }
}
