import storage from './storage';

var autoSave = {
    getXPathForElement(el, disableIDEngine) {
        var names = [];

        while (el.parentNode) {
            if (el.id && disableIDEngine !== true) {
                names.unshift('#' + el.id);
                break;
            } else {
                if (el == el.ownerDocument.documentElement) {
                    names.unshift(el.tagName);
                } else {
                    for (
                        var c = 1, e = el;
                        e.previousElementSibling;
                        e = e.previousElementSibling, c++
                    );
                    names.unshift(el.tagName + ':nth-child(' + c + ')');
                }
                el = el.parentNode;
            }
        }

        if (names.length <= 0 || names[0] == '') {
            return;
        }

        //Fix proti fake elementom ktore nie su realne v dokumnte
        if (names[0].substr(0, 1) != '#' && names[0].toLowerCase() != 'html') {
            return;
        }

        return names.join(' > ');
    },
    getFormKey(form, options) {
        var path = location.pathname + this.getXPathForElement(form),
            autoSaveKey =
                typeof options.autoSave == 'function'
                    ? options.autoSave(form)
                    : options.autoSave,
            autoSaveKey = typeof autoSaveKey == 'boolean' ? '' : autoSaveKey;

        return btoa(autoSaveKey + path);
    },
    getFormData(form, options) {
        if (options.autoSave == false) {
            return;
        }

        var formPath = this.getFormKey(form, options);

        return storage.get(formPath);
    },
    formAutoSave(form, options) {
        //If autoSave is disabled
        if (options.autoSave == false) {
            return;
        }

        var formPath = this.getFormKey(form, options),
            timeout;

        $(form).on('change keyup', () => {
            if (timeout) {
                clearTimeout(timeout);
            }

            //Update changes only per 100ms
            timeout = setTimeout(() => {
                var formData = $(form).serializeArray(),
                    data = {};

                for (var key in formData) {
                    if (
                        (options.autoSaveSkip || []).indexOf(
                            formData[key].name
                        ) == -1
                    ) {
                        data[formData[key].name] = formData[key].value;
                    }
                }

                storage.put(formPath, data);
            }, 100);
        });
    },
    flushData() {
        storage.flush();
    },
};

export default autoSave;
