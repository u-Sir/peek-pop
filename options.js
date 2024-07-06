document.addEventListener("DOMContentLoaded", init);

function init() {
    loadUserConfigs(userConfigs => {
        // Set text content for labels
        setTextContent('keySelection');
        setTextContent('dragSensetive');
        setTextContent('timeThresholdLabel', 'timeThreshold');
        setTextContent('dragThresholdLabel', 'dragThreshold');

        // Initialize input elements
        Object.keys(configs).forEach(key => {
            let input = document.getElementById(key);
            if (input) {
                initializeInput(input, key, userConfigs[key]);
                addInputListener(input, key);
            }
        });

        initializeTextarea('disabledUrls', userConfigs);

        initializeSlider('blurPx', 3);
        initializeSlider('blurTime', 1);
        initializeSlider('timeThreshold', 300);
        initializeSlider('dragThreshold', 10);

        setModifiedKey();
    });
}

function setTextContent(elementId, messageId = elementId) {
    document.getElementById(elementId).textContent = chrome.i18n.getMessage(messageId);
}

function initializeInput(input, key, userConfig) {
    input.value = userConfig ?? configs[key];
    if (input.type === 'checkbox') {
        input.checked = userConfig ?? configs[key];
    }

    let label = input.parentNode.querySelector('label') || createLabel(input, key);
    label.textContent = chrome.i18n.getMessage(key);
}

function createLabel(input, key) {
    let label = document.createElement('label');
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
    let textarea = document.getElementById(textareaId);
    if (textarea) {
        textarea.value = userConfigs[textareaId]?.join('\n') ?? configs[textareaId].join('\n');
        textarea.addEventListener('input', () => {
            configs[textareaId] = textarea.value.split('\n').filter(line => line.trim());
            saveAllSettings();
        });
    }
}

function initializeSlider(id, defaultValue) {
    let input = document.getElementById(id);
    let output = document.getElementById(`${id}Output`);
    let initialValue = localStorage.getItem(id) || defaultValue;

    input.value = initialValue;
    output.textContent = initialValue;

    input.addEventListener('input', () => {
        output.textContent = input.value;
        localStorage.setItem(id, input.value);
    });
}

function setModifiedKey() {
    chrome.storage.local.get('modifiedKey', data => {
        let modifiedKey = data.modifiedKey || 'noneKey';
        document.querySelector(`input[name="modifiedKey"][value="${modifiedKey}"]`).checked = true;
    });

    document.querySelectorAll('input[name="modifiedKey"]').forEach(input => {
        input.addEventListener('change', event => {
            chrome.storage.local.set({ modifiedKey: event.target.value });
        });
    });
}
