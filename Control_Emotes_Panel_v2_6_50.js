// ==UserScript==
// @name          Control Emotes Panel 2.6.50 (C) tapeavion
// @version       2.6.50
// @description   Twitch emoji blocking in Chat with a management interface and context menu .
// @author        Gullampis810
// @license       MIT
// @match         https://www.twitch.tv/*
// @match         https://kick.com/*
// @grant         GM_registerMenuCommand
// @grant         GM_unregisterMenuCommand
// @grant         GM_setValue
// @grant         GM_getValue
// @grant        GM_addStyle
// @match         https://example.com/*
// @match         https://blank.org/*
// @icon          https://raw.githubusercontent.com/sopernik566/icons/refs/heads/main/7BTVEmotesPanel256.ico
// @namespace     http://tampermonkey.net/
// @downloadURL   https://update.greasyfork.org/scripts/520235/Control%20Emotes%20Panel%20-%20iOS%20.user.js
// @updateURL     https://update.greasyfork.org/scripts/520235/Control%20Emotes%20Panel%20-%20iOS%20.meta.js
// ==/UserScript==



(function () {
    'use strict';

    // === объект для хранения текущих стилей кнопки DeleteButton в случае пересоздания и сброса стиля //
    let currentDeleteButtonStyles = {
        background: 'rgb(168, 77, 77)', // Начальный цвет из hoverStyle
        color: '#fff',
        hoverBackground: 'linear-gradient(135deg, #f75557 0%, #480a0c 56%, #4e1314 98%, #ff4d4d 100%)'
    };

    let blockedEmotes = [];
    let blockedChannels = [];

        // глобальное определение для поисковой строки
    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    // Функция для безопасного получения и парсинга данных
    function loadData(key, defaultValue) {
        const rawData = GM_getValue(key, defaultValue);
        try {
            return typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
        } catch (e) {
            console.error(`Ошибка при парсинге ${key}:`, e);
            return defaultValue; // Возвращаем значение по умолчанию в случае ошибки
        }
    }

    // Загружаем данные при старте
    blockedEmotes = loadData("blockedEmotes", []);
    blockedChannels = loadData("blockedChannels", []);
    console.log("[DEBUG] Загружены blockedEmotes:", blockedEmotes);
    console.log("[DEBUG] Загружены blockedChannels:", blockedChannels);

    let isPanelOpen = GM_getValue('isPanelOpen', false);



//=== Функция для перемещения панели ===//
function makePanelDraggable(panel) {
    let offsetX = 0, offsetY = 0, isDragging = false;

    // Создаем заголовок, за который можно перетаскивать
    const dragHandle = document.createElement('div');
    dragHandle.style.width = '100%';
    dragHandle.style.height = '656px';
    dragHandle.style.background = 'rgba(0, 0, 0, 0.0)';
    dragHandle.style.cursor = 'grab';
    dragHandle.style.position = 'absolute';
    dragHandle.style.top = '0';
    dragHandle.style.left = '0';
    dragHandle.style.zIndex = '-1';
    dragHandle.style.borderRadius = '8px 8px 0 0';
    panel.appendChild(dragHandle);

    // Начало перемещения
    dragHandle.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - panel.getBoundingClientRect().left;
        offsetY = e.clientY - panel.getBoundingClientRect().top;
        dragHandle.style.cursor = 'grabbing';
    });

    // Перемещение панели
    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        panel.style.left = `${e.clientX - offsetX}px`;
        panel.style.top = `${e.clientY - offsetY}px`;
    });

    // Остановка перемещения
    document.addEventListener('mouseup', () => {
        isDragging = false;
        dragHandle.style.cursor = 'grab';
    });
}

//===================================== Панель управления =======================================//
    const controlPanel = document.createElement('div');
    controlPanel.style.position = 'fixed'; // Фиксируем панель на экране
    controlPanel.style.bottom = '124px'; // Располагаем панель на 124px от нижней границы экрана
    controlPanel.style.right = '380px'; // Располагаем панель на 310px от правой границы экрана
    controlPanel.style.width = '690px'; // Ширина панели
    controlPanel.style.height = '656px'; // Высота панели
    controlPanel.style.backgroundColor = '#5c5065'; // Цвет фона панели
    controlPanel.style.background = '-webkit-linear-gradient(270deg, hsla(50, 76%, 56%, 1) 0%, hsla(32, 83%, 49%, 1) 25%, hsla(0, 37%, 37%, 1) 59%, hsla(276, 47%,         24%, 1) 79%, hsla(261, 11%, 53%, 1) 100%)'; // Применяем градиентный фон

    controlPanel.style.border = '1px solid #ccc'; // Цвет и стиль границы панели
    controlPanel.style.borderRadius = '8px'; // Скругляем углы панели
    controlPanel.style.padding = '10px'; // Отступы внутри панели
    controlPanel.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)'; // Добавляем тень панели
    controlPanel.style.zIndex = 10000; // Устанавливаем высокий z-index, чтобы панель была поверх других элементов
    controlPanel.style.fontFamily = 'Arial, sans-serif'; // Шрифт текста на панели
    controlPanel.style.transition = 'height 0.3s ease'; // Плавное изменение высоты при изменении
    controlPanel.style.overflow = 'hidden'; // Скрытие содержимого, если оно выходит за пределы панели


        // Метка версии внизу панели
const versionLabel = document.createElement('div');
versionLabel.innerText = 'v.2.6.50';
versionLabel.style.position = 'absolute';
versionLabel.style.top = '4px';
versionLabel.style.right = '640px';
versionLabel.style.color = 'rgb(62, 33, 85)';
versionLabel.style.fontSize = '12px';
versionLabel.style.fontFamily = 'Arial, sans-serif';
versionLabel.style.fontWeight = 'bold';
controlPanel.appendChild(versionLabel);


// Добавляем панель в DOM и активируем перетаскивание
document.body.appendChild(controlPanel);
makePanelDraggable(controlPanel);



//---------------Текст с  Названием листа список list of BlockedEmotes ------------------------//
const title = document.createElement('h4');
title.innerText = 'list of BlockedEmotes';
title.style.margin = '-5px 0px 10px'; // Обновленный стиль margin
title.style.color = ' #2a1e38'; // Обновленный цвет
title.style.position = 'relative'; // Устанавливаем позицию относительно
title.style.bottom = '55px'; // Сдвиг по вертикали
controlPanel.appendChild(title);



//--------------- Список заблокированных каналов ------------------//
const list = document.createElement('ul');
list.id = 'blockedList';
list.style.position = 'relative';
list.style.bottom = '34px';
list.style.border = '1px solid #ffffff'; // Белая граница
list.style.borderRadius = '0px 0px 8px 8px'; // Скругление углов
list.style.boxShadow = ' rgb(0 0 0 / 67%) -18px 69px 40px 0 inset '; // Вставка тени в контейнер
list.style.listStyle = 'none'; // Убираем стандартные маркеры списка
list.style.padding = '0'; // Убираем отступы
list.style.margin = '-14px 0px 10px'; // Отступ снизу
list.style.maxHeight = '570px'; // Устанавливаем максимальную высоту
list.style.height = '410px'; // Высота списка
list.style.overflowY = 'auto'; // Включаем вертикальную прокрутку


//==================================== ГРАДИЕНТ ФОН СПИСОК =================================================//
// Добавляем линейный градиент фона с кроссбраузерностью
list.style.background = 'linear-gradient(45deg, hsla(292, 44%, 16%, 1) 0%, hsla(173, 29%, 48%, 1) 100%)';
list.style.background = '-moz-linear-gradient(45deg, hsla(292, 44%, 16%, 1) 0%, hsla(173, 29%, 48%, 1) 100%)'; // Для Firefox
list.style.background = '-webkit-linear-gradient(45deg, hsla(292, 44%, 16%, 1) 0%, hsla(173, 29%, 48%, 1) 100%)'; // Для Safari и Chrome
list.style.filter = 'progid: DXImageTransform.Microsoft.gradient(startColorstr="#36173b", endColorstr="#589F97", GradientType=1)'; // Для старых версий IE
list.style.color = '#fff'; // Белый цвет текста

//==========  кастомный scroll bar для списка =============//
const style = document.createElement('style');
style.innerHTML = `
#blockedList::-webkit-scrollbar {
  width: 25px; /* Ширина скроллбара */
}

#blockedList::-webkit-scrollbar-thumb {
  background-color: #C1A5EF; /* Цвет бегунка */
  border-radius: 8px; /* Скругление бегунка */
  border: 3px solid #4F3E6A; /* Внутренний отступ (цвет трека) */
  height: 80px; /* Высота бегунка */
}

#blockedList::-webkit-scrollbar-thumb:hover {
  background-color: #C6AEFF; /* Цвет бегунка при наведении */
}

#blockedList::-webkit-scrollbar-thumb:active {
  background-color: #B097C9; /* Цвет бегунка при активном состоянии */
}

#blockedList::-webkit-scrollbar-track {
  background: #455565; /* Цвет трека */
  border-radius: 0px 0px 8px 0px; /* Скругление только нижнего правого угла */
}

#blockedList::-webkit-scrollbar-track:hover {
  background-color: #455565; /* Цвет трека при наведении */
}

#blockedList::-webkit-scrollbar-track:active {
  background-color: #455565; /* Цвет трека при активном состоянии */
}

`;
document.head.appendChild(style);

// hover blocked-item элемент списка //
const hoverStyle = document.createElement('style');
hoverStyle.innerHTML = `
    .blocked-item {
        transition: background-color 0.3s ease, color 0.3s ease;
    }
    .blocked-item:hover {
        background-color: rgba(167, 54, 54, 0.52);
        color: #42d13a;
    }
    .blocked-item:hover span {
        color: #42d13a;
    }
    .new-item {
        background-color:#28a828;
        transition: background-color 0.3s ease;
    }
    .new-item:hover {
        background-color: #3a2252;
        color: #af7fcf;
    }
    .new-item:hover span {
        color: #af7fcf;
    }
    #sortContainer button {
        background: none;
        border: none;
        color: inherit;
        font-family: inherit;
        font-size: inherit;
        padding: 0 10px;
        transition: color 0.3s ease;
    }
    #sortContainer button:hover {
        color: #9ae048;
    }
`;
document.head.appendChild(hoverStyle);



const highlightStyle = document.createElement('style');
highlightStyle.innerHTML = `
    .blocked-item .highlight {
        background-color: #FFEB3B  !important; /* Красный фон для подсветки */
        color:rgb(0, 0, 0) !important; /* Белый текст для контраста */
        padding: 0 2px !important;
        border-radius: 2px !important;
        transition: background-color 0.5s ease !important;
    }
    .blocked-item.highlight-item {
        background-color: rgba(163, 161, 18, 0.83) !important; /* Полупрозрачная красная подсветка для всего элемента */
        transition: background-color 0.5s ease !important;
    }
     .last-item-highlight {
          background-color: #279479; /* Полупрозрачный золотой фон */
          transition: background-color 0.5s ease; /* Плавное исчезновение */
}
`;
document.head.appendChild(highlightStyle);

document.head.appendChild(style);

const buttonColor = ' #907cad'; // Общий цвет для кнопок
const buttonShadow = '0 4px 8px rgba(0, 0, 0, 0.6)'; // Тень для кнопок (60% прозрачности)



// Функция для обновления списка заблокированных каналов

// Переменные для хранения ID заблокированных элементов
let blockedEmoteIDs = new Set();
let blockedChannelIDs = new Set();
let newlyAddedIds = new Set();

