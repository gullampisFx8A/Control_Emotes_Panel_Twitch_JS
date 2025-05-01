console.log("[Background] Background script loaded");

// Инициализация контекстного меню при установке или обновлении расширения
chrome.runtime.onInstalled.addListener(() => {
    console.log("[Background] Extension installed or updated");
    initializeContextMenu();
});

// Обработчик сообщений от content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("[Background] Received message:", request);
    try {
        if (request.action === 'createContextMenu') {
            console.log("[Background] Creating context menu...");
            initializeContextMenu(request.items);
            sendResponse({ status: 'success' });
        } else {
            console.warn("[Background] Unknown action:", request.action);
            sendResponse({ status: 'error', message: `Unknown action: ${request.action}` });
        }
    } catch (error) {
        console.error("[Background] Error processing message:", error);
        sendResponse({ status: 'error', message: error.message });
    }
});

// Обработчик кликов по контекстному меню
chrome.contextMenus.onClicked.addListener((info, tab) => {
    console.log("[Background] Context menu clicked:", info);
    try {
        if (!tab.id) {
            console.error("[Background] No tab ID available");
            return;
        }
        chrome.tabs.sendMessage(tab.id, {
            action: 'contextMenuClicked',
            info: info
        }, response => {
            if (chrome.runtime.lastError) {
                console.error("[Background] Error sending message to content script:", chrome.runtime.lastError);
                return;
            }
            console.log("[Background] Response from content script:", response || "No response");
        });
    } catch (error) {
        console.error("[Background] Error handling context menu click:", error);
    }
});

// Функция для инициализации контекстного меню
function initializeContextMenu(items = [
    {
        id: 'blockEmote',
        title: 'Block Emote',
        contexts: ['image'],
        documentUrlPatterns: [
            'https://www.twitch.tv/*',
            'https://player.twitch.tv/*',
            'https://*.ttvnw.net/*',
            'https://*.jtvnw.net/*',
            'https://cdn.frankerfacez.com/*',
            'https://cdn.7tv.app/*',
            'https://cdn.betterttv.net/*'
        ]
    }
]) {
    try {
        console.log("[Background] Initializing context menu...");
        chrome.contextMenus.removeAll(() => {
            if (chrome.runtime.lastError) {
                console.error("[Background] Error removing existing context menus:", chrome.runtime.lastError);
                return;
            }
            items.forEach(item => {
                chrome.contextMenus.create({
                    id: item.id,
                    title: item.title,
                    contexts: item.contexts,
                    documentUrlPatterns: item.documentUrlPatterns
                }, () => {
                    if (chrome.runtime.lastError) {
                        console.error(`[Background] Error creating context menu item ${item.id}:`, chrome.runtime.lastError);
                    } else {
                        console.log(`[Background] Context menu item created: ${item.id}`);
                    }
                });
            });
            console.log("[Background] Context menu initialization complete");
        });
    } catch (error) {
        console.error("[Background] Error initializing context menu:", error);
    }
}

// Обработка ошибок расширения
chrome.runtime.onError = (error) => {
    console.error("[Background] Runtime error:", error);
};

console.log("[Background] Background script initialization complete");