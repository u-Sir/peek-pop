const configs = {
    'closeWhenFocusedInitialWindow': true,
    'closedByEsc': false,
    'doubleTapKeyToSendPageBack': 'None',

    'tryOpenAtMousePosition': false,
    'popupHeight': 800,
    'popupWidth': 1000,
    'popupHeightInPercentage': 0,
    'popupWidthInPercentage': 0,

    'blurEnabled': true,
    'blurPx': 3,
    'blurTime': 1,

    'popupWindowsInfo': {},
    'windowType': 'popup',

    'rememberPopupSizeAndPosition': false,
    'rememberPopupSizeAndPositionForDomain': false,

    'contextItemCreated': false,

    'modifiedKey': 'None',
    'dragDirections': ['up', 'down', 'right', 'left'],
    'dragPx': 0,
    'imgSupport': false,
    'imgSearchEnable': false,
    'popupInBackground': false,
    'dropInEmptyOnly': false,
    'searchEngine': 'https://www.google.com/search?q=%s',
    'disabledUrls': [],

    'urlCheck': true,

    'hoverTimeout': 0,
    'hoverDisabledUrls': [],
    'hoverImgSupport': false,
    'hoverPopupInBackground': false,
    'hoverSearchEngine': 'https://www.google.com/search?q=%s',
    'hoverModifiedKey': 'None',
    'hoverWindowType': 'popup',
    'hoverImgSearchEnable': false,

    'clickModifiedKey': 'None',
    'previewModeDisabledUrls': [],
    'previewModePopupInBackground': false,
    'previewModeWindowType': 'popup',
    'previewModeEnable': false,
    'doubleClickToSwitch': false,
    'doubleClickAsClick': false,

    'holdToPreview': false,
    'holdToPreviewTimeout': 1500,

    'isFirefox': false,
    'isMac': false,

    'linkHint': false,
    'linkDisabledUrls': [],

    'collection': [],
    'collectionEnable': false,

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

let openPopups = [];
let activePopupCount = 0;

// Load user configurations from storage
async function loadUserConfigs() {
    return new Promise(resolve => {
        chrome.storage.local.get(Object.keys(configs), storedConfigs => {
            const mergedConfigs = { ...configs, ...storedConfigs };
            Object.assign(configs, mergedConfigs);
            resolve(mergedConfigs);
        });
    });
}

// Save a specific configuration
async function saveConfig(key, value) {
    configs[key] = value;
    return new Promise(resolve => {
        chrome.storage.local.set({ [key]: value }, () => {
            resolve();
        });
    });
}



// Initialize the extension
chrome.runtime.onInstalled.addListener(async () => {
    try {
        const storedConfigs = await chrome.storage.local.get(Object.keys(configs));
        const mergedConfigs = { ...configs, ...storedConfigs };
        Object.assign(configs, mergedConfigs);

        if (chrome.runtime.getBrowserInfo) {
            const browserInfo = await new Promise(resolve =>
                chrome.runtime.getBrowserInfo(resolve)
            );
            configs.isFirefox = browserInfo.name === "Firefox";
        }

        if (chrome.runtime.getPlatformInfo) {
            const platformInfo = await new Promise(resolve =>
                chrome.runtime.getPlatformInfo(resolve)
            );
            configs.isMac = platformInfo.os === "mac";
        }

        const keysToSave = Object.keys(configs).filter(k => storedConfigs[k] === undefined || k === 'isFirefox' || k === 'isMac');
        if (keysToSave.length > 0) {
            const defaultsToSave = {};
            for (const key of keysToSave) defaultsToSave[key] = configs[key];
            await chrome.storage.local.set(defaultsToSave);
        }

    } catch (err) {
        console.error("Error during installation setup:", err);
    }
});


// Handle incoming messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    new Promise((resolve, reject) => {
        chrome.windows.getCurrent(window => {
            if (chrome.runtime.lastError) {
                console.error('Error getting current window:', chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                resolve(window);
            }
        });
    })
        .then(currentWindow => {

            return loadUserConfigs().then(userConfigs => {


                let popupWindowsInfo = userConfigs.popupWindowsInfo || {};


                // Filter out the 'savedPositionAndSize' key
                const filteredPopupWindowsInfo = Object.keys(popupWindowsInfo).reduce((acc, key) => {
                    if (key !== 'savedPositionAndSize') {
                        acc[key] = popupWindowsInfo[key];
                    }
                    return acc;
                }, {});

                // Check if the filtered object is empty
                if (Object.keys(filteredPopupWindowsInfo).length === 0) {
                    popupWindowsInfo[currentWindow.id] = {}; // Set the current window ID as the original window ID
                    userConfigs.popupWindowsInfo = popupWindowsInfo; // Update in-memory userConfigs
                    return saveConfig('popupWindowsInfo', popupWindowsInfo).then(() => ({ popupWindowsInfo, userConfigs }));
                }


                // If originWindowId is already defined, just return popupWindowsInfo
                return { popupWindowsInfo, userConfigs };

            }).then(({ popupWindowsInfo, userConfigs }) => {


                chrome.contextMenus.onClicked.removeListener(onMenuItemClicked);
                chrome.contextMenus.onClicked.addListener(onMenuItemClicked);
                if (!request.linkUrl) {
                    if (request.checkContextMenuItem) {

                        const isCurrentWindowOriginal = Object.keys(popupWindowsInfo).some(windowId => {
                            return parseInt(windowId) === currentWindow.id;
                        });


                        if (!isCurrentWindowOriginal) {
                            if (!userConfigs.contextItemCreated) {
                                chrome.contextMenus.create({
                                    id: 'sendPageBack',
                                    title: chrome.i18n.getMessage('sendPageBack'),
                                    contexts: ['page']
                                }, () => {
                                    if (chrome.runtime.lastError) {
                                        userConfigs.contextItemCreated = true;
                                        chrome.storage.local.set({ contextItemCreated: true });
                                    } else {
                                        userConfigs.contextItemCreated = true;
                                        chrome.storage.local.set({ contextItemCreated: true });
                                    }
                                });
                            }

                            if (userConfigs.rememberPopupSizeAndPosition || userConfigs.rememberPopupSizeAndPositionForDomain) {

                                if (!popupWindowsInfo['savedPositionAndSize']) {
                                    popupWindowsInfo['savedPositionAndSize'] = {};
                                }


                                if (popupWindowsInfo.savedPositionAndSize) {
                                    popupWindowsInfo.savedPositionAndSize.left = currentWindow.left;
                                    popupWindowsInfo.savedPositionAndSize.top = currentWindow.top;
                                    popupWindowsInfo.savedPositionAndSize.width = currentWindow.width;
                                    popupWindowsInfo.savedPositionAndSize.height = currentWindow.height;

                                } else {
                                    popupWindowsInfo.savedPositionAndSize = {
                                        top: currentWindow.top,
                                        left: currentWindow.left,
                                        width: currentWindow.width,
                                        height: currentWindow.height
                                    };
                                }

                                for (const originWindowId in popupWindowsInfo) {
                                    if (originWindowId === 'savedPositionAndSize') {
                                        continue; // Skip the savedPositionAndSize key
                                    }

                                    if (popupWindowsInfo[originWindowId][currentWindow.id]) {
                                        const domain = (popupWindowsInfo[originWindowId][currentWindow.id].originDomain !== new URL(sender.tab.url).hostname)
                                            ? popupWindowsInfo[originWindowId][currentWindow.id].originDomain
                                            : new URL(sender.tab.url).hostname;

                                        if (!popupWindowsInfo[originWindowId]) {
                                            popupWindowsInfo[originWindowId] = {};
                                        }
                                        popupWindowsInfo[originWindowId][currentWindow.id] = {
                                            windowType: currentWindow.type,
                                            top: currentWindow.top,
                                            left: currentWindow.left,
                                            width: currentWindow.width,
                                            height: currentWindow.height,
                                            originDomain: domain
                                        };

                                        // Handle domain-specific saving
                                        if (userConfigs.rememberPopupSizeAndPositionForDomain && sender && sender.tab && sender.tab.url) {
                                            try {
                                                if (!popupWindowsInfo['savedPositionAndSize']) {
                                                    popupWindowsInfo['savedPositionAndSize'] = {};
                                                }
                                                // Ensure domain-specific object exists
                                                if (!popupWindowsInfo['savedPositionAndSize'][domain]) {
                                                    popupWindowsInfo['savedPositionAndSize'][domain] = {};
                                                }
                                                // Store the position and size under the domain
                                                // Update or add the domain-specific position and size
                                                popupWindowsInfo.savedPositionAndSize[domain] = {
                                                    top: currentWindow.top,
                                                    left: currentWindow.left,
                                                    width: currentWindow.width,
                                                    height: currentWindow.height
                                                };
                                            } catch (error) {
                                                console.error('Invalid URL for domain extraction:', error);
                                            }
                                        }


                                        chrome.storage.local.set({ popupWindowsInfo }, () => {

                                            addBoundsChangeListener(sender.tab.url, currentWindow.id, originWindowId);
                                            chrome.windows.onRemoved.addListener(windowRemovedListener);
                                        });
                                    }
                                }
                            }
                        } else {
                            // console.log('not popup window, do nothing')
                        }
                        sendResponse({ status: 'item checked' });
                    }

                    if (request.action === 'closeCurrentTab') {
                        // filter out empty objects under popupWindowsInfo
                        const popupWindowsInfo = Object.keys(userConfigs.popupWindowsInfo).reduce((acc, key) => {
                            if (Object.keys(userConfigs.popupWindowsInfo[key]).length > 0) {
                                acc[key] = userConfigs.popupWindowsInfo[key];
                            }
                            return acc;
                        }, {});
                        const isCurrentWindowOriginal = Object.keys(popupWindowsInfo).length === 0 || (Object.keys(popupWindowsInfo).length === 1 && 'savedPositionAndSize' in popupWindowsInfo) || Object.keys(popupWindowsInfo).some(windowId => {
                            // Check if windowId exists and popupWindowsInfo[windowId] is empty (no popups)
                            return windowId &&
                                parseInt(windowId) === currentWindow.id &&
                                Object.keys(popupWindowsInfo[windowId]).length === 0;
                        });
                        if (!isCurrentWindowOriginal) {
                            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                                if (tabs.length > 0) {
                                    const currentTab = tabs[0];
                                    chrome.tabs.remove(currentTab.id, () => {
                                        chrome.windows.getAll({ populate: false }, (windows) => {
                                            const existingWindowIds = windows.map(win => win.id); // List of all current window IDs

                                            function cleanPopupInfo(info) {
                                                return Object.keys(info).reduce((acc, key) => {
                                                    const keyAsInt = parseInt(key, 10);

                                                    // Check if key is a valid window ID and clean recursively
                                                    if (key === 'savedPositionAndSize' || existingWindowIds.includes(keyAsInt)) {
                                                        acc[key] = (key === 'savedPositionAndSize') ? info[key] : cleanPopupInfo(info[key]); // Recursive cleaning for nested popups
                                                    }

                                                    return acc;
                                                }, {});
                                            }

                                            const cleanedPopupWindowsInfo = cleanPopupInfo(userConfigs.popupWindowsInfo);

                                            // Set the cleaned popupWindowsInfo back to storage
                                            chrome.storage.local.set({ popupWindowsInfo: cleanedPopupWindowsInfo });
                                        });

                                    });
                                }
                            });
                            if (userConfigs.contextItemCreated) {
                                chrome.contextMenus.remove('sendPageBack', () => {
                                    if (chrome.runtime.lastError) {
                                        // console.error("Error removing context menu: ", chrome.runtime.lastError.message);
                                    } else {
                                        // console.log("Context menu 'sendPageBack' removed successfully.");
                                    }
                                });

                                userConfigs.contextItemCreated = false;
                                chrome.storage.local.set({ contextItemCreated: false });
                            }
                        }


                        sendResponse({ status: 'esc handled' });

                    }

                    if (request.action === 'windowRegainedFocus') {
                        const popupWindowsInfo = userConfigs.popupWindowsInfo || {};
                        const isCurrentWindowOriginal = popupWindowsInfo.hasOwnProperty(currentWindow.id);

                        if (isCurrentWindowOriginal) {
                            let popupsToRemove = new Set();

                            // Recursive function to find all nested sub-popups
                            const addNestedPopups = (popupId) => {
                                const subPopups = popupWindowsInfo[popupId];

                                if (subPopups) {
                                    Object.keys(subPopups).forEach(subPopupId => {
                                        // Add all popups without checking focus if checkFocus is false
                                        popupsToRemove.add(subPopupId);
                                        addNestedPopups(subPopupId); // Recurse into further nested sub-popups
                                    });
                                }
                            };

                            // Step 1: Add popups directly under the current window
                            Object.keys(popupWindowsInfo[currentWindow.id] || {}).forEach(popupId => {
                                // If no focus check needed, add all popups
                                popupsToRemove.add(popupId);
                                addNestedPopups(popupId);
                            });

                            chrome.windows.getAll({ populate: true }, windows => {
                                windows.forEach(window => {
                                    if (popupsToRemove.has(window.id.toString())) {
                                        chrome.windows.remove(window.id, () => {
                                            if (chrome.runtime.lastError) {
                                                // Error handling for window removal
                                            } else {
                                                // Window removed successfully
                                            }
                                        });
                                    }
                                });

                                // Remove context menu item if necessary
                                if (userConfigs.contextItemCreated) {
                                    chrome.contextMenus.remove('sendPageBack', () => {
                                        if (chrome.runtime.lastError) {
                                            // Error handling for context menu removal
                                        } else {
                                            // Context menu 'sendPageBack' removed successfully
                                        }
                                    });

                                    userConfigs.contextItemCreated = false;
                                    chrome.storage.local.set({ contextItemCreated: false });
                                }
                            });
                        }

                        sendResponse({ status: 'window focus handled' });
                    }

                    if (request.action === 'updateIcon') {
                        if (request.theme === 'dark') {
                            if (userConfigs.previewModeEnable) {
                                if (request.previewMode !== undefined && !request.previewMode) {

                                    chrome.action.setIcon({
                                        path: {
                                            "128": "action/non-inclickmode-dark.png"
                                        }
                                    });
                                } else {

                                    chrome.action.setIcon({
                                        path: {
                                            "128": "action/inclickmode-dark.png"
                                        }
                                    });
                                }
                            } else {

                                chrome.action.setIcon({
                                    path: {
                                        "128": "action/icon-dark.png"
                                    }
                                });

                            }
                        } else {
                            if (userConfigs.previewModeEnable) {
                                if (request.previewMode !== undefined && !request.previewMode) {

                                    chrome.action.setIcon({
                                        path: {
                                            "128": "action/non-inclickmode.png"
                                        }
                                    });
                                } else {

                                    chrome.action.setIcon({
                                        path: {
                                            "128": "action/inclickmode.png"
                                        }
                                    });
                                }
                            } else {

                                chrome.action.setIcon({
                                    path: {
                                        "128": "action/icon.png"
                                    }
                                });

                            }
                        }





                        sendResponse({ status: 'Icon update handled' });
                    }

                    if (request.action === 'updateBadge') {


                        // Filter links in the collection to exclude those with specific labels
                        const validLinks = userConfigs.collection
                            .flatMap(item => item.links || []) // Flatten links from all items
                            .filter(link => link.label !== '+' && link.label !== '↗️'); // Exclude specific labels

                        // Update the toolbar badge with the count of valid links
                        const linkCount = validLinks.length;
                        const action = chrome.action || chrome.browserAction;
                        if (linkCount !== 0) {
                            action.setBadgeText({ text: linkCount.toString() });
                            action.setBadgeBackgroundColor({ color: '#666666' });
                        } else {
                            action.setBadgeText({ text: '' });
                        }
                        sendResponse({ status: 'Badge updated' });

                    }


                    if (request.action === 'getWindowType') {
                        chrome.windows.getCurrent({ populate: true }, (window) => {
                            sendResponse({ status: 'Window type sent', windowType: window.type });
                        });
                    }


                    if (request.action === 'sendPageBack') {
                        const { popupWindowsInfo } = userConfigs;

                        if (popupWindowsInfo && Object.keys(popupWindowsInfo).length > 0) {
                            // Iterate through popupWindowsInfo to find the original window ID
                            let originalWindowId = null;
                            for (const originWindowId in popupWindowsInfo) {
                                if (popupWindowsInfo[originWindowId][sender.tab.windowId]) {
                                    originalWindowId = originWindowId;
                                    break;
                                }
                            }

                            if (originalWindowId) {
                                const createData = { windowId: parseInt(originalWindowId), url: sender.tab.url };
                                chrome.tabs.create(createData, () => {
                                    chrome.windows.get(sender.tab.windowId, window => {
                                        if (window.id) {
                                            chrome.windows.remove(sender.tab.windowId, () => {
                                                if (chrome.runtime.lastError) {
                                                    // console.error("Error removing window: ", chrome.runtime.lastError.message);
                                                } else {
                                                    // console.log("Window removed successfully.");
                                                }
                                            });
                                        }
                                    });

                                    if (userConfigs.contextItemCreated) {
                                        chrome.contextMenus.remove('sendPageBack', () => {
                                            if (chrome.runtime.lastError) {
                                                // console.error("Error removing context menu: ", chrome.runtime.lastError.message);
                                            } else {
                                                // console.log("Context menu 'sendPageBack' removed successfully.");
                                            }
                                        });

                                        userConfigs.contextItemCreated = false;
                                        chrome.storage.local.set({ contextItemCreated: false });
                                        chrome.contextMenus.onClicked.removeListener(onMenuItemClicked);
                                    }

                                });
                            } else {
                                //console.error('No original window ID found for current window ID in popupWindowsInfo.');
                            }
                        } else {
                            console.error('popupWindowsInfo is empty or not properly structured.');
                        }

                        sendResponse({ status: 'send Page Back handled' });

                    }

                    if (request.action === 'addblur') {
                        //console.log('forward')
                        activePopupCount++;
                        openPopups.forEach(tabId => {
                            // 跳过最后一个 popup
                            if (tabId === openPopups[openPopups.length - 1]) return;

                            chrome.tabs.sendMessage(tabId, { action: 'ADD_BLUR' });
                        });


                        sendResponse({ status: 'blur handled' });
                    }
                    if (request.action === 'removeblur') {
                        //console.log('forward')
                        activePopupCount--;
                        if (activePopupCount <= 0) {
                            openPopups.forEach(tabId => {
                                // 跳过最后一个 popup
                                if (tabId === openPopups[openPopups.length - 1]) return;


                                chrome.tabs.sendMessage(tabId, { action: 'REMOVE_BLUR' });
                            });

                        }
                        //chrome.tabs.sendMessage(request.originalTabId, { action: "REMOVE_BLUR" });
                        sendResponse({ status: 'blur handled' });
                    }
                }

                const updates = {
                    lastClientX: request.lastClientX,
                    lastClientY: request.lastClientY,
                    lastScreenTop: request.top,
                    lastScreenLeft: request.left,
                    lastScreenWidth: request.width,
                    lastScreenHeight: request.height
                };


                return Promise.all(
                    Object.entries(updates).map(([key, value]) =>
                        saveConfig(key, value).then(() => userConfigs[key] = value)
                    )
                ).then(() => {
                    const { disabledUrls, rememberPopupSizeAndPosition, windowType, hoverWindowType, previewModeWindowType, lastClientX, lastClientY, lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight } = userConfigs;
                    let typeToSend;
                    let urls;

                    if (request.trigger === 'drag') {
                        typeToSend = windowType || 'popup';
                    } else if (request.trigger === 'hover') {
                        typeToSend = hoverWindowType || 'popup';
                    } else if (request.trigger === 'click') {
                        typeToSend = previewModeWindowType || 'popup';
                    } else if (request.action === 'group' && request.links && request.links.length > 0) {
                        // Extract URLs from the message
                        urls = request.links.map(link => link.url);
                        typeToSend = 'normal';

                    } else {
                        // console.log(request.action)
                    }
                    const currentUrl = typeof sender.tab !== 'undefined' ? sender.tab.url : 'https://www.example.com';
                    if (isUrlDisabled(currentUrl, disabledUrls)) {
                        sendResponse({ status: 'url disabled' });
                    } else if (request.linkUrl) {
                        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                            if (chrome.runtime.lastError) {
                                //
                            }
                            if (tabs.length > 0) {
                                let currentTab = tabs[0];
                                if (sender.tab) currentTab = sender.tab;
                                handleLinkInPopup(userConfigs, request.trigger, request.linkUrl, currentTab, currentWindow, rememberPopupSizeAndPosition, typeToSend, lastClientX, lastClientY,
                                    lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight).then(() => {
                                        // sendResponse({ status: 'link handled' });
                                    });
                                sendResponse({ status: 'link handled' });

                            } else {
                                //
                            }
                        });
                    } else if (request.action === 'group') {
                        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                            if (chrome.runtime.lastError) {
                                //
                            }
                            if (tabs.length > 0) {
                                let currentTab = tabs[0];
                                if (sender.tab) currentTab = sender.tab;

                                handleLinkInPopup(userConfigs, request.trigger, urls, currentTab, currentWindow, rememberPopupSizeAndPosition, typeToSend, lastClientX, lastClientY,
                                    lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight).then(() => {
                                        // sendResponse({ status: 'group handled' });
                                    });

                                sendResponse({ status: 'message processed' });
                            } else {
                                //
                            }
                        });
                    } else {
                        sendResponse({ status: 'message processed' });
                    }

                });
            });
        })
        .catch(error => {
            console.error('Error in background script:', error);
            sendResponse({ status: 'error', message: error.message });
        });

    return true; // Keeps the message channel open for async response
});

