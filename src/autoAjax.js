import cloneDeep from 'lodash.clonedeep';
import isEqual from 'lodash.isequal';
import resetsForm from './components/resetsForm';
import bindForm from './components/bindForm';
import errorMessage from './components/errorMessage';
import autoSave from './components/autoSave';

var autoAjax = {
    options : {
        //Auto reset form on success
        autoReset : false,

        //Automatically save all unsaved form changed
        autoSave : false,

        //Skip fields from autosave
        autoSaveSkip : ['g-recaptcha-response'],

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

        onCreate(form){ },
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

        //Find form keys by
        findFormField(form, key){
            let selectors = [
                'input[name="'+key+'"], select[name="'+key+'"], textarea[name="'+key+'"]',
                'input[name="'+key+'[]"], select[name="'+key+'[]"], textarea[name="'+key+'[]"]',
            ].join(', ');

            var formId = form.attr('id'),
                //Find input in existing form
                input = form.find(selectors);

            if ( input.length == 0 && formId ){
                //Find input in whole document, assigned to form elsewhere in document by form="" attribute
                input = $(document).find(selectors).filter(function(){
                    return this.getAttribute('form') == formId;
                });
            }

            return input;
        },

        //Global callback events for every form, such as validation, error handling etc...
        globalEvents : {
            success : [
                (data, response, form) => {
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
            ],
            error : [
                (data, response, form) => {
                    var obj = response.responseJSON,
                        options = autoAjax.core.getFormOptions(form);

                    if ( options.showMessage === true ) {
                        autoAjax.core.setMessage(form, obj ? obj.message||options.messages.error : options.messages.error, 'error');
                    }
                },
            ],
            validation : [
                (data, response, form) => {
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

                            (new errorMessage(autoAjax, options, form, key, message)).setErrorMessage();
                        }

                        //Show validation message alert
                        if ( options.showMessage === true && options.showValidationMessage === true ) {
                            autoAjax.core.setMessage(form, options.messages.validation, 'error');
                        }
                    }
                },
            ],
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
                if ( typeof newOptions[k] === 'object' && !newOptions[k].length ) {
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
        /*
         * Show modal with callback
         */
        showModal(response){
            modal.show(response);
        },
        fireEventsOn(functions, parameters){
            for ( var i = 0; i < functions.length; i++ ) {
                let callbacks = functions[i];

                if ( callbacks ) {
                    if ( typeof callbacks == 'function' ) {
                        callbacks(...parameters);
                    } else if ( typeof callbacks == 'object' ){
                        callbacks = callbacks.filter(item => item);

                        for ( var a = 0; a < callbacks.length; a++ ){
                            callbacks[a](...parameters);
                        }
                    }
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
            if ( !element.vnode ){
                return;
            }

            let props = element.vnode && element.vnode.data ? element.vnode.data.on : element.vnode.props;

            if ( props && (props.loading||props.onLoading) ) {
                props[props.loading ? 'loading' : 'onLoading'](status);
            }
        },
        getFormKeyIndex(formKeys, key){
            var index;

            //Find basic key, or multiple field name[]
            index = formKeys.indexOf(key);
            index = index == -1 ? formKeys.indexOf(key+'[]') : index;
            if ( index !== -1 ){
                return index;
            }

            //If field has not been found, we want scroll to this field at the last position
            return 9999;
        },
        /*
         * Get keys from request in correct order by fields position in form
         */
        sortKeysByFormOrder(form, obj){
            var formKeys = form.find('input[name], textarea[name], select[name]')
                               .toArray()
                               .map(field => field.name)
                               .filter(name => name);

            var newObjectKeys = Object.keys(obj||[]).sort((a, b) => {
                return this.getFormKeyIndex(formKeys, a) - this.getFormKeyIndex(formKeys, b);
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
     * Add support for vuejs 2 and vuejs 3
     */
    tryNextTick(vnode, callback){
        if ( vnode.context ){
            vnode.context.$nextTick(callback);
        } else {
            callback();
        }
    },

    /**
     * Vuejs 2/3 callback
     */
    onMounted(callback){
        return {
            bind : callback,
            mounted : callback,
        };
    },

    /**
     * Vuejs 2/3 callback
     */
    onUpdated(callback){
        return {
            update : callback,
            updated : callback,
        };
    },

    /*
     * Create installable vuejs package
     */
    install(Vue, options){
        Vue.directive('autoAjax', {
            ...autoAjax.onMounted((el, binding, vnode, oldVnode) => {
                var options = binding.value||{},
                    on = vnode.data ? vnode.data.on||{} : vnode.props,
                    mergedOptions = autoAjax.core.mergeOptions({
                        //Bind Vuejs events
                        submit : [on.submit, on.onSubmit, on.onOnSubmit, autoAjax.options.submit],
                        success : [on.success, on.onSuccess, on.onOnSuccess, autoAjax.options.success],
                        error : [on.error, on.onError, on.onOnError, autoAjax.options.error],
                        validation : [on.validation, on.onValidation, on.onOnValidation, autoAjax.options.validation],
                        complete : [on.complete, on.onComplete, on.onOnComplete, autoAjax.options.complete],
                    }, options);

                //Set vnode of element
                el.vnode = vnode;

                autoAjax.tryNextTick(vnode, () => {
                    $(el).autoAjax(mergedOptions);
                });
            }),
            ...autoAjax.onUpdated((el, binding, vnode) => {
                //If value has not been changed
                if ( ! binding.oldValue || isEqual(binding.value, binding.oldValue) ) {
                    return;
                }

                el.autoAjaxOptions = autoAjax.core.mergeOptions(el.autoAjaxOptions, binding.value||{})
            })
        });

        Vue.directive('autoReset', {
            ...autoAjax.onMounted((el, binding, vnode) => {
                autoAjax.tryNextTick(vnode, () => {
                    el.autoAjaxOptions.autoReset = true
                });
            }),
            ...autoAjax.onUpdated((el, binding, vnode) => {
                if ( el.autoAjaxOptions ) {
                    el.autoAjaxOptions.autoReset = binding.value === false ? false : true;
                }
            }),
        });

        ['autoAjaxRow', 'bindRow', 'row'].forEach(key => {
            Vue.directive(key, {
                ...autoAjax.onMounted((el, binding, vnode) => {
                    autoAjax.tryNextTick(vnode, () => {
                        var options = autoAjax.core.getFormOptions(el);

                        if ( binding.value ) {
                            bindForm.bindRow(el, binding.value, options);

                            //Bind form also second time after 100ms, because Vuejs may not be ready yet. So we may try bind again...
                            //This happens when in form we have sub components with slots. (2 nested slots),
                            //then value in slot will not be ready on mounted state.
                            setTimeout(() => {
                                bindForm.bindRow(el, binding.value, options);
                            }, 50);
                        }
                    });
                }),
                ...autoAjax.onUpdated((el, binding, vnode) => {
                    //If row does not have previous value
                    if ( isEqual(binding.value, binding.oldValue) ) {
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
                })
            });

        })
    },
    jQueryDirective(_window){
        if ( !_window || !(typeof _window == 'object') ){
            return;
        }

        _window.$.fn.autoAjax = function(options){
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
                bindForm.init(this);

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

                //Fire autoAjax init event
                autoAjax.core.fireEventsOn([
                    this.autoAjaxOptions.create,
                    this.autoAjaxOptions.onCreate,
                ], [$(this)]);
            });
        };
    }
}

export default autoAjax;