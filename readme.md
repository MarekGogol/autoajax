# AutoAjax form for Laravel/Vuejs/jQuery apps
This package sends AJAX requests from basic form inputs and manages Laravel ajax validation.


## Installation via NPM
`npm i autoajax --save`

## VueJS Integration

```js
var autoAjax = require('autoajax');

Vue.use(autoAjax);
```

### Initializing autoAjax in VueJS
If you want initialize autoAjax form in VueJS component, you need use `v-autoAjax` directive in form element.
```html
<template>
    <form method="post" action="/contact" v-autoAjax @onSuccess="successEvent" @onValidation="validationEvent" @onError="errorEvent">
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
    ...
  
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

### VueJS Events
#### Receiving success response data on **HTTP 200**
`@success="mySuccessEvent"` or `@onSuccess="mySuccessEvent"`

#### Receiving error response data on **HTTP 500**
`@error="myErrorEvent"` or `@onError="myErrorEvent"`

#### On (laravel) validation error **HTTP 422** or **HTTP 430** error code
`@validation="myValidationErrorEvent"` or `@onValidation="myValidationErrorEvent"`


### PlainJS Integration

## Initializing autoAjax form instance
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
```