function updateBlockedList() {
    list.innerHTML = '';

    // Очистка и обновление Set для быстрого поиска ID
    blockedEmoteIDs.clear();
    blockedChannelIDs.clear();

    function createListItem(channel, isNew = false) {
        const item = document.createElement('li');
        item.className = 'blocked-item';
        item.dataset.id = channel.id;

        if (isNew) {
            item.classList.add('new-item');
            setTimeout(() => {
                item.classList.remove('new-item');
            }, 1800000);
        }

        item.style.display = 'flex';
        item.style.flexDirection = 'column';
        item.style.padding = '5px';
        item.style.borderBottom = '1px solid #eee';

        const topRow = document.createElement('div');
        topRow.style.display = 'flex';
        topRow.style.justifyContent = 'space-between';
        topRow.style.alignItems = 'center';

        const channelName = document.createElement('span');
        if (channel.platform === 'TwitchChannel') {
            channelName.innerText = `${channel.platform} > name emote: ${channel.emoteName}`;
        } else {
            channelName.innerText = `${channel.platform} > ${channel.emoteName}`;
        }
        channelName.classList.add('list-item-text');
        channelName.style.flex = '1';
        channelName.style.fontSize = '14px';
        channelName.style.fontWeight = 'bold';
        channelName.style.whiteSpace = 'nowrap';
        channelName.style.overflow = 'hidden';
        channelName.style.textOverflow = 'ellipsis';
        topRow.appendChild(channelName);

        const dateInfo = document.createElement('span');
        const date = new Date(channel.date);
        dateInfo.innerText = isNaN(date.getTime())
            ? 'Unknown Date'
            : date.toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        dateInfo.classList.add('list-item-date');
        dateInfo.style.marginRight = '30px';
        dateInfo.style.fontSize = '14px';
        topRow.appendChild(dateInfo);

        const removeButton = document.createElement('button');
        removeButton.innerText = 'Delete';
        removeButton.classList.add('delete-button');
        console.log("[DEBUG] Создана кнопка Delete для элемента:", channel.id);

        // Используем сохранённые стили из currentDeleteButtonStyles
        removeButton.style.background = currentDeleteButtonStyles.background;
        removeButton.style.color = currentDeleteButtonStyles.color;
        removeButton.style.height = '35px';
        removeButton.style.width = '75px';
        removeButton.style.fontWeight = 'bold';
        removeButton.style.fontSize = '16px';
        removeButton.style.border = 'none';
        removeButton.style.borderRadius = '4px';
        removeButton.style.cursor = 'pointer';
        removeButton.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.6)';
        removeButton.style.display = 'flex';
        removeButton.style.alignItems = 'center';
        removeButton.style.justifyContent = 'center';
        removeButton.style.transition = 'background 0.3s ease';
        removeButton.style.opacity = '1';
        removeButton.style.visibility = 'visible';

        // Добавляем обработчики наведения
        removeButton.onmouseover = () => {
            removeButton.style.background = currentDeleteButtonStyles.hoverBackground;
        };
        removeButton.onmouseout = () => {
            removeButton.style.background = currentDeleteButtonStyles.background;
        };

        removeButton.onclick = function () {
            if (channel.platform === 'TwitchChannel') {
                blockedChannels = blockedChannels.filter(c => c.id !== channel.id);
                blockedChannelIDs.delete(channel.id);
                GM_setValue("blockedChannels", JSON.stringify(blockedChannels, null, 2));
            } else {
                blockedEmotes = blockedEmotes.filter(c => c.id !== channel.id);
                blockedEmoteIDs.delete(channel.id);
                GM_setValue("blockedEmotes", JSON.stringify(blockedEmotes, null, 2));
            }

            newlyAddedIds.delete(channel.id);
            updateBlockedList();
            updateCounter();
            showEmoteForChannel(channel);
        };

        topRow.appendChild(removeButton);
        item.appendChild(topRow);

        const channelLink = document.createElement('span');
        channelLink.innerText = `(prefix: ${channel.name})`;
        channelLink.classList.add('list-item-link');
        channelLink.style.fontSize = '14px';
        channelLink.style.wordBreak = 'break-word';
        channelLink.style.marginTop = '1px';
        item.appendChild(channelLink);

        return item;
    }

    // Заполняем списки и обновляем Set
    blockedChannels.forEach(channel => {
        blockedChannelIDs.add(channel.id);
        const isNew = newlyAddedIds.has(channel.id) && Array.from(newlyAddedIds).pop() === channel.id;
        list.appendChild(createListItem(channel, isNew));
    });

    blockedEmotes.forEach(channel => {
        blockedEmoteIDs.add(channel.id);
        const isNew = newlyAddedIds.has(channel.id) && Array.from(newlyAddedIds).pop() === channel.id;
        list.appendChild(createListItem(channel, isNew));
    });

    // Прокручиваем к последнему добавленному элементу внутри контейнера list
    if (newlyAddedIds.size > 0) {
        const lastAddedId = Array.from(newlyAddedIds).pop();
        const newItem = list.querySelector(`[data-id="${lastAddedId}"]`);
        if (newItem) {
            // Вычисляем позицию нового элемента относительно контейнера list
            const itemOffsetTop = newItem.offsetTop; // Позиция элемента относительно начала списка
            const listHeight = list.clientHeight; // Видимая высота контейнера list
            const itemHeight = newItem.clientHeight; // Высота самого элемента

            // Вычисляем, куда нужно прокрутить, чтобы элемент оказался вверху видимой области
            const scrollPosition = itemOffsetTop - (listHeight / 2) + (itemHeight / 2);

            // Плавно прокручиваем list к нужной позиции
            list.scrollTo({
                top: scrollPosition,
                behavior: 'smooth'
            });
        }
    }

    // Очищаем список новых ID после отображения
    newlyAddedIds.clear();
}

// Добавляем список в панель управления
controlPanel.appendChild(list);




// Создаём контейнер для поисковой строки
const searchContainer = document.createElement('div');
searchContainer.style.display = 'flex';
searchContainer.style.gap = '5px';
searchContainer.style.top = '500px';
searchContainer.style.position = 'relative';

// Создаём поисковую строку
const searchInput = document.createElement('input');
searchInput.type = 'text';
searchInput.placeholder = 'Search in blocked list...';
searchInput.style.background = ' #192427';
searchInput.style.width = '459px';
searchInput.style.left = '132px';
searchInput.style.color = ' #b69dcf';
searchInput.style.fontWeight = 'bold';
searchInput.style.height = '35px';
searchInput.style.padding = '5px';
searchInput.style.border = '1px solid #b69dcf';
searchInput.style.borderRadius = '4px';
searchInput.style.boxShadow = ' #4c2a5e 0px 4px 6px inset';
searchInput.style.position = 'relative';
searchInput.style.bottom = '50px';

// Создаём кнопку поиска
const searchButton = document.createElement('button');
searchButton.innerText = 'Search'; // Меняем текст на "Search"
searchButton.style.background = buttonColor;
searchButton.style.position = 'relative';
searchButton.style.bottom = '50px';
searchButton.style.color = '#fff';
searchButton.style.border = 'none';
searchButton.style.width = '72px';
 searchButton.style.left = '132px';
searchButton.style.borderRadius = '4px';
searchButton.style.padding = '5px 10px';
searchButton.style.cursor = 'pointer';
searchButton.style.fontSize = '16px';
searchButton.style.fontWeight = 'bold';
searchButton.style.boxShadow = buttonShadow;

// Добавляем ховер-эффекты для кнопки поиска
searchButton.onmouseover = function() {
    searchButton.style.background = '-webkit-linear-gradient(135deg, #443157 0%,rgb(90, 69, 122) 56%, #443157 98%, #443157 100%)';
};
searchButton.onmouseout = function() {
    searchButton.style.background = buttonColor;
};

// Обработчик кнопки поиска
searchButton.onclick = () => {
    const searchTerm = searchInput.value.trim();
    filterBlockedList(searchTerm); // Запускаем фильтрацию
};

function filterBlockedList(searchTerm) {
    const lowerSearchTerm = searchTerm.toLowerCase().trim();
    console.log("[DEBUG] Поисковый запрос (lowerSearchTerm):", lowerSearchTerm);

    let filteredList = [];

    // Фильтрация списка
    if (!lowerSearchTerm) {
        filteredList = [...blockedChannels, ...blockedEmotes];
        console.log("[DEBUG] Поиск пустой, отображаем все элементы:", filteredList);
    } else {
        filteredList = [...blockedChannels, ...blockedEmotes].filter(item => {
            const emoteName = item.emoteName || '';
            const platform = item.platform || '';
            const name = item.name || '';
            const matches =
                emoteName.toLowerCase().includes(lowerSearchTerm) ||
                platform.toLowerCase().includes(lowerSearchTerm) ||
                name.toLowerCase().includes(lowerSearchTerm);
            console.log(`[DEBUG] Проверяем элемент: ${JSON.stringify(item)}, совпадение: ${matches}`);
            return matches;
        });
        console.log("[DEBUG] Результаты фильтрации:", filteredList);
    }

    // Сохраняем текущую позицию скролла
    const currentScrollPosition = list.scrollTop;
    console.log("[DEBUG] Текущая позиция скролла перед обновлением:", currentScrollPosition);

    // Получаем текущие элементы в DOM
    const currentItems = list.querySelectorAll('.blocked-item');
    const existingIds = new Set([...currentItems].map(item => item.dataset.id));

    // Удаляем элементы, которые не прошли фильтрацию
    currentItems.forEach(item => {
        const itemId = item.dataset.id;
        if (!filteredList.some(f => f.id === itemId)) {
            item.remove();
        }
    });

    // Добавляем или обновляем элементы
    filteredList.forEach(channel => {
        const itemId = channel.id;
        let item = list.querySelector(`[data-id="${itemId}"]`);

        if (!item) {
            // Если элемента нет, создаём новый
            item = createListItem(channel);
            list.appendChild(item);
        }

        // Применяем подсветку, если есть поисковый запрос
        if (lowerSearchTerm) {
            const spans = item.querySelectorAll('span');
            spans.forEach(span => {
                const originalText = span.textContent || '';
                if (originalText.toLowerCase().includes(lowerSearchTerm)) {
                    const regex = new RegExp(`(${lowerSearchTerm})`, 'gi');
                    const highlightedText = originalText.replace(regex, '<span class="highlight">$1</span>');
                    span.innerHTML = highlightedText;
                }
            });
        }
    });

    // Прокрутка к первому элементу
    if (filteredList.length > 0) {
        const firstItem = list.querySelector('.blocked-item');
        if (firstItem) {
            console.log("[DEBUG] Найден первый элемент для прокрутки:", firstItem);
            const firstItemOffset = firstItem.offsetTop;
            list.scrollTop = firstItemOffset - (list.clientHeight / 2) + (firstItem.clientHeight / 2);
            console.log("[DEBUG] Установлен scrollTop:", list.scrollTop);
        } else {
            console.log("[DEBUG] Первый элемент не найден в DOM!");
        }
    } else {
        // Если список пуст, восстанавливаем скролл
        console.log("[DEBUG] Список пуст, восстанавливаем скролл на:", currentScrollPosition);
        list.scrollTop = currentScrollPosition;
    }

    updateCounter();
}

// Добавляем элементы в контейнер поиска
searchContainer.appendChild(searchInput);
searchContainer.appendChild(searchButton); //   searchButton


// Добавляем контейнер поиска в панель управления
controlPanel.appendChild(searchContainer);

// Далее продолжаем с добавлением списка
controlPanel.appendChild(list);


//================= Функционал для добавления нового канала в список заблокированных ==================//
const inputContainer = document.createElement('div');
inputContainer.style.display = 'flex';
inputContainer.style.gap = '5px';

const input = document.createElement('input');
input.type = 'text';
input.placeholder = 'type to add channel ';
input.style.position = 'relative';
input.style.background = ' #192427';
input.style.color = ' #b69dcf';
input.style.flex = '1';
input.style.fontWeight = 'bold'; // Жирный текст
input.style.height = '35px'; // Отступ между кнопкой и поисковой строкой
input.style.padding = '5px';
input.style.border = '1px solid #b69dcf';
input.style.borderRadius = '4px';
input.style.top = '15px'; // Отступ между кнопкой и поисковой строкой
// Добавление тени с фиолетовым цветом (35% прозрачности) внутрь
input.style.boxShadow = ' #4c2a5e 0px 4px 6px inset'; // Тень фиолетового цвета внутри

//================== Add it Button =====================//
// ==================== Кнопка добавления ===================== //
const addButton = document.createElement('button');
addButton.innerText = 'Add it';
addButton.style.background = buttonColor;
addButton.style.top = '15px'; // Отступ между кнопкой и поисковой строкой
addButton.style.position = 'relative';
addButton.style.color = '#fff';
addButton.style.border = 'none';
addButton.style.width = '72px';
addButton.style.borderRadius = '4px';
addButton.style.padding = '5px 10px';
addButton.style.cursor = 'pointer';
addButton.style.boxShadow = buttonShadow; // Тень для кнопки "Add it"

// Увеличиваем размер текста и делаем его жирным
addButton.style.fontSize = '16px'; // Увеличиваем размер текста
addButton.style.fontWeight = 'bold'; // Жирный текст

// Генерация уникального ID
function generateID() {
    return `emote_${Date.now()}`; // Генерация ID на основе времени
}

addButton.onclick = (event) => {
    event.preventDefault();
    const channel = input.value.trim();
    const platform = platformSelect.value;

    if (channel) {
        let emoteName = channel;
        let emoteUrl = channel;
        const emoteId = generateRandomID();

        // Проверка на дублирование
        const isDuplicate = platform === 'TwitchChannel'
            ? blockedChannels.some(e => e.name === channel && e.platform === platform)
            : blockedEmotes.some(e => e.emoteUrl === channel && e.platform === platform);

        if (isDuplicate) {
            console.log(`%c[DEBUG] %cChannel/Emote already blocked: ${channel}`,
                'color: rgb(255, 165, 0); font-weight: bold;',
                'color: rgb(255, 165, 0);');
            return;
        }

        if (platform === '7tv' || platform === 'bttTV' || platform === 'ffz') {
            const img = document.querySelector(`img[src="${channel}"]`);
            if (img) {
                emoteName = img.alt || channel.split('/').pop();
                emoteUrl = img.src || channel;
            }

            const newEmote = {
                id: emoteId,
                name: emoteUrl,
                platform: platform,
                emoteName: emoteName,
                emoteUrl: emoteUrl,
                date: new Date().toISOString()
            };

            blockedEmotes.push(newEmote);
            blockedEmoteIDs.add(emoteId);
            newlyAddedIds.add(emoteId);
            GM_setValue("blockedEmotes", JSON.stringify(blockedEmotes, null, 2));
            console.log(`%c[DEBUG] %cAdded to blockedEmotes:`,
                'color: rgb(0, 255, 0); font-weight: bold;',
                'color: rgb(0, 255, 0);', newEmote);
        } else if (platform === 'TwitchChannel') {
            const prefix = channel.split(/[^a-zA-Z0-9]/)[0];
            emoteUrl = prefix;

            const newChannel = {
                id: emoteId,
                name: emoteUrl,
                platform: platform,
                emoteName: emoteName,
                emoteUrl: emoteUrl,
                date: new Date().toISOString()
            };

            blockedChannels.push(newChannel);
            blockedChannelIDs.add(emoteId);
            newlyAddedIds.add(emoteId);
            GM_setValue("blockedChannels", JSON.stringify(blockedChannels, null, 2));
            console.log(`%c[DEBUG] %cAdded to blockedChannels:`,
                'color: rgb(0, 255, 0); font-weight: bold;',
                'color: rgb(0, 255, 0);', newChannel);
        }

        const chatContainer = document.querySelector('.chat-scrollable-area__message-container');
        if (chatContainer) {
            toggleEmotesInNode(chatContainer);
        }

        updateBlockedList();
        updateCounter();
        input.value = '';
    }
};



