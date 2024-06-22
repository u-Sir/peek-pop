document.addEventListener("DOMContentLoaded", init);

function init() {
    loadUserConfigs(function (userConfigs) {
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

                input.addEventListener("input", function (e) {
                    let id = input.getAttribute('id');
                    let inputValue = input.getAttribute('type') == 'checkbox' ? input.checked : input.value;
                    configs[id] = inputValue;

                    saveAllSettings();
                });
            }
        }

        let disabledUrlsTextarea = document.getElementById('disabledUrls');
        if (disabledUrlsTextarea) {
            disabledUrlsTextarea.value = userConfigs.disabledUrls?.join('\n') ?? configs.disabledUrls.join('\n');
            disabledUrlsTextarea.addEventListener('input', function () {
                configs.disabledUrls = disabledUrlsTextarea.value.split('\n').filter((line) => line.trim());
                saveAllSettings();
            });
        }
    });
}
