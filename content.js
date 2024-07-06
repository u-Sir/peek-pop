let isMouseDown = false;
let startX, startY, mouseDownTime;
let isDragging = false;
let hasPopupTriggered = false;

function addListeners() {
    document.addEventListener("mousedown", handleMouseDown, true);
    document.addEventListener("mousemove", handleMouseMove, true);
    document.addEventListener("mouseup", handleMouseUp, true);
    document.addEventListener("click", handleClick, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
    enableDragListeners();
}

function removeListeners() {
    document.removeEventListener("mousedown", handleMouseDown, true);
    document.removeEventListener("mousemove", handleMouseMove, true);
    document.removeEventListener("mouseup", handleMouseUp, true);
    document.removeEventListener("click", handleClick, true);
    document.removeEventListener('contextmenu', handleContextMenu, true);
    disableDragListeners();
}

function handleMouseDown(e) {
    isMouseDown = true;
    startX = e.clientX;
    startY = e.clientY;
    mouseDownTime = Date.now();
    isDragging = false;
    hasPopupTriggered = false;
}

function handleMouseMove(e) {
    if (!isMouseDown || hasPopupTriggered) return;
    if (Date.now() >= mouseDownTime) {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
            isDragging = true;
            enableDragListeners(); // Enable drag listeners when dragging starts
            triggerPopup(e);
            hasPopupTriggered = true;
        }
    }
}

function handleMouseUp(e) {
    isMouseDown = false;
    if (isDragging) {
        e.preventDefault();
        e.stopImmediatePropagation();
    }
    setTimeout(resetDraggingState, 0);
}

function handleClick(e) {
    if (isDragging) {
        e.preventDefault();
        e.stopImmediatePropagation();
    }
}

function handleContextMenu(event) {
    chrome.runtime.sendMessage({ action: 'ensureContextMenu' });
}

function handleDrag(e) {
    e.preventDefault();
    e.stopPropagation();
}

function handleMouseOver(e) {
    if (isDragging && e.target.tagName === 'A') {
        const rect = e.target.getBoundingClientRect();
        if (e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom) {
            e.preventDefault();
            e.stopPropagation();
        }
    }
}

function triggerPopup(e) {
    const selectionText = window.getSelection().toString();

    chrome.storage.local.get(['modifiedKey', 'searchEngine', 'blurEnabled', 'blurPx', 'blurTime'], ({
        modifiedKey = 'None',
        searchEngine = 'https://www.google.com/search?q=%s',
        blurEnabled = true,
        blurPx = 3,
        blurTime = 1,
    }) => {


        if (modifiedKey !== 'None' && !e[modifiedKey.toLowerCase() + 'Key']) {

            disableDragListeners();
            return;
        }

        if (e.target.tagName === 'A' || (selectionText && searchEngine !== 'None')) {

            hasPopupTriggered = true;

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
            }, () => {
                disableDragListeners(); // Disable drag listeners after sending message

            });
        }
    });
}

function enableDragListeners() {
    document.addEventListener("dragstart", handleDrag, true);
    document.addEventListener("dragover", handleDrag, true);
    document.addEventListener("drop", handleDrag, true);
    document.addEventListener("dragend", handleDrag, true);
    document.addEventListener("mouseover", handleMouseOver, true);
}

function disableDragListeners() {
    document.removeEventListener("dragstart", handleDrag, true);
    document.removeEventListener("dragover", handleDrag, true);
    document.removeEventListener("drop", handleDrag, true);
    document.removeEventListener("dragend", handleDrag, true);
    document.removeEventListener("mouseover", handleMouseOver, true);
}

function resetDraggingState() {
    isDragging = false;
    hasPopupTriggered = false;
}

// Initialize listeners when DOM is fully loaded
document.addEventListener("DOMContentLoaded", addListeners);

// Handle changes in Chrome storage for disabled URLs
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.disabledUrls) {
        checkUrlAndToggleListeners();
    }
});

function checkUrlAndToggleListeners() {
    chrome.storage.local.get(['disabledUrls', 'searchEngine'], ({ disabledUrls = [], searchEngine }) => {
        const currentUrl = window.location.href;
        if (isUrlDisabled(currentUrl, disabledUrls)) {
            removeListeners();
        } else {
            addListeners();
        }

        if (typeof searchEngine === 'undefined') {
            chrome.storage.local.set({ searchEngine: 'https://www.google.com/search?q=%s' });
        }
    });
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

// Check current URL and toggle listeners on initial load
checkUrlAndToggleListeners();

// Update last URL in storage and toggle listeners on URL change using MutationObserver
let lastUrl = null;

function updateLastUrl(newUrl) {
    if (newUrl !== lastUrl) {
        lastUrl = newUrl;
        chrome.storage.local.set({ lastUrl: newUrl });
        checkUrlAndToggleListeners();
    }
}

chrome.storage.local.get('lastUrl', ({ lastUrl: storedLastUrl }) => {
    lastUrl = storedLastUrl || location.href;
    updateLastUrl(lastUrl);
});

new MutationObserver(() => {
    updateLastUrl(location.href);
}).observe(document, { subtree: true, childList: true });

window.addEventListener('focus', () => {
    document.body.style.filter = '';
    chrome.storage.local.get('closeWhenFocusedInitialWindow', ({ closeWhenFocusedInitialWindow }) => {
        if (closeWhenFocusedInitialWindow) {
            chrome.runtime.sendMessage({ action: 'windowRegainedFocus' });
        }
    });
});