// Handle link opening in a popup
function handleLinkInPopup(userConfigs, trigger, linkUrl, tab, currentWindow, rememberPopupSizeAndPosition, windowType, lastClientX, lastClientY, lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight) {
    if (!isValidUrl(linkUrl)) {
        console.error('Invalid URL:', linkUrl);
        return Promise.reject(new Error('Invalid URL'));
    }

    const {
        popupHeight,
        popupWidth,
        popupHeightInPercentage,
        popupWidthInPercentage,
        tryOpenAtMousePosition
    } = userConfigs;

    // Parse user-specified values
    let defaultHeight = parseInt(popupHeight, 10) || 800;
    let defaultWidth = parseInt(popupWidth, 10) || 1000;

    // Helper to clamp percentage between >0 and <=100
    function clampPercentage(p) {
        const num = parseFloat(p);
        if (isNaN(num) || num <= 0) return 0;      // invalid or non-positive → ignore
        return Math.min(num, 100);                 // max 100
    }

    // Apply percentages if valid
    const heightPercent = clampPercentage(popupHeightInPercentage);
    if (heightPercent > 0) {
        defaultHeight = Math.round(currentWindow.height * (heightPercent / 100));
    }

    const widthPercent = clampPercentage(popupWidthInPercentage);
    if (widthPercent > 0) {
        defaultWidth = Math.round(currentWindow.width * (widthPercent / 100));
    }

    let dx, dy, width = defaultWidth, height = defaultHeight;




    return new Promise((resolve, reject) => {
        if (rememberPopupSizeAndPosition) {
            const popupWindowsInfo = userConfigs.popupWindowsInfo;
            const savedPositionAndSize = popupWindowsInfo.savedPositionAndSize || {};
            if (Object.keys(savedPositionAndSize).length > 0) {
                ({ left: dx, top: dy, width, height } = savedPositionAndSize);

                createPopupWindow(userConfigs, trigger, linkUrl, tab, windowType, dx, dy, width, height, currentWindow.id, popupWindowsInfo, rememberPopupSizeAndPosition, resolve, reject);
            } else {
                defaultPopupCreation(userConfigs, trigger, linkUrl, tab, currentWindow, defaultWidth, defaultHeight, tryOpenAtMousePosition, lastClientX, lastClientY, lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight, windowType, popupWindowsInfo, rememberPopupSizeAndPosition, resolve, reject);
            }
        } else {
            const popupWindowsInfo = userConfigs.popupWindowsInfo || {};
            defaultPopupCreation(userConfigs, trigger, linkUrl, tab, currentWindow, defaultWidth, defaultHeight, tryOpenAtMousePosition, lastClientX, lastClientY, lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight, windowType, popupWindowsInfo, rememberPopupSizeAndPosition, resolve, reject);
        }
    });
}

