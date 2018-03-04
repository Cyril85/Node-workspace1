const request = require('request');


var replacer = (key, value) => {
    return value == 'ROOFTOP' ? 'Cyrils Home' : value;
};

var getLocationDetails = (address) => {
    return new Promise((resolve,reject)=>{
        var url = address.length > 2 ? 'https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURIComponent(address) : 'https://maps.googleapis.com/maps/api/geocode/json?address=%2022%20castleGrange%20drive,%20clondalkin';
        request({
            uri: url,
            json: true
        }, (error, response, body) => {
            var message = error ? error : body;
            //console.log(JSON.stringify(message, replacer, 2));
            var locationDetails = {Status: message.status};
            if (message.status === 'OK') {
                locationDetails.address = message.results[0].formatted_address;
                locationDetails.cordinates = {
                    'lat': message.results[0].geometry.location.lat,
                    'lng': message.results[0].geometry.location.lng
                };
                resolve(locationDetails);
            } else {
                reject('Error Connecting to backend server. Details :'+message.status);
            }
        });
    });

};

module.exports = {
    getLocationDetails
};