// ==================== Создание выпадающего списка платформ ===================== //
const platformSelect = document.createElement('select');
platformSelect.style.top = '15px'; // Отступ между кнопкой и поисковой строкой
platformSelect.style.position = 'relative';
platformSelect.style.height = '35px'; // Высота выпадающего списка
platformSelect.style.border = '1px solid #c1a5ef';
platformSelect.style.background = '#192427';
platformSelect.style.borderRadius = '4px';
platformSelect.style.padding = '5px';
platformSelect.style.fontWeight = 'bold'; // Жирный текст
platformSelect.style.color = ' #b69dcf';

const platforms = ['TwitchChannel', '7tv', 'bttTV', 'ffz'];
platforms.forEach(platform => {
    const option = document.createElement('option');
    option.value = platform;
    option.innerText = platform;
    platformSelect.appendChild(option);
});

// ==================== Подсказки для выбора платформы ===================== //
platformSelect.addEventListener('change', () => {
    const placeholderText = {
        'TwitchChannel': 'example prefix abcd123',
        '7tv': 'link example: https://cdn.7tv.app/emote/00000000000000000000000000/2x.webp',
        'bttTV': 'link example: https://cdn.betterttv.net/emote/000000000000000000000000/2x.webp',
        'ffz': 'link example: https://cdn.frankerfacez.com/emote/0000/2'
    };
    input.placeholder = placeholderText[platformSelect.value];
});

// ==================== Добавление выпадающего списка в контейнер ===================== //
inputContainer.appendChild(platformSelect);



//----------------Единый контейнер для кнопок -------------------------//
const buttonContainer = document.createElement('div');
buttonContainer.style.display = 'flex'; // Используем flexbox для расположения кнопок в строку
buttonContainer.style.alignItems = 'baseline'; // Используем flexbox для расположения кнопок в строку
buttonContainer.style.alignContent = 'stretch';



buttonContainer.style.gap = '13px'; // Задаем промежуток между кнопками
buttonContainer.style.bottom = '113px'; // Отступ сверху для контейнера кнопок
buttonContainer.style.position = 'relative'; // Позиционирование относительно
buttonContainer.style.fontWeight = 'bold'; // Жирный текст для контейнера кнопок
buttonContainer.style.fontSize = '16px'; // Размер шрифта для кнопок
buttonContainer.style.width = '668px'; // Ширина кнопок (увеличена для эффекта растяжения




//-------------- Кнопка "Delete all" ------------------------//
const clearAllButton = document.createElement('button');
clearAllButton.innerText = 'Delete all'; // Текст на кнопке
clearAllButton.style.background = buttonColor; // Цвет фона кнопки
clearAllButton.style.color = '#fff'; // Цвет текста кнопки
clearAllButton.style.border = 'none'; // Убираем бордер у кнопки
clearAllButton.style.borderRadius = '4px'; // Скругленные углы кнопки
clearAllButton.style.padding = '5px 10px'; // Отступы внутри кнопки
clearAllButton.style.cursor = 'pointer'; // Курсор в виде руки при наведении
clearAllButton.style.boxShadow = buttonShadow; // Тень для кнопки "Delete all"

buttonContainer.appendChild(clearAllButton); // Добавляем кнопку в контейнер

// Обработчик события для кнопки "Delete all"
clearAllButton.onclick = () => {
    blockedEmotes = [];
    blockedChannels = [];
    GM_setValue("blockedEmotes", JSON.stringify(blockedEmotes, null, 2));
    GM_setValue("blockedChannels", JSON.stringify(blockedChannels, null, 2));
    console.log("[DEBUG] Очищены blockedEmotes и blockedChannels");
    updateBlockedList();
    updateCounter();
};


