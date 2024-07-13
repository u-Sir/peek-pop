document.addEventListener("DOMContentLoaded", init);

async function init() {
    const userConfigs = await loadUserConfigs();
    setupPage(userConfigs);
}

function setupPage(userConfigs = {}) {
    const elementsToTranslate = [
        'keySelection', 'searchEngineSelection', 'popupSettings', 'blurEffectSettings', 'blacklist'
    ];

    elementsToTranslate.forEach(id => setTextContent(id, id));
    ['custom', 'searchDisable', 'noneKey'].forEach(id => setInputLabel(id, id));

    Object.keys(configs).forEach(key => {
        const input = document.getElementById(key);
        if (input) {
            initializeInput(input, key, userConfigs[key]);
            addInputListener(input, key);
        }
    });

    initializeTextarea('disabledUrls', userConfigs);
    initializeSlider('blurPx', userConfigs.blurPx ?? 3);
    initializeSlider('blurTime', userConfigs.blurTime ?? 1);
    setModifiedKey(userConfigs.modifiedKey);
    setupSearchEngineSelection(userConfigs.searchEngine);
}

function setTextContent(elementId, messageId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = chrome.i18n.getMessage(messageId);
    }
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
        const value = input.type === 'checkbox' ? input.checked : input.value;
        saveSingleSetting(key, value);
    });
}

function initializeTextarea(textareaId, userConfigs) {
    const textarea = document.getElementById(textareaId);
    if (textarea) {
        textarea.value = (userConfigs[textareaId] ?? configs[textareaId]).join('\n');
        textarea.addEventListener('input', () => {
            const value = textarea.value.split('\n').filter(line => line.trim());
            saveSingleSetting(textareaId, value);
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
        const value = input.value;
        output.textContent = value;
        localStorage.setItem(id, value);
        saveSingleSetting(id, value);
    });
}

function setModifiedKey(modifiedKey = 'noneKey') {
    const modifiedKeyInput = document.querySelector(`input[name="modifiedKey"][value="${modifiedKey}"]`);
    if (modifiedKeyInput) {
        modifiedKeyInput.checked = true;
    }

    document.querySelectorAll('input[name="modifiedKey"]').forEach(input => {
        input.addEventListener('change', event => {
            saveSingleSetting('modifiedKey', event.target.value);
        });
    });
}

function setupSearchEngineSelection(searchEngine) {
    const customInput = document.getElementById('customSearchEngine');
    const searchEngines = ['google', 'bing', 'baidu', 'yandex', 'wiki', 'duckduckgo', 'custom', 'searchDisable'];

    customInput.addEventListener('input', () => {
        saveSingleSetting('searchEngine', customInput.value);
    });

    searchEngines.forEach(engine => {
        const radio = document.getElementById(engine);
        radio.addEventListener('change', () => {
            if (radio.checked) {
                const searchEngineValue = engine === 'custom' ? customInput.value : radio.value;
                customInput.style.display = engine === 'custom' ? 'block' : 'none';
                saveSingleSetting('searchEngine', searchEngineValue);
            }
        });

        if (searchEngine === radio.value) {
            radio.checked = true;
            customInput.style.display = engine === 'custom' ? 'block' : 'none';
        }
    });

    if (!searchEngines.some(engine => searchEngine === document.getElementById(engine)?.value)) {
        const customRadio = document.getElementById('custom');
        if (customRadio) {
            customRadio.checked = true;
            customInput.style.display = 'block';
            customInput.value = searchEngine;
        }
    }
}

async function loadUserConfigs() {
    const keys = Object.keys(configs);
    return new Promise(resolve => {
        chrome.storage.local.get(keys, userConfigs => {
            Object.keys(configs).forEach(key => {
                if (userConfigs[key] === undefined) {
                    userConfigs[key] = configs[key];
                }
            });
            resolve(userConfigs);
        });
    });
}

function saveAllSettings() {
    debounce(() => {
        chrome.storage.local.set(configs);
    }, 300)();
}

function saveSingleSetting(key, value) {
    configs[key] = value;
    debounce(() => {
        chrome.storage.local.set({ [key]: value });
    }, 300)();
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
