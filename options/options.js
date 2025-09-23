const configs = {
    'closeWhenFocusedInitialWindow': true,
    'closeWhenScrollingInitialWindow': false,
    'sendBackByMiddleClickEnable': false,
    'closedByEsc': false,
    'doubleTapKeyToSendPageBack': 'None',

    'countdownStyle': 'bar',

    'tryOpenAtMousePosition': false,
    'popupHeight': 800,
    'popupWidth': 1000,
    'popupHeightInPercentage': 0,
    'popupWidthInPercentage': 0,

    'modifiedKey': 'None',
    'searchEngine': 'https://www.google.com/search?q=%s',
    'disabledUrls': [],
    'dragDirections': ['up', 'down', 'right', 'left'],
    'dragPx': 0,
    'imgSupport': false,
    'imgSearchEnable': false,
    'popupInBackground': false,
    'dropInEmptyOnly': false,

    'blurEnabled': true,
    'blurPx': 3,
    'blurTime': 1,
    'blurRemoval': true,

    'windowType': 'popup',
    'originWindowId': '',
    'rememberPopupSizeAndPosition': false,
    'rememberPopupSizeAndPositionForDomain': false,
    'popupWindowsInfo': {},

    'urlCheck': true,

    'hoverTimeout': 0,
    'hoverDisabledUrls': [],
    'hoverImgSupport': false,
    'hoverImgSearchEnable': false,
    'hoverPopupInBackground': false,
    'hoverSearchEngine': 'https://www.google.com/search?q=%s',
    'hoverModifiedKey': 'None',
    'hoverWindowType': 'popup',

    'clickModifiedKey': 'None',
    'previewModeDisabledUrls': [],
    'previewModePopupInBackground': false,
    'previewModeWindowType': 'popup',
    'previewModeEnable': false,
    'doubleClickToSwitch': false,
    'doubleClickAsClick': false,

    'holdToPreview': false,
    'holdToPreviewTimeout': 1500,

    'isFirefox': false,

    'linkHint': false,
    'linkDisabledUrls': [],

    'collection': [],
    'collectionEnable': false,

    'searchTooltipsEnable': false,
    'searchTooltipsEngines': `Google=>https://www.google.com/search?q=%s
Bing=>https://www.bing.com/search?q=%s
Baidu=>https://www.baidu.com/s?wd=%s
Yandex=>https://yandex.com/search/?text=%s
DuckduckGo=>https://duckduckgo.com/?q=%s
Wikipedia=>https://wikipedia.org/w/index.php?title=Special:Search&search=%s`,

    'copyButtonPosition': { leftPercent: 10, topPercent: 10 },
    'sendBackButtonPosition': { leftPercent: 10, topPercent: 20 },
    'copyButtonEnable': false,
    'sendBackButtonEnable': false
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

            if (document.querySelector('.tab-link.active').id === 'dragSettingsTab') {

                // Set up for drag search engine
                setupSearchEngineOptions('input[name="searchEngine"]', 'imgSearchOption', 'imgSearchEnable');

            } else if (document.querySelector('.tab-link.active').id === 'hoverSettingsTab') {

                // Set up for hover search engine
                setupSearchEngineOptions('input[name="hoverSearchEngine"]', 'hoverImgSearchOption', 'hoverImgSearchEnable');
            } else if (document.querySelector('.tab-link.active').id === 'previewModeSettingsTab') {

                setupSearchEngineOptions('input[name="clickModifiedKey"]', 'doubleClickToSwitchOption', 'doubleClickToSwitch');
                setupSearchEngineOptions('input[name="clickModifiedKey"]', 'doubleClickAsClickOption', 'doubleClickAsClick');
            }


        });
    });

    const userLang = navigator.language || navigator.userLanguage;

    if (userLang.startsWith('zh')) {
        document.querySelector('.align-label-1').style.marginBottom = '4px';
    }

    document.getElementById('shortcuts').addEventListener('click', () => {
        if (typeof browser !== "undefined" && browser.commands?.openShortcutSettings) {
            // Firefox
            return browser.commands.openShortcutSettings();
        } else if (typeof chrome !== "undefined" && chrome.tabs?.create) {
            // Chrome
            return chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
        } else {
            console.warn("Shortcut settings not supported here.");
        }
    });

    document.getElementById('exportButton').onclick = exportSettings;

    document.getElementById('importButton').onclick = () => {
        document.getElementById('importFile').click();
    };

    document.getElementById('importFile').onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            importSettings(file);
        }
    };

    document.getElementById('imgSearchEnable').addEventListener('change', function () {
        const imgSupportCheckbox = document.getElementById('imgSupport');
        if (this.checked) {
            imgSupportCheckbox.checked = this.checked;
            saveConfig('imgSupport', this.checked);
        }

    });

    document.getElementById('hoverImgSearchEnable').addEventListener('change', function () {
        const hoverImgSupportCheckbox = document.getElementById('hoverImgSupport');
        if (this.checked) {
            hoverImgSupportCheckbox.checked = this.checked;
            saveConfig('hoverImgSupport', this.checked);

        }
    });

    document.getElementById('imgSupport').addEventListener('change', function () {
        const imgSearchEnableCheckbox = document.getElementById('imgSearchEnable');
        if (!this.checked) {
            imgSearchEnableCheckbox.checked = this.checked;
            saveConfig('imgSearchEnable', this.checked);
        }

    });

    document.getElementById('hoverImgSupport').addEventListener('change', function () {
        const hoverImgSearchEnableCheckbox = document.getElementById('hoverImgSearchEnable');
        if (!this.checked) {
            hoverImgSearchEnableCheckbox.checked = this.checked;
            saveConfig('hoverImgSearchEnable', this.checked);

        }
    });



    document.getElementById('hoverTimeout').addEventListener('change', function () {
        const linkHintCheckbox = document.getElementById('linkHint');
        const hoverTimeoutValue = this.value; // Get the slider value
        if (parseInt(hoverTimeoutValue, 10) !== 0) {
            linkHintCheckbox.checked = false;
            linkHintCheckbox.disabled = true;  // Gray out the checkbox
            saveConfig('linkHint', false);

            addGreenDot("hover_settings")
        } else {
            linkHintCheckbox.disabled = false;  // reset the checkbox

            removeGreenDot("hover_settings")
        }
    });


    document.getElementById('previewModeEnable').addEventListener('change', function () {
        const holdToPreviewCheckbox = document.getElementById('holdToPreview');
        const doubleClickToSwitchCheckbox = document.getElementById('doubleClickToSwitch');
        const doubleClickAsClickCheckbox = document.getElementById('doubleClickAsClick');

        if (this.checked) {
            holdToPreviewCheckbox.checked = false;
            holdToPreviewCheckbox.disabled = true;  // Gray out the checkbox
            saveConfig('holdToPreview', false);

            doubleClickToSwitchCheckbox.disabled = false;  // reset the checkbox
            doubleClickAsClickCheckbox.disabled = false;  // reset the checkbox

            addGreenDot("previewMode_settings")
        } else {
            holdToPreviewCheckbox.disabled = false;  // reset the checkbox

            doubleClickToSwitchCheckbox.checked = false;
            doubleClickToSwitchCheckbox.disabled = true;  // Gray out the checkbox
            saveConfig('doubleClickToSwitch', false);

            doubleClickAsClickCheckbox.checked = false;
            doubleClickAsClickCheckbox.disabled = true;  // Gray out the checkbox
            saveConfig('doubleClickAsClick', false);

            removeGreenDot("previewMode_settings")
        }
    });

    document.getElementById('holdToPreview').addEventListener('change', function () {
        if (this.checked) {
            addGreenDot("previewMode_settings")
        } else {
            removeGreenDot("previewMode_settings")
        }
    });

    document.querySelectorAll('input[name="dragDirections"]').forEach(checkbox => {
        checkbox.addEventListener('change', function () {
            if (isAnyDirectionChecked()) {
                addGreenDot("drag_settings");
            } else {
                removeGreenDot("drag_settings");
            }
        });
    });
}

