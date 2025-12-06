let isDragging = false;
let hasPopupTriggered = false;
let isMouseDown = false;
let initialMouseX = 0;
let initialMouseY = 0;
let lastKeyTime = 0;
let lastClickTime = 0;
let lastKey = '';
let clickTimeout = null;
const moveThreshold = 15;
let hoverlinkOrText = false;
let isMouseDownOnLink = false;


let linkIndicator,
    tooltip,
    progressBar,
    focusAt,
    theme,

    urlCheck,
    enableContainerIdentify,

    isDoubleClick,
    previewMode,
    firstDownOnLinkAt,
    previewModeDisabledUrls,
    previewProgressBar,
    doubleClickToSwitch,
    doubleClickAsClick,
    previewModeEnable,
    clickModifiedKey,
    dbclickToPreview,
    dbclickToPreviewTimeout,

    holdTimeout,
    holdToPreview,
    holdToPreviewTimeout,

    searchTooltipsEnable,
    searchTooltips,
    searchTooltipsEngines,

    hoverTimeoutId,
    hoverElement,
    hoverInitialMouseX,
    hoverInitialMouseY,
    mouseMoveCheckInterval,

    hoverImgSearchEnable,
    hoverTimeout,
    hoverImgSupport,
    hoverModifiedKey,
    hoverDisabledUrls,
    hoverSearchEngine,

    collection,
    collectionEnable,

    countdownStyle,

    closedByEsc,
    doubleTapKeyToSendPageBack,
    closeWhenFocusedInitialWindow,
    closeWhenScrollingInitialWindow,
    sendBackByMiddleClickEnable,

    linkHint,
    linkDisabledUrls,

    copyButtonPosition,
    sendBackButtonPosition,

    blurOverlay,
    blurEnabled,
    blurPx,
    blurTime,
    blurRemoval,

    modifiedKey,
    dragPx,
    dragDirections,
    dropInEmptyOnly,
    imgSupport,
    imgSearchEnable,
    searchEngine,
    dragStartEnable,
    disabledUrls,

    lastLeaveTimestamp,
    lastLeaveRelatedTarget,

    debounceTimer,
    lastMessage = null,
    shouldResetClickState = false,

    isFirefox,
    isMac,
    isInputboxFocused = false,
    contextMenuEnabled = false;

const configs = {
    'closeWhenFocusedInitialWindow': true,
    'closeWhenScrollingInitialWindow': false,
    'sendBackByMiddleClickEnable': false,
    'closedByEsc': false,
    'doubleTapKeyToSendPageBack': 'None',

    'countdownStyle': 'bar',

    'popupWindowsInfo': {},

    'rememberPopupSizeAndPosition': false,
    'rememberPopupSizeAndPositionForDomain': false,

    'tryOpenAtMousePosition': false,
    'popupHeight': 800,
    'popupWidth': 1000,
    'popupHeightInPercentage': 0,
    'popupWidthInPercentage': 0,


    'blurEnabled': true,
    'blurPx': 3,
    'blurTime': 1,
    'blurRemoval': true,

    'modifiedKey': 'None',
    'dropInEmptyOnly': false,
    'dragDirections': [],
    'dragPx': 0,
    'imgSupport': false,
    'searchEngine': 'https://www.google.com/search?q=%s',
    'disabledUrls': [],
    'imgSearchEnable': false,

    'urlCheck': true,

    'hoverTimeout': 0,
    'hoverDisabledUrls': [],
    'hoverImgSupport': false,
    'hoverSearchEngine': 'https://www.google.com/search?q=%s',
    'hoverModifiedKey': 'None',
    'hoverWindowType': 'popup',
    'hoverImgSearchEnable': false,

    'clickModifiedKey': 'None',
    'previewModeDisabledUrls': [],
    'previewModeWindowType': 'popup',
    'previewModeEnable': false,
    'doubleClickToSwitch': false,
    'doubleClickAsClick': false,

    'dbclickToPreview': true,
    'dbclickToPreviewTimeout': 250,

    'holdToPreview': false,
    'holdToPreviewTimeout': 1500,

    'isFirefox': false,
    'isMac': false,
    'enableContainerIdentify': true,

    'linkHint': false,
    'linkDisabledUrls': [],

    'collection': [],
    'collectionEnable': false,

    'searchWindowType': 'normal',
    'searchTooltipsEnable': false,
    'searchTooltipsEngines': `Google=>https://www.google.com/search?q=%s
Bing=>https://www.bing.com/search?q=%s
Baidu=>https://www.baidu.com/s?wd=%s
Yandex=>https://yandex.com/search/?text=%s
DuckduckGo=>https://duckduckgo.com/?q=%s
Wikipedia=>https://wikipedia.org/w/index.php?title=Special:Search&search=%s`,

    'copyButtonPosition': { leftPercent: 10, topPercent: 10 },
    'sendBackButtonPosition': { leftPercent: 10, topPercent: 20 },
    'copyButtonEnable': false,
    'sendBackButtonEnable': false
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
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('mouseout', handleMouseOut, true);

}


function removeListeners() {
    const events = ["click", "dragstart", "dragover", "drop"];

    events.forEach(event => window.removeEventListener(event, handleEvent, true));
    document.removeEventListener('mousedown', handleMouseDown);
    document.removeEventListener('scroll', handleContextMenu);
    document.removeEventListener('contextmenu', handleContextMenu);

}

function createTooltip(x, y, actions, timeout = 2000) {
    const tooltip = document.createElement('div');
    tooltip.style.position = 'fixed';
    tooltip.style.top = `${y + 20}px`; // Initial position below the cursor
    tooltip.style.left = `${x}px`;
    tooltip.style.backgroundColor = 'transparent'; // Make tooltip background transparent
    tooltip.style.padding = '0'; // Remove padding
    tooltip.style.borderRadius = '0'; // Remove border radius
    tooltip.style.zIndex = '2147483647';
    tooltip.style.fontSize = '14px'; // Adjust font size for the text inside buttons
    tooltip.style.display = 'inline-block';
    tooltip.style.whiteSpace = 'nowrap'; // Prevent text from wrapping

    // Container for all buttons
    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '5px';

    // Add all buttons to the container
    actions.forEach(action => {
        const button = document.createElement('button');
        button.textContent = action.label;

        // Style for buttons
        button.style.backgroundColor = '#fafafa'; // Button background color
        button.style.border = 'none';
        button.style.color = '#999'; // Button text color
        button.style.padding = '4px 5px'; // Adjust size by changing padding
        button.style.borderRadius = '5px'; // Adjust corner roundness
        button.style.cursor = 'pointer';
        button.style.fontSize = '12px'; // Adjust button text size
        button.style.width = 'auto'

        button.addEventListener('click', () => {
            action.handler(); // Trigger the corresponding action
            tooltip.remove(); // Remove the tooltip after clicking
        });

        buttonContainer.appendChild(button);
    });

    tooltip.appendChild(buttonContainer);
    document.body.appendChild(tooltip);

    // Function to adjust tooltip position if it's out of viewport
    function adjustPosition() {
        const tooltipRect = tooltip.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let newX = x;
        let newY = y + 20; // Initial position

        // Adjust position if tooltip overflows horizontally
        if (tooltipRect.right > viewportWidth) {
            newX -= (tooltipRect.right - viewportWidth); // Move left
        }
        if (tooltipRect.left < 0) {
            newX -= tooltipRect.left; // Move right
        }

        // Adjust position if tooltip overflows vertically
        if (tooltipRect.bottom > viewportHeight) {
            newY -= (tooltipRect.bottom - viewportHeight); // Move up
        }
        if (tooltipRect.top < 0) {
            newY -= tooltipRect.top; // Move down
        }

        // Apply the adjusted position
        tooltip.style.left = `${newX}px`;
        tooltip.style.top = `${newY}px`;
    }

    // Adjust the position initially
    adjustPosition();

    // Set a timeout to automatically remove the tooltip after the specified duration
    let timeoutId = setTimeout(removeTooltip, timeout);

    function removeTooltip() {
        if (tooltip && !hoverlinkOrText) {
            tooltip.remove();
            clearTimeout(timeoutId);
            hoverlinkOrText = false;
        }
    }

    // Reset timeout when cursor is inside the tooltip
    tooltip.addEventListener('mouseenter', () => {
        clearTimeout(timeoutId); // Clear the existing timeout
    });

    // Start timeout again when cursor leaves the tooltip
    tooltip.addEventListener('mouseleave', () => {
        timeoutId = setTimeout(removeTooltip, timeout); // Reset the timeout
    });


    // remove tooltip when clicking outside
    const onDocClick = (event) => {
        if (!tooltip.contains(event.target)) {
            tooltip.remove();
            document.removeEventListener('mousedown', onDocClick);
        }
    };
    document.addEventListener('mousedown', onDocClick);

    return tooltip;
}


function addSearchTooltipsOnHover(e) {
    if (isDragging) {
        if (searchTooltips) searchTooltips.remove();
        searchTooltips = null;
        return;
    }
    const selection = window.getSelection();
    const selectionText = selection.toString().trim();

    if (selectionText !== '' && selection.rangeCount && selection.rangeCount > 0) {

        if (tooltip) tooltip.remove();
        // if (searchTooltips) searchTooltips.remove();
        setTimeout(() => {
            if (typeof searchTooltipsEnable === 'undefined' || !searchTooltipsEnable) return;
            // Regular expression to match URLs including IP addresses
            const urlPattern = /^(https?:\/\/)?((([a-zA-Z\d]([a-zA-Z\d-]{0,61}[a-zA-Z\d])?\.)+[a-zA-Z]{2,6})|(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})|(\[[0-9a-fA-F:.]+\]))(:\d+)?(\/[^\s]*)?$/;

            // Check if the selected text is a URL
            const isURL = urlCheck ? urlPattern.test(selectionText) : false;
            // If the text is a URL and doesn't start with "http://" or "https://", prepend "http://"
            const link = isURL
                ? (selectionText.startsWith('http://') || selectionText.startsWith('https://')
                    ? selectionText
                    : 'http://' + selectionText)
                : null

            // Split the input text into lines
            const lines = searchTooltipsEngines.trim().split('\n');

            // Map each line to the desired format
            const searchEngines = lines.map(line => {
                // Split each line into label and URL template
                const [label, urlTemplate] = line.split('=>');

                // Ensure that both label and URL are present
                if (!label || !urlTemplate) return null;

                return {
                    label: label.trim(),
                    handler: () => triggerLinkPopup(e, urlTemplate.replace('%s', encodeURIComponent(selectionText)))
                };
            }).filter(item => item !== null); // Filter out any null values in case of formatting issues

            const actions = isURL
                ? [{
                    label: '↗️',
                    handler: () => triggerLinkPopup(e, link)
                }]
                : searchEngines;

            const range = selection.getRangeAt(0).cloneRange();
            const textRect = range.getBoundingClientRect(); // Get the bounding box of the selected text
            hoverlinkOrText = true;

            if (searchTooltips) searchTooltips.remove();
            searchTooltips = null;
            searchTooltips = createTooltip(textRect.left, textRect.bottom, actions, 1500);

            const checkSearchCursorInsideViewport = (e) => {
                const x = e.clientX; // Get the cursor's X position
                const y = e.clientY; // Get the cursor's Y position

                // Check if cursor is inside the viewport
                const isInsideSearchViewport = (
                    x >= 0 &&
                    x <= window.innerWidth &&
                    y >= 0 &&
                    y <= window.innerHeight
                );

                if (!isInsideSearchViewport) {
                    if (searchTooltips) {
                        searchTooltips.remove();
                        searchTooltips = null;
                        hoverlinkOrText = false;
                    }
                    document.removeEventListener('mousemove', checkSearchCursorInsideViewport);
                }
            };

            document.addEventListener('mousemove', checkSearchCursorInsideViewport);

            // Handle when the mouse leaves the document (i.e., the entire page)
            document.addEventListener('mouseleave', function removeSearchTooltip() {
                if (searchTooltips) {
                    searchTooltips.remove();
                    searchTooltips = null;
                }
                document.removeEventListener('mouseleave', removeSearchTooltip);
                document.removeEventListener('mousemove', checkSearchCursorInsideViewport);
            });

        }, 0);

    } else {

        if (searchTooltips) searchTooltips.remove();
        searchTooltips = null;
    }
}


// Function to check if a link is already in the collection
function isLinkInCollection(url) {
    if (collection[1] && Array.isArray(collection[1].links)) {
        return collection[1].links.some(item => item.url === url);
    }
    return false; // If links array doesn't exist, return false
}

