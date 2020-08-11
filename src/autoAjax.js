const cloneDeep = require('lodash.clonedeep'),
      isEqual = require('lodash.isequal');

var resetsForm = require('./components/resetsForm').default,
    bindForm = require('./components/bindForm').default,
    autoSave = require('./components/autoSave').default;

var autoAjax = {
    options : {
        //Auto reset form on success
        autoReset : false,

        //Automatically save all unsaved form changed
        autoSave : false,

        //Automaticaly add validation error messages after each bad filled input
        showInputErrors : true,

        //General success/error/validation form message
        showMessage : true,

        //Automatically bind validation message
        showValidationMessage : true,

        //Available selectors and classes
        selectors : {
            messageSelector: '.alert',
            messageSuccessClass : '.alert-success',
            messageErrorClass : '.alert-danger',
            inputWrapperErrorClass : '.has-error',
        },

        //Global messages
        messages : {
            error : 'Something went wrong, please try again later.',
            validation: 'Please fill all required fields.',
        },

        //Scrolling on wrong input elements
        scrollOnErrorInput : true,
        errorInputScrollSpeed : 500,
        errorInputScrollOffset : 100,
        focusWrongTextInput : true,

        submit(form){ },
        success(data, response, form){ },
        error(data, response, form){ },
        validation(data, response, form){ },

        //Build validation error message
        getErrorMessageElement(message, key, form){
            return '<span class="help-block error">'+message+'</span>';
        },

        //Add validation error message after this element
        addErrorMessageAfterElement(input){
            //You can modify, where should be placed validation error message for each input
            //If you want place validation after input parent, you can do something like:
            //return input.parent();

            return input;
        },

        //Returns input parrent wrapper where .has-error class will be added
        getInputParentWrapper(input){
            return input.parent();
        },

        //Global callback events for every form, such as validation, error handling etc...
        globalEvents : {
            success(data, response, form){
                var options = autoAjax.core.getFormOptions(form),
                    canResetForm = form.hasClass('autoReset') || options.autoReset === true;

                //Reset form on success message if has autoReset class
                if ( canResetForm && !('error' in response) ) {
                    var resetItems = resetsForm.resetForm(form);

                    bindForm.triggerChangeEvent(resetItems);
                }

                //Does not process success events if returned data is not object type
                if ( typeof data != 'object' )
                    return;

                //Redirect on callback
                if ( 'redirect' in data && data.redirect ) {
                    if ( data.redirect == window.location.href ) {
                        return window.location.reload();
                    }

                    window.location.href = data.redirect;
                }

                //Show messages
                else if ( 'error' in data || 'message' in data || 'callback' in data ) {
                    if ( data.type == 'modal' ) {
                        autoAjax.core.showModal(data);
                    } else {
                        //Show message alert
                        if ( options.showMessage === true ) {
                            autoAjax.core.setMessage(form, data.message, 'message' in data ? 'success' : 'error');
                        }

                        if ( 'callback' in data )
                            eval(data.callback);
                    }
                }
            },
            error(data, response, form){
                var obj = response.responseJSON,
                    options = autoAjax.core.getFormOptions(form);

                if ( options.showMessage === true ) {
                    autoAjax.core.setMessage(form, obj ? obj.message||options.messages.error : options.messages.error, 'error');
                }
            },
            validation(data, response, form){
                var obj = response.responseJSON,
                    options = autoAjax.core.getFormOptions(form);

                if ( response.status == 422 ) {
                    //Laravel 5.5 provides validation errors in errors object.
                    if ( 'errors' in obj && !('length' in obj.errors) ) {
                        obj = obj.errors;
                    }

                    //We want sorted keys by form positions, not backend validation positions
                    //Because of scrolling to field in right order
                    let keys = autoAjax.core.sortKeysByFormOrder(form, obj);

                    for ( var i = 0; i < keys.length; i++ )
                    {
                        let key = keys[i],
                            message = $.isArray(obj[key]) ? obj[key][0] : obj[key];

                        autoAjax.core.setErrorMessage(form, key, message, obj);
                    }

                    //Show validation message alert
                    if ( options.showMessage === true && options.showValidationMessage === true ) {
                        autoAjax.core.setMessage(form, options.messages.validation, 'error');
                    }
                }
            },
        },
    },

    core : {
        /*
         * Return form options
         */
        getFormOptions(form){
            var options = (form.tagName == 'FORM' ? form : form[0]).autoAjaxOptions;

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
         * Reset all errors
         *
         * @param  element  form
         */
        resetErrors : function(form){
            var options = autoAjax.core.getFormOptions(form),
                successClass = autoAjax.core.getClass('messageSuccessClass', form, true),
                errorClass = autoAjax.core.getClass('messageErrorClass', form, true);

            //Remove added error messages
            if ( form[0]._addedErrorMessages ) {
                for ( var i = 0; i < form[0]._addedErrorMessages.length; i++ ) {
                    form[0]._addedErrorMessages[i].remove();
                }
            }

            //Remove and hite alert message class
            form.find(options.selectors.messageSelector)
                .removeClass(successClass+' '+errorClass)
                .html('')
                .hide();

            //Remove input wrapper class
            form.find(autoAjax.core.getClass('inputWrapperErrorClass', form))
                .removeClass(autoAjax.core.getClass('inputWrapperErrorClass', form, true));
        },
        getClass(key, form, onlyString){
            var options = autoAjax.core.getFormOptions(form),
                selector = options.selectors[key];

            if ( onlyString === true ) {
                selector = selector.replace(/\./g, '');
            }

            return selector;
        },
        /**
         * Set form message
         *
         * @param  element  form
         * @param  string  message
         * @param  string  type
         */
        setMessage : function(form, message, type){
            var successClass = autoAjax.core.getClass('messageSuccessClass', form, true),
                errorClass = autoAjax.core.getClass('messageErrorClass', form, true);

            if ( message ) {
                form.parent()
                    .find(autoAjax.core.getFormOptions(form).selectors.messageSelector)
                    .removeClass(successClass)
                    .removeClass(errorClass)
                    .addClass(type == 'error' ? errorClass : successClass)
                    .html(message)
                    .show();
            }
        },
        getFieldScrollPosition(element, options){
            var top = element.offset().top,
                offset = options.errorInputScrollOffset;

            //Scroll offset can be dynamic function which returns number.
            //Because sometimes for mobile version, we want other offset.
            if ( typeof offset == 'function' ) {
                offset = offset();
            }

            return top > offset ? top - offset : top;
        },
        /*
         * Scroll on wrong input field an select it
         */
        scrollOnWrongInput(element, form, options){
            if ( element.length == 0 || form[0].scrolledOnWrongInput === true ) {
                return;
            }

            var top = this.getFieldScrollPosition(element, options),
                activeElement = document.activeElement,
                isHidden = element.is(':hidden');

            //We does not want scrool if element is hidden
            if ( top <= 0 || isHidden ) {
                var parent = element.parent();

                //If field is hidden and parent group is visible
                if ( isHidden && parent.is(':visible') ) {
                    top = this.getFieldScrollPosition(parent, options);
                }

                //If field does not have visible parent
                else {
                    form[0].scrolledOnWrongInput = true;
                    return;
                }
            }

            form[0].scrolledOnWrongInput = true;

            //Scroll on wrong input
            $('html, body').animate({
                scrollTop: top,
            }, options.errorInputScrollSpeed);

            //Focus wrong text inputs
            if (
                options.focusWrongTextInput === true //If we can focus error inputs
                && ['text', 'email', 'number', 'phone', 'date', 'password', 'range'].indexOf(element.attr('type')) > -1 //If is text input
                && !(activeElement && (activeElement._addedErrorMesageIntoInput||[]).length > 0) //If is not select error input already
            ) {
                element.focus()
            }
        },
        /*
         * Set input error message
         */
        setErrorMessage : function(form, key, message, obj){
            var options = autoAjax.core.getFormOptions(form),
                errorElement = options.getErrorMessageElement(message, key, form),
                errorInputs = form.find('input[name="'+key+'"], select[name="'+key+'"], textarea[name="'+key+'"]')

            //Scroll on first error element
            if ( options.scrollOnErrorInput === true && errorInputs.length > 0 ) {
                this.scrollOnWrongInput(errorInputs.eq(0), form, options);
            }

            //Add error message element after imput
            if ( options.showInputErrors === true ) {
                errorInputs.each(function(){
                    var addAfter = options.addErrorMessageAfterElement( $(this) ),
                        nextElement = addAfter.next()[0];

                    //If input does not has bffer
                    if ( ! this._addedErrorMesageIntoInput ) {
                        this._addedErrorMesageIntoInput = [];
                    }

                    //If error message has not been already added on this place
                    if ( !nextElement || nextElement.outerHTML !== errorElement ) {
                        addAfter.after(errorElement);
                    }

                    //Add error message into buffer of actual input
                    this._addedErrorMesageIntoInput.push(addAfter.next()[0]);

                    //If form does not have stack with error messages
                    if ( ! form[0]._addedErrorMessages ) {
                        form[0]._addedErrorMessages = [];
                    }

                    form[0]._addedErrorMessages.push(addAfter.next()[0]);
                });
            }

            //Add error class on input parent
            errorInputs
                //If input changes, remove errors
                .on('keyup change', function(e){
                    //On tab and esc does not remove errors
                    if ( [13, 9].indexOf(e.keyCode) > -1 ) {
                        return;
                    }

                    //Remove all input messages
                    if ( this._addedErrorMesageIntoInput ) {
                        for ( var i = 0; i < this._addedErrorMesageIntoInput.length; i++ ) {
                            this._addedErrorMesageIntoInput[i].remove();
                        }

                        //Reset array
                        this._addedErrorMesageIntoInput = [];
                    }

                    options.getInputParentWrapper($(this)).removeClass(autoAjax.core.getClass('inputWrapperErrorClass', form, true));
                });


            //Add error class on input wrapper
            errorInputs.each(function(){
                options.getInputParentWrapper($(this)).addClass(
                    autoAjax.core.getClass('inputWrapperErrorClass', form, true)
                );
            });
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
            autoAjax.core.setLoading(form[0], false);

            //On success response
            if ( [200, 201].indexOf(response.status) > -1 ) {
                this.fireEventsOn([
                    options.success,
                    options.onSuccess,
                    options.globalEvents.success
                ], finalResponse);
            }

            //On validation error
            else if ( response.status == 422 || response.status == 403 ) {
                this.fireEventsOn([
                    options.validation,
                    options.onValidation,
                    options.globalEvents.validation
                ], finalResponse);
            }

            //Other error
            else {
                this.fireEventsOn([
                    options.error,
                    options.onError,
                    options.globalEvents.error
                ], finalResponse);
            }

            //On complete request
            this.fireEventsOn([
                options.complete,
                options.onComplete,
                options.globalEvents.complete
            ], finalResponse);
        },
        /*
         * Set loading status of form
         */
        setLoading(element, status){
            if ( element.vnode && element.vnode.data.on && element.vnode.data.on.loading ) {
                element.vnode.data.on.loading(status);
            }
        },
        /*
         * Get keys from request in correct order by fields position in form
         */
        sortKeysByFormOrder(form, obj){
            var formKeys = form.find('input[name], textarea[name], select[name]')
                               .toArray()
                               .map(field => field.name)
                               .filter(name => name),
                newObjectKeys = Object.keys(obj||[]).sort((a, b) => {
                    return formKeys.indexOf(a) - formKeys.indexOf(b);
                });

            return newObjectKeys;
        }
    },

    setOptions(options){
        autoAjax.core.mergeOptions(autoAjax.options, options);

        return this;
    },

    flushAutoSave(){
        autoSave.flushData();
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
                        submit : on.submit||on.onSubmit,
                        success : on.success||on.onSuccess,
                        error : on.error||on.onError,
                        validation : on.validation||on.onValidation,
                        complete : on.complete||on.onComplete,
                    }, options);

                //Set vnode of element
                el.vnode = vnode;

                vnode.context.$nextTick(() => {
                    $(el).autoAjax(mergedOptions);
                });
            },
            update(el, binding, vnode) {
                //If value has not been changed
                if ( ! binding.oldValue || isEqual(binding.value, binding.oldValue) ) {
                    return;
                }

                el.autoAjaxOptions = autoAjax.core.mergeOptions(el.autoAjaxOptions, binding.value||{})
            }
        });

        Vue.directive('autoReset', {
            bind(el, binding, vnode) {
                vnode.context.$nextTick(() => {
                    el.autoAjaxOptions.autoReset = true
                });
            },
        });

        ['autoAjaxRow', 'bindRow', 'row'].forEach(key => {
            Vue.directive(key, {
                bind(el, binding, vnode) {
                    vnode.context.$nextTick(() => {
                        var options = autoAjax.core.getFormOptions(el);

                        if ( binding.value ) {
                            bindForm.bindRow(el, binding.value, options);
                        }
                    });
                },
                update(el, binding, vnode) {
                    //If row does not have previous value
                    if ( ! binding.oldValue || isEqual(binding.value, binding.oldValue) ) {
                        return;
                    }

                    //If value has been reseted
                    if ( binding.value === null ) {
                        resetsForm.resetForm($(el));
                    }

                    //If row has been changed
                    else {
                        var options = autoAjax.core.getFormOptions(el);

                        bindForm.bindRow(el, binding.value||{}, options);
                    }
                }
            });

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

        var defaultOptions = cloneDeep(autoAjax.options);

        //Bind ajax options into exact form
        this.autoAjaxOptions = Object.assign(autoAjax.core.mergeOptions(defaultOptions, options), {
            status : 'ready',
        });

        //Bind given row data and datepicker
        resetsForm.init(this);

        autoSave.formAutoSave(this, this.autoAjaxOptions);
        bindForm.bindRow(this, null, this.autoAjaxOptions);
        bindForm.bindDatepickers(this);

        /*
         * After submit form
         */
        $(this).submit(function(){
            //Disable send form twice
            if ( this.autoAjaxOptions.status === 'sending' )
                return false;

            var form = $(this);

            this.autoAjaxOptions.status = 'sending';

            autoAjax.core.setLoading(this, true);

            this.scrolledOnWrongInput = false;

            //Fire submit event
            autoAjax.core.fireEventsOn([
                this.autoAjaxOptions.submit,
                this.autoAjaxOptions.onSubmit
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