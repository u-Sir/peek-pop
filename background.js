const configs = {
    'closeWhenFocusedInitialWindow': true,
    'closeWhenScrollingInitialWindow': false,
    'sendBackByMiddleClickEnable': false,
    'closedByEsc': false,
    'doubleTapKeyToSendPageBack': 'None',

    'countdownStyle': 'bar',

    'windowType': 'popup',
    'popupWindowsInfo': {},

    'rememberPopupSizeAndPosition': false,
    'rememberPopupSizeAndPositionForDomain': false,

    'tryOpenAtMousePosition': false,
    'popupHeight': 800,
    'popupWidth': 1000,
    'popupHeightInPercentage': 0,
    'popupWidthInPercentage': 0,

    'searchEngine': 'https://www.google.com/search?q=%s',
    'disabledUrls': [],

    'blurEnabled': true,
    'blurPx': 3,
    'blurTime': 1,
    'blurRemoval': true,

    'modifiedKey': 'None',
    'dragDirections': [],
    'dragPx': 0,
    'imgSupport': false,
    'imgSearchEnable': false,
    'dropInEmptyOnly': false,
    'dragStartEnable': false,

    'urlCheck': true,

    'hoverTimeout': 0,
    'hoverDisabledUrls': [],
    'hoverImgSupport': false,
    'hoverSearchEngine': 'https://www.google.com/search?q=%s',
    'hoverModifiedKey': 'None',
    'hoverWindowType': 'popup',
    'hoverImgSearchEnable': false,

    'hoverSpaceEnabled': false,

    'showPreviewIconOnHoverEnabled': false,
    'dotSize': 16,
    'dotRemoveDelay': 500,
    'dotHoverDelay': 300,

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

    'showContextMenuItem': false,

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

let openPopups = [];
let activePopupCount = 0;
let lastContextX, lastContextY;

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
chrome.runtime.onInstalled.addListener(async (details) => {
    try {
        const storedConfigs = await browser.storage.local.get(Object.keys(configs));
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

            if (keysToSave.includes('dbclickToPreview') && details.reason === 'update') {
                defaultsToSave['dbclickToPreview'] = false;
            }

            await browser.storage.local.set(defaultsToSave);
        }

        if (details.reason === 'install') {
            chrome.tabs.create({ url: chrome.runtime.getURL('options/options.html') });
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
                    return saveConfig('popupWindowsInfo', popupWindowsInfo).then(() => popupWindowsInfo);
                }


                // If originWindowId is already defined, just return popupWindowsInfo
                return popupWindowsInfo;

            }).then(popupWindowsInfo => {


                chrome.contextMenus.onClicked.removeListener(onMenuItemClicked);
                chrome.contextMenus.onClicked.addListener(onMenuItemClicked);

                loadUserConfigs().then(userConfigs => {
                    if (userConfigs.showContextMenuItem) {
                        lastContextX = request.lastClientX;
                        lastContextY = request.lastClientY;
                        chrome.contextMenus.remove('showContextMenuItem', () => {
                            if (chrome.runtime.lastError) {
                                // console.error("Error removing context menu: ", chrome.runtime.lastError.message);
                            }
                        });
                        chrome.contextMenus.create({
                            id: 'showContextMenuItem',
                            title: chrome.i18n.getMessage('previewItem'),
                            contexts: ['link']
                        });
                    }
                    if (userConfigs.showContextMenuItem === false) {
                        chrome.contextMenus.remove('showContextMenuItem', () => {
                            if (chrome.runtime.lastError) {
                                // console.error("Error removing context menu: ", chrome.runtime.lastError.message);
                            }
                        });
                    }
                });

                if (typeof request.addContextMenuItem !== "undefined") {

                    if (!request.addContextMenuItem) {
                        chrome.contextMenus.remove('sendPageBack', () => {
                            console.log('Removing context menu item if exists.');
                            if (chrome.runtime.lastError) {
                                // console.error("Error removing context menu: ", chrome.runtime.lastError.message);
                            } else {
                                // console.log("Context menu 'sendPageBack' removed successfully.");
                            }
                        });
                    }
                    if (request.addContextMenuItem) {
                        chrome.storage.local.get('popupWindowsInfo', (result) => {
                            const popupWindowsInfo = result.popupWindowsInfo || {};

                            loadUserConfigs().then(userConfigs => {
                                console.log('Creating context menu item for sending page back.');
                                chrome.contextMenus.create({
                                    id: 'sendPageBack',
                                    title: chrome.i18n.getMessage('sendPageBack'),
                                    contexts: ['page']
                                });

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

                                                // addBoundsChangeListener(sender.tab.url, currentWindow.id, originWindowId);
                                                chrome.windows.onRemoved.addListener(windowRemovedListener);
                                            });
                                        }
                                    }
                                }



                            });
                        });

                        sendResponse({ status: 'item added' });
                    }
                }

                if (request.action === 'closeCurrentTab') {
                    chrome.storage.local.get(['popupWindowsInfo'], (result) => {
                        // filter out empty objects under popupWindowsInfo
                        const popupWindowsInfo = Object.keys(result.popupWindowsInfo).reduce((acc, key) => {
                            if (Object.keys(result.popupWindowsInfo[key]).length > 0) {
                                acc[key] = result.popupWindowsInfo[key];
                            }
                            return acc;
                        }, {});

                        const isCurrentWindowOriginal = Object.keys(popupWindowsInfo).length === 0 // no records
                            || (Object.keys(popupWindowsInfo).length === 1 && 'savedPositionAndSize' in popupWindowsInfo) // savedPositionAndSize only
                            || (() => { // not under any other IDs
                                const existsUnderOtherIds = (info, targetId, excludeTopLevel = true) =>
                                    Object.entries(info).some(([key, value]) => {
                                        if (key === 'savedPositionAndSize') return false;
                                        if (excludeTopLevel && parseInt(key, 10) === targetId) return false;
                                        if (parseInt(key, 10) === targetId) return true;
                                        return value && typeof value === 'object' && existsUnderOtherIds(value, targetId, false);
                                    });

                                // Check if currentWindow.id exists under any other IDs
                                if (existsUnderOtherIds(popupWindowsInfo, currentWindow.id)) return false;

                                return true;
                            })()
                            || Object.keys(popupWindowsInfo).some(windowId => { // under currentWindow.id but empty
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

                                            const cleanedPopupWindowsInfo = cleanPopupInfo(result.popupWindowsInfo);

                                            // Set the cleaned popupWindowsInfo back to storage
                                            chrome.storage.local.set({ popupWindowsInfo: cleanedPopupWindowsInfo });
                                        });




                                    });
                                }
                            });
                        }

                    });
                    sendResponse({ status: 'esc handled' });

                }

                if (request.action === 'windowRegainedFocus') {
                    chrome.storage.local.get(['popupWindowsInfo'], (result) => {
                        const popupWindowsInfo = result.popupWindowsInfo || {};
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
                            });
                        }
                    });
                    sendResponse({ status: 'window focus handled' });
                }

                if (request.action === 'updateIcon') {
                    chrome.storage.local.get(['previewModeEnable'], userConfigs => {
                        chrome.windows.getCurrent({ populate: true }, (window) => {
                            if (request.theme === 'dark') {
                                if (userConfigs.previewModeEnable) {
                                    if (request.previewMode !== undefined && !request.previewMode) {

                                        chrome.browserAction.setIcon({
                                            path: {
                                                "128": "action/non-inclickmode-dark.svg"
                                            }
                                        });
                                    } else {

                                        chrome.browserAction.setIcon({
                                            path: {
                                                "128": "action/inclickmode-dark.svg"
                                            }
                                        });
                                    }
                                } else {

                                    chrome.browserAction.setIcon({
                                        path: {
                                            "128": "action/icon-dark.svg"
                                        }
                                    });

                                }
                            } else {
                                if (userConfigs.previewModeEnable) {
                                    if (request.previewMode !== undefined && !request.previewMode) {

                                        chrome.browserAction.setIcon({
                                            path: {
                                                "128": "action/non-inclickmode.svg"
                                            }
                                        });
                                    } else {

                                        chrome.browserAction.setIcon({
                                            path: {
                                                "128": "action/inclickmode.svg"
                                            }
                                        });
                                    }
                                } else {

                                    chrome.browserAction.setIcon({
                                        path: {
                                            "128": "action/icon.svg"
                                        }
                                    });

                                }
                            }
                        });

                    });


                    sendResponse({ status: 'Icon update handled' });
                }

                if (request.action === 'updateBadge') {

                    chrome.storage.local.get(['collection'], userConfigs => {

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
                    })
                }

                if (request.action === 'getWindowType') {
                    chrome.windows.getCurrent({ populate: true }, (window) => {
                        sendResponse({ status: 'Window type sent', windowType: window.type });

                    });
                }




                if (request.action === 'sendPageBack') {
                    loadUserConfigs().then(userConfigs => {
                        const { popupWindowsInfo, enableContainerIdentify } = userConfigs;

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
                                if (enableContainerIdentify && sender.tab.cookieStoreId && sender.tab.cookieStoreId !== 'firefox-default') {
                                    createData.cookieStoreId = sender.tab.cookieStoreId;
                                }
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

                                });
                            } else {
                                //console.error('No original window ID found for current window ID in popupWindowsInfo.');
                            }
                        } else {
                            console.error('popupWindowsInfo is empty or not properly structured.');
                        }
                    });
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

                const getZoomFactor = () => {
                    return new Promise((resolve, reject) => {
                        // Check if sender.tab.id is defined
                        const tabId = sender.tab ? sender.tab.id : null;

                        if (tabId) {
                            // If sender.tab.id is defined, use it to get the zoom factor
                            chrome.tabs.getZoom(tabId, (zoom) => {
                                if (chrome.runtime.lastError) {
                                    reject(chrome.runtime.lastError);
                                } else {
                                    resolve(zoom);
                                }
                            });
                        } else {
                            // If sender.tab.id is undefined, query the active tab
                            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                                if (chrome.runtime.lastError) {
                                    return reject(chrome.runtime.lastError);
                                }
                                if (tabs.length > 0) {
                                    const currentTab = tabs[0];
                                    chrome.tabs.getZoom(currentTab.id, (zoom) => {
                                        if (chrome.runtime.lastError) {
                                            reject(chrome.runtime.lastError);
                                        } else {
                                            resolve(zoom);
                                        }
                                    });
                                } else {
                                    reject('No active tabs found.');
                                }
                            });
                        }
                    });
                };

                if (request.action === 'getZoomFactor') {
                    getZoomFactor()
                        .then((zoom) => {
                            sendResponse({ zoom });
                        })
                        .catch((error) => {
                            sendResponse({ error: error.message || 'Error occurred while retrieving zoom factor.' });
                        });

                    // Indicate asynchronous response
                    return true;
                }

                return getZoomFactor().then(zoom => {
                    const saveConfigPromises = [];

                    // Check and save only if the properties exist
                    if (request.lastClientX !== undefined && request.lastClientY !== undefined) {
                        saveConfigPromises.push(
                            saveConfig('lastClientX', request.lastClientX * zoom),
                            saveConfig('lastClientY', request.lastClientY * zoom)
                        );
                    }
                    if (request.top !== undefined) {
                        saveConfigPromises.push(saveConfig('lastScreenTop', request.top * zoom));
                    }
                    if (request.left !== undefined) {
                        saveConfigPromises.push(saveConfig('lastScreenLeft', request.left * zoom));
                    }
                    if (request.width !== undefined) {
                        saveConfigPromises.push(saveConfig('lastScreenWidth', request.width * zoom));
                    }
                    if (request.height !== undefined) {
                        saveConfigPromises.push(saveConfig('lastScreenHeight', request.height * zoom));
                    }

                    return Promise.all(saveConfigPromises);
                }).then(() => {
                    return loadUserConfigs().then(userConfigs => {
                        const { disabledUrls, rememberPopupSizeAndPosition, windowType, hoverWindowType, previewModeWindowType, searchWindowType, lastClientX, lastClientY, lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight } = userConfigs;
                        let typeToSend;
                        let urls;

                        if (request.trigger === 'drag') {
                            typeToSend = windowType || 'popup';
                        } else if (request.trigger === 'hover') {
                            typeToSend = hoverWindowType || 'popup';
                        } else if (request.trigger === 'click') {
                            typeToSend = previewModeWindowType || 'popup';
                        } else if (request.trigger === 'tooltips') {
                            typeToSend = searchWindowType || 'normal';
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
                                    handleLinkInPopup(request.trigger, request.linkUrl, currentTab, currentWindow, rememberPopupSizeAndPosition, typeToSend, lastClientX, lastClientY,
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

                                    handleLinkInPopup(request.trigger, urls, currentTab, currentWindow, rememberPopupSizeAndPosition, typeToSend, lastClientX, lastClientY,
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
            });
        })
        .catch(error => {
            console.error('Error in background script:', error);
            sendResponse({ status: 'error', message: error.message });
        });

    return true; // Keeps the message channel open for async response
});

// Handle link opening in a popup
function handleLinkInPopup(trigger, linkUrl, tab, currentWindow, rememberPopupSizeAndPosition, windowType, lastClientX, lastClientY,
    lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight) {
    if (!isValidUrl(linkUrl)) {
        console.error('Invalid URL:', linkUrl);
        return Promise.reject(new Error('Invalid URL'));
    }

    return loadUserConfigs().then(userConfigs => {
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
                chrome.storage.local.get(['popupWindowsInfo'], result => {
                    const popupWindowsInfo = result.popupWindowsInfo;
                    const savedPositionAndSize = popupWindowsInfo.savedPositionAndSize || {};

                    if (Object.keys(savedPositionAndSize).length > 0) {
                        ({ left: dx, top: dy, width, height } = savedPositionAndSize);

                        createPopupWindow(trigger, linkUrl, tab, windowType, dx, dy, width, height, currentWindow.id, popupWindowsInfo, rememberPopupSizeAndPosition, resolve, reject);
                    } else {
                        defaultPopupCreation(trigger, linkUrl, tab, currentWindow, defaultWidth, defaultHeight, tryOpenAtMousePosition, lastClientX, lastClientY, lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight, windowType, popupWindowsInfo, rememberPopupSizeAndPosition, resolve, reject);
                    }
                });
            } else {
                chrome.storage.local.get(['popupWindowsInfo'], result => {
                    const popupWindowsInfo = result.popupWindowsInfo || {};
                    defaultPopupCreation(trigger, linkUrl, tab, currentWindow, defaultWidth, defaultHeight, tryOpenAtMousePosition, lastClientX, lastClientY, lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight, windowType, popupWindowsInfo, rememberPopupSizeAndPosition, resolve, reject);
                });
            }
        });
    });
}

