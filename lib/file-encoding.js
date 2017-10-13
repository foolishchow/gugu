//
let BINARYS = ['.woff', '.ttf', '.eof', '.jpg','.jpeg','.png']
module.exports = function(ext) {
    if (BINARYS.indexOf(ext) > -1) return 'binary';
    return 'utf-8';
}