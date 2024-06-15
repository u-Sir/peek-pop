function isDisabledUrl(url, callback) {
    chrome.storage.sync.get('disabledUrls', function (data) {
        const disabledUrls = data.disabledUrls || [];
        for (const pattern of disabledUrls) {
            const regex = new RegExp(pattern.replace(/\*/g, '.*')); // Convert wildcard to regex
            if (regex.test(url)) {
                console.log(`URL ${url} is disabled due to pattern ${pattern}`);
                callback(true);
                return;
            }
        }
        callback(false);
    });
}

document.addEventListener("dragstart", function (e) {
    const url = window.location.href;
    isDisabledUrl(url, function(disabled) {
        if (disabled) return;

        const selectionText = window.getSelection().toString();
        if (e.target.tagName === 'A') {
            e.preventDefault();
            e.stopPropagation();

            const link = e.target;
            const clonedLink = link.cloneNode(true);
            link.parentNode.replaceChild(clonedLink, link);

            chrome.runtime.sendMessage({
                linkUrl: e.target.href,
                lastClientX: e.screenX,
                lastClientY: e.screenY
            });
        } else if (selectionText) {
            chrome.storage.sync.get('searchInPopupEnabled', function (data) {
                if (data.searchInPopupEnabled) {
                    console.log('Sending selection text to background:', selectionText);
                    chrome.runtime.sendMessage({
                        selectionText: selectionText,
                        lastClientX: e.screenX,
                        lastClientY: e.screenY
                    });

                    e.preventDefault();
                    e.stopPropagation();
                }
            });
        }
    });
});

document.addEventListener("dragover", function (e) {
    e.preventDefault();
    e.stopPropagation();
}, true);

document.addEventListener("drop", function (e) {
    e.preventDefault();
    e.stopPropagation();
}, true);

document.addEventListener("dragend", function (e) {
    e.preventDefault();
    e.stopPropagation();
}, true);

document.addEventListener("mouseup", function (e) {
    const url = window.location.href;
    isDisabledUrl(url, function(disabled) {
        if (disabled) return;

        if (e.target.tagName === 'A' && e.target.href) {
            e.preventDefault();
            e.stopPropagation();
        }
    });
}, true);
