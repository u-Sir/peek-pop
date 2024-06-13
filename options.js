document.addEventListener("DOMContentLoaded", init);

function init() {
    loadUserConfigs(function(userConfigs) {
        const keys = Object.keys(configs);

        for (let i = 0, l = keys.length; i < l; i++) {
            const key = keys[i];

            // set corresponding input value
            let input = document.getElementById(key.toString());

            // Set input value
            if (input !== null && input !== undefined) {
                if (input.type == 'checkbox') {
                    input.checked = userConfigs[key] ?? configs[key];
                } else {
                    input.value = userConfigs[key] ?? configs[key];
                }

                // Set translated label for input
                let label = input.parentNode.querySelector('label');
                if (!label) {
                    label = document.createElement('label');
                    label.setAttribute('for', key.toString());
                    input.parentNode.insertAdjacentElement('beforeend', label);
                }
                label.appendChild(document.createTextNode(chrome.i18n.getMessage(key)));

                // Set event listener
                input.addEventListener("input", function(e) {
                    let id = input.getAttribute('id');
                    let inputValue = input.getAttribute('type') == 'checkbox' ? input.checked : input.value;
                    configs[id] = inputValue;

                    saveAllSettings();
                });
            }
        }
    });
}
