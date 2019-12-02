var autoAjax = {
    options : {
        //Auto reset form on success
        autoReset : false,

        //Automaticaly add validation error messages into each bad filled input
        validationInputErrors : true,

        //Automatically bind validation message
        validationMessage : true,

        //Global messages
        messages : {
            error : 'Something went wrong, please try again later.',
            validation: 'Please fill all required fields.',
        },

        //User events
        events: {
            submit(form){ },
            success(data, response, form){ },
            error(data, response, form){ },
            validation(data, response, form){ },
        },

        //Global callback events for every form, such as validation, error handling etc...
        globalEvents : {
            success(data, response, form){
                var canResetForm = form.hasClass('autoReset') || autoAjax.core.getFormOptions(form).autoReset === true;

                //Reset form on success message if has autoReset class
                if ( canResetForm && !('error' in response) ) {
                    var resetItems = form.find('input, select, textarea').not('input[name="_token"], input[type="submit"], input[type="checkbox"], input[type="hidden"]').val('');

                    resetItems = resetItems.add(form.find('input[type="checkbox"]').each(function(){
                        this.checked = false;
                    }));

                    autoAjax.core.triggerChangeEvent(resetItems);
                }

                //Does not process success events if returned data is not object type
                if ( typeof data != 'object' )
                    return;

                //Show messages
                if ( 'error' in data || 'message' in data || 'callback' in data ) {
                    if ( data.type == 'modal' ) {
                        autoAjax.core.showModal(data);
                    } else {
                        autoAjax.core.setMessage(form , data.message, 'message' in data ? 'success' : 'error');

                        if ( 'callback' in data )
                            eval(data.callback);
                    }

                    return true;
                }

                //Redirect on callback
                else if ( 'redirect' in data ) {
                    if ( data.redirect == window.location.href ) {
                        return window.location.reload();
                    }

                    window.location.href = data.redirect;
                }
            },
            error(data, response, form){
                var obj = response.responseJSON;

                autoAjax.core.setMessage(form, obj ? obj.message||autoAjax.options.messages.error : autoAjax.options.messages.error, 'error');
            },
            validation(data, response, form){
                var obj = response.responseJSON,
                    options = autoAjax.core.getFormOptions(form);

                if ( response.status == 422 )
                {
                    //Laravel 5.5 provides validation errors in errors object.
                    if ( 'errors' in obj && !('length' in obj.errors) ) {
                        obj = obj.errors;
                    }

                    if ( options.validationInputErrors === true ) {
                        for ( var key in obj )
                        {
                            var message = $.isArray(obj[key]) ? obj[key][0] : obj[key];

                            form.find('input[name="'+key+'"], select[name="'+key+'"], textarea[name="'+key+'"]')
                                .after('<span class="help-block error">'+message+'</span>')
                                .first().parent().addClass('has-error')
                                .keyup(function(e){
                                    if ( e.keyCode == 13 ) {
                                        return;
                                    }

                                    $(this).removeClass('has-error');
                                    $(this).find('span.error.help-block').remove();
                                });
                        }
                    }

                    if ( options.validationMessage === true && !form.hasClass('noValidationMessage') ) {
                        autoAjax.core.setMessage(form, autoAjax.options.messages.validation, 'error');
                    }
                }
            },
        }
    },

    core : {
        /*
         * Return form options
         */
        getFormOptions(form){
            var options = form[0].autoAjaxOptions;

            return options||{};
        },
        /*
         * Merge actual options with new given options
         * Rewrite properties in object in second level, and does not
         * throw away whole parent object, when one attribute is changed
         */
        mergeOptions(oldOptions, newOptions){
            for ( var k in newOptions ) {
                if ( typeof newOptions[k] === 'object' ) {
                    for ( var k1 in newOptions[k] ) {
                        if ( !(k in oldOptions) ) {
                            oldOptions[k] = newOptions[k];
                            break;
                        }

                        oldOptions[k][k1] = newOptions[k][k1];
                    }
                } else {
                    oldOptions[k] = newOptions[k];
                }
            }

            return oldOptions;
        },
        /**
         * Automatically bind form values from data-row attribute
         *
         * @param  object/json  obj
         */
        bindRow : function(obj){
            var data = obj||$(this).attr('data-row');

            if ( data ) {
                var data = obj||$.parseJSON( data );

                for ( key in data ) {
                    var input = $(this).find('*[name="'+key+'"]');

                    if ( (!data[key] || data[key].length == 0) && (data[key] !== false && data[key] !== 0) ) {
                        continue;
                    }

                    autoAjax.core.bindValue($(this), input, key, data[key]);
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

            autoAjax.core.triggerChangeEvent(input);
        },
        /*
         * Datepicker inputs into form
         */
        bindDatepickers(){
            if ( ! ('datepicker' in jQuery.fn) )
                return;

            $(this).find('.js_date').datepicker({
                autoclose: true,
                format: 'dd.mm.yyyy',
                language: 'sk',
            });
        },
        /**
         * Reset all errors
         *
         * @param  element  form
         */
        resetErrors : function(form){
            form.find('.message, .alert').html('').hide();
            form.find('span.error.help-block').remove();
            form.find('.has-error').removeClass('has-error');
            form.find('input.error, select.error, textarea.error').removeClass('error');
        },
        /**
         * Set form message
         *
         * @param  element  form
         * @param  string  message
         * @param  string  type
         */
        setMessage : function(form, message, type){
            form.parent()
                .find('.alert')
                .removeClass('alert-danger alert-success')
                .addClass(type == 'error' ? 'alert-danger' : 'alert-success')
                .html(message)
                .show();
        },
        /*
         * Show modal with callback
         */
        showModal(response){
            modal.show(response);
        },
        fireEventsOn(functions, parameters){
            for ( var i = 0; i < functions.length; i++ ) {
                if ( functions[i] ) {
                    functions[i](...parameters);
                }
            }
        },
        /*
         * Return correct ajax response
         */
        ajaxResponse(response, form)
        {
            var options = form.prop('autoAjaxOptions'),
                finalResponse = [response.responseJSON||response.responseText, response, form];

            //Set ajax status as done
            options.status = 'ready';

            //On success response
            if ( response.status == 200 ) {
                this.fireEventsOn([
                    options.events.success,
                    options.events.onSuccess,
                    options.globalEvents.success
                ], finalResponse);
            }

            //On validation error
            else if ( response.status == 422 || response.status == 403 ) {
                this.fireEventsOn([
                    options.events.validation,
                    options.events.onValidation,
                    options.globalEvents.validation
                ], finalResponse);
            }

            //Other error
            else {
                this.fireEventsOn([
                    options.events.error,
                    options.events.onError,
                    options.globalEvents.error
                ], finalResponse);
            }
        },
    },

    /*
     * Create installable vuejs package
     */
    install(Vue, options){
        Vue.directive('autoAjax', {
            bind(el, binding, vnode) {
                var options = binding.value||{},
                    on = vnode.data.on||{},
                    mergedOptions = autoAjax.core.mergeOptions({
                        //Bind Vuejs events
                        events : {
                            submit : on.submit||on.onSubmit,
                            success : on.success||on.onSuccess,
                            error : on.error||on.onError,
                            validation : on.validation||on.onValidation,
                        }
                    }, options);

                $(el).autoAjax(mergedOptions);
            },
            update(el, binding, vnode) {
                el.autoAjaxOptions = autoAjax.core.mergeOptions(el.autoAjaxOptions, binding.value||{})
            }
        });

        Vue.directive('autoReset', {
            bind(el, binding, vnode) {
                el.autoAjaxOptions.autoReset = true
            },
        });
    },
}

/**
 * Install package as jQuery plugin
 */
$.fn.autoAjax = function(options){
    return $(this).each(function(){
        //If form has been initialized already
        if ( this.autoAjaxOptions )
            return;

        //Bind ajax options into exact form
        this.autoAjaxOptions = Object.assign(autoAjax.core.mergeOptions(autoAjax.options, options), {
            status : 'ready',
        });

        //Bind given row data and datepicker
        autoAjax.core.bindRow.call(this);
        autoAjax.core.bindDatepickers.call(this);

        /*
         * After submit form
         */
        $(this).submit(function(){
            //Disable send form twice
            if ( this.autoAjaxOptions.status === 'sending' )
                return false;

            var form = $(this);

            this.autoAjaxOptions.status = 'sending';

            //Fire submit event
            autoAjax.core.fireEventsOn([
                this.autoAjaxOptions.events.submit,
                this.autoAjaxOptions.events.onSubmit
            ], [form]);

            autoAjax.core.resetErrors(form);

            form.ajaxSubmit({
              url: form.attr('data-action'),
              success: (data, type, response) => autoAjax.core.ajaxResponse(response, form),
              error: response => autoAjax.core.ajaxResponse(response, form),
            });

            return false;
        });
    });
};

export default autoAjax;