// Function to create a popup window
function createPopupWindow(userConfigs, trigger, linkUrl, tab, windowType, left, top, width, height, originWindowId, popupWindowsInfo, rememberPopupSizeAndPosition, resolve, reject) {
    let popupInBackground = false;
    if (trigger === 'drag') {
        popupInBackground = userConfigs.popupInBackground !== undefined
            ? userConfigs.popupInBackground
            : false;
    } else if (trigger === 'hover' || trigger === 'tooltips') {

        popupInBackground = userConfigs.hoverPopupInBackground !== undefined
            ? userConfigs.hoverPopupInBackground
            : false;
    } else if (trigger === 'click') {

        popupInBackground = userConfigs.previewModePopupInBackground !== undefined
            ? userConfigs.previewModePopupInBackground
            : false;
    }
    let savedPositionAndSize;
    const domain = new URL(linkUrl).hostname;
    // Safely access the saved position and size if `rememberPopupSizeAndPositionForDomain` is enabled
    if (userConfigs.rememberPopupSizeAndPositionForDomain && popupWindowsInfo.savedPositionAndSize) {
        if (popupWindowsInfo.savedPositionAndSize[domain]) {
            savedPositionAndSize = {
                top: popupWindowsInfo.savedPositionAndSize[domain].top,
                left: popupWindowsInfo.savedPositionAndSize[domain].left,
                width: popupWindowsInfo.savedPositionAndSize[domain].width,
                height: popupWindowsInfo.savedPositionAndSize[domain].height,

            };
        }
    } else {
        savedPositionAndSize = false;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.windows.create({
            url: linkUrl,
            type: windowType,
            top: parseInt(savedPositionAndSize ? savedPositionAndSize.top : top),
            left: parseInt(savedPositionAndSize ? savedPositionAndSize.left : left),
            width: parseInt(savedPositionAndSize ? savedPositionAndSize.width : width),
            height: parseInt(savedPositionAndSize ? savedPositionAndSize.height : height),
            focused: !popupInBackground,
            incognito: tab && tab.incognito !== undefined ? tab.incognito : false
        }, (newWindow) => {
            if (chrome.runtime.lastError) {
                console.error('Error creating popup window:', chrome.runtime.lastError.message, chrome.runtime.lastError);
                reject(chrome.runtime.lastError);
            } else {
                if (userConfigs.isMac) {
                    if (!openPopups.includes(tabs[0].id)) openPopups.push(tabs[0].id);
                    if (!openPopups.includes(newWindow.tabs[0].id)) openPopups.push(newWindow.tabs[0].id);
                    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                        if (tabId === newWindow.tabs[0].id && info.status === "complete") {
                            chrome.tabs.sendMessage(newWindow.tabs[0].id, {
                                action: "INIT_POPUP_LISTENER",
                                originalTabId: tabs[0].id
                            });
                            chrome.tabs.onUpdated.removeListener(listener);
                        }
                    });
                }
                updatePopupInfoAndListeners(linkUrl, newWindow, originWindowId, popupWindowsInfo, rememberPopupSizeAndPosition, userConfigs.rememberPopupSizeAndPositionForDomain, resolve, reject);
            }
        });
    });



}

