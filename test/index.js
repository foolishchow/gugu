const gugu = require('../')

gugu.src('./source/**/*.*')
.pipe(gugu.dest('./_source/'))