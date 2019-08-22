require('jquery-form/jquery.form.js');

const autoAjax = {
    options : {
        //Global messages
        messages : {
            errorMessage : 'Something went wrong, please try again later.',
            validationError: 'Please fill all required fields.',
        },
        events: {
            success(data, response, form){

            },
            error(data, response, form){

            },
            validationError(data, response, form){

            },
        },
        //Global callback events for every form, such as validation, error handling etc...
        globalEvents : {
            success(data, response, form){
                //Reset form on success message if has autoReset class
                if ( form.hasClass('autoReset') && !('error' in response) )
                    form.find('input, select, textarea').not('input[name="_token"], input[type="submit"], input[type="hidden"]').val('');

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
                    if ( data.redirect == window.location.href )
                        return window.location.reload();

                    window.location.href = data.redirect;
                }
            },
            error(data, response, form){
                var obj = response.responseJSON;

                autoAjax.core.setMessage(form, obj ? obj.message||autoAjax.options.messages.errorMessage : autoAjax.options.messages.errorMessage, 'error');
            },
            validationError(data, response, form){
                var obj = response.responseJSON;

                if ( response.status == 422 )
                {
                    //Laravel 5.5 provides validation errors in errors object.
                    if ( 'errors' in obj && !('length' in obj.errors) )
                        obj = obj.errors;

                    for ( var key in obj )
                    {
                        var message = $.isArray(obj[key]) ? obj[key][0] : obj[key];

                        form.find('input[name="'+key+'"], select[name="'+key+'"], textarea[name="'+key+'"]')
                            .after('<span class="help-block error">'+message+'</span>')
                            .first().parent().addClass('has-error')
                            .keyup(function(e){
                                if ( e.keyCode == 13 )
                                    return;

                                $(this).removeClass('has-error');
                                $(this).find('span.error.help-block').remove();
                            });
                    }

                    if ( ! form.hasClass('noErrorMessage') )
                        autoAjax.core.setMessage(form, autoAjax.options.messages.validationError, 'error');
                }
            },
        }
    },

    core : {
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
                input.prop("checked", true).change();
            } else {
                if ( value === true )
                    value = 1;
                else if ( value === false )
                    value = 0;

                input.val(value).change().trigger("chosen:updated");

                if ( input.hasClass('v-model') ){
                    input[0].dispatchEvent(new Event('input', { 'bubbles': true }))
                }
            }
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
        /*
         * Return correct ajax response
         */
        ajaxResponse(response, form)
        {
            var options = form.prop('autoAjaxOptions');

            //Set ajax status as done
            options.status = 'ready';

            //On success response
            if ( response.status == 200 ) {
                options.events.success(response.responseJSON||response.responseText, response, form);
                options.globalEvents.success(response.responseJSON||response.responseText, response, form);
            }

            //On validation error
            else if ( response.status == 422 || response.status == 403 ) {
                options.events.validationError(response.responseJSON||response.responseText, response, form);
                options.globalEvents.validationError(response.responseJSON||response.responseText, response, form);
            }

            //Other error
            else {
                options.events.error(response.responseJSON||response.responseText, response, form);
                options.globalEvents.error(response.responseJSON||response.responseText, response, form);
            }
        },
    },

    /*
     * Create installable vuejs package
     */
    install(Vue, options){
        Vue.directive('autoAjax', {
            bind(el, binding, vnode) {
                $(el).autoAjax({
                    events : {
                        success : vnode.data.on.success||(() => {}),
                        error : vnode.data.on.error||(() => {}),
                        validationError : vnode.data.on.validationError||(() => {}),
                    }
                });
            },
        })
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
        this.autoAjaxOptions = Object.assign(autoAjax.options, options, {
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

            this.autoAjaxOptions.status = 'sending';

            var form = $(this);

            autoAjax.core.resetErrors(form);

            var submit = form.find('*[type="submit"]');

            form.ajaxSubmit({
              url: form.attr('data-action'),
              success: (data, type, response) => autoAjax.core.ajaxResponse(response, form),
              error: response => autoAjax.core.ajaxResponse(response, form),
            });

            return false;
        });
    });
};

module.exports = autoAjax;