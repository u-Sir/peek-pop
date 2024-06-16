chrome.storage.sync.get('disabledUrls', function(data) {
    const disabledUrls = data.disabledUrls || [];
    const currentUrl = window.location.href;

    if (isUrlDisabled(currentUrl, disabledUrls)) {
        return; // Do nothing if the URL is disabled
    }

    document.addEventListener("dragstart", function (e) {
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
    }, true);

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
        if (e.target.tagName === 'A' && e.target.href) {
            e.preventDefault();
            e.stopPropagation();
        }
    }, true);
});

function isUrlDisabled(url, disabledUrls) {
    return disabledUrls.some(disabledUrl => {
        if (disabledUrl.includes('*')) {
            const regex = new RegExp(disabledUrl.replace(/\*/g, '.*'));
            return regex.test(url);
        }
        return url.includes(disabledUrl);
    });
}
