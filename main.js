  'use strict';
  var ipcMain = require('electron').ipcMain
  var sqlite3 = require('sqlite3').verbose();
  var fs = require('fs');
  var path = require('path');
  // const spawn = require('child_process').spawn;
  // const ls = spawn('ls', ['-lh', '/usr']);

  const electron = require('electron');
  // Module to control application life.
  const app = electron.app;
  // Module to create native browser window.
  const BrowserWindow = electron.BrowserWindow;

  // Keep a global reference of the window object, if you don't, the window will
  // be closed automatically when the JavaScript object is garbage collected.
  let mainWindow;

  var envHome = process.env.HOME;
  var messagesDbFilename = "3d0d7e5fb2ce288813306e4d4636395e047a3d28";
  var contactsDbFilename = "31bb7ba8914766d4ba40d6dfb6113c8b614be442";
  var messagesLookup = {};
  var uniqueContacts = [];
  var messages_filepath = "", contacts_filepath = "";


  function createWindow () {
    // Create the browser window.
    mainWindow = new BrowserWindow({width: 1280, height: 600, minWidth:800, minHeight:600, title: "Schwifty Text Analyzer"});
    // mainWindow.testData = "ayyy lmao";

    // and load the index.html of the app.
    mainWindow.loadURL('file://' + __dirname + '/app/index.html');

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();
    findContactsFromDb(function(uniqueContacts){
      // mainWindow.webContents.on("did-finish-load", function(){
        console.log("[notification]\tDb done loading");
        var notif = { title:"Done Loading", body:"Database is done loading.", convos:uniqueContacts };
        mainWindow.webContents.send("notify", notif);
    });

    ipcMain.on("select-convo-changed", function(event, arg){
      console.log(arg);
      var result = {chat: messagesLookup[arg], stats: calculateStats(messagesLookup[arg])}
      event.sender.send("select-convo-changed-reply", result);
    });

    ipcMain.on('async-form', function(event, arg) {
      console.log(arg);
      event.sender.send('async-form-reply', messagesLookup[arg].length);
    });

    ipcMain.on('goEvent', function(event, arg){
      var notif = { title:"Ayyy lmao", body:"You pressed the button.", convos:uniqueContacts };
      event.sender.send("notify", notif)
      console.log();
    })

    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      mainWindow = null;
    });
  }

  function calculateStats(messages){
    var outgoingCount = 0, incomingCount = 0, incomingLengthTotal = 0, outgoingLengthTotal = 0, incomingVocabCount = 0, outgoingVocabCount = 0;
    var incomingVocabHash = {};
    var outgoingVocabHash = {};

    var lastMessageDate = Date.parse(messages[messages.length -1].date);
    // console.log("[info]\tLast message date raw: " + messages[messages.length -1].date);
    // console.log("[info]\tlast message date: " + lastMessageDate);

    var firstMessageDate = Date.parse(messages[0].date);
    // console.log("[info]\tFirst message date raw: " + messages[0].date);
    // console.log("[info]\tfirst message date: " + firstMessageDate);

    for(var i = 0; i < messages.length; i++){
      // If outgoing
      if (messages[i].is_from_me == "1"){
        outgoingCount += 1;
        outgoingLengthTotal += messages[i].message.length;
        messages[i].message.split(" ").forEach(function(word){
          var rawWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").toLowerCase(); // standardize words
          if(outgoingVocabHash[rawWord] === undefined){
            outgoingVocabCount += 1;
            outgoingVocabHash[rawWord] = 1;
          }else{
            outgoingVocabHash[rawWord] += 1;
          }
        });
      }else{ // If incoming
        incomingCount += 1;
        incomingLengthTotal += messages[i].message.length;
        messages[i].message.split(" ").forEach(function(word){
          var rawWord = word.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").toLowerCase(); // standardize words
          if(incomingVocabHash[rawWord] === undefined){
            incomingVocabCount += 1;
            incomingVocabHash[rawWord] = 1;
          }else{
            incomingVocabHash[rawWord] += 1;
          }
        });
      }
    }
    var textingIntensityPerSecond = ((incomingCount + outgoingCount) * 1.0) / ((lastMessageDate / 1000.0 - firstMessageDate / 1000.0) * 1.0);
    var options = {
      year: "numeric", month: "short",
      day: "numeric"
    };
    var firstMessageFormatted = new Date(messages[0].date).toLocaleDateString("en-US", options);
    var lastMessageFormatted = new Date(messages[messages.length - 1].date).toLocaleDateString("en-US", options);

    var stats = {sentCount:outgoingCount,
      receivedCount:incomingCount,
      totalCount: (outgoingCount + incomingCount),
      incomingLengthAverage:(incomingLengthTotal * 1.0 / incomingCount).toFixed(1),
      outgoingLengthAverage:(outgoingLengthTotal * 1.0 / outgoingCount).toFixed(1),
      incomingVocabCount: incomingVocabCount,
      outgoingVocabCount: outgoingVocabCount,
      vocabPerIncomingMessage: (incomingVocabCount * 1.0 / incomingCount).toFixed(1),
      vocabPerOutgoingMessage: (outgoingVocabCount * 1.0 / outgoingCount).toFixed(1),
      textingLifeAgeInDays: ((lastMessageDate - firstMessageDate) / 1000.0 / 60 / 60 / 24).toFixed(1),
      textingIntensityPerDay: (textingIntensityPerSecond * 60.0 * 60.0 * 24.0),
      firstMessageDate:firstMessageFormatted,
      lastMessageDate: lastMessageFormatted
    }
    return stats

  }

  function yank_messages_sql(){
    var filename = "app/messages.sql";
    var filepath = path.join(__dirname, filename);

    return fs.readFileSync(filepath, 'utf8' );
  }

  function yank_contacts_sql(){
    var filename = "app/contacts.sql";
    var filepath = path.join(__dirname, filename);

    return fs.readFileSync(filepath, 'utf8' );
  }

  function selectContacts(db){
    var contacts_sql = yank_contacts_sql();
    // console.log(contacts_sql);

    db.serialize(function(){
      var contacts = [];
      db.each(contacts_sql, function(err, row){
        if (err){
          console.log("Db select error: " + err);
        }

        contacts.push(row);
      },function(){
        console.log("[done]\t" + contacts.length + " contacts were returned from on disk database.");
        parseContacts(contacts);
      });
    });
  }

  function parseContacts(contacts){
    var contactLookup = {}
    contacts.forEach(function(contact){
      if (contact.phone_mobile != null){
        var numericNumber = contact.phone_mobile.replace(/\D/g,'');
        contactLookup[numericNumber] = contact;
      }
    });
    return contactLookup;
  }


  function selectFromDbs(messagesDb, contactsDbExists){

    if (messagesDb == null)
      return null;

    // Gets SQL statement from file.
    var messages_sql = yank_messages_sql();
    var contacts_sql = yank_contacts_sql();

    console.log("[querying]\tSQL => " + messages_sql);

    messagesDb.serialize(function(){
      var messages = [];
      messagesDb.each(messages_sql, function(err, row){
        if (err){
          console.log("Db select error: " + err);
        }
        if (row.message == null){
          row.message = "";
        }

        messages.push(row);
      },function(){
        messagesDb.close();
        console.log("[done]\t" + messages.length + " messages were returned from on disk database.");

        var contactsDb = new sqlite3.Database(contacts_filepath);
        if(contactsDbExists){
          contactsDb.serialize(function(){
            var contacts = [];
            contactsDb.each(contacts_sql, function(err, row){
              if (err){
                console.log("Db select error: " + err);
              }

              contacts.push(row);
            },function(){
              contactsDb.close();
              console.log("[done]\t" + contacts.length + " contacts were returned from on disk database.");
              parseMessages(messages, contacts);
            }
            );
          });
        }else{ // No contacts Db, but messages completes.
          console.log("[done]\t" + messages.length + " messages were returned from on disk database. NOT parsing contacts.");
          parseMessages(messages, null);
        }
      });
    });
  }

  function parseMessages(messages, contacts){
    console.log("[parsing]");
    var contactLookup = {}
    if (contacts != null){
      contactLookup = parseContacts(contacts);
    }

    messages.forEach(function(message){
      if (messagesLookup[message.chat_identifier] === undefined){
        messagesLookup[message.chat_identifier] = []
        messagesLookup[message.chat_identifier].push(message);
        uniqueContacts.push(message.chat_identifier);
      }else{
        messagesLookup[message.chat_identifier].push(message);
      }
    });

    var stats = {}
    var incomingInit = 0;
    var outgoingInit = 0;
    uniqueContacts.forEach(function(chat){
      if (messagesLookup[chat][0].is_from_me == "1"){
        outgoingInit += 1;
      }else{
        incomingInit += 1;
      }
    });
    var stats = {incomingInit: incomingInit,
      outgoingInit: outgoingInit
    };


    console.log("[info]\tUnique chat_identifiers => " + (uniqueContacts.length));
    var notif = {title:"Done loading chats", body:"Total chats: " + (uniqueContacts.length)}
    var loadedData = {messages: messages, uniqueContacts: uniqueContacts, messagesLookup: messagesLookup, stats:stats, contactLookup: contactLookup}
    mainWindow.webContents.send("done-loading-chats", loadedData);
    console.log(stats)

    console.log("[outputting]");
    var jsonMessages = JSON.stringify(messages);
    var outputFilepath = envHome + "/Desktop/output.txt"
    var tempData = [];
    var lines = [];
    for(var i = 0; i < messages.length; i++){
      tempData = [messages[i].is_from_me, messages[i].date, messages[i].chat_identifier, messages[i].message]
      lines.push(tempData.join("\t"));
    }

     fs.writeFile(outputFilepath, lines.join("\n"), function(err) {
         if(err) {
            return console.log(err);
        }
        console.log("[done] saved file to " + outputFilepath);
    });

    mainWindow.webContents.send("message-analysis-complete", messages);
  }

  function inspect(obj){
    var dir = '';
    for (var i in obj) dir += 'row[' + i + '] = ' + obj[i] + ' ';
    return dir;
  }

  function findContactsFromDb(callback){
    console.log("[detecting]")
    console.log("[info]\tprocess.env.HOME =>" + envHome);
    var isWin = /^win/.test(process.platform);
    var isMac = /darwin/.test(process.platform);
    if (isWin){
      console.log("[done]\tDetected Windows OS");
    }else if (isMac) {
      console.log("[done]\tDetected Mac OS");
      var backupExt = "/Library/Application Support/MobileSync/Backup/"
      var files = fs.readdirSync(envHome + backupExt);

      // b, a is sorting descendingly
      files.sort(function(b, a) {
           return fs.statSync(envHome + backupExt + a).mtime.getTime() -
                  fs.statSync(envHome + backupExt + b).mtime.getTime();
      });
      var mostRecentFolder = files[0];

      console.log("[info]\tThere are " + (files.length + 1) + " folders")
      console.log("[info]\tMost recent folder => " + mostRecentFolder);

      messages_filepath = envHome + backupExt + mostRecentFolder + "/" + messagesDbFilename;
      contacts_filepath = envHome + backupExt + mostRecentFolder + "/" + contactsDbFilename;
    }
    else{
      console.log("Problem detecting OS");
    }

    console.log("[done]\tDetected messages filepath => " + messages_filepath);
    console.log("[done]\tDetected contacts filepath => " + contacts_filepath);

    //var dbdata = fs.readFileSync(filepath);
    var messagesExists = fs.existsSync(messages_filepath);
    if (messagesExists){
      var messagesDb = new sqlite3.Database(messages_filepath);
      var contactsExist = fs.existsSync(contacts_filepath);
      if(contactsExist){
        selectFromDbs(messagesDb, true);
      }else{
        selectFromDbs(messagesDb, false);
      }

    }else {
      console.log("ERROR");
    }


    callback(uniqueContacts);
  }

  // This method will be called when Electron has finished
  // initialization and is ready to create browser windows.
  app.on('ready', createWindow);

  // Quit when all windows are closed.
  app.on('window-all-closed', function () {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', function () {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
      createWindow();
    }
  });
