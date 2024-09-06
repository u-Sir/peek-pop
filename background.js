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
    'collectionEnable': false,
    'collectionTimeout': 1000
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

                                if (userConfigs.rememberPopupSizeAndPosition) {
                                    for (const originWindowId in popupWindowsInfo) {
                                        if (originWindowId === 'savedPositionAndSize') {
                                            continue; // Skip the savedPositionAndSize key
                                        }

                                        if (popupWindowsInfo[originWindowId][currentWindow.id]) {
                                            if (!popupWindowsInfo[originWindowId]) {
                                                popupWindowsInfo[originWindowId] = {};
                                            }
                                            popupWindowsInfo[originWindowId][currentWindow.id] = {
                                                windowType: currentWindow.type,
                                                top: currentWindow.top,
                                                left: currentWindow.left,
                                                width: currentWindow.width,
                                                height: currentWindow.height
                                            };

                                            ({ left: currentWindow.left, top: currentWindow.top, width: currentWindow.width, height: currentWindow.height } = popupWindowsInfo.savedPositionAndSize);


                                            // Handle domain-specific saving
                                            if (userConfigs.rememberPopupSizeAndPositionForDomain && sender && sender.tab && sender.tab.url) {
                                                try {
                                                    const domain = new URL(sender.tab.url).hostname;
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
                                chrome.contextMenus.remove('sendPageBack');
                                result.contextItemCreated = false;
                                chrome.storage.local.set({ contextItemCreated: false });
                            }
                        }

                    });
                    sendResponse({ status: 'esc handled' });

                }

                if (request.action === 'windowRegainedFocus') {
                    chrome.storage.local.get(['popupWindowsInfo', 'contextItemCreated', 'popupInBackground', 'hoverPopupInBackground'], (result) => {
                        const popupWindowsInfo = result.popupWindowsInfo;
                        const isCurrentWindowOriginal = Object.keys(popupWindowsInfo).some(windowId => {
                            return parseInt(windowId) === currentWindow.id;
                        });
                        if (isCurrentWindowOriginal) {

                            let popupsToRemove = Object.keys(popupWindowsInfo[currentWindow.id] || {});

                            if (result.popupInBackground || result.hoverPopupInBackground) {
                                // Filter popupsToRemove to exclude those with focused: false
                                popupsToRemove = popupsToRemove.filter(popupId => {
                                    return popupWindowsInfo[currentWindow.id][popupId].focused !== false;
                                });
                            }

                            chrome.windows.getAll({ populate: true }, windows => {
                                windows.forEach(window => {
                                    if (popupsToRemove.includes(window.id.toString())) {
                                        chrome.windows.remove(window.id);
                                    }
                                });
                                if (result.contextItemCreated) {
                                    chrome.contextMenus.remove('sendPageBack');
                                    result.contextItemCreated = false;
                                    chrome.storage.local.set({ contextItemCreated: false });
                                }

                            });
                        }

                    });
                    sendResponse({ status: 'window focus handled' });

                }

                if (request.action === 'openSidePanel') {
                    chrome.sidePanel.open({ windowId: sender.tab.windowId });
                    sendResponse({ status: 'open SidePanel handled' });
                }

                if (request.action === 'updateIcon') {
                    chrome.storage.local.get(['previewModeEnable'], userConfigs => {
                        if (userConfigs.previewModeEnable) {
                            if (request.previewMode !== undefined && !request.previewMode) {

                                chrome.action.setIcon({
                                    path: {
                                        "128": "action/inclickmode.png"
                                    }
                                });
                            } else {

                                chrome.action.setIcon({
                                    path: {
                                        "128": "action/icon_with_border-128.png"
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
                    });


                    sendResponse({ status: 'Icon update handled' });
                }




                if (request.action === 'sendPageBack') {
                    loadUserConfigs().then(userConfigs => {
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
                                        if (window.id) chrome.windows.remove(window.id);
                                    });

                                    if (userConfigs.contextItemCreated) {
                                        chrome.contextMenus.remove('sendPageBack');
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




                return Promise.all([
                    saveConfig('lastClientX', request.lastClientX),
                    saveConfig('lastClientY', request.lastClientY),
                    saveConfig('lastScreenTop', request.top),
                    saveConfig('lastScreenLeft', request.left),
                    saveConfig('lastScreenWidth', request.width),
                    saveConfig('lastScreenHeight', request.height)
                ]).then(() => {
                    return loadUserConfigs().then(userConfigs => {
                        const { disabledUrls, rememberPopupSizeAndPosition, windowType, hoverWindowType, previewModeWindowType } = userConfigs;
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
                            handleLinkInPopup(request.trigger, request.linkUrl, sender.tab, currentWindow, rememberPopupSizeAndPosition, typeToSend).then(() => {
                                sendResponse({ status: 'link handled' });
                            });
                        } else if (request.action === 'group') {
                            handleLinkInPopup(request.trigger, urls, sender.tab, currentWindow, rememberPopupSizeAndPosition, typeToSend).then(() => {
                                sendResponse({ status: 'group handled' });
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
function handleLinkInPopup(trigger, linkUrl, tab, currentWindow, rememberPopupSizeAndPosition, windowType) {
    if (!isValidUrl(linkUrl)) {
        console.error('Invalid URL:', linkUrl);
        return Promise.reject(new Error('Invalid URL'));
    }

    return loadUserConfigs().then(userConfigs => {
        const {
            lastClientX, lastClientY,
            popupHeight, popupWidth, tryOpenAtMousePosition,
            lastScreenTop, lastScreenLeft, lastScreenWidth, lastScreenHeight
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
    chrome.storage.local.get(['popupInBackground', 'hoverPopupInBackground', 'previewModePopupInBackground', 'rememberPopupSizeAndPositionForDomain'], (result) => {
        let popupInBackground = false;
        if (trigger === 'drag') {
            popupInBackground = result.popupInBackground !== undefined
                ? result.popupInBackground
                : false;
        } else if (trigger === 'hover' || trigger === 'tooltips') {

            popupInBackground = result.hoverPopupInBackground !== undefined
                ? result.hoverPopupInBackground
                : false;
        } else if (trigger === 'click') {

            popupInBackground = result.previewModePopupInBackground !== undefined
                ? result.previewModePopupInBackground
                : false;
        }
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
    popupWindowsInfo[originWindowId][newWindow.id] = {
        windowType: newWindow.type,
        top: newWindow.top,
        left: newWindow.left,
        width: newWindow.width,
        height: newWindow.height,
        focused: newWindow.focused
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
    return disabledUrls.some(disabledUrl => url.includes(disabledUrl));
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

                    popupWindowsInfo[originWindowId][windowId] = {
                        windowType: window.type,
                        top: bounds.top,
                        left: bounds.left,
                        width: bounds.width,
                        height: bounds.height
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
                            if (window.id) chrome.windows.remove(window.id);
                        });

                        if (userConfigs.contextItemCreated) {
                            chrome.contextMenus.remove('sendPageBack');
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
                if (newValue) {

                    chrome.action.setIcon({
                        path: {
                            "128": "action/icon_with_border-128.png"
                        }
                    });

                } else {
                    chrome.action.setIcon({
                        path: {
                            "128": "action/icon.png"
                        }
                    });
                }
            });
        });
    }
});
