const Stately = require('stately.js');

function reporter(event, oldState, newState) {

    var transition = oldState + ' => ' + newState;
    console.log(`Event is  :${event}. Transition is  ${transition}`);


}

var radio = new Stately({
    'STOPPED': {
        onEnter: function (){
            console.log('in the entry method in stopped');
            //return this.PLAYING;
            return this.PLAYING.pause.call(this);
        },
        play: function () {
            console.log('Loging from play');
            setTimeout(()=>{
                console.log('a');
            },1000);
            setTimeout(()=>{
                console.log('b');
            },1000);
            setTimeout(()=>{
                console.log('c');
            },600);
            return this.PLAYING.pause.call(this);
        }
    },
    'PLAYING': {
        onEnter: reporter,
        stop: function () {
            console.log('Loging from stop');
            return this.STOPPED;
        },
        pause: function () {
            console.log('Loging from pause');
            return this.PAUSED;
        }
    },
    'PAUSED': {
        onEnter: reporter,
        play: function () {
            console.log('Loging from play in PAUSED');
            return this.PLAYING;
        },
        stop: function () {
            console.log('Loging from stop in PAUSAED');
            return this.STOPPED;
        }
    }
});
console.log('Machien state is  ',radio.getMachineState());
//radio.play().pause().play().pause().stop();
radio.play();

