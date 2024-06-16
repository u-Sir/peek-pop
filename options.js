document.addEventListener("DOMContentLoaded", init);

function init() {
    loadUserConfigs(function(userConfigs) {
        const keys = Object.keys(configs);

        for (let i = 0, l = keys.length; i < l; i++) {
            const key = keys[i];

            let input = document.getElementById(key.toString());

            if (input !== null && input !== undefined) {
                if (input.type == 'checkbox') {
                    input.checked = userConfigs[key] ?? configs[key];
                } else {
                    input.value = userConfigs[key] ?? configs[key];
                }

                let label = input.parentNode.querySelector('label');
                if (!label) {
                    label = document.createElement('label');
                    label.setAttribute('for', key.toString());
                    input.parentNode.insertAdjacentElement('beforeend', label);
                }
                label.appendChild(document.createTextNode(chrome.i18n.getMessage(key)));

                input.addEventListener("input", function(e) {
                    let id = input.getAttribute('id');
                    let inputValue = input.getAttribute('type') == 'checkbox' ? input.checked : input.value;
                    configs[id] = inputValue;

                    saveAllSettings();
                });
            }
        }

        let disabledUrlsTextarea = document.getElementById('disabledUrls');
        if (disabledUrlsTextarea) {
            disabledUrlsTextarea.value = (userConfigs.disabledUrls || []).join('\n');

            let label = disabledUrlsTextarea.parentNode.querySelector('label');
            if (!label) {
                label = document.createElement('label');
                label.setAttribute('for', 'disabledUrls');
                disabledUrlsTextarea.parentNode.insertAdjacentElement('beforeend', label);
            }
            label.appendChild(document.createTextNode(chrome.i18n.getMessage('disabledUrls')));

            disabledUrlsTextarea.addEventListener('input', function(e) {
                let patterns = disabledUrlsTextarea.value.split('\n').filter(pattern => pattern.trim().length > 0);
                chrome.storage.sync.set({ 'disabledUrls': patterns }, function () {
                    configs['disabledUrls'] = patterns;
                });
            });
        }
    });
}

function loadUserConfigs(callback) {
    chrome.storage.sync.get(null, function (configs) {
        callback(configs);
    });
}

function saveAllSettings() {
    chrome.storage.sync.set(configs);
}
