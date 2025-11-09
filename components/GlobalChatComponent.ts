import { GlobalChatService } from '../services/GlobalChatService';
import { GlobalChatMessage } from '../models/GlobalChatMessage';

export class GlobalChatComponent {
    private service: GlobalChatService;
    private currentUserId: string;
    private hiddenFileInput: HTMLInputElement | null = null;

    constructor(service: GlobalChatService, userId: string) {
        this.service = service;
        this.currentUserId = userId;
        this.initializeListeners();
    }

    private initializeListeners() {
        // Add event listeners for your WebSocket updates here
        // Ferme les menus contextuels en cliquant en dehors
        document.addEventListener('click', () => {
            document.querySelectorAll('.message-context-menu.active').forEach(menu => {
                menu.classList.remove('active');
            });
        });

        // Création d'un input file caché pour l'envoi d'images (caméra)
        this.hiddenFileInput = document.createElement('input');
        this.hiddenFileInput.type = 'file';
        this.hiddenFileInput.accept = 'image/*';
        // capture peut être utile sur mobile pour ouvrir la caméra directement
        (this.hiddenFileInput as any).capture = 'environment';
        this.hiddenFileInput.style.display = 'none';
        this.hiddenFileInput.addEventListener('change', (e) => this.handleFileSelected(e));
        document.body.appendChild(this.hiddenFileInput);

        // Exposer quelques handlers au scope global pour les onclick inline dans les templates
        (window as any).handleCameraClick = () => this.handleCameraClick();
        (window as any).handleMessageClick = (ev: Event, id: string) => this.handleMessageClick(ev, id);
        (window as any).handleEditMessage = (id: string) => this.handleEditMessage(id);
        (window as any).handleDeleteMessage = (id: string) => this.handleDeleteMessage(id);
    }

    renderMessage(message: GlobalChatMessage): string {
        const isAuthor = message.authorId === this.currentUserId;
        return `
            <div class="message ${isAuthor ? 'own-message' : ''}" 
                 data-id="${message.id}" 
                 onclick="handleMessageClick(event, '${message.id}')">
                <div class="message-content">
                    ${message.content}
                    ${message.isEdited ? '<span class="edited-tag">(modifié)</span>' : ''}
                </div>
                ${isAuthor ? `
                    <div class="message-context-menu" id="menu-${message.id}">
                        <div class="menu-option edit" onclick="handleEditMessage('${message.id}')">Modifier</div>
                        <div class="menu-option delete" onclick="handleDeleteMessage('${message.id}')">Supprimer</div>
                    </div>
                ` : ''}
            </div>
        `;
    }

    handleMessageClick(event: Event, messageId: string): void {
        const message = document.querySelector(`[data-id="${messageId}"]`);
        if (!message) return;

        const menu = document.getElementById(`menu-${messageId}`);
        if (!menu) return;

        // Hide all other open menus
        document.querySelectorAll('.message-context-menu.active').forEach(m => {
            if (m !== menu) m.classList.remove('active');
        });

        // Toggle current menu
        menu.classList.toggle('active');
        event.stopPropagation();
    }

    async handleEditMessage(messageId: string): Promise<void> {
        const message = document.querySelector(`[data-id="${messageId}"] .message-content`);
        if (!message) return;

        const newContent = prompt('Modifier votre message:', message.textContent);
        if (newContent !== null) {
            this.service.editMessage(messageId, this.currentUserId, newContent);
        }
    }

    handleDeleteMessage(messageId: string): void {
        if (confirm('Voulez-vous vraiment supprimer ce message ?')) {
            this.service.deleteMessage(messageId, this.currentUserId);
        }
    }

    // Ouvre le sélecteur de fichiers (lier ce bouton/icône caméra à window.handleCameraClick())
    handleCameraClick(): void {
        if (!this.hiddenFileInput) return;
        this.hiddenFileInput.value = ''; // reset
        this.hiddenFileInput.click();
    }

    // Lecture du fichier choisi et envoi via le service
    private handleFileSelected(e: Event): void {
        const input = e.target as HTMLInputElement;
        if (!input || !input.files || input.files.length === 0) return;
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const dataUrl = reader.result as string;
                const svc: any = this.service as any;
                // Priorité à une méthode sendImage si elle existe (envoie le File brut si possible)
                if (typeof svc.sendImage === 'function') {
                    // sendImage(userId, File) — implémenter côté service si besoin
                    svc.sendImage(this.currentUserId, file);
                } else if (typeof svc.sendMessage === 'function') {
                    // Envoi d'un payload JSON que le service peut stocker/traiter
                    const payload = JSON.stringify({ type: 'image', filename: file.name, size: file.size, dataUrl });
                    svc.sendMessage(this.currentUserId, payload);
                } else {
                    console.error('Aucune méthode d\'envoi d\'image détectée sur GlobalChatService');
                }
            } catch (err) {
                console.error('Erreur lors de l\'envoi de l\'image', err);
            } finally {
                // reset input
                if (this.hiddenFileInput) this.hiddenFileInput.value = '';
            }
        };
        reader.onerror = () => {
            console.error('Impossible de lire le fichier');
            if (this.hiddenFileInput) this.hiddenFileInput.value = '';
        };
        reader.readAsDataURL(file);
    }
}
