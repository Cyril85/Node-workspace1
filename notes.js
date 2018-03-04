const fs = require('fs');

var fetchNotes = () => {
    try {
        return JSON.parse(fs.readFileSync('notes-data.json'));
    } catch (e) {
        return [];
    }
}

var add = (title, body) => {
    var notes = fetchNotes();
    var note = {'title': title, 'body': body};
    var duplicate = notes.filter((notte) => notte.title === title);
    if (duplicate.length === 0) {
        notes.push(note);
        fs.writeFileSync('notes-data.json', JSON.stringify(notes));
        return true;
    } else {
        return false;
    }
};


var remove = (title, body) => {
    var notes = fetchNotes();
    var note = {'title': title, 'body': body};
    var duplicateRemoved = notes.filter((notte) => notte.title !== title);
    if (notes.length !== duplicateRemoved.length) {
        fs.writeFileSync('notes-data.json', JSON.stringify(duplicateRemoved));
        return true;
    } else {
        return false;
    }

};

var update = (title, body) => {
    var notes = fetchNotes();
    var note = {'title': title, 'body': body};
    var duplicateRemoved = notes.filter((notte) => notte.title !== title);
    debugger;
    if (notes.length !== duplicateRemoved.length) {
        duplicateRemoved.push(note);
        fs.writeFileSync('notes-data.json', JSON.stringify(duplicateRemoved));
        return true;
    } else {
        return false;
    }
};

var list = () => {
    return fetchNotes();
};

var log = (note) => {
    console.log('--');
    console.log('Title  ', note.title);
    console.log('Body  ', note.body);
};

var getNote = (title) => {
    var notes = fetchNotes();
    return notes.filter((notte) => notte.title === title);
};
module.exports = {
    add,
    remove,
    list,
    update,
    getNote,
    log
};