let isMouseDown = false;
let startX, startY, mouseDownTime;
let isDragging = false;
let hasPopupTriggered = false;
let moveChecked = false;

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
    'modifiedKey': 'None',
    'dragMovePx': 0,
    'delayTime': 0
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

async function initializeConfigs() {
    await loadUserConfigs();
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

async function handleEvent(e) {
    if (e.type === 'mousedown') {
        // Check if the target is an image or if the image is wrapped in a link and return early if it is
        if (e.target.tagName === 'IMG' || (e.target.closest('a') && e.target.closest('a').querySelector('img'))) {
            return;
        }
        
        isMouseDown = true;
        startX = e.clientX;
        startY = e.clientY;
        mouseDownTime = Date.now();
        isDragging = false;
        hasPopupTriggered = false;
        moveChecked = false;

    } else if (e.type === 'mousemove') {
        if (!isMouseDown || hasPopupTriggered) return;

        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        const moveTime = Date.now() - mouseDownTime;

        // Load configurations dynamically
        const currentConfigs = await loadUserConfigs();

        // Debug logs to check values
        console.log(`dx: ${dx}, dy: ${dy}, moveTime: ${moveTime}, dragMovePx: ${currentConfigs.dragMovePx}, delayTime: ${currentConfigs.delayTime}`);

        // Check if the delay time has passed and if the drag distance exceeds the threshold
        if (moveTime > currentConfigs.delayTime) {
            if (Math.abs(dx) > currentConfigs.dragMovePx || Math.abs(dy) > currentConfigs.dragMovePx) {
                if (!moveChecked) {
                    isDragging = true;
                    enableDragListeners(); // Enable drag listeners when dragging starts
                    await triggerPopup(e);
                    hasPopupTriggered = true;
                    moveChecked = true;
                }
            }
        }
    } else if (['dragstart', 'dragover', 'drop', 'dragend'].includes(e.type)) {
        // Only prevent default if not dealing with an image or its parent link
        if (!(e.target.tagName === 'IMG' || (e.target.closest('a') && e.target.closest('a').querySelector('img')))) {
            e.preventDefault();
            e.stopPropagation();
        }
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
    console.log("Triggering popup...");

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
            console.log("Modified key not pressed. Popup not triggered.");
            return;
        }
    }

    if (e.target.closest('a') || e.target.tagName === 'A' || (selectionText && searchEngine !== 'None')) {
        hasPopupTriggered = true;

        e.preventDefault();
        e.stopImmediatePropagation();

        if (blurEnabled) {
            document.body.style.filter = `blur(${blurPx}px)`;
            document.body.style.transition = `filter ${blurTime}s ease`;
        }

        console.time("Popup Send Message");
        chrome.runtime.sendMessage({
            linkUrl: e.target.tagName === 'A' ? e.target.href : e.target.closest('a') ? e.target.closest('a').href : searchEngine.replace('%s', encodeURIComponent(selectionText)),
            lastClientX: e.screenX,
            lastClientY: e.screenY,
            width: window.screen.availWidth,
            height: window.screen.availHeight,
            top: window.screen.availTop,
            left: window.screen.availLeft
        }, () => {
            console.timeEnd("Popup Send Message");
            disableDragListeners(); // Disable drag listeners after sending message
            console.log("Popup triggered and message sent.");
        });
    } else {
        console.log("Popup conditions not met.");
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
    if (namespace === 'local' && (changes.disabledUrls || changes.searchEngine || changes.dragMovePx || changes.delayTime)) {
        await checkUrlAndToggleListeners();
    }
});

initializeConfigs().then(() => {
    checkUrlAndToggleListeners();
});

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
