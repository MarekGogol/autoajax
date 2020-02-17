var storage = {
    key : 'autoAjax',

    get(key){
        var data = localStorage.getItem(this.key),
            data = JSON.parse(data||'{}');

        return key ? data[key] : data;
    },

    put(key, data){
        var storage = this.get();

        storage[key] = data;

        localStorage.setItem(this.key, JSON.stringify(storage));
    },

    flush(){
        localStorage.removeItem(this.key);
    }
};

export default storage;