const bcrypt = require('bcrypt');

var generatehash=function (p){
    return new Promise((resolve,reject)=>{
        bcrypt.genSalt(10,(err,salt)=>{
            if(err) reject(err);
            bcrypt.hash(p,salt,(err,hash)=>{
                if(err) reject(err);
                else resolve(hash);
            });
        });
    });
};

var validatePassword=function(p,h){
    return new Promise((resoleve,reject)=>{
        bcrypt.compare(p,h,(err,status)=>{
            if(err) reject(false);
            else
                resoleve(status);
        });
    });
};

var passWord = 'Password@1234';
generatehash(passWord).then((data)=>{
    console.log(`hash value is ${data}`);
    //data='$2a$10$ggbdFcHqLBdHqNu5vfgheO3yrxVoY8rXA6IyZTebg7MyuF7piEKOb';
    validatePassword(passWord,data).then((status)=>{console.log(`Password validation status is  ${status}`);}).catch((e)=>{console.log(e);});
}).catch((e)=>{console.loge(e);});



