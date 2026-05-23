export interface IBotContext {
  platform: string;
  chatId: string;
  userId?: string;
  messageId?: string;
  text?: string;
  command?: string;
  callbackData?: string;
  payload?: any;
  raw?: any;
  metadata?: Record<string, any>;
  reply: (text: string, options?: Record<string, any>) => Promise<any>;
}
