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
    'rememberPopupSizeAndPosition': false,
    'windowType': 'popup',
    'popupWindowsInfo': {},
    'closedByEsc': false,
    'contextItemCreated': false,
    'dragDirections': ['up', 'down', 'right', 'left'],
    'dragPx': 0,
    'imgSupport': false,
    'hoverTimeout': 0,
    'urlCheck': true,
    'popupInBackground': false,
    'doubleTapKeyToSendPageBack': 'None',
    'hoverDisabledUrls': [],
    'hoverImgSupport': false,
    'hoverPopupInBackground': false,
    'hoverSearchEngine': 'https://www.google.com/search?q=%s',
    'hoverModifiedKey': 'None',
    'hoverWindowType': 'popup',
    'triggerAfterDragRelease': true
};

document.addEventListener("DOMContentLoaded", init);

function init() {
    loadUserConfigs(setupPage);
    document.querySelectorAll('.tab-link').forEach(link => {
        link.addEventListener('click', function () {
            const tabId = this.getAttribute('data-tab');

            document.querySelectorAll('.tab-link').forEach(link => {
                link.classList.remove('active');
            });

            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });

            this.classList.add('active');
            document.getElementById(tabId).classList.add('active');

        });
    });

    const userLang = navigator.language || navigator.userLanguage;

    if (userLang.startsWith('zh')) {
        document.querySelector('.align-label-1').style.marginBottom = '4px';
    }

    document.getElementById('exportButton').addEventListener('click', exportSettings);

    document.getElementById('importButton').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });

    document.getElementById('importFile').addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            importSettings(file);
        }
    });


}