// Function to check if any checkbox is checked
function isAnyDirectionChecked() {
    return Array.from(document.querySelectorAll('input[name="dragDirections"]')).some(checkbox => checkbox.checked);
}

// Function to set up the visibility toggle for image search options
function setupSearchEngineOptions(engineSelector, imgOptionId, configKey) {
    const searchEngines = document.querySelectorAll(engineSelector);
    const imgSearchOption = document.getElementById(imgOptionId);

    const allowedEngines = ["google", "bing", "baidu", "yandex", "hoverGoogle", "hoverBing", "hoverBaidu", "hoverYandex", "clickNoneKey"];
    searchEngines.forEach(radio => {
        radio.addEventListener('change', function () {
            if (allowedEngines.includes(this.id)) {
                imgSearchOption.style.display = 'block';
            } else {
                imgSearchOption.style.display = 'none';
                saveConfig(configKey, false);
            }
        });
    });

    // Initial check to set visibility based on the selected search engine
    const checkedRadio = document.querySelector(`${engineSelector}:checked`);
    if (checkedRadio) {
        checkedRadio.dispatchEvent(new Event('change'));
    }
}

function setupPage(userConfigs) {
    userConfigs = userConfigs || {};
    // Elements to translate and set labels for
    const elementsToTranslate = [
        { id: 'searchEngineSelection', messageId: 'searchEngineSelection' },
        { id: 'hoverSearchEngineSelection', messageId: 'searchEngineSelection' },

        { id: 'linkSettings', messageId: 'linkSettings' },
        { id: 'dragPopupSettings', messageId: 'popupSettings' },
        { id: 'hoverPopupSettings', messageId: 'popupSettings' },
        { id: 'previewModePopupSettings', messageId: 'popupSettings' },
        { id: 'popupSettings', messageId: 'popupSettings' },

        { id: 'closeTrigger', messageId: 'closeTrigger' },
        { id: 'button', messageId: 'button' },
        { id: 'note', messageId: 'note' },
        { id: 'staticSize', messageId: 'staticSize' },
        { id: 'percentageSize', messageId: 'percentageSize' },

        { id: 'blurEffectSettings', messageId: 'blurEffectSettings' },

        { id: 'blacklist', messageId: 'blacklist' },
        { id: 'hoverBlacklist', messageId: 'blacklist' },
        { id: 'previewModeBlacklist', messageId: 'blacklist' },

        { id: 'dragSettings', messageId: 'dragSettings' },
        { id: 'hoverSettings', messageId: 'hoverSettings' },
        { id: 'previewModeSettings', messageId: 'previewModeSettings' },
        { id: 'searchSettings', messageId: 'searchSettings' },
        { id: 'holdToPreviewSettings', messageId: 'holdToPreviewSettings' },

        { id: 'dragSettingsTab', messageId: 'dragSettings' },
        { id: 'hoverSettingsTab', messageId: 'hoverSettings' },
        { id: 'previewModeSettingsTab', messageId: 'previewModeSettings' },
        { id: 'generalSettingsTab', messageId: 'generalSettingsTab' },

        { id: 'exportImportSettings', messageId: 'exportImportSettings' },
        { id: 'importButton', messageId: 'importButton' },
        { id: 'exportButton', messageId: 'exportButton' },

        { id: 'shortcuts', messageId: 'shortcuts' }
    ];

    elementsToTranslate.forEach(({ id, messageId }) => setTextContent(id, messageId));

    // Set specific labels
    setInputLabel('custom', 'custom');
    setInputLabel('hoverCustom', 'custom');

    setInputLabel('searchDisable', 'searchDisable');
    setInputLabel('hoverSearchDisable', 'searchDisable');

    setInputLabel('noneKey', 'noneKey');
    setInputLabel('hoverNoneKey', 'noneKey');
    setInputLabel('dragNoneKey', 'noneKey');
    setInputLabel('clickNoneKey', 'noneKey');

    setInputLabel('normal', 'normal');
    setInputLabel('hoverNormal', 'normal');
    setInputLabel('previewModeNormal', 'normal');


    setInputLabel('windowType', 'windowType');
    setInputLabel('hoverWindowType', 'windowType');
    setInputLabel('previewModeWindowType', 'windowType');

    setInputLabel('modifiedKey', 'modifiedKey');
    setInputLabel('hoverModifiedKey', 'modifiedKey');
    setInputLabel('clickModifiedKey', 'modifiedKey');

    setInputLabel('dragDirections', 'dragDirections');
    setInputLabel('dragPx', 'dragPx');
    setInputLabel('dragUp', 'dragUp');
    setInputLabel('dragDown', 'dragDown');
    setInputLabel('dragLeft', 'dragLeft');
    setInputLabel('dragRight', 'dragRight');
    setInputLabel('doubleTapKeyToSendPageBack', 'doubleTapKeyToSendPageBack');

    setInputLabel('countdownStyle', 'countdownStyle');
    setInputLabel('circle', 'circle');
    setInputLabel('bar', 'bar');

    // Initialize input elements
    Object.keys(configs).forEach(key => {
        const input = document.getElementById(key);
        if (input) {
            initializeInput(input, key, userConfigs[key]);
            addInputListener(input, key);
        }
    });

    initializeTextareaForSearchTooltips('searchTooltipsEngines', userConfigs);

    // Initialize textarea and sliders
    initializeTextarea('disabledUrls', userConfigs);
    initializeTextarea('linkDisabledUrls', userConfigs);
    initializeTextarea('hoverDisabledUrls', userConfigs);
    initializeTextarea('previewModeDisabledUrls', userConfigs);

    initializeSlider('blurPx', userConfigs.blurPx || 3);
    initializeSlider('blurTime', userConfigs.blurTime || 1);
    initializeSlider('dragPx', userConfigs.dragPx || 0);
    initializeSlider('hoverTimeout', userConfigs.hoverTimeout || 0);
    initializeSlider('holdToPreviewTimeout', userConfigs.holdToPreviewTimeout || 1500);

    // Initialize drag direction checkboxes
    initializeDragDirectionCheckboxes(userConfigs.dragDirections || configs.dragDirections);

    // Set modified key
    setupModifiedKeySelection(userConfigs.modifiedKey);
    setupHoverModifiedKeySelection(userConfigs.hoverModifiedKey);
    setupClickModifiedKeySelection(userConfigs.clickModifiedKey);
    setupDoubleTapKeyToSendPageBackSelection(userConfigs.doubleTapKeyToSendPageBack);


    setupCountdownStyleSelection(userConfigs.countdownStyle);

    // Setup search engine selection
    setupSearchEngineSelection(userConfigs.searchEngine);
    setupHoverSearchEngineSelection(userConfigs.hoverSearchEngine);

    // Setup window type selection
    setupWindowTypeSelection(userConfigs.windowType);
    setupHoverWindowTypeSelection(userConfigs.hoverWindowType);
    setupPreviewModeWindowTypeSelection(userConfigs.previewModeWindowType);

    const holdToPreviewCheckbox = document.getElementById('holdToPreview');
    const doubleClickToSwitchCheckbox = document.getElementById('doubleClickToSwitch');
    const doubleClickAsClickCheckbox = document.getElementById('doubleClickAsClick');
    if (userConfigs.previewModeEnable) {
        holdToPreviewCheckbox.checked = false;
        holdToPreviewCheckbox.disabled = true;  // Gray out the checkbox
        saveConfig('holdToPreview', false);

        doubleClickToSwitchCheckbox.disabled = false;  // reset the checkbox
        doubleClickAsClickCheckbox.disabled = false;  // reset the checkbox
    } else {
        holdToPreviewCheckbox.disabled = false;  // reset the checkbox

        doubleClickToSwitchCheckbox.checked = false;
        doubleClickToSwitchCheckbox.disabled = true;  // Gray out the checkbox
        saveConfig('doubleClickToSwitch', false);

        doubleClickAsClickCheckbox.checked = false;
        doubleClickAsClickCheckbox.disabled = true;  // Gray out the checkbox
        saveConfig('doubleClickAsClick', false);
    }

    if (userConfigs.hoverTimeout !== undefined && userConfigs.hoverTimeout !== "0" && userConfigs.hoverTimeout !== 0) {
        addGreenDot("hover_settings");
    } else {
        removeGreenDot("hover_settings");
    }

    if (userConfigs.previewModeEnable || userConfigs.holdToPreview) {
        addGreenDot("previewMode_settings");
    } else {
        removeGreenDot("previewMode_settings");
    }

    if (userConfigs.dragDirections === undefined || userConfigs.dragDirections.length !== 0) {
        addGreenDot("drag_settings");
    } else {
        removeGreenDot("drag_settings");
    }
}

