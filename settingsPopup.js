// settingsPopup.js
(function() {
    const settingsPopup = document.createElement('div');
    settingsPopup.className = 'settings-popup'; // Добавляем класс для проверки
    settingsPopup.style.position = 'fixed';
    settingsPopup.style.top = '20%';
    settingsPopup.style.left = '30%';
    settingsPopup.style.width = '40%';
    settingsPopup.style.height = '60%';
    settingsPopup.style.background = 'rgba(0, 0, 0, 0.75)';
    settingsPopup.style.borderRadius = '8px';
    settingsPopup.style.zIndex = '10002';
    settingsPopup.style.padding = '20px';
    settingsPopup.style.color = '#fff';

    const closeButton = document.createElement('button');
    closeButton.innerText = 'Close';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.style.background = ' #384e79'; // Консистентный цвет
    closeButton.style.color = '#fff';
    closeButton.style.border = 'none';
    closeButton.style.borderRadius = '4px';
    closeButton.style.padding = '5px 10px';
    closeButton.style.cursor = 'pointer';

    closeButton.onclick = () => {
        settingsPopup.remove();
    };

    settingsPopup.appendChild(closeButton);
    settingsPopup.innerHTML += '<h3>Settings</h3><p>Future settings will be here...</p>';
    document.body.appendChild(settingsPopup);
})();