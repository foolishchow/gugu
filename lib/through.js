const Stream = require('stream');

class Through extends Stream.Transform {
    constructor({ transform, flush }) {
        super({ objectMode: true });
        this.transform = transform;
        this.flush = flush;
        this.index = -1;
        // this.id = ~~(Math.random()*Math.random()*Math.random()*10000);
    }

    _transform(chunk, encoding, callback) {
        if (this.index == -1) { this.emit('before'); this.index = 1; }
        this.transform.call(this, chunk, encoding, (data)=>{
            if(this._readableState.pipesCount > 0 && data != undefined) this.push(data)
            callback();
        });
    }

    push(chunk){
        if(this._readableState.pipesCount > 0 ) return super.push(chunk);
    }
    _flush(callback) {
        this.flush.call(this, callback);
    }

    promise() {
        this._promise = this._promise || new Promise((resolve, reject) => {
            this.on('finish', () => {
                this.emit('after');
                resolve();
            });
            this.on('error',err=>reject())
        })
        return this._promise;
    }
}

module.exports = Through;
