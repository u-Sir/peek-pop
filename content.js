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
let isDoubleClick = false;
let previewMode;
let clickTimeout;
const moveThreshold = 15;
let linkIndicator;
let tooltip;
let searchTooltips;
let linkCollection;
let collection;
let hoverlinkOrText = false;

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
    'previewModeDisabledUrls': [],
    'previewModePopupInBackground': false,
    'previewModeModifiedKey': 'None',
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
    'collectionTooltipsEnable': false
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
    tooltip.style.zIndex = '10000';
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
        button.style.backgroundColor = '#ffa742'; // Button background color
        button.style.border = 'none';
        button.style.color = '#000'; // Button text color
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


function addTooltipsOnHover(event) {
    if (event.target.tagName === 'A' || event.target.closest('a')) {
        chrome.storage.local.get(['collection', 'blurEnabled', 'blurPx', 'blurTime', 'collectionTooltipsEnable'], async (data) => {

            if (linkCollection) linkCollection.remove();
            if (tooltip) tooltip.remove();
            if (searchTooltips) searchTooltips.remove();
            searchTooltips = null;
            if (typeof data.collectionTooltipsEnable === 'undefined' || !data.collectionTooltipsEnable) return;

            const linkElement = event.target instanceof HTMLElement && (event.target.tagName === 'A' ? event.target : event.target.closest('a'));
            if (!linkElement) return; // Ensure there's a valid link element
            const visibleWidth = linkElement.clientWidth; // Width of the visible part

            const linkRect = linkElement.getBoundingClientRect(); // Get link's bounding box
            const linkUrl = linkElement.href;
            const linkTitle = linkElement.title || linkElement.textContent;
            if (linkUrl && linkUrl.trim().startsWith('javascript:')) return;
            hoverlinkOrText = true;
            // Initialize or load the collection
            collection = (Array.isArray(data.collection) && data.collection.length > 0)
                ? data.collection
                : [
                    {
                        label: '+',
                        handler: () => {
                            addLinkToCollection(linkUrl, linkTitle);
                        }
                    },
                    {
                        label: '↗️',
                        links: [], // This will store the links
                        handler: function () {
                            // Ensure links exist before creating the popup
                            if (this.links && this.links.length > 0) {
                                const group = {
                                    action: 'group',
                                    links: this.links,
                                    trigger: 'tooltips',
                                    lastClientX: event.clientX,
                                    lastClientY: event.clientY,
                                    width: window.screen.availWidth,
                                    height: window.screen.availHeight,
                                    top: window.screen.availTop,
                                    left: window.screen.availLeft
                                };

                                if (linkIndicator) {
                                    linkIndicator.remove();
                                }
                                linkIndicator = null;

                                if (searchTooltips) searchTooltips.remove();
                                searchTooltips = null;

                                if (data.blurEnabled) {
                                    document.body.style.filter = `blur(${data.blurPx}px)`;
                                    document.body.style.transition = `filter ${data.blurTime}s ease`;
                                }
                                chrome.runtime.sendMessage(group, () => {
                                    // Remove all items from the collection except for the '+' item
                                    collection = collection.filter(item => item.label === '+');

                                    // Store the updated collection back in Chrome storage
                                    chrome.storage.local.set({ collection: collection });
                                });
                            }
                        }
                    }
                ];
            // Ensure the `links` array is correctly populated
            collection = collection.map(item => {
                if (!item.handler) {
                    if (item.label === '+') {
                        item.handler = () => addLinkToCollection(linkUrl, linkTitle);
                    } else if (item.label === '↗️') {
                        item.handler = function () {
                            // Ensure links exist before creating the popup
                            if (this.links && this.links.length > 0) {
                                const group = {
                                    action: 'group',
                                    links: this.links,
                                    trigger: 'tooltips',
                                    lastClientX: event.clientX,
                                    lastClientY: event.clientY,
                                    width: window.screen.availWidth,
                                    height: window.screen.availHeight,
                                    top: window.screen.availTop,
                                    left: window.screen.availLeft
                                };

                                if (linkIndicator) {
                                    linkIndicator.remove();
                                }
                                linkIndicator = null;

                                if (searchTooltips) searchTooltips.remove();
                                searchTooltips = null;

                                if (data.blurEnabled) {
                                    document.body.style.filter = `blur(${data.blurPx}px)`;
                                    document.body.style.transition = `filter ${data.blurTime}s ease`;
                                }
                                chrome.runtime.sendMessage(group, () => {
                                    // Remove all items from the collection except for the '+' item
                                    collection = collection.filter(item => item.label === '+');

                                    // Store the updated collection back in Chrome storage
                                    chrome.storage.local.set({ collection: collection });
                                });
                            }
                        };
                        item.links = collection[1].links;

                    } else {
                        item.handler = () => removeLinkFromCollection(item.url);
                    }
                }
                return item;
            });


            // Ensure 'popup' is only added if there are links
            if (collection[1] && collection[1].links && collection[1].links.length === 0) {
                collection.pop(); // Remove the 'popup' item if no links
            }

            // Create actions from the collection
            const actions = collection
                .filter(item => item.label === '+') // Only map items where item.label is '+'
                .map(item => ({
                    label: item.label,
                    handler: item.handler
                }));

            let offset = 30;
            // Check if collection[1] exists and has links
            if (collection.length > 1 && collection[1].links && collection[1].links.length > 0) {
                offset = 40;
                const linkCount = collection[1].links.length;
                const actionPageButton = {
                    label: `${linkCount}`, // Button text is the count of links inside
                    handler: function () {

                        // chrome.runtime.sendMessage({action: 'openSidePanel'}, () => {
                        //
                        // });
                    }
                };

                // Add the new action page button to the actions array
                actions.push(actionPageButton);
            }

            // Get the computed styles of the element
            const computedStyles = window.getComputedStyle(linkElement);

            // Get the element's height
            const elementHeight = linkElement.getBoundingClientRect().height;

            // Get the line-height from the computed styles
            const lineHeight = parseFloat(computedStyles.lineHeight);

            // If line-height is not defined in the CSS, we can fall back to font-size
            const fontSize = parseFloat(computedStyles.fontSize);
            const actualLineHeight = lineHeight || fontSize * 1.2; // Assuming line-height is about 1.2x font-size if undefined

            // Calculate how many lines the text has wrapped into
            const lineCount = Math.round(elementHeight / actualLineHeight);


            linkCollection = createTooltip(linkRect.left + visibleWidth, linkRect.top - linkRect.height / lineCount + 5, actions);

            const checkCursorInsideViewport = (event) => {
                const x = event.clientX; // Get the cursor's X position
                const y = event.clientY; // Get the cursor's Y position

                // Check if cursor is inside the viewport
                const isInsideViewport = (
                    x >= 0 &&
                    x <= window.innerWidth &&
                    y >= 0 &&
                    y <= window.innerHeight
                );

                if (!isInsideViewport) {
                    if (linkCollection) {
                        linkCollection.remove();
                        linkCollection = null;
                    }
                    document.removeEventListener('mousemove', checkCursorInsideViewport);
                }
            };

            document.addEventListener('mousemove', checkCursorInsideViewport);

            // Handle when the mouse leaves the document (i.e., the entire page)
            document.addEventListener('mouseleave', function removeTooltip() {
                if (linkCollection) {
                    linkCollection.remove();
                    linkCollection = null;
                }
                document.removeEventListener('mouseleave', removeTooltip);
                document.removeEventListener('mousemove', checkCursorInsideViewport);
            });
        });
    }
}



