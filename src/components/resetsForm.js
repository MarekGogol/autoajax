var observeDOM = require('./observeDOM').default,
    bindForm = require('./bindForm').default;

var resetsForm = {
    init(form){
        this.saveDefaultRowValues(form);

        observeDOM(form, (mutations) => {
            this.saveDefaultRowValues(form);
        })
    },
    saveDefaultRowValues(form){
        var values = {},
            inputs = $(form).find('input, textarea, select');

        for (var i = 0; i < inputs.length; i++) {
            //If default value has been saved already
            if ( inputs[i].autoAjaxDefaultValue !== undefined )
                continue;

            let input = $(inputs[i]),
                name = input.attr('name'),
                value = input.val(),
                defaultValue = null;

            if ( input.is('input:checkbox') || input.is('input:radio') ) {
                defaultValue = input.is(':checked')
            }

            else {
                defaultValue = input.val();
            }

            inputs[i].autoAjaxDefaultValue = defaultValue;
        }

        form.autoAjaxOptions.defaultValues = values;
    },
    resetForm(form){
        return form.find('input, select, textarea')
            .not('input[name="_token"], input[type="submit"], input[type="hidden"], [autoAjax-noReset]')
            .each(function(){
                if ( $(this).is('input:checkbox') || $(this).is('input:radio') ) {
                    $(this)[0].checked = this.autoAjaxDefaultValue;
                } else {
                    $(this).val(this.autoAjaxDefaultValue);
                }

                bindForm.triggerChangeEvent($(this));
            });
    },
};

export default resetsForm;