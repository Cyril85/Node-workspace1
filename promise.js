var promise =new Promise((resolve,reject)=>{
    setTimeout(()=>{
        resolve('It worked');
    },2000);
   // reject('It failed');
});
promise.then((message)=>{
    console.log('Done :',message);
},(message)=>{
    console.log('Done2  :',message);
});