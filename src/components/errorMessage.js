class errorMessage {
    constructor(autoAjax, options, form, key, message){
        this.autoAjax = autoAjax;
        this.form = form;
        this.key = key;
        this.message = message;
        this.options = options;
    }

    getErrorInputElement(options, element){
        let addAfterElement = options.addErrorMessageAfterElement(element);

        return Array.isArray(addAfterElement) ? addAfterElement : [ addAfterElement ];
    }

    /*
     * Set input error message
     */
    setErrorMessage(){
        let options = this.options,
            key = this.key,
            form = this.form,
            autoAjax = this.autoAjax;

        var errorInputs = form.find([
                'input[name="'+key+'"], select[name="'+key+'"], textarea[name="'+key+'"]',
                'input[name="'+key+'[]"], select[name="'+key+'[]"], textarea[name="'+key+'[]"]',
            ].join(', '))

        //Scroll on first error element
        if ( options.scrollOnErrorInput === true && errorInputs.length > 0 ) {
            let addAfterElement = this.getErrorInputElement(options, errorInputs.eq(0));

            this.scrollOnWrongInput(
                addAfterElement,
                form,
                options
            );
        }

        //Add error message element after imput
        this.handleErrorInputMessages(errorInputs, options)

        //Add error class on input parent
        this.handleErrorInputChange(errorInputs, options);

        //Add error class on input wrapper
        errorInputs.each(function(){
            options.getInputParentWrapper($(this)).addClass(
                autoAjax.core.getClass('inputWrapperErrorClass', form, true)
            );
        });
    }

    handleErrorInputMessages(errorInputs, options){
        if ( options.showInputErrors !== true ) {
            return;
        }

        let form = this.form,
            errorElement = options.getErrorMessageElement(this.message, this.key, form),
            _this = this;

        errorInputs.each(function(){
            var addAfterElement = _this.getErrorInputElement(options, $(this));

            for ( var i = 0; i < addAfterElement.length; i++ ) {
                let addAfter = addAfterElement[i],
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
            }
        });
    }

    handleErrorInputChange(errorInputs, options){
        let autoAjax = this.autoAjax,
            form = this.form;

        //If input changes, remove errors
        errorInputs.on('keyup change', function(e){
            //On tab and esc does not remove errors
            if ( e.keyCode && [13, 9].indexOf(e.keyCode) > -1 ) {
                return;
            }

            //We want remove all errors for input on multiple places. For example multiple checkbox.
            errorInputs.each(function(){
                //Remove all input messages
                if ( this._addedErrorMesageIntoInput ) {
                    for ( var i = 0; i < this._addedErrorMesageIntoInput.length; i++ ) {
                        this._addedErrorMesageIntoInput[i].remove();
                    }

                    //Reset array
                    this._addedErrorMesageIntoInput = [];
                }

                //Remove parent error class
                options.getInputParentWrapper(
                    $(this)).removeClass(autoAjax.core.getClass('inputWrapperErrorClass', form, true)
                );
            });

        });
    }

    /*
     * Scroll on wrong input field an select it
     */
    scrollOnWrongInput(elements, form, options){
        //We want support scroll on one of the multiple visible error element indicators
        for ( let i = 0; i < elements.length; i++ ) {
            let element = elements[i];

            if ( element.length == 0 || form[0].scrolledOnWrongInput === true ) {
                continue;
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
                    continue;
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
                && ['text', 'email', 'number', 'phone', 'date', 'password', 'range', 'checkbox'].indexOf(element.attr('type')) > -1 //If is text input
                && !(activeElement && (activeElement._addedErrorMesageIntoInput||[]).length > 0) //If is not select error input already
            ) {
                element.focus()
            }

            break;
        }

        form[0].scrolledOnWrongInput = true;
    }

    getFieldScrollPosition(element, options){
        var top = element.offset().top,
            offset = options.errorInputScrollOffset;

        //Scroll offset can be dynamic function which returns number.
        //Because sometimes for mobile version, we want other offset.
        if ( typeof offset == 'function' ) {
            offset = offset();
        }

        return top > offset ? top - offset : top;
    }
};

export default errorMessage;