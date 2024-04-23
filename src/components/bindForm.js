import observeDOM from './observeDOM';
import autoSave from './autoSave';

var bindForm = {
    init(form){
        observeDOM(form, (mutations) => {
            //If form has not been binded yet
            if ( !form._bindRow ){
                return;
            }

            //On every added element, fire bindRow method
            for ( var i = 0; i < mutations.length; i++ ){
                let mutation = mutations[i];

                mutation.addedNodes.forEach(element => {
                    this.bindRow(form, ...form._bindRow, $(element));
                });
            }
        })
    },
    /**
     * Automatically bind form values from data-row attribute
     *
     * @param  object/json  obj
     */
    bindRow : function(form, obj, options, changedNode){
        form._bindRow = [obj, options];

        var data = obj||options.row||$(form).attr('data-row')||autoSave.getFormData(form, options);
            form = $(form);

        if ( data ) {
            var data = typeof data == 'string' ? $.parseJSON(data) : data;

            for ( var key in data ) {
                var input;

                if ( changedNode ) {
                    input = changedNode.is('[name="'+key+'"]') ? changedNode : changedNode.find('*[name="'+key+'"]');
                } else {
                    input = form.find('*[name="'+key+'"]');
                }

                if ( (!data[key] || data[key].length == 0) && (data[key] !== false && data[key] !== 0) ) {
                    continue;
                }

                this.bindValue(form, input, key, data[key]);
            }
        }
    },
    triggerChangeEvent(inputs){
        [...inputs].forEach((input) => {
            //Fix labels
            input.focus();
            input.blur();

            input.dispatchEvent(new Event('input', { 'bubbles': true }));
            input.dispatchEvent(new Event('change', { 'bubbles': true }));
        })
    },
    /**
     * Bind value into input
     */
    bindValue : function(form, input, key, value){
        if ( input.is('input:file') )
            return;

        if ( input.is('input:radio') || input.is('input:checkbox') )
        {
            if ( value === true )
                value = 1;
            else if ( value === false )
                value = 0;

            input = form.find('*[name="'+key+'"][value="'+value+'"]');

            //If no input with given value has been found, and value is turned to on
            //We need check any found input with same name. Because if no value is present in attribute
            //Browser will send "on" value.
            if ( input.length === 0 && ['on'].indexOf(value) > -1 ) {
                input = form.find('*[name="'+key+'"]');
            }

            input.prop("checked", true);
        } else {
            if ( value === true )
                value = 1;
            else if ( value === false )
                value = 0;

            input.val(value);
        }

        this.triggerChangeEvent(input);
    },
    /*
     * Datepicker inputs into form
     */
    bindDatepickers(form){
        if ( ! ('datepicker' in jQuery.fn) )
            return;

        $(form).find('.js_date').datepicker({
            autoclose: true,
            format: 'dd.mm.yyyy',
            language: 'sk',
        });
    },
};

export default bindForm;