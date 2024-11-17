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
let lastClickTime = 0;
let lastKey = '';
let isDoubleClick;
let previewMode;
let clickTimeout = null;
const moveThreshold = 15;
let linkIndicator;
let tooltip;
let searchTooltips;
let collection;
let hoverlinkOrText = false;
let isMouseDownOnLink = false;
let firstDownOnLinkAt;
let previewProgressBar;
let holdToPreviewTimeout = 1500;
let focusAt;
let clickModifiedKey = 'None';
let linkDisabledUrls;
let theme;
let blurOverlay;
let holdTimeout;

const configs = {
    'closeWhenFocusedInitialWindow': true,
    'tryOpenAtMousePosition': false,
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
    'doubleTapKeyToSendPageBack': 'None',
    'hoverDisabledUrls': [],
    'hoverImgSupport': false,
    'hoverSearchEngine': 'https://www.google.com/search?q=%s',
    'hoverModifiedKey': 'None',
    'hoverWindowType': 'popup',
    'previewModeDisabledUrls': [],
    'previewModeWindowType': 'popup',
    'previewModeEnable': false,
    'imgSearchEnable': false,
    'hoverImgSearchEnable': false,
    'doubleClickToSwitch': false,
    'doubleClickAsClick': false,
    'rememberPopupSizeAndPositionForDomain': false,
    'isFirefox': false,
    'linkHint': false,
    'collection': [],
    'searchTooltipsEnable': false,
    'collectionEnable': false,
    'holdToPreview': false,
    'holdToPreviewTimeout': 1500,
    'clickModifiedKey': 'None',
    'linkDisabledUrls': []
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

    events.forEach(event => document.removeEventListener(event, handleEvent, true));
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
        button.style.fontSize = '10px'; // Adjust button text size

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
        chrome.storage.local.get(['urlCheck', 'searchTooltipsEnable'], (data) => {
            if (typeof data.searchTooltipsEnable === 'undefined' || !data.searchTooltipsEnable) return;
            // Regular expression to match URLs including IP addresses
            const urlPattern = /^(https?:\/\/)?((([a-zA-Z\d]([a-zA-Z\d-]{0,61}[a-zA-Z\d])?\.)+[a-zA-Z]{2,6})|(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})|(\[[0-9a-fA-F:.]+\]))(:\d+)?(\/[^\s]*)?$/;

            // Check if the selected text is a URL
            const isURL = data.urlCheck ? urlPattern.test(selectionText) : false;
            // If the text is a URL and doesn't start with "http://" or "https://", prepend "http://"
            const link = isURL
                ? (selectionText.startsWith('http://') || selectionText.startsWith('https://')
                    ? selectionText
                    : 'http://' + selectionText)
                : null

            const actions = isURL
                ? [{
                    label: '↗️',
                    handler: () => triggerLinkPopup(e, link)
                }]
                : [
                    {
                        label: 'Google',
                        handler: () => triggerLinkPopup(e, `https://www.google.com/search?q=${encodeURIComponent(selectionText)}`)
                    },
                    {
                        label: 'Bing',
                        handler: () => triggerLinkPopup(e, `https://www.bing.com/search?q=${encodeURIComponent(selectionText)}`)
                    },
                    {
                        label: 'Baidu',
                        handler: () => triggerLinkPopup(e, `https://www.baidu.com/s?wd=${encodeURIComponent(selectionText)}`)
                    },
                    {
                        label: 'Yandex',
                        handler: () => triggerLinkPopup(e, `https://yandex.com/search/?text=${encodeURIComponent(selectionText)}`)
                    },
                    {
                        label: 'DuckduckGo',
                        handler: () => triggerLinkPopup(e, `https://duckduckgo.com/?q=${encodeURIComponent(selectionText)}`)
                    },
                    {
                        label: 'Wikipedia',
                        handler: () => triggerLinkPopup(e, `https://wikipedia.org/w/index.php?title=Special:Search&search=${encodeURIComponent(selectionText)}`)
                    },
                ];

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
        });
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
    chrome.runtime.sendMessage({ checkContextMenuItem: true }, (response) => {
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
            const data = await loadUserConfigs(['closedByEsc']);
            if (data.closedByEsc) {
                chrome.runtime.sendMessage({ action: 'closeCurrentTab' });
            }
        } catch (error) {
            console.error('Error loading user configs:', error);
        }
    } else {
        try {
            const data = await loadUserConfigs(['clickModifiedKey', 'previewModeEnable']);

            if (data.previewModeEnable && data.clickModifiedKey !== 'None') {
                const clickModifiedKey = data.clickModifiedKey === 'Ctrl' ? 'Control' : data.clickModifiedKey;
                if (e.key === clickModifiedKey) {
                    previewMode = true;
                    document.addEventListener('keyup', (e) => {
                        if (e.key === clickModifiedKey) {
                            previewMode = false;
                        }

                        chrome.runtime.sendMessage({ action: 'updateIcon', previewMode: previewMode, theme: theme });

                    }, { once: true })
                } else {
                    previewMode = false;
                }
            } else if (data.previewModeEnable && data.clickModifiedKey === 'None') {
                previewMode = true;
            } else {
                previewMode = false;
            }


            chrome.runtime.sendMessage({ action: 'updateIcon', previewMode: previewMode, theme: theme });

        } catch (error) {
            console.error('Error loading user configs:', error);
        }

    }
}

