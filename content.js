let isMouseDown = false;
let startX, startY, mouseDownTime;
let isDragging = false;
let hasPopupTriggered = false;

const configs = {
    'closeWhenFocusedInitialWindow': true,
    'tryOpenAtMousePosition': false,
    'hideBrowserControls': true,
    'popupHeight': 800,
    'popupWidth': 1000,
    'searchEngine': 'https://www.google.com/search?q=%s',
    'disabledUrls': [],
    'blurEnabled': true,
    'blurPx': 3,
    'blurTime': 1,
    'modifiedKey': 'None'
};

async function loadUserConfigs() {
    return new Promise(resolve => {
        chrome.storage.local.get(Object.keys(configs), storedConfigs => {
            const mergedConfigs = { ...configs, ...storedConfigs };
            Object.assign(configs, mergedConfigs);
            resolve(mergedConfigs);
        });
    });
}

function addListeners() {
    const events = ["mousedown", "mousemove", "mouseup", "click"];
    events.forEach(event => document.addEventListener(event, handleEvent, true));
    document.addEventListener('contextmenu', () => {
        chrome.runtime.sendMessage({ checkContextMenuItem: true }, response => {
            if (chrome.runtime.lastError) {
                console.error("Runtime error:", chrome.runtime.lastError);
            } else {
                console.log("Background script responded:", response);
            }
        });
    });
    enableDragListeners();
}

function removeListeners() {
    const events = ["mousedown", "mousemove", "mouseup", "click"];
    events.forEach(event => document.removeEventListener(event, handleEvent, true));
    disableDragListeners();
}

function handleEvent(e) {
    if (e.type === 'mousedown') {
        isMouseDown = true;
        startX = e.clientX;
        startY = e.clientY;
        mouseDownTime = Date.now();
        isDragging = false;
        hasPopupTriggered = false;
    } else if (e.type === 'mousemove') {
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
    } else if (['dragstart', 'dragover', 'drop', 'dragend'].includes(e.type)) {
        e.preventDefault();
        e.stopPropagation();
    } else if (e.type === 'click') {
        handleClick(e);
    } else if (e.type === 'mouseup') {
        isMouseDown = false;
        if (e.target.tagName === 'A' && e.target.href) {
            e.preventDefault();
            e.stopImmediatePropagation();
            setTimeout(resetDraggingState, 0);
        }
    }
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

function enableDragListeners() {
    const events = ["dragstart", "dragover", "drop", "dragend"];
    events.forEach(event => document.addEventListener(event, handleEvent, true));
    document.addEventListener("mouseover", handleMouseOver, true);
}

function disableDragListeners() {
    const events = ["dragstart", "dragover", "drop", "dragend"];
    events.forEach(event => document.removeEventListener(event, handleEvent, true));
    document.removeEventListener("mouseover", handleMouseOver, true);
}

function resetDraggingState() {
    isDragging = false;
    hasPopupTriggered = false;
}

async function triggerPopup(e) {
    isDragging = true;

    const selectionText = window.getSelection().toString();
    const data = await loadUserConfigs();

    const modifiedKey = data.modifiedKey || 'None';
    const searchEngine = data.searchEngine || 'https://www.google.com/search?q=%s';
    const blurEnabled = data.blurEnabled !== undefined ? data.blurEnabled : true;
    const blurPx = parseFloat(data.blurPx || 3);
    const blurTime = parseFloat(data.blurTime || 1);

    if (modifiedKey !== 'None') {
        const keyMap = { 'Ctrl': e.ctrlKey, 'Alt': e.altKey, 'Shift': e.shiftKey, 'Meta': e.metaKey };
        if (!keyMap[modifiedKey]) {
            disableDragListeners();
            return;
        }
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
            top: window.screen.availTop,
            left: window.screen.availLeft
        }, () => {
            disableDragListeners(); // Disable drag listeners after sending message
        });
    }
}

function handleClick(e) {
    if (isDragging) {
        e.preventDefault();
        e.stopImmediatePropagation();
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

async function checkUrlAndToggleListeners() {
    const data = await loadUserConfigs();
    const disabledUrls = data.disabledUrls || [];
    const currentUrl = window.location.href;

    if (isUrlDisabled(currentUrl, disabledUrls)) {
        removeListeners();
    } else {
        addListeners();
    }

    if (typeof data.searchEngine === 'undefined') {
        chrome.storage.local.set({ searchEngine: 'https://www.google.com/search?q=%s' });
    }
}

chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'local' && (changes.disabledUrls || changes.searchEngine)) {
        await checkUrlAndToggleListeners();
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

chrome.storage.local.get('lastUrl', (data) => {
    if (data.lastUrl) {
        lastUrl = data.lastUrl;
    }
});

function sendMessageToBackground(message) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, response => {
            if (chrome.runtime.lastError) {
                console.error("Runtime error:", chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                console.log("Background script responded:", response);
                if (response && response.status) {
                    resolve(response);
                } else {
                    reject(new Error("Undefined response from background script"));
                }
            }
        });
    });
}

window.addEventListener('focus', async () => {
    try {
        document.body.style.filter = '';
        const data = await loadUserConfigs();
        const message = data.closeWhenFocusedInitialWindow
            ? { action: 'windowRegainedFocus', checkContextMenuItem: true }
            : { checkContextMenuItem: true };

        const response = await sendMessageToBackground(message);
        console.log("Background script responded:", response);
    } catch (error) {
        console.error("Error sending message to background script:", error);
    }
});
