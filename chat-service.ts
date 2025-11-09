import { ChatMessage } from './chat-message';

export class ChatService {
    private messages: Map<string, ChatMessage> = new Map();

    sendMessage(authorId: string, content: string): ChatMessage {
        const message: ChatMessage = {
            id: Date.now().toString(),
            authorId,
            content,
            timestamp: new Date()
        };
        this.messages.set(message.id, message);
        this.broadcastMessage('message', message);
        return message;
    }

    editMessage(messageId: string, authorId: string, newContent: string): boolean {
        const message = this.messages.get(messageId);
        if (message && message.authorId === authorId) {
            message.content = newContent;
            this.broadcastMessage('messageUpdate', message);
            return true;
        }
        return false;
    }

    deleteMessage(messageId: string, authorId: string): boolean {
        const message = this.messages.get(messageId);
        if (message && message.authorId === authorId) {
            this.messages.delete(messageId);
            this.broadcastMessage('messageDelete', messageId);
            return true;
        }
        return false;
    }

    private broadcastMessage(event: string, data: any) {
        // Implement your WebSocket or other real-time communication here
    }
}
