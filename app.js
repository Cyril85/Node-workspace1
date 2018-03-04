const yargs = require('yargs');

const notes = require('./notes.js');

// console.log('yarsgs :', yargs.argv);
yargs.command('add', 'Add a new Note', {
    title: {
        describe: 'Title of the note',
        demand: true,
        alias: 't'
    },
    body: {
        describe: 'Body of the note',
        demand: true,
        alias: 'b'
    }

}).command('update', 'Update a Note', {
    title: {
        describe: 'Title of the note',
        demand: true,
        alias: 't'
    },
    body: {
        describe: 'Body of the note',
        demand: true,
        alias: 'b'
    }

})
    .help();

var command = process.argv[2];
if (command === 'add') {
    // console.log('Adding a note');
    const promise = notes.add(yargs.argv.title, yargs.argv.body);
    var message = promise ? 'Successfully Added' : 'Something went wrong. Try again!';
    console.log(message);
} else if (command === 'list') {
    const promise = notes.list();
    var message = promise ? promise : 'Something went wrong. Try again!';
    console.log(`Printing  ${message.length}  note(s)`);
    message.forEach((note) => {
        notes.log(note);
    });
} else if (command === 'remove') {
    const promise = notes.remove(yargs.argv.title, yargs.argv.body);
    var message = promise ? 'Successfully Removed' : 'Something went wrong. Try again!';
    console.log(message);
} else if (command === 'update') {
    const promise = notes.update(yargs.argv.title, yargs.argv.body);
    var message = promise ? 'Successfully Updated' : 'Something went wrong. Try again!';
    console.log(message);
} else if (command === 'get') {
    const promise = notes.getNote(yargs.argv.title);
    var message = promise.length > 0 ? promise[0] : 'Fetch failed';
    console.log(message);
} else {
    console.log('Command not recognized');
}