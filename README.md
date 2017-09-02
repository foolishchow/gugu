# gugu
---
> similar to `gulp` 
just write to some specify sence to use Steam.pipe easier

- ## API
    ```javascript
    gugu.src(globs)
        .pipe(gugu.rename((chunk)=>{
            //...
        }))
        .pipe(gugu.dest('path'))
    ```
    - src
    ```javascript
    gugu.src(globs)
    ```
    - dest
    ```javascript
    gugu.dest('path')
    ```
    - rename   
    require an callBack or string 
    ```javascript
    gugu.rename()
    ```
    - remove   
    require an callBack or null   
    if callBack  delete the file when returns true  
    if null delete the file
    ```javascript
    gugu.remove(function(chunk){
        return true;
    })
    ```
    - task
    ```javascript
    gugu.task('taskName',['depend1','depend2'],function(){
        //return gugu.through | Promise | async
    },options)
    ```
    - run
    ```javascript
    gugu.run('taskName')
    ```
    - watch
    ```javascript
    gugu.watch(globs,['depend1','depend2'],function(){
        //return gugu.through | Promise | async
    })
    ```

    - through
    ```javascript
    let transform = function(chunk,encoding,callback){
        // no arrow function 
        // gugu would pass an new instance to you
        // do sth
        this.push(chunk)
        callback();
    };
    let flash = function(callback){
        // do sth
        callback();
    };
    gugu.through(transform,flash)
    ```


 - about task options
 ```
    options = {
        before:'sth',
        before(log){
            log('sth')
        },
        after:'sth',
        after(log){
            log('sth')
        },
    }
 ```



