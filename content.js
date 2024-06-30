function addListeners() {
    document.addEventListener("dragstart", handleDragStart, true);
    document.addEventListener("dragover", handleDragOver, true);
    document.addEventListener("drop", handleDrop, true);
    document.addEventListener("dragend", handleDragEnd, true);
    document.addEventListener("mouseup", handleMouseUp, true);
    document.addEventListener('contextmenu', function (event) {
        chrome.runtime.sendMessage({ action: 'ensureContextMenu' });
    });
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
    chrome.storage.local.get(['shiftEnabled', 'searchInPopupEnabled', 'blurEnabled', 'blurPx', 'blurTime'], function(data) {
        const shiftEnabled = data.shiftEnabled || false;
        const searchInPopupEnabled = data.searchInPopupEnabled || false;
        
        const blurEnabled = data.blurEnabled || true;
        const blurPx = parseFloat(data.blurPx || 3);
        const blurTime = parseFloat(data.blurTime || 1);


        // If shiftEnabled is true and neither shift nor Command key is pressed, do nothing
        if (shiftEnabled && !e.shiftKey) {
            return;
        }

        // Handle dragging links
        if (e.target.tagName === 'A') {
            e.preventDefault();
            e.stopPropagation();
            chrome.runtime.sendMessage({
                action: 'dragStart',
                linkUrl: e.target.href,
                lastClientX: e.screenX,
                lastClientY: e.screenY,
                width: window.screen.availWidth,
                height: window.screen.availHeight,
                shiftKey: e.shiftKey
            });
        // Handle dragging text
        } else if (selectionText && searchInPopupEnabled) {
            chrome.runtime.sendMessage({
                action: 'dragStart',
                selectionText: selectionText,
                lastClientX: e.screenX,
                lastClientY: e.screenY,
                width: window.screen.availWidth,
                height: window.screen.availHeight,
                shiftKey: e.shiftKey
            });
            e.preventDefault();
            e.stopPropagation();
        }

        if (blurEnabled) {
            document.body.style.filter = `blur(${blurPx}px)`;
            document.body.style.transition = `filter ${blurTime}s ease`;
        }
    });
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
    chrome.storage.local.get(['disabledUrls', 'searchInPopupEnabled'], function (data) {
        const disabledUrls = data.disabledUrls || [];
        const currentUrl = window.location.href;

        if (isUrlDisabled(currentUrl, disabledUrls)) {
            removeListeners();
        } else {
            addListeners();
        }

        // Ensure searchInPopupEnabled is set
        if (typeof data.searchInPopupEnabled === 'undefined') {
            chrome.storage.local.set({ searchInPopupEnabled: true });
        }
    });
}

chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace === 'local' && changes.disabledUrls) {
        checkUrlAndToggleListeners();
    }
});

checkUrlAndToggleListeners();

let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        chrome.storage.local.set({ lastUrl: url });
        checkUrlAndToggleListeners();
    }
}).observe(document, { subtree: true, childList: true });

chrome.storage.local.get('lastUrl', function (data) {
    if (data.lastUrl) {
        lastUrl = data.lastUrl;
    }
});

window.addEventListener('focus', function (event) {
    document.body.style.filter = '';
    chrome.storage.local.get('closeWhenFocusedInitialWindow', function (data) {
        if (data.closeWhenFocusedInitialWindow) {
            chrome.runtime.sendMessage({ action: 'windowRegainedFocus' });
        }
    });
});
