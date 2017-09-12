const fs = require('fs'),
    fsExtra = require('fs-extra'),
    path = require('path'),
    Stream = require('stream'),
    jszip = require('jszip'),
    matchedStream = require('./lib/matched-stream');

class zipSource extends matchedStream{
    constructor(globs){
        super(globs);
        this.totalMatched = 0;
        this.totalReaded = 0;
    }

    __read(zip) {
        this.zip = zip;
        zip.forEach((relativePath, file) => {
            let matched = this.isMacth(relativePath);
            if (matched && !file.dir) {
                this.totalMatched++;
                let chunk = {
                    path:relativePath ,
                    base:matched,
                    file: this.file,
                    cwd: process.cwd(),
                    fileName: path.relative(matched,relativePath)
                };
                this.getContent(chunk);
            }
        });
    }

    getContent(chunk){
        this.zip.file(chunk.path)
            .async('nodebuffer')
            .then((data)=>{
                chunk.content = data;
                this.totalReaded++;
                this._cache(chunk);
                if(this.totalMatched == this.totalReaded){
                    this.readding = 1;
                    this.checkEnd();
                }
            });
    }

    readFile(file){
        this.file = file;
        let content = fs.readFileSync(file);
        let zip = new jszip();
        zip.loadAsync(content).then(() => {
            this.__read(zip);
        });
    }

}
const src = function (file, globs) {
    if (typeof globs == 'string') globs = [globs];
    let source = new zipSource(globs);
    source.readFile(file);
    return source;
}
module.exports = src;
module.exports.src = src;