//----------------- export Button --------------------//
const exportButton = document.createElement('button');
exportButton.innerText = 'Export';
exportButton.style.background = buttonColor;
exportButton.style.color = '#fff';
exportButton.style.border = 'none';
exportButton.style.borderRadius = '4px';
exportButton.style.padding = '5px 10px';
exportButton.style.cursor = 'pointer';
exportButton.style.boxShadow = buttonShadow; // Тень для кнопки "Export"
buttonContainer.appendChild(exportButton);
exportButton.onclick = () => {
    const combinedData = {
        blockedEmotes: blockedEmotes,
        blockedChannels: blockedChannels
    };
    const blob = new Blob([JSON.stringify(combinedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'blocked_data.json';
    link.click();
    URL.revokeObjectURL(url);
    console.log("[DEBUG] Экспортированы данные:", combinedData);
};


//================= importButton ========================//
// Перемещаем создание fileInput в глобальную область, чтобы избежать дублирования
let fileInput = null;

// Функция для создания кнопки "Import"
function createImportButton() {
    const button = document.createElement('button');
    button.innerText = 'Import';
    button.style.background = buttonColor;
    button.style.color = '#fff';
    button.style.border = 'none';
    button.style.borderRadius = '4px';
    button.style.padding = '5px 10px';
    button.style.cursor = 'pointer';
    button.style.boxShadow = buttonShadow;
    return button;
}

// Функция для создания или переиспользования элемента input типа "file"
function createFileInput() {
    if (!fileInput) {
        fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'application/json';
        fileInput.style.display = 'none';
        fileInput.onchange = handleFileChange;
        document.body.appendChild(fileInput);
    }
    return fileInput;
}

// Инициализация кнопки "Import"
const importButton = createImportButton();
buttonContainer.appendChild(importButton);

importButton.onclick = () => {
    const input = createFileInput();
    input.value = ''; // Сбрасываем значение для повторного выбора файла
    input.click();
};

// Обработка изменений файла
function handleFileChange(event) {
    const file = event.target.files[0];
    if (!file) {
        console.log("[DEBUG] Файл не выбран");
        return;
    }
    const reader = new FileReader();
    reader.onload = handleFileLoad;
    reader.onerror = () => {
        console.error("[DEBUG] Ошибка чтения файла");
        alert('Ошибка при чтении файла!');
    };
    reader.readAsText(file);
}

// Обработка загрузки файла
function handleFileLoad(event) {
    try {
        const importedData = JSON.parse(event.target.result);

        if (!importedData || (!importedData.blockedEmotes && !importedData.blockedChannels)) {
            throw new Error('Неверный формат файла! Ожидается объект с blockedEmotes и/или blockedChannels');
        }

        processImportedData(importedData);
        updateInterface();
        console.log("[DEBUG] Импорт успешно завершен");
    } catch (err) {
        console.error('[DEBUG] Ошибка при парсинге файла:', err);
        alert(`Ошибка импорта: ${err.message}`);
    }
}

// Обработка импортированных данных
function processImportedData(importedData) {
    blockedEmotes = [];
    blockedChannels = [];
    blockedEmoteIDs.clear();
    blockedChannelIDs.clear();
    newlyAddedIds.clear();

    if (Array.isArray(importedData.blockedEmotes)) {
        importedData.blockedEmotes.forEach(emote => {
            const newId = emote.id && !blockedEmoteIDs.has(emote.id) && !blockedChannelIDs.has(emote.id)
                ? emote.id
                : generateRandomID();

            const newEmote = {
                id: newId,
                name: emote.name || emote.emoteUrl || '',
                platform: emote.platform || 'unknown',
                emoteName: emote.emoteName || getDefaultEmoteName(emote),
                emoteUrl: emote.emoteUrl || emote.name || '',
                date: emote.date || new Date().toISOString()
            };

            blockedEmotes.push(newEmote);
            blockedEmoteIDs.add(newId);
            newlyAddedIds.add(newId);
        });
    }

    if (Array.isArray(importedData.blockedChannels)) {
        importedData.blockedChannels.forEach(channel => {
            const newId = channel.id && !blockedChannelIDs.has(channel.id) && !blockedEmoteIDs.has(channel.id)
                ? channel.id
                : generateRandomID();

            const newChannel = {
                id: newId,
                name: channel.name || channel.emoteUrl || '',
                platform: channel.platform || 'TwitchChannel',
                emoteName: channel.emoteName || getDefaultEmoteName(channel),
                emoteUrl: channel.emoteUrl || channel.name || '',
                date: channel.date || new Date().toISOString()
            };

            blockedChannels.push(newChannel);
            blockedChannelIDs.add(newId);
            newlyAddedIds.add(newId);
        });
    }

    GM_setValue("blockedEmotes", JSON.stringify(blockedEmotes, null, 2));
    GM_setValue("blockedChannels", JSON.stringify(blockedChannels, null, 2));
    console.log("[DEBUG] Импортированы blockedEmotes:", blockedEmotes);
    console.log("[DEBUG] Импортированы blockedChannels:", blockedChannels);
}

// Функция обновления интерфейса
function updateInterface() {
    blockedEmotes = loadData("blockedEmotes", []);
    blockedChannels = loadData("blockedChannels", []);

    blockedEmoteIDs.clear();
    blockedChannelIDs.clear();
    blockedEmotes.forEach(emote => blockedEmoteIDs.add(emote.id));
    blockedChannels.forEach(channel => blockedChannelIDs.add(channel.id));

    updateBlockedList();
    updateCounter();

    const chatContainer = document.querySelector('.chat-scrollable-area__message-container');
    if (chatContainer) {
        toggleEmotesInNode(chatContainer); // Используем toggleEmotesInNode вместо hideEmotesForChannel
    } else {
        console.log(
            "%c[DEBUG]%c Контейнер чата не найден при обновлении интерфейса",
            'color:rgb(218, 93, 9); font-weight: bold;',
            'color: rgb(218, 93, 9);'
        );
    }
}

// Функция скрытия эмодзи в чате
function hideEmotesForChannel(chatContainer) {
    console.log("[DEBUG] Запуск hideEmotesForChannel");
    const emotes = chatContainer.querySelectorAll('.chat-line__message img, .chat-line__message .emote, .chat-line__message .bttv-emote, .chat-line__message .seventv-emote');

    emotes.forEach(emote => {
        const emoteUrl = emote.src || '';
        const emoteAlt = emote.getAttribute('alt') || '';
        let blockedEntry = null;

        // Проверяем, заблокирован ли эмодзи
        if (emoteUrl.includes('7tv.app')) {
            blockedEntry = blockedEmotes.find(e => e.platform === '7tv' && e.emoteUrl === emoteUrl);
        } else if (emoteUrl.includes('betterttv.net')) {
            blockedEntry = blockedEmotes.find(e => e.platform === 'bttTV' && e.emoteUrl === emoteUrl);
        } else if (emoteAlt) {
            blockedEntry = blockedChannels.find(e => e.platform === 'TwitchChannel' && emoteAlt.startsWith(e.name));
        }

        // Устанавливаем data-emote-id, если эмодзи заблокирован
        if (blockedEntry && !emote.getAttribute('data-emote-id')) {
            emote.setAttribute('data-emote-id', blockedEntry.id);
        }

        const emoteId = emote.getAttribute('data-emote-id');
        const isBlocked = emoteId && (blockedChannels.some(e => e.id === emoteId) || blockedEmotes.some(e => e.id === emoteId));

        // Скрываем или показываем эмодзи
        emote.style.display = isBlocked ? 'none' : '';
        console.log(`[DEBUG] Эмодзи ${emoteAlt || emoteUrl} (ID: ${emoteId || 'не установлен'}) ${isBlocked ? 'скрыт' : 'показан'}`);
    });
}

// Функция получения имени эмотикона по умолчанию
function getDefaultEmoteName(channel) {
    if (channel.platform === '7tv' || channel.platform === 'bttTV') {
        return channel.name.split('/').slice(-2, -1)[0] || 'No Name';
    } else if (channel.platform === 'ffz') {
        return channel.emoteName || channel.name.split('/').pop() || 'No Name';
    } else if (channel.platform === 'TwitchChannel') {
        return channel.name.split(/[^a-zA-Z0-9]/)[0] || 'No Name';
    } else {
        return 'No Name';
    }
}





// Добавляем кнопку "Unblock All Emotes" в контейнер кнопок
const unblockAllButton = document.createElement('button');
unblockAllButton.innerText = 'Unblock All Emotes';
unblockAllButton.style.background = buttonColor;
unblockAllButton.style.color = '#fff';
unblockAllButton.style.border = 'none';
unblockAllButton.style.borderRadius = '4px';
unblockAllButton.style.padding = '5px 10px';
unblockAllButton.style.cursor = 'pointer';
unblockAllButton.style.boxShadow = buttonShadow; // Тень для кнопки "Unblock All Emotes"
buttonContainer.appendChild(unblockAllButton);

// Добавляем кнопку "Back To Block All Emotes" в контейнер кнопок
const blockAllButton = document.createElement('button');
blockAllButton.innerText = 'Back To Block All Emotes';
blockAllButton.style.background = buttonColor;
blockAllButton.style.color = '#fff';
blockAllButton.style.border = 'none';
blockAllButton.style.borderRadius = '4px';
blockAllButton.style.padding = '5px 10px';
blockAllButton.style.cursor = 'pointer';
blockAllButton.style.boxShadow = buttonShadow; // Тень для кнопки "Back To Block All Emotes"
buttonContainer.appendChild(blockAllButton);

// Обработчик события для кнопки "Unblock All Emotes"
unblockAllButton.onclick = () => {
    const unblockedEmotes = GM_getValue('unblockedEmotes', []);
    const unblockedChannels = GM_getValue('unblockedChannels', []);
    if (blockedEmotes.length > 0 || blockedChannels.length > 0) {
        GM_setValue('unblockedEmotes', blockedEmotes);
        GM_setValue('unblockedChannels', blockedChannels);
        blockedEmotes = [];
        blockedChannels = [];
        GM_setValue('blockedEmotes', JSON.stringify(blockedEmotes, null, 2)); // Исправлено
        GM_setValue('blockedChannels', JSON.stringify(blockedChannels, null, 2)); // Исправлено
        console.log("[DEBUG] Разблокированы все: unblockedEmotes:", blockedEmotes, "unblockedChannels:", blockedChannels);
        updateBlockedList();
        updateCounter();
        showAllEmotes();
    }
};

// Функция для отображения всех смайлов в чате
function showAllEmotes() {
    const chatContainer = document.querySelector('.chat-scrollable-area__message-container');
    if (chatContainer) {
        const emotes = chatContainer.querySelectorAll('.chat-line__message img, .chat-line__message .emote, .chat-line__message .bttv-emote, .chat-line__message .seventv-emote');
        emotes.forEach(emote => {
            emote.style.display = ''; // Сбросить стиль display для отображения смайлов
        });
    }
}

// Обработчик события для кнопки "Back To Block All Emotes"
blockAllButton.onclick = () => {
    const unblockedEmotes = GM_getValue('unblockedEmotes', []);
    const unblockedChannels = GM_getValue('unblockedChannels', []);
    if (unblockedEmotes.length > 0 || unblockedChannels.length > 0) {
        blockedEmotes = unblockedEmotes;
        blockedChannels = unblockedChannels;
        GM_setValue('blockedEmotes', JSON.stringify(blockedEmotes));
        GM_setValue('blockedChannels', JSON.stringify(blockedChannels));
        GM_setValue('unblockedEmotes', []);
        GM_setValue('unblockedChannels', []);
        console.log("[DEBUG] Заблокированы все обратно: blockedEmotes:", blockedEmotes, "blockedChannels:", blockedChannels);

        // Обновляем список и счетчик
        updateBlockedList();
        updateCounter();

        // Применяем скрытие эмодзи в чате
        const chatContainer = document.querySelector('.chat-scrollable-area__message-container');
        if (chatContainer) {
            toggleEmotesInNode(chatContainer);
            console.log("[DEBUG] Применено скрытие эмодзи после восстановления блокировки");
        } else {
            console.log(
                "%c[DEBUG]%c Контейнер чата не найден при восстановлении блокировки",
                'color:rgb(218, 93, 9); font-weight: bold;',
                'color: rgb(218, 93, 9);'
            );
        }
    }
};




//======================= Счётчик ========================//
const counter = document.createElement('div');
counter.style.display = 'flex';
counter.style.flexDirection = 'row';
counter.style.justifyContent = 'center';
counter.style.width = '460px';
counter.style.backgroundColor = ' #b69dcf'; // Белый фон
counter.style.color = ' #4c2a5e'; // Цвет текста (темно-фиолетовый)
counter.style.border = '3px solid #4c2a5e'; // Граница того же цвета, что и текст
counter.style.borderRadius = '8px'; // Радиус скругления границы
counter.style.padding = '5px 0px'; // Отступы для удобства
counter.style.marginLeft = '6px'; // Отступ слева для отделения от других элементов
counter.style.fontWeight = 'bold'; // Жирное начертание текста
counter.style.fontSize = '16px'; // Устанавливаем размер шрифта для лучшей видимости
counter.style.bottom = '545px'; // Обновленное положение сверху
counter.style.left = '202px'; // Обновленное положение справа
counter.style.position = 'relative '; // Относительное позиционирование для точного расположения

controlPanel.appendChild(counter);

// Функция для обновления счётчика
function updateCounter() {
    const twitchCount = blockedChannels.length;
    const bttvCount = blockedEmotes.filter(channel => channel.platform === 'bttTV').length;
    const tv7Count = blockedEmotes.filter(channel => channel.platform === '7tv').length;
    const ffzCount = blockedEmotes.filter(channel => channel.platform === 'ffz').length;
    const totalCount = twitchCount + bttvCount + tv7Count + ffzCount;
    counter.innerText = `Twitch: ${twitchCount} | BTTV: ${bttvCount} | 7TV: ${tv7Count} | FFZ: ${ffzCount} | Total: ${totalCount}`;
}

// Добавляем элементы на страницу
inputContainer.appendChild(input);
inputContainer.appendChild(addButton);
controlPanel.appendChild(inputContainer);

// Перемещаем контейнер кнопок вниз
controlPanel.appendChild(buttonContainer);

document.body.appendChild(controlPanel);

// Вызываем функцию обновления счётчика
updateCounter();





// Загружаем сохранённое состояние переключателя из хранилища

//============= Создаем кнопку "Open Blocker Emote" ===================//
const openPanelButton = document.createElement('button');
openPanelButton.innerText = 'panel control emotes';
openPanelButton.style.fontWeight = 'bold';
openPanelButton.style.top = '22px';
openPanelButton.style.right = '1344px';
openPanelButton.style.position = 'fixed'; // Фиксированное положение
openPanelButton.style.width = '200px'; // Фиксированная ширина кнопки
openPanelButton.style.height = '41px'; // Фиксированная высота кнопки
openPanelButton.style.background = ' #5d5d5d'; // Цвет кнопки
openPanelButton.style.color = ' #171c1c';
openPanelButton.style.border = 'none'; // Без границ
openPanelButton.style.borderRadius = '20px'; // Закругленные углы
openPanelButton.style.padding = '10px';
openPanelButton.style.cursor = 'pointer';
openPanelButton.style.zIndex = 10000; // Высокий z-index
openPanelButton.style.transition = 'background 0.3s ease'; // Плавное изменение фона
openPanelButton.style.display = 'flex';
openPanelButton.style.alignItems = 'center';
openPanelButton.style.justifyContent = 'space-between'; // Чтобы текст и переключатель были по разным краям

// Создаем контейнер для переключателя (темная рамка)
const switchContainer = document.createElement('div');
switchContainer.style.width = '44px'; // Увеличиваем ширину контейнера на 6px
switchContainer.style.height = '27px'; // Увеличиваем высоту контейнера на 6px
switchContainer.style.borderRadius = '13px'; // Скругленные углы
switchContainer.style.backgroundColor = ' #171c1c';  // Темно сеая рамка для кружка
switchContainer.style.position = 'relative'; // Для абсолютного позиционирования кружка
switchContainer.style.transition = 'background 0.3s ease'; // Плавное изменение фона контейнера
openPanelButton.appendChild(switchContainer);

// Создаем фиолетовый кружок (переключатель кружок )
const switchCircle = document.createElement('div');
switchCircle.style.width = '19px'; // Увеличиваем ширину кружка на 3px
switchCircle.style.height = '19px'; // Увеличиваем высоту кружка на 3px
switchCircle.style.borderRadius = '50%'; // Кружок
switchCircle.style.backgroundColor = ' #5d5d5d'; // темно Серый  цвет кружка
switchCircle.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.8)'; // Тень для кружка
switchCircle.style.position = 'absolute'; // Абсолютное позиционирование внутри контейнера
switchCircle.style.top = '3px'; // Отступ сверху
switchCircle.style.left = '3px'; // Отступ слева
switchCircle.style.transition = 'transform 0.3s ease'; // Плавное движение
switchContainer.appendChild(switchCircle);

// Функция для обновления состояния переключателя
const updateSwitchState = () => {
    if (isPanelOpen) {
        openPanelButton.style.background = ' #5d5d5d'; // Цвет кнопки при открытой панели
        switchCircle.style.transform = 'translateX(20px)'; // Перемещаем кружок вправо
        switchContainer.style.backgroundColor = ' #464646'; // Цвет контейнера в включённом состоянии
        controlPanel.style.display = 'block'; // Показываем панель
        controlPanel.style.height = '656px'; // Устанавливаем полную высоту
    } else {
        openPanelButton.style.background = ' #5d5d5d'; // Цвет кнопки при закрытой панели
        switchCircle.style.transform = 'translateX(0)'; // Перемещаем кружок влево
        switchContainer.style.backgroundColor = ' #171c1c'; // Цвет контейнера в выключенном состоянии
        controlPanel.style.display = 'none'; // Скрываем панель
        controlPanel.style.height = '0px'; // Сворачиваем панель
    }
};

// Обработчик клика для переключения состояния панели
openPanelButton.onclick = () => {
    isPanelOpen = !isPanelOpen; // Переключаем состояние
    GM_setValue('isPanelOpen', isPanelOpen); // Сохраняем состояние
    updateSwitchState(); // Обновляем видимость и переключатель
};


// Инициализация состояния при загрузке
window.addEventListener('load', () => {
    document.body.appendChild(openPanelButton);
    updateSwitchState(); // Устанавливаем начальное состояние панели и переключателя

    const updateButtonPosition = () => {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        openPanelButton.style.top = `${windowHeight * 0.005}px`; // 5% от высоты окна
        openPanelButton.style.right = `${windowWidth * 0.2}px`; // 20% от ширины окна
    };

    updateButtonPosition();
    window.addEventListener('resize', updateButtonPosition);
});







//=============== Блокировка и Запуск скрытия эмодзи в чате ==================//

//=============== Генерация случайного ID ===============//
function generateRandomID() {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const randomLength = Math.floor(Math.random() * 67) + 1; // Случайная длина от 1 до 68
    let randomID = '';
    for (let i = 0; i < randomLength; i++) {
        randomID += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return `emote_${randomID}`;
}



// Оптимизированная версия toggleEmotesInNode
const debouncedToggleEmotes = debounce(toggleEmotesInNode, 100);

async function toggleEmotesInNode(node) {
    try {
        console.log(`%c[${new Date().toISOString()}] %c[DEBUG] %ctoggleEmotesInNode - starting`,
            'color: rgb(63, 136, 219);',
            'color: rgb(52, 163, 148); font-weight: bold;');

        const emotes = node.querySelectorAll('.chat-line__message img, .chat-line__message .emote, .chat-line__message .bttv-emote, .chat-line__message .seventv-emote');
        console.log(`[DEBUG] Найдено эмодзи для обработки: ${emotes.length}`);

        for (const emote of emotes) {
            const emoteUrl = emote.src || emote.getAttribute('srcset')?.split(' ')[0] || '';
            const emoteAlt = emote.getAttribute('alt') || '';
            let blockedEntry = null;

            if (emoteUrl.includes('7tv.app')) {
                blockedEntry = blockedEmotes.find(e => e.platform === '7tv' && e.emoteUrl === emoteUrl);
            } else if (emoteUrl.includes('betterttv.net')) {
                blockedEntry = blockedEmotes.find(e => e.platform === 'bttTV' && e.emoteUrl === emoteUrl);
            } else if (emoteUrl.includes('frankerfacez.com')) {
                blockedEntry = blockedEmotes.find(e => e.platform === 'ffz' && e.emoteUrl === emoteUrl);
            } else if (emoteAlt) {
                blockedEntry = blockedChannels.find(e => e.platform === 'TwitchChannel' && emoteAlt.startsWith(e.name));
            }

            if (blockedEntry && !emote.getAttribute('data-emote-id')) {
                emote.setAttribute('data-emote-id', blockedEntry.id);
            }

            const emoteId = emote.getAttribute('data-emote-id');
            const isBlocked = emoteId && (blockedChannels.some(e => e.id === emoteId) || blockedEmotes.some(e => e.id === emoteId));

            emote.style.display = isBlocked ? 'none' : '';
            console.log(`[DEBUG] Эмодзи ${emoteAlt || emoteUrl} (ID: ${emoteId || 'не установлен'}) ${isBlocked ? 'скрыт' : 'показан'}`);
        }

        console.log(`%c[${new Date().toISOString()}] %c[DEBUG] %ctoggleEmotesInNode - completed`,
            'color: rgb(63, 136, 219);',
            'color: rgb(52, 163, 148); font-weight: bold;');
    } catch (error) {
        console.error(`[ERROR] Ошибка в toggleEmotesInNode:`, error);
    }
}
// Используем дебаунс в наблюдателе
const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) {
                console.log(`%cНовый узел добавлен в DOM`,
                    'color:rgb(29, 202, 136) ;');
                debouncedToggleEmotes(node);
            }
        });
    });
});



function observeChatContainer() {
    const chatContainer = document.querySelector('.chat-scrollable-area__message-container');
    if (chatContainer) {
        // Успешно - зеленый цвет
           console.log(
             '%c[DEBUG]%c Контейнер чата найден, начинаем наблюдение',
             'color: #00C4B4; font-weight: bold;', // Стиль для [DEBUG]
             'color: #00C4B4;' // Стиль для остального текста
           );
        observer.disconnect(); // Останавливаем старое наблюдение
        observer.observe(chatContainer, { childList: true, subtree: true });
        toggleEmotesInNode(chatContainer); // Проверяем существующие сообщения
    } else {
        // Неуспешно  - красный цвет
            console.log(
              '%c[DEBUG]%c Контейнер чата не найден, повторная попытка через 500мс',
              'color: #FF5555; font-weight: bold;', // Стиль для [DEBUG]
              'color: #FF5555;' // Стиль для остального текста
            );
        setTimeout(observeChatContainer, 500);
    }
}

