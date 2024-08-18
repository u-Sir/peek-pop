let isDragging = false;
let hasPopupTriggered = false;
let isMouseDown = false;
let initialMouseX = 0;
let initialMouseY = 0;
let hoverTimeoutId;
let progressBar;
let hoverElement;
let hoverInitialMouseX, hoverInitialMouseY, mouseMoveCheckInterval;
let lastKeyTime = 0;
let lastKey = '';
const moveThreshold = 15; // Maximum pixels the mouse can move before the timer resets

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
    'hoverTimeout': 0,
    'urlCheck': true,
    'popupInBackground': false,
    'doubleTapKeyToSendPageBack': 'None',
    'hoverDisabledUrls': [],
    'hoverImgSupport': false,
    'hoverPopupInBackground': false,
    'hoverSearchEngine': 'https://www.google.com/search?q=%s',
    'hoverModifiedKey': 'None',
    'hoverWindowType': 'popup',
    'triggerAfterDragRelease': true
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
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('contextmenu', handleContextMenu);
    // Attach the handleMouseOut to mouseout event to clear timeout when mouse leaves the element
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);

}

function removeListeners() {
    const events = ["click", "dragstart", "dragover", "drop"];
    events.forEach(event => document.removeEventListener(event, handleEvent, true));
    document.removeEventListener('mousedown', handleMouseDown);
    document.removeEventListener('scroll', handleContextMenu);
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

async function handleKeyDown(e) {
    if (e.key === 'Escape') {
        try {
            const data = await loadUserConfigs(['closedByEsc']);
            if (data.closedByEsc) {
                chrome.runtime.sendMessage({ action: 'closeCurrentTab' });
            }
        } catch (error) {
            console.error('Error loading user configs:', error);
        }
    } else {
        try {
            const data = await loadUserConfigs(['doubleTapKeyToSendPageBack']);
            const doubleTapKeyToSendPageBack = data.doubleTapKeyToSendPageBack || 'None';
        
            if (doubleTapKeyToSendPageBack === 'None') return;
        
            const keyMap = { 'Ctrl': e.ctrlKey, 'Alt': e.altKey, 'Shift': e.shiftKey, 'Meta': e.metaKey };
            const key = e.key;
            const currentTime = new Date().getTime();
            const timeDifference = currentTime - lastKeyTime;
        
            if (keyMap[doubleTapKeyToSendPageBack] && key === lastKey && timeDifference < 300) {
                chrome.runtime.sendMessage({ action: 'sendPageBack' }, () => {
                    // console.log('send current page to original window');
                });
            } else {
                lastKeyTime = currentTime;
                lastKey = key;
            }
        } catch (error) {
            // if (error.message.includes('Extension context invalidated')) {
            //     console.warn('Extension context invalidated, unable to load user configs.');
            // } else {
            //     console.error('Error loading user configs:', error);
            // }
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
            const events = ["click", "dragstart", "dragover", "drop", "mouseup"];

            events.forEach(event => document.addEventListener(event, handleEvent, true));
        } else {
            const events = ["click", "dragstart", "dragover", "drop", "mouseup"];

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
    } else if (e.type === 'mouseup') {
        handleMouseUpWithProgressBar(e);
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

async function handleMouseUpWithProgressBar(e) {

    const data = await loadUserConfigs(['hoverSearchEngine', 'blurEnabled', 'blurPx', 'blurTime', 'hoverTimeout', 'hoverModifiedKey', 'urlCheck']);
    const hoverTimeout = data.hoverTimeout || 0;
    const hoverModifiedKey = data.hoverModifiedKey || 'None';
    const keyMap = { 'Ctrl': e.ctrlKey, 'Alt': e.altKey, 'Shift': e.shiftKey, 'Meta': e.metaKey };
    if (hoverModifiedKey === 'None' || keyMap[hoverModifiedKey]) {
        if (hasPopupTriggered) return;

        const selection = window.getSelection();
        const selectionText = selection.toString().trim();

        if (selectionText === '') return;
        if (!hoverTimeout || parseInt(hoverTimeout, 10) === 0) {
            return;
        } else {
            // Get bounding box of the selected text
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();


            if (hoverElement === selectionText) return; // Avoid resetting if the same selection is still being hovered

            const hoverSearchEngine = (data.hoverSearchEngine !== 'None' ? (data.hoverSearchEngine || 'https://www.google.com/search?q=%s') : null);

            // Regular expression to match URLs including IP addresses
            const urlPattern = /^(https?:\/\/)?((([a-zA-Z\d]([a-zA-Z\d-]{0,61}[a-zA-Z\d])?\.)+[a-zA-Z]{2,6})|(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})|(\[[0-9a-fA-F:.]+\]))(:\d+)?(\/[^\s]*)?$/;

            // Check if the selected text is a URL
            const isURL = data.urlCheck ? urlPattern.test(selectionText) : false;

            // If the text is a URL and doesn't start with "http://" or "https://", prepend "http://"
            let finalLinkUrl = isURL
                ? (selectionText.startsWith('http://') || selectionText.startsWith('https://')
                    ? selectionText
                    : 'http://' + selectionText)
                : (hoverSearchEngine && selectionText !== ''
                    ? hoverSearchEngine.replace('%s', encodeURIComponent(selectionText))
                    : null);

            if (!finalLinkUrl) return;

            // Clear any existing timeout, interval, and progress bar
            clearTimeoutsAndProgressBars();

            hoverElement = selectionText; // Set the current hover element
            hoverInitialMouseX = e.clientX; // Store initial mouse position
            hoverInitialMouseY = e.clientY;

            const hoverTimeoutDuration = parseInt(data.hoverTimeout, 10) || 0; // Default to disabled if not set

            // Create and display the progress bar immediately
            progressBar = createCandleProgressBar(hoverInitialMouseX, hoverInitialMouseY, hoverTimeoutDuration);

            const onMouseMove = (moveEvent) => {
                const currentMouseX = moveEvent.clientX;
                const currentMouseY = moveEvent.clientY;

                // Check if the mouse is outside the selected text area
                if (currentMouseX < rect.left || currentMouseX > rect.right || currentMouseY < rect.top || currentMouseY > rect.bottom) {
                    clearTimeoutsAndProgressBars(); // Cancel everything
                    // document.removeEventListener('mousemove', onMouseMove);
                    return;
                } else {
                    clearTimeoutsAndProgressBars();
                    const keyMap = { 'Ctrl': moveEvent.ctrlKey, 'Alt': moveEvent.altKey, 'Shift': moveEvent.shiftKey, 'Meta': moveEvent.metaKey };

                    if (hoverModifiedKey === 'None' || keyMap[hoverModifiedKey]) {
                        const selection = window.getSelection();
                        const selectionText = selection.toString().trim();
                        if (selectionText === '') return;

                        progressBar = createCandleProgressBar(currentMouseX, currentMouseY, hoverTimeoutDuration);
                        // Set the hover timeout to trigger the popup after the progress bar finishes animating
                        hoverTimeoutId = setTimeout(() => {
                            triggerPopup(e, null, null, selectionText); // Ensure this line triggers the popup correctly

                            // Remove the progress bar when the popup is triggered
                            clearTimeoutsAndProgressBars();
                            document.removeEventListener('mousemove', onMouseMove);
                        }, hoverTimeoutDuration);
                    }
                }

                // Update the progress bar position
                if (progressBar) {
                    progressBar.style.top = `${currentMouseY + 25}px`; // Update top position
                    progressBar.style.left = `${currentMouseX}px`; // Update left position
                }
            };

            // Start checking for minimal mouse movement
            document.addEventListener('mousemove', onMouseMove);

            // Set the hover timeout to trigger the popup after the progress bar finishes animating
            hoverTimeoutId = setTimeout(() => {
                triggerPopup(e, null, null, selectionText); // Ensure this line triggers the popup correctly

                // Remove the progress bar when the popup is triggered
                clearTimeoutsAndProgressBars();
                document.removeEventListener('mousemove', onMouseMove);
            }, hoverTimeoutDuration);
        }
    }
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
        const data = await loadUserConfigs(['searchEngine', 'blurEnabled', 'blurPx', 'blurTime', 'dragPx', 'dragDirections', 'imgSupport', 'popupInBackground', 'triggerAfterDragRelease']);
        const searchEngine = (data.searchEngine !== 'None' ? (data.searchEngine || 'https://www.google.com/search?q=%s') : null);
        const popupInBackground = data.popupInBackground || false;
        // Regular expression to match URLs including IP addresses
        const urlPattern = /^(https?:\/\/)?((([a-zA-Z\d]([a-zA-Z\d-]{0,61}[a-zA-Z\d])?\.)+[a-zA-Z]{2,6})|(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})|(\[[0-9a-fA-F:.]+\]))(:\d+)?(\/[^\s]*)?$/;

        // Check if the selected text is a URL
        const isURL = data.urlCheck ? urlPattern.test(selectionText) : false;

        const blurEnabled = data.blurEnabled !== undefined ? data.blurEnabled : true;
        const blurPx = parseFloat(data.blurPx || 3);
        const blurTime = parseFloat(data.blurTime || 1);

        // Ensure that URLs without a protocol are handled
        const processedLinkUrl = isURL
            ? (selectionText.startsWith('http://') || selectionText.startsWith('https://')
                ? selectionText
                : 'http://' + selectionText)
            : null;

        // Set finalLinkUrl based on linkUrl, imgSupport, and searchEngine
        let finalLinkUrl = processedLinkUrl || linkUrl || (data.imgSupport ? imageUrl : null) ||
            ((searchEngine && selectionText.trim() !== '')
                ? searchEngine.replace('%s', encodeURIComponent(selectionText))
                : null);

        if (!finalLinkUrl) return;

        const viewportTop = e.screenY - e.clientY;
        const viewportBottom = e.screenY - e.clientY + window.innerHeight;
        const viewportLeft = e.screenX - e.clientX;
        const viewportRight = e.screenX - e.clientX + window.innerWidth;
        const dragPx = data.dragPx || 0;
        const dragDirections = data.dragDirections || ['up', 'down', 'right', 'left'];

        if (!Array.isArray(dragDirections) || dragDirections.length === 0) {
            return;
        }
        
        const triggerAfterDragRelease = data.triggerAfterDragRelease !== 'undefined' ? data.triggerAfterDragRelease : true;
        if (triggerAfterDragRelease) {

            document.addEventListener('dragend', function onDragend(e) {


                const currentMouseX = e.clientX;
                const currentMouseY = e.clientY;
                let direction = '';
    
                // do nothing when drag out of current page
                if (!(viewportLeft < e.screenX && e.screenX < viewportRight && viewportTop < e.screenY && e.screenY < viewportBottom)) {
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
                            if (blurEnabled && !popupInBackground) {
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
                                left: window.screen.availLeft,
                                trigger: 'drag'
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
                        if (blurEnabled && !popupInBackground) {
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
                            left: window.screen.availLeft,
                            trigger: 'drag'
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
        } else {
            if (blurEnabled && !popupInBackground) {
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
                left: window.screen.availLeft,
                trigger: 'drag'
            }, () => {
                hasPopupTriggered = true;
                finalLinkUrl = null;
            });
        }

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
    const data = await loadUserConfigs(['disabledUrls', 'searchEngine', 'hoverDisabledUrls', 'hoverSearchEngine']);
    const disabledUrls = data.disabledUrls || [];

    const currentUrl = window.location.href;

    if (isUrlDisabled(currentUrl, disabledUrls)) {
        removeListeners();
    } else {
        addListeners();
    }

    const hoverDisabledUrls = data.hoverDisabledUrls || [];
    if (isUrlDisabled(currentUrl, hoverDisabledUrls)) {
        document.removeEventListener('mouseover', handleMouseOver, true);
    }

    if (typeof data.searchEngine === 'undefined') {
        chrome.storage.local.set({ searchEngine: 'https://www.google.com/search?q=%s' });
    }
    if (typeof data.hoverSearchEngine === 'undefined') {
        chrome.storage.local.set({ hoverSearchEngine: 'https://www.google.com/search?q=%s' });
    }
}

chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'local' && (changes.disabledUrls || changes.searchEngine || changes.hoverDisabledUrls || changes.hoverSearchEngine || changes.dragDirections || changes.dragPx)) {
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
    document.addEventListener('keydown', handleKeyDown);
    clearTimeoutsAndProgressBars();
    hoverElement = null;

    hoverInitialMouseX = null;
    hoverInitialMouseY = null;
    try {
        const data = await loadUserConfigs(['closeWhenFocusedInitialWindow', 'hoverTimeout']);
        if (data.hoverTimeout === 0) {
            document.removeEventListener('mouseover', handleMouseOver, true);
        } else {
            document.addEventListener('mouseover', handleMouseOver, true);

        }
        const message = data.closeWhenFocusedInitialWindow
            ? { action: 'windowRegainedFocus', checkContextMenuItem: true }
            : { checkContextMenuItem: true };
        chrome.runtime.sendMessage(message);
    } catch (error) {
        // console.error('Error loading user configs:', error);
    }
});


// Create candle-like progress bar element
function createCandleProgressBar(x, y, duration) {
    const barContainer = document.createElement('div');
    barContainer.style.position = 'fixed';
    barContainer.style.top = `${y + 25}px`; // Place below the cursor
    barContainer.style.left = `${x}px`; // Center the progress bar horizontally
    barContainer.style.width = '50px'; // Initial full width of the progress bar
    barContainer.style.height = '10px';
    barContainer.style.backgroundColor = '#ffa742'; // Bright red color for the progress bar
    barContainer.style.border = '1px solid #ffa742'; // Black border for visibility
    barContainer.style.borderRadius = '5px';
    barContainer.style.overflow = 'hidden';
    barContainer.style.zIndex = '10000';
    barContainer.style.transition = `width ${duration}ms linear`; // Transition definition here

    document.body.appendChild(barContainer);

    // Use setTimeout to trigger the transition after the element is rendered
    setTimeout(() => {
        barContainer.style.width = '0px'; // Decrease width to 0px over the duration
    }, 20); // Ensure the transition has time to apply

    return barContainer;
}

// Handle mouseover event
async function handleMouseOver(e) {
    // Check if the document has focus
    if (!document.hasFocus()) {
        clearTimeoutsAndProgressBars();
        hoverElement = null;
        return; // Exit if the window is not focused
    }
    const viewportTop = e.screenY - e.clientY;
    const viewportBottom = e.screenY - e.clientY + window.innerHeight;
    const viewportLeft = e.screenX - e.clientX;
    const viewportRight = e.screenX - e.clientX + window.innerWidth;

    // do nothing when out of current page
    if (!(viewportLeft < e.screenX && e.screenX < viewportRight && viewportTop < e.screenY && e.screenY < viewportBottom)) {
        // console.log(viewportLeft , e.screenX , viewportRight , viewportTop, e.screenY, viewportBottom)
        clearTimeoutsAndProgressBars();

        return;
    }

    const data = await loadUserConfigs(['blurEnabled', 'blurPx', 'blurTime', 'hoverTimeout', 'hoverImgSupport', 'hoverModifiedKey', 'hoverDisabledUrls']);

    // do nothing when is in blacklist
    const currentUrl = window.location.href;
    const hoverDisabledUrls = data.hoverDisabledUrls || [];
    if (isUrlDisabled(currentUrl, hoverDisabledUrls)) {
        document.removeEventListener('mouseover', handleMouseOver, true);
        return;
    }

    const hoverModifiedKey = data.hoverModifiedKey || 'None';
    const keyMap = { 'Ctrl': e.ctrlKey, 'Alt': e.altKey, 'Shift': e.shiftKey, 'Meta': e.metaKey };
    if (hoverModifiedKey === 'None' || keyMap[hoverModifiedKey]) {
        const hoverTimeout = data.hoverTimeout || 0;
        if (!hoverTimeout || parseInt(hoverTimeout, 10) === 0) {
            return;
        } else {
            const linkElement = e.target instanceof HTMLElement && (e.target.tagName === 'A' ? e.target : e.target.closest('a'));
            const linkUrl = linkElement ? linkElement.href : null;

            const imageElement = e.target instanceof HTMLElement && (e.target.tagName === 'IMG' ? e.target : e.target.closest('img'));
            const imageUrl = imageElement ? imageElement.src : null;
            if (linkUrl || imageUrl) {

                if (hoverElement === e.target) {
                    return; // Avoid resetting if the same element is still being hovered
                }

                let finalLinkUrl = linkUrl || (data.hoverImgSupport ? imageUrl : null);

                if (!finalLinkUrl) return;

                // Clear any existing timeout, interval, and progress bar
                clearTimeoutsAndProgressBars();

                hoverElement = e.target; // Set the current hover element
                hoverInitialMouseX = e.clientX; // Store initial mouse position
                hoverInitialMouseY = e.clientY;

                const hoverTimeoutDuration = parseInt(data.hoverTimeout, 10) || 0; // Default to disabled if not set

                // Create and display the progress bar immediately
                progressBar = createCandleProgressBar(hoverInitialMouseX, hoverInitialMouseY, hoverTimeoutDuration);
                // Start checking for minimal mouse movement
                hoverTimeoutId = setTimeout(() => {
                    mouseMoveCheckInterval = setInterval(() => {
                        const currentMouseX = e.clientX;
                        const currentMouseY = e.clientY;
                        const distanceMoved = Math.sqrt(
                            Math.pow(currentMouseX - hoverInitialMouseX, 2) +
                            Math.pow(currentMouseY - hoverInitialMouseY, 2)
                        );

                        // Update the progress bar position
                        if (progressBar) {
                            progressBar.style.top = `${currentMouseY + 25}px`; // Update top position
                            progressBar.style.left = `${currentMouseX}px`; // Update left position
                        }

                        if (distanceMoved <= moveThreshold) {
                            // Mouse movement is minimal, proceed with the timer
                            clearInterval(mouseMoveCheckInterval); // Stop checking for mouse movement
                            hoverTimeoutId = setTimeout(() => {
                                triggerPopup(e, linkElement, imageElement, '');

                                // Remove the progress bar when the popup is triggered
                                clearTimeoutsAndProgressBars();
                            }, hoverTimeoutDuration);
                        } else {
                            // Mouse moved too much, cancel the animation and cleanup
                            clearTimeoutsAndProgressBars();
                        }
                    }, 10); // Check mouse movement every 10ms
                }, 0); // Wait for 0ms to start checking mouse movement

                // Add mousemove event listener to update progress bar position
                hoverElement.addEventListener('mousemove', updateProgressBarPosition);
            }
        };
    }



}

// Update progress bar position based on current mouse coordinates
function updateProgressBarPosition(e) {
    if (progressBar) {
        progressBar.style.top = `${e.clientY + 25}px`; // Update top position
        progressBar.style.left = `${e.clientX}px`; // Update left position
    }
}

// Clear timeouts, intervals, and progress bars
function clearTimeoutsAndProgressBars() {
    if (hoverTimeoutId) {
        clearTimeout(hoverTimeoutId);
        hoverTimeoutId = null;
    }
    if (progressBar) {
        progressBar.remove();
        progressBar = null;
    }
    clearInterval(mouseMoveCheckInterval);
    hoverElement = null;

    // Remove mousemove event listener
    if (hoverElement) {
        hoverElement.removeEventListener('mousemove', updateProgressBarPosition);
    }
}

// Trigger the popup logic
function triggerPopup(e, linkElement, imageElement, selectionText) {
    chrome.storage.local.get('hoverModifiedKey', async (data) => {
        const hoverModifiedKey = data.hoverModifiedKey || 'None';
        const keyMap = { 'Ctrl': e.ctrlKey, 'Alt': e.altKey, 'Shift': e.shiftKey, 'Meta': e.metaKey };

        if (hoverModifiedKey === 'None' || keyMap[hoverModifiedKey]) {
            const configData = await loadUserConfigs(['hoverSearchEngine', 'blurEnabled', 'blurPx', 'blurTime', 'hoverImgSupport', 'urlCheck', 'hoverPopupInBackground']);
            const hoverSearchEngine = (configData.hoverSearchEngine !== 'None' ? (configData.hoverSearchEngine || 'https://www.google.com/search?q=%s') : null);
            const hoverPopupInBackground = configData.hoverPopupInBackground || false;
            const blurEnabled = configData.blurEnabled !== undefined ? configData.blurEnabled : true;
            const blurPx = parseFloat(configData.blurPx || 3);
            const blurTime = parseFloat(configData.blurTime || 1);

            // Regular expression to match URLs including IP addresses
            const urlPattern = /^(https?:\/\/)?((([a-zA-Z\d]([a-zA-Z\d-]{0,61}[a-zA-Z\d])?\.)+[a-zA-Z]{2,6})|(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})|(\[[0-9a-fA-F:.]+\]))(:\d+)?(\/[^\s]*)?$/;

            // Check if the selected text is a URL
            const isURL = configData.urlCheck ? urlPattern.test(selectionText) : false;

            // Ensure that URLs without a protocol are handled
            const processedLinkUrl = isURL
                ? (selectionText.startsWith('http://') || selectionText.startsWith('https://')
                    ? selectionText
                    : 'http://' + selectionText)
                : null;

            // Set finalLinkUrl based on linkUrl, hoverImgSupport, and searchEngine
            let finalLinkUrl = processedLinkUrl || linkElement?.href || (configData.hoverImgSupport ? imageElement?.src : null) ||
                ((hoverSearchEngine && selectionText.trim() !== '')
                    ? hoverSearchEngine.replace('%s', encodeURIComponent(selectionText))
                    : null);

            if (!finalLinkUrl) return;

            if (blurEnabled && !hoverPopupInBackground) {
                document.body.style.filter = `blur(${blurPx}px)`;
                document.body.style.transition = `filter ${blurTime}s ease`;
            }

            chrome.runtime.sendMessage({
                linkUrl: finalLinkUrl,
                lastClientX: e.screenX,
                lastClientY: e.screenY,
                width: window.screen.availWidth,
                height: window.screen.availHeight,
                top: window.screen.availTop,
                left: window.screen.availLeft,
                trigger: 'hover'
            }, () => {
                hasPopupTriggered = true;
                // document.removeEventListener('mouseover', handleMouseOver, true);
                document.removeEventListener('mousemove', updateProgressBarPosition, true);

            });
        }
    });
}

// Handle mouseout event
function handleMouseOut(e) {
    clearTimeoutsAndProgressBars(); // Clean up when the mouse leaves the element
    hoverElement = null;
}
