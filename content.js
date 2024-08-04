let isDragging = false;
let hasPopupTriggered = false;
let isMouseDown = false;
let initialMouseX = 0;
let initialMouseY = 0;

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
    'popupWindowsInfo': {},
    'closedByEsc': false,
    'contextItemCreated': false,
    'dragDirections': ['up', 'down', 'right', 'left'],
    'dragPx': 0,
    'imgSupport': false,
    'enableContainerIdentify': true
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
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('scroll', handleContextMenu);
    document.addEventListener('keydown', handleEsc);
    document.addEventListener('contextmenu', handleContextMenu);
}

function removeListeners() {
    const events = ["click", "dragstart", "dragover", "drop"];
    events.forEach(event => document.removeEventListener(event, handleEvent, true));
    document.removeEventListener('mousedown', handleMouseDown);
    document.removeEventListener('scroll', handleContextMenu);
    document.removeEventListener('keydown', handleEsc);
    document.removeEventListener('contextmenu', handleContextMenu);

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

async function handleEsc(e) {
    if (e.key === 'Escape') {
        try {
            const data = await loadUserConfigs(['closedByEsc']);
            if (data.closedByEsc) {
                chrome.runtime.sendMessage({ action: 'closeCurrentTab' }, () => {
                    // console.log(data.closedByEsc)
                });
            }
        } catch (error) {
            console.error('Error loading user configs:', error);
        }
    }
}

async function handleMouseDown(e) {
    if (document.body) document.body.style.filter = '';

    initialMouseX = e.clientX;
    initialMouseY = e.clientY;

    chrome.storage.local.get('modifiedKey', (data) => {
        const modifiedKey = data.modifiedKey || 'None';
        const keyMap = { 'Ctrl': e.ctrlKey, 'Alt': e.altKey, 'Shift': e.shiftKey, 'Meta': e.metaKey };

        if (modifiedKey === 'None' || keyMap[modifiedKey]) {
            const events = ["click", "dragstart", "dragover", "drop"];

            events.forEach(event => document.addEventListener(event, handleEvent, true));
        } else {
            const events = ["click", "dragstart", "dragover", "drop"];

            events.forEach(event => document.removeEventListener(event, handleEvent, true));
        }

    });

    try {
        const data = await loadUserConfigs(['closeWhenFocusedInitialWindow']);
        const message = data.closeWhenFocusedInitialWindow
            ? { action: 'windowRegainedFocus', checkContextMenuItem: true }
            : { checkContextMenuItem: true };
        chrome.runtime.sendMessage(message);
    } catch (error) {
        console.error('Error loading user configs:', error);
    }

    isMouseDown = true;
    hasPopupTriggered = false;
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
    } else if (['dragover', 'drop'].includes(e.type) && isDragging) {
        preventEvent(e);
    } else if (e.type === 'click' && isDragging) {
        preventEvent(e);
        isDragging = false;
    } else if (e.type === 'mouseup' && isDragging) {
        isMouseDown = false;
        e.preventDefault();
        e.stopImmediatePropagation();
        setTimeout(resetDraggingState, 0);
    }
}

function resetDraggingState() {
    isDragging = false;
    hasPopupTriggered = false;
}

async function preventEvent(e) {
    e.preventDefault();
    e.stopPropagation();
}