// Добавляем наблюдение за изменениями на более высоком уровне DOM
function startRootObserver() {
    const rootObserver = new MutationObserver(() => {
        const chatContainer = document.querySelector('.chat-scrollable-area__message-container');
        // Состояние контейнера чата - зеленый если найден, красный если не найден
           console.log(
             '%c[DEBUG]%c RootObserver: контейнер чата %c' + (chatContainer ? 'найден' : 'не найден'),
             'color: #1E90FF; font-weight: bold;', // Стиль для [DEBUG] (DodgerBlue)
             'color: #1E90FF;', // Стиль для "RootObserver: контейнер чата"
             `color: ${chatContainer ? '#00C4B4' : '#FF5555'}; font-weight: bold;` // Зеленый (#00C4B4) или красный (#FF5555) для статуса
           );

        if (chatContainer) {
            observeChatContainer();
        }
    });
    rootObserver.observe(document.body, { childList: true, subtree: true });
    // Запуск RootObserver - синий цвет (информационный)
         console.log(
           '%c[DEBUG]%c RootObserver запущен',
           'color: #1E90FF; font-weight: bold;', // Стиль для [DEBUG] (DodgerBlue)
           'color: #1E90FF;' // Стиль для остального текста
         );

}

// Запускаем наблюдение
startRootObserver();


let lastUrl = location.href;

function checkUrlChange() {
    const currentUrl = location.href;
    if (currentUrl !== lastUrl) {
        console.log('[DEBUG] URL изменился, перезапускаем наблюдение за чатом');
        ContextMenuManager.removeMenu(); // Удаляем контекстное меню
        lastUrl = currentUrl;
        observeChatContainer();
    }
    setTimeout(checkUrlChange, 1000);
}

checkUrlChange();




//=============== Контекстное меню ===============//
const contextMenuStyle = document.createElement('style');
contextMenuStyle.innerHTML = `
    .custom-context-menu {
        position: absolute;
        background: #4c2a5e;
        border: 1px solid #ccc;
        padding: 5px;
        z-index: 10002; /* Увеличен z-index для отображения поверх других элементов */
        cursor: pointer;
        color: #fff;
        transition: background 0.3s ease;
        user-select: none;
        min-width: 150px; /* Минимальная ширина для читаемости */
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5); /* Тень для выделения */
    }
    .custom-context-menu:hover {
        background: #5a3a75;
    }
`;
document.head.appendChild(contextMenuStyle);

const ContextMenuManager = {
    menu: null,
    isProcessing: false, // Флаг для предотвращения многократных нажатий

    createMenu(event, emotePrefix, platform, emoteName) {
        this.removeMenu();
        const menu = document.createElement('div');
        menu.className = 'custom-context-menu';
        menu.style.top = `${event.pageY}px`;
        menu.style.left = `${event.pageX}px`;
        menu.innerText = `Block Emote (${emoteName || 'Unknown'})`;
        console.log(`%c[${new Date().toISOString()}] %c[DEBUG] %cContext menu created at:`,
            'color: rgb(85, 113, 165);',
            'color: rgb(85, 113, 165); font-weight: bold;',
            'color: rgb(85, 113, 165);', event.pageX, event.pageY);

        document.body.appendChild(menu);
        this.menu = menu;

        menu.addEventListener('click', (e) => {
            e.stopPropagation();
            if (this.isProcessing) return; // Пропускаем, если обработка уже идет
            this.isProcessing = true;

            console.log(`%c[${new Date().toISOString()}] %c[DEBUG] %cBlocking emote: ${emoteName}`,
                'color: rgb(209, 89, 129);',
                'color: rgb(255, 50, 50); font-weight: bold;',
                'color: rgb(209, 89, 129);');

            this.blockEmote(emotePrefix, platform, emoteName);
            this.removeMenu();
            this.isProcessing = false;
        });

        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target)) this.removeMenu();
        }, { once: true });
    },

    removeMenu() {
        if (this.menu) {
            console.log(`%c[${new Date().toISOString()}] %c[DEBUG] %cRemoving context menu`,
                'color: rgb(209, 89, 129);',
                'color: rgb(115, 2, 160); font-weight: bold;',
                'color: white;');
            this.menu.remove();
            this.menu = null;
        }
    },

    blockEmote(emotePrefix, platform, emoteName) {
        const emoteId = generateRandomID();
        const currentDateTime = new Date().toISOString();
        const newEntry = {
            id: emoteId,
            name: emotePrefix, // Префикс (например, "guwu")
            platform: platform,
            emoteName: emoteName || emotePrefix.split('/').pop() || 'Unknown', // Полное название (например, "guwuPopcorn")
            emoteUrl: platform === 'TwitchChannel' ? emotePrefix : emotePrefix, // Для Twitch используем префикс как URL
            date: currentDateTime
        };

        const isDuplicate = platform === 'TwitchChannel'
            ? blockedChannels.some(e => e.name === newEntry.name && e.platform === newEntry.platform)
            : blockedEmotes.some(e => e.emoteUrl === newEntry.emoteUrl && e.platform === newEntry.platform);

        if (isDuplicate) {
            console.log(`%c[DEBUG] %cEmote already blocked: ${newEntry.emoteName}`,
                'color: rgb(255, 165, 0); font-weight: bold;',
                'color: rgb(255, 165, 0);');
            return;
        }

        if (platform === 'TwitchChannel') {
            blockedChannels.push(newEntry);
            blockedChannelIDs.add(emoteId);
            newlyAddedIds.add(emoteId);
            GM_setValue("blockedChannels", JSON.stringify(blockedChannels, null, 2));
            console.log(`%c[DEBUG] %cAdded to blockedChannels:`,
                'color: rgb(0, 255, 0); font-weight: bold;',
                'color: rgb(0, 255, 0);', newEntry);
        } else {
            blockedEmotes.push(newEntry);
            blockedEmoteIDs.add(emoteId);
            newlyAddedIds.add(emoteId);
            GM_setValue("blockedEmotes", JSON.stringify(blockedEmotes, null, 2));
            console.log(`%c[DEBUG] %cAdded to blockedEmotes:`,
                'color: rgb(0, 255, 0); font-weight: bold;',
                'color: rgb(0, 255, 0);', newEntry);
        }

        const chatContainer = document.querySelector('.chat-scrollable-area__message-container');
        if (chatContainer) {
            toggleEmotesInNode(chatContainer);
        }

        updateBlockedList();
        updateCounter();
    }
};

//=============== Обработчик контекстного меню ===============//
// блокировка сайлов правой кнопкой //
document.addEventListener('contextmenu', (event) => {
    const target = event.target;
    if (target.tagName === 'IMG' && target.closest('.chat-line__message')) {
        event.preventDefault();
        const emoteUrl = target.src || target.getAttribute('srcset')?.split(' ')[0] || '';
        const emoteAlt = target.getAttribute('alt') || '';
        const dataProvider = target.getAttribute('data-provider') || '';
        let emotePrefix = '';
        let platform = '';
        let emoteName = emoteAlt;

        console.log(`[${new Date().toISOString()}] [DEBUG] Context menu triggered for:`, emoteUrl, emoteAlt, 'data-provider:', dataProvider);

        // Определяем платформу и префикс
        if (dataProvider === 'bttv' && emoteUrl.includes('betterttv.net')) {
            emotePrefix = emoteUrl || `https://cdn.betterttv.net/emote/${target.getAttribute('data-id')}/2x.webp`;
            platform = 'bttTV';
            console.log("[DEBUG] Detected bttv emote (via data-provider):", emotePrefix);
        } else if (dataProvider === 'ffz' && emoteUrl.includes('frankerfacez.com')) {
            emotePrefix = emoteUrl || `https://cdn.frankerfacez.com/emote/${target.getAttribute('data-id')}/2`;
            platform = 'ffz';
            emoteName = emoteAlt;
            console.log("[DEBUG] Detected ffz emote (via data-provider):", emotePrefix);
        } else if (dataProvider === 'ffz' && emoteUrl.includes('7tv.app')) {
            emotePrefix = emoteUrl || `https://cdn.7tv.app/emote/${target.getAttribute('data-id')}/2x.webp`;
            platform = '7tv';
            console.log("[DEBUG] Detected 7tv emote (via data-provider):", emotePrefix);
        } else if (emoteUrl.includes('betterttv.net')) {
            emotePrefix = emoteUrl;
            platform = 'bttTV';
            console.log("[DEBUG] Detected bttv emote (via URL):", emoteUrl);
        } else if (emoteUrl.includes('7tv.app')) {
            emotePrefix = emoteUrl;
            platform = '7tv';
            console.log("[DEBUG] Detected 7tv emote (via URL):", emoteUrl);
        } else if (emoteUrl.includes('frankerfacez.com')) {
            emotePrefix = emoteUrl;
            platform = 'ffz';
            emoteName = emoteAlt;
            console.log("[DEBUG] Detected ffz emote (via URL):", emoteUrl);
        } else if (emoteAlt) {
            // Обновленная логика для TwitchChannel
            const match = emoteAlt.match(/^([a-z0-9]+)([A-Z].*)$/); // Ищем префикс до первой заглавной буквы
            if (match) {
                emotePrefix = match[1]; // Например, "lowti3" из "lowti3Face3"
                emoteName = emoteAlt;   // Полное название, например "lowti3Face3"
            } else {
                // Если не удалось разделить, используем первую группу символов до не-букв/цифр как запасной вариант
                emotePrefix = emoteAlt.split(/[^a-zA-Z0-9]/)[0] || emoteAlt;
                emoteName = emoteAlt;
            }
            platform = 'TwitchChannel';
            console.log("[DEBUG] Detected TwitchChannel emote:", emoteAlt, "prefix:", emotePrefix);
        }

        if (emotePrefix && platform) {
            console.log(`[DEBUG] Creating context menu for emote with prefix: ${emotePrefix}, platform: ${platform}`);
            ContextMenuManager.createMenu(event, emotePrefix, platform, emoteName);
        } else {
            console.log("[DEBUG] Could not determine platform or prefix, using fallback TwitchChannel");
            ContextMenuManager.createMenu(event, emoteAlt || emoteUrl, 'TwitchChannel', emoteAlt || 'Unknown');
        }
    }
});

//=============== Запуск ===============//
observeChatContainer();







//====================== Управление высотой панели =======================
function closePanel() {
    isPanelOpen = false;
    GM_setValue('isPanelOpen', isPanelOpen);
    controlPanel.style.height = '0px'; // Плавно уменьшаем высоту
    setTimeout(() => {
        if (!isPanelOpen) controlPanel.style.display = 'none'; // Полностью скрываем после завершения анимации
    }, 150); // Таймер соответствует времени анимации
}

//----------------- Анимация сворачивания панели-------------------------
function openPanel() {
    isPanelOpen = true;
    GM_setValue('isPanelOpen', isPanelOpen);
    controlPanel.style.display = 'block'; // Делаем панель видимой
    setTimeout(() => {
        controlPanel.style.height = '656px'; // Плавно увеличиваем высоту
    }, 0); // Устанавливаем высоту с задержкой для работы анимации
}

//========================== Переключение состояния панели Управления 'openPanelButton' ===============================
openPanelButton.onclick = () => {
    isPanelOpen = !isPanelOpen; // Переключаем состояние панели (открыта/закрыта)
    GM_setValue('isPanelOpen', isPanelOpen);

    // Перемещаем переключатель (круглый элемент), когда панель открывается или закрывается
    switchCircle.style.transform = isPanelOpen ? 'translateX(20px)' : 'translateX(0)';

    // Меняем цвет фона контейнера в зависимости от состояния панели
     // switchContainer.style.backgroundColor = isPanelOpen ? ' #9e9e9e' : ' #171c1c'; //
     // закоментируем убрав  временно для будущих версий  switchContainer //

    // Переключаем видимость панели: открываем или закрываем
    if (isPanelOpen) {
        openPanel(); // Вызов функции для открытия панели
    } else {
        closePanel(); // Вызов функции для закрытия панели
    }
};

// Инициализация состояния
updateSwitchState(); // Убедимся, что переключатель синхронизирован с начальным состоянием
updateBlockedList();
updateCounter();





//============== Минипанель с кнопками сортировки по категориям =================//
const sortContainer = document.createElement('div');
sortContainer.id = 'sortContainer';
sortContainer.style.display = 'flex';
sortContainer.style.justifyContent = 'space-between';
sortContainer.style.backgroundColor = ' rgb(89 51 114)';
sortContainer.style.padding = '5px';
sortContainer.style.marginBottom = '37px';
sortContainer.style.position = 'relative';
sortContainer.style.top = '57px';
sortContainer.style.borderRadius = '8px 8px 0 0'; // Закругление только верхних углов
sortContainer.style.border = '1px solid rgb(255, 255, 255)';
sortContainer.style.boxShadow = ' rgb(0 0 0 / 0%) 0px 15px 6px 0px'; // Использование RGBA для прозрачности
sortContainer.style.zIndex = 'inherit'; // Наследует z-index от родителя

// Определение начальных значений для currentSortOrder
let currentSortOrder = {
    name: 'asc',
    platform: 'asc',
    date: 'asc'
};

// Кнопки сортировки
const sortByNameButton = document.createElement('button');
sortByNameButton.innerHTML = 'Name ▲';
sortByNameButton.style.cursor = 'pointer';
sortByNameButton.style.position = 'relative';
sortByNameButton.style.left = '13%';

sortByNameButton.onclick = () => {
    const order = currentSortOrder.name === 'asc' ? 'desc' : 'asc';
    currentSortOrder.name = order;
    sortByNameButton.innerHTML = `Name ${order === 'asc' ? '▲' : '▼'}`; // Переключение стрелочки
    sortblockedEmotes('name', order);
};
sortContainer.appendChild(sortByNameButton);

