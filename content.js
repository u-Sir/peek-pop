let isDragging = false;

function addListeners() {
    document.addEventListener("click", handleClick, true);
    document.addEventListener("dragstart", handleDragStart, true);
    document.addEventListener("dragover", handleDragOver, true);
    document.addEventListener("drop", handleDrop, true);
    document.addEventListener("dragend", handleDragEnd, true);
    document.addEventListener("mouseup", handleMouseUp, true);
    document.addEventListener('contextmenu', function () {
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
    isDragging = true;

    const selectionText = window.getSelection().toString();
    chrome.storage.local.get(['modifiedKey', 'searchEngine', 'blurEnabled', 'blurPx', 'blurTime'], function (data) {
        const modifiedKey = data.modifiedKey || 'None';
        const searchEngine = data.searchEngine || 'https://www.google.com/search?q=%s';
        const blurEnabled = data.blurEnabled !== undefined ? data.blurEnabled : true;
        const blurPx = parseFloat(data.blurPx || 3);
        const blurTime = parseFloat(data.blurTime || 1);

        if (modifiedKey !== 'None') {
            const keyMap = {
                'Ctrl': e.ctrlKey,
                'Alt': e.altKey,
                'Shift': e.shiftKey,
                'Meta': e.metaKey
            };

            if (!keyMap[modifiedKey]) {
                return;
            }
        }

        if (e.target.tagName === 'A' || (selectionText && searchEngine !== 'None')) {
            e.preventDefault();
            e.stopImmediatePropagation();

            if (blurEnabled) {
                document.body.style.filter = `blur(${blurPx}px)`;
                document.body.style.transition = `filter ${blurTime}s ease`;
            }

            chrome.runtime.sendMessage({
                linkUrl: e.target.tagName === 'A' ? e.target.href : searchEngine.replace('%s', encodeURIComponent(selectionText)),
                lastClientX: e.screenX,
                lastClientY: e.screenY,
                width: window.screen.availWidth,
                height: window.screen.availHeight,
            });
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
        e.stopImmediatePropagation();
    }
}

function handleClick(e) {
    if (isDragging) {
        e.preventDefault();
        e.stopPropagation();
        isDragging = false;
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
    chrome.storage.local.get(['disabledUrls', 'searchEngine'], function (data) {
        const disabledUrls = data.disabledUrls || [];
        const currentUrl = window.location.href;

        if (isUrlDisabled(currentUrl, disabledUrls)) {
            removeListeners();
        } else {
            addListeners();
        }

        // Ensure searchEngine is set to a valid default if undefined
        if (typeof data.searchEngine === 'undefined') {
            chrome.storage.local.set({ searchEngine: 'https://www.google.com/search?q=%s' });
        }
    });
}

chrome.storage.onChanged.addListener(function (changes, namespace) {
    if (namespace === 'local' && (changes.disabledUrls || changes.searchEngine)) {
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

window.addEventListener('focus', function () {
    document.body.style.filter = '';
    chrome.storage.local.get('closeWhenFocusedInitialWindow', function (data) {
        if (data.closeWhenFocusedInitialWindow) {
            chrome.runtime.sendMessage({ action: 'windowRegainedFocus' });
        }
    });
});
