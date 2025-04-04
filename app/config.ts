
export const isDev =
    process.env.NODE_ENV === 'development' || !process.env.NODE_ENV

export const server = isDev ? process.env.API_PATH : "[YOUR PUBLIC URL]";
export const serviceUrl = isDev ? process.env.HOST : "[YOUR PUBLIC URL]";
export const rootNotionId = "1c4aaa7b984780bc9812fc34540239f5"