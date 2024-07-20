const configs = {
    'closeWhenFocusedInitialWindow': true,
    'tryOpenAtMousePosition': false,
    'hideBrowserControls': true,
    'popupHeight': 800,
    'popupWidth': 1000,
    'searchEngine': 'https://www.google.com/search?q=%s',
    'disabledUrls': [],
    'blurEnabled': true,
    'blurPx': 3,
    'blurTime': 1,
    'modifiedKey': 'None',
    'originWindowId': '',
    'dragMovePx': 0,
    'delayTime': 0
};

document.addEventListener("DOMContentLoaded", init);

function init() {
    loadUserConfigs(setupPage);
}

function setupPage(userConfigs) {
    userConfigs = userConfigs || {};

    // Elements to translate and set labels for
    const elementsToTranslate = [
        { id: 'keySelection', messageId: 'keySelection' },
        { id: 'searchEngineSelection', messageId: 'searchEngineSelection' },
        { id: 'popupSettings', messageId: 'popupSettings' },
        { id: 'blurEffectSettings', messageId: 'blurEffectSettings' },
        { id: 'blacklist', messageId: 'blacklist' },
        { id: 'dragSettings', messageId: 'dragSettings' }
    ];

    elementsToTranslate.forEach(({ id, messageId }) => setTextContent(id, messageId));

    // Set specific labels
    setInputLabel('custom', 'custom');
    setInputLabel('searchDisable', 'searchDisable');
    setInputLabel('noneKey', 'noneKey');

    // Initialize input elements
    Object.keys(configs).forEach(key => {
        const input = document.getElementById(key);
        if (input) {
            initializeInput(input, key, userConfigs[key]);
            addInputListener(input, key);
        }
    });

    // Initialize textarea and sliders
    initializeTextarea('disabledUrls', userConfigs);
    initializeSlider('blurPx', 3);
    initializeSlider('blurTime', 1);
    initializeSlider('dragMovePx', 0);
    initializeSlider('delayTime', 0);


    // Set modified key
    setModifiedKey(userConfigs.modifiedKey);

    // Setup search engine selection
    setupSearchEngineSelection(userConfigs.searchEngine);
}

function setTextContent(elementId, messageId) {
    document.getElementById(elementId).textContent = chrome.i18n.getMessage(messageId);
}

function setInputLabel(inputId, messageId) {
    const label = document.querySelector(`label[for="${inputId}"]`);
    if (label) {
        label.textContent = chrome.i18n.getMessage(messageId);
    }
}

function initializeInput(input, key, userConfig) {
    const configValue = userConfig !== undefined ? userConfig : configs[key];
    if (input.type === 'checkbox') {
        input.checked = configValue;
    } else {
        input.value = configValue;
    }

    const label = input.parentNode.querySelector('label') || createLabel(input, key);
    label.textContent = chrome.i18n.getMessage(key);
}

function createLabel(input, key) {
    const label = document.createElement('label');
    label.setAttribute('for', key);
    input.parentNode.appendChild(label);
    return label;
}

function addInputListener(input, key) {
    input.addEventListener("input", () => {
        configs[key] = input.type === 'checkbox' ? input.checked : input.value;
        saveAllSettings();
    });
}

function initializeTextarea(textareaId, userConfigs) {
    const textarea = document.getElementById(textareaId);
    if (textarea) {
        textarea.value = (userConfigs[textareaId] ?? configs[textareaId]).join('\n');
        textarea.addEventListener('input', () => {
            configs[textareaId] = textarea.value.split('\n').filter(line => line.trim());
            saveAllSettings();
        });
    }
}

function initializeSlider(id, defaultValue) {
    const input = document.getElementById(id);
    const output = document.getElementById(`${id}Output`);
    const initialValue = localStorage.getItem(id) ?? defaultValue;

    input.value = initialValue;
    output.textContent = initialValue;

    input.addEventListener('input', () => {
        output.textContent = input.value;
        localStorage.setItem(id, input.value);
    });
}

function setModifiedKey(modifiedKey) {
    modifiedKey = modifiedKey ?? 'None';
    document.querySelector(`input[name="modifiedKey"][value="${modifiedKey}"]`).checked = true;

    document.querySelectorAll('input[name="modifiedKey"]').forEach(input => {
        input.addEventListener('change', event => {
            chrome.storage.local.set({ modifiedKey: event.target.value });
        });
    });
}

function setupSearchEngineSelection(searchEngine) {
    const customInput = document.getElementById('customSearchEngine');
    const searchEngines = ['google', 'bing', 'baidu', 'duckduckgo', 'custom', 'searchDisable', 'wiki', 'yandex'];

    // Ensure the custom input event listener is set up properly
    customInput.addEventListener('input', () => {
        chrome.storage.local.set({ searchEngine: customInput.value });
    });

    searchEngines.forEach(engine => {
        const radio = document.getElementById(engine);
        radio.addEventListener('change', () => {
            if (radio.checked) {
                let searchEngineValue;
                if (engine === 'custom') {
                    customInput.style.display = 'block';
                    searchEngineValue = customInput.value;
                } else {
                    customInput.style.display = 'none';
                    searchEngineValue = radio.value;
                }
                chrome.storage.local.set({ searchEngine: searchEngineValue });
            }
        });

        // Restore saved value on load
        if (searchEngine === radio.value) {
            radio.checked = true;
            customInput.style.display = engine === 'custom' ? 'block' : 'none';
        }
    });

    // Special handling for initial load if 'custom' is selected
    if (!searchEngines.some(engine => searchEngine === document.getElementById(engine)?.value)) {
        const customRadio = document.getElementById('custom');
        customRadio.checked = true;
        customInput.style.display = 'block';
        customInput.value = searchEngine;
    }
}

function loadUserConfigs(callback) {
    const keys = Object.keys(configs);
    chrome.storage.local.get(keys, function (userConfigs) {
        userConfigs.searchEngine = userConfigs.searchEngine ?? configs.searchEngine;
        userConfigs.modifiedKey = userConfigs.modifiedKey ?? configs.modifiedKey;
        
        keys.forEach(key => {
            if (userConfigs[key] !== null && userConfigs[key] !== undefined) {
                configs[key] = userConfigs[key];
            }
        });

        if (callback) callback(userConfigs);
    });
}

function saveConfig(key, value) {
    configs[key] = value;
    let data = {};
    data[key] = value;
    chrome.storage.local.set(data);
}

function saveAllSettings() {
    chrome.storage.local.set(configs);
}