const sortByPlatformButton = document.createElement('button');
sortByPlatformButton.innerHTML = 'Platform ▲';
sortByPlatformButton.style.cursor = 'pointer';
sortByPlatformButton.style.position = 'relative';
sortByPlatformButton.style.right = '170px';

sortByPlatformButton.onclick = () => {
    const order = currentSortOrder.platform === 'asc' ? 'desc' : 'asc';
    currentSortOrder.platform = order;
    sortByPlatformButton.innerHTML = `Platform ${order === 'asc' ? '▲' : '▼'}`;
    sortblockedEmotes('platform', order);
};
sortContainer.appendChild(sortByPlatformButton);

const sortByDateButton = document.createElement('button');
sortByDateButton.innerHTML = 'Date-Time ▲';
sortByDateButton.style.cursor = 'pointer';
sortByDateButton.style.top = '0px';
sortByDateButton.style.position = 'relative';
sortByDateButton.style.left = '9px';
sortByDateButton.onclick = () => {
    const order = currentSortOrder.date === 'asc' ? 'desc' : 'asc';
    currentSortOrder.date = order;
    sortByDateButton.innerHTML = `Date ${order === 'asc' ? '▲' : '▼'}`;
    sortblockedEmotes('date', order);
};
sortContainer.appendChild(sortByDateButton);

// Добавляем контейнер сортировки в панель управления
controlPanel.insertBefore(sortContainer, title);


// ---------- goToLast    Button ------------- //
const goToLastButton = document.createElement('button');
goToLastButton.innerHTML = 'Go To Last Element ▼'; // Короткое название
goToLastButton.style.cursor = 'pointer';
goToLastButton.style.position = 'relative';
goToLastButton.style.right = '10%'; // Сдвигаем чуть левее для баланса

goToLastButton.onclick = () => {
    goToLastAddedItem();
};
sortContainer.appendChild(goToLastButton);




//============== Функция для сортировки списка =================//
function sortblockedEmotes(criteria, order) {
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

    // Сортируем оба массива
    blockedEmotes.sort(sortFunc);
    blockedChannels.sort(sortFunc);

    // Обновляем интерфейс после сортировки
    updateBlockedList();
}
//============== Обработчики событий для кнопок =================//
const buttons = [addButton, clearAllButton, exportButton, importButton, unblockAllButton, blockAllButton];
buttons.forEach(button => {
    button.onmouseover = function() {
        button.style.background = '-webkit-linear-gradient(135deg, #443157 0%,rgb(90, 69, 122) 56%, #443157 98%, #443157 100%)'; // Изменение фона при наведении
    };
    button.onmouseout = function() {
        button.style.background = buttonColor; // Возвращаем исходный цвет
    };
});



// ========= Функция для прокрутки к последнему добавленному элементу ============= //
function goToLastAddedItem() {
    const allItems = [...blockedEmotes, ...blockedChannels];
    if (allItems.length === 0) {
        console.log("[DEBUG] Список пуст, некуда прокручивать");
        return;
    }

    // Находим элемент с самой поздней датой
    const lastItem = allItems.reduce((latest, current) => {
        return new Date(current.date) > new Date(latest.date) ? current : latest;
    });

    // Ищем элемент в DOM по его ID
    let lastElement = list.querySelector(`[data-id="${lastItem.id}"]`);
    if (lastElement) {
        // Подсвечиваем элемент
        lastElement.classList.add('last-item-highlight');

        // Прокручиваем к элементу
        const itemOffsetTop = lastElement.offsetTop;
        const listHeight = list.clientHeight;
        const itemHeight = lastElement.clientHeight;
        const scrollPosition = itemOffsetTop - (listHeight / 2) + (itemHeight / 2);
        list.scrollTo({
            top: scrollPosition,
            behavior: 'smooth'
        });

        // Убираем подсветку через 60 секунд
        setTimeout(() => {
            lastElement.classList.remove('last-item-highlight');
            console.log(`[DEBUG] Подсветка убрана с элемента: ${lastItem.emoteName}`);
        }, 60000); // 60000 мс = 1 минута

        console.log(`[DEBUG] Прокручено и подсвечено: ${lastItem.emoteName} (ID: ${lastItem.id})`);
    } else {
        console.log("[DEBUG] Последний элемент не найден в DOM, обновляем список");
        updateBlockedList();
        setTimeout(() => {
            lastElement = list.querySelector(`[data-id="${lastItem.id}"]`);
            if (lastElement) {
                lastElement.classList.add('last-item-highlight');
                const itemOffsetTop = lastElement.offsetTop;
                const listHeight = list.clientHeight;
                const itemHeight = lastElement.clientHeight;
                const scrollPosition = itemOffsetTop - (listHeight / 2) + (itemHeight / 2);
                list.scrollTo({
                    top: scrollPosition,
                    behavior: 'smooth'
                });
                setTimeout(() => {
                    lastElement.classList.remove('last-item-highlight');
                    console.log(`[DEBUG] Подсветка убрана с элемента после обновления: ${lastItem.emoteName}`);
                }, 60000);
                console.log(`[DEBUG] Успешно прокручено и подсвечено после обновления: ${lastItem.emoteName}`);
            }
        }, 100);
    }
}

console.log(getComputedStyle(controlPanel).display);
console.log("[DEBUG] Opening control panel...");
console.log("[DEBUG] Creating control panel...");
console.log("[DEBUG] Adding button...");
console.log("[DEBUG] Updating channel list...");
console.log("[DEBUG] Creating file input element...");
// Удаляем некорректные логи с event, так как они не в контексте события
console.log("[DEBUG] Processing imported channels...");
console.log("[DEBUG] Updating interface...");
console.log("[DEBUG] Showing all emotes in chat...");
console.log("[DEBUG] Blocking all emotes...");
console.log("[DEBUG] Hiding emotes for a channel...");
console.log(`%c[DEBUG] %cWaiting for chat container...`,
    'color:rgb(255, 114, 173); font-weight: bold;', // Стиль для [DEBUG]
    'color: rgb(255, 114, 173)  ;'); // Стиль для остального текста

console.log("[DEBUG] Creating context menu...");





// Добавляем переменные для отслеживания состояния
let lastKnownBlockedCount = blockedEmotes.length + blockedChannels.length;
let lastCheckTime = Date.now();
let isRestarting = false;

// Функция проверки состояния блокировки
function checkBlockingStatus() {
    console.log(`%c[WATCHDOG] %cПроверка состояния блокировки...`,
        'color:rgb(221, 101, 175); font-weight: bold;',
        'color: rgb(164, 207, 44) ;');

    const chatContainer = document.querySelector('.chat-scrollable-area__message-container');
    if (!chatContainer) {
        console.log(
            "%c[WATCHDOG]%c Контейнер чата не найден, перезапускаем наблюдение",
            'color:rgb(172, 147, 223); font-weight: bold;',
            'color: rgb(164, 207, 44) ;');
        observeChatContainer(); // Перезапускаем наблюдение
        return false;
    }

    const emotes = chatContainer.querySelectorAll('.chat-line__message img, .chat-line__message .emote, .chat-line__message .bttv-emote, .chat-line__message .seventv-emote');
    if (emotes.length === 0) {
        console.log("[WATCHDOG] Эмодзи в чате не найдены, пропускаем проверку");
        return true;
    }

    let failureDetected = false;

    emotes.forEach((emote, index) => {
        if (index > 5) return;
        const emoteId = emote.getAttribute('data-emote-id');
        const shouldBeBlocked = emoteId && (blockedChannels.some(e => e.id === emoteId) || blockedEmotes.some(e => e.id === emoteId));
        const isVisible = emote.style.display !== 'none';

        if (shouldBeBlocked && isVisible) {
            console.log(`[WATCHDOG] Обнаружен сбой: эмодзи с ID ${emoteId} должен быть скрыт, но виден!`);
            failureDetected = true;
        } else if (!shouldBeBlocked && !isVisible) {
            console.log(`[WATCHDOG] Обнаружен сбой: эмодзи с ID ${emoteId} не должен быть скрыт, но скрыт!`);
            failureDetected = true;
        }
    });

    const currentBlockedCount = blockedEmotes.length + blockedChannels.length;
    if (currentBlockedCount !== lastKnownBlockedCount) {
        console.log(
            `%c[WATCHDOG] %cКоличество заблокированных элементов изменилось: %c${lastKnownBlockedCount} -> ${currentBlockedCount}`,
            'color: rgb(221, 101, 175); font-weight: bold;',
            'color: rgb(164, 207, 44);',
            'color: rgb(255, 165, 0); font-weight: bold;'
        );
        lastKnownBlockedCount = currentBlockedCount;
    }

    return !failureDetected;
}

function showNotification(message, duration = 3000) {
    const notification = document.createElement('div');
    notification.innerText = message; // Добавляем текст
    notification.style.position = 'relative';
    notification.style.bottom = '99%';
    notification.style.maxWidth = '155px';
    notification.style.left = '61%';
    notification.style.backgroundColor = '#341d41';
    notification.style.color = ' #30aa54';
    notification.style.padding = '6px';
    notification.style.borderRadius = '40px';
    notification.style.boxShadow = 'rgb(130, 113, 148) 1px 1px 7px 4px';
    notification.style.zIndex = '1001';
    notification.style.fontSize = '10px';

    // Начальные стили для анимации (уменьшенный размер)
    notification.style.transform = 'scale(0)'; // Начинаем с масштаба 0
    notification.style.opacity = '0'; // Начинаем с прозрачности 0
    notification.style.transition = 'transform 0.3s ease, opacity 0.3s ease'; // Плавный переход для масштаба и прозрачности

    document.body.appendChild(notification);

    // Запускаем анимацию увеличения после добавления в DOM
    setTimeout(() => {
        notification.style.transform = 'scale(1)'; // Увеличиваем до нормального размера
        notification.style.opacity = '1'; // Делаем полностью видимым
    }, 10); // Небольшая задержка для запуска перехода

    // Удаляем уведомление после завершения длительности
    setTimeout(() => {
        // Добавляем анимацию исчезновения перед удалением (опционально)
        notification.style.transform = 'scale(0)';
        notification.style.opacity = '0';
        setTimeout(() => {
            notification.remove();
        }, 300); // Соответствует времени transition
    }, duration);
}

// Функция перезапуска логики блокировки
function restartBlockingLogic() {
    if (isRestarting) return;
    isRestarting = true;
   // Перезапуск логики - оранжевый цвет (в процессе)
          console.log(
            '%c[WATCHDOG]%c Перезапуск логики блокировки...',
            'color: #FF4500; font-weight: bold;', // Стиль для [WATCHDOG] (OrangeRed)
            'color: #FF4500;' // Стиль для остального текста
          );
    showNotification(" chat not found ... waiting... ", 3000); // уведомление о перезапуске когда сбой  failure

    observer.disconnect();
    const chatContainer = document.querySelector('.chat-scrollable-area__message-container');
    if (chatContainer) {
        const emotes = chatContainer.querySelectorAll('.chat-line__message img, .chat-line__message .emote, .chat-line__message .bttv-emote, .chat-line__message .seventv-emote');
        emotes.forEach(emote => {
            emote.style.display = '';
            emote.removeAttribute('data-emote-id');
        });
        observeChatContainer();
        toggleEmotesInNode(chatContainer);
    } else {
        observeChatContainer();
    }

    updateBlockedList();
    updateCounter();
    setTimeout(() => {
        isRestarting = false;
        // Перезапуск завершен - зеленый цвет (успех)
              console.log(
                '%c[WATCHDOG]%c Перезапуск завершен',
                'color: #00C4B4; font-weight: bold;', // Стиль для [WATCHDOG] (Teal)
                'color: #00C4B4;' // Стиль для остального текста
              );
    }, 1000); // Задержка для предотвращения спама
}

