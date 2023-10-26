import jqueryForm from 'jquery-form';

if ( typeof window !== 'undefined' ) {
    jqueryForm(window, window.$);

    autoAjax.jQueryDirective(window);
}

import autoAjax from './autoAjax.js';

export default autoAjax;