// Function to handle default popup creation
function defaultPopupCreation(userConfigs, trigger, linkUrl, tab, currentWindow, defaultWidth, defaultHeight, tryOpenAtMousePosition, lastClientX, lastClientY, lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight, windowType, popupWindowsInfo, rememberPopupSizeAndPosition, resolve, reject) {
    let dx, dy;

    if (tryOpenAtMousePosition) {
        dx = parseInt(lastClientX);
        dy = parseInt(lastClientY);
    } else {
        const screenWidth = lastScreenWidth;
        const screenHeight = lastScreenHeight;

        const centerX = (screenWidth - defaultWidth) / 2;
        const centerY = (screenHeight - defaultHeight) / 2;

        dx = parseInt(lastScreenLeft) + centerX;
        dy = parseInt(lastScreenTop) + centerY;
    }

    // Clamping dx and dy to ensure they are within the screen bounds
    dx = Math.max(lastScreenLeft, Math.min(dx, lastScreenLeft + lastScreenWidth - defaultWidth));
    dy = Math.max(lastScreenTop, Math.min(dy, lastScreenTop + lastScreenHeight - defaultHeight));


    createPopupWindow(userConfigs, trigger, linkUrl, tab, windowType, dx, dy, defaultWidth, defaultHeight, currentWindow.id, popupWindowsInfo, rememberPopupSizeAndPosition, resolve, reject);
}

