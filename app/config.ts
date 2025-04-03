
export const isDev =
    process.env.NODE_ENV === 'development' || !process.env.NODE_ENV

export const server = isDev ? 'http://46.101.7.7:3000' : "[VERCEL URL]";
export const serviceUrl = isDev ? 'http://46.101.7.7:3000' : "[VERCEL URL]";