async function handleDragStart(e) {
    if (!isMouseDown || hasPopupTriggered) return;
    const selectionText = window.getSelection().toString();
    const linkElement = e.target instanceof HTMLElement && (e.target.tagName === 'A' ? e.target : e.target.closest('a'));
    const linkUrl = linkElement ? linkElement.href : null;

    const imageElement = e.target instanceof HTMLElement && (e.target.tagName === 'IMG' ? e.target : e.target.closest('img'));
    const imageUrl = imageElement ? imageElement.src : null;

    if (linkUrl || selectionText || imageUrl) {
        isDragging = true;
        const data = await loadUserConfigs(['searchEngine', 'blurEnabled', 'blurPx', 'blurTime', 'dragPx', 'dragDirections', 'imgSupport']);
        const searchEngine = (data.searchEngine !== 'None' ? (data.searchEngine || 'https://www.google.com/search?q=%s') : null);
        const blurEnabled = data.blurEnabled !== undefined ? data.blurEnabled : true;
        const blurPx = parseFloat(data.blurPx || 3);
        const blurTime = parseFloat(data.blurTime || 1);
        let finalLinkUrl = linkUrl || (data.imgSupport ? imageUrl : null) || ((searchEngine && selectionText.trim() !== '')? searchEngine.replace('%s', encodeURIComponent(selectionText)) : null);

                
        if (!finalLinkUrl) return;

        const viewportTop = e.screenY - e.clientY;
        const viewportBottom = e.screenY - e.clientY + window.innerHeight;
        const viewportLeft = e.screenX - e.clientX;
        const viewportRight = e.screenX - e.clientX + window.innerWidth;
        const dragPx = data.dragPx || 0;
        const dragDirections = data.dragDirections || ['up', 'down', 'right', 'left'];


        document.addEventListener('dragend', function onDragend(e) {


            const currentMouseX = e.clientX;
            const currentMouseY = e.clientY;
            let direction = '';
            
            // do nothing when drag out of current page, firefox use client, chromium use screen
            if (!(viewportLeft < e.clientX && e.clientX < viewportRight && viewportTop < e.clientY && e.clientY < viewportBottom)) {
                // console.log(viewportLeft , e.screenX , viewportRight , viewportTop, e.screenY, viewportBottom)
                document.removeEventListener('dragend', onDragend, true);
                resetDraggingState();
                return;
            }

            if (dragPx !== 0) {
                if ((Math.abs(currentMouseX - initialMouseX) > dragPx) || (Math.abs(currentMouseY - initialMouseY) > dragPx)) {
                    // identify drag directions
                    if (Math.abs(currentMouseX - initialMouseX) > Math.abs(currentMouseY - initialMouseY)) {
                        direction = (currentMouseX > initialMouseX) ? 'right' : 'left';
                    } else {
                        direction = (currentMouseY > initialMouseY) ? 'down' : 'up';
                    }

                    if (dragDirections.includes(direction)) {
                        if (blurEnabled) {
                            document.body.style.filter = `blur(${blurPx}px)`;
                            document.body.style.transition = `filter ${blurTime}s ease`;
                        }
                        e.preventDefault();
                        e.stopImmediatePropagation();
                        chrome.runtime.sendMessage({
                            linkUrl: finalLinkUrl,
                            lastClientX: e.screenX,
                            lastClientY: e.screenY,
                            width: window.screen.availWidth,
                            height: window.screen.availHeight,
                            top: window.screen.availTop,
                            left: window.screen.availLeft
                        }, () => {
                            hasPopupTriggered = true;
                            document.removeEventListener('dragend', onDragend, true);
                            finalLinkUrl = null;
                        });
                    } else {
                        // nothing
                    }


                } else {
                    // do nothing
                }




            } else {
                // identify drag directions
                if (Math.abs(currentMouseX - initialMouseX) > Math.abs(currentMouseY - initialMouseY)) {
                    direction = (currentMouseX > initialMouseX) ? 'right' : 'left';
                } else {
                    direction = (currentMouseY > initialMouseY) ? 'down' : 'up';
                }

                if (dragDirections.includes(direction)) {
                    if (blurEnabled) {
                        document.body.style.filter = `blur(${blurPx}px)`;
                        document.body.style.transition = `filter ${blurTime}s ease`;
                    }
                    e.preventDefault();
                    e.stopImmediatePropagation();
                    chrome.runtime.sendMessage({
                        linkUrl: finalLinkUrl,
                        lastClientX: e.screenX,
                        lastClientY: e.screenY,
                        width: window.screen.availWidth,
                        height: window.screen.availHeight,
                        top: window.screen.availTop,
                        left: window.screen.availLeft
                    }, () => {
                        hasPopupTriggered = true;
                        document.removeEventListener('dragend', onDragend, true);
                        finalLinkUrl = null;
                    });
                } else {
                    // nothing
                }
            }
            // document.removeEventListener('dragend', onDragend, true);

        }, true);

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
    if (namespace === 'local' && (changes.disabledUrls || changes.searchEngine || changes.dragDirections || changes.dragPx)) {
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

window.addEventListener('focus', async () => {
    if (document.body) document.body.style.filter = '';
    try {
        const data = await loadUserConfigs(['closeWhenFocusedInitialWindow']);
        const message = data.closeWhenFocusedInitialWindow
            ? { action: 'windowRegainedFocus', checkContextMenuItem: true }
            : { checkContextMenuItem: true };
        chrome.runtime.sendMessage(message);
    } catch (error) {
        // console.error('Error loading user configs:', error);
    }
});