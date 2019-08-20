(function ($) {
    window.autoAjax = {
        options : {
            messages : {
                errorMessage : 'Something went wrong, please try again later.',
                validationError: 'Please fill all required fields.',
            },
        },
        bindRow : function(obj){
            /*
             * Bind form values
             */
            var data = obj||$(this).attr('data-row');

            if ( data )
            {
                var data = obj||$.parseJSON( data );

                for ( key in data )
                {
                    var input = $(this).find('*[name="'+key+'"]');

                    if ( (!data[key] || data[key].length == 0) && (data[key] !== false && data[key] !== 0) )
                    {
                        continue;
                    }

                    autoAjax.bindValue($(this), input, key, data[key]);
                }
            }
        },
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
         * Datepicker in form
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
        resetErrors : function(form){
            form.find('.message, .alert').html('').hide();
            form.find('span.error').remove();
            form.find('.has-error').removeClass('has-error');
            form.find('input.error, select.error, textarea.error').removeClass('error');
        },
        setMessage : function(form, message, type){
            form.parent().find('.alert').removeClass('alert-danger alert-success').addClass(type == 'error' ? 'alert-danger' : 'alert-success').html(message).show();

            if ( type == 'success' && form.find('.form-items') )
                form.find('.form-items').slideUp(200)
            else {
                $('html, body').animate({
                    scrollTop: form.offset().top
                }, 500);
            }
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
            //If form has own response callback
            if ( form && form.attr('data-callback') )
                return window[form.attr('data-callback')].call(null, response);

            if ( 'error' in response || 'message' in response || 'callback' in response )
            {
                if ( response.type == 'modal' )
                {
                    autoAjax.showModal(response);
                } else {
                    autoAjax.setMessage(form , response.message, 'message' in response ? 'success' : 'error');

                    if ( 'callback' in response )
                        eval(response.callback);
                }

                return true;
            } else if ( 'redirect' in response )
            {
                if ( response.redirect == window.location.href )
                    return window.location.reload();

                window.location.href = response.redirect;

                return true;
            }

            return false;
        },
        unknownError()
        {
            autoAjax.showModal({
                message : autoAjax.errorMessage
            });
        },
    }

    $.fn.autoAjax = function(options){
        //Rewrite default options
        for ( var key in options||{} ) {
            autoAjax.options[key] = options[key];
        }

        return $(this).each(function(){
            autoAjax.bindRow.call(this);
            autoAjax.bindDatepickers.call(this);

            if ( this._autoAjax === true )
                return;

            this._autoAjax = true;

            var stop = false;

            /*
             * After submit form
             */
            $(this).submit(function(){
                if ( stop == true )
                    return false;

                stop = true;

                var form = $(this);

                autoAjax.resetErrors(form);

                var submit = form.find('*[type="submit"]');

                if ( submit.next().hasClass('hidden') && submit.next().is('button') )
                {
                    submit.toggleClass('hidden');
                    submit.next().toggleClass('hidden');
                }

                form.ajaxSubmit({
                  url: form.attr('data-action'),
                  success: function(response, type, request){
                    autoAjax.resetErrors(form);

                    stop = false;

                    if ( form.hasClass('autoReset') && !('error' in response) )
                        form.find('input, select, textarea').not('input[name="_token"], input[type="submit"], input[type="hidden"]').val('');

                    autoAjax.ajaxResponse(response, form);
                  },
                  error: function(response){
                    autoAjax.resetErrors(form);

                    stop = false;

                    if ( response.status == 422 || response.status == 403 ){

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
                                    .first().parent()
                                    .addClass('has-error')
                                    .keyup(function(e){
                                        if ( e.keyCode == 13 )
                                            return;

                                        $(this).removeClass('has-error');
                                        $(this).find('span.error').remove();
                                        $(this).find('.error').removeClass('error');
                                    });
                            }

                            if ( ! form.hasClass('noErrorMessage') )
                                autoAjax.setMessage(form, autoAjax.options.messages.validationError, 'error');
                        }
                    } else {
                        autoAjax.setMessage(form, obj ? obj.message||autoAjax.errorMessage : autoAjax.options.errorMessage, 'error');
                    }
                  }
                });

                return false;
            });
        });
    };
})($);