// Периодическая проверка состояния (watchdog)
function startWatchdog() {
    setInterval(() => {
        const currentTime = Date.now();
        if (currentTime - lastCheckTime < 5000) return; // Проверяем не чаще, чем раз в 5 секунд
        lastCheckTime = currentTime;

        const isWorking = checkBlockingStatus();
        if (!isWorking) {
            // Обнаружен сбой - желтый цвет (предупреждение)
                console.log(
                  '%c[WATCHDOG]%c Обнаружен сбой в работе блокировки, перезапуск...',
                  'color: #FFA500; font-weight: bold;', // Стиль для [WATCHDOG] (Orange)
                  'color: #FFA500;' // Стиль для остального текста
                );
            restartBlockingLogic();
        } else {
            console.log(`%c[WATCHDOG] %cБлокировка работает корректно!`,
                'color:rgb(6, 167, 0); font-weight: bold;',
                       'color: rgb(164, 207, 44) ;');
        }
    }, 10000); // Проверяем каждые 10 секунд
}


    //================  Модуль управления темами ================== //
    (function () {
        // Определяем начальный массив тем
        const defaultThemes = [
            {
                name: 'default',
                displayName: 'Default Theme',
                styles: {
                    controlPanel: {
                        background: '-webkit-linear-gradient(270deg, hsla(50, 76%, 56%, 1) 0%, hsla(32, 83%, 49%, 1) 25%, hsla(0, 37%, 37%, 1) 59%, hsla(276, 47%, 24%, 1) 79%, hsla(261, 11%, 53%, 1) 100%)',
                        border: '1px solid #ccc',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                        color: '#fff'
                    },
                    lastItemHighlight: {
                        backgroundColor: ' #ffd700' // Золотой полупрозрачный
                    },
                    openPanelButton: {
                        background: ' #4c2a5e', // Фиолетовый фон по умолчанию
                        color: ' #bda3d7',     // Светло-фиолетовый текст
                        border: 'none'
                    },
                    switchContainer: {
                        backgroundColor: ' #ccb8eb5c', // Полупрозрачный фон выключенного состояния
                        activeBackgroundColor: ' #bda3d7' // Фон включенного состояния
                    },
                    switchCircle: {
                        backgroundColor: ' #4c2a5e', // Фиолетовый кружок
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.8)'
                    },
                    list: {
                        background: '-webkit-linear-gradient(45deg, hsla(292, 44%, 16%, 1) 0%, hsla(173, 29%, 48%, 1) 100%)',
                        border: '1px solid #ffffff',
                        color: '#fff',
                        scrollbarThumb: ' #C1A5EF',
                        scrollbarTrack: ' #455565'
                    },
                    counter: {
                        backgroundColor: ' #b69dcf',
                        color: ' #4c2a5e',
                        border: '3px solid #4c2a5e'
                    },
                    sortContainer: {
                        backgroundColor: 'rgb(89, 51, 114)',
                        border: '1px solid rgb(255, 255, 255)',
                        color: '#fff'
                    },
                    title: {
                        color: ' #2a1e38'
                    },
                    buttons: {
                        background: ' #907cad',
                        color: '#fff'
                    },
                    versionLabel: {
                        color: 'rgb(62, 33, 85)'
                    },
                    searchInput: {
                        background: '#192427',
                        color: ' #b69dcf',
                        border: '1px solid #b69dcf'
                    },
                    input: {
                        background: ' #192427',
                        color: ' #b69dcf',
                        border: '1px solid #b69dcf'
                    },
                    themeSelect: {
                        background: ' #192427',
                        color: ' #b69dcf',
                        border: '1px solid #c1a5ef'
                    },
                    platformSelect: {
                        background: ' #192427',
                        color: ' #b69dcf',
                        border: '1px solid #c1a5ef'
                    },
                    deleteButton: {
                        background: ' #944646',
                        color: ' #fff',
                        hoverBackground: 'linear-gradient(135deg, #480a0c 56%, #ca5d5f 98%, #8b4040 100%)'
                    },
                    listItemText: { // Название платформы и префикс (например, "7tv > BasedGod" и "(prefix: ...)")
                        color: ' #ffffff' // Белый текст для темного фона
                    },
                    listItemLink: { // Префикс как ссылка (например, "(prefix: ...)")
                        color: ' #b3e0f2' // Светло-голубой для ссылок
                    },
                    listItemDate: { // Дата (например, "15/03/2025, 22:30")
                        color: ' #cccccc' // Светло-серый для даты
                    }
                }
            },
            {
                name: 'dark',
                displayName: 'Dark Theme',
                styles: {
                    controlPanel: {
                        background: 'linear-gradient(282deg, #1a1a1a 0%, #848282 100%)',
                        border: '1px solid #444',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.5)',
                        color: '#ddd'
                    },
                    lastItemHighlight: {
                        backgroundColor: 'rgba(255, 217, 0, 0.47)' // Золотой полупрозрачный
                    },

                    openPanelButton: {
                        background: ' #84828266', // Темно-серый фон
                        color: ' #171c1c', // Темно-серый текст
                        border: 'none'
                    },
                    switchContainer: {
                        backgroundColor: ' #464646', // Темно-серый фон выключенного состояния
                        activeBackgroundColor: ' #7e7e7e' // Темно-серый фон включенного состояния
                    },
                    switchCircle: {
                        backgroundColor: ' #5d5d5d',      // Светло-серый кружок
                        boxShadow: '0 2px 6px #000000'
                    },
                    themeSelect: {
                        background: ' #2c2c2c',
                        color: ' #a8a8a8',
                        border: '1px solid #666'
                    },
                    list: {
                        background: 'linear-gradient(45deg, #301144, #196a6185, #56bfcdad)',
                        border: '1px solid #555',
                        color: '#ddd',
                        scrollbarThumb: '#666',
                        scrollbarTrack: '#222'
                    },
                    counter: {
                        backgroundColor: ' #333',
                        color: ' #9f9f9f',
                        border: '3px solid #9e9e9e'
                    },
                    sortContainer: {
                        backgroundColor: ' #333333',
                        border: '1px solid #555',
                        color: '#ddd'
                    },
                    title: {
                        color: ' #333333'
                    },
                    buttons: {
                        background: ' #444',
                        color: ' #ddd'
                    },
                    versionLabel: {
                        color: ' #333333'
                    },
                    searchInput: {
                        background: ' #444444 ',
                        color: ' #ddd',
                        border: '1px solid #555'
                    },
                    input: {
                        background: ' #444444',
                        color: ' #ddd',
                        border: '1px solid #555'
                    },
                    platformSelect: {
                        background: ' #2c2c2c',
                        color: ' #a8a8a8',
                        border: '1px solid #666'
                    },
                    deleteButton: {
                        background: ' #444444',
                        color: '#ddd',
                        hoverBackground: 'linear-gradient(135deg, rgb(78, 64, 64) 0%, rgb(99, 86, 86) 56%, rgb(58, 51, 51) 98%, rgb(37, 37, 37) 100%)'
                    },
                    listItemText: { // Название платформы и префикс
                        color: ' #dddddd' // Светло-серый для контраста
                    },
                    listItemLink: { // Префикс как ссылка
                        color: ' #99ccff' // Светло-синий для ссылок
                    },
                    listItemDate: { // Дата
                        color: ' #bbbbbb' // Средне-серый для даты
                    }
                }
            },
            {
                name: 'light',
                displayName: 'Light Theme',
                styles: {
                    controlPanel: {
                        background: '-webkit-linear-gradient(270deg, #a694b1 ,  #f0f0f0 0%,  rgb(121, 121, 121) 100%)',
                        border: '1px solid #999',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.2)',
                        color: ' #000000'
                    },
                    lastItemHighlight: {
                        backgroundColor: 'rgba(255, 217, 0, 0.56)' // Золотой полупрозрачный
                    },
                    openPanelButton: {
                        background: ' #828282',   // Светло-серый фон
                        color: ' #333',        // Темно-серый текст
                        border: '1px solid #999'
                    },
                    switchContainer: {
                        backgroundColor: ' #171c1c',      // Светло-серый фон выключенного состояния
                        activeBackgroundColor: ' #464646' // Серый фон включенного состояния
                    },
                    switchCircle: {
                        backgroundColor: '#666',      // Средне-серый кружок
                        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)'
                    },
                    themeSelect: {
                        background: 'rgb(172, 172, 172)',
                        color: ' #050505',
                        border: '1px solid #999'
                    },
                    list: {
                        background: 'linear-gradient(45deg, #a694b1 , rgba(218, 144, 178, 0.46),rgb(70, 182, 197))',
                        border: '1px solid #ccc',
                        color: ' #000000',
                        scrollbarThumb: '#aaa',
                        scrollbarTrack: '#ddd'
                    },
                    counter: {
                        backgroundColor: ' #e0e0e0',
                        color: ' #000000',
                        border: '3px solid #999'
                    },
                    sortContainer: {
                        backgroundColor: ' #acacac',
                        border: '1px solid #ccc',
                        color: ' #000000'
                    },
                    title: {
                        color: ' #000000'
                    },
                    buttons: {
                        background: '#bbb',
                        color: ' #000000'
                    },
                    versionLabel: {
                        color: ' #000000'
                    },
                    searchInput: {
                        background: ' #acacac',
                        color: ' #000000',
                        border: '1px solid #ccc'
                    },
                    input: {
                        background: ' #acacac',
                        color: 'rgba(0, 0, 0, 0.2)',
                        border: '1px solid #ccc'
                    },
                    platformSelect: {
                        background: 'rgb(172, 172, 172)',
                        color: ' #050505',
                        border: '1px solid #999'
                    },
                    deleteButton: {
                        background: '#ff9999',
                        color: 'rgb(43, 37, 37)',
                        hoverBackground: 'linear-gradient(135deg, rgb(110, 109, 109) 0%, rgb(107, 90, 90) 56%, rgb(177, 154, 154) 98%, rgb(172, 141, 141) 100%)'
                    },
                    listItemText: { // Название платформы и префикс
                        color: 'rgb(0, 53, 24)' // Тёмно-зелёный для читаемости
                    },
                    listItemLink: { // Префикс как ссылка
                        color: 'rgb(51, 134, 120)' // Бирюзовый для ссылок
                    },
                    listItemDate: { // Дата
                        color: ' #555555' // Серый для даты
                    }
                }
            },
            {
                name: 'waterBlue',
                displayName: 'Water Blue Theme',
                styles: {
                    controlPanel: {
                        background: '-webkit-linear-gradient(90deg, rgb(0, 23, 89) 0%, rgb(18 105 99) 100%)',
                        border: '1px solid #2a69ac',
                        boxShadow: '0 4px 8px #1a3a8a',
                        color: ' #e0f2fa'
                    },
                    lastItemHighlight: {
                        backgroundColor: 'rgba(255, 217, 0, 0.6)' // Золотой полупрозрачный
                    },
                    openPanelButton: {
                        background: ' #3d8eb9', // Голубой фон
                        color: ' #09415e',      // Темно-голубой текст
                        border: '1px solid #2a69ac'
                    },
                    switchContainer: {
                        backgroundColor: ' #2a69ac',   // Темно-голубой фон выключенного состояния
                        activeBackgroundColor: ' #09415e' // Светло-голубой фон включенного состояния
                    },
                    switchCircle: {
                        backgroundColor: ' #3d8eb9',   // светло-синий кружок
                        boxShadow: '0 2px 6px rgba(26, 58, 138, 0.5)'
                    },
                    themeSelect: {
                        background: ' #2a69ac',
                        color: 'rgb(206, 220, 226)',
                        border: '1px solid #4fb3c8'
                    },
                    list: {
                        background: 'linear-gradient(45deg,rgb(21, 45, 112) 0%,rgb(82, 169, 172)',
                        border: '1px solid #2a69ac',
                        color: 'rgb(182, 202, 211)',
                        scrollbarThumb: ' #4fb3c8',
                        scrollbarTrack: ' #2a69ac'
                    },
                    counter: {
                        backgroundColor: ' #3d8eb9',
                        color: ' #011d59',
                        border: '3px solid #011d59'
                    },
                    sortContainer: {
                        backgroundColor: ' #042251',
                        border: '1px solid #4fb3c8',
                        color: ' #e0f2fa'
                    },
                    title: {
                        color: ' #4fc8b9'
                    },
                    buttons: {
                        background: ' #3d8eb9',
                        color: ' #011d59'
                    },
                    versionLabel: {
                        color: ' #b3e0f2'
                    },
                    searchInput: {
                        background: ' #2a69ac',
                        color: ' #e0f2fa',
                        border: '1px solid #4fb3c8'
                    },
                    input: {
                        background: ' #2a69ac',
                        color: ' #e0f2fa',
                        border: '1px solid #4fb3c8'
                    },
                    platformSelect: {
                        background: ' #2a69ac',
                        color: ' #e0f2fa',
                        border: '1px solid #4fb3c8'
                    },
                    deleteButton: {
                        background: ' #022258',
                        color: ' #e0f2fa',
                        hoverBackground: 'linear-gradient(135deg, rgb(64, 124, 255) 0%, rgb(0, 3, 179) 56%, rgb(64, 93, 255) 98%, rgb(107, 154, 255) 100%)'
                    },
                    listItemText: { // Название платформы и префикс
                        color: ' #e0f2fa' // Светло-голубой для контраста
                    },
                    listItemLink: { // Префикс как ссылка
                        color: ' #b3e0f2' // Ещё более светлый голубой для ссылок
                    },
                    listItemDate: { // Дата
                        color: ' #c0e0f0' // Нежно-голубой для даты
                    }
                }
            },
            {
                name: 'black-raspberry',
                displayName: 'Black Raspberry Theme',
                styles: {
                    controlPanel: {
                        background: ' #1a1a1a', // Глубокий чёрный фон
                        border: '1px solid #333', // Тёмно-серая граница
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.7)', // Более глубокая тень
                        color: ' #db7093' // Малиновый текст для контраста
                    },
                    lastItemHighlight: {
                        backgroundColor: 'rgba(199, 21, 133, 0.3)' // Полупрозрачный малиновый для подсветки
                    },
                    openPanelButton: {
                        background: ' #000000', // Чёрный фон
                        color: ' #c71585', // Малиновый текст
                        border: 'none'
                    },
                    switchContainer: {
                        backgroundColor: ' #333333', // Тёмно-серый фон выключенного состояния
                        activeBackgroundColor: ' #c71585' // Малиновый фон включенного состояния
                    },
                    switchCircle: {
                        backgroundColor: ' #222222', // Светло-малиновый кружок
                        boxShadow: ' #000000c9 0px 3px 8px 2px'
                    },
                    themeSelect: {
                        background: ' #1a1a1a', // Чёрный фон
                        color: ' #db7093', // Малиновый текст
                        border: '1px solid #444'
                    },
                    list: {
                        background: 'linear-gradient(45deg, #0f0615, #94225d)', // Чёрно малиновый градиент для списка
                        border: '1px solid #444', // Тёмно-серая граница
                        color: ' #db7093', // Малиновый текст
                        scrollbarThumb: ' #c71585', // Малиновый ползунок
                        scrollbarTrack: ' #222222' // Чёрный трек
                    },
                    counter: {
                        backgroundColor: ' #000000', // Чёрный фон
                        color: ' #db7093', // Малиновый текст
                        border: '3px solid #c71585' // Малиновая граница
                    },
                    sortContainer: {
                        backgroundColor: ' #1a1a1a', // Чёрный фон
                        border: '1px solid #444', // Тёмно-серая граница
                        color: ' #db7093' // Малиновый текст
                    },
                    title: {
                        color: ' #c71585' // Малиновый заголовок
                    },
                    buttons: {
                        background: ' #333333', // Тёмно-серый фон кнопок
                        color: ' #db7093' // Малиновый текст
                    },
                    versionLabel: {
                        color: ' #c71585' // Малиновый текст
                    },
                    searchInput: {
                        background: ' #1a1a1a', // Чёрный фон
                        color: ' #db7093', // Малиновый текст
                        border: '1px solid #c71585' // Малиновая граница
                    },
                    input: {
                        background: '#1a1a1a', // Чёрный фон
                        color: '#db7093', // Малиновый текст
                        border: '1px solid #c71585' // Малиновая граница
                    },
                    platformSelect: {
                        background: '#1a1a1a', // Чёрный фон
                        color: '#db7093', // Малиновый текст
                        border: '1px solid #444'
                    },
                    deleteButton: {
                        background: ' #333333', // Тёмно-серый фон
                        color: ' #b76780', // темно серый текст
                        hoverBackground: 'linear-gradient(135deg, #a44c83 0%, #6b293e 56%, #8a4e6f 98%)' // Градиент с малиновыми оттенками
                    },
                    listItemText: { // Название платформы и префикс
                        color: ' #db7093' // Малиновый текст для контраста
                    },
                    listItemLink: { // Префикс как ссылка
                        color: ' #ff69b4' // Более светлый малиновый для ссылок
                    },
                    listItemDate: { // Дата
                        color: ' #888888' // Серый для даты, чтобы не отвлекать
                    }
                }
            },
            {
                name: 'deepSeaTurquoise',
                displayName: 'Deep Sea Turquoise Theme',
                styles: {
                    controlPanel: {
                        background: 'linear-gradient(180deg,rgb(23, 86, 87),rgb(70, 171, 129), #6ec2c5 )',
                        border: '1px solid #2a8c8e',
                        boxShadow: '0 4px 8px rgba(23, 94, 95, 0.52)',
                        color: ' #d1f1f2'
                    },
                    lastItemHighlight: {
                        backgroundColor: 'rgba(255, 217, 0, 0.55)' // Золотой полупрозрачный
                    },
                    openPanelButton: {
                        background: ' #2a8c8e', // Бирюзовый фон
                        color: ' #1b4746',      // Светло-бирюзовый текст
                        border: '1px solid #155557'
                    },
                    switchContainer: {
                        backgroundColor: ' #155557',   // Темно-бирюзовый фон выключенного состояния
                        activeBackgroundColor: ' #1b4746' // Светло-бирюзовый фон включенного состояния
                    },
                    switchCircle: {
                        backgroundColor: ' #2a8c8e',   // Темно-бирюзовый кружок
                        boxShadow: '0 2px 6px rgba(23, 94, 95, 0.5)'
                    },
                    themeSelect: {
                        background: ' #155557',
                        color: ' #d1f1f2',
                        border: '1px solid #46a8ab'
                        },
                    list: {
                        background: 'linear-gradient(45deg,  #1d6f71 ,rgb(105, 26, 151)',
                        border: '1px solid #2a8c8e',
                        color: ' #d1f1f2',
                        scrollbarThumb: ' #46a8ab',
                        scrollbarTrack: ' #0c3a3c'
                    },
                    counter: {
                        backgroundColor: ' #2a8c8e',
                        color: ' #0c3a3c',
                        border: '3px solid #0c3a3c'
                    },
                    sortContainer: {
                        backgroundColor: ' #1b4746',
                        border: '1px solid #46a8ab',
                        color: ' #67beb8'
                    },
                    title: {
                        color: ' #3fa3a5'
                    },
                    buttons: {
                        background: ' #2a8c8e',
                        color: ' #0c3a3c'
                    },
                    versionLabel: {
                        color: ' #61d0d2'
                    },
                    searchInput: {
                        background: ' #155557',
                        color: ' #d1f1f2',
                        border: '1px solid #46a8ab'
                    },
                    input: {
                        background: ' #155557',
                        color: ' #d1f1f2',
                        border: '1px solid #46a8ab'
                    },
                    platformSelect: {
                        background: 'rgb(58, 92, 94)',
                        color: ' #d1f1f2',
                        border: '1px solidrgb(177, 78, 202)'
                    },
                    deleteButton: {
                        background: ' #16332c',
                        color: ' #46a8ab',
                        hoverBackground: 'linear-gradient(135deg, #1b5e44 44%, #367e72 56%, #1b5e44 31%)'
                    },
                    listItemText: { // Название платформы и префикс
                        color: ' #d1f1f2' // Светло-бирюзовый для контраста
                    },
                    listItemLink: { // Префикс как ссылка
                        color: ' #a3d9db' // Более мягкий бирюзовый для ссылок
                    },
                    listItemDate: { // Дата
                        color: ' #b0e0e2' // Нежный бирюзовый для даты
                    }
                }
            }
        ];

    // Загружаем темы из хранилища или используем дефолтные
    let themes = GM_getValue('themes', defaultThemes);
    let selectedThemeName = GM_getValue('selectedTheme', 'default');

    // Функция для сохранения тем в хранилище
    function saveThemes() {
        GM_setValue('themes', themes);
        console.log('[DEBUG] Темы сохранены в хранилище:', themes);
    }

    // Функция для сохранения выбранной темы
    function saveSelectedTheme(themeName) {
        selectedThemeName = themeName;
        GM_setValue('selectedTheme', themeName);
        console.log('[DEBUG] Выбранная тема сохранена:', themeName);
    }

    // Функция для применения темы
    function applyTheme(themeName) {
        const theme = themes.find(t => t.name === themeName) || themes[0];
        if (!theme) {
            console.warn(`[DEBUG] Тема ${themeName} не найдена, используется 'default'`);
            applyTheme('default');
            return;
        }

        console.log(`[DEBUG] Применение темы: ${themeName}`);

        const currentPanelDisplay = controlPanel.style.display;
        const currentPanelHeight = controlPanel.style.height;

        if (openPanelButton) {
            Object.assign(openPanelButton.style, theme.styles.openPanelButton);
            openPanelButton.style.position = 'fixed';
            openPanelButton.style.zIndex = '10000';
            openPanelButton.style.transition = 'background 0.3s ease';
        }

        if (switchContainer) {
            Object.assign(switchContainer.style, {
                backgroundColor: isPanelOpen ? theme.styles.switchContainer.activeBackgroundColor : theme.styles.switchContainer.backgroundColor,
                width: '44px',
                height: '27px',
                borderRadius: '13px',
                position: 'relative',
                transition: 'background 0.3s ease'
            });
        }

        if (switchCircle) {
            Object.assign(switchCircle.style, theme.styles.switchCircle);
            switchCircle.style.width = '19px';
            switchCircle.style.height = '19px';
            switchCircle.style.borderRadius = '50%';
            switchCircle.style.position = 'absolute';
            switchCircle.style.top = '3px';
            switchCircle.style.left = '3px';
            switchCircle.style.transition = 'transform 0.3s ease';
        }

        if (controlPanel) {
            Object.assign(controlPanel.style, theme.styles.controlPanel);
            controlPanel.style.display = currentPanelDisplay;
            controlPanel.style.height = currentPanelHeight;
            controlPanel.style.transition = 'height 0.3s ease';
        }

        if (list) {
            Object.assign(list.style, theme.styles.list);
            const styleElement = document.getElementById('customScrollbarStyle') || document.createElement('style');
            styleElement.id = 'customScrollbarStyle';
            styleElement.innerHTML = `
                #blockedList::-webkit-scrollbar { width: 25px; }
                #blockedList::-webkit-scrollbar-thumb {
                    background-color: ${theme.styles.list.scrollbarThumb};
                    border-radius: 8px;
                    border: 3px solid #4F3E6A;
                    height: 80px;
                }
                #blockedList::-webkit-scrollbar-thumb:hover { background-color: ${theme.styles.list.scrollbarThumb}; }
                #blockedList::-webkit-scrollbar-thumb:active { background-color: ${theme.styles.list.scrollbarThumb}; }
                #blockedList::-webkit-scrollbar-track {
                    background: ${theme.styles.list.scrollbarTrack};
                    border-radius: 0px 0px 8px 0px;
                }
                #blockedList::-webkit-scrollbar-track:hover { background: ${theme.styles.list.scrollbarTrack}; }
                #blockedList::-webkit-scrollbar-track:active { background: ${theme.styles.list.scrollbarTrack}; }
            `;
            if (!document.getElementById('customScrollbarStyle')) {
                document.head.appendChild(styleElement);
            }
        }

        const lastItemHighlightStyle = document.createElement('style');
        lastItemHighlightStyle.id = 'lastItemHighlightStyle';
        lastItemHighlightStyle.innerHTML = `
            .last-item-highlight {
                background-color: ${theme.styles.lastItemHighlight?.backgroundColor || ' #ffd700'};
                transition: background-color 0.5s ease;
            }
        `;
        const existingStyle = document.getElementById('lastItemHighlightStyle');
        if (existingStyle) {
            existingStyle.remove();
        }
        document.head.appendChild(lastItemHighlightStyle);

        if (counter) {
            Object.assign(counter.style, theme.styles.counter);
            counter.style.display = 'flex';
        }

        if (sortContainer) {
            Object.assign(sortContainer.style, theme.styles.sortContainer);
            sortContainer.style.display = 'flex';
        }

        if (title) {
            Object.assign(title.style, theme.styles.title);
            title.style.display = 'block';
        }

        const buttons = [addButton, clearAllButton, exportButton, importButton, unblockAllButton, blockAllButton, searchButton];
        buttons.forEach(button => {
            Object.assign(button.style, theme.styles.buttons);
            button.onmouseover = () => {
                button.style.background = '-webkit-linear-gradient(135deg, #443157 0%, rgb(90, 69, 122) 56%, #443157 98%, #443157 100%)';
            };
            button.onmouseout = () => {
                button.style.background = theme.styles.buttons.background;
            };
        });

        if (versionLabel) {
            Object.assign(versionLabel.style, theme.styles.versionLabel);
        }

        if (searchInput) {
            Object.assign(searchInput.style, theme.styles.searchInput);
        }

        if (input) {
            Object.assign(input.style, theme.styles.input);
        }

        if (platformSelect) {
            Object.assign(platformSelect.style, theme.styles.platformSelect);
        }

        if (themeSelect) {
            Object.assign(themeSelect.style, theme.styles.themeSelect);
        }

            // Обновляем стили кнопок Delete и сохраняем их в currentDeleteButtonStyles
    const deleteButtons = list.querySelectorAll('.delete-button');
    deleteButtons.forEach(button => {
        Object.assign(button.style, theme.styles.deleteButton, {
            height: '35px',
            width: '75px',
            fontWeight: 'bold',
            fontSize: '16px',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.3s ease'
        });
        button.onmouseover = () => {
            button.style.background = theme.styles.deleteButton.hoverBackground;
        };
        button.onmouseout = () => {
            button.style.background = theme.styles.deleteButton.background;
        };
    });

    // Сохраняем текущие стили кнопки Delete
    currentDeleteButtonStyles = {
        background: theme.styles.deleteButton.background,
        color: theme.styles.deleteButton.color,
        hoverBackground: theme.styles.deleteButton.hoverBackground
    };
    console.log('[DEBUG] Сохранены стили кнопки Delete:', currentDeleteButtonStyles);


        if (list) {
            const listItemTexts = list.querySelectorAll('.list-item-text');
            const listItemLinks = list.querySelectorAll('.list-item-link');
            const listItemDates = list.querySelectorAll('.list-item-date');
            listItemTexts.forEach(span => {
                Object.assign(span.style, theme.styles.listItemText);
            });
            listItemLinks.forEach(span => {
                Object.assign(span.style, theme.styles.listItemLink);
            });
            listItemDates.forEach(span => {
                Object.assign(span.style, theme.styles.listItemDate);
            });
        }

        saveSelectedTheme(themeName);
    }



  // ============== Создаём интерфейс для выбора темы ========================== //
    const themeSelectorContainer = document.createElement('div');
    themeSelectorContainer.style.position = 'relative';
    themeSelectorContainer.style.bottom = '100px';
    themeSelectorContainer.style.width = '126px';
    themeSelectorContainer.style.left = '0px';
    themeSelectorContainer.style.zIndex = '10001';

    const themeSelect = document.createElement('select');
    themeSelect.style.padding = '5px';
    themeSelect.style.height = '35px';
    themeSelect.style.width = '126px';
    themeSelect.style.borderRadius = '4px';
    themeSelect.style.background = ' #192427';
    themeSelect.style.color = ' #b69dcf';
    themeSelect.style.border = '1px solid #b69dcf';

    themes.forEach(theme => {
        const option = document.createElement('option');
        option.value = theme.name;
        option.innerText = theme.displayName;
        if (theme.name === selectedThemeName) {
            option.selected = true;
        }
        themeSelect.appendChild(option);
    });

    themeSelect.onchange = () => {
        const selectedTheme = themeSelect.value;
        applyTheme(selectedTheme);
    };

    themeSelectorContainer.appendChild(themeSelect);
    controlPanel.appendChild(themeSelectorContainer);

    // Применяем сохранённую тему при загрузке
    applyTheme(selectedThemeName);
})();

// Запускаем watchdog
startWatchdog();


})();