// Function to add the CSS for the green dot dynamically
function addGreenDotStyles() {
    const styleId = "green-dot-styles";
    if (!document.getElementById(styleId)) {
        const style = document.createElement("style");
        style.id = styleId;
        style.textContent = `
            .green-dot {
                display: inline-block;
                width: 5px;
                height: 5px;
                background: #71E346;
                border: none;
                border-radius: 50%;
                margin-right: 5%;
                margin-bottom: 0.15em;
                opacity: 0;
                transform: scale(0.5);
                transition: opacity 0.3s ease, transform 0.3s ease;
                box-shadow:
                    0 0 5px 2px rgba(113, 227, 70, 0.9),
                    0 0 3px 1px rgba(113, 227, 70, 0.9);
            }
            .green-dot.visible {
                opacity: 1;
                transform: scale(1);
            }
        `;
        document.head.appendChild(style);
    }
}


function addGreenDot(dataTab) {
    addGreenDotStyles(); // Ensure styles are added

    const tabElement = document.querySelector(`.tab-link[data-tab="${dataTab}"]`);
    if (tabElement) {
        // Check if the green dot already exists
        const existingDot = tabElement.querySelector(".green-dot");
        if (!existingDot) {
            // Create the green dot element
            const greenDot = document.createElement("span");
            greenDot.classList.add("green-dot");

            // Insert the green dot as the first child (before the text)
            tabElement.insertBefore(greenDot, tabElement.firstChild);

            // Trigger the animation by adding the visible class
            requestAnimationFrame(() => {
                greenDot.classList.add("visible");
            });
        }
    }
}


