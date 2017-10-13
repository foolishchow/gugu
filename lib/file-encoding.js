const UTF8 = 'utf8';
const UTF8_with_bom = 'utf8bom';
const UTF16be = 'utf16be';
const UTF16le = 'utf16le';
const jschardet = require('jschardet');
const fs = require('fs');
const stream = require('stream');
const readExactlyByFile = function(file /*: string*/ , totalBytes /*: number*/ ) /*: TPromise < ReadResult > */ {
    return new Promise((complete, error) => {
        fs.open(file, 'r', null, (err, fd) => {
            if (err) {
                return error(err);
            }

            function end(err /*: Error*/ , resultBuffer /*: NodeBuffer*/ , bytesRead /*: number*/ )/*: void*/ {
                fs.close(fd, (closeError/*: Error*/) => {
                    if (closeError) {
                        return error(closeError);
                    }

                    if (err && err.code === 'EISDIR') {
                        return error(err);
                        // we want to bubble this error up (file is actually a folder)
                    }

                    return complete({
                        buffer: resultBuffer,
                        bytesRead
                    });
                });
            }

            let buffer = new Buffer(totalBytes);
            let bytesRead = 0;
            let zeroAttempts = 0;

            function loop() {
                fs.read(fd, buffer, bytesRead, totalBytes - bytesRead, null, (err, moreBytesRead) => {
                    if (err) {
                        return end(err, null, 0);
                    }

                    // Retry up to N times in case 0 bytes where read
                    if (moreBytesRead === 0) {
                        if (++zeroAttempts === 10) {
                            return end(null, buffer, bytesRead);
                        }

                        return loop();
                    }

                    bytesRead += moreBytesRead;

                    if (bytesRead === totalBytes) {
                        return end(null, buffer, bytesRead);
                    }

                    return loop();
                });
            }

            loop();
        });
    });
}
const MINIMUM_THRESHOLD = 0.2;
const IGNORE_ENCODINGS = ['ascii', 'utf-8', 'utf-16', 'utf-32'];
const getEncoding = function(file) {
    return readExactlyByFile(file, 16)
        .then(({
            buffer,
            bytesRead
        }) => {
            jschardet.Constants.MINIMUM_THRESHOLD = MINIMUM_THRESHOLD;

            const guessed = jschardet.detect(buffer);
            if (!guessed || !guessed.encoding) {
                return Promise.resolve('binary');
            }

            const enc = guessed.encoding.toLowerCase();
            // console.info(enc)
            // Ignore encodings that cannot guess correctly
            // (http://chardet.readthedocs.io/en/latest/supported-encodings.html)
            if (0 <= IGNORE_ENCODINGS.indexOf(enc)) {
                return Promise.resolve('utf8');
            }
            return Promise.resolve('binary')
        })
}

module.exports = getEncoding;