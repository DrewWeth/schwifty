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
  var messagesLookup = {};
  var uniqueContacts = [];

  function createWindow () {
    // Create the browser window.
    mainWindow = new BrowserWindow({width: 800, height: 600});

    // and load the index.html of the app.
    mainWindow.loadURL('file://' + __dirname + '/index.html');

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();


    findContactsFromDb();

    ipcMain.on('async-form', function(event, arg) {
      console.log(arg);
      event.sender.send('async-form-reply', messagesLookup[arg].length);
    });

    // Emitted when the window is closed.
    mainWindow.on('closed', function() {
      // Dereference the window object, usually you would store windows
      // in an array if your app supports multi windows, this is the time
      // when you should delete the corresponding element.
      mainWindow = null;
    });
  }

  function yank_messages_sql(){
    var filename = "messages.sql";
    var filepath = path.join(__dirname, filename);

    return fs.readFileSync(filepath, 'utf8' );

    //fs.readFile(filepath, 'utf8', function(err, contents){
      //if (err){
        //console.log("Error: " + err);
      //}
      //return contents;
    //});
    //return "what the fuck";
  }

  function selectMessages(db){
    if (db == null)
      return null;

    // Gets SQL statement from file.
    var messages_sql = yank_messages_sql();

    console.log("[querying]\tSQL => " + messages_sql);
    db.serialize(function(){
      var messages = [];
      db.each(messages_sql, function(err, row){
        if (err){
          console.log("Db select error: " + err);
        }

        //console.log(inspect(row));
        messages.push(row);

      },function(){
        console.log("[done]\t" + messages.length + " messages were returned from on disk database.");
        parseMessages(messages);
      });
    });
  }

  function parseMessages(messages){
    console.log("[parsing]")
    // console.log(inspect(messages[0]), messages[0].message, messages[0].is_from_me, messages[0].date, messages[0].message);

    messages.forEach(function(message){
      if (messagesLookup[message.chat_identifier] === undefined){
        messagesLookup[message.chat_identifier] = []
        messagesLookup[message.chat_identifier].push(message);

        uniqueContacts.push(message.chat_identifier);
      }else{
        messagesLookup[message.chat_identifier].push(message);
      }
    });
    console.log("[info]\tUnique chat_identifiers => " + uniqueContacts.length + 1);


    console.log("[outputting]")
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

  function findContactsFromDb(){
    console.log("[detecting]")
    console.log("[info]\tprocess.env.HOME =>" + envHome);
    var isWin = /^win/.test(process.platform);
    var isMac = /darwin/.test(process.platform);
    var filepath = "";
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

      filepath = envHome + backupExt + mostRecentFolder + "/" + messagesDbFilename;
    }
    else{
      console.log("Problem detecting OS");
    }

    console.log("[done]\tDetected filepath => " + filepath);

    //var dbdata = fs.readFileSync(filepath);
    var exists = fs.existsSync(filepath);
    if (exists){
      var db = new sqlite3.Database(filepath);
      selectMessages(db);
      db.close();
    }
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