// Function to create a popup window
function createPopupWindow(trigger, linkUrl, tab, windowType, left, top, width, height, originWindowId, popupWindowsInfo, rememberPopupSizeAndPosition, resolve, reject) {

    chrome.storage.local.get(['enableContainerIdentify', 'rememberPopupSizeAndPositionForDomain', 'isMac'], (result) => {
        const enableContainerIdentify = result.enableContainerIdentify !== undefined ? result.enableContainerIdentify : true;
        let savedPositionAndSize;
        const domain = new URL(linkUrl).hostname;
        // Safely access the saved position and size if `rememberPopupSizeAndPositionForDomain` is enabled
        if (result.rememberPopupSizeAndPositionForDomain && popupWindowsInfo.savedPositionAndSize) {
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
                focused: true,
                incognito: tab && tab.incognito !== undefined ? tab.incognito : false,
                ...(enableContainerIdentify && tab.cookieStoreId && tab.cookieStoreId !== 'firefox-default' ? { cookieStoreId: tab.cookieStoreId } : {})
            }, (newWindow) => {
                if (chrome.runtime.lastError) {
                    console.error('Error creating popup window:', chrome.runtime.lastError.message, chrome.runtime.lastError);
                    reject(chrome.runtime.lastError);
                } else {
                    if (window.devicePixelRatio !== 1) {
                        chrome.windows.update(newWindow.id, {
                            top: parseInt(savedPositionAndSize ? savedPositionAndSize.top : top),
                            left: parseInt(savedPositionAndSize ? savedPositionAndSize.left : left)
                        });
                    }

                    // default payload
                    let payload = { enableContextMenu: true };

                    // extend for mac
                    if (result.isMac) {
                        if (!openPopups.includes(tabs[0].id)) openPopups.push(tabs[0].id);
                        if (!openPopups.includes(newWindow.tabs[0].id)) openPopups.push(newWindow.tabs[0].id);
                        payload = {
                            ...payload,
                            action: "INIT_POPUP_LISTENER",
                            originalTabId: tabs[0].id
                        };
                    }
                    chrome.tabs.onUpdated.addListener(function listener(tabId, info) {
                        if (tabId === newWindow.tabs[0].id && info.status === "complete") {
                            chrome.tabs.sendMessage(newWindow.tabs[0].id, payload);
                            chrome.tabs.onUpdated.removeListener(listener);
                        }
                    });

                    updatePopupInfoAndListeners(linkUrl, newWindow, originWindowId, popupWindowsInfo, rememberPopupSizeAndPosition, result.rememberPopupSizeAndPositionForDomain, resolve, reject);
                }
            });

        });

    });

}

