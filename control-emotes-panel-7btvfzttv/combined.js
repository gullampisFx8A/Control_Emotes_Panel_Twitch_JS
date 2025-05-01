// ======= combined.js ====== 
console.log("[Twitch Emote Blocker] Script started loading...");
console.log("[EXT] Injected in:", window.location.href);

// === storage.js ===
function getStorage(key, defaultValue) {
    const rawData = localStorage.getItem(key);
    try {
        return rawData ? JSON.parse(rawData) : defaultValue;
    } catch (e) {
        console.error(`[Storage] Error parsing ${key}:`, e);
        return defaultValue;
    }
}

function setStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value, null, 2));
        console.log(`[Storage] Saved ${key}:`, value);
    } catch (e) {
        console.error(`[Storage] Error saving ${key}:`, e);
    }
}

// === blocking.js ===
let blockedEmotes = [];
let blockedChannels = [];
let blockedEmoteIDs = new Set();
let blockedChannelIDs = new Set();
let newlyAddedIds = new Set();
let isObservingChat = false;
let retryCount = 0;
const maxRetries = 20;
let mutationCount = 0;
let isBlockingEnabled = true;
const processedEmotes = new WeakMap();

// Глобальные элементы UI (будем хранить их для доступа из других функций)
let uiElements = null;

