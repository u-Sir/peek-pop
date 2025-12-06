const configs = {
    'closeWhenFocusedInitialWindow': true,
    'closeWhenScrollingInitialWindow': false,
    'sendBackByMiddleClickEnable': false,
    'closedByEsc': false,
    'doubleTapKeyToSendPageBack': 'None',

    'countdownStyle': 'bar',

    'windowType': 'popup',
    'popupWindowsInfo': {},
    'originWindowId': '',

    'rememberPopupSizeAndPosition': false,
    'rememberPopupSizeAndPositionForDomain': false,

    'tryOpenAtMousePosition': false,
    'popupHeight': 800,
    'popupWidth': 1000,
    'popupHeightInPercentage': 0,
    'popupWidthInPercentage': 0,

    'blurEnabled': true,
    'blurPx': 3,
    'blurTime': 1,
    'blurRemoval': true,

    'modifiedKey': 'None',
    'dragDirections': [],
    'dragPx': 0,
    'searchEngine': 'https://www.google.com/search?q=%s',
    'disabledUrls': [],
    'dragStartEnable': false,
    'dropInEmptyOnly': false,
    'imgSupport': false,
    'imgSearchEnable': false,

    'urlCheck': true,

    'hoverTimeout': 0,
    'hoverDisabledUrls': [],
    'hoverImgSupport': false,
    'hoverSearchEngine': 'https://www.google.com/search?q=%s',
    'hoverModifiedKey': 'None',
    'hoverWindowType': 'popup',
    'hoverImgSearchEnable': false,

    'clickModifiedKey': 'None',
    'previewModeDisabledUrls': [],
    'previewModeWindowType': 'popup',
    'previewModeEnable': false,
    'doubleClickToSwitch': false,
    'doubleClickAsClick': false,

    'dbclickToPreview': true,
    'dbclickToPreviewTimeout': 250,

    'holdToPreview': false,
    'holdToPreviewTimeout': 1500,

    'isFirefox': false,
    'enableContainerIdentify': true,

    'linkHint': false,
    'linkDisabledUrls': [],

    'collection': [],
    'collectionEnable': false,

    'searchWindowType': 'normal',
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
        document.querySelector('.align-label-1').style.marginBottom = '-2px';
        // Apply styles to labels following radio buttons
        document.querySelectorAll('input[type="radio"] + label').forEach(function (label) {
            label.style.verticalAlign = '1.5%';
            label.style.marginRight = '10px';
        });

        // Apply styles to labels following checkboxes
        document.querySelectorAll('input[type="checkbox"] + label').forEach(function (label) {
            label.style.verticalAlign = '2.5%';
            label.style.marginLeft = '4px';
            label.style.marginRight = '20px';
        });

    }

    document.getElementById('shortcuts').addEventListener('click', () => {
        if (typeof browser !== "undefined" && browser.commands?.openShortcutSettings) {
            // Firefox
            browser.commands.openShortcutSettings();
            window.close();

        } else if (typeof chrome !== "undefined" && chrome.tabs?.create) {
            // Chrome
            chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
        } else {
            console.warn("Shortcut settings not supported here.");
        }
    });

    document.getElementById("githubLink").addEventListener("click", () => {
        setTimeout(() => window.close(), 100); // closes the popup
    });

    // Check if the current context is the popup
    const views = browser.extension.getViews({ type: "popup" });

    // If the view is a popup, hide the import/export block
    if (views.length > 0) {

        // Hide the elements by setting display: none
        document.getElementById('exportImportSettings').style.display = 'none';
        document.getElementById('importFile').style.display = 'none';
        document.getElementById('importButton').style.display = 'none';
        document.getElementById('exportButton').style.display = 'none';
    }

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
        if (this.checked) {

            addGreenDot("previewMode_settings")
        } else {
            removeGreenDot("previewMode_settings")
        }
        updatePreviewCheckboxes(this.checked);
    });

    document.getElementById('dbclickToPreview').addEventListener('change', function () {
        if (this.checked) {
            addGreenDot("previewMode_settings")
        } else {
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

    document.getElementById('dragStartEnable').addEventListener('change', function () {
        const isCheck = this.checked;
        document.querySelectorAll('input[name="dragDirections"]').forEach(checkbox => {
            if (isCheck) {
                // set all checkboxes greyed out
                checkbox.disabled = true;
                addGreenDot("drag_settings");
            } else {
                checkbox.disabled = false;
                if (!isAnyDirectionChecked()) {
                    removeGreenDot("drag_settings");
                }

            }
        });
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

        { id: 'styleSettings', messageId: 'styleSettings' },
        { id: 'toolsSettings', messageId: 'toolsSettings' },
        { id: 'linkSettings', messageId: 'linkSettings' },
        { id: 'dragPopupSettings', messageId: 'popupSettings' },
        { id: 'hoverPopupSettings', messageId: 'popupSettings' },
        { id: 'previewModePopupSettings', messageId: 'popupSettings' },
        { id: 'popupSettings', messageId: 'popupSettings' },

        { id: 'sendBackTrigger', messageId: 'sendBackTrigger' },
        { id: 'closeTrigger', messageId: 'closeTrigger' },
        { id: 'button', messageId: 'button' },
        { id: 'note', messageId: 'note' },
        { id: 'staticSize', messageId: 'staticSize' },
        { id: 'percentageSize', messageId: 'percentageSize' },

        { id: 'blacklist', messageId: 'blacklist' },
        { id: 'hoverBlacklist', messageId: 'blacklist' },
        { id: 'previewModeBlacklist', messageId: 'blacklist' },

        { id: 'dragSettings', messageId: 'dragSettings' },
        { id: 'hoverSettings', messageId: 'hoverSettings' },
        { id: 'previewModeSettings', messageId: 'previewModeSettings' },
        { id: 'holdToPreviewSettings', messageId: 'holdToPreviewSettings' },
        { id: 'dbclickToPreviewSettings', messageId: 'dbclickToPreviewSettings' },

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
    setInputLabel('searchNormal', 'normal');


    setInputLabel('windowType', 'windowType');
    setInputLabel('hoverWindowType', 'windowType');
    setInputLabel('previewModeWindowType', 'windowType');
    setInputLabel('searchWindowType', 'windowType');

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
    initializeSlider('dbclickToPreviewTimeout', userConfigs.dbclickToPreviewTimeout || 250);

    // Initialize drag direction checkboxes
    initializeDragDirectionCheckboxes(userConfigs.dragDirections || configs.dragDirections);

    // Set modified key
    setupModifiedKeySelection("modifiedKey", userConfigs.modifiedKey);
    setupModifiedKeySelection("hoverModifiedKey", userConfigs.hoverModifiedKey);
    setupModifiedKeySelection("clickModifiedKey", userConfigs.clickModifiedKey);
    setupModifiedKeySelection("doubleTapKeyToSendPageBack", userConfigs.doubleTapKeyToSendPageBack);

    // Set countdown style
    setupCountdownStyleSelection(userConfigs.countdownStyle);

    // Setup search engine selection
    setupSearchEngineSelection(userConfigs.searchEngine);
    setupSearchEngineSelection(userConfigs.hoverSearchEngine, true);

    // Setup window type selection
    setupWindowTypeSelection("windowType", userConfigs.windowType);
    setupWindowTypeSelection("hoverWindowType", userConfigs.hoverWindowType);
    setupWindowTypeSelection("previewModeWindowType", userConfigs.previewModeWindowType);
    setupWindowTypeSelection("searchWindowType", userConfigs.searchWindowType);

    updatePreviewCheckboxes(userConfigs.previewModeEnable);

    if (userConfigs.hoverTimeout !== undefined && userConfigs.hoverTimeout !== "0" && userConfigs.hoverTimeout !== 0) {
        addGreenDot("hover_settings");
    } else {
        removeGreenDot("hover_settings");
    }

    if (userConfigs.previewModeEnable || userConfigs.holdToPreview || userConfigs.dbclickToPreview) {
        addGreenDot("previewMode_settings");
    } else {
        removeGreenDot("previewMode_settings");
    }

    if (userConfigs.dragDirections === undefined || userConfigs.dragDirections.length !== 0) {
        addGreenDot("drag_settings");
    } else {
        removeGreenDot("drag_settings");
    }
    const groups = [
        { checkbox: "searchTooltipsEnable", group: "searchTooltipsGroup" },
        { checkbox: "blurEnabled", group: "blurEffectGroup" }
    ];

    groups.forEach(({ checkbox, group }) => {
        const cb = document.getElementById(checkbox);
        const grp = document.getElementById(group);

        function update() {
            grp.style.display = cb.checked ? "block" : "none";
        }

        update();

        cb.addEventListener("change", update);
    });
}

function updatePreviewCheckboxes(isPreviewModeEnabled) {
    const checkboxes = {
        dbclickToPreview: document.getElementById('dbclickToPreview'),
        holdToPreview: document.getElementById('holdToPreview'),
        doubleClickToSwitch: document.getElementById('doubleClickToSwitch'),
        doubleClickAsClick: document.getElementById('doubleClickAsClick')
    };

    const setState = (id, { checked, disabled, save = true }) => {
        const el = checkboxes[id];
        if (!el) return;
        el.checked = checked;
        el.disabled = disabled;
        if (save) saveConfig(id, checked);
    };

    if (isPreviewModeEnabled) {
        // Disable drag/hold preview options
        setState('dbclickToPreview', { checked: false, disabled: true });
        setState('holdToPreview', { checked: false, disabled: true });

        // Enable double-click options
        setState('doubleClickToSwitch', { checked: checkboxes.doubleClickToSwitch.checked, disabled: false, save: false });
        setState('doubleClickAsClick', { checked: checkboxes.doubleClickAsClick.checked, disabled: false, save: false });
    } else {
        // Enable drag/hold preview options
        setState('dbclickToPreview', { checked: checkboxes.dbclickToPreview.checked, disabled: false, save: false });
        setState('holdToPreview', { checked: checkboxes.holdToPreview.checked, disabled: false, save: false });

        // Disable double-click options
        setState('doubleClickToSwitch', { checked: false, disabled: true });
        setState('doubleClickAsClick', { checked: false, disabled: true });
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
    console.log(`Setting text content for elementId: ${elementId} with messageId: ${messageId}`);
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


function setupSearchEngineSelection(searchEngine, isHover = false) {

    const customSearchEngineId = isHover ? 'hoverCustomSearchEngine' : 'customSearchEngine';
    const customInput = document.getElementById(customSearchEngineId);
    const searchEngines = isHover ? ['hoverGoogle', 'hoverBing', 'hoverBaidu', 'hoverDuckduckgo', 'hoverCustom', 'hoverSearchDisable', 'hoverWiki', 'hoverYandex']
        : ['google', 'bing', 'baidu', 'duckduckgo', 'custom', 'searchDisable', 'wiki', 'yandex'];

    // Ensure the custom input event listener is set up properly
    customInput.addEventListener('input', () => {
        // ishover is true the use hoverSearchEngine key,else use searchEngine key
        chrome.storage.local.set({ [isHover ? 'hoverSearchEngine' : 'searchEngine']: customInput.value });
    });
    const customID = isHover ? 'hoverCustom' : 'custom';
    searchEngines.forEach(engine => {
        const radio = document.getElementById(engine);
        radio.addEventListener('change', () => {
            if (radio.checked) {
                let searchEngineValue;
                if (engine === customID) {
                    customInput.style.display = 'block';
                    searchEngineValue = customInput.value;
                } else {
                    customInput.style.display = 'none';
                    searchEngineValue = radio.value;
                }
                chrome.storage.local.set({ [isHover ? 'hoverSearchEngine' : 'searchEngine']: searchEngineValue });
            }
        });

        // Restore saved value on load
        if (searchEngine === radio.value) {
            radio.checked = true;
            customInput.style.display = engine === customID ? 'block' : 'none';
        }
    });

    // Special handling for initial load if 'custom' is selected
    if (!searchEngines.some(engine => searchEngine === document.getElementById(engine)?.value)) {
        const customRadio = document.getElementById(customID);
        customRadio.checked = true;
        customInput.style.display = 'block';
        customInput.value = searchEngine;
    }
}



function setupWindowTypeSelection(name, windowType = 'popup') {
    // Set the default checked value based on the passed windowType
    document.querySelector(`input[name="${name}"][value="${windowType}"]`).checked = true;

    // Add event listeners to all inputs with the given name
    document.querySelectorAll(`input[name="${name}"]`).forEach(input => {
        input.addEventListener('change', event => {
            const newWindowType = event.target.value;

            // Store the selected value in chrome.storage.local
            chrome.storage.local.set({ [name]: newWindowType }, () => {
                configs[name] = newWindowType;
            });
        });
    });
}

function setupModifiedKeySelection(name, modifiedKey = 'None') {
    // Set the default checked value based on the passed modifiedKey
    document.querySelector(`input[name="${name}"][value="${modifiedKey}"]`).checked = true;

    // Add event listeners to all inputs with the given name
    document.querySelectorAll(`input[name="${name}"]`).forEach(input => {
        input.addEventListener('change', event => {
            const newModifiedKey = event.target.value;

            // Store the selected value in chrome.storage.local
            chrome.storage.local.set({ [name]: newModifiedKey }, () => {
                configs[name] = newModifiedKey;
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
        const allItems = await browser.storage.local.get(null);
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
        if (!keep) {
            allItems.popupWindowsInfo = {};
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

        const keep = confirm("Click 'OK' to keep the popup window size and position, or 'Cancel' to skip them.");
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

        if (!keep) {
            delete importData.settings.popupWindowsInfo;
        }

        await browser.storage.local.set(importData.settings);

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

        userConfigs.searchWindowType = userConfigs.searchWindowType ?? configs.searchWindowType;

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