// Function to handle default popup creation
function defaultPopupCreation(trigger, linkUrl, tab, currentWindow, defaultWidth, defaultHeight, tryOpenAtMousePosition, lastClientX, lastClientY, lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight, windowType, popupWindowsInfo, rememberPopupSizeAndPosition, resolve, reject) {

    let dx, dy;

    if (tryOpenAtMousePosition) {
        dx = parseInt(lastClientX);
        dy = parseInt(lastClientY);
    } else {
        const screenWidth = lastScreenWidth || screen.width;
        const screenHeight = lastScreenHeight || screen.height;

        const centerX = (screenWidth - defaultWidth) / 2;
        const centerY = (screenHeight - defaultHeight) / 2;

        dx = parseInt(lastScreenLeft) + centerX;
        dy = parseInt(lastScreenTop) + centerY;
    }

    // Clamping dx and dy to ensure they are within the screen bounds
    dx = Math.max(lastScreenLeft, Math.min(dx, lastScreenLeft + lastScreenWidth - defaultWidth));
    dy = Math.max(lastScreenTop, Math.min(dy, lastScreenTop + lastScreenHeight - defaultHeight));


    createPopupWindow(trigger, linkUrl, tab, windowType, dx, dy, defaultWidth, defaultHeight, currentWindow.id, popupWindowsInfo, rememberPopupSizeAndPosition, resolve, reject);
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
        // addBoundsChangeListener(linkUrl, newWindow.id, originWindowId);
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
    return disabledUrls.some(disabledUrl => url.includes(disabledUrl));
}