// Function to add link indicator when hovering over a link
function changeCursorOnHover(e, anchorElement) {
    const linkElement = anchorElement ||
        (e.target instanceof HTMLElement && (e.target.tagName === 'A' ? e.target : e.target.closest('a')));
    if (linkElement) {


        const linkUrl = linkElement ?
            (linkElement.getAttribute('data-url') ||
                (linkElement.href.startsWith('/') ? window.location.protocol + linkElement.href : linkElement.href))
            : null;

        if (!linkUrl) return;
        if (linkUrl && /^(mailto|tel|javascript):/.test(linkUrl.trim())) return;
        if (isUrlDisabled(linkUrl, linkDisabledUrls)) return;
        if (linkElement && linkElement.getAttribute('role') === 'button' && linkElement.hasAttribute('aria-expanded')) return;


        if (!document.body.contains(e.target)) {
            return; // If the element is not in the DOM anymore, do nothing
        }
        if (linkIndicator) {
            linkIndicator.remove(); // Remove any existing indicator
        }
        linkIndicator = null;

        if (searchTooltips) searchTooltips.remove();
        searchTooltips = null;

        if (tooltip) tooltip.remove();

        const linkRect = e.target.getBoundingClientRect(); // Get link's bounding box
        linkIndicator = createCandleProgressBar(e.clientX - 20, e.clientY, 6000);
        if (anchorElement) {
            anchorElement.addEventListener('mouseleave', () => {
                clearTimeoutsAndProgressBars();
                e.target.addEventListener('mousemove', handleMouseOver)
            }, { once: true })
            e.target.addEventListener('mouseleave', () => {
                clearTimeoutsAndProgressBars();
                e.target.removeEventListener('mousemove', handleMouseOver)
            }, { once: true })
        }
        const checkCursorInside = (e) => {
            const x = e.clientX; // Get the cursor's X position
            const y = e.clientY; // Get the cursor's Y position

            // Check if cursor is inside the link's bounding box
            const isInsideLink = (
                x >= linkRect.left &&
                x <= linkRect.right &&
                y >= linkRect.top &&
                y <= linkRect.bottom
            );

            if (isInsideLink && linkIndicator) {
                linkIndicator.style.top = `${y + 25}px`; // Update top position
                linkIndicator.style.left = `${x - 20}px`; // Update left position
            } else {
                if (linkIndicator) linkIndicator.remove();
                linkIndicator = null; // Reset the indicator reference

                if (searchTooltips) searchTooltips.remove();
                searchTooltips = null;
                document.removeEventListener('mousemove', checkCursorInside);
            }

        };

        document.addEventListener('mousemove', checkCursorInside);

        // Clean up when mouse leaves the link
        e.target.addEventListener('mouseout', function () {
            if (linkIndicator) {
                linkIndicator.remove();
            }
            linkIndicator = null;

            if (searchTooltips) searchTooltips.remove();
            searchTooltips = null;
            document.removeEventListener('mousemove', checkCursorInside);
        }, { once: true });
    }
}



function handleContextMenu() {
    chrome.runtime.sendMessage({ addContextMenuItem: contextMenuEnabled }, (response) => {
        if (chrome.runtime.lastError) {
            console.error("Runtime error:", chrome.runtime.lastError);
        } else {
        }
    });

    if (tooltip) tooltip.remove();
    if (searchTooltips) searchTooltips.remove();
    if (linkIndicator) {
        linkIndicator.remove();
    }
    linkIndicator = null;
    hoverlinkOrText = false;
    searchTooltips = null;
}

async function handleKeyDown(e) {
    if (e.key === 'Escape') {
        try {
            if (closedByEsc) {
                chrome.runtime.sendMessage({ action: 'closeCurrentTab' });
            }
        } catch (error) {
            console.error('Error loading user configs:', error);
        }
    } else {
        try {

            if (previewModeEnable && clickModifiedKey !== 'None') {
                if (e.key === clickModifiedKey) {
                    previewMode = true;
                    document.addEventListener('keyup', (e) => {
                        if (e.key === clickModifiedKey) {
                            previewMode = false;
                        }

                        handleMessageRequest({ action: 'updateIcon', previewMode: previewMode, theme: theme });

                    }, { once: true })
                } else {
                    previewMode = false;
                }
            } else if (previewModeEnable && clickModifiedKey === 'None') {
                previewMode = true;
            } else {
                previewMode = false;
            }


            handleMessageRequest({ action: 'updateIcon', previewMode: previewMode, theme: theme });

        } catch (error) {
            console.error('Error loading user configs:', error);
        }

    }
}

function sendDebouncedMessage() {
    // Clear any existing timeout to reset the debounce
    clearTimeout(debounceTimer);

    // Set a new timeout to send the message after a small delay (e.g., 100ms)
    debounceTimer = setTimeout(() => {
        // Only send the last message (to avoid duplicate requests)
        if (lastMessage) {
            chrome.runtime.sendMessage(lastMessage, () => {
                if (chrome.runtime.lastError) {
                    console.error('Error sending message:', chrome.runtime.lastError);
                }

                // Reset click state if required
                if (shouldResetClickState) {
                    resetClickState(); // Ensure the reset happens
                }

                // Reset the flag and last message after sending
                shouldResetClickState = false;
                lastMessage = null;
            });
        }
    }, 300); // Adjust delay as needed
}

function handleMessageRequest(message, resetClickState = null) {
    // Store the latest message to be sent
    lastMessage = message;

    // Update the flag if a resetClickState function is provided
    if (typeof resetClickState === 'function') {
        shouldResetClickState = true;
    }

    // Call the debounced function to handle the message
    sendDebouncedMessage();
}

async function handleKeyUp(e) {

    try {
        const key = e.key === 'Control' ? 'Ctrl' : e.key;
        if (doubleTapKeyToSendPageBack === 'None' || key !== doubleTapKeyToSendPageBack) return;

        const currentTime = new Date().getTime();
        const timeDifference = currentTime - lastKeyTime;

        if (key === lastKey && timeDifference < 300) {

            if (linkIndicator) {
                linkIndicator.remove();
            }
            linkIndicator = null;

            if (searchTooltips) searchTooltips.remove();
            searchTooltips = null;
            chrome.runtime.sendMessage({ action: 'sendPageBack' });
        } else {
            lastKeyTime = currentTime;
            lastKey = key;
        }
    } catch (error) {
    }


}


function handleMouseDown(e) {
    const anchorElement = e.composedPath().find(node => node instanceof HTMLAnchorElement);

    if (focusAt && Date.now() - focusAt < 50) {
        e.preventDefault();
        e.stopPropagation();
        return;
    }
    focusAt = null;
    isDragging = false;
    removeBlurOverlay();
    initialMouseX = e.clientX;
    initialMouseY = e.clientY;

    const keyMap = { 'Ctrl': e.ctrlKey, 'Alt': e.altKey, 'Shift': e.shiftKey, 'Meta': e.metaKey };
    const linkElement = anchorElement ||
        (e.target instanceof HTMLElement && (e.target.tagName === 'A' ? e.target : e.target.closest('a')));

    const linkUrl = linkElement ?
        (linkElement.getAttribute('data-url') ||
            (linkElement.href.startsWith('/') ? window.location.protocol + linkElement.href : linkElement.href))
        : null;


    if (
        sendBackByMiddleClickEnable &&
        e.button === 1 &&
        !e.altKey &&
        !e.shiftKey &&
        !e.ctrlKey &&
        !e.metaKey &&
        !linkElement &&
        !e.target.closest("a, input, textarea, button, img")
    ) {
        e.preventDefault();
        e.stopPropagation();
        chrome.runtime.sendMessage({ action: "sendPageBack" });
    }

    if (linkUrl && /^(mailto|tel|javascript):/.test(linkUrl.trim())) return;
    if (isUrlDisabled(linkUrl, linkDisabledUrls)) return;

    if (modifiedKey === 'None' || keyMap[modifiedKey]) {

        const events = ["click", "dragstart", "dragover", "drop", "mouseup"];
        events.forEach(event => document.addEventListener(event, handleEvent, true));

    } else {
        const events = ["click", "dragstart", "dragover", "drop"];

        events.forEach(event => document.removeEventListener(event, handleEvent, true));
    }

    if (!(isUrlDisabled(window.location.href, previewModeDisabledUrls)) && previewModeEnable) {
        if (clickModifiedKey === 'None' || keyMap[clickModifiedKey]) {

            previewMode = (previewMode !== undefined) ? previewMode : previewModeEnable;

            // Add the event listener
            const events = ["click", "mouseup"];

            events.forEach(event => document.addEventListener(event, handleEvent, true));
        } else {
            previewMode = false;
        }

        // In popup.js or content.js
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            theme = 'dark';
        } else {
            theme = 'light';
        }

        handleMessageRequest({ action: 'updateIcon', previewMode: previewMode, theme: theme });
    }

    if (holdToPreview && e.button === 0 && !e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        const linkElement = anchorElement ||
            (e.target instanceof HTMLElement && (e.target.tagName === 'A' ? e.target : e.target.closest('a')));

        const linkUrl = linkElement ?
            (linkElement.getAttribute('data-url') ||
                (linkElement.href.startsWith('/') ? window.location.protocol + linkElement.href : linkElement.href))
            : null;

        // Check if the URL is valid and not a JavaScript link
        if (!linkUrl || (linkUrl && /^(mailto|tel|javascript):/.test(linkUrl.trim()))) {
            isMouseDownOnLink = false;
            clearTimeoutsAndProgressBars();
            document.removeEventListener('dragstart', cancelHoldToPreviewOnDrag, true);
        } else {
            isMouseDownOnLink = true;
            document.addEventListener('mouseup', () => {
                if (isMouseDownOnLink) {
                    firstDownOnLinkAt = undefined;
                    isMouseDownOnLink = false; // Reset the flag
                    clearTimeout(holdTimeout); // Clear the hold timeout to prevent handleHoldLink
                    clearTimeoutsAndProgressBars(); // Cleanup progress bar
                }
            }, { once: true });
            document.addEventListener('dragstart', cancelHoldToPreviewOnDrag, true);

            document.addEventListener('click', (e) => {
                if (
                    firstDownOnLinkAt &&
                    isMouseDownOnLink &&
                    (Date.now() - firstDownOnLinkAt > (holdToPreviewTimeout ?? 1500))
                ) {
                    // Prevent default action on the link immediately
                    e.preventDefault();
                    e.stopPropagation();
                }
            }, true);

            // Show progress bar for preview
            setTimeout(() => {
                if (!isMouseDownOnLink) return; // Abort if mouse is not held down
                previewProgressBar = (countdownStyle === 'circle') ?
                    createCircleProgressBar(e.clientX, e.clientY - 30, (holdToPreviewTimeout ?? 1500) - 100)
                    : createCandleProgressBar(
                        e.clientX - 20,
                        e.clientY - 50,
                        (holdToPreviewTimeout ?? 1500) - 100
                    );
            }, 100);

            // Set a timeout for the hold-to-preview action
            holdTimeout = setTimeout(() => {
                if (!isMouseDownOnLink) return; // Ensure the mouse is still down
                const now = Date.now();
                clearTimeoutsAndProgressBars(); // Cleanup any progress bar
                if (e.button !== 0 || isDoubleClick) return;
                if (!firstDownOnLinkAt) return;
                handleHoldLink(e, linkUrl, now); // Trigger the hold-to-preview action
            }, holdToPreviewTimeout ?? 1500);

            // Check the initial mouse down time
            if (firstDownOnLinkAt && Date.now() - firstDownOnLinkAt > (holdToPreviewTimeout ?? 1500)) {
                e.preventDefault();
                clearTimeout(holdTimeout); // Clear the timeout
                clearTimeoutsAndProgressBars(); // Cleanup
                firstDownOnLinkAt = null;
                hasPopupTriggered = true; // Mark the popup as triggered
            } else {
                firstDownOnLinkAt = Date.now(); // Record the initial mouse down time
            }
        }
    } else {
        isMouseDownOnLink = false;
        if (previewProgressBar) {
            previewProgressBar.remove();
            previewProgressBar = null;
        }
        document.removeEventListener('dragstart', cancelHoldToPreviewOnDrag, true);
    }


    try {
        const message = closeWhenFocusedInitialWindow
            ? { action: 'windowRegainedFocus', addContextMenuItem: contextMenuEnabled }
            : { addContextMenuItem: contextMenuEnabled };
        chrome.runtime.sendMessage(message);
    } catch (error) {
        console.error('Error loading user configs:', error);
    }



    isMouseDown = true;
    hasPopupTriggered = false;
}

// Function to cancel hold-to-preview when dragging starts
function cancelHoldToPreviewOnDrag() {
    firstDownOnLinkAt = undefined;
    isMouseDownOnLink = false;
    clearTimeoutsAndProgressBars();
    document.removeEventListener('dragstart', cancelHoldToPreviewOnDrag, true);
}