// Function to update popup info and add listeners
function updatePopupInfoAndListeners(linkUrl, newWindow, originWindowId, popupWindowsInfo, rememberPopupSizeAndPosition, rememberPopupSizeAndPositionForDomain, resolve, reject) {
    if (!popupWindowsInfo[originWindowId]) {
        popupWindowsInfo[originWindowId] = {};
    }
    const domain = new URL(linkUrl).hostname;
    popupWindowsInfo[originWindowId][newWindow.id] = {
        windowType: newWindow.type,
        top: newWindow.top,
        left: newWindow.left,
        width: newWindow.width,
        height: newWindow.height,
        focused: newWindow.focused,
        originDomain: domain
    };

    if (rememberPopupSizeAndPosition) {
        if (popupWindowsInfo.savedPositionAndSize) {
            popupWindowsInfo.savedPositionAndSize.left = newWindow.left;
            popupWindowsInfo.savedPositionAndSize.top = newWindow.top;
            popupWindowsInfo.savedPositionAndSize.width = newWindow.width;
            popupWindowsInfo.savedPositionAndSize.height = newWindow.height;
        }

    }


    // Handle domain-specific saving
    if (rememberPopupSizeAndPositionForDomain) {
        try {
            if (!popupWindowsInfo.savedPositionAndSize) {
                popupWindowsInfo.savedPositionAndSize = {};
            }
            // Ensure domain-specific object exists
            if (!popupWindowsInfo.savedPositionAndSize[domain]) {
                popupWindowsInfo.savedPositionAndSize[domain] = {};
            }
            // Store the position and size under the domain
            // Update or add the domain-specific position and size
            popupWindowsInfo.savedPositionAndSize[domain] = {
                top: newWindow.top,
                left: newWindow.left,
                width: newWindow.width,
                height: newWindow.height
            };
        } catch (error) {
            console.error('Invalid URL for domain extraction:', error);
        }
    }

    chrome.storage.local.set({ popupWindowsInfo }, () => {
        addBoundsChangeListener(linkUrl, newWindow.id, originWindowId);
        chrome.windows.onRemoved.addListener(windowRemovedListener);
        resolve();
    });
}

