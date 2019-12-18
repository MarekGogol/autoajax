var bindForm = {
    /**
     * Automatically bind form values from data-row attribute
     *
     * @param  object/json  obj
     */
    bindRow : function(form, obj, options){
        var data = obj||options.row||$(form).attr('data-row');
            form = $(form);

        if ( data ) {
            var data = typeof data == 'string' ? $.parseJSON(data) : data;

            for ( var key in data ) {
                var input = form.find('*[name="'+key+'"]');

                if ( (!data[key] || data[key].length == 0) && (data[key] !== false && data[key] !== 0) ) {
                    continue;
                }

                this.bindValue(form, input, key, data[key]);
            }
        }
    },
    triggerChangeEvent(input){
        input.each(function(){
            $(this).change().trigger("chosen:updated");
            this.dispatchEvent(new Event('input', { 'bubbles': true }))
            this.dispatchEvent(new Event('change', { 'bubbles': true }))
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