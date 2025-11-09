import { GlobalChatMessage } from '../models/GlobalChatMessage';

export class GlobalChatService {
    private messages: Map<string, GlobalChatMessage> = new Map();

    sendMessage(authorId: string, content: string): GlobalChatMessage {
        const message: GlobalChatMessage = {
            id: Date.now().toString(),
            authorId,
            content,
            timestamp: new Date(),
            isEdited: false
        };
        this.messages.set(message.id, message);
        this.broadcastUpdate('newMessage', message);
        return message;
    }

    editMessage(messageId: string, authorId: string, newContent: string): boolean {
        const message = this.messages.get(messageId);
        if (message && message.authorId === authorId) {
            message.content = newContent;
            message.isEdited = true;
            this.broadcastUpdate('editMessage', message);
            return true;
        }
        return false;
    }

    deleteMessage(messageId: string, authorId: string): boolean {
        const message = this.messages.get(messageId);
        if (message && message.authorId === authorId) {
            this.messages.delete(messageId);
            this.broadcastUpdate('deleteMessage', messageId);
            return true;
        }
        return false;
    }

    private broadcastUpdate(type: 'newMessage' | 'editMessage' | 'deleteMessage', data: any) {
        // Implement your WebSocket broadcast logic here
    }
}
