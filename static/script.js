document.addEventListener('DOMContentLoaded', () => {
    const chatForm = document.getElementById('chat-form');
    const userInput = document.getElementById('user-input');
    const messagesContainer = document.getElementById('messages');
    const sendBtn = document.getElementById('send-btn');
    const newChatBtn = document.getElementById('new-chat');

    // Auto-resize textarea
    userInput.addEventListener('input', () => {
        userInput.style.height = 'auto';
        userInput.style.height = (userInput.scrollHeight) + 'px';
        
        sendBtn.disabled = !userInput.value.trim();
    });

    // Handle form submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = userInput.value.trim();
        if (!message) return;

        // Clear input and reset height
        userInput.value = '';
        userInput.style.height = 'auto';
        sendBtn.disabled = true;

        // Append user message
        appendMessage('user', message);
        
        // Show typing indicator
        const typingId = showTypingIndicator();
        
        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });

            if (!response.ok) {
                throw new Error('Failed to get response from Gemma4');
            }

            const data = await response.json();
            
            // Remove typing indicator and append bot message
            removeTypingIndicator(typingId);
            appendMessage('bot', data.response);
            
        } catch (error) {
            console.error('Error:', error);
            removeTypingIndicator(typingId);
            appendMessage('system', 'Sorry, I encountered an error. Please check if the backend service is running.');
        }
    });

    // Handle suggestion chips
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('suggestion-chip')) {
            userInput.value = e.target.textContent;
            userInput.focus();
            userInput.dispatchEvent(new Event('input'));
        }
    });

    // New Chat button
    newChatBtn.addEventListener('click', () => {
        messagesContainer.innerHTML = '';
        appendMessage('system', `
            <div class="bot-avatar">G</div>
            <div class="text">
                <h2>New Conversation Started.</h2>
                <p>What can we explore next?</p>
            </div>
        `);
    });

    function appendMessage(role, text) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;
        
        let content = '';
        if (role === 'user') {
            content = `
                <div class="message-content">
                    <div class="user-avatar">U</div>
                    <div class="text">${escapeHtml(text)}</div>
                </div>
            `;
        } else if (role === 'bot') {
            content = `
                <div class="message-content">
                    <div class="bot-avatar">G</div>
                    <div class="text">${formatResponse(text)}</div>
                </div>
            `;
        } else {
            content = `<div class="message-content">${text}</div>`;
        }
        
        messageDiv.innerHTML = content;
        messagesContainer.appendChild(messageDiv);
        scrollToBottom();
    }

    function showTypingIndicator() {
        const id = 'typing-' + Date.now();
        const typingDiv = document.createElement('div');
        typingDiv.id = id;
        typingDiv.className = 'message bot-message';
        typingDiv.innerHTML = `
            <div class="message-content">
                <div class="bot-avatar">G</div>
                <div class="typing">
                    <span></span><span></span><span></span>
                </div>
            </div>
        `;
        messagesContainer.appendChild(typingDiv);
        scrollToBottom();
        return id;
    }

    function removeTypingIndicator(id) {
        const el = document.getElementById(id);
        if (el) el.remove();
    }

    function scrollToBottom() {
        // Use a small timeout to ensure DOM is updated
        setTimeout(() => {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }, 10);
    }

    function escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function formatResponse(text) {
        if (typeof marked !== 'undefined') {
            // Configure marked for highlighting
            marked.setOptions({
                highlight: function(code, lang) {
                    if (lang && hljs.getLanguage(lang)) {
                        return hljs.highlight(code, { language: lang }).value;
                    }
                    return hljs.highlightAuto(code).value;
                },
                breaks: true,
                gfm: true
            });
            return marked.parse(text);
        }
        
        // Final fallback if marked fails to load
        return text.replace(/\n/g, '<br>');
    }
});
