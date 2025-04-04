
export const isDev =
    process.env.NODE_ENV === 'development' || !process.env.NODE_ENV

export const server = isDev ? process.env.HOST : "[YOUR PUBLIC URL]";
export const serviceUrl = isDev ? process.env.HOST : "[YOUR PUBLIC URL]";