function handleHoldLink(e, linkUrl, now) {

    isMouseDownOnLink = true;
    if (firstDownOnLinkAt && now - firstDownOnLinkAt >= (holdToPreviewTimeout ?? 1500) && isMouseDownOnLink) {
        hasPopupTriggered = true;
        // handlePreviewMode(e);

        if (linkUrl) {
            e.preventDefault();
            e.stopPropagation();

            // Set finalLinkUrl based on linkUrl, imgSupport, and searchEngine
            let finalLinkUrl = linkUrl;

            if (!finalLinkUrl) return;

            if (linkIndicator) {
                linkIndicator.remove();
            }
            linkIndicator = null;

            if (searchTooltips) searchTooltips.remove();
            searchTooltips = null;

            if (window.self !== window.top && window.origin !== 'https://viewscreen.githubusercontent.com') {
                // Inside the iframe content script
                window.parent.postMessage({ action: 'blurParent' }, '*');
            } else {
                if (blurEnabled) {
                    addBlurOverlay(blurPx, blurTime);
                }
                addClickMask();
            }

            chrome.runtime.sendMessage({
                linkUrl: finalLinkUrl,
                lastClientX: e.screenX,
                lastClientY: e.screenY,
                width: window.screen.availWidth,
                height: window.screen.availHeight,
                top: window.screen.availTop,
                left: window.screen.availLeft,
                trigger: 'click'
            }, () => {
                isMouseDownOnLink = false;
                clearTimeoutsAndProgressBars();
                document.removeEventListener('mouseup', handleHoldLink, true);
                document.removeEventListener('dragstart', cancelHoldToPreviewOnDrag, true);
                if (linkIndicator) linkIndicator.remove();
                linkIndicator = null;
                if (searchTooltips) searchTooltips.remove();
                searchTooltips = null;
                hasPopupTriggered = true;
                finalLinkUrl = null;
            });

        }
    } else {
        firstDownOnLinkAt = null;
        clearTimeoutsAndProgressBars();
    }
}



function handleDoubleClick(e) {
    document.addEventListener('mousedown', () => {
        isDoubleClick = false;
    }, { once: true });
    isDoubleClick = true;
    // Prevent the single-click action from triggering
    clearTimeout(clickTimeout);

    const linkElement = e.composedPath().find(node => node instanceof HTMLAnchorElement) ||
        (e.target instanceof HTMLElement && (e.target.tagName === 'A' ? e.target : e.target.closest('a')));

    const linkUrl = linkElement ?
        (linkElement.getAttribute('data-url') ||
            (linkElement.href.startsWith('/') ? window.location.protocol + linkElement.href : linkElement.href))
        : null;

    if (!previewModeEnable || clickModifiedKey !== 'None') return;


    // Check if the double-clicked element is a link
    const imageElement = e.target instanceof HTMLElement && (e.target.tagName === 'IMG' ? e.target : e.target.closest('img'));
    const imageUrl = imageElement ? imageElement.src : null;
    if (doubleClickToSwitch && !imageUrl && !linkUrl) {
        e.preventDefault(); // Prevent the default double-click action
        e.stopPropagation(); // Stop the event from bubbling up
        hasPopupTriggered = true;
        isDoubleClick = true;

        previewMode = !previewMode;


        // In popup.js or content.js
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            theme = 'dark';
        } else {
            theme = 'light';
        }

        handleMessageRequest({ action: 'updateIcon', previewMode: previewMode, theme: theme }, resetClickState);

    } else if (linkUrl) {
        if (linkUrl && /^(mailto|tel|javascript):/.test(linkUrl.trim())) return;
        if (isUrlDisabled(linkUrl, linkDisabledUrls)) return;
        if (doubleClickAsClick) {
            e.preventDefault(); // Prevent the default double-click action
            e.stopPropagation(); // Stop the event from bubbling up
            hasPopupTriggered = true;
            isDoubleClick = true;
            if (e.target.shadowRoot) {
                linkElement.click();
            } else {
                try {
                    const clickEvent = new MouseEvent('click', {
                        bubbles: true, // Make sure the event bubbles
                        cancelable: true // Make the event cancelable
                    });
                    e.target.dispatchEvent(clickEvent);
                } catch (error) {
                    e.target.closest('a').click();
                }
            }
        }
    } else {
        resetClickState();
    }

    // Remove the event listener after it triggers once
    document.removeEventListener('dblclick', handleDoubleClick, true);
    // isDoubleClick = false;


    // In popup.js or content.js
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        theme = 'dark';
    } else {
        theme = 'light';
    }

    handleMessageRequest({ action: 'updateIcon', previewMode: previewMode, theme: theme });
    setTimeout(() => {
        isDoubleClick = false;
    }, 250);

}
function resetClickState() {
    // Reset variables after click or double-click
    isDoubleClick = false;
    hasPopupTriggered = false;
    clearTimeout(clickTimeout);
}

function handleEvent(e) {
    if (e.type === 'dragstart') {
        isDragging = true;
        const anchorElement = e.composedPath().find(node => node instanceof HTMLAnchorElement);
        const keyMap = { 'Ctrl': e.ctrlKey, 'Alt': e.altKey, 'Shift': e.shiftKey, 'Meta': e.metaKey };
        if (modifiedKey === 'None' || keyMap[modifiedKey]) {

            handleDragStart(e, anchorElement);

        } else {
            isDragging = false;
        }

    } else if (['dragover', 'drop'].includes(e.type) && isDragging) {
        preventEvent(e);

    } else if (e.type === 'click') {
        if (isDragging) {
            preventEvent(e);

            isDragging = false;
        } else if ((firstDownOnLinkAt && isMouseDownOnLink && (Date.now() - firstDownOnLinkAt > (holdToPreviewTimeout ?? 1500)))) {
            // Prevent default action on the link immediately
            e.preventDefault();
            e.stopPropagation();

        } else {
            document.addEventListener('dblclick', handleDoubleClick, true);
            const linkElement = e.composedPath().find(node => node instanceof HTMLAnchorElement) ||
                (e.target instanceof HTMLElement && (e.target.tagName === 'A' ? e.target : e.target.closest('a')));

            const linkUrl = linkElement ?
                (linkElement.getAttribute('data-url') ||
                    (linkElement.href.startsWith('/') ? window.location.protocol + linkElement.href : linkElement.href))
                : null;

            if (linkUrl && /^(mailto|tel|javascript):/.test(linkUrl.trim())) return;
            if (isUrlDisabled(linkUrl, linkDisabledUrls)) return;
            if (previewMode &&
                linkUrl &&
                !isDoubleClick &&
                !linkElement.closest("[hx-on\\:click]") &&
                !(e.target.closest("button") && e.target.closest("button").getAttribute("aria-haspopup") === "menu")) {
                e.preventDefault();
                e.stopPropagation();

                clickTimeout = setTimeout(() => {
                    handlePreviewMode(e, linkUrl);

                }, 250);
            }


            // In popup.js or content.js
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                theme = 'dark';
            } else {
                theme = 'light';
            }

            handleMessageRequest({ action: 'updateIcon', previewMode: previewMode, theme: theme });
        }


        // In popup.js or content.js
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            theme = 'dark';
        } else {
            theme = 'light';
        }

        handleMessageRequest({ action: 'updateIcon', previewMode: previewMode, theme: theme });


    } else if (e.type === 'mouseup' && isDragging && e.button === 0) {
        isDragging = false;
        firstDownOnLinkAt = null;
        isMouseDownOnLink = false;
        isMouseDown = false;
        e.preventDefault();
        e.stopImmediatePropagation();

        setTimeout(resetDraggingState, 0);
    } else if (e.type === 'mouseup' && e.button === 0) {

        const linkElement = e.composedPath().find(node => node instanceof HTMLAnchorElement) ||
            (e.target instanceof HTMLElement && (e.target.tagName === 'A' ? e.target : e.target.closest('a')));

        const linkUrl = linkElement ?
            (linkElement.getAttribute('data-url') ||
                (linkElement.href.startsWith('/') ? window.location.protocol + linkElement.href : linkElement.href))
            : null;

        // Check if the focused element is an input or textarea
        const activeEl = document.activeElement;
        if (
            activeEl &&
            (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")
        ) {
            isInputboxFocused = true;
        } else {
            isInputboxFocused = false;
        }

        if (linkUrl && /^(mailto|tel|javascript):/.test(linkUrl.trim())) return;
        if (isUrlDisabled(linkUrl, linkDisabledUrls)) return;
        isDragging = false;

        handleMouseUpWithProgressBar(e);

        addSearchTooltipsOnHover(e);


    }


    // In popup.js or content.js
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        theme = 'dark';
    } else {
        theme = 'light';
    }

    handleMessageRequest({ action: 'updateIcon', previewMode: previewMode, theme: theme });
}