// Function to handle URL validation
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    } catch (_) {
        return false;
    }
}

// Function to handle disabled URL checking
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

function addBoundsChangeListener(linkUrl, windowId, originWindowId) {
    return new Promise((resolve, reject) => {
        const onBoundsChanged = (window) => {
            if (window.id === windowId) {
                const bounds = {
                    top: window.top,
                    left: window.left,
                    width: window.width,
                    height: window.height
                };

                chrome.storage.local.get(['popupWindowsInfo', 'rememberPopupSizeAndPositionForDomain'], result => {
                    const popupWindowsInfo = result.popupWindowsInfo || {};
                    const domain = new URL(linkUrl).hostname;

                    popupWindowsInfo[originWindowId][windowId] = {
                        windowType: window.type,
                        top: bounds.top,
                        left: bounds.left,
                        width: bounds.width,
                        height: bounds.height,
                        originDomain: domain
                    };

                    if (popupWindowsInfo.savedPositionAndSize) {
                        popupWindowsInfo.savedPositionAndSize.left = bounds.left;
                        popupWindowsInfo.savedPositionAndSize.top = bounds.top;
                        popupWindowsInfo.savedPositionAndSize.width = bounds.width;
                        popupWindowsInfo.savedPositionAndSize.height = bounds.height;

                    } else {
                        popupWindowsInfo.savedPositionAndSize = {
                            top: bounds.top,
                            left: bounds.left,
                            width: bounds.width,
                            height: bounds.height
                        };
                    }


                    // Handle domain-specific saving
                    if (result.rememberPopupSizeAndPositionForDomain) {
                        try {
                            const domain = new URL(linkUrl).hostname;
                            if (!popupWindowsInfo.savedPositionAndSize) {
                                popupWindowsInfo.savedPositionAndSize = {};
                            }
                            // Ensure domain-specific object exists
                            if (!popupWindowsInfo.savedPositionAndSize[domain]) {
                                popupWindowsInfo.savedPositionAndSize[domain] = {};
                            }
                            // Store the position and size under the domain
                            // Update or add the domain-specific position and size
                            popupWindowsInfo.savedPositionAndSize[domain] = {
                                top: bounds.top,
                                left: bounds.left,
                                width: bounds.width,
                                height: bounds.height
                            };
                        } catch (error) {
                            console.error('Invalid URL for domain extraction:', error);
                        }
                    }

                    chrome.storage.local.set({ popupWindowsInfo }, () => {
                        if (chrome.runtime.lastError) {
                            console.error('Error saving popupWindowsInfo:', chrome.runtime.lastError);
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve();
                        }
                    });
                });
            }
        };

        chrome.windows.onBoundsChanged.addListener(onBoundsChanged);
        resolve(() => chrome.windows.onBoundsChanged.removeListener(onBoundsChanged));
    });
}

