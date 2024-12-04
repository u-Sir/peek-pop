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
    'rememberPopupSizeAndPosition': false,
    'windowType': 'popup',
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
    'linkDisabledUrls': [],
    'enableContainerIdentify': true,
    'dragStartEnable': false,
    'copyButtonPosition': { leftPercent: 10, topPercent: 10 },
    'sendBackButtonPosition': { leftPercent: 10, topPercent: 20 },
    'searchTooltipsEngines':  `Google=>https://www.google.com/search?q=%s
Bing=>https://www.bing.com/search?q=%s
Baidu=>https://www.baidu.com/s?wd=%s
Yandex=>https://yandex.com/search/?text=%s
DuckduckGo=>https://duckduckgo.com/?q=%s
Wikipedia=>https://wikipedia.org/w/index.php?title=Special:Search&search=%s`,
    'copyButtonEnable': false,
    'dropInEmptyOnly': false,
    'sendBackButtonEnable': false
};

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
chrome.runtime.onInstalled.addListener(() => {
    loadUserConfigs().then(userConfigs => {
        const setBrowserInfo = new Promise((resolve, reject) => {
            try {
                chrome.runtime.getBrowserInfo((browserInfo) => {
                    if (browserInfo.name === 'Firefox') {
                        userConfigs['isFirefox'] = true;
                    } else {
                        userConfigs['isFirefox'] = false;
                    }
                    resolve();
                });
            } catch (error) {
                userConfigs['isFirefox'] = false;
                resolve();
            }
        });

        setBrowserInfo.then(() => {
            const keysToSave = Object.keys(configs).filter(key => userConfigs[key] === undefined);
            return Promise.all(keysToSave.map(key => saveConfig(key, configs[key])));
        }).catch(error => console.error('Error during installation setup:', error));
    });
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

                if (request.checkContextMenuItem) {
                    chrome.storage.local.get('popupWindowsInfo', (result) => {
                        const popupWindowsInfo = result.popupWindowsInfo || {};

                        const isCurrentWindowOriginal = Object.keys(popupWindowsInfo).some(windowId => {
                            return parseInt(windowId) === currentWindow.id;
                        });


                        loadUserConfigs().then(userConfigs => {
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
                            } else {
                                // console.log('not popup window, do nothing')
                            }


                        });
                    });

                    sendResponse({ status: 'item checked' });
                }

                if (request.action === 'closeCurrentTab') {
                    chrome.storage.local.get(['popupWindowsInfo', 'contextItemCreated'], (result) => {
                        const popupWindowsInfo = result.popupWindowsInfo;
                        const isCurrentWindowOriginal = Object.keys(popupWindowsInfo).some(windowId => {
                            return parseInt(windowId) === currentWindow.id;
                        });
                        if (!isCurrentWindowOriginal) {
                            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                                if (tabs.length > 0) {
                                    const currentTab = tabs[0];
                                    chrome.tabs.remove(currentTab.id);
                                }
                            });
                            if (result.contextItemCreated) {
                                chrome.contextMenus.remove('sendPageBack', () => {
                                    if (chrome.runtime.lastError) {
                                        // console.error("Error removing context menu: ", chrome.runtime.lastError.message);
                                    } else {
                                        // console.log("Context menu 'sendPageBack' removed successfully.");
                                    }
                                });

                                result.contextItemCreated = false;
                                chrome.storage.local.set({ contextItemCreated: false });
                            }
                        }

                    });
                    sendResponse({ status: 'esc handled' });

                }

                if (request.action === 'windowRegainedFocus') {
                    chrome.storage.local.get(['popupWindowsInfo', 'contextItemCreated'], (result) => {
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

                                // Remove context menu item if necessary
                                if (result.contextItemCreated) {
                                    chrome.contextMenus.remove('sendPageBack', () => {
                                        if (chrome.runtime.lastError) {
                                            // Error handling for context menu removal
                                        } else {
                                            // Context menu 'sendPageBack' removed successfully
                                        }
                                    });

                                    result.contextItemCreated = false;
                                    chrome.storage.local.set({ contextItemCreated: false });
                                }
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

                if (request.action === 'getWindowType') {
                    chrome.windows.getCurrent({ populate: true }, (window) => {
                        sendResponse({ status: 'Window type sent', windowType: window.type});

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
                    sendResponse({ status: 'send Page Back handled' });

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
                    return Promise.all([
                        saveConfig('lastClientX', request.lastClientX * zoom),
                        saveConfig('lastClientY', request.lastClientY * zoom),
                        saveConfig('lastScreenTop', request.top * zoom),
                        saveConfig('lastScreenLeft', request.left * zoom),
                        saveConfig('lastScreenWidth', request.width * zoom),
                        saveConfig('lastScreenHeight', request.height * zoom)
                    ]);
                }).then(() => {
                    return loadUserConfigs().then(userConfigs => {
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
            popupHeight, popupWidth, tryOpenAtMousePosition
        } = userConfigs;

        const defaultHeight = parseInt(popupHeight, 10) || 800;
        const defaultWidth = parseInt(popupWidth, 10) || 1000;

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
    
    chrome.storage.local.get(['enableContainerIdentify', 'rememberPopupSizeAndPositionForDomain'], (result) => {
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
        const tmp = {
            url: linkUrl,
            type: windowType,
            top: parseInt(savedPositionAndSize ? savedPositionAndSize.top : top),
            left: parseInt(savedPositionAndSize ? savedPositionAndSize.left : left),
            width: parseInt(savedPositionAndSize ? savedPositionAndSize.width : width),
            height: parseInt(savedPositionAndSize ? savedPositionAndSize.height : height),
            focused: true,
            incognito: tab && tab.incognito !== undefined ? tab.incognito : false,
            ...(enableContainerIdentify && tab.cookieStoreId && tab.cookieStoreId !== 'firefox-default' ? { cookieStoreId: tab.cookieStoreId } : {})
        };
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
                updatePopupInfoAndListeners(linkUrl, newWindow, originWindowId, popupWindowsInfo, rememberPopupSizeAndPosition, result.rememberPopupSizeAndPositionForDomain, resolve, reject);
            }
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

                chrome.windows.getCurrent({ populate: true }, (window) => {
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
        });
    }
});
