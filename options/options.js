document.addEventListener("DOMContentLoaded", init);

function init() {
    loadUserConfigs(setupPage);
}

function setupPage(userConfigs) {
    // Elements to translate and set labels for
    const elementsToTranslate = [
        { id: 'keySelection', messageId: 'keySelection' },
        { id: 'searchEngineSelection', messageId: 'searchEngineSelection' },
        { id: 'popupSettings', messageId: 'popupSettings' },
        { id: 'blurEffectSettings', messageId: 'blurEffectSettings' },
        { id: 'blacklist', messageId: 'blacklist' }
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

    // Set modified key
    setModifiedKey();

    // Setup search engine selection
    setupSearchEngineSelection(userConfigs);
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
    if (input.type === 'checkbox') {
        input.checked = userConfig ?? configs[key];
    } else {
        input.value = userConfig ?? configs[key];
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

function setModifiedKey() {
    chrome.storage.local.get('modifiedKey', ({ modifiedKey }) => {
        modifiedKey = modifiedKey ?? 'noneKey';
        document.querySelector(`input[name="modifiedKey"][value="${modifiedKey}"]`).checked = true;
    });

    document.querySelectorAll('input[name="modifiedKey"]').forEach(input => {
        input.addEventListener('change', event => {
            chrome.storage.local.set({ modifiedKey: event.target.value });
        });
    });
}

function setupSearchEngineSelection(userConfigs) {
    const customInput = document.getElementById('customSearchEngine');
    const searchEngines = ['google', 'bing', 'baidu', 'duckduckgo', 'custom', 'searchDisable'];

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
        if (userConfigs.searchEngine === radio.value) {
            radio.checked = true;
            customInput.style.display = engine === 'custom' ? 'block' : 'none';
        }
    });

    // Special handling for initial load if 'custom' is selected
    if (!searchEngines.some(engine => userConfigs.searchEngine === document.getElementById(engine)?.value)) {
        const customRadio = document.getElementById('custom');
        customRadio.checked = true;
        customInput.style.display = 'block';
        customInput.value = userConfigs.searchEngine;
    }
}

