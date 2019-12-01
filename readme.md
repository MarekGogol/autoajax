# AutoAjax form for Laravel/Vuejs/jQuery apps
This package sends AJAX requests from basic form inputs and manages Laravel ajax validation.

### Installation via NPM
`npm i autoajax --save`

### Basic installation
```html
<!-- jQuery and jQuery form -->
<script src="https://code.jquery.com/jquery-2.2.4.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery.form/3.50/jquery.form.min.js"></script>

<!-- autoAjax.min.js -->
<script src="js/autoAjax.min.js"></script>
```

## VueJs Integration
```js
var autoAjax = require('autoajax');

Vue.use(autoAjax);
```

### Initializing autoAjax form in VueJS
If you want initialize autoAjax form in VueJS component, you need use `v-autoAjax` directive in form element.
```html
<template>
    <form method="post" action="/contact" v-autoAjax="formOptions" @onSuccess="successEvent" @onValidation="validationEvent" @onError="errorEvent">
        <div class="form-group">
            <input type="text" name="email">
        </div>
        <div class="form-group">
            <textarea name="content"></textarea>
        </div>
        <div class="form-group">
            <button type="submit">submit form</button>
        </div>
    </form>
</template>

<script>
export default {
    data: {
        formOptions : {
            //...
        }
    },
  
    methods: {
        successEvent(data, response) {
            console.log(data, response);
        },
        errorEvent(data, response) {
            console.log(data, response);
        },
        validationEvent(data, response) {
            console.log(data, response);
        }
    }
}
</script>
```

### VueJs directives
#### Form initialization
Basic autoAjax form initialization you can bind with:
```html
<form v-autoAjax></form>
```

For custom form options you can use directive with options parameter like:
```html
<form v-autoAjax="myFormOptions"></form>
```

#### Automatically reset input values on success response
`<form v-autoAjax v-autoReset></form>`

### VueJs Events
This is list of available form events. Need to be placed in <form> element.


#### On every form submit
`@submit="mySubmitEvent"` or `@onSubmit="mySubmitEvent"`

#### Receiving success response data on **HTTP 200**
`@success="mySuccessEvent"` or `@onSuccess="mySuccessEvent"`

#### Receiving error response data on **HTTP 500**
`@error="myErrorEvent"` or `@onError="myErrorEvent"`

#### On (laravel) validation error **HTTP 422** or **HTTP 430** error code
`@validation="myValidationErrorEvent"` or `@onValidation="myValidationErrorEvent"`


## Plain JavaScript Integration

### Initializing autoAjax form instance in plain JS
If you want initialize autoAjax form, you need use `autoAjax` class on form element.
```html
<form method="post" action="/contact" class="autoAjax">
    <div class="form-group">
        <input type="text" name="email">
    </div>
    <div class="form-group">
        <textarea name="content"></textarea>
    </div>
    <div class="form-group">
        <button type="submit">submit form</button>
    </div>
</form>

<script>
$(function(){
    var options = {
        //...
        events : {
            onSubmit : function(data, response){},
            onSuccess : function(data, response){},
            onError : function(data, response){},
            onValidation : function(data, response){},
        },
    };
    
    $('form.autoAjax').autoAjax(options)
});
</script>
```

## AutoAjax Options and properties
AutoAjax options can be applied in VueJs directive `v-autoAjax="myOptions"` or in jQuery initialization autoAjax on form element `$('#myForm').autoAjax({ ... })`

```js
var options = {
    //Automaticaly add validation errors to each input
    autoValidationErrors : true,
    
    messages : {
        error : 'Something went wrong, please try again later.',
        validation: 'Please fill all required fields.',
    },
    
    events : {
        onSubmit() => {},
        onSuccess() => {},
        onError() => {},
        onValidation() => {},
    }
}
```