function setupPage(userConfigs) {
    userConfigs = userConfigs || {};

    // Elements to translate and set labels for
    const elementsToTranslate = [
        { id: 'searchEngineSelection', messageId: 'searchEngineSelection' },
        { id: 'hoverSearchEngineSelection', messageId: 'searchEngineSelection' },

        { id: 'dragPopupSettings', messageId: 'popupSettings' },
        { id: 'hoverPopupSettings', messageId: 'popupSettings' },
        { id: 'popupSettings', messageId: 'popupSettings' },

        { id: 'blurEffectSettings', messageId: 'blurEffectSettings' },

        { id: 'blacklist', messageId: 'blacklist' },
        { id: 'hoverBlacklist', messageId: 'blacklist' },

        { id: 'dragSettings', messageId: 'dragSettings' },
        { id: 'hoverSettings', messageId: 'hoverSettings' },
        { id: 'searchSettings', messageId: 'searchSettings' },

        { id: 'dragSettingsTab', messageId: 'dragSettings' },
        { id: 'hoverSettingsTab', messageId: 'hoverSettings' },
        { id: 'generalSettingsTab', messageId: 'generalSettingsTab' },

        { id: 'exportImportSettings', messageId: 'exportImportSettings' },
        { id: 'importButton', messageId: 'importButton' },
        { id: 'exportButton', messageId: 'exportButton' }
    ];

    elementsToTranslate.forEach(({ id, messageId }) => setTextContent(id, messageId));

    // Set specific labels
    setInputLabel('custom', 'custom');
    setInputLabel('hoverCustom', 'custom');

    setInputLabel('searchDisable', 'searchDisable');
    setInputLabel('hoverSearchDisable', 'searchDisable');

    setInputLabel('noneKey', 'noneKey');
    setInputLabel('hoverNoneKey', 'noneKey');

    setInputLabel('normal', 'normal');
    setInputLabel('hoverNormal', 'normal');


    setInputLabel('windowType', 'windowType');
    setInputLabel('hoverWindowType', 'windowType');

    setInputLabel('modifiedKey', 'modifiedKey');
    setInputLabel('hoverModifiedKey', 'modifiedKey');

    setInputLabel('dragDirections', 'dragDirections');
    setInputLabel('dragPx', 'dragPx');
    setInputLabel('dragUp', 'dragUp');
    setInputLabel('dragDown', 'dragDown');
    setInputLabel('dragLeft', 'dragLeft');
    setInputLabel('dragRight', 'dragRight');
    setInputLabel('doubleTapKeyToSendPageBack', 'doubleTapKeyToSendPageBack');

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
    initializeTextarea('hoverDisabledUrls', userConfigs);

    initializeSlider('blurPx', userConfigs.blurPx || 3);
    initializeSlider('blurTime', userConfigs.blurTime || 1);
    initializeSlider('dragPx', userConfigs.dragPx || 0);
    initializeSlider('hoverTimeout', userConfigs.hoverTimeout || 0);

    // Initialize drag direction checkboxes
    initializeDragDirectionCheckboxes(userConfigs.dragDirections || configs.dragDirections);

    // Set modified key
    setupModifiedKeySelection(userConfigs.modifiedKey);
    setupHoverModifiedKeySelection(userConfigs.hoverModifiedKey);
    setupDoubleTapKeyToSendPageBackSelection(userConfigs.doubleTapKeyToSendPageBack);

    // Setup search engine selection
    setupSearchEngineSelection(userConfigs.searchEngine);
    setupHoverSearchEngineSelection(userConfigs.hoverSearchEngine);

    // Setup window type selection
    setupWindowTypeSelection(userConfigs.windowType);
    setupHoverWindowTypeSelection(userConfigs.hoverWindowType);

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

function setupHoverSearchEngineSelection(searchEngine) {
    const customInput = document.getElementById('hoverCustomSearchEngine');
    const searchEngines = ['hoverGoogle', 'hoverBing', 'hoverBaidu', 'hoverDuckduckgo', 'hoverCustom', 'hoverSearchDisable', 'hoverWiki', 'hoverYandex'];

    // Ensure the custom input event listener is set up properly
    customInput.addEventListener('input', () => {
        chrome.storage.local.set({ hoverSearchEngine: customInput.value });
    });

    searchEngines.forEach(engine => {
        const radio = document.getElementById(engine);
        radio.addEventListener('change', () => {
            if (radio.checked) {
                let searchEngineValue;
                if (engine === 'hoverCustom') {
                    customInput.style.display = 'block';
                    searchEngineValue = customInput.value;
                } else {
                    customInput.style.display = 'none';
                    searchEngineValue = radio.value;
                }
                chrome.storage.local.set({ hoverSearchEngine: searchEngineValue });
            }
        });

        // Restore saved value on load
        if (searchEngine === radio.value) {
            radio.checked = true;
            customInput.style.display = engine === 'hoverCustom' ? 'block' : 'none';
        }
    });

    // Special handling for initial load if 'custom' is selected
    if (!searchEngines.some(engine => searchEngine === document.getElementById(engine)?.value)) {
        const customRadio = document.getElementById('hoverCustom');
        customRadio.checked = true;
        customInput.style.display = 'block';
        customInput.value = searchEngine;
    }
}



function setupWindowTypeSelection(windowType) {
    windowType = windowType ?? 'popup';
    document.querySelector(`input[name="windowType"][value="${windowType}"]`).checked = true;

    document.querySelectorAll('input[name="windowType"]').forEach(input => {
        input.addEventListener('change', event => {
            const newWindowType = event.target.value;
            chrome.storage.local.set({ windowType: newWindowType }, () => {
                configs.windowType = newWindowType;
            });
        });
    });
}

function setupHoverWindowTypeSelection(windowType) {
    windowType = windowType ?? 'popup';
    document.querySelector(`input[name="hoverWindowType"][value="${windowType}"]`).checked = true;

    document.querySelectorAll('input[name="hoverWindowType"]').forEach(input => {
        input.addEventListener('change', event => {
            const newWindowType = event.target.value;
            chrome.storage.local.set({ hoverWindowType: newWindowType }, () => {
                configs.hoverWindowType = newWindowType;
            });
        });
    });
}

function setupModifiedKeySelection(modifiedKey) {
    modifiedKey = modifiedKey ?? 'None';
    document.querySelector(`input[name="modifiedKey"][value="${modifiedKey}"]`).checked = true;

    document.querySelectorAll('input[name="modifiedKey"]').forEach(input => {
        input.addEventListener('change', event => {
            const newModifiedKey = event.target.value;
            chrome.storage.local.set({ modifiedKey: newModifiedKey }, () => {
                configs.modifiedKey = newModifiedKey;
            });
        });
    });
}

function setupHoverModifiedKeySelection(hoverModifiedKey) {
    hoverModifiedKey = hoverModifiedKey ?? 'None';
    document.querySelector(`input[name="hoverModifiedKey"][value="${hoverModifiedKey}"]`).checked = true;

    document.querySelectorAll('input[name="hoverModifiedKey"]').forEach(input => {
        input.addEventListener('change', event => {
            const newHoverModifiedKey = event.target.value;
            chrome.storage.local.set({ hoverModifiedKey: newHoverModifiedKey }, () => {
                configs.hoverModifiedKey = newHoverModifiedKey;
            });
        });
    });
}

function setupDoubleTapKeyToSendPageBackSelection(doubleTapKeyToSendPageBack) {
    doubleTapKeyToSendPageBack = doubleTapKeyToSendPageBack ?? 'None';
    document.querySelector(`input[name="doubleTapKeyToSendPageBack"][value="${doubleTapKeyToSendPageBack}"]`).checked = true;

    document.querySelectorAll('input[name="doubleTapKeyToSendPageBack"]').forEach(input => {
        input.addEventListener('change', event => {
            const newDoubleTapKeyToSendPageBack = event.target.value;
            chrome.storage.local.set({ doubleTapKeyToSendPageBack: newDoubleTapKeyToSendPageBack }, () => {
                configs.doubleTapKeyToSendPageBack = newDoubleTapKeyToSendPageBack;
            });
        });
    });
}

function initializeDragDirectionCheckboxes(directions) {
    const directionCheckboxes = document.querySelectorAll('input[name="dragDirections"]');
    directionCheckboxes.forEach(checkbox => {
        checkbox.checked = directions.includes(checkbox.value);
        checkbox.addEventListener('change', () => {
            const selectedDirections = Array.from(directionCheckboxes)
                .filter(checkbox => checkbox.checked)
                .map(checkbox => checkbox.value);
            configs.dragDirections = selectedDirections;
            saveConfig('dragDirections', selectedDirections);
        });
    });
}

async function exportSettings() {
    try {
        const allItems = await chrome.storage.local.get(null);
        delete allItems['originWindowId'];
        // Remove any settings that start with 'last'
        for (const key in allItems) {
            if (key.startsWith('last')) {
                delete allItems[key];
            }
        }

        // Check if popupWindowsInfo exists and process it
        if (allItems.popupWindowsInfo) {
            const popupWindowsInfo = allItems.popupWindowsInfo;

            if (popupWindowsInfo.savedPositionAndSize) {
                // Keep only the savedPositionAndSize, remove other information
                allItems.popupWindowsInfo = {
                    savedPositionAndSize: popupWindowsInfo.savedPositionAndSize
                };
            } else {
                // If savedPositionAndSize doesn't exist, set popupWindowsInfo as empty
                allItems.popupWindowsInfo = {};
            }
        }

        const jsonContent = JSON.stringify(allItems);

        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(jsonContent));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const exportData = {
            settings: allItems,
            hash: hashHex
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'settings_backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        console.error('Error exporting settings:', error);
    }
}

async function importSettings(file) {
    try {
        const importData = await readFileAsJSON(file);
        const jsonContent = JSON.stringify(importData.settings);
        const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(jsonContent));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        if (hashHex !== importData.hash) {
            console.error('Hash mismatch! Import aborted.');
            return;
        }

        await chrome.storage.local.set(importData.settings);
        
        // Reload the page to apply the imported settings
        init();
        


    } catch (error) {
        console.error('Error importing settings:', error);
    }
}

function readFileAsJSON(file) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onload = function(event) {
            try {
                const json = JSON.parse(event.target.result);
                resolve(json);
            } catch (error) {
                reject('Error parsing JSON file: ' + error);
            }
        };
        fileReader.onerror = function() {
            reject('Error reading file: ' + fileReader.error);
        };
        fileReader.readAsText(file);
    });
}

function loadUserConfigs(callback) {
    const keys = Object.keys(configs);
    chrome.storage.local.get(keys, function (userConfigs) {
        userConfigs.searchEngine = userConfigs.searchEngine ?? configs.searchEngine;
        userConfigs.modifiedKey = userConfigs.modifiedKey ?? configs.modifiedKey;
        userConfigs.windowType = userConfigs.windowType ?? configs.windowType;


        userConfigs.hoverSearchEngine = userConfigs.hoverSearchEngine ?? configs.hoverSearchEngine;
        userConfigs.hoverModifiedKey = userConfigs.hoverModifiedKey ?? configs.hoverModifiedKey;
        userConfigs.hoverWindowType = userConfigs.hoverWindowType ?? configs.hoverWindowType;

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
