const express = require('express');
const hbs = require('hbs');
const fs = require('fs');

var app = new express();
var port = process.env.PORT || 3000;
hbs.registerPartials(__dirname + '/views/partials');
app.set('view engine', 'hbs');
hbs.registerHelper('currentYear', () => {
    return new Date().getFullYear()
});
hbs.registerHelper('capitalise', (text) => {
    return text.toUpperCase()
});
//app.use((req,res,next)=>{ res.send('Under maintenance')});

app.get('/', (req, res) => {
    res.status(200).render('index.hbs', {site_name: 'express trial'});
});

app.get('/weather', (req, res) => {
    res.render('weather.hbs', {site_name: 'express trial'});
});
app.listen(port, () => {
    console.log('Server started listening on ', port);
});

module.exports.app=app;