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
            lastClientY: e.screenY,
            width: window.screen.availWidth,
            height: window.screen.availHeight
        });
    } else if (selectionText) {
        chrome.storage.local.get('searchInPopupEnabled', function (data) {
            if (data.searchInPopupEnabled) {
                chrome.runtime.sendMessage({
                    selectionText: selectionText,
                    lastClientX: e.screenX,
                    lastClientY: e.screenY,
                    width: window.screen.availWidth,
                    height: window.screen.availHeight
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
    chrome.storage.local.get('disabledUrls', function(data) {
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
    if (namespace === 'local' && changes.disabledUrls) {
        checkUrlAndToggleListeners();
    }
});

checkUrlAndToggleListeners();

// Monitor URL changes and re-evaluate extension activity
// Monitor URL changes and save `lastUrl` in chrome.storage.local
let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        chrome.storage.local.set({ lastUrl: url });
        checkUrlAndToggleListeners(); // Optionally trigger listener checks
    }
}).observe(document, { subtree: true, childList: true });

// On content script initialization, retrieve lastUrl from storage if available
chrome.storage.local.get('lastUrl', function(data) {
    if (data.lastUrl) {
        lastUrl = data.lastUrl;
    }
});

// Add an event listener for focus events on the window
window.addEventListener('focus', function(event) {
    chrome.storage.local.get('closeWhenFocusedInitialWindow', function(data) {
        if (data.closeWhenFocusedInitialWindow) {
            // Send a message to background.js when the window regains focus
            chrome.runtime.sendMessage({ action: 'windowRegainedFocus' });
        }
    });
});