function handlePreviewMode(e, linkUrl) {
    if (!e.isTrusted) {
        if (hasPopupTriggered || isDoubleClick) return;
    } else {
        if (!isMouseDown || hasPopupTriggered || isDoubleClick) return;
    }

    if (linkUrl) {
        e.preventDefault();
        e.stopPropagation();

        // Set finalLinkUrl based on linkUrl, imgSupport, and searchEngine
        let finalLinkUrl = linkUrl;

        if (!finalLinkUrl) return;

        if (linkIndicator) {
            linkIndicator.remove();
        }
        linkIndicator = null;

        if (searchTooltips) searchTooltips.remove();
        searchTooltips = null;
        if (window.self !== window.top && window.origin !== 'https://viewscreen.githubusercontent.com') {
            // Inside the iframe content script
            window.parent.postMessage({ action: 'blurParent' }, '*');
        } else {
            if (blurEnabled) {
                addBlurOverlay(blurPx, blurTime);
            }
            addClickMask();
        }

        chrome.runtime.sendMessage({
            linkUrl: finalLinkUrl,
            lastClientX: e.screenX,
            lastClientY: e.screenY,
            width: window.screen.availWidth,
            height: window.screen.availHeight,
            top: window.screen.availTop,
            left: window.screen.availLeft,
            trigger: 'click'
        }, () => {
            if (linkIndicator) linkIndicator.remove();
            linkIndicator = null;
            if (searchTooltips) searchTooltips.remove();
            searchTooltips = null;
            hasPopupTriggered = true;
            finalLinkUrl = null;
            isDoubleClick = false;

        });

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

    if (isDragging) {
        clearTimeoutsAndProgressBars();
        return;
    }

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

            const finalHoverSearchEngine = (hoverSearchEngine !== 'None' ? (hoverSearchEngine || 'https://www.google.com/search?q=%s') : null);

            // Regular expression to match URLs including IP addresses
            const urlPattern = /^(https?:\/\/)?((([a-zA-Z\d]([a-zA-Z\d-]{0,61}[a-zA-Z\d])?\.)+[a-zA-Z]{2,6})|(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})|(\[[0-9a-fA-F:.]+\]))(:\d+)?(\/[^\s]*)?$/;

            // Check if the selected text is a URL
            const isURL = urlCheck ? urlPattern.test(selectionText) : false;

            // If the text is a URL and doesn't start with "http://" or "https://", prepend "http://"
            let finalLinkUrl = isURL
                ? (selectionText.startsWith('http://') || selectionText.startsWith('https://')
                    ? selectionText
                    : 'http://' + selectionText)
                : (finalHoverSearchEngine && selectionText !== ''
                    ? finalHoverSearchEngine.replace('%s', encodeURIComponent(selectionText))
                    : null);

            if (!finalLinkUrl) return;
            if (isUrlDisabled(finalLinkUrl, linkDisabledUrls)) return;


            // Clear any existing timeout, interval, and progress bar
            clearTimeoutsAndProgressBars();

            hoverElement = selectionText; // Set the current hover element
            hoverInitialMouseX = e.clientX; // Store initial mouse position
            hoverInitialMouseY = e.clientY;

            const hoverTimeoutDuration = parseInt(hoverTimeout, 10) || 0; // Default to disabled if not set

            // Create and display the progress bar immediately
            progressBar = (countdownStyle === 'circle') ?
                createCircleProgressBar(hoverInitialMouseX, hoverInitialMouseY, hoverTimeoutDuration)
                : createCandleProgressBar(hoverInitialMouseX, hoverInitialMouseY, hoverTimeoutDuration);

            const onMouseMove = (moveEvent) => {

                if (isDragging) {
                    clearTimeoutsAndProgressBars();
                    return;
                }

                const selection = window.getSelection();
                const selectionText = selection.toString().trim();
                if (selectionText === '') return;

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

                        progressBar = (countdownStyle === 'circle') ?
                            createCircleProgressBar(currentMouseX, currentMouseY, hoverTimeoutDuration)
                            : createCandleProgressBar(currentMouseX, currentMouseY, hoverTimeoutDuration);
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


async function handleDragStart(e, anchorElement) {

    if (searchTooltips) searchTooltips.remove();
    searchTooltips = null;

    const finalDragStartEnable = dragStartEnable !== 'undefined' ? dragStartEnable : false;
    const finalDropInEmptyOnly = dropInEmptyOnly !== 'undefined' ? dropInEmptyOnly : false;

    if (!finalDragStartEnable) {

        const viewportTop = e.screenY - e.clientY;
        const viewportBottom = e.screenY - e.clientY + window.innerHeight;
        const viewportLeft = e.screenX - e.clientX;
        const viewportRight = e.screenX - e.clientX + window.innerWidth;


        let lastLeaveTime = 0;
        function updateLastLeaveTimestamp(e) {
            const now = performance.now();

            if (now - lastLeaveTime < 20) return; // Ignore events triggered too quickly

            lastLeaveTime = now;
            lastLeaveTimestamp = e.timeStamp;
            lastLeaveRelatedTarget = e.relatedTarget;
        }

        if (!Array.isArray(dragDirections) || dragDirections.length === 0) {
            isDragging = false;
            return;
        }
        function onDragend(e, endInfo = null) {
            if (finalDropInEmptyOnly && (endInfo ? endInfo.dropEffect : e.dataTransfer.dropEffect) !== 'none') return;
            if (!endInfo) {
                const keyMap = { 'Ctrl': e.ctrlKey, 'Alt': e.altKey, 'Shift': e.shiftKey, 'Meta': e.metaKey };
                if (modifiedKey === 'None') {
                    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
                } else {
                    // Ensure only the specified modifiedKey is pressed
                    const isOnlyModifiedKeyDown = keyMap[modifiedKey] &&
                        Object.keys(keyMap).every(key => key === modifiedKey || !keyMap[key]);
                    if (!isOnlyModifiedKeyDown) {
                        return;
                    }
                }
            }

            // Do nothing when dragging out of the current page
            if (window.self === window.top) {
                if (!(viewportLeft < e.screenX && e.screenX < viewportRight && viewportTop < e.screenY && e.screenY < viewportBottom)) {
                    document.removeEventListener('dragend', onDragend, true);
                    resetDraggingState();
                    return;
                }
                if (lastLeaveRelatedTarget === null && e.timeStamp - lastLeaveTimestamp > 600) {
                    lastLeaveTimestamp = undefined;
                    lastLeaveRelatedTarget = undefined;
                    return;
                }
                document.removeEventListener('dragleave', updateLastLeaveTimestamp)
            }
            if (!isMouseDown || hasPopupTriggered) return;
            const selectionText = window.getSelection().toString();
            const linkElement = (endInfo && endInfo.endElement) || e.composedPath().find(node => node instanceof HTMLAnchorElement) ||
                (e.target instanceof HTMLElement && (e.target.tagName === 'A' ? e.target : e.target.closest('a')));

            const linkUrl = linkElement ?
                (linkElement.getAttribute('data-url') ||
                    (linkElement.href.startsWith('/') ? window.location.protocol + linkElement.href : linkElement.href))
                : null;

            if (linkUrl && /^(mailto|tel|javascript):/.test(linkUrl.trim())) return;

            const imageElement = e.target instanceof HTMLElement && (e.target.tagName === 'IMG' ? e.target : e.target.closest('img'));
            let imageUrl = imageElement ? imageElement.src : null;

            if (linkUrl || selectionText || imageUrl) {
                const finalSearchEngine = (searchEngine !== 'None' ? (searchEngine || 'https://www.google.com/search?q=%s') : null);
                // Regular expression to match URLs including IP addresses
                const urlPattern = /^(https?:\/\/)?((([a-zA-Z\d]([a-zA-Z\d-]{0,61}[a-zA-Z\d])?\.)+[a-zA-Z]{2,6})|(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})|(\[[0-9a-fA-F:.]+\]))(:\d+)?(\/[^\s]*)?$/;

                // Check if the selected text is a URL
                const isURL = urlCheck ? urlPattern.test(selectionText) : false;

                // Ensure that URLs without a protocol are handled
                const processedLinkUrl = isURL
                    ? (selectionText.startsWith('http://') || selectionText.startsWith('https://')
                        ? selectionText
                        : 'http://' + selectionText)
                    : null;

                if (imgSearchEnable && imageUrl) {
                    const imgSearchEngineMap = {
                        "https://www.google.com/search?q=%s": "https://lens.google.com/uploadbyurl?url=%s",
                        "https://www.bing.com/search?q=%s": "https://www.bing.com/images/search?q=imgurl:%s&view=detailv2&iss=sbi",
                        "https://www.baidu.com/s?wd=%s": "https://graph.baidu.com/details?isfromtusoupc=1&tn=pc&carousel=0&promotion_name=pc_image_shituindex&extUiData%5bisLogoShow%5d=1&image=%s",
                        "https://yandex.com/search/?text=%s": "https://yandex.com/images/search?rpt=imageview&url=%s"
                    };
                    if (imgSearchEngineMap.hasOwnProperty(finalSearchEngine)) {

                        imageUrl = imgSearchEngineMap[finalSearchEngine].replace('%s', encodeURIComponent(imageUrl));
                    }
                }

                // Set finalLinkUrl based on linkUrl, imgSupport, and searchEngine
                let finalLinkUrl = processedLinkUrl || linkUrl || (imgSupport ? imageUrl : null) ||
                    ((finalSearchEngine && selectionText.trim() !== '')
                        ? finalSearchEngine.replace('%s', encodeURIComponent(selectionText))
                        : null);
                if (!finalLinkUrl) return;


                const currentMouseX = e.clientX || (endInfo && endInfo.endClientX);
                const currentMouseY = e.clientY || (endInfo && endInfo.endClientY);
                let direction = '';

                if (dragPx !== 0) {
                    if ((Math.abs(currentMouseX - initialMouseX) > dragPx) || (Math.abs(currentMouseY - initialMouseY) > dragPx)) {
                        // identify drag directions
                        if (Math.abs(currentMouseX - initialMouseX) > Math.abs(currentMouseY - initialMouseY)) {
                            direction = (currentMouseX > initialMouseX) ? 'right' : 'left';
                        } else {
                            direction = (currentMouseY > initialMouseY) ? 'down' : 'up';
                        }

                        if (dragDirections.includes(direction)) {

                            isDragging = true;

                            if (linkIndicator) {
                                linkIndicator.remove();
                            }
                            linkIndicator = null;

                            if (searchTooltips) searchTooltips.remove();
                            searchTooltips = null;
                            e.preventDefault();
                            e.stopImmediatePropagation();

                            if (window.self !== window.top && window.origin !== 'https://viewscreen.githubusercontent.com') {
                                // Inside the iframe content script
                                window.parent.postMessage({ action: 'blurParent' }, '*');
                            } else {
                                if (blurEnabled) {
                                    addBlurOverlay(blurPx, blurTime);
                                }
                                addClickMask();
                            }
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
                                imageUrl = null;
                                if (linkIndicator) linkIndicator.remove();
                                linkIndicator = null;
                                if (searchTooltips) searchTooltips.remove();
                                searchTooltips = null;
                                isDragging = false;

                                if (window.getSelection().toString()) {
                                    window.getSelection().removeAllRanges();
                                }


                            });
                        } else {
                            isDragging = false;
                        }
                    } else {
                        isDragging = false;
                    }
                } else {
                    // identify drag directions
                    if (Math.abs(currentMouseX - initialMouseX) > Math.abs(currentMouseY - initialMouseY)) {
                        direction = (currentMouseX > initialMouseX) ? 'right' : 'left';
                    } else {
                        direction = (currentMouseY > initialMouseY) ? 'down' : 'up';
                    }

                    if (dragDirections.includes(direction)) {

                        e.preventDefault();
                        e.stopImmediatePropagation();
                        isDragging = true;

                        if (linkIndicator) {
                            linkIndicator.remove();
                        }
                        linkIndicator = null;
                        if (searchTooltips) searchTooltips.remove();
                        searchTooltips = null;

                        if (window.self !== window.top && window.origin !== 'https://viewscreen.githubusercontent.com') {
                            // Inside the iframe content script
                            window.parent.postMessage({ action: 'blurParent' }, '*');
                        } else {
                            if (blurEnabled) {
                                addBlurOverlay(blurPx, blurTime);
                            }
                            addClickMask();
                        }
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
                            imageUrl = null;
                            if (linkIndicator) linkIndicator.remove();
                            linkIndicator = null;
                            if (searchTooltips) searchTooltips.remove();
                            searchTooltips = null;
                            isDragging = false;

                            if (window.getSelection().toString()) {
                                window.getSelection().removeAllRanges();
                            }


                        });
                    } else {
                        isDragging = false;
                    }
                }


            } else {
                isDragging = false;
            }
        }

        if (window.self !== window.top && window.origin !== 'https://viewscreen.githubusercontent.com') {
            window.parent.postMessage({ action: 'dragleaveUpdate' }, '*');

            window.addEventListener('dragend', (e) => {
                const endElement = e.composedPath().find(node => node instanceof HTMLAnchorElement) ||
                    (e.target instanceof HTMLElement && (e.target.tagName === 'A' ? e.target : e.target.closest('a')));
                const top = e.screenY - e.clientY;
                const left = e.screenX - e.clientX;
                const endX = e.screenX;
                const endY = e.screenY;
                const endTimestamp = e.timeStamp;
                const endInfo = {
                    endElement,
                    endClientX: e.clientX,
                    endClientY: e.clientY,
                    dropEffect: e.dataTransfer.dropEffect
                }
                const keyMap = { 'Ctrl': e.ctrlKey, 'Alt': e.altKey, 'Shift': e.shiftKey, 'Meta': e.metaKey };
                if (modifiedKey === 'None') {
                    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
                } else {
                    // Ensure only the specified modifiedKey is pressed
                    const isOnlyModifiedKeyDown = keyMap[modifiedKey] &&
                        Object.keys(keyMap).every(key => key === modifiedKey || !keyMap[key]);
                    if (!isOnlyModifiedKeyDown) {
                        return;
                    }
                }
                window.addEventListener('message', (e) => {
                    if (e.data && e.data.type === 'RESULT') {
                        if (e.data.isOut) {
                            // do nothing
                        } else {
                            onDragend(e, endInfo);
                        }
                    }

                }, { once: true })
                window.parent.postMessage({ action: 'dragendCheck', top, left, endY, endX, endTimestamp }, '*');
            }, { capture: true, once: true })

        } else {
            document.addEventListener('dragleave', updateLastLeaveTimestamp)
            document.addEventListener('dragend', onDragend, { capture: true, once: true });
        }
    } else {
        if (!isMouseDown || hasPopupTriggered) return;

        const selectionText = window.getSelection().toString();
        const linkElement = anchorElement ||
            (e.target instanceof HTMLElement && (e.target.tagName === 'A' ? e.target : e.target.closest('a')));

        const linkUrl = linkElement ?
            (linkElement.getAttribute('data-url') ||
                (linkElement.href.startsWith('/') ? window.location.protocol + linkElement.href : linkElement.href))
            : null;

        if (linkUrl && /^(mailto|tel|javascript):/.test(linkUrl.trim())) return;
        const imageElement = e.target instanceof HTMLElement && (e.target.tagName === 'IMG' ? e.target : e.target.closest('img'));
        let imageUrl = imageElement ? imageElement.src : null;

        if (linkUrl || selectionText || imageUrl) {
            const finalSearchEngine = (searchEngine !== 'None' ? (searchEngine || 'https://www.google.com/search?q=%s') : null);
            // Regular expression to match URLs including IP addresses
            const urlPattern = /^(https?:\/\/)?((([a-zA-Z\d]([a-zA-Z\d-]{0,61}[a-zA-Z\d])?\.)+[a-zA-Z]{2,6})|(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})|(\[[0-9a-fA-F:.]+\]))(:\d+)?(\/[^\s]*)?$/;

            // Check if the selected text is a URL
            const isURL = urlCheck ? urlPattern.test(selectionText) : false;


            // Ensure that URLs without a protocol are handled
            const processedLinkUrl = isURL
                ? (selectionText.startsWith('http://') || selectionText.startsWith('https://')
                    ? selectionText
                    : 'http://' + selectionText)
                : null;

            if (imgSearchEnable && imageUrl) {
                const imgSearchEngineMap = {
                    "https://www.google.com/search?q=%s": "https://lens.google.com/uploadbyurl?url=%s",
                    "https://www.bing.com/search?q=%s": "https://www.bing.com/images/search?q=imgurl:%s&view=detailv2&iss=sbi",
                    "https://www.baidu.com/s?wd=%s": "https://graph.baidu.com/details?isfromtusoupc=1&tn=pc&carousel=0&promotion_name=pc_image_shituindex&extUiData%5bisLogoShow%5d=1&image=%s",
                    "https://yandex.com/search/?text=%s": "https://yandex.com/images/search?rpt=imageview&url=%s"
                };
                if (imgSearchEngineMap.hasOwnProperty(finalSearchEngine)) {

                    imageUrl = imgSearchEngineMap[finalSearchEngine].replace('%s', encodeURIComponent(imageUrl));
                }
            }

            // Set finalLinkUrl based on linkUrl, imgSupport, and searchEngine
            let finalLinkUrl = processedLinkUrl || linkUrl || (imgSupport ? imageUrl : null) ||
                ((searchEngine && selectionText.trim() !== '')
                    ? searchEngine.replace('%s', encodeURIComponent(selectionText))
                    : null);
            if (!finalLinkUrl) return;


            e.preventDefault();
            e.stopImmediatePropagation();

            document.addEventListener('dragover', blockOver);

            isDragging = true;

            if (linkIndicator) {
                linkIndicator.remove();
            }
            linkIndicator = null;
            if (searchTooltips) searchTooltips.remove();
            searchTooltips = null;

            if (window.self !== window.top && window.origin !== 'https://viewscreen.githubusercontent.com') {
                // Inside the iframe content script
                window.parent.postMessage({ action: 'blurParent' }, '*');
            } else {
                if (blurEnabled) {
                    addBlurOverlay(blurPx, blurTime);
                }
                addClickMask();
            }
            const message = {
                linkUrl: finalLinkUrl,
                lastClientX: e.screenX,
                lastClientY: e.screenY,
                width: window.screen.availWidth,
                height: window.screen.availHeight,
                top: window.screen.availTop,
                left: window.screen.availLeft,
                trigger: 'drag'
            };
            chrome.runtime.sendMessage(message, () => {
                hasPopupTriggered = true;
                document.removeEventListener('dragend', onDragend, true);

                finalLinkUrl = null;
                imageUrl = null;
                if (linkIndicator) linkIndicator.remove();
                linkIndicator = null;
                if (searchTooltips) searchTooltips.remove();
                searchTooltips = null;
                isDragging = false;

                if (window.getSelection().toString()) {
                    window.getSelection().removeAllRanges();
                }
            });
        }
    }
}
function blockOver(e) {
    // Make sure dataTransfer is not null before using it
    if (e.dataTransfer) {
        // Prevent the default action (allow drop) but disable the drop effect
        e.preventDefault();  // This is needed to allow the drop target to be activated
        e.dataTransfer.dropEffect = 'none';  // Disable the drop effect
    }
}
function isUrlDisabled(url, disabledUrls) {
    return disabledUrls.some(disabledUrl => {
        // Check if the pattern is a regex
        if (disabledUrl.startsWith('/') && disabledUrl.endsWith('/')) {
            const regexPattern = disabledUrl.slice(1, -1); // Remove leading and trailing slashes
            try {
                const regex = new RegExp(regexPattern);
                return regex.test(url);
            } catch (e) {
                console.error('Invalid regex pattern:', regexPattern);
                return false;
            }
        }
        // Check if the pattern is a wildcard pattern
        else if (disabledUrl.includes('*')) {
            const regexPattern = disabledUrl
                .replace(/\\./g, '\\\\.') // Escape dots
                .replace(/\*/g, '.*'); // Replace wildcards with regex equivalent
            try {
                const regex = new RegExp(`^${regexPattern}$`);
                return regex.test(url);
            } catch (e) {
                console.error('Invalid wildcard pattern:', regexPattern);
                return false;
            }
        }
        // Check if the pattern is plain text
        else {
            return url === disabledUrl;
        }
    });
}