// Handle context menu item click
function onMenuItemClicked(info, tab) {
    if (info.menuItemId === 'sendPageBack') {
        loadUserConfigs().then(userConfigs => {
            const { popupWindowsInfo } = userConfigs;

            if (popupWindowsInfo && Object.keys(popupWindowsInfo).length > 0) {
                // Iterate through popupWindowsInfo to find the original window ID
                let originalWindowId = null;
                for (const originWindowId in popupWindowsInfo) {
                    if (popupWindowsInfo[originWindowId][tab.windowId]) {
                        originalWindowId = originWindowId;
                        break;
                    }
                }

                if (originalWindowId) {
                    const createData = { windowId: parseInt(originalWindowId), url: tab.url };
                    chrome.tabs.create(createData, () => {
                        chrome.windows.get(tab.windowId, window => {
                            if (window.id) {
                                chrome.windows.remove(tab.windowId, () => {
                                    if (chrome.runtime.lastError) {
                                        // console.error("Error removing window: ", chrome.runtime.lastError.message);
                                    } else {
                                        // console.log("Window removed successfully.");
                                    }
                                });

                            }
                        });

                        if (userConfigs.contextItemCreated) {
                            chrome.contextMenus.remove('sendPageBack', () => {
                                if (chrome.runtime.lastError) {
                                    // console.error("Error removing context menu: ", chrome.runtime.lastError.message);
                                } else {
                                    // console.log("Context menu 'sendPageBack' removed successfully.");
                                }
                            });

                            userConfigs.contextItemCreated = false;
                            chrome.storage.local.set({ contextItemCreated: false });
                            chrome.contextMenus.onClicked.removeListener(onMenuItemClicked);
                        }

                    });
                } else {
                    //console.error('No original window ID found for current window ID in popupWindowsInfo.');
                }
            } else {
                console.error('popupWindowsInfo is empty or not properly structured.');
            }
        });
    }
}