// Handle context menu item click
function onMenuItemClicked(info, tab) {
    if (info.menuItemId === 'sendPageBack') {
        loadUserConfigs().then(userConfigs => {
            const { popupWindowsInfo, enableContainerIdentify } = userConfigs;

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
                    if (enableContainerIdentify && tab.cookieStoreId && tab.cookieStoreId !== 'firefox-default') {
                        createData.cookieStoreId = tab.cookieStoreId;
                    }
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

                    });
                } else {
                    //console.error('No original window ID found for current window ID in popupWindowsInfo.');
                }
            } else {
                console.error('popupWindowsInfo is empty or not properly structured.');
            }
        });
    }

    if (info.menuItemId === 'showContextMenuItem') {

        // Send message to content script to handle preview
        chrome.tabs.sendMessage(tab.id, { linkUrl: info.linkUrl, trigger: 'contextMenu', x: lastContextX, y: lastContextY });
    }
}


// Listener for popup window removal
function windowRemovedListener(windowId) {
    chrome.storage.local.get(['popupWindowsInfo', 'isMac'], (result) => {
        if (result.isMac) {
            chrome.tabs.query({}, (tabs) => {
                const existingIds = tabs.map(t => t.id);
                openPopups = openPopups.filter(id => existingIds.includes(id));
            });
        }
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

                        chrome.browserAction.setIcon({
                            path: {
                                "128": "action/inclickmode-dark.svg"
                            }
                        });

                    } else {
                        chrome.browserAction.setIcon({
                            path: {
                                "128": "action/icon-dark.svg"
                            }
                        });
                    }
                } else {

                    if (newValue) {

                        chrome.browserAction.setIcon({
                            path: {
                                "128": "action/inclickmode.svg"
                            }
                        });

                    } else {
                        chrome.browserAction.setIcon({
                            path: {
                                "128": "action/icon.svg"
                            }
                        });
                    }
                }


            });
        });
    }
});
