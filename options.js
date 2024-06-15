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

        // Handle disabled URLs patterns
        let disabledUrlsTextarea = document.getElementById('disabledUrls');
        if (disabledUrlsTextarea) {
            // Populate textarea with stored patterns
            disabledUrlsTextarea.value = (userConfigs.disabledUrls || []).map(pattern => pattern.source ?? pattern).join('\n');

            let label = disabledUrlsTextarea.parentNode.querySelector('label');
            label.appendChild(document.createTextNode(chrome.i18n.getMessage('disabledUrls')));

            disabledUrlsTextarea.addEventListener('input', function(e) {
                let patterns = disabledUrlsTextarea.value.split('\n').filter(pattern => pattern.trim().length > 0);
                let processedPatterns = patterns.map(pattern => {
                    // Determine if the pattern is a regex, wildcard, or plain text
                    try {
                        return new RegExp(pattern); // Attempt to treat as regex
                    } catch (error) {
                        if (pattern.includes('*') || pattern.includes('?')) {
                            return new RegExp(wildcardToRegex(pattern)); // Convert wildcards to regex
                        } else {
                            return new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`); // Treat as plain text
                        }
                    }
                });
                chrome.storage.sync.set({ 'disabledUrls': processedPatterns }, function () {
                    configs['disabledUrls'] = processedPatterns;
                });
            });
        }
    });
}

// Convert wildcard pattern to regex
function wildcardToRegex(pattern) {
    return pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape special characters
                  .replace(/\\\*/g, '.*') // Convert * to .*
                  .replace(/\\\?/g, '.'); // Convert ? to .
}
