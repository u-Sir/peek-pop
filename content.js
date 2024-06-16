function addListeners() {
    document.addEventListener("dragstart", handleDragStart, true);
    document.addEventListener("dragover", handleDragOver, true);
    document.addEventListener("drop", handleDrop, true);
    document.addEventListener("dragend", handleDragEnd, true);
    document.addEventListener("mouseup", handleMouseUp, true);
}

function removeListeners() {
    document.removeEventListener("dragstart", handleDragStart, true);
    document.removeEventListener("dragover", handleDragOver, true);
    document.removeEventListener("drop", handleDrop, true);
    document.removeEventListener("dragend", handleDragEnd, true);
    document.removeEventListener("mouseup", handleMouseUp, true);
}

function handleDragStart(e) {
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
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleDragEnd(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleMouseUp(e) {
    if (e.target.tagName === 'A' && e.target.href) {
        e.preventDefault();
        e.stopPropagation();
    }
}

function isUrlDisabled(url, disabledUrls) {
    return disabledUrls.some(disabledUrl => {
        if (disabledUrl.includes('*')) {
            const regex = new RegExp(disabledUrl.replace(/\*/g, '.*'));
            return regex.test(url);
        }
        return url.includes(disabledUrl);
    });
}

function checkUrlAndToggleListeners() {
    chrome.storage.sync.get('disabledUrls', function(data) {
        const disabledUrls = data.disabledUrls || [];
        const currentUrl = window.location.href;

        if (isUrlDisabled(currentUrl, disabledUrls)) {
            removeListeners();
        } else {
            addListeners();
        }
    });
}

chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === 'sync' && changes.disabledUrls) {
        checkUrlAndToggleListeners();
    }
});

checkUrlAndToggleListeners();

// Monitor URL changes and re-evaluate extension activity
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        checkUrlAndToggleListeners();
    }
}).observe(document, {subtree: true, childList: true});
