import { ChatService } from './chat-service';
import { ChatMessage } from './chat-message';

export class ChatComponent {
    private chatService: ChatService;
    private currentUserId: string;

    constructor(chatService: ChatService, currentUserId: string) {
        this.chatService = chatService;
        this.currentUserId = currentUserId;
    }

    renderMessage(message: ChatMessage): string {
        const isAuthor = message.authorId === this.currentUserId;
        const messageControls = isAuthor ? `
            <button onclick="editMessage('${message.id}')">Modifier</button>
            <button onclick="deleteMessage('${message.id}')">Supprimer</button>
        ` : '';

        return `
            <div class="message" data-id="${message.id}">
                <div class="message-content">${message.content}</div>
                ${messageControls}
            </div>
        `;
    }

    editMessage(messageId: string): void {
        const newContent = prompt('Modifier le message:');
        if (newContent !== null) {
            this.chatService.editMessage(messageId, this.currentUserId, newContent);
        }
    }

    deleteMessage(messageId: string): void {
        if (confirm('Voulez-vous vraiment supprimer ce message?')) {
            this.chatService.deleteMessage(messageId, this.currentUserId);
        }
    }
}