async function checkUrlAndToggleListeners() {
    hasPopupTriggered = false;


    // In popup.js or content.js
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        theme = 'dark';
    } else {
        theme = 'light';
    }

    handleMessageRequest({ action: 'updateIcon', previewMode: previewMode, theme: theme });
    const data = await loadUserConfigs([
        'isFirefox',
        'isMac',

        'hoverSearchEngine',
        'hoverImgSearchEnable',
        'hoverTimeout',
        'hoverImgSupport',
        'hoverModifiedKey',
        'hoverDisabledUrls',

        'previewModeDisabledUrls',
        'previewModeEnable',
        'clickModifiedKey',
        'doubleClickToSwitch',
        'doubleClickAsClick',
        'dbclickToPreview',
        'dbclickToPreviewTimeout',

        'holdToPreview',
        'holdToPreviewTimeout',

        'collection',
        'collectionEnable',

        'searchTooltipsEnable',
        'searchTooltipsEngines',

        'blurEnabled',
        'blurPx',
        'blurTime',
        'blurRemoval',

        'copyButtonPosition',
        'copyButtonEnable',
        'sendBackButtonPosition',
        'sendBackButtonEnable',

        'urlCheck',
        'enableContainerIdentify',

        'closedByEsc',
        'closeWhenFocusedInitialWindow',
        'closeWhenScrollingInitialWindow',
        'sendBackByMiddleClickEnable',
        'doubleTapKeyToSendPageBack',

        'countdownStyle',

        'linkHint',
        'linkDisabledUrls',

        'disabledUrls',
        'searchEngine',
        'modifiedKey',
        'dropInEmptyOnly',
        'imgSearchEnable',
        'dragPx',
        'dragDirections',
        'dragStartEnable',
        'imgSupport'
    ]);

    linkHint = data.linkHint || false;
    linkDisabledUrls = data.linkDisabledUrls || [];

    holdToPreview = data.holdToPreview;
    holdToPreviewTimeout = data.holdToPreviewTimeout || 1500;

    collectionEnable = data.collectionEnable;
    collection = data.collection || [];

    const currentUrl = window.location.href;

    copyButtonPosition = data.copyButtonPosition;
    sendBackButtonPosition = data.sendBackButtonPosition;

    searchTooltipsEngines = data.searchTooltipsEngines || configs.searchTooltipsEngines;
    searchTooltipsEnable = data.searchTooltipsEnable;

    blurTime = data.blurTime || 1;
    blurEnabled = data.blurEnabled !== undefined ? data.blurEnabled : true;
    blurRemoval = data.blurRemoval !== undefined ? data.blurRemoval : true;
    blurPx = parseFloat(data.blurPx || 3);

    urlCheck = data.urlCheck;

    closeWhenFocusedInitialWindow = data.closeWhenFocusedInitialWindow;
    closeWhenScrollingInitialWindow = data.closeWhenScrollingInitialWindow;
    sendBackByMiddleClickEnable = data.sendBackByMiddleClickEnable || false;
    doubleTapKeyToSendPageBack = data.doubleTapKeyToSendPageBack || 'None';
    closedByEsc = data.closedByEsc;
    enableContainerIdentify = data.enableContainerIdentify;

    countdownStyle = data.countdownStyle || 'bar';

    hoverImgSearchEnable = data.hoverImgSearchEnable;
    hoverTimeout = data.hoverTimeout || 0;
    hoverImgSupport = data.hoverImgSupport;
    hoverModifiedKey = data.hoverModifiedKey || 'None';
    hoverDisabledUrls = data.hoverDisabledUrls || [];
    hoverSearchEngine = data.hoverSearchEngine || 'https://www.google.com/search?q=%s';

    isFirefox = data.isFirefox;
    isMac = data.isMac;

    dropInEmptyOnly = data.dropInEmptyOnly;
    modifiedKey = data.modifiedKey || 'None';
    imgSearchEnable = data.imgSearchEnable;
    dragPx = data.dragPx || 0;
    dragDirections = data.dragDirections || ['up', 'down', 'right', 'left'];
    imgSupport = data.imgSupport;
    dragStartEnable = data.dragStartEnable;
    disabledUrls = data.disabledUrls || [];
    searchEngine = data.searchEngine || 'https://www.google.com/search?q=%s';

    previewModeEnable = data.previewModeEnable;
    clickModifiedKey = data.clickModifiedKey || 'None';
    doubleClickToSwitch = data.doubleClickToSwitch;
    doubleClickAsClick = data.doubleClickAsClick;
    dbclickToPreview = data.dbclickToPreview;
    dbclickToPreviewTimeout = data.dbclickToPreviewTimeout || 250;

    if (isUrlDisabled(currentUrl, disabledUrls)) {
        removeListeners();
    } else {
        addListeners();
    }

    if (searchTooltipsEnable) {
        document.addEventListener('mouseup', handleEvent)
    }


    if (typeof data.searchEngine === 'undefined') {
        searchEngine = 'https://www.google.com/search?q=%s';
        chrome.storage.local.set({ searchEngine: 'https://www.google.com/search?q=%s' });
    }
    if (typeof data.hoverSearchEngine === 'undefined') {
        hoverSearchEngine = 'https://www.google.com/search?q=%s';
        chrome.storage.local.set({ hoverSearchEngine: 'https://www.google.com/search?q=%s' });
    }

    if (!previewModeEnable) {
        previewMode = false;

    } else {
        previewMode = data.previewMode;
    }

    if (!(window.self !== window.top && window.origin !== 'https://viewscreen.githubusercontent.com')) {

        if (data.copyButtonEnable || data.sendBackButtonEnable) {
            chrome.runtime.sendMessage({ action: "getWindowType" }, (response) => {
                if (response.error) {
                    console.error('Error:', response.error);
                    return;
                }

                if (response.windowType === 'popup') {
                    const css = `
                            /* Common styles for both buttons */
                            #dynamicButton {
                              background-color: #f2f7fa;
                              width: 100px;
                              height: 30px;
                              border: none;
                              border-radius: 10px;
                              font-weight: 600;
                              cursor: pointer;
                              overflow: hidden;
                              transition-duration: 700ms;
                            }
            
                            #dynamicButton span:first-child {
                              color: #0e418f;
                              position: absolute;
                              transform: translate(-50%, -50%);
                            }
            
                            #dynamicButton span:last-child {
                              position: absolute;
                              color: #b5ccf3;
                              opacity: 0;
                              transform: translateY(100%) translateX(-50%);
                              height: 14px;
                              line-height: 13px;
                            }
            
                            #dynamicButton:focus {
                              background-color: #0e418f;
                              width: 120px;
                              height: 40px;
                              transition-delay: 100ms;
                              transition-duration: 500ms;
                            }
            
                            #dynamicButton:focus span:first-child {
                              color: #b5ccf3;
                              transform: translateX(-50%) translateY(-150%);
                              opacity: 0;
                              transition-duration: 500ms;
                            }
            
                            #dynamicButton:focus span:last-child {
                              transform: translateX(-50%) translateY(-50%);
                              opacity: 1;
                              transition-delay: 300ms;
                              transition-duration: 500ms;
                            }
                        `;

                    function createButton(id, positionKey, clickHandler) {
                        // Remove existing button if present
                        const existingHost = document.getElementById(id);
                        if (existingHost) existingHost.remove();

                        // Create button
                        const button = document.createElement("button");
                        button.id = "dynamicButton";
                        button.draggable = true;

                        if (positionKey === "copyButtonPosition") {
                            button.innerHTML = `
                            <span>
                      <svg width="20px" height="20px" viewBox="0 0 48.00 48.00" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round" stroke="#CCCCCC" stroke-width="0.384"></g><g id="SVGRepo_iconCarrier"> <g id="Base/copy-link"> <path d="M0 0H48V48H0V0Z" fill="white" fill-opacity="0.01"></path> <g id="ç¼–ç»„ 2"> <g id="ç¼–ç»„"> <rect id="çŸ©å½¢" width="48" height="48" fill="white" fill-opacity="0.01"></rect> <path id="å½¢çŠ¶" d="M12 9.92704V7C12 5.34315 13.3431 4 15 4H41C42.6569 4 44 5.34315 44 7V33C44 34.6569 42.6569 36 41 36H38.0174" stroke="#000000" stroke-width="4"></path> <rect id="Rectangle Copy" x="4" y="10" width="34" height="34" rx="3" fill="#2F88FF" stroke="#000000" stroke-width="4" stroke-linejoin="round"></rect> </g> <g id="ç¼–ç»„_2"> <g id="Group"> <path id="Oval" d="M18.4396 23.1098L23.7321 17.6003C25.1838 16.1486 27.5693 16.1806 29.0604 17.6717C30.5515 19.1628 30.5835 21.5483 29.1319 23L27.2218 25.0228" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path> <path id="Oval Copy 2" d="M13.4661 28.7469C12.9558 29.2573 11.9006 30.2762 11.9006 30.2762C10.4489 31.7279 10.4095 34.3152 11.9006 35.8063C13.3917 37.2974 15.7772 37.3294 17.2289 35.8777L22.3931 31.1894" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path> <path id="Oval Copy" d="M18.6631 28.3283C17.9705 27.6357 17.5927 26.7501 17.5321 25.8547C17.4624 24.8225 17.8143 23.7774 18.5916 23" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path> <path id="Oval Copy 3" d="M22.3218 25.8611C23.8129 27.3522 23.8449 29.7377 22.3932 31.1894" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path> </g> </g> </g> </g> </g></svg>
                    </span>
                    <span>
                      <svg height="18" width="18" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 431 359" enable-background="new 0 0 431 359" xml:space="preserve" fill="#000000"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <polygon fill="#29CB41" points="168.5,359 0,159.8 91.6,82.3 173.7,179.3 344,0 431,82.7 "></polygon> </g></svg>
                    </span>`;
                        }
                        else if (positionKey === "sendBackButtonPosition") {
                            button.innerHTML = `
                           <span>
        <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M18.3137 0.918778C18.6347 1.36819 18.5307 1.99274 18.0812 2.31375L16.4248 3.49692L17.2572 3.67529C20.0236 4.26809 22 6.71287 22 9.5421V10C22 10.5523 21.5523 11 21 11C20.4477 11 20 10.5523 20 10V9.5421C20 7.65595 18.6824 6.02609 16.8381 5.63089L15.9784 5.44667L16.8682 7.00388C17.1423 7.48339 16.9757 8.09425 16.4961 8.36826C16.0166 8.64227 15.4058 8.47567 15.1318 7.99616L13.1318 4.49616C12.8771 4.05058 13.0012 3.48458 13.4188 3.18629L16.9188 0.686284C17.3682 0.365274 17.9927 0.469365 18.3137 0.918778ZM6 12C6 10.8954 6.89543 10 8 10H16C17.1046 10 18 10.8954 18 12V20C18 21.1046 17.1046 22 16 22H8C6.89543 22 6 21.1046 6 20V12ZM16 20V12H8V20H16ZM4 6.00002C2.89543 6.00002 2 6.89545 2 8.00002V16C2 16.5523 2.44772 17 3 17C3.55228 17 4 16.5523 4 16V8.00002H12C12.5523 8.00002 13 7.5523 13 7.00002C13 6.44773 12.5523 6.00002 12 6.00002H4Z" fill="#000000"></path> </g></svg>            </span>
                    <span>
        <svg width="20px" height="20px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><g id="SVGRepo_bgCarrier" stroke-width="0"></g><g id="SVGRepo_tracerCarrier" stroke-linecap="round" stroke-linejoin="round"></g><g id="SVGRepo_iconCarrier"> <path fill-rule="evenodd" clip-rule="evenodd" d="M18.3137 0.918778C18.6347 1.36819 18.5307 1.99274 18.0812 2.31375L16.4248 3.49692L17.2572 3.67529C20.0236 4.26809 22 6.71287 22 9.5421V10C22 10.5523 21.5523 11 21 11C20.4477 11 20 10.5523 20 10V9.5421C20 7.65595 18.6824 6.02609 16.8381 5.63089L15.9784 5.44667L16.8682 7.00388C17.1423 7.48339 16.9757 8.09425 16.4961 8.36826C16.0166 8.64227 15.4058 8.47567 15.1318 7.99616L13.1318 4.49616C12.8771 4.05058 13.0012 3.48458 13.4188 3.18629L16.9188 0.686284C17.3682 0.365274 17.9927 0.469365 18.3137 0.918778ZM6 12C6 10.8954 6.89543 10 8 10H16C17.1046 10 18 10.8954 18 12V20C18 21.1046 17.1046 22 16 22H8C6.89543 22 6 21.1046 6 20V12ZM16 20V12H8V20H16ZM4 6.00002C2.89543 6.00002 2 6.89545 2 8.00002V16C2 16.5523 2.44772 17 3 17C3.55228 17 4 16.5523 4 16V8.00002H12C12.5523 8.00002 13 7.5523 13 7.00002C13 6.44773 12.5523 6.00002 12 6.00002H4Z" fill="#000000"></path> </g></svg>            </span>
                                `;
                        }
                        // Create shadow root
                        const shadowHost = document.createElement("div");
                        shadowHost.id = id;
                        document.body.appendChild(shadowHost);

                        const shadowRoot = shadowHost.attachShadow({ mode: "open" });
                        shadowRoot.appendChild(button);

                        // Apply styles
                        const style = document.createElement("style");
                        style.textContent = css;
                        shadowRoot.appendChild(style);

                        // Load position from storage or set default
                        button.style.position = "fixed";
                        button.style.zIndex = "2147483647";

                        const isValidPercentage = (value) => typeof value === "number" && value >= 0 && value <= 100;

                        chrome.storage.local.get(positionKey, (result) => {
                            const { leftPercent = 10, topPercent = 10 } = result[positionKey] || {};

                            // Validate percentages before applying
                            const validatedLeft = isValidPercentage(leftPercent) ? leftPercent : 10; // Default to 10% if invalid
                            const validatedTop = isValidPercentage(topPercent) ? topPercent : 10;   // Default to 10% if invalid

                            button.style.left = `${validatedLeft}%`;
                            button.style.top = `${validatedTop}%`;
                        });


                        // Add draggable and click functionality
                        makeButtonDraggable(button, positionKey);
                        button.addEventListener("click", clickHandler);

                        return button;
                    }

                    function makeButtonDraggable(button, positionKey) {
                        let offsetX, offsetY;

                        button.addEventListener("dragstart", (e) => {
                            button.blur();
                            const rect = button.getBoundingClientRect();
                            offsetX = e.clientX - rect.left;
                            offsetY = e.clientY - rect.top;
                        });

                        button.addEventListener("dragend", (e) => {
                            const left = e.clientX - offsetX;
                            const top = e.clientY - offsetY;
                            const leftPercent = (left / window.innerWidth) * 100;
                            const topPercent = (top / window.innerHeight) * 100;

                            button.style.left = `${leftPercent}%`;
                            button.style.top = `${topPercent}%`;

                            chrome.storage.local.set({ [positionKey]: { leftPercent, topPercent } });
                        });
                    }

                    // Initialize buttons
                    if (!document.hasFocus()) return;
                    if (data.copyButtonEnable) {
                        if (document.readyState === 'loading') {
                            document.addEventListener('DOMContentLoaded', () => {
                                createButton("copyButtonHost", "copyButtonPosition", () => {
                                    navigator.clipboard.writeText(window.location.href);
                                    // Blur the button after 1.2 seconds
                                    setTimeout(() => {
                                        const shadowRoot = document.getElementById("copyButtonHost").shadowRoot;
                                        const button = shadowRoot.querySelector("button");
                                        if (button) {
                                            button.blur();
                                        }
                                    }, 1200);
                                });
                            })
                        } else {
                            createButton("copyButtonHost", "copyButtonPosition", () => {
                                navigator.clipboard.writeText(window.location.href);
                                // Blur the button after 1.2 seconds
                                setTimeout(() => {
                                    const shadowRoot = document.getElementById("copyButtonHost").shadowRoot;
                                    const button = shadowRoot.querySelector("button");
                                    if (button) {
                                        button.blur();
                                    }
                                }, 1200);
                            });

                        }
                    }

                    if (data.sendBackButtonEnable) {
                        if (document.readyState === 'loading') {
                            document.addEventListener('DOMContentLoaded', () => {
                                createButton("sendBackButtonHost", "sendBackButtonPosition", () => {
                                    chrome.runtime.sendMessage({ action: "sendPageBack" });
                                });
                            })
                        } else {
                            createButton("sendBackButtonHost", "sendBackButtonPosition", () => {
                                chrome.runtime.sendMessage({ action: "sendPageBack" });
                            });
                        }
                    }
                }
            });
        }



        // Inside the parent page content script
        window.addEventListener('message', function (e) {
            if (e.data && e.data.action === 'blurParent') {
                if (blurEnabled) {
                    addBlurOverlay(blurPx, blurTime);
                }
                addClickMask();
            } else if (e.data && e.data.action === 'removeParentBlur') {
                removeBlurOverlay();
                removeClickMask();
            } else if (e.data.type === 'GET_SCREEN_COORDS') {

                // Find the iframe that sent the request
                const iframes = document.getElementsByTagName('iframe');
                let iframeRect;
                for (let iframe of iframes) {
                    if (iframe.contentWindow === e.source) {
                        iframeRect = iframe.getBoundingClientRect();
                        break;
                    }
                }

                // Send the screen coordinates back to the iframe
                e.source.postMessage({
                    type: 'SCREEN_COORDS',
                    topOffset: iframeRect.top,
                    leftOffset: iframeRect.left,
                    innerHeight: window.innerHeight,
                    innerWidth: window.innerWidth,
                }, e.origin);


            } else if (e.data) {

                function dragleaveUpdate(e) {
                    lastLeaveTimestamp = e.timeStamp;
                }
                if (e.data.action === 'dragendCheck') {
                    const { top, left, endY, endX, endEvent, endTimestamp, lastLeaveTimestampFromIframe } = e.data;
                    // Find the iframe that sent the request
                    const iframes = document.getElementsByTagName('iframe');
                    let iframeRect;
                    for (let iframe of iframes) {
                        if (iframe.contentWindow === e.source) {
                            iframeRect = iframe.getBoundingClientRect();
                            break;
                        }
                    }

                    const viewportLeft = left;
                    const viewportRight = viewportLeft + window.innerWidth;
                    const viewportTop = top;
                    const viewportBottom = viewportTop + window.innerHeight;
                    lastLeaveTimestamp = lastLeaveTimestamp ? lastLeaveTimestamp : lastLeaveTimestampFromIframe;
                    const isOut = (!(viewportLeft < endX && endX < viewportRight && viewportTop < endY && endY < viewportBottom) || endTimestamp - lastLeaveTimestamp > 600);
                    document.removeEventListener('dragleave', dragleaveUpdate)
                    // Send the screen coordinates back to the iframe
                    e.source.postMessage({
                        type: 'RESULT',
                        isOut,
                        endEvent
                    }, e.origin);

                } else if (e.data.action === 'dragleaveUpdate') {
                    lastLeaveTimestamp = undefined;

                    document.addEventListener('dragleave', dragleaveUpdate)
                } else if (e.data.action === 'getHref') {
                    chrome.runtime.sendMessage({ action: 'sendHref' }, (response) => {
                        if (response.error) {
                            console.error('Error:', response.error);
                        } else {
                            // Send the screen coordinates back to the iframe
                            e.source.postMessage({
                                href: window.location.href
                            }, e.origin);
                        }
                    });
                }
            }
        });

    }

    // In popup.js or content.js
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        theme = 'dark';
    } else {
        theme = 'light';
    }

    handleMessageRequest({ action: 'updateIcon', previewMode: previewMode, theme: theme });
    previewModeDisabledUrls = data.previewModeDisabledUrls || [];

    if (!(isUrlDisabled(window.location.href, previewModeDisabledUrls)) && previewModeEnable) {
        previewMode = (previewMode !== undefined) ? previewMode : previewModeEnable;

        // Add the event listener
        const events = ["click", "mouseup"];
        events.forEach(event => window.addEventListener(event, handleEvent, true));
    }


    document.removeEventListener('mousedown', handledbclickToPreview);
    if (!(isUrlDisabled(window.location.href, previewModeDisabledUrls)) && dbclickToPreview) {
        document.addEventListener('mousedown', handledbclickToPreview);
    }

    document.addEventListener(['contextmenu'], addLinkToCollection, true);
}

