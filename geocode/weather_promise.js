const request = require('request');

var getWeather=(lat,lng)=>{
    return new Promise((resolve,reject)=>{
        var url='https://api.darksky.net/forecast/c7647aa0177462fad568fef774d20f91/'+lat+','+lng;
        request({
            uri:url,
            json:true
        },(error,response,body)=>{
            if(error|response.statusCode!==200)
            reject('Error fetching weather details');
            else
                resolve(`Temperature is ${body.currently.temperature}. It feels like ${body.currently.apparentTemperature}`);
        });
    });
};
module.exports.getWeather=getWeather;