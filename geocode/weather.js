const request = require('request');

var getWeather=(lat,lng,callBack)=>{
    var url='https://api.darksky.net/forecast/c7647aa0177462fad568fef774d20f91/'+lat+','+lng;
  request({
      uri:url,
      json:true
  },(error,response,body)=>{
      var message=(error|response.statusCode!==200)?{status:'failure',details:'Unable to fetch weather details'}:{status:'success',details:{temperature:body.currently.temperature,apparentTemperature:body.currently.apparentTemperature}};
      callBack(message);
  });
};
module.exports.getWeather=getWeather;