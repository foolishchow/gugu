const Stream = require('stream'),
    minimatch = require('minimatch'),
    globBase = require('glob-base');
class matchedStream extends Stream.Readable{
    constructor(globs){
        super({ objectMode: true })
        this.negate = globs.filter(g => g.startsWith('!'));
        this.gate = globs.filter(g => !g.startsWith('!')).map(g=>{return {base:globBase(g).base,glob:g}});
        this.chunks = [];
        this.readding = 0;
        this.pause();
        this.needPush = 0;
    }

    _read(size){
        // console.info(`totalMatched:${this.totalMatched} \n totalReaded:${this.totalReaded} \n chunks:${this.chunks.length}`)
        if( this.chunks.length > 0){
            this.resume();
            let c = this.chunks.shift();//this.chunks[0];
            if(!this.push(c)) this.pause();
        }else if(this.readding == 1 && this.chunks.length == 0){
            this.push(null);
        }else{
            this.pause();
            this.needPush++;
        }
    }

    _cache(chunk){
        this.chunks.push(chunk);
        if(this.needPush){
            this.resume();
            this.push(this.chunks.shift());
            this.needPush--;
        }
    }
    checkEnd(){
        if(this.readding == 1 && this.chunks.length == 0 && this.needPush){
            this.push(null);
            this.emit('end');
        }
    }
    isMacth(_path){
        let negate = this.negate.some(n=>!minimatch(_path, n));
        if(negate) return '';
        let matched = this.gate.filter(g=>minimatch(_path, g.glob, { matchBase: true }));
        if(matched.length > 0) return matched[0].base;
        return '';
    }
}

module.exports = matchedStream;