function generateRandomID() {
    return `emote_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function toggleEmotesInNode(node, immediate = false) {
    try {
        const startTime = performance.now();
        console.log(`[${new Date().toISOString()}] [Blocking] toggleEmotesInNode - starting (immediate: ${immediate})`);

        const emoteSelectors = [
            'img[src*="cdn.7tv.app"], img[src*="betterttv.net"], img[src*="frankerfacez.com"], img[src*="jtvnw.net"], img[src*="twitchcdn.net"]',
            '.chat-line__message img, .chat-message-emote img',
            '.bttv-emote, .seventv-emote, .ffz-emote, .twitch-emote',
            '[data-provider="ffz"], [data-provider="7tv"], [data-provider="bttv"]',
            'img[data-emote-name], img[alt], .chat-line__message--emote',
            '.chat-image, .chat-emote',
            'img[data-a-target="emote-name"], img.emote'
        ].join(', ');

        const emotes = node.querySelectorAll(emoteSelectors);
        console.log(`[Blocking] Found ${emotes.length} emotes in node`);

        for (const emote of emotes) {
            const emoteUrl = emote.src || emote.getAttribute('srcset')?.split(' ')[0] || '';
            const emoteAlt = (
                emote.getAttribute('alt') ||
                emote.getAttribute('data-emote-name') ||
                emote.getAttribute('title') ||
                emote.getAttribute('data-a-target') ||
                ''
            ).trim();
            let blockedEntry = null;

            if (emoteUrl.includes('7tv.app')) {
                blockedEntry = blockedEmotes.find(e => e.platform === '7tv' && (e.emoteUrl === emoteUrl || e.emoteName === emoteAlt));
            } else if (emoteUrl.includes('betterttv.net')) {
                blockedEntry = blockedEmotes.find(e => e.platform === 'bttTV' && (e.emoteUrl === emoteUrl || e.emoteName === emoteAlt));
            } else if (emoteUrl.includes('frankerfacez.com')) {
                blockedEntry = blockedEmotes.find(e => e.platform === 'ffz' && (e.emoteUrl === emoteUrl || e.emoteName === emoteAlt));
            } else if (emoteUrl.includes('jtvnw.net') || emoteUrl.includes('twitchcdn.net') || emoteAlt) {
                blockedEntry = blockedChannels.find(e => e.platform === 'TwitchChannel' && emoteAlt.startsWith(e.name));
            }

            if (blockedEntry && !emote.getAttribute('data-emote-id')) {
                emote.setAttribute('data-emote-id', blockedEntry.id);
            }

            const emoteId = emote.getAttribute('data-emote-id') || emote.getAttribute('data-id') || '';
            const isBlocked = isBlockingEnabled && (blockedEntry || (emoteId && (blockedEmoteIDs.has(emoteId) || blockedChannelIDs.has(emoteId))));

            emote.style.display = isBlocked ? 'none' : '';
            console.log(`[Blocking] Emote ${emoteAlt || emoteUrl} (ID: ${emoteId || 'none'}) ${isBlocked ? 'hidden' : 'shown'}`);
        }

        console.log(`[Blocking] toggleEmotesInNode took ${performance.now() - startTime} ms`);
    } catch (error) {
        console.error("[Blocking] Error in toggleEmotesInNode:", error);
    }
}

function initBlocking() {
    console.log("[Blocking] Initializing...");
    try {
        blockedEmotes = getStorage('blockedEmotes', []);
        blockedChannels = getStorage('blockedChannels', []);
        isBlockingEnabled = getStorage('isBlockingEnabled', true);
        blockedEmoteIDs = new Set(blockedEmotes.map(emote => emote.id));
        blockedChannelIDs = new Set(blockedChannels.map(channel => channel.id));
        console.log("[Blocking] Loaded:", { blockedEmotes, blockedChannels, isBlockingEnabled });

        observeChatContainer();
    } catch (error) {
        console.error("[Blocking] Initialization error:", error);
    }
}

function observeChatContainer() {
    if (isObservingChat) return;

    const chatSelectors = [
        '.chat-scrollable-area__message-container',
        '.chat-list__lines',
        '.chat-line__message-container',
        '.chat-list--default',
        '.chat-messages',
        '.chat-room__content',
        '.chat-line__message',
        '.chat-message-list',
        '.chat-line',
        '.chat-message'
    ].join(', ');

    const chatContainer = document.querySelector(chatSelectors);
    if (chatContainer) {
        console.log("%c[Blocking] Контейнер чата найден, начинаем наблюдение", "color: #00C4B4");
        isObservingChat = true;
        const observer = new MutationObserver(mutations => {
            console.log(`[Blocking] MutationObserver triggered ${++mutationCount} times`);
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) {
                        console.log("%c[Blocking] Новый узел добавлен в DOM", "color: #1DCA88");
                        toggleEmotesInNode(node, true);
                    }
                });
            });
        });
        observer.observe(chatContainer, { childList: true, subtree: true });
        toggleEmotesInNode(chatContainer, true); // Немедленное обновление при инициализации
    } else if (retryCount < maxRetries) {
        retryCount++;
        console.log(`%c[Blocking] Контейнер чата не найден, попытка ${retryCount}/${maxRetries}`, "color: #FF5555");
        setTimeout(observeChatContainer, 500);
    } else {
        console.warn("[Blocking] Chat container not found after max retries");
    }
}

function startRootObserver() {
    const rootObserver = new MutationObserver(() => {
        if (!isObservingChat) {
            observeChatContainer();
        }
    });
    rootObserver.observe(document.body, { childList: true, subtree: true });
    console.log("%c[Blocking] RootObserver запущен", "color: #1E90FF");

    let lastUrl = location.href;
    function checkUrlChange() {
        const currentUrl = location.href;
        if (currentUrl !== lastUrl) {
            console.log('[Blocking] URL изменился, перезапускаем наблюдение за чатом');
            isObservingChat = false;
            lastUrl = currentUrl;
            observeChatContainer();
        }
        setTimeout(checkUrlChange, 1000);
    }
    checkUrlChange();
}

function addEmoteOrChannel(emotePrefix, platform, emoteName, emoteUrl, targetElement = null) {
    console.log("[Blocking] Adding emote/channel:", { emotePrefix, platform, emoteName, emoteUrl });
    const emoteId = generateRandomID();
    const currentDateTime = new Date().toISOString();
    let prefix = '';

    if (platform === 'TwitchChannel') {
        const match = emoteName.match(/^([a-z0-9]+)([A-Z].*|\d+.*)$/);
        if (match) {
            prefix = match[1];
        } else {
            prefix = emoteName.split(/[^a-zA-Z0-9]/)[0] || emoteName;
        }
    }

    const newEntry = {
        id: emoteId,
        name: platform === 'TwitchChannel' ? prefix : '',
        platform,
        emoteName: emoteName || 'Unnamed',
        emoteUrl: platform === 'TwitchChannel' ? emoteName : emoteUrl,
        date: currentDateTime
    };

    const isDuplicate = platform === 'TwitchChannel'
        ? blockedChannels.some(e => e.name === newEntry.name && e.platform === newEntry.platform)
        : blockedEmotes.some(e => e.emoteUrl === newEntry.emoteUrl && e.emoteName === newEntry.emoteName && e.platform === newEntry.platform);

    if (isDuplicate) {
        console.log(`[Blocking] Duplicate found: ${newEntry.emoteName}`);
        return newEntry;
    }

    if (platform === 'TwitchChannel') {
        blockedChannels.push(newEntry);
        blockedChannelIDs.add(emoteId);
        newlyAddedIds.add(emoteId);
        setStorage('blockedChannels', blockedChannels);
    } else {
        blockedEmotes.push(newEntry);
        blockedEmoteIDs.add(emoteId);
        newlyAddedIds.add(emoteId);
        setStorage('blockedEmotes', blockedEmotes);
    }

    // Немедленное скрытие целевого элемента
    if (targetElement) {
        targetElement.setAttribute('data-emote-id', emoteId);
        targetElement.style.display = 'none';
        console.log(`[Blocking] Target element ${emoteName} (ID: ${emoteId}) hidden immediately`);
    }

    // Обновление чата
    toggleEmotesInChat(true);

    // Обновление UI
    if (uiElements && uiElements.blockedList) {
        updateBlockedList(uiElements.blockedList, getBlockedItems());
    }
    if (uiElements && uiElements.counter) {
        updateCounter(uiElements.counter);
    }

    console.log(`[Blocking] Added:`, newEntry);
    return newEntry;
}

function removeEmoteOrChannel(id) {
    console.log("[Blocking] Removing emote/channel:", id);
    const removedEmote = blockedEmotes.find(e => e.id === id);
    const removedChannel = blockedChannels.find(c => c.id === id);
    blockedEmotes = blockedEmotes.filter(e => e.id !== id);
    blockedChannels = blockedChannels.filter(c => c.id !== id);
    blockedEmoteIDs.delete(id);
    blockedChannelIDs.delete(id);
    newlyAddedIds.delete(id);
    setStorage('blockedEmotes', blockedEmotes);
    setStorage('blockedChannels', blockedChannels);
    processedEmotes.clear();

    toggleEmotesInChat(true);

    // Обновление UI
    if (uiElements && uiElements.blockedList) {
        updateBlockedList(uiElements.blockedList, getBlockedItems());
    }
    if (uiElements && uiElements.counter) {
        updateCounter(uiElements.counter);
    }

    console.log(`[Blocking] Removed: ${removedEmote?.emoteName || removedChannel?.emoteName || 'unknown'} (ID: ${id})`);
}

function toggleEmotesInChat(immediate = false) {
    console.log(`[${new Date().toISOString()}] [Blocking] toggleEmotesInChat started (immediate: ${immediate})`);
    const startTime = performance.now();

    // Расширенные селекторы для контейнеров чата
    const chatSelectors = [
        '.chat-scrollable-area__message-container',
        '.chat-list__lines',
        '.chat-line__message-container',
        '.chat-list--default',
        '.chat-messages',
        '.chat-room__content',
        '.chat-line__message',
        '.chat-message-list',
        '.chat-line',
        '.chat-message'
    ].join(', ');

    // Расширенные селекторы для смайлов
    const emoteSelectors = [
        'img[src*="cdn.7tv.app"], img[src*="betterttv.net"], img[src*="frankerfacez.com"], img[src*="jtvnw.net"], img[src*="twitchcdn.net"]',
        '.chat-line__message img, .chat-message-emote img',
        '.bttv-emote, .seventv-emote, .ffz-emote, .twitch-emote',
        '[data-provider="ffz"], [data-provider="7tv"], [data-provider="bttv"]',
        'img[data-emote-name], img[alt], .chat-line__message--emote',
        '.chat-image, .chat-emote',
        'img[data-a-target="emote-name"], img.emote'
    ].join(', ');

    // Очистка кэша для принудительного обновления
    processedEmotes.clear();

    // Функция обработки смайлов в документе или iframe
    function processEmotesInDocument(doc) {
        const allEmotes = doc.querySelectorAll(emoteSelectors);
        console.log(`[Blocking] Found ${allEmotes.length} emotes in document`);

        allEmotes.forEach(emote => {
            try {
                const emoteUrl = emote.src || emote.getAttribute('srcset')?.split(' ')[0] || '';
                const emoteAlt = (
                    emote.getAttribute('alt') ||
                    emote.getAttribute('data-emote-name') ||
                    emote.getAttribute('title') ||
                    emote.getAttribute('data-a-target') ||
                    ''
                ).trim();
                let blockedEntry = null;

                if (emoteUrl.includes('7tv.app')) {
                    blockedEntry = blockedEmotes.find(e => e.platform === '7tv' && (e.emoteUrl === emoteUrl || e.emoteName === emoteAlt));
                } else if (emoteUrl.includes('betterttv.net')) {
                    blockedEntry = blockedEmotes.find(e => e.platform === 'bttTV' && (e.emoteUrl === emoteUrl || e.emoteName === emoteAlt));
                } else if (emoteUrl.includes('frankerfacez.com')) {
                    blockedEntry = blockedEmotes.find(e => e.platform === 'ffz' && (e.emoteUrl === emoteUrl || e.emoteName === emoteAlt));
                } else if (emoteUrl.includes('jtvnw.net') || emoteUrl.includes('twitchcdn.net') || emoteAlt) {
                    blockedEntry = blockedChannels.find(e => e.platform === 'TwitchChannel' && emoteAlt.startsWith(e.name));
                }

                if (blockedEntry && !emote.getAttribute('data-emote-id')) {
                    emote.setAttribute('data-emote-id', blockedEntry.id);
                }

                const emoteId = emote.getAttribute('data-emote-id') || emote.getAttribute('data-id') || '';
                const isBlocked = isBlockingEnabled && (blockedEntry || (emoteId && (blockedEmoteIDs.has(emoteId) || blockedChannelIDs.has(emoteId))));

                emote.style.display = isBlocked ? 'none' : '';
                console.log(`[Blocking] Emote ${emoteAlt || emoteUrl} (ID: ${emoteId || 'none'}) ${isBlocked ? 'hidden' : 'shown'}`);
            } catch (error) {
                console.error(`[Blocking] Error processing emote: ${error}`);
            }
        });

        const chatContainers = doc.querySelectorAll(chatSelectors);
        console.log(`[Blocking] Found ${chatContainers.length} chat containers in document`);
        chatContainers.forEach(container => {
            toggleEmotesInNode(container, immediate);
        });
    }

    // Обработка основного документа
    processEmotesInDocument(document);

    // Обработка всех iframe
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (iframeDoc) {
                console.log(`[Blocking] Processing iframe: ${iframe.src}`);
                processEmotesInDocument(iframeDoc);
            }
        } catch (error) {
            console.warn(`[Blocking] Cannot access iframe content: ${error}`);
        }
    });

    console.log(`[Blocking] toggleEmotesInChat finished in ${performance.now() - startTime} ms`);
}

function getBlockedItems() {
    return { blockedEmotes, blockedChannels, newlyAddedIds };
}

// === ui.js ===
function createUI() {
    if (window.location.href.includes('player.twitch.tv') || window.location.href.includes('twitch.tv/embed')) {
        console.log("[UI] Skipping UI creation in iframe");
        return null;
    }

    console.log("[UI] Creating control panel and button...");
    const controlPanelHtml = `
        <div id="control-panel">
            <div class="version-label">v.2.6.51</div>
            <h4 class="title">List of Blocked Emotes</h4>
            <div id="sortContainer"></div>
            <div class="search-container">
                <input type="text" id="search-input" placeholder="Search in blocked list...">
                <button id="search-button">Search</button>
            </div>
            <ul id="blocked-list"></ul>
            <div class="input-container">
                <select id="platform-select">
                    <option value="TwitchChannel">TwitchChannel</option>
                    <option value="7tv">7tv</option>
                    <option value="bttTV">bttTV</option>
                    <option value="ffz">ffz</option>
                </select>
                <input type="text" id="add-input" placeholder="Type to add channel">
                <button id="add-button">Add it</button>
            </div>
            <div class="button-container">
                <button id="clear-all-button">Delete All</button>
                <button id="export-button">Export</button>
                <button id="import-button">Import</button>
                <button id="unblock-all-button">Disable Blocking</button>
                <button id="block-all-button">Enable Blocking</button>
                <button id="show-stats-button">Show Stats Chart</button>
            </div>
            <div class="theme-selector-container">
                <select id="theme-select">
                    <option value="default">Default Theme</option>
                    <option value="glassmorphism">Glassmorphism Theme</option>
                    <option value="dark">Dark Theme</option>
                    <option value="waterBlue">Water Blue Theme</option>
                    <option value="darkRaspberry">Dark Raspberry Theme</option>
                </select>
            </div>
            <div id="chart-modal" style="display: none;">
                <div class="chart-container">
                    <button id="close-chart-button">Close</button>
                    <canvas id="stats-chart"></canvas>
                </div>
            </div>
            <div id="counter"></div>
        </div>
        <button id="open-panel-button">Open Panel</button>    
    `;

    const container = document.createElement('div');
    container.innerHTML = controlPanelHtml;
    document.body.appendChild(container);
    console.log("[UI] Control panel and button appended to DOM");

    // Динамически добавляем <link> для CSS, если его нет
    let themeStylesheet = document.getElementById('theme-stylesheet');
    if (!themeStylesheet) {
        themeStylesheet = document.createElement('link');
        themeStylesheet.id = 'theme-stylesheet';
        themeStylesheet.rel = 'stylesheet';
        themeStylesheet.href = chrome.runtime.getURL('css/styles.css');
        document.head.appendChild(themeStylesheet);
        console.log("[UI] Theme stylesheet added to <head>");
    }

    const controlPanel = document.getElementById('control-panel');
    const sortContainer = document.getElementById('sortContainer');
    const counter = document.getElementById('counter');
    const openPanelButton = document.getElementById('open-panel-button');

    let currentSortOrder = { name: 'asc', platform: 'asc', date: 'asc' };

    // Кнопки сортировки
    const sortByNameButton = document.createElement('button');
    sortByNameButton.innerHTML = 'Name ▲';
    sortByNameButton.style.cssText = 'cursor: pointer; margin-right: 10px;';
    sortByNameButton.onclick = () => {
        const order = currentSortOrder.name === 'asc' ? 'desc' : 'asc';
        currentSortOrder.name = order;
        sortByNameButton.innerHTML = `Name ${order === 'asc' ? '▲' : '▼'}`;
        sortblockedEmotes('name', order);
    };
    sortContainer.appendChild(sortByNameButton);

    const sortByPlatformButton = document.createElement('button');
    sortByPlatformButton.innerHTML = 'Platform ▲';
    sortByPlatformButton.style.cssText = 'cursor: pointer; margin-right: 10px;';
    sortByPlatformButton.onclick = () => {
        const order = currentSortOrder.platform === 'asc' ? 'desc' : 'asc';
        currentSortOrder.platform = order;
        sortByPlatformButton.innerHTML = `Platform ${order === 'asc' ? '▲' : '▼'}`;
        sortblockedEmotes('platform', order);
    };
    sortContainer.appendChild(sortByPlatformButton);

    const sortByDateButton = document.createElement('button');
    sortByDateButton.innerHTML = 'Date-Time ▲';
    sortByDateButton.style.cssText = 'cursor: pointer; margin-right: 10px;';
    sortByDateButton.onclick = () => {
        const order = currentSortOrder.date === 'asc' ? 'desc' : 'asc';
        currentSortOrder.date = order;
        sortByDateButton.innerHTML = `Date ${order === 'asc' ? '▲' : '▼'}`;
        sortblockedEmotes('date', order);
    };
    sortContainer.appendChild(sortByDateButton);

    const goToLastButton = document.createElement('button');
    goToLastButton.innerHTML = 'Go To Last Element ▼';
    goToLastButton.style.cssText = 'cursor: pointer;';
    goToLastButton.onclick = goToLastAddedItem;
    sortContainer.appendChild(goToLastButton);

    // Загружаем сохраненное состояние видимости
    const isVisible = getStorage('panelVisible', false);
    console.log("[UI] Panel visibility state:", isVisible);
    controlPanel.classList.toggle('visible', isVisible);
    openPanelButton.innerText = isVisible ? 'Close Panel' : 'Open Panel';

    // Обработчик клика по кнопке открытия/закрытия
    openPanelButton.addEventListener('click', () => {
        console.log("[UI] Open panel button clicked");
        const isVisible = controlPanel.classList.contains('visible');
        controlPanel.classList.toggle('visible', !isVisible);
        openPanelButton.innerText = isVisible ? 'Open Panel' : 'Close Panel';
        setStorage('panelVisible', !isVisible);
    });

    // Делаем панель перетаскиваемой
    makePanelDraggable(controlPanel);

    return {
        controlPanel,
        searchInput: document.getElementById('search-input'),
        searchButton: document.getElementById('search-button'),
        blockedList: document.getElementById('blocked-list'),
        platformSelect: document.getElementById('platform-select'),
        addInput: document.getElementById('add-input'),
        addButton: document.getElementById('add-button'),
        clearAllButton: document.getElementById('clear-all-button'),
        exportButton: document.getElementById('export-button'),
        importButton: document.getElementById('import-button'),
        unblockAllButton: document.getElementById('unblock-all-button'),
        blockAllButton: document.getElementById('block-all-button'),
        showStatsButton: document.getElementById('show-stats-button'),
        themeSelect: document.getElementById('theme-select'),
        chartModal: document.getElementById('chart-modal'),
        closeChartButton: document.getElementById('close-chart-button'),
        statsChart: document.getElementById('stats-chart'),
        openPanelButton,
        counter
    };
}
 

function makePanelDraggable(panel) {
    console.log("[UI] Setting up draggable panel...");
    let offsetX = 0, offsetY = 0, isDragging = false;

    const dragHandle = document.createElement('div');
    dragHandle.style.cssText = `
        width: 745px;
        height: 730px;
        background: #b4393900;
        cursor: grab;
        position: absolute;
        top: 0px;
        left: 3px;
        z-index: -1;
        border-radius: 8px 8px 0px 0px;
    `;
    panel.appendChild(dragHandle);

    dragHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - panel.getBoundingClientRect().left;
        offsetY = e.clientY - panel.getBoundingClientRect().top;
        dragHandle.style.cursor = 'grabbing';
        console.log("[UI] Dragging started");
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        panel.style.left = `${e.clientX - offsetX}px`;
        panel.style.top = `${e.clientY - offsetY}px`;
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        dragHandle.style.cursor = 'grab';
        console.log("[UI] Dragging stopped");
    });
}

function bindButtonHandlers(elements, handlers) {
    if (!elements) return;
    console.log("[UI] Binding button handlers...");
    
    // Удалены обработчики ховера, теперь CSS управляет эффектами :hover
    elements.searchButton.onclick = handlers.search;
    elements.addButton.onclick = handlers.add;
    elements.clearAllButton.onclick = handlers.clearAll;
    elements.exportButton.onclick = handlers.export;
    elements.importButton.onclick = handlers.import;
    elements.unblockAllButton.onclick = handlers.unblockAll;
    elements.blockAllButton.onclick = handlers.blockAll;
    elements.showStatsButton.onclick = handlers.showStats;
    elements.closeChartButton.onclick = handlers.closeChart;
    elements.platformSelect.onchange = handlers.platformChange;
    elements.themeSelect.onchange = handlers.themeChange;
}

// === content.js ===
function initContextMenu() {
    console.log("[Content] Initializing context menu...");
    chrome.runtime.sendMessage({
        action: 'createContextMenu',
        items: [
            {
                id: 'blockEmote',
                title: 'Block Emote',
                contexts: ['image'],
                documentUrlPatterns: [
                    'https://www.twitch.tv/*',
                    'https://player.twitch.tv/*',
                    'https://www.twitch.tv/embed/*',
                    'https://*.ttvnw.net/*',
                    'https://*.jtvnw.net/*',
                    'https://cdn.frankerfacez.com/*',
                    'https://cdn.7tv.app/*',
                    'https://cdn.betterttv.net/*'
                ]
            }
        ]
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("[Content] Received message:", request);
    if (request.action === 'contextMenuClicked') {
        const { menuItemId, srcUrl, linkText, frameId } = request.info;
        if (menuItemId === 'blockEmote' && srcUrl) {
            let platform, emoteName, emoteUrl, emotePrefix;
            let emoteAlt = linkText || '';
            let targetElement = null;

            try {
                const frame = frameId && document.querySelectorAll('iframe')[frameId]
                    ? document.querySelectorAll('iframe')[frameId]
                    : document;
                const images = frame.querySelectorAll(`img[src="${srcUrl}"], img[srcset*="${srcUrl}"], .chat-line__message img, .seventv-emote, .bttv-emote, .ffz-emote, .twitch-emote, .chat-message-emote`);
                for (const img of images) {
                    if (img.src === srcUrl || img.getAttribute('srcset')?.includes(srcUrl)) {
                        targetElement = img;
                        break;
                    }
                }
                if (!targetElement && images.length > 0) {
                    targetElement = images[0];
                }
                console.log('[Content] Found target element:', targetElement);
            } catch (e) {
                console.warn('[Content] Failed to find element in DOM:', e);
            }

            if (targetElement) {
                emoteAlt = targetElement.getAttribute('alt') ||
                           targetElement.getAttribute('data-emote-name') ||
                           targetElement.getAttribute('title') ||
                           targetElement.closest('.chat-line__message')?.querySelector('.chat-line__message--emote')?.getAttribute('data-emote-name') ||
                           '';
                emoteAlt = emoteAlt.trim();
            }

            const dataProvider = targetElement?.getAttribute('data-provider') || '';
            if (srcUrl.includes('7tv.app') || dataProvider === '7tv') {
                platform = '7tv';
                emoteUrl = srcUrl;
                emoteName = emoteAlt || srcUrl.split('/').slice(-2)[0] || 'Unnamed';
                emotePrefix = emoteUrl;
            } else if (srcUrl.includes('betterttv.net') || dataProvider === 'bttv') {
                platform = 'bttTV';
                emoteUrl = srcUrl;
                emoteName = emoteAlt || srcUrl.split('/').pop().replace(/\.webp|\.png/, '') || 'Unnamed';
                emotePrefix = emoteUrl;
            } else if (srcUrl.includes('frankerfacez.com') || dataProvider === 'ffz') {
                platform = 'ffz';
                emoteUrl = srcUrl;
                emoteName = emoteAlt || srcUrl.split('/').pop().replace(/\.webp|\.png/, '') || 'Unnamed';
                emotePrefix = emoteUrl;
            } else if (srcUrl.includes('jtvnw.net') || emoteAlt) {
                platform = 'TwitchChannel';
                emoteUrl = srcUrl;
                emoteName = emoteAlt || srcUrl.split('/').pop() || 'Unnamed';
                const match = emoteName.match(/^([a-z0-9]+)([A-Z].*|\d+.*)$/);
                emotePrefix = match ? match[1] : emoteName.split(/[^a-zA-Z0-9]/)[0] || emoteName;
            } else {
                platform = 'TwitchChannel';
                emoteUrl = srcUrl;
                emoteName = emoteAlt || srcUrl.split('/').pop() || 'Unnamed';
                const match = emoteName.match(/^([a-z0-9]+)([A-Z].*|\d+.*)$/);
                emotePrefix = match ? match[1] : emoteName.split(/[^a-zA-Z0-9]/)[0] || emoteName;
            }

            if (!emoteName || emoteName === 'Unknown') {
                emoteName = targetElement?.getAttribute('data-id') || srcUrl.split('/').pop() || 'Unnamed';
            }

            console.log(`[Content] Blocking emote:`, { emoteName, platform, emoteUrl, emotePrefix });
            const item = addEmoteOrChannel(emotePrefix, platform, emoteName, emoteUrl, targetElement);
        }
    }
});

function updateBlockedList(blockedList, { blockedEmotes, blockedChannels, newlyAddedIds }) {
    console.log("[Content] Updating blocked list...", { blockedEmotesCount: blockedEmotes.length, blockedChannelsCount: blockedChannels.length });
    if (!blockedList) {
        console.warn("[Content] Blocked list element not found");
        return;
    }
    blockedList.innerHTML = '';
    const allItems = [...blockedChannels, ...blockedEmotes];
    allItems.forEach(item => {
        const li = document.createElement('li');
        li.className = `blocked-item ${newlyAddedIds.has(item.id) ? 'new-item' : ''}`;
        li.dataset.id = item.id;
        const infoText = item.platform === 'TwitchChannel' && item.name
            ? `(prefix: ${item.name}, emoteName: ${item.emoteName})`
            : `(url: ${item.emoteUrl})`;
        li.innerHTML = `
            <div style="display: flex; justify-content: space-between;">
                <span>${item.platform} > ${item.emoteName}</span>
                <span>${new Date(item.date).toLocaleString('en-GB')}</span>
                <button class="delete-button">Delete</button>
            </div>
            <span>${infoText}</span>
        `;
        li.querySelector('.delete-button').onclick = () => {
            removeEmoteOrChannel(item.id);
        };
        blockedList.appendChild(li);
    });
    console.log("[Content] Blocked list updated with", allItems.length, "items");
}

function sortblockedEmotes(criteria, order) {
    console.log("[Content] Sorting by:", criteria, order);
    const sortFunc = (a, b) => {
        let comparison = 0;
        if (criteria === 'name') {
            comparison = a.emoteName.localeCompare(b.emoteName);
        } else if (criteria === 'platform') {
            comparison = a.platform.localeCompare(b.platform);
        } else if (criteria === 'date') {
            comparison = new Date(a.date) - new Date(b.date);
        }
        return order === 'asc' ? comparison : -comparison;
    };

    blockedEmotes.sort(sortFunc);
    blockedChannels.sort(sortFunc);
    if (uiElements && uiElements.blockedList) {
        updateBlockedList(uiElements.blockedList, getBlockedItems());
    }
}

function goToLastAddedItem() {
    console.log("[Content] Going to last added item...");
    const allItems = [...blockedEmotes, ...blockedChannels];
    if (allItems.length === 0) {
        console.log("[Content] Список пуст, некуда прокручивать");
        return;
    }

    const lastItem = allItems.reduce((latest, current) => {
        return new Date(current.date) > new Date(latest.date) ? current : latest;
    });

    const blockedList = uiElements ? uiElements.blockedList : document.getElementById('blocked-list');
    let lastElement = blockedList.querySelector(`[data-id="${lastItem.id}"]`);
    if (lastElement) {
        lastElement.classList.add('last-item-highlight');
        const itemOffsetTop = lastElement.offsetTop;
        const listHeight = blockedList.clientHeight;
        const itemHeight = lastElement.clientHeight;
        const scrollPosition = itemOffsetTop - (listHeight / 2) + (itemHeight / 2);
        blockedList.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
        });
        setTimeout(() => {
            lastElement.classList.remove('last-item-highlight');
            console.log(`[Content] Подсветка убрана с элемента: ${lastItem.emoteName}`);
        }, 5000);
        console.log(`[Content] Прокручено и подсвечено: ${lastItem.emoteName} (ID: ${lastItem.id})`);
    } else {
        console.log("[Content] Последний элемент не найден в DOM, обновляем список");
        updateBlockedList(blockedList, getBlockedItems());
        setTimeout(() => {
            lastElement = blockedList.querySelector(`[data-id="${lastItem.id}"]`);
            if (lastElement) {
                lastElement.classList.add('last-item-highlight');
                const itemOffsetTop = lastElement.offsetTop;
                const listHeight = blockedList.clientHeight;
                const itemHeight = lastElement.clientHeight;
                const scrollPosition = itemOffsetTop - (listHeight / 2) + (itemHeight / 2);
                blockedList.scrollTo({
                    top: scrollPosition,
                    behavior: 'smooth'
                });
                setTimeout(() => {
                    lastElement.classList.remove('last-item-highlight');
                    console.log(`[Content] Подсветка убрана с элемента после обновления: ${lastItem.emoteName}`);
                }, 5000);
                console.log(`[Content] Успешно прокручено и подсвечено после обновления: ${lastItem.emoteName}`);
            }
        }, 100);
    }
}

function updateCounter(counter) {
    console.log("[Content] Updating counter...");
    if (!counter) {
        console.warn("[Content] Counter element not found");
        return;
    }
    const twitchCount = blockedChannels.length;
    const bttvCount = blockedEmotes.filter(channel => channel.platform === 'bttTV').length;
    const tv7Count = blockedEmotes.filter(channel => channel.platform === '7tv').length;
    const ffzCount = blockedEmotes.filter(channel => channel.platform === 'ffz').length;
    const totalCount = twitchCount + bttvCount + tv7Count + ffzCount;
    counter.innerText = `Twitch: ${twitchCount} | BTTV: ${bttvCount} | 7TV: ${tv7Count} | FFZ: ${ffzCount} | Total: ${totalCount}`;
}

function filterBlockedList(searchTerm) {
    console.log("[Content] Filtering list with term:", searchTerm);
    const blockedList = uiElements ? uiElements.blockedList : document.getElementById('blocked-list');
    const items = blockedList.getElementsByTagName('li');
    for (const item of items) {
        const text = item.textContent.toLowerCase();
        item.style.display = text.includes(searchTerm.toLowerCase()) ? '' : 'none';
    }
}

function showStatsChart(chartCanvas) {
    console.log("[Content] Showing stats chart...");
    try {
        const { blockedEmotes, blockedChannels } = getBlockedItems();
        const platforms = ['TwitchChannel', '7tv', 'bttTV', 'ffz'];
        const counts = platforms.map(platform => {
            return [
                ...blockedEmotes.filter(e => e.platform === platform),
                ...blockedChannels.filter(c => c.platform === platform)
            ].length;
        });

        new Chart(chartCanvas, {
            type: 'bar',
            data: {
                labels: platforms,
                datasets: [{
                    label: 'Blocked Items',
                    data: counts,
                    backgroundColor: ['#907cad', '#b69dcf', '#7a5b9a', '#455565']
                }]
            },
            options: {
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    } catch (error) {
        console.error("[Content] Chart error:", error);
    }
}

function clearAllBlockedItems(counter) {
    console.log("[Content] Clearing all blocked items...");
    blockedEmotes = [];
    blockedChannels = [];
    blockedEmoteIDs.clear();
    blockedChannelIDs.clear();
    newlyAddedIds.clear();
    setStorage('blockedEmotes', blockedEmotes);
    setStorage('blockedChannels', blockedChannels);
    processedEmotes.clear();
    toggleEmotesInChat(true);
    if (uiElements && uiElements.blockedList) {
        updateBlockedList(uiElements.blockedList, getBlockedItems());
    }
    updateCounter(counter);
    console.log("[Content] All blocked items cleared");
}

function exportBlockedItems() {
    console.log("[Content] Exporting blocked items...");
    try {
        const data = {
            blockedEmotes,
            blockedChannels
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'blocked_emotes.json';
        a.click();
        URL.revokeObjectURL(url);
        console.log("[Content] Export successful");
    } catch (error) {
        console.error("[Content] Export error:", error);
    }
}

function importBlockedItems(counter) {
    console.log("[Content] Importing blocked items...");
    try {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        blockedEmotes = [];
                        blockedChannels = [];
                        blockedEmoteIDs.clear();
                        blockedChannelIDs.clear();
                        newlyAddedIds.clear();

                        const validEmotes = (data.blockedEmotes || []).filter(item =>
                            item.id && item.platform && item.emoteName && item.emoteUrl && item.date
                        );
                        const validChannels = (data.blockedChannels || []).filter(item =>
                            item.id && item.platform && item.emoteName && item.name && item.date
                        );

                        blockedEmotes = validEmotes;
                        blockedChannels = validChannels;
                        blockedEmoteIDs = new Set(blockedEmotes.map(e => e.id));
                        blockedChannelIDs = new Set(blockedChannels.map(c => c.id));
                        newlyAddedIds = new Set();

                        console.log("[Content] Imported:", {
                            blockedEmotes: blockedEmotes.length,
                            blockedChannels: blockedChannels.length,
                            invalidEmotes: (data.blockedEmotes || []).length - validEmotes.length,
                            invalidChannels: (data.blockedChannels || []).length - validChannels.length
                        });

                        setStorage('blockedEmotes', blockedEmotes);
                        setStorage('blockedChannels', blockedChannels);
                        processedEmotes.clear();
                        toggleEmotesInChat(true);
                        if (uiElements && uiElements.blockedList) {
                            updateBlockedList(uiElements.blockedList, getBlockedItems());
                        }
                        updateCounter(counter);
                        console.log("[Content] Import successful");
                    } catch (error) {
                        console.error("[Content] Import error:", error);
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    } catch (error) {
        console.error("[Content] Import error:", error);
    }
}

function disableBlocking() {
    console.log("[Content] Disabling blocking...");
    isBlockingEnabled = false;
    setStorage('isBlockingEnabled', false);
    toggleEmotesInChat(true); // Немедленное обновление чата
    if (uiElements && uiElements.unblockAllButton && uiElements.blockAllButton) {
        uiElements.unblockAllButton.classList.add('active');
        uiElements.blockAllButton.classList.remove('active');
    }
}

function enableBlocking() {
    console.log("[Content] Enabling blocking...");
    isBlockingEnabled = true;
    setStorage('isBlockingEnabled', true);
    toggleEmotesInChat(true); // Немедленное обновление чата
    if (uiElements && uiElements.blockAllButton && uiElements.unblockAllButton) {
        uiElements.blockAllButton.classList.add('active');
        uiElements.unblockAllButton.classList.remove('active');
    }
}

function init() {
    console.log("[Content] Starting init function...");
    try {
        initBlocking();

        uiElements = createUI();
        if (uiElements) {
            console.log("[Content] UI created:", uiElements);

            bindButtonHandlers(uiElements, {
                search: () => filterBlockedList(uiElements.searchInput.value.trim()),
                add: () => {
                    const value = uiElements.addInput.value.trim();
                    if (value) {
                        const item = addEmoteOrChannel(value, uiElements.platformSelect.value, value);
                        console.log("[Content] Added via UI:", item);
                        uiElements.addInput.value = '';
                    }
                },
                clearAll: () => clearAllBlockedItems(uiElements.counter),
                export: () => exportBlockedItems(),
                import: () => importBlockedItems(uiElements.counter),
                unblockAll: () => disableBlocking(),
                blockAll: () => enableBlocking(),
                showStats: () => {
                    uiElements.chartModal.style.display = 'flex';
                    showStatsChart(uiElements.statsChart);
                },
                closeChart: () => {
                    uiElements.chartModal.style.display = 'none';
                },
                platformChange: () => console.log("[Content] Platform changed:", uiElements.platformSelect.value),
                themeChange: () => {
                    const selectedTheme = uiElements.themeSelect.value;
                    const themeStylesheet = document.getElementById('theme-stylesheet');
                    if (themeStylesheet) {
                        let themeUrl;
                        switch (selectedTheme) {
                            case 'glassmorphism':
                                themeUrl = chrome.runtime.getURL('css/themes/glassmorphism.css');
                                break;
                            case 'dark':
                                themeUrl = chrome.runtime.getURL('css/themes/dark.css');
                                break;
                            case 'waterBlue':
                                themeUrl = chrome.runtime.getURL('css/themes/waterBlue.css');
                                break;
                            case 'darkRaspberry':
                                themeUrl = chrome.runtime.getURL('css/themes/darkRaspberry.css');
                                break;
                            default:
                                themeUrl = chrome.runtime.getURL('css/styles.css');
                        }
                        themeStylesheet.href = themeUrl;
                        setStorage('selectedTheme', selectedTheme);
                        console.log("[Content] Theme changed to:", selectedTheme);
                    } else {
                        console.warn("[Content] Theme stylesheet not found");
                    }
                }
            });

            // Установка начального состояния кнопок
            if (uiElements && uiElements.blockAllButton && uiElements.unblockAllButton) {
                if (isBlockingEnabled) {
                    uiElements.blockAllButton.classList.add('active');
                    uiElements.unblockAllButton.classList.remove('active');
                } else {
                    uiElements.unblockAllButton.classList.add('active');
                    uiElements.blockAllButton.classList.remove('active');
                }
            }

            // Загрузка сохранённой темы
            const savedTheme = getStorage('selectedTheme', 'default');
            uiElements.themeSelect.value = savedTheme;
            const themeStylesheet = document.getElementById('theme-stylesheet');
            if (themeStylesheet) {
                let themeUrl;
                switch (savedTheme) {
                    case 'glassmorphism':
                        themeUrl = chrome.runtime.getURL('css/themes/glassmorphism.css');
                        break;
                    case 'dark':
                        themeUrl = chrome.runtime.getURL('css/themes/dark.css');
                        break;
                    case 'waterBlue':
                        themeUrl = chrome.runtime.getURL('css/themes/waterBlue.css');
                        break;
                    case 'darkRaspberry':
                        themeUrl = chrome.runtime.getURL('css/themes/darkRaspberry.css');
                        break;
                    default:
                        themeUrl = chrome.runtime.getURL('css/styles.css');
                }
                themeStylesheet.href = themeUrl;
                console.log("[Content] Loaded theme:", savedTheme);
            }

            updateBlockedList(uiElements.blockedList, getBlockedItems());
            updateCounter(uiElements.counter);
        }

        initContextMenu();

        if (!window.location.href.includes('player.twitch.tv') && !window.location.href.includes('twitch.tv/embed')) {
            startRootObserver();
        }

        console.log("[Content] Initialization complete");
    } catch (error) {
        console.error("[Content] Initialization error:", error);
    }
}

const highlightStyle = document.createElement('style');
highlightStyle.innerHTML = `
.last-item-highlight {
        background-color: #115a14;
        transition: background-color 0.3s ease;
        color: #cfcfcf;
    }
    .blocked-item {
        padding: 5px;
        border-bottom: 1px solid #ccc;
    }
    .new-item {
        background-color: #307c30;
    }
    .delete-button {
        cursor: pointer;
        color: #cfcfcf;
    }
`;
document.head.appendChild(highlightStyle);

init();
console.log("[Twitch Emote Blocker] Script initialization triggered");