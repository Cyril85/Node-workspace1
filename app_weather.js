const yargs = require('yargs');

const geoCode=require('./geocode/geocode_promise');
const weather=require('./geocode/weather_promise');

var argv = yargs.options({
    a: {
        describe: 'Address',
        demand: true,
        alias: 'address',
        string: true
    }
})
    .help()
    .alias('help', 'h')
    .argv;

/*
geoCode.getLocationDetails(argv.a,(data)=>{
    console.log(JSON.stringify(data,null,2));
    if(data.Status=='OK'){
        weather.getWeather(data.cordinates.lat,data.cordinates.lng,(wdata)=>{
            console.log(JSON.stringify(wdata,null,2));
        });
    }
});
*/
var codePromise=geoCode.getLocationDetails(argv.a)
codePromise.then((data)=>{
    console.log(JSON.stringify(data,null,2));
    weather.getWeather(data.cordinates.lat,data.cordinates.lng).then((value)=>{
        console.log(value);
    },(error)=>{
        console.log(error);
    });
},(error)=>{
   console.log(error);
});