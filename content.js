document.addEventListener("dragstart", function (e) {
    const selectionText = window.getSelection().toString();
    if (e.target.tagName === 'A') {
        // Prevent default click behavior
        e.preventDefault();
        e.stopPropagation();

        // Remove all event listeners on the link
        const link = e.target;
        const clonedLink = link.cloneNode(true);
        link.parentNode.replaceChild(clonedLink, link);

        chrome.runtime.sendMessage({
            linkUrl: e.target.href,
            lastClientX: e.screenX,
            lastClientY: e.screenY
        });
    } else if (selectionText) {
        // Retrieve the 'searchInPopupEnabled' setting from Chrome storage
        chrome.storage.sync.get('searchInPopupEnabled', function (data) {
            // Check if the setting is enabled
            if (data.searchInPopupEnabled) {
                // Send a message to the background script to handle the search in popup
                chrome.runtime.sendMessage({
                    selectionText: selectionText,
                    lastClientX: e.screenX,
                    lastClientY: e.screenY
                });

                // Prevent default drag behavior
                e.preventDefault();
                e.stopPropagation();
            }
        });
    }
});

document.addEventListener("dragover", function (e) {
    e.preventDefault();
    e.stopPropagation();
}, true);

document.addEventListener("drop", function (e) {
    e.preventDefault();
    e.stopPropagation();
}, true);

document.addEventListener("dragend", function (e) {
    e.preventDefault();
    e.stopPropagation();
}, true);

document.addEventListener("mouseup", function (e) {
    if (e.target.tagName === 'A' && e.target.href) {
        e.preventDefault();
        e.stopPropagation();
    }
}, true);
