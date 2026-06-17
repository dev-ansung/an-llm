import { ApiLog } from '../types';

export const sanitizeLogsForStorage = (logs: ApiLog[]): ApiLog[] => {
  return logs.slice(0, 20).map(log => {
    try {
      if (!log.request?.messages) return log;
      const sanitizedMessages = log.request.messages.map((m: any) => {
        if (Array.isArray(m.content)) {
          return {
            ...m,
            content: m.content.map((block: any) => {
              if (block.type === 'image_url' && block.image_url?.url?.startsWith('data:')) {
                return {
                  ...block,
                  image_url: {
                    ...block.image_url,
                    url: `[Base64 Image Data - ${block.image_url.url.length} chars]`
                  }
                };
              }
              return block;
            })
          };
        }
        return m;
      });
      return {
        ...log,
        request: {
          ...log.request,
          messages: sanitizedMessages
        }
      };
    } catch {
      return log;
    }
  });
};
