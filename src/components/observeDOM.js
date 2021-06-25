var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

var observeDOM = function(obj, originalCallback, options = { childList:true, subtree:true }){
    if( !obj || !obj.nodeType === 1 )
        return;

    var timeout,
        callback = (mutations) => {
            if ( timeout ) {
                clearTimeout(timeout);
            }

            timeout = setTimeout(() => {
                originalCallback(mutations);
            }, 1);
        };

    if( MutationObserver ){
        // define a new observer
        var obs = new MutationObserver(function(mutations, observer){
            callback(mutations);
        })
        // have the observer observe foo for changes in children
        obs.observe( obj, options);
    }

    else if( window.addEventListener ){
        if ( options.childList || options.subtree ) {
            obj.addEventListener('DOMNodeInserted', callback, false);
            obj.addEventListener('DOMNodeRemoved', callback, false);
        }

        if ( options.attributes ) {
            obj.addEventListener('DOMAttrModified', callback, false);
        }
    }
}

export default observeDOM;