const axios = require('axios');
const yargs = require('yargs');


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
var geocodeUrl = argv.a.length > 2 ? 'https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURIComponent(argv.a) : 'https://maps.googleapis.com/maps/api/geocode/json?address=%2022%20castleGrange%20drive,%20clondalkin';
axios.get(geocodeUrl)
    .then((response) => {
        if (response.data.status === 'OVER_QUERY_LIMIT')
            throw new Error('Server denied the request. Maximum trial reached for the day');
        if (response.data.status === 'ZERO_RESULTS')
            throw new Error('Unable to find that address');
        console.log(response.data.results[0].formatted_address);
        var lat = response.data.results[0].geometry.location.lat;
        var lng = response.data.results[0].geometry.location.lng;
        var weatherUrl = 'https://api.darksky.net/forecast/c7647aa0177462fad568fef774d20f91/' + lat + ',' + lng;
        return axios.get(weatherUrl);
    })
    .then((response) => {
        console.log('It is ' + ((response.data.currently.temperature - 32) * 5 / 9).toFixed(2) + ' degree  but it feels like ' + ((response.data.currently.apparentTemperature - 32) * 5 / 9).toFixed(2) + ' degree')
    })
    .catch((error) => {
        if (error.code === 'ENOTFOUND')
            console.log('Unable to connect to back end server');
        else
            console.log(error.message);
    });