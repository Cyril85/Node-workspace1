const express = require('express');
const hbs = require('hbs');
const fs=require('fs');

var app = new express();
hbs.registerPartials(__dirname+'/views/partials');
app.set('view engine','hbs');
hbs.registerHelper('currentYear',()=>{return new Date().getFullYear()});
hbs.registerHelper('capitalise',(text)=>{return text.toUpperCase()});
//app.use((req,res,next)=>{ res.send('Under maintenance')});

app.get('/', (req, res) => {
    res.render('index.hbs',{site_name:'express trial'});
});

app.listen(3000,()=>{
    console.log('Server started listening on 3000');
});