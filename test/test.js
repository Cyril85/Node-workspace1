var request=require('supertest');
var expect=require('expect');

var app=require('./../app_express').app;

it('should return 200 response',(done)=>{
    request(app)
        .get('/')
        .expect(200)
        .end(done);
});



function myFunction (a,b){
    return a+b;
}
var myFunction =(a,b)=>{a+b};

a={
    a:"a",
    b:"b"
}
a{a,b}