async function handleKeyUp(e) {

    try {
        const data = await loadUserConfigs(['doubleTapKeyToSendPageBack']);
        const doubleTapKeyToSendPageBack = data.doubleTapKeyToSendPageBack || 'None';
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

    chrome.storage.local.get(['modifiedKey',
        'previewModeEnable',
        'previewModeDisabledUrls',
        'closeWhenFocusedInitialWindow',
        'holdToPreview',
        'holdToPreviewTimeout'
    ], (data) => {

        const modifiedKey = data.modifiedKey || 'None';
        const keyMap = { 'Ctrl': e.ctrlKey, 'Alt': e.altKey, 'Shift': e.shiftKey, 'Meta': e.metaKey };
        const previewModeDisabledUrls = data.previewModeDisabledUrls || [];
        const linkElement = anchorElement ||
            (e.target instanceof HTMLElement && (e.target.tagName === 'A' ? e.target : e.target.closest('a')));

        const linkUrl = linkElement ?
            (linkElement.getAttribute('data-url') ||
                (linkElement.href.startsWith('/') ? window.location.protocol + linkElement.href : linkElement.href))
            : null;

        if (linkUrl && /^(mailto|tel|javascript):/.test(linkUrl.trim())) return;
        if (isUrlDisabled(linkUrl, linkDisabledUrls)) return;

        if (modifiedKey === 'None' || keyMap[modifiedKey]) {

            const events = ["click", "dragstart", "dragover", "drop", "mouseup"];
            events.forEach(event => document.addEventListener(event, handleEvent, true));

        } else {
            const events = ["click", "dragstart", "dragover", "drop"];

            events.forEach(event => document.removeEventListener(event, handleEvent, true));
        }

        if (!(isUrlDisabled(window.location.href, previewModeDisabledUrls)) && data.previewModeEnable) {
            if (clickModifiedKey === 'None' || keyMap[clickModifiedKey]) {
                previewMode = (previewMode !== undefined) ? previewMode : data.previewModeEnable;

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

            chrome.runtime.sendMessage({ action: 'updateIcon', previewMode: previewMode, theme: theme });
        }

        if (data.holdToPreview && !e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            const linkElement = anchorElement ||
                (e.target instanceof HTMLElement && (e.target.tagName === 'A' ? e.target : e.target.closest('a')));

            const linkUrl = linkElement ?
                (linkElement.getAttribute('data-url') ||
                    (linkElement.href.startsWith('/') ? window.location.protocol + linkElement.href : linkElement.href))
                : null;

            // Check for left mouse button click
            if (e.button !== 0) return;

            // Check if the URL is valid and not a JavaScript link
            if (!linkUrl || (linkUrl && /^(mailto|tel|javascript):/.test(linkUrl.trim()))) {
                isMouseDownOnLink = false;
                clearTimeoutsAndProgressBars();
                
                document.removeEventListener('mousemove', cancelHoldToPreviewOnMove, true);
                document.removeEventListener('dragstart', cancelHoldToPreviewOnDrag, true);
                return;
            } else {
                isMouseDownOnLink = true;
                document.addEventListener('mouseup', () => {
                    if (isMouseDownOnLink) {
                        isMouseDownOnLink = false; // Reset the flag
                        clearTimeout(holdTimeout); // Clear the hold timeout to prevent handleHoldLink
                        clearTimeoutsAndProgressBars(); // Cleanup progress bar
                    }
                }, { once: true });
                
                document.addEventListener('mousemove', cancelHoldToPreviewOnMove, true);
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
                    previewProgressBar = createCandleProgressBar(
                        e.clientX - 20,
                        e.clientY - 50,
                        (holdToPreviewTimeout ?? 1500) - 100
                    );
                }, 100);
                
                // Set a timeout for the hold-to-preview action
                holdTimeout = setTimeout(() => {
                    if (!isMouseDownOnLink) return; // Ensure the mouse is still down
                    clearTimeoutsAndProgressBars(); // Cleanup any progress bar
                    handleHoldLink(e, anchorElement); // Trigger the hold-to-preview action
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
            
            document.removeEventListener('mousemove', cancelHoldToPreviewOnMove, true);
            document.removeEventListener('dragstart', cancelHoldToPreviewOnDrag, true);
        }


        try {
            const message = data.closeWhenFocusedInitialWindow
                ? { action: 'windowRegainedFocus', checkContextMenuItem: true }
                : { checkContextMenuItem: true };
            chrome.runtime.sendMessage(message);
        } catch (error) {
            console.error('Error loading user configs:', error);
        }

    });

    isMouseDown = true;
    hasPopupTriggered = false;
}

// Function to cancel hold-to-preview when mouse is moved
function cancelHoldToPreviewOnMove() {
    isMouseDownOnLink = false;
    clearTimeoutsAndProgressBars();
    
    document.removeEventListener('mousemove', cancelHoldToPreviewOnMove, true);
    document.removeEventListener('dragstart', cancelHoldToPreviewOnDrag, true);
}

// Function to cancel hold-to-preview when dragging starts
function cancelHoldToPreviewOnDrag() {
    isMouseDownOnLink = false;
    clearTimeoutsAndProgressBars();
    
    document.removeEventListener('mousemove', cancelHoldToPreviewOnMove, true);
    document.removeEventListener('dragstart', cancelHoldToPreviewOnDrag, true);
}

function handleHoldLink(e, anchorElement = null) {

    if (e.button !== 0 || isDoubleClick) return;
    if (!firstDownOnLinkAt) return;
    const linkElement = anchorElement || e.composedPath().find(node => node instanceof HTMLAnchorElement) ||
        (e.target instanceof HTMLElement && (e.target.tagName === 'A' ? e.target : e.target.closest('a')));

    if (!linkElement) return; // Ensure linkElement and linkUrl are valid

    const linkUrl = linkElement ?
        (linkElement.getAttribute('data-url') ||
            (linkElement.href.startsWith('/') ? window.location.protocol + linkElement.href : linkElement.href))
        : null;

    if (linkUrl && /^(mailto|tel|javascript):/.test(linkUrl.trim())) return;
    if (isUrlDisabled(linkUrl, linkDisabledUrls)) return;

    isMouseDownOnLink = true;
    if (firstDownOnLinkAt && Date.now() - firstDownOnLinkAt > (holdToPreviewTimeout ?? 1500) && isMouseDownOnLink) {
        hasPopupTriggered = true;
        // handlePreviewMode(e);

        if (linkUrl) {
            e.preventDefault();
            e.stopPropagation();

            chrome.storage.local.get(['blurEnabled', 'blurPx', 'blurTime'], (data) => {
                const blurTime = data.blurTime || 1;
                const blurEnabled = data.blurEnabled !== undefined ? data.blurEnabled : true;
                const blurPx = parseFloat(data.blurPx || 3);

                // Set finalLinkUrl based on linkUrl, imgSupport, and searchEngine
                let finalLinkUrl = linkUrl;

                if (!finalLinkUrl) return;

                if (linkIndicator) {
                    linkIndicator.remove();
                }
                linkIndicator = null;

                if (searchTooltips) searchTooltips.remove();
                searchTooltips = null;
                if (blurEnabled) {
                    addBlurOverlay(blurPx, blurTime);
                }
                addClickMask();

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
                    
                    document.removeEventListener('mousemove', cancelHoldToPreviewOnMove, true);
                    document.removeEventListener('dragstart', cancelHoldToPreviewOnDrag, true);
                    if (linkIndicator) linkIndicator.remove();
                    linkIndicator = null;
                    if (searchTooltips) searchTooltips.remove();
                    searchTooltips = null;
                    hasPopupTriggered = true;
                    finalLinkUrl = null;
                });
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


    e.preventDefault(); // Prevent the default double-click action
    e.stopPropagation(); // Stop the event from bubbling up

    chrome.storage.local.get(['doubleClickToSwitch', 'doubleClickAsClick', 'previewModeEnable', 'clickModifiedKey'], (data) => {
        if (!data.previewModeEnable || data.clickModifiedKey !== 'None') return;
        // Check if the double-clicked element is a link
        const imageElement = e.target instanceof HTMLElement && (e.target.tagName === 'IMG' ? e.target : e.target.closest('img'));
        const imageUrl = imageElement ? imageElement.src : null;
        if (data.doubleClickToSwitch && !imageUrl && !linkUrl) {
            hasPopupTriggered = true;
            isDoubleClick = true;

            previewMode = !previewMode;


            // In popup.js or content.js
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                theme = 'dark';
            } else {
                theme = 'light';
            }
            chrome.runtime.sendMessage({ action: 'updateIcon', previewMode: previewMode, theme: theme }), () => {
                resetClickState();
            };

        } else if (linkUrl) {
            if (linkUrl && /^(mailto|tel|javascript):/.test(linkUrl.trim())) return;
            if (isUrlDisabled(linkUrl, linkDisabledUrls)) return;
            if (data.doubleClickAsClick) {
                hasPopupTriggered = true;
                isDoubleClick = true;
                if (e.target.shadowRoot) {
                    linkElement.click();
                } else {
                    try {
                        e.target.click(); // Attempt to call click on e.target
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

        chrome.runtime.sendMessage({ action: 'updateIcon', previewMode: previewMode, theme: theme });
        // Reset click states after double-click
        // resetClickState();

        isDoubleClick = false;
    });
}
function resetClickState() {
    // Reset variables after click or double-click
    isDoubleClick = false;
    hasPopupTriggered = false;
    clearTimeout(clickTimeout);
}

function handleEvent(e) {

    if (e.type === 'dragstart') {
        const anchorElement = e.composedPath().find(node => node instanceof HTMLAnchorElement);
        chrome.storage.local.get(['modifiedKey', 'dragDirections'], (data) => {
            const modifiedKey = data.modifiedKey || 'None';
            const keyMap = { 'Ctrl': e.ctrlKey, 'Alt': e.altKey, 'Shift': e.shiftKey, 'Meta': e.metaKey };
            if (modifiedKey === 'None' || keyMap[modifiedKey]) {
                
                handleDragStart(e, anchorElement);
            } else {
                isDragging = false;
            }
        });
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
            if (previewMode && linkUrl && !isDoubleClick) {
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

            chrome.runtime.sendMessage({ action: 'updateIcon', previewMode: previewMode, theme: theme });
        }


        // In popup.js or content.js
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            theme = 'dark';
        } else {
            theme = 'light';
        }

        chrome.runtime.sendMessage({ action: 'updateIcon', previewMode: previewMode, theme: theme });


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

    chrome.runtime.sendMessage({ action: 'updateIcon', previewMode: previewMode, theme: theme });
}

function handlePreviewMode(e, linkUrl) {
    if (!isMouseDown || hasPopupTriggered || isDoubleClick) return;

    if (linkUrl) {
        e.preventDefault();
        e.stopPropagation();

        chrome.storage.local.get(['blurEnabled', 'blurPx', 'blurTime'], (data) => {
            const blurTime = data.blurTime || 1;
            const blurEnabled = data.blurEnabled !== undefined ? data.blurEnabled : true;
            const blurPx = parseFloat(data.blurPx || 3);



            // Set finalLinkUrl based on linkUrl, imgSupport, and searchEngine
            let finalLinkUrl = linkUrl;

            if (!finalLinkUrl) return;

            if (linkIndicator) {
                linkIndicator.remove();
            }
            linkIndicator = null;

            if (searchTooltips) searchTooltips.remove();
            searchTooltips = null;
            if (blurEnabled) {
                addBlurOverlay(blurPx, blurTime);
            }
            addClickMask();

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
            if (isUrlDisabled(finalLinkUrl, linkDisabledUrls)) return;


            // Clear any existing timeout, interval, and progress bar
            clearTimeoutsAndProgressBars();

            hoverElement = selectionText; // Set the current hover element
            hoverInitialMouseX = e.clientX; // Store initial mouse position
            hoverInitialMouseY = e.clientY;

            const hoverTimeoutDuration = parseInt(data.hoverTimeout, 10) || 0; // Default to disabled if not set

            // Create and display the progress bar immediately
            progressBar = createCandleProgressBar(hoverInitialMouseX, hoverInitialMouseY, hoverTimeoutDuration);

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


async function handleDragStart(e, anchorElement) {

    if (searchTooltips) searchTooltips.remove();
    searchTooltips = null;

    const data = await loadUserConfigs(['modifiedKey', 'dragStartEnable', 'imgSearchEnable', 'searchEngine', 'blurEnabled', 'blurPx', 'blurTime', 'dragPx', 'dragDirections', 'imgSupport']);
    const dragStartEnable = data.dragStartEnable !== 'undefined' ? data.dragStartEnable : false;

    if (!dragStartEnable) {

        const viewportTop = e.screenY - e.clientY;
        const viewportBottom = e.screenY - e.clientY + window.innerHeight;
        const viewportLeft = e.screenX - e.clientX;
        const viewportRight = e.screenX - e.clientX + window.innerWidth;
        const dragPx = data.dragPx || 0;
        const dragDirections = data.dragDirections || ['up', 'down', 'right', 'left'];

        if (!Array.isArray(dragDirections) || dragDirections.length === 0) {
            isDragging = false;
            return;
        }

        function onDragend(e, endInfo = null) {
            const modifiedKey = data.modifiedKey || 'None';
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

            // Do nothing when dragging out of the current page
            if (window.self === window.top) {
                if (!(viewportLeft < e.screenX && e.screenX < viewportRight && viewportTop < e.screenY && e.screenY < viewportBottom)) {
                    document.removeEventListener('dragend', onDragend, true);
                    resetDraggingState();
                    return;
                }
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
                const searchEngine = (data.searchEngine !== 'None' ? (data.searchEngine || 'https://www.google.com/search?q=%s') : null);
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

                if (data.imgSearchEnable) {
                    const imgSearchEngineMap = {
                        "https://www.google.com/search?q=%s": "https://lens.google.com/uploadbyurl?url=%s",
                        "https://www.bing.com/search?q=%s": "https://www.bing.com/images/search?q=imgurl:%s&view=detailv2&iss=sbi",
                        "https://www.baidu.com/s?wd=%s": "https://graph.baidu.com/details?isfromtusoupc=1&tn=pc&carousel=0&promotion_name=pc_image_shituindex&extUiData%5bisLogoShow%5d=1&image=%s",
                        "https://yandex.com/search/?text=%s": "https://yandex.com/images/search?rpt=imageview&url=%s"
                    };
                    if (imgSearchEngineMap.hasOwnProperty(data.searchEngine)) {

                        imageUrl = imgSearchEngineMap[searchEngine].replace('%s', encodeURIComponent(imageUrl));
                    }
                }

                // Set finalLinkUrl based on linkUrl, imgSupport, and searchEngine
                let finalLinkUrl = processedLinkUrl || linkUrl || (data.imgSupport ? imageUrl : null) ||
                    ((searchEngine && selectionText.trim() !== '')
                        ? searchEngine.replace('%s', encodeURIComponent(selectionText))
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

                            if (window.self !== window.top) {
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

                        if (window.self !== window.top) {
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
            }
        }

        if (window.self !== window.top) {
            window.addEventListener('dragend', (e) => {
                const endElement = e.composedPath().find(node => node instanceof HTMLAnchorElement) ||
                    (e.target instanceof HTMLElement && (e.target.tagName === 'A' ? e.target : e.target.closest('a')));
                const top = e.screenY - e.clientY;
                const left = e.screenX - e.clientX;
                const endX = e.screenX;
                const endY = e.screenY;
                const endInfo = {
                    endElement, 
                    endClientX: e.clientX, 
                    endClientY: e.clientY
                }
                const modifiedKey = data.modifiedKey || 'None';
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
                window.parent.postMessage({action: 'dragendCheck', top, left, endY, endX}, '*');
            }, { once: true })

        } else {
            document.addEventListener('dragend', onDragend, { once: true });
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
            const searchEngine = (data.searchEngine !== 'None' ? (data.searchEngine || 'https://www.google.com/search?q=%s') : null);
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

            if (data.imgSearchEnable) {
                const imgSearchEngineMap = {
                    "https://www.google.com/search?q=%s": "https://lens.google.com/uploadbyurl?url=%s",
                    "https://www.bing.com/search?q=%s": "https://www.bing.com/images/search?q=imgurl:%s&view=detailv2&iss=sbi",
                    "https://www.baidu.com/s?wd=%s": "https://graph.baidu.com/details?isfromtusoupc=1&tn=pc&carousel=0&promotion_name=pc_image_shituindex&extUiData%5bisLogoShow%5d=1&image=%s",
                    "https://yandex.com/search/?text=%s": "https://yandex.com/images/search?rpt=imageview&url=%s"
                };
                if (imgSearchEngineMap.hasOwnProperty(data.searchEngine)) {

                    imageUrl = imgSearchEngineMap[searchEngine].replace('%s', encodeURIComponent(imageUrl));
                }
            }

            // Set finalLinkUrl based on linkUrl, imgSupport, and searchEngine
            let finalLinkUrl = processedLinkUrl || linkUrl || (data.imgSupport ? imageUrl : null) ||
                ((searchEngine && selectionText.trim() !== '')
                    ? searchEngine.replace('%s', encodeURIComponent(selectionText))
                    : null);
            if (!finalLinkUrl) return;


            e.preventDefault();
            e.stopImmediatePropagation();
            isDragging = true;

            if (linkIndicator) {
                linkIndicator.remove();
            }
            linkIndicator = null;
            if (searchTooltips) searchTooltips.remove();
            searchTooltips = null;

            if (window.self !== window.top) {
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
        }
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

    chrome.runtime.sendMessage({ action: 'updateIcon', previewMode: previewMode, theme: theme });
    const data = await loadUserConfigs([
        'disabledUrls',
        'searchEngine',
        'hoverSearchEngine',
        'previewModeDisabledUrls',
        'previewModeEnable',
        'holdToPreview',
        'collectionEnable',
        'holdToPreviewTimeout',
        'clickModifiedKey',
        'linkDisabledUrls',
        'searchTooltipsEnable'
    ]);
    const disabledUrls = data.disabledUrls || [];
    linkDisabledUrls = data.linkDisabledUrls || [];
    holdToPreviewTimeout = data.holdToPreviewTimeout || 1500;
    const currentUrl = window.location.href;

    if (isUrlDisabled(currentUrl, disabledUrls)) {
        removeListeners();
    } else {
        addListeners();
    }

    if (data.searchTooltipsEnable) {
        document.addEventListener('mouseup', handleEvent)
    }

    clickModifiedKey = data.clickModifiedKey || 'None';

    if (typeof data.searchEngine === 'undefined') {
        chrome.storage.local.set({ searchEngine: 'https://www.google.com/search?q=%s' });
    }
    if (typeof data.hoverSearchEngine === 'undefined') {
        chrome.storage.local.set({ hoverSearchEngine: 'https://www.google.com/search?q=%s' });
    }

    if (!data.previewModeEnable) {
        previewMode = false;

    } else {
        previewMode = data.previewMode;
    }
    
    if (!(window.self !== window.top)) {
        // Inside the parent page content script
        window.addEventListener('message', function (e) {
            if (e.data && e.data.action === 'blurParent') {
                if (data.blurEnabled) {
                    addBlurOverlay(data.blurPx, data.blurTime);
                }
                addClickMask();
            } else if (e.data && e.data.action === 'removeParentBlur') {
                removeBlurOverlay();
                removeClickMask();
            } else if (e.data.type === 'GET_SCREEN_COORDS') {

                chrome.runtime.sendMessage({ action: 'getZoomFactor' }, (response) => {
                    if (response.error) {
                        console.error('Error:', response.error);
                    } else {
                        // Find the iframe that sent the request
                        const iframes = document.getElementsByTagName('iframe');
                        let iframeRect;
                        for (let iframe of iframes) {
                            if (iframe.contentWindow === e.source) {
                                iframeRect = iframe.getBoundingClientRect();
                                break;
                            }
                        }

                        const zoomFactor = response.zoom; // zoom factor
                        // Send the screen coordinates back to the iframe
                        e.source.postMessage({
                            type: 'SCREEN_COORDS',
                            topOffset: iframeRect.top,
                            leftOffset: iframeRect.left,
                            innerHeight: window.innerHeight,
                            innerWidth: window.innerWidth,
                            zoomFactor: zoomFactor
                        }, e.origin);
                    }
                });

            } else if (e.data && e.data.action === 'dragendCheck') {
                const { top, left, endY, endX, endEvent } = e.data;
                chrome.runtime.sendMessage({ action: 'getZoomFactor' }, (response) => {

                    if (response.error) {
                        console.error('Error:', response.error);
                    } else {
                        // Find the iframe that sent the request
                        const iframes = document.getElementsByTagName('iframe');
                        let iframeRect;
                        for (let iframe of iframes) {
                            if (iframe.contentWindow === e.source) {
                                iframeRect = iframe.getBoundingClientRect();
                                break;
                            }
                        }

                        const zoomFactor = response.zoom; // zoom factor
                        const viewportLeft = (left - iframeRect.left) * zoomFactor;
                        const viewportRight = viewportLeft + window.innerWidth * zoomFactor;
                        const viewportTop = (top - iframeRect.top) * zoomFactor;
                        const viewportBottom = viewportTop + window.innerHeight * zoomFactor;
                        const isOut = (!(viewportLeft < endX && endX < viewportRight && viewportTop < endY && endY < viewportBottom));

                        // Send the screen coordinates back to the iframe
                        e.source.postMessage({
                            type: 'RESULT',
                            isOut,
                            endEvent
                        }, e.origin);
                    }
                });
            }
        });

    }


    // In popup.js or content.js
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        theme = 'dark';
    } else {
        theme = 'light';
    }

    chrome.runtime.sendMessage({ action: 'updateIcon', previewMode: previewMode, theme: theme });
    const previewModeDisabledUrls = data.previewModeDisabledUrls || [];

    if (!(isUrlDisabled(window.location.href, previewModeDisabledUrls)) && data.previewModeEnable) {
        previewMode = (previewMode !== undefined) ? previewMode : data.previewModeEnable;

        // Add the event listener
        const events = ["click", "mouseup"];
        events.forEach(event => document.addEventListener(event, handleEvent, true));
    }

    if (data.collectionEnable) {
        document.addEventListener(['contextmenu'], addLinkToCollection, true);

    } else {
        document.removeEventListener(['contextmenu'], addLinkToCollection, true);
    }
}

// Function to add a link to the collection
function addLinkToCollection(e) {
    if (!e.ctrlKey) return;
    const anchorElement = e.composedPath().find(node => node instanceof HTMLAnchorElement);
    e.preventDefault();
    e.stopPropagation();
    chrome.storage.local.get('collection', async (data) => {
        const linkElement = anchorElement ||
            (e.target instanceof HTMLElement && (e.target.tagName === 'A' ? e.target : e.target.closest('a')));
        if (!linkElement) return;

        const linkUrl = linkElement ?
            (linkElement.getAttribute('data-url') ||
                (linkElement.href.startsWith('/') ? window.location.protocol + linkElement.href : linkElement.href))
            : null;

        if (linkUrl && /^(mailto|tel|javascript):/.test(linkUrl.trim())) return;
        if (isUrlDisabled(linkUrl, linkDisabledUrls)) return;

        // Initialize or load the collection
        collection = (Array.isArray(data.collection) && data.collection.length > 0)
            ? data.collection
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
            const newItem = {
                label: linkElement.title || linkElement.textContent || linkUrl, // Use the link's title as label, or the URL if title is unavailable
                url: linkUrl
            };

            // Add the new link to the collection
            collection[1].links.push(newItem);
            collection.push(newItem); // Add the link as a new entry to the main collection

            // Store the updated collection back in Chrome storage
            chrome.storage.local.set({ collection: collection });
        } else {
            // console.log('Link already exists in the collection.');
        }
        isMouseDownOnLink = false;
        firstDownOnLinkAt = null;

    });


}

chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'local' && (changes.hoverTimeout ||
        changes.linkHint ||
        changes.disabledUrls ||
        changes.searchEngine ||
        changes.hoverDisabledUrls ||
        changes.hoverSearchEngine ||
        changes.dragDirections ||
        changes.dragPx ||
        changes.previewModeDisabledUrls ||
        changes.previewModeEnable ||
        changes.doubleClickAsClick ||
        changes.doubleClickToSwitch ||
        changes.searchTooltipsEnable ||
        changes.collectionEnable ||
        changes.holdToPreview ||
        changes.clickModifiedKey ||
        changes.linkDisabledUrls
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
    clearTimeoutsAndProgressBars();
    hoverElement = null;

    hoverInitialMouseX = null;
    hoverInitialMouseY = null;
    try {


        // In popup.js or content.js
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            theme = 'dark';
        } else {
            theme = 'light';
        }

        chrome.runtime.sendMessage({ action: 'updateIcon', previewMode: previewMode, theme: theme });
        const data = await loadUserConfigs(['closeWhenFocusedInitialWindow']);
        document.addEventListener('mouseover', handleMouseOver, true);
        const message = data.closeWhenFocusedInitialWindow
            ? { action: 'windowRegainedFocus', checkContextMenuItem: true }
            : { checkContextMenuItem: true };
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


// Handle mouseover event
async function handleMouseOver(e) {

    const path = e.composedPath();
    const iframe = path.find((node) => node instanceof HTMLIFrameElement);
    if (iframe) {
        e.target.focus();
    }
    // Check if any of the nodes in the path are part of a shadow root
    const isInsideShadowRoot = path.some(node => node instanceof ShadowRoot);
    if (isInsideShadowRoot) {
            clearTimeoutsAndProgressBars();
            e.target.addEventListener('mousemove', handleMouseOver)
        e.target.addEventListener('mouseleave', ()=>{
            clearTimeoutsAndProgressBars();
            e.target.removeEventListener('mousemove', handleMouseOver)
        },{once: true})
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

    const data = await loadUserConfigs(['linkHint', 'hoverImgSearchEnable', 'blurEnabled', 'blurPx', 'blurTime', 'hoverTimeout', 'hoverImgSupport', 'hoverModifiedKey', 'hoverDisabledUrls']);
    const linkHint = data.linkHint || false;
    const hoverTimeout = data.hoverTimeout || 0;
    // do nothing when is in blacklist
    const currentUrl = window.location.href;
    const hoverDisabledUrls = data.hoverDisabledUrls || [];
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


    const hoverModifiedKey = data.hoverModifiedKey || 'None';
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
                if (anchorElement) {
                    anchorElement.addEventListener('mouseleave', ()=>{
                        clearTimeoutsAndProgressBars();
                        e.target.addEventListener('mousemove', handleMouseOver)
                    },{once: true})
                    e.target.addEventListener('mouseleave', ()=>{
                        clearTimeoutsAndProgressBars();
                        e.target.removeEventListener('mousemove', handleMouseOver)
                    },{once: true})
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
    chrome.storage.local.get('hoverModifiedKey', async (data) => {
        const hoverModifiedKey = data.hoverModifiedKey || 'None';
        const keyMap = { 'Ctrl': e.ctrlKey, 'Alt': e.altKey, 'Shift': e.shiftKey, 'Meta': e.metaKey };

        if (hoverModifiedKey === 'None' || keyMap[hoverModifiedKey]) {
            const configData = await loadUserConfigs(['hoverImgSearchEnable', 'hoverSearchEngine', 'blurEnabled', 'blurPx', 'blurTime', 'hoverImgSupport', 'urlCheck']);
            const hoverSearchEngine = (configData.hoverSearchEngine !== 'None' ? (configData.hoverSearchEngine || 'https://www.google.com/search?q=%s') : null);
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

            let imageUrl = configData.hoverImgSupport ? imageElement?.src : null;
            if (configData.hoverImgSearchEnable) {
                const imgSearchEngineMap = { "https://www.google.com/search?q=%s": "https://lens.google.com/uploadbyurl?url=%s", "https://www.bing.com/search?q=%s": "https://www.bing.com/images/search?q=imgurl:%s&view=detailv2&iss=sbi", "https://www.baidu.com/s?wd=%s": "https://graph.baidu.com/details?isfromtusoupc=1&tn=pc&carousel=0&promotion_name=pc_image_shituindex&extUiData%5bisLogoShow%5d=1&image=%s", "https://yandex.com/search/?text=%s": "https://yandex.com/images/search?rpt=imageview&url=%s" };
                if (imgSearchEngineMap.hasOwnProperty(configData.hoverSearchEngine)) {
                    imageUrl = imgSearchEngineMap[configData.hoverSearchEngine].replace('%s', encodeURIComponent(imageUrl));
                }
            }

            // Set finalLinkUrl based on linkUrl, hoverImgSupport, and searchEngine
            let finalLinkUrl = processedLinkUrl || linkElement?.href || imageUrl ||
                ((hoverSearchEngine && selectionText.trim() !== '')
                    ? hoverSearchEngine.replace('%s', encodeURIComponent(selectionText))
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

            if (blurEnabled) {
                addBlurOverlay(blurPx, blurTime);
            }
            addClickMask();
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
    });
}

// Trigger the popup logic
function triggerLinkPopup(e, link) {
    chrome.storage.local.get(['blurEnabled', 'blurPx', 'blurTime'], async (data) => {

        if (linkIndicator) {
            linkIndicator.remove();
        }
        linkIndicator = null;
        if (searchTooltips) searchTooltips.remove();
        searchTooltips = null;

        if (data.blurEnabled) {
            addBlurOverlay(data.blurPx, data.blurTime);
        }

        addClickMask();
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
    if (!blurOverlay) { // Check if the overlay does not already exist
        blurOverlay = document.createElement('div');
        blurOverlay.style.position = 'fixed';
        blurOverlay.style.top = '0';
        blurOverlay.style.left = '0';
        blurOverlay.style.width = '100%';
        blurOverlay.style.height = '100%';
        blurOverlay.style.zIndex = '2147483647';
        blurOverlay.style.backdropFilter = `blur(${blurPx}px)`;
        blurOverlay.style.transition = `backdrop-filter ${blurTime}s ease`;
        blurOverlay.style.pointerEvents = 'none'; // Optional: Allows clicks to pass through
        document.body.appendChild(blurOverlay);
    }
}

// Function to remove the blur overlay
function removeBlurOverlay() {
    if (blurOverlay) {
        blurOverlay.remove(); // Removes the overlay from the DOM
        blurOverlay = null; // Clear the reference
    }
}