function removeGreenDot(dataTab) {
    const tabElement = document.querySelector(`.tab-link[data-tab="${dataTab}"]`);
    if (tabElement) {
        const existingDot = tabElement.querySelector(".green-dot");
        if (existingDot) {
            // Remove the visible class to start the fade-out animation
            existingDot.classList.remove("visible");

            // Wait for the transition to complete before removing the element
            setTimeout(() => {
                existingDot.remove();
            }, 300); // Match the transition duration
        }
    }
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
        lines = (userConfigs[textareaId] ?? configs[textareaId]).join('\n');
        textarea.value = (Array.isArray(lines) ? lines.join('\n') : lines).replace(/\n*$/, '') + '\n';
        textarea.addEventListener('input', () => {
            configs[textareaId] = textarea.value.split('\n').filter(line => line.trim());
            saveAllSettings();
        });
    }
}

function initializeTextareaForSearchTooltips(textareaId, userConfigs) {
    const textarea = document.getElementById(textareaId);
    if (textarea) {
        // Initialize with userConfigs or fallback to default configs
        lines = userConfigs[textareaId] ?? configs[textareaId];
        textarea.value = (Array.isArray(lines) ? lines.join('\n') : lines).replace(/\n*$/, '') + '\n';
        // Save changes on input
        textarea.addEventListener('input', () => {
            configs[textareaId] = textarea.value.trim(); // Store as a multiline string
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

    if (id === 'hoverTimeout') {
        const linkHintCheckbox = document.getElementById('linkHint');

        chrome.storage.local.get(['hoverTimeout'], (data) => {
            const hoverTimeout = typeof data.hoverTimeout !== 'undefined' ? parseInt(data.hoverTimeout, 10) : 0;

            if (hoverTimeout !== 0) {
                linkHintCheckbox.checked = false;
                linkHintCheckbox.disabled = true;  // Gray out the checkbox
                saveConfig('linkHint', false);
            } else {
                linkHintCheckbox.disabled = false;  // Reset the checkbox
            }
        });
    }

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

function setupPreviewModeWindowTypeSelection(windowType) {
    windowType = windowType ?? 'popup';
    document.querySelector(`input[name="previewModeWindowType"][value="${windowType}"]`).checked = true;

    document.querySelectorAll('input[name="previewModeWindowType"]').forEach(input => {
        input.addEventListener('change', event => {
            const newPreviewModeWindowType = event.target.value;
            chrome.storage.local.set({ previewModeWindowType: newPreviewModeWindowType }, () => {
                configs.previewModeWindowType = newPreviewModeWindowType;
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


function setupClickModifiedKeySelection(clickModifiedKey) {
    clickModifiedKey = clickModifiedKey ?? 'None';
    document.querySelector(`input[name="clickModifiedKey"][value="${clickModifiedKey}"]`).checked = true;

    document.querySelectorAll('input[name="clickModifiedKey"]').forEach(input => {
        input.addEventListener('change', event => {
            const newClickModifiedKey = event.target.value;
            chrome.storage.local.set({ clickModifiedKey: newClickModifiedKey }, () => {
                configs.clickModifiedKey = newClickModifiedKey;
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

function setupCountdownStyleSelection(countdownStyle) {
    countdownStyle = countdownStyle ?? 'bar';
    document.querySelector(`input[name="countdownStyle"][value="${countdownStyle}"]`).checked = true;
    document.querySelectorAll('input[name="countdownStyle"]').forEach(input => {
        input.addEventListener('change', event => {
            const newCountdownStyle = event.target.value;
            chrome.storage.local.set({ countdownStyle: newCountdownStyle }, () => {
                configs.countdownStyle = newCountdownStyle;
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
        
        // If popupWindowsInfo has more than just savedPositionAndSize, keep only that
        if (allItems.popupWindowsInfo
            && typeof allItems.popupWindowsInfo === "object"
            && Object.keys(allItems.popupWindowsInfo).length > 1) {
            allItems.popupWindowsInfo = {
                savedPositionAndSize: allItems.popupWindowsInfo.savedPositionAndSize
            };
        }

        const keep = confirm(chrome.i18n.getMessage("confirm"));
        // Check if popupWindowsInfo exists and process it
        if (!keep) { allItems.popupWindowsInfo = {}; }

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

        const now = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
        const withWindowsInfo = keep ? 'Settings-withWindowsInfo' : 'Settings';
        a.download = `PeekPop_${withWindowsInfo}_${dateStr}.json`;

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
        const keep = confirm(chrome.i18n.getMessage("confirm"));
        // Load user configs and handle Firefox-specific settings
        try {
            const browserInfo = await new Promise((resolve, reject) => {
                chrome.runtime.getBrowserInfo((info) => {
                    if (chrome.runtime.lastError) {
                        reject(chrome.runtime.lastError);
                    } else {
                        resolve(info);
                    }
                });
            });

            if (browserInfo.name !== 'Firefox') {
                // Remove specific keys from the settings for Firefox
                delete importData.settings.enableContainerIdentify;
                delete importData.settings.dragStartEnable;
            }
        } catch (error) {
            // console.error('Error getting browser info:', error);
        }


        if (importData.settings.popupWindowsInfo
            && typeof importData.settings.popupWindowsInfo === "object"
            && Object.keys(importData.settings.popupWindowsInfo).length > 1) {
            importData.settings.popupWindowsInfo = {
                savedPositionAndSize: importData.settings.popupWindowsInfo.savedPositionAndSize
            };
        }

        if (!keep) { delete importData.settings.popupWindowsInfo; }

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
        fileReader.onload = function (e) {
            try {
                const json = JSON.parse(e.target.result);
                resolve(json);
            } catch (error) {
                reject('Error parsing JSON file: ' + error);
            }
        };
        fileReader.onerror = function () {
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
        userConfigs.clickrModifiedKey = userConfigs.clickModifiedKey ?? configs.clickModifiedKey;
        userConfigs.hoverWindowType = userConfigs.hoverWindowType ?? configs.hoverWindowType;

        userConfigs.previewModeWindowType = userConfigs.previewModeWindowType ?? configs.previewModeWindowType;

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