// Listener for popup window removal
function windowRemovedListener(windowId) {
    chrome.storage.local.get('popupWindowsInfo', (result) => {
        const popupWindowsInfo = result.popupWindowsInfo || {};

        for (const originWindowId in popupWindowsInfo) {
            if (popupWindowsInfo[originWindowId][windowId]) {
                delete popupWindowsInfo[originWindowId][windowId];

                if (Object.keys(popupWindowsInfo[originWindowId]).length === 0) {
                    delete popupWindowsInfo[originWindowId];
                }

                chrome.storage.local.set({ popupWindowsInfo });
                break;
            }
        }
    });
}


chrome.commands.onCommand.addListener((command) => {
    if (command === "clickModeToggle") {
        chrome.storage.local.get('previewModeEnable', (data) => {
            const currentValue = data.previewModeEnable;
            const newValue = !currentValue;

            chrome.storage.local.set({ previewModeEnable: newValue }, () => {

                if (request.theme === 'dark') {

                    if (newValue) {

                        chrome.action.setIcon({
                            path: {
                                "128": "action/inclickmode-dark.png"
                            }
                        });

                    } else {
                        chrome.action.setIcon({
                            path: {
                                "128": "action/icon-dark.png"
                            }
                        });
                    }
                } else {

                    if (newValue) {

                        chrome.action.setIcon({
                            path: {
                                "128": "action/inclickmode.png"
                            }
                        });

                    } else {
                        chrome.action.setIcon({
                            path: {
                                "128": "action/icon.png"
                            }
                        });
                    }
                }

            });
        });
    }
});