function addSearchTooltipsOnHover(event) {
    const selection = window.getSelection();
    const selectionText = selection.toString().trim();

    if (selectionText !== '' && selection.rangeCount && selection.rangeCount > 0) {

        if (linkCollection) linkCollection.remove();
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
                    handler: () => triggerLinkPopup(event, link)
                }]
                : [
                    {
                        label: 'Google',
                        handler: () => triggerLinkPopup(event, `https://www.google.com/search?q=${encodeURIComponent(selectionText)}`)
                    },
                    {
                        label: 'Bing',
                        handler: () => triggerLinkPopup(event, `https://www.bing.com/search?q=${encodeURIComponent(selectionText)}`)
                    },
                    {
                        label: 'Baidu',
                        handler: () => triggerLinkPopup(event, `https://www.baidu.com/s?wd=${encodeURIComponent(selectionText)}`)
                    },
                    {
                        label: 'Yandex',
                        handler: () => triggerLinkPopup(event, `https://yandex.com/search/?text=${encodeURIComponent(selectionText)}`)
                    },
                    {
                        label: 'DuckduckGo',
                        handler: () => triggerLinkPopup(event, `https://duckduckgo.com/?q=${encodeURIComponent(selectionText)}`)
                    },
                    {
                        label: 'Wikipedia',
                        handler: () => triggerLinkPopup(event, `https://wikipedia.org/w/index.php?title=Special:Search&search=${encodeURIComponent(selectionText)}`)
                    },
                ];

            const range = selection.getRangeAt(0).cloneRange();
            const textRect = range.getBoundingClientRect(); // Get the bounding box of the selected text
            hoverlinkOrText = true;
            searchTooltips = createTooltip(textRect.left, textRect.bottom, actions, 1500);

            const checkSearchCursorInsideViewport = (event) => {
                const x = event.clientX; // Get the cursor's X position
                const y = event.clientY; // Get the cursor's Y position

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


// Function to add a link to the collection
function addLinkToCollection(url, label) {
    // Ensure collection[1] and collection[1].links are initialized
    if (!collection[1]) {
        collection[1] = { label: '↗️', links: [] };
    }
    if (!Array.isArray(collection[1].links)) {
        collection[1].links = [];
    }

    // Check if the link is already in the collection before adding
    if (!isLinkInCollection(url)) {
        const newItem = {
            label: label || url, // Use the link's title as label, or the URL if title is unavailable
            url: url,
            handler: () => {
                removeLinkFromCollection(url); // Remove the link on click
            }
        };

        // Add the new link to the collection
        collection[1].links.push(newItem);
        collection.push(newItem); // Add the link as a new entry to the main collection

        // Store the updated collection back in Chrome storage
        chrome.storage.local.set({ collection: collection });
    } else {
        // console.log('Link already exists in the collection.');
    }
}


// Function to remove a link from the collection
function removeLinkFromCollection(url) {
    collection[1].links = collection[1].links.filter(item => item.url !== url);
    collection = collection.filter(item => item.url !== url); // Remove from the main collection

    // Store the updated collection back in chrome storage
    chrome.storage.local.set({ collection: collection });
}



// Function to add link indicator when hovering over a link
function changeCursorOnHover(event) {
    if (event.target.tagName === 'A' || event.target.closest('a')) {

        const linkElement = event.target instanceof HTMLElement && (event.target.tagName === 'A' ? event.target : event.target.closest('a'));
        const linkUrl = linkElement ? linkElement.href : null;
        if (linkUrl && linkUrl.trim().startsWith('javascript:')) return;

        if (!document.body.contains(event.target)) {
            return; // If the element is not in the DOM anymore, do nothing
        }
        if (linkIndicator) {
            linkIndicator.remove(); // Remove any existing indicator
        }
        linkIndicator = null;

        if (searchTooltips) searchTooltips.remove();
        searchTooltips = null;

        if (tooltip) tooltip.remove();

        const linkRect = event.target.getBoundingClientRect(); // Get link's bounding box
        linkIndicator = createCandleProgressBar(event.clientX, event.clientY, 6000);
        const checkCursorInside = (event) => {
            const x = event.clientX; // Get the cursor's X position
            const y = event.clientY; // Get the cursor's Y position
            const sx = event.screenX; // Get the cursor's X position
            const sy = event.screenY; // Get the cursor's Y position

            // Check if cursor is inside the link's bounding box
            const isInsideLink = (
                x >= linkRect.left &&
                x <= linkRect.right &&
                y >= linkRect.top &&
                y <= linkRect.bottom
            );
            // Check if cursor is inside the viewport use screen cordination
            const isInsideViewport = (
                sx >= window.screenX &&
                sx <= (window.screenX + window.innerWidth) &&
                sy >= window.screenY &&
                sy <= (window.screenY + window.innerHeight)
            );

            if (isInsideLink && isInsideViewport && linkIndicator) {
                linkIndicator.style.top = `${y + 25}px`; // Update top position
                linkIndicator.style.left = `${x}px`; // Update left position
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
        event.target.addEventListener('mouseout', function () {
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
    chrome.runtime.sendMessage({ checkContextMenuItem: true }, response => {
        if (chrome.runtime.lastError) {
            console.error("Runtime error:", chrome.runtime.lastError);
        } else {
        }
    });

    if (tooltip) tooltip.remove();
    if (searchTooltips) searchTooltips.remove();
    if (linkCollection) linkCollection.remove();
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
            const data = await loadUserConfigs(['doubleTapKeyToSendPageBack']);
            const doubleTapKeyToSendPageBack = data.doubleTapKeyToSendPageBack || 'None';

            if (doubleTapKeyToSendPageBack === 'None') return;

            const keyMap = { 'Ctrl': e.ctrlKey, 'Alt': e.altKey, 'Shift': e.shiftKey, 'Meta': e.metaKey };
            const key = e.key;
            const currentTime = new Date().getTime();
            const timeDifference = currentTime - lastKeyTime;

            if (keyMap[doubleTapKeyToSendPageBack] && key === lastKey && timeDifference < 300) {

                if (linkIndicator) {
                    linkIndicator.remove();
                }
                linkIndicator = null;

                if (searchTooltips) searchTooltips.remove();
                searchTooltips = null;
                chrome.runtime.sendMessage({ action: 'openSidePanel' }, () => {
                });
            } else {
                lastKeyTime = currentTime;
                lastKey = key;
            }
        } catch (error) {
        }

    }
}


async function handleMouseDown(e) {

    if (document.body) {
        document.body.style.filter = '';
    }
    initialMouseX = e.clientX;
    initialMouseY = e.clientY;

    chrome.storage.local.get(['modifiedKey', 'previewModeModifiedKey', 'previewModeEnable', 'previewModeDisabledUrls'], (data) => {
        const modifiedKey = data.modifiedKey || 'None';
        const keyMap = { 'Ctrl': e.ctrlKey, 'Alt': e.altKey, 'Shift': e.shiftKey, 'Meta': e.metaKey };
        const previewModeDisabledUrls = data.previewModeDisabledUrls || [];
        if (modifiedKey === 'None' || keyMap[modifiedKey]) {
            const events = ["click", "dragstart", "dragover", "drop", "mouseup"];
            events.forEach(event => document.addEventListener(event, handleEvent, true));

        } else {
            const events = ["click", "dragstart", "dragover", "drop", "mouseup"];

            events.forEach(event => document.removeEventListener(event, handleEvent, true));
        }

        if (!(isUrlDisabled(window.location.href, previewModeDisabledUrls)) && data.previewModeEnable) {
            const previewModeModifiedKey = data.previewModeModifiedKey || 'None';

            if (previewModeModifiedKey === 'None' || keyMap[previewModeModifiedKey]) {
                previewMode = (previewMode !== undefined) ? previewMode : data.previewModeEnable;

                // Add the event listener
                const events = ["click", "mouseup"];

                events.forEach(event => document.addEventListener(event, handleEvent, true));


            } else {
                const events = ["click", "mouseup"];

                events.forEach(event => document.removeEventListener(event, handleEvent, true));
            }

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

function handleDoubleClick(e) {

    // Prevent the single-click action from triggering
    clearTimeout(clickTimeout);

    e.preventDefault(); // Prevent the default double-click action
    e.stopPropagation(); // Stop the event from bubbling up
    chrome.storage.local.get(['doubleClickToSwitch', 'doubleClickAsClick', 'previewModeEnable'], (data) => {
        if (!data.previewModeEnable) return;
        // Check if the double-clicked element is a link

        const linkElement = e.target instanceof HTMLElement && (e.target.tagName === 'A' ? e.target : e.target.closest('a'));
        const linkUrl = linkElement ? linkElement.href : null;
        if (linkUrl && linkUrl.trim().startsWith('javascript:')) return;


        const imageElement = e.target instanceof HTMLElement && (e.target.tagName === 'IMG' ? e.target : e.target.closest('img'));
        const imageUrl = imageElement ? imageElement.src : null;
        if (data.doubleClickToSwitch && !imageUrl && !linkUrl) {
            hasPopupTriggered = true;
            isDoubleClick = true;

            previewMode = !previewMode;
            chrome.runtime.sendMessage({ action: 'updateIcon', previewMode: previewMode });


        } else if (linkUrl) {
            // Simulate a single click
            if (data.doubleClickAsClick) {
                hasPopupTriggered = true;
                isDoubleClick = true;
                e.target.click();
            }
        }

        // Remove the event listener after it triggers once
        document.removeEventListener('dblclick', handleDoubleClick, true);
        isDoubleClick = false;
        chrome.runtime.sendMessage({ action: 'updateIcon', previewMode: previewMode });

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
    } else if (['dragover', 'drop'].includes(e.type) && isDragging) {
        preventEvent(e);
    } else if (e.type === 'click') {
        if (isDragging) {
            preventEvent(e);
            isDragging = false;
        } else {
            document.addEventListener('dblclick', handleDoubleClick, true);
            const linkElement = e.target instanceof HTMLElement && (e.target.tagName === 'A' ? e.target : e.target.closest('a'));
            const linkUrl = linkElement ? linkElement.href : null;
            if (linkUrl && linkUrl.trim().startsWith('javascript:')) return;

            if (previewMode && linkUrl && !isDoubleClick) {
                e.preventDefault();
                e.stopPropagation();
                clickTimeout = setTimeout(() => {
                    handlePreviewMode(e);
                }, 250);
            }
            chrome.runtime.sendMessage({ action: 'updateIcon', previewMode: previewMode });

        }
        chrome.runtime.sendMessage({ action: 'updateIcon', previewMode: previewMode });



    } else if (e.type === 'mouseup' && isDragging) {
        isMouseDown = false;
        e.preventDefault();
        e.stopImmediatePropagation();
        setTimeout(resetDraggingState, 0);
    } else if (e.type === 'mouseup') {

        handleMouseUpWithProgressBar(e);

        addSearchTooltipsOnHover(e);

    }
    chrome.runtime.sendMessage({ action: 'updateIcon', previewMode: previewMode });

}

async function handlePreviewMode(e) {
    if (!isMouseDown || hasPopupTriggered) return;


    const linkElement = e.target instanceof HTMLElement && (e.target.tagName === 'A' ? e.target : e.target.closest('a'));
    const linkUrl = linkElement ? linkElement.href : null;
    if (linkUrl && linkUrl.trim().startsWith('javascript:')) return;


    if (linkUrl) {
        e.preventDefault();
        e.stopPropagation();
        const data = await loadUserConfigs(['blurEnabled', 'blurPx', 'blurTime', 'previewModePopupInBackground']);
        const previewModePopupInBackground = data.previewModePopupInBackground || false;
        const blurTime = data.blurTime || 1;
        const blurEnabled = data.blurEnabled !== undefined ? data.blurEnabled : true;
        const blurPx = parseFloat(data.blurPx || 3);



        // Set finalLinkUrl based on linkUrl, imgSupport, and searchEngine
        let finalLinkUrl = linkUrl || (data.previewModeImgSupport ? imageUrl : null);

        if (!finalLinkUrl) return;

        if (linkIndicator) {
            linkIndicator.remove();
        }
        linkIndicator = null;

        if (searchTooltips) searchTooltips.remove();
        searchTooltips = null;
        if (blurEnabled && !previewModePopupInBackground) {
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
            trigger: 'click'
        }, () => {
            if (linkIndicator) linkIndicator.remove();
            linkIndicator = null;
            if (searchTooltips) searchTooltips.remove();
            searchTooltips = null;
            hasPopupTriggered = true;
            finalLinkUrl = null;
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
    if (linkUrl && linkUrl.trim().startsWith('javascript:')) return;

    const imageElement = e.target instanceof HTMLElement && (e.target.tagName === 'IMG' ? e.target : e.target.closest('img'));
    let imageUrl = imageElement ? imageElement.src : null;

    if (linkUrl || selectionText || imageUrl) {
        isDragging = true;
        const data = await loadUserConfigs(['imgSearchEnable', 'searchEngine', 'blurEnabled', 'blurPx', 'blurTime', 'dragPx', 'dragDirections', 'imgSupport', 'popupInBackground']);
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

        if (data.imgSearchEnable) {
            const imgSearchEngineMap = { "https://www.google.com/search?q=%s": "https://lens.google.com/uploadbyurl?url=%s", "https://www.bing.com/search?q=%s": "https://www.bing.com/images/search?q=imgurl:%s&view=detailv2&iss=sbi", "https://www.baidu.com/s?wd=%s": "https://graph.baidu.com/details?isfromtusoupc=1&tn=pc&carousel=0&promotion_name=pc_image_shituindex&extUiData%5bisLogoShow%5d=1&image=%s", "https://yandex.com/search/?text=%s": "https://yandex.com/images/search?rpt=imageview&url=%s" };
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

        const viewportTop = e.screenY - e.clientY;
        const viewportBottom = e.screenY - e.clientY + window.innerHeight;
        const viewportLeft = e.screenX - e.clientX;
        const viewportRight = e.screenX - e.clientX + window.innerWidth;
        const dragPx = data.dragPx || 0;
        const dragDirections = data.dragDirections || ['up', 'down', 'right', 'left'];

        if (!Array.isArray(dragDirections) || dragDirections.length === 0) {
            return;
        }


        document.addEventListener('dragend', function onDragend(e) {


            const currentMouseX = e.clientX;
            const currentMouseY = e.clientY;
            let direction = '';

            // do nothing when drag out of current page
            if (!(viewportLeft < e.screenX && e.screenX < viewportRight && viewportTop < e.screenY && e.screenY < viewportBottom)) {
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


                        if (linkIndicator) {
                            linkIndicator.remove();
                        }
                        linkIndicator = null;

                        if (searchTooltips) searchTooltips.remove();
                        searchTooltips = null;
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
                            imageUrl = null;
                            if (linkIndicator) linkIndicator.remove();
                            linkIndicator = null;
                            if (searchTooltips) searchTooltips.remove();
                            searchTooltips = null;

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

                    if (linkIndicator) {
                        linkIndicator.remove();
                    }
                    linkIndicator = null;
                    if (searchTooltips) searchTooltips.remove();
                    searchTooltips = null;

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
                        imageUrl = null;
                        if (linkIndicator) linkIndicator.remove();
                        linkIndicator = null;
                        if (searchTooltips) searchTooltips.remove();
                        searchTooltips = null;

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
            return url.includes(disabledUrl);
        }
    });
}





async function checkUrlAndToggleListeners() {
    chrome.runtime.sendMessage({ action: 'updateIcon', previewMode: previewMode });

    const data = await loadUserConfigs(['disabledUrls', 'searchEngine', 'hoverSearchEngine', 'previewModeDisabledUrls', 'previewModeEnable']);
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
    if (typeof data.hoverSearchEngine === 'undefined') {
        chrome.storage.local.set({ hoverSearchEngine: 'https://www.google.com/search?q=%s' });
    }

    if (!data.previewModeEnable) {
        previewMode = false;

    } else {
        previewMode = data.previewMode;
    }

    chrome.runtime.sendMessage({ action: 'updateIcon', previewMode: previewMode });

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
        changes.collectionTooltipsEnable
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

    if (linkIndicator) {
        linkIndicator.remove();
    }
    linkIndicator = null;
    if (searchTooltips) searchTooltips.remove();
    searchTooltips = null;

    if (document.body) {
        document.body.style.filter = '';
    }
    document.addEventListener('keydown', handleKeyDown);
    clearTimeoutsAndProgressBars();
    hoverElement = null;

    hoverInitialMouseX = null;
    hoverInitialMouseY = null;
    try {
        chrome.runtime.sendMessage({ action: 'updateIcon', previewMode: previewMode });
        const data = await loadUserConfigs(['closeWhenFocusedInitialWindow']);
        document.addEventListener('mouseover', handleMouseOver, true);
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
    barContainer.classList.add('link-indicator'); // Add a class to identify this element
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
        clearTimeoutsAndProgressBars();

        return;
    }
    addTooltipsOnHover(e);


    const data = await loadUserConfigs(['linkHint', 'hoverImgSearchEnable', 'blurEnabled', 'blurPx', 'blurTime', 'hoverTimeout', 'hoverImgSupport', 'hoverModifiedKey', 'hoverDisabledUrls']);
    const linkHint = data.linkHint || false;
    const hoverTimeout = data.hoverTimeout || 0;

    if (linkHint && parseInt(hoverTimeout, 10) === 0) {
        changeCursorOnHover(e);

    }
    // do nothing when is in blacklist
    const currentUrl = window.location.href;
    const hoverDisabledUrls = data.hoverDisabledUrls || [];
    if (isUrlDisabled(currentUrl, hoverDisabledUrls)) {
        return;
    }

    const hoverModifiedKey = data.hoverModifiedKey || 'None';
    const keyMap = { 'Ctrl': e.ctrlKey, 'Alt': e.altKey, 'Shift': e.shiftKey, 'Meta': e.metaKey };
    if (hoverModifiedKey === 'None' || keyMap[hoverModifiedKey]) {
        if (!hoverTimeout || parseInt(hoverTimeout, 10) === 0) {
            return;
        } else {
            const linkElement = e.target instanceof HTMLElement && (e.target.tagName === 'A' ? e.target : e.target.closest('a'));
            const linkUrl = linkElement ? linkElement.href : null;
            if (linkUrl && linkUrl.trim().startsWith('javascript:')) return;

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
            const configData = await loadUserConfigs(['hoverImgSearchEnable', 'hoverSearchEngine', 'blurEnabled', 'blurPx', 'blurTime', 'hoverImgSupport', 'urlCheck', 'hoverPopupInBackground']);
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
            if (finallinkUrl.trim().startsWith('javascript:')) return;

            if (linkIndicator) {
                linkIndicator.remove();
            }
            linkIndicator = null;
            if (searchTooltips) searchTooltips.remove();
            searchTooltips = null;

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
                imageUrl = null;
                document.removeEventListener('mousemove', updateProgressBarPosition, true);
                if (linkIndicator) linkIndicator.remove();
                linkIndicator = null;
                if (searchTooltips) searchTooltips.remove();
                searchTooltips = null;

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
            document.body.style.filter = `blur(${data.blurPx}px)`;
            document.body.style.transition = `filter ${data.blurTime}s ease`;
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
        });
    });
}

// Handle mouseout event
function handleMouseOut(e) {
    clearTimeoutsAndProgressBars(); // Clean up when the mouse leaves the element
    hoverElement = null;
}