async function handledbclickToPreview(e) {
    // Only handle user-initiated clicks
    if (!e.isTrusted) return;

    const anchorElement = e.composedPath().find(node => node instanceof HTMLAnchorElement);
    const linkElement = anchorElement ||
        (e.target instanceof HTMLElement && (e.target.tagName === 'A' ? e.target : e.target.closest('a')));
    if (!linkElement) return;

    const linkUrl = linkElement ?
        (linkElement.getAttribute('data-url') ||
            (linkElement.href.startsWith('/') ? window.location.protocol + linkElement.href : linkElement.href))
        : window.location.href;

    if (linkUrl && /^(mailto|tel|javascript):/.test(linkUrl.trim())) return;
    if (isUrlDisabled(linkUrl, linkDisabledUrls)) return;
    if (!linkUrl) return; // not a link

    // Stop normal click behavior
    e.preventDefault();
    e.stopPropagation();
    
    document.addEventListener('click', (e) => {
        // Stop all navigation
        e.preventDefault();
        e.stopImmediatePropagation();
    }, { once: true, capture: true });


    // If there's already a pending click, treat this as the second click
    if (linkElement.dataset._clicking === 'true') {
        // Clear state
        delete linkElement.dataset._clicking;
        handlePreviewMode(e, linkUrl);
        return;
    }

    // Mark as waiting for double click
    linkElement.dataset._clicking = 'true';

    // Wait 250ms
    await new Promise(res => setTimeout(res, dbclickToPreviewTimeout));

    // Still pending -> single click only
    if (linkElement.dataset._clicking === 'true') {
        delete linkElement.dataset._clicking;

        if (e.target.shadowRoot) {
            linkElement.click();
        } else {
            try {
                const clickEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    view: window
                });
                e.target.dispatchEvent(clickEvent);
            } catch (error) {
                e.target.closest('a').click();
            }
        }
    }
}

