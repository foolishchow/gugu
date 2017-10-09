const Stream = require('stream'),
    fs = require('fs'),
    fsExtra = require('fs-extra'),
    path = require('path'),
    gs = require('glob-stream'),
    gw = require('glob-watcher'),
    colors = require('colors'),
    Through = require('./lib/through');
const date = () => {
    let d = new Date;
    let to2 = val => ((100 + val) / 100).toFixed(2).replace(/^[0-9]+\./gi, '')
    return colors.grey(`${to2(d.getHours())}:${to2(d.getMinutes())}:${to2(d.getSeconds())}`);
}
module.exports = {};

/**
 * create an Stream.Transform with your configurated {transform} and {flush}
 * @param {Function} transform
 * @param {Function|undefined} flush
 */
const through = function(transform, flush = c => c()) {
    let _t = new Through({ transform, flush })
    _t.on('finish', () => {
        process.nextTick(() => {
            _t = undefined;
        });
    });
    return _t;
}
module.exports.through = through;

/**
 * source globs to Stream.Transform
 *      returns an Stream.Transform with two events
 *          'before'  emited before this begin
 *          'after'   emited after this finished
 * @param {String|Array<String>} globs
 * @return Object
 */
module.exports.src = function(globs) {
    let transform = function(chunk, encoding, callback) {
        try {
            if (fs.statSync(chunk.path).isDirectory()) {
                chunk.type = 'dir';
                this.push(chunk);
                callback();
                return;
            }
            fs.readFile(chunk.path, encoding, (err, data) => {
                if (err) {
                    console.info(err.stack);
                    data = new Buffer('', encoding);
                }
                chunk.fileName = path.relative(chunk.base, chunk.path);
                chunk.content = new Buffer(data, encoding);
                this.push(chunk);
                callback();
            })
        }catch(e){
            // this.push(chunk);
            callback();
        }

    };
    return gs(globs).pipe(through(transform))
}
/**
 * middleware  pass the Stream to dest
 * @param {String} dest
 * @return Stream
 */
const dest = function(dest) {
    let transform = function(chunk, encoding, callback) {
        let fileName = path.join(dest, chunk.fileName),
            mode = chunk.mode || 0o666;
        fsExtra.ensureFile(fileName)
            .then(() => {
                fs.writeFile(fileName, chunk.content, { encoding, mode }, (err) => {
                    if (err) console.info(err.stack);
                    this.push(chunk)
                    callback();
                })
            })
            .catch(err => {
                if (err) {
                    console.info(err.stack);
                    this.push(chunk)
                    callback();
                    return;
                }
            })
    };
    return through(transform);
}
module.exports.dest = dest;
/**
 * rename the fileName
 * @param {String|Function} cb
 * @return
 */
const rename = function(cb) {
    let transform = function(chunk, encoding, callback) {
        switch (typeof cb) {
            case 'function':
                cb(chunk);
                break;
            case 'string':
                chunk.fileName = cb;
                break;
            default:
                '';
        }
        this.push(chunk)
        callback();
    };
    return through(transform);
}
module.exports.rename = rename;

/**
 * delete file async
 * if cb is null delete all pass throughed chunk
 * @param {Function} cb
 */
const remove = function(cb) {
    let remove = function(chunk) {
        return new Promise((resolve, reject) => {
            if (!fs.existsSync(chunk.path)) {
                resolve();
                return;
            }
            fsExtra.remove(chunk.path, err => {
                if (err) {
                    console.info(err.stack);
                    reject(err.stack)
                }
                resolve();
            })
        });
    }
    let transform = function(chunk, encoding, callback) {
        if (typeof cb == 'function') {
            cb(chunk, (remove) => {
                if (remove) {
                    remove(chunk).then(a => {
                        this.push(chunk)
                        callback();
                    })
                }
            })
        } else {
            remove(chunk).then(a => {
                this.push(chunk)
                callback();
            })
        }
    };
    return through(transform);
}
module.exports.remove = remove;
const getArgvs = function(argv) {
    // add depends
    if (typeof argv[0] == 'function') argv.unshift([]);

    if (argv.length == 1) argv.push(function() {});
    if (argv.length == 2) argv.push({ before: '', after: '' });
    if (typeof argv[0] == 'string') argv[0] = [argv[0]];
    return argv;
}


const taskMap = new Map();

const task = function(name, ...argv) {
    getArgvs(argv)
    let [depends, cb, options] = argv;
    taskMap.set(name, {
        depends,
        cb,
        options
    })
}
module.exports.task = task;

const dispatchWatch = (task, done) => {
    let { depends, cb, options } = task;
    depends = [].concat(depends);
    let runner = () => {
        runTask(depends.shift()).then(() => {
            if (depends.length > 0) {
                runner()
            } else {
                run(task, done);
            }
        })
    }
    if (depends.length > 0) {
        runner();
    } else {
        run(task, done);
    }
}
const watch = function(globs, ...argv) {
    getArgvs(argv)
    let [depends, cb, options] = argv;
    gw(globs, function(done) {
        dispatchWatch({ depends, cb, options }, done);
    })
}
module.exports.watch = watch;

const log = function(obj) {
    console.info(`[${date()}] ${colors.cyan(obj)}`)
}

module.exports.log = log;

const taskCaller = function(callback) {
    if (callback && typeof callback == 'function') {
        let result = callback(log);
        if (result) console.info(`[${date()}] ${colors.cyan(result)} `);
    } else if (callback && typeof callback == 'string') {
        console.info(`[${date()}] ${colors.cyan(callback)} `);
    }
}
const run = function(taskConfig, next) {
    let { cb, options } = taskConfig;
    let { after, before } = options;
    let doAfter = () => {
        taskCaller(after);
        next();
    }
    taskCaller(before);
    let result = cb();
    if (result instanceof Through) {
        result.on('finish', () => doAfter())
    } else if (result instanceof Promise) {
        result.then(() => doAfter())
    } else {
        doAfter();
    }
}

const runTask = function(task) {
    let taskConfig = taskMap.get(task),
        depends = taskConfig.depends.concat([]);
    let now = +new Date;
    let next, promise = new Promise((resolve, reject) => {
        next = () => {
            let cost = +new Date - now;
            cost = cost > 1000 ? `${(cost / 1000).toFixed(2)}s` : `${cost}ms`;
            console.info(`[${date()}] Finished ${colors.blue(`'${task}'`)} after ${colors.cyan(cost)}`);
            resolve();
        }
    })
    console.info(`[${date()}] Starting ${colors.blue(`'${task}'`)} ...`)
    if (depends.length == 0) {
        run(taskConfig, next)
    } else {
        let runner = () => {
            runTask(depends.shift()).then(() => {
                if (depends.length > 0) {
                    runner()
                } else {
                    run(taskConfig, next);
                }
            })
        }
        runner();
    }
    return promise;
}
module.exports.run = runTask;


module.exports.logger = function(CB) {
    let transform = function(c, e, cb) {
        CB(c, e, cb)
        cb(c);
    }
    return through(transform);
}
Object.defineProperty(module.exports, 'zip', {
    get() {
        return require('./zip')
    },
    set() {}
});

Object.defineProperty(module.exports, 'gzip', {
    get() {
        return require('./gzip')
    },
    set() {}
});