let isDragging = false;

const configs = {
    'closeWhenFocusedInitialWindow': true,
    'tryOpenAtMousePosition': false,
    'hideBrowserControls': true,
    'popupHeight': 800,
    'popupWidth': 1000,
    'searchEngine': 'https://www.google.com/search?q=%s',
    'disabledUrls': [],
    'enableContainerIdentify': true,
    'blurEnabled': true,
    'blurPx': 3,
    'blurTime': 1,
    'modifiedKey': 'None',
    'popupWindowsInfo': {}
};

async function loadUserConfigs(keys = Object.keys(configs)) {
    return new Promise(resolve => {
        chrome.storage.local.get(keys, storedConfigs => {
            const mergedConfigs = { ...configs, ...storedConfigs };
            Object.assign(configs, mergedConfigs);
            resolve(mergedConfigs);
        });
    });
}

function addListeners() {
    const events = ["click", "dragstart", "dragover", "drop", "dragend", "mouseup"];
    events.forEach(event => document.addEventListener(event, handleEvent, true));
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('mousedown', handleContextMenu);
    document.addEventListener('scroll', handleContextMenu);
}

function removeListeners() {
    const events = ["click", "dragstart", "dragover", "drop", "dragend", "mouseup"];
    events.forEach(event => document.removeEventListener(event, handleEvent, true));
    document.removeEventListener('contextmenu', handleContextMenu);
    document.removeEventListener('mousedown', handleContextMenu);
    document.removeEventListener('scroll', handleContextMenu);
}

function handleContextMenu() {
    chrome.runtime.sendMessage({ checkContextMenuItem: true }, response => {
        if (chrome.runtime.lastError) {
            console.error("Runtime error:", chrome.runtime.lastError);
        } else {
            // console.log("Background script responded:", response);
        }
    });
}

function handleEvent(e) {
    if (e.type === 'dragstart') {
        chrome.storage.local.get('modifiedKey', (data) => {
            const modifiedKey = data.modifiedKey || 'None';
            const keyMap = { 'Ctrl': e.ctrlKey, 'Alt': e.altKey, 'Shift': e.shiftKey, 'Meta': e.metaKey };
            if (modifiedKey === 'None' || keyMap[modifiedKey]) {
                handleDragStart(e);
            }

        });

    } else if (['dragover', 'drop', 'dragend'].includes(e.type) && isDragging) {
        preventEvent(e);
    } else if (e.type === 'click') {
        handleClick(e);
    } else if (e.type === 'mouseup' && isDragging) {
        if (e.target.tagName === 'A' && e.target.href) {
            e.preventDefault();
            e.stopImmediatePropagation();
        }
    }
}


async function preventEvent(e) {
    e.preventDefault();
    e.stopPropagation();
}

async function handleDragStart(e) {
    const selectionText = window.getSelection().toString();

    if (e.target || selectionText) {
        isDragging = true;

        const data = await loadUserConfigs(['searchEngine', 'blurEnabled', 'blurPx', 'blurTime']);
        const searchEngine = data.searchEngine || 'https://www.google.com/search?q=%s';
        const blurEnabled = data.blurEnabled !== undefined ? data.blurEnabled : true;
        const blurPx = parseFloat(data.blurPx || 3);
        const blurTime = parseFloat(data.blurTime || 1);
        const linkElement = e.target instanceof HTMLElement && (e.target.tagName === 'A' ? e.target : e.target.closest('a'));
        const linkUrl = linkElement ? linkElement.href : searchEngine.replace('%s', encodeURIComponent(selectionText));

        e.preventDefault();
        e.stopImmediatePropagation();

        if (blurEnabled) {
            document.body.style.filter = `blur(${blurPx}px)`;
            document.body.style.transition = `filter ${blurTime}s ease`;
        }



        chrome.runtime.sendMessage({
            linkUrl: linkUrl,
            lastClientX: e.screenX,
            lastClientY: e.screenY,
            width: window.screen.availWidth,
            height: window.screen.availHeight,
            top: window.screen.availTop,
            left: window.screen.availLeft
        });
    }

}

function handleClick(e) {
    if (isDragging) {
        preventEvent(e);
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

async function checkUrlAndToggleListeners() {
    const data = await loadUserConfigs(['disabledUrls', 'searchEngine']);
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
                // console.log("Background script responded:", response);
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
        const data = await loadUserConfigs(['closeWhenFocusedInitialWindow']);
        const message = data.closeWhenFocusedInitialWindow
            ? { action: 'windowRegainedFocus', checkContextMenuItem: true }
            : { checkContextMenuItem: true };

        const response = await sendMessageToBackground(message);
        // console.log("Background script responded:", response);
    } catch (error) {
        console.error("Error sending message to background script:", error);
    }
});