// Function to add a link to the collection
function addLinkToCollection(e) {
    if (!e.ctrlKey) return;
    const anchorElement = e.composedPath().find(node => node instanceof HTMLAnchorElement);
    e.preventDefault();
    e.stopPropagation();
    const linkElement = anchorElement ||
        (e.target instanceof HTMLElement && (e.target.tagName === 'A' ? e.target : e.target.closest('a')));

    if (!collectionEnable) return;


    const linkUrl = linkElement ?
        (linkElement.getAttribute('data-url') ||
            (linkElement.href.startsWith('/') ? window.location.protocol + linkElement.href : linkElement.href))
        : window.location.href;

    if (linkUrl && /^(mailto|tel|javascript):/.test(linkUrl.trim())) return;
    if (isUrlDisabled(linkUrl, linkDisabledUrls)) return;

    // Initialize or load the collection
    collection = (Array.isArray(collection) && collection.length > 0)
        ? collection
        : [
            {
                label: '+'
            },
            {
                label: '↗️',
                links: []
            }
        ];

    // Ensure collection[1] and collection[1].links are initialized
    if (!collection[1]) {
        collection[1] = { label: '↗️', links: [] };
    }
    if (!Array.isArray(collection[1].links)) {
        collection[1].links = [];
    }

    // Check if the link is already in the collection before adding
    if (!isLinkInCollection(linkUrl)) {
        const fetchFinalTitle = (url, timeout = 5000) => {
            return new Promise((resolve) => {
                const timeoutId = setTimeout(() => {
                    resolve({ title: url, finalUrl: url }); // Fallback to URL on timeout
                }, timeout);

                // Use fetch to get the page content
                fetch(url, { redirect: 'follow' })
                    .then((response) => {
                        clearTimeout(timeoutId);

                        // Directly use the URL if response isn't OK
                        if (!response.ok) {
                            console.warn(`HTTP status not OK: ${response.status}`);
                            resolve({ title: url, finalUrl: url });
                            return;
                        }

                        const finalUrl = response.url; // Final URL after redirection
                        return response.text().then((html) => {
                            const parser = new DOMParser();
                            const doc = parser.parseFromString(html, 'text/html');
                            const title = (doc.querySelector("title")?.innerText === "微博搜索") ? `微博搜索 - ${decodeURIComponent(new URL(finalUrl || url).searchParams.get("q") || "")}` : (doc.querySelector("title")?.innerText || finalUrl || url);
                            resolve({ title, finalUrl });
                        });
                    })
                    .catch((error) => {
                        clearTimeout(timeoutId);
                        resolve({ title: url, finalUrl: url }); // Fallback to URL on error
                    });
            });
        };
        // Example usage
        fetchFinalTitle(linkUrl, 2000).then(({ title, finalUrl }) => {

            const newItem = {
                label: title,
                url: finalUrl,
            };


            // Example of adding the item to the collection
            collection[1].links.push(newItem);
            collection.push(newItem);

            // Save to Chrome storage
            chrome.storage.local.set({ collection }, () => {
                chrome.runtime.sendMessage({ action: 'updateBadge' });
            });

        });



    } else {
        // console.log('Link already exists in the collection.');
    }
    isMouseDownOnLink = false;
    firstDownOnLinkAt = null;
}

chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'local' && (
        changes.linkHint ||
        changes.disabledUrls ||

        changes.dragDirections ||
        changes.dragPx ||
        changes.dropInEmptyOnly ||
        changes.searchEngine ||
        changes.imgSearchEnable ||
        changes.imgSupport ||
        changes.modifiedKey ||

        changes.previewModeDisabledUrls ||
        changes.previewModeEnable ||
        changes.clickModifiedKey ||
        changes.doubleClickAsClick ||
        changes.doubleClickToSwitch ||
        changes.dbclickToPreview ||
        changes.dbclickToPreviewTimeout ||

        changes.searchTooltipsEnable ||
        changes.searchTooltipsEngines ||

        changes.collection ||
        changes.collectionEnable ||

        changes.holdToPreview ||
        changes.holdToPreviewTimeout ||

        changes.hoverTimeout ||
        changes.hoverDisabledUrls ||
        changes.hoverSearchEngine ||
        changes.hoverModifiedKey ||
        changes.hoverImgSearchEnable ||
        changes.hoverImgSupport ||

        changes.linkDisabledUrls ||

        changes.copyButtonPosition ||
        changes.copyButtonEnable ||
        changes.sendBackButtonPosition ||
        changes.sendBackButtonEnable ||

        changes.blurEnabled ||
        changes.blurPx ||
        changes.blurTime ||
        changes.blurRemoval ||

        changes.countdownStyle ||

        changes.urlCheck ||
        changes.closeWhenFocusedInitialWindow ||
        changes.closeWhenScrollingInitialWindow ||
        changes.sendBackByMiddleClickEnable ||
        changes.doubleTapKeyToSendPageBack ||
        changes.closedByEsc
    )) {
        await checkUrlAndToggleListeners();
    }
});

checkUrlAndToggleListeners();

let lastUrl = location.href;
new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
        lastUrl = url;
        firstDownOnLinkAt = undefined;
        chrome.storage.local.set({ lastUrl: url });
        checkUrlAndToggleListeners();
    }

    (function replaceBingRedirectLinks() {
        if (!location.href.startsWith('https://www.bing.com/search?q=')) return;

        const links = Array.from(document.querySelectorAll('a[href^="https://www.bing.com/ck/a?"]'));

        links.forEach(a => {
            try {
                const url = new URL(a.href);
                const uParam = url.searchParams.get('u');
                if (!uParam) return;

                if (uParam.startsWith('a1')) {
                    const decoded = atob(uParam.slice(2));
                    a.href = decoded.startsWith('http') ? decoded : 'https://www.bing.com' + decoded;
                }
            } catch (e) {
                console.warn('Failed to decode Bing redirect link:', a.href, e);
            }
        });
    })();

}).observe(document, { subtree: true, childList: true });

chrome.storage.local.get('lastUrl', (data) => {
    if (data.lastUrl) {
        lastUrl = data.lastUrl;
    }
});


window.addEventListener('focus', async () => {

    focusAt = Date.now();
    isDoubleClick = false;
    firstDownOnLinkAt = null;
    if (linkIndicator) {
        linkIndicator.remove();
    }
    linkIndicator = null;
    if (searchTooltips) searchTooltips.remove();
    searchTooltips = null;
    removeBlurOverlay();
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.removeEventListener('dragover', blockOver);

    clearTimeoutsAndProgressBars();
    hoverElement = null;

    hoverInitialMouseX = null;
    hoverInitialMouseY = null;
    if (window.self !== window.top && window.origin !== 'https://viewscreen.githubusercontent.com') {
        window.parent.postMessage({ action: 'removeParentBlur' }, '*');
    }
    try {


        // In popup.js or content.js
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            theme = 'dark';
        } else {
            theme = 'light';
        }

        handleMessageRequest({ action: 'updateIcon', previewMode: previewMode, theme: theme });
        document.addEventListener('mouseover', handleMouseOver, true);
        const message = closeWhenFocusedInitialWindow
            ? { action: 'windowRegainedFocus', addContextMenuItem: contextMenuEnabled }
            : { addContextMenuItem: contextMenuEnabled };
        chrome.runtime.sendMessage(message);
    } catch (error) {
        // console.error('Error loading user configs:', error);
    }
    if (window.getSelection().toString()) {
        window.getSelection().removeAllRanges();
    }
    setTimeout(() => {
        removeClickMask();
    }, 50);
});

// Create candle-like progress bar element
function createCandleProgressBar(x, y, duration) {
    const barContainer = document.createElement('div');
    barContainer.classList.add('link-indicator'); // Add a class to identify this element
    barContainer.style.position = 'fixed';
    barContainer.style.top = `${y + 25}px`; // Place below the cursor
    barContainer.style.left = `${x}px`;
    barContainer.style.width = '50px'; // Initial full width of the progress bar
    barContainer.style.height = '10px';
    barContainer.style.backgroundColor = '#ffa742'; // Bright red color for the progress bar
    barContainer.style.border = '1px solid #ffa742'; // Black border for visibility
    barContainer.style.borderRadius = '5px';
    barContainer.style.overflow = 'hidden';
    barContainer.style.zIndex = '2147483647';
    barContainer.style.transition = `width ${duration}ms linear`; // Transition definition here

    document.body.appendChild(barContainer);

    if (duration <= 5000) {
        // Use setTimeout to trigger the transition after the element is rendered
        setTimeout(() => {
            barContainer.style.width = '0px'; // Decrease width to 0px over the duration
        }, 20); // Ensure the transition has time to apply
    }
    return barContainer;
}

function createCircleProgressBar(x, y, duration = 10000, diameter = 20, color = '#ffa742', strokeWidth = 2) {
    const svgNS = "http://www.w3.org/2000/svg";

    // Container div
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = `${y}px`;
    container.style.left = `${x}px`;
    container.style.width = `${diameter}px`;
    container.style.height = `${diameter}px`;
    container.style.transform = 'translate(-25%, 0)';
    container.style.zIndex = '2147483647';
    container.style.pointerEvents = 'none'; // allow clicks to pass through

    // Create SVG circle
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('width', diameter);
    svg.setAttribute('height', diameter);
    svg.style.position = 'absolute';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.transform = 'rotate(-90deg)';

    const circle = document.createElementNS(svgNS, 'circle');
    const radius = diameter / 2 - strokeWidth; // adjust radius based on stroke
    const circumference = 2 * Math.PI * radius;

    circle.setAttribute('r', radius);
    circle.setAttribute('cx', diameter / 2);
    circle.setAttribute('cy', diameter / 2);
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', color);
    circle.setAttribute('stroke-width', strokeWidth);
    circle.setAttribute('stroke-linecap', 'round');
    circle.setAttribute('stroke-dasharray', circumference);
    circle.setAttribute('stroke-dashoffset', '0');

    svg.appendChild(circle);
    container.appendChild(svg);
    document.body.appendChild(container);

    // Animate circle stroke
    setTimeout(() => {
        circle.style.transition = `stroke-dashoffset ${duration}ms linear`;
        circle.setAttribute('stroke-dashoffset', circumference);
    }, 20);

    // Remove after duration
    setTimeout(() => {
        container.remove();
    }, duration + 50);

    return container;
}








