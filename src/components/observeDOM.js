var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

var observeDOM = function(obj, originalCallback){
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
        obs.observe( obj, { childList:true, subtree:true });
    }

    else if( window.addEventListener ){
        obj.addEventListener('DOMNodeInserted', callback, false);
        obj.addEventListener('DOMNodeRemoved', callback, false);
    }
}

export default observeDOM;