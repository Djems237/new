export interface GlobalChatMessage {
    id: string;
    authorId: string;
    content: string;
    timestamp: Date;
    isEdited: boolean;
}