// Handle mouseover event
async function handleMouseOver(e) {

    const path = e.composedPath();
    const iframe = path.find((node) => node instanceof HTMLIFrameElement);

    if (iframe && !iframe.closest('[aria-hidden]') && !iframe.hasAttribute('aria-hidden')) {
        e.target.focus();
    }
    // Check if any of the nodes in the path are part of a shadow root
    const isInsideShadowRoot = path.some(node => node instanceof ShadowRoot);
    if (isInsideShadowRoot) {
        clearTimeoutsAndProgressBars();
        e.target.addEventListener('mousemove', handleMouseOver)
        e.target.addEventListener('mouseleave', () => {
            clearTimeoutsAndProgressBars();
            e.target.removeEventListener('mousemove', handleMouseOver)
        }, { once: true })
    }
    const anchorElement = e.composedPath().find(node => node instanceof HTMLAnchorElement);

    // Check if the document has focus
    if (!document.hasFocus()) {
        clearTimeoutsAndProgressBars();
        hoverElement = null;
        return; // Exit if the window is not focused
    }
    if (isDragging) {
        if (progressBar) {
            progressBar.remove();
        }
        progressBar = null;
        return;
    }
    const viewportTop = e.screenY - e.clientY;
    const viewportBottom = e.screenY - e.clientY + window.innerHeight;
    const viewportLeft = e.screenX - e.clientX;
    const viewportRight = e.screenX - e.clientX + window.innerWidth;

    // do nothing when out of current page
    if (!(viewportLeft < e.screenX && e.screenX < viewportRight && viewportTop < e.screenY && e.screenY < viewportBottom)) {
        clearTimeoutsAndProgressBars();
        return;
    }

    // do nothing when is in blacklist
    const currentUrl = window.location.href;
    if (isUrlDisabled(currentUrl, hoverDisabledUrls)) {
        return;
    }

    const linkElement = anchorElement ||
        (e.target instanceof HTMLElement && (e.target.tagName === 'A' ? e.target : e.target.closest('a')));

    const linkUrl = linkElement ?
        (linkElement.getAttribute('data-url') ||
            (linkElement.href.startsWith('/') ? window.location.protocol + linkElement.href : linkElement.href))
        : null;

    if (linkUrl && /^(mailto|tel|javascript):/.test(linkUrl.trim())) return;
    if (isUrlDisabled(linkUrl, linkDisabledUrls)) return;


    if (linkHint && parseInt(hoverTimeout, 10) === 0) {
        changeCursorOnHover(e, anchorElement);

    }


    const keyMap = { 'Ctrl': e.ctrlKey, 'Alt': e.altKey, 'Shift': e.shiftKey, 'Meta': e.metaKey };
    if (hoverModifiedKey === 'None' || keyMap[hoverModifiedKey]) {
        if (!hoverTimeout || parseInt(hoverTimeout, 10) === 0) {
            return;
        } else {
            const linkElement = anchorElement ||
                (e.target instanceof HTMLElement && (e.target.tagName === 'A' ? e.target : e.target.closest('a')));

            const linkUrl = linkElement ?
                (linkElement.getAttribute('data-url') ||
                    (linkElement.href.startsWith('/') ? window.location.protocol + linkElement.href : linkElement.href))
                : null;

            if (linkUrl && /^(mailto|tel|javascript):/.test(linkUrl.trim())) return;

            const imageElement = e.target instanceof HTMLElement && (e.target.tagName === 'IMG' ? e.target : e.target.closest('img'));
            const imageUrl = imageElement ? imageElement.src : null;

            if (linkUrl || imageUrl) {

                if (hoverElement === e.target) {
                    return; // Avoid resetting if the same element is still being hovered
                }

                let finalLinkUrl = linkUrl || (hoverImgSupport ? imageUrl : null);

                if (!finalLinkUrl) return;

                // Clear any existing timeout, interval, and progress bar
                clearTimeoutsAndProgressBars();

                hoverElement = e.target; // Set the current hover element
                hoverInitialMouseX = e.clientX; // Store initial mouse position
                hoverInitialMouseY = e.clientY;

                const hoverTimeoutDuration = parseInt(hoverTimeout, 10) || 0; // Default to disabled if not set

                // Create and display the progress bar immediately
                progressBar = (countdownStyle === 'circle') ?
                    createCircleProgressBar(hoverInitialMouseX, hoverInitialMouseY, hoverTimeoutDuration)
                    : createCandleProgressBar(hoverInitialMouseX, hoverInitialMouseY, hoverTimeoutDuration);

                if (anchorElement) {
                    anchorElement.addEventListener('mouseleave', () => {
                        clearTimeoutsAndProgressBars();
                        e.target.addEventListener('mousemove', handleMouseOver)
                    }, { once: true })
                    e.target.addEventListener('mouseleave', () => {
                        clearTimeoutsAndProgressBars();
                        e.target.removeEventListener('mousemove', handleMouseOver)
                    }, { once: true })
                }

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

    if (previewProgressBar) {
        previewProgressBar.remove();
        previewProgressBar = null;
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
    const keyMap = { 'Ctrl': e.ctrlKey, 'Alt': e.altKey, 'Shift': e.shiftKey, 'Meta': e.metaKey };

    if (hoverModifiedKey === 'None' || keyMap[hoverModifiedKey]) {
        const finalHoverSearchEngine = (hoverSearchEngine !== 'None' ? (hoverSearchEngine || 'https://www.google.com/search?q=%s') : null);
        // Regular expression to match URLs including IP addresses
        const urlPattern = /^(https?:\/\/)?((([a-zA-Z\d]([a-zA-Z\d-]{0,61}[a-zA-Z\d])?\.)+[a-zA-Z]{2,6})|(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})|(\[[0-9a-fA-F:.]+\]))(:\d+)?(\/[^\s]*)?$/;

        // Check if the selected text is a URL
        const isURL = urlCheck ? urlPattern.test(selectionText) : false;

        // Ensure that URLs without a protocol are handled
        const processedLinkUrl = isURL
            ? (selectionText.startsWith('http://') || selectionText.startsWith('https://')
                ? selectionText
                : 'http://' + selectionText)
            : null;

        let imageUrl = hoverImgSupport ? imageElement?.src : null;
        if (hoverImgSearchEnable && imageUrl) {
            const imgSearchEngineMap = { "https://www.google.com/search?q=%s": "https://lens.google.com/uploadbyurl?url=%s", "https://www.bing.com/search?q=%s": "https://www.bing.com/images/search?q=imgurl:%s&view=detailv2&iss=sbi", "https://www.baidu.com/s?wd=%s": "https://graph.baidu.com/details?isfromtusoupc=1&tn=pc&carousel=0&promotion_name=pc_image_shituindex&extUiData%5bisLogoShow%5d=1&image=%s", "https://yandex.com/search/?text=%s": "https://yandex.com/images/search?rpt=imageview&url=%s" };
            if (imgSearchEngineMap.hasOwnProperty(finalHoverSearchEngine)) {
                imageUrl = imgSearchEngineMap[finalHoverSearchEngine].replace('%s', encodeURIComponent(imageUrl));
            }
        }

        // Set finalLinkUrl based on linkUrl, hoverImgSupport, and searchEngine
        let finalLinkUrl = processedLinkUrl || linkElement?.href || imageUrl ||
            ((finalHoverSearchEngine && selectionText.trim() !== '')
                ? finalHoverSearchEngine.replace('%s', encodeURIComponent(selectionText))
                : null);

        if (!finalLinkUrl) return;
        if (finalLinkUrl.trim().startsWith('javascript:')) return;
        if (isUrlDisabled(finalLinkUrl, linkDisabledUrls)) return;

        if (linkIndicator) {
            linkIndicator.remove();
        }
        linkIndicator = null;
        if (searchTooltips) searchTooltips.remove();
        searchTooltips = null;

        if (window.self !== window.top && window.origin !== 'https://viewscreen.githubusercontent.com') {
            // Inside the iframe content script
            window.parent.postMessage({ action: 'blurParent' }, '*');
        } else {
            if (blurEnabled) {
                addBlurOverlay(blurPx, blurTime);
            }
            addClickMask();
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
            imageUrl = null;
            document.removeEventListener('mousemove', updateProgressBarPosition, true);
            if (linkIndicator) linkIndicator.remove();
            linkIndicator = null;
            if (searchTooltips) searchTooltips.remove();
            searchTooltips = null;
            finalLinkUrl = null;

            if (window.getSelection().toString()) {
                window.getSelection().removeAllRanges();
            }

        });
    }

}

// Trigger the popup logic
function triggerLinkPopup(e, link) {

    if (linkIndicator) {
        linkIndicator.remove();
    }
    linkIndicator = null;
    if (searchTooltips) searchTooltips.remove();
    searchTooltips = null;


    if (window.self !== window.top && window.origin !== 'https://viewscreen.githubusercontent.com') {
        // Inside the iframe content script
        window.parent.postMessage({ action: 'blurParent' }, '*');
    } else {
        if (blurEnabled) {
            addBlurOverlay(blurPx, blurTime);
        }
        addClickMask();
    }
    chrome.runtime.sendMessage({
        linkUrl: link,
        lastClientX: e.screenX,
        lastClientY: e.screenY,
        width: window.screen.availWidth,
        height: window.screen.availHeight,
        top: window.screen.availTop,
        left: window.screen.availLeft,
        trigger: 'tooltips'
    }, () => {
        if (linkIndicator) linkIndicator.remove();
        linkIndicator = null;
        if (searchTooltips) searchTooltips.remove();
        searchTooltips = null;
        finalLinkUrl = null;

        if (window.getSelection().toString()) {
            window.getSelection().removeAllRanges();
        }
    });

}

// Handle mouseout event
function handleMouseOut(e) {
    clearTimeoutsAndProgressBars(); // Clean up when the mouse leaves the element
    hoverElement = null;
}


function addClickMask() {
    if (!document.head || !document.body) {
        console.error('Document head or body not available');
        return;
    }

    const hasClickMask = document.getElementById('clickMask');
    if (hasClickMask) {
        return;
    }

    // Create the mask element
    const mask = document.createElement('div');
    mask.id = 'clickMask';

    // Insert CSS styles for the mask
    const style = document.createElement('style');
    style.id = 'clickMaskStyle';  // Add an id to reference it later
    style.innerHTML = `
      #clickMask {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0); /* Semi-transparent mask */
        z-index: 9999;
        cursor: not-allowed;
        pointer-events: all; /* Ensure the mask captures all events */
      }

      /* Prevent clicks and hovers on everything behind the mask */
      body * {
        pointer-events: none !important; /* Disable click and hover events on all elements */
      }

      /* Allow focusable elements to still work (e.g., inputs, buttons) */
      input, button, textarea, select {
        pointer-events: auto !important; /* Enable interaction for form elements */
      }

      /* Specifically block links (<a>) from being clicked */
      a {
        pointer-events: none !important; /* Block any clicks on links */
      }

      #clickMask {
        pointer-events: all; /* Enable interaction on the mask itself */
      }
    `;

    // Append the style to the head and mask to the body
    document.head.appendChild(style);
    document.body.appendChild(mask);

    // Prevent clicks and other events on the mask itself
    mask.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();

    });

    // Optional: Block other interactions like keypresses if needed
    mask.addEventListener('keydown', (e) => {
        e.stopPropagation();
        e.preventDefault();

    });


}

function removeClickMask() {
    const mask = document.getElementById('clickMask');
    const style = document.getElementById('clickMaskStyle');

    if (mask) {
        mask.remove();
    }

    if (style) {
        style.remove(); // Remove the injected style
    }
}


// Function to add the blur overlay
function addBlurOverlay(blurPx, blurTime) {
    if (!blurOverlay) {
        blurOverlay = document.createElement('div');
        blurOverlay.style.position = 'fixed';
        blurOverlay.style.top = '0';
        blurOverlay.style.left = '0';
        blurOverlay.style.width = '100%';
        blurOverlay.style.height = '100%';
        blurOverlay.style.zIndex = '2147483647';
        blurOverlay.style.backdropFilter = 'blur(0px)'; // Start with no blur
        blurOverlay.style.transition = `backdrop-filter ${blurTime}s ease`;
        blurOverlay.style.pointerEvents = 'none';
        document.body.appendChild(blurOverlay);

        // Force a reflow by reading offsetWidth
        void blurOverlay.offsetWidth;

        // Now apply the desired blur, which should trigger the transition
        blurOverlay.style.backdropFilter = `blur(${blurPx}px)`;

        if (!isMac) {
            if (!blurRemoval) return;
            document.body.addEventListener('mouseenter', () => {
                removeClickMask();
                removeBlurOverlay();
                document.body.addEventListener('mouseleave', () => {
                    if (!document.hasFocus()) {
                        addClickMask();
                        addBlurOverlay(blurPx, blurTime);
                    }
                }, { once: true });
            }, { once: true });
        }

    }
}

// Function to remove the blur overlay
function removeBlurOverlay() {
    if (blurOverlay) {
        blurOverlay.remove(); // Removes the overlay from the DOM
        blurOverlay = null; // Clear the reference
    }
}

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.enableContextMenu) {
        contextMenuEnabled = true;
    }

    if (!isMac) return;
    if (!blurEnabled) return;
    if (window.self !== window.top) return;
    if (!blurRemoval) return;

    if (msg.action === "INIT_POPUP_LISTENER") {
        const originalTabId = msg.originalTabId;

        document.body.addEventListener("mouseenter", () => {
            if (!document.hasFocus()) return;
            chrome.runtime.sendMessage({ action: "addblur", originalTabId });
        });
        document.body.addEventListener("mouseleave", () => {

            if (!document.hasFocus()) return;
            chrome.runtime.sendMessage({ action: "removeblur", originalTabId });
        });

    }

    if (msg.action === "ADD_BLUR") {
        if (document.hasFocus()) return;
        addClickMask();
        addBlurOverlay(blurPx, blurTime);
    }
    if (msg.action === "REMOVE_BLUR") {
        removeClickMask();
        removeBlurOverlay();
    }

});

window.addEventListener('blur', () => {
    if (window.self !== window.top) return; // only run in top window

    if (closeWhenScrollingInitialWindow) {
        const onScrollEnd = () => {
            if (document.hasFocus()) {
                document.removeEventListener('scrollend', onScrollEnd);
            } else {
                // Do nothing if the document has regained focus
                chrome.runtime.sendMessage({ action: 'closeCurrentTab' });
            }
        };
        document.addEventListener('scrollend', onScrollEnd);
    }
});
