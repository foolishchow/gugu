const fs = require('fs'),
    path = require('path'),
    Stream = require('stream'),
    matchedStream = require('./lib/matched-stream'),
    zlib = require('zlib'),
    tar = require('tar-stream');

const cachedZipBuffer = new Map();
class gzipContent extends Stream.Transform{
    constructor(){
        super()
        this.content = new Buffer('');
    }
    _transform(chunk,encoding,callback){
        this.content = Buffer.concat([this.content,chunk]);
        callback();
    }
    _flush(callback){
        callback();
    }
}
class zipSource extends matchedStream{
    constructor(globs){
        super(globs)
        this.init();
    }

    readFile(file){
        this.file = file;
        let source = fs.createReadStream(file);
        source
        .pipe(zlib.createGunzip())
        .pipe(this.extract)
    }
    init(){
        let extract = tar.extract();
        extract.on('entry', (header, stream, next) =>{
            let matched = this.isMacth(header.name);
            if(matched && header.type == 'file'){
                let file = new gzipContent();
                file.path = header.name;
                file.base = matched;
                file.cwd = process.cwd();
                file.node = header.mode;
                file.fileName = path.relative(file.base, file.path);
                stream.on('end', () =>{
                    this._cache(file)
                    next() // ready for next entry
                })
                stream.pipe(file);
                stream.resume()
            }else{
                stream.on('end', function() {
                  next() // ready for next entry
                })
                stream.resume()
            }
        })
        extract.on('finish', () => {
            this.readding = 1;
            this.checkEnd();
        })
        extract.on('error',err=>{
            console.info(err);
            this.emit('error',err);
        })
        this.extract = extract;
    }
}

const src = function (file, globs) {
    if (typeof globs == 'string') globs = [globs];
    let source = new zipSource(globs);
    source.readFile(file)
    return source;
}

module.exports = src;
module.exports.src = src;
