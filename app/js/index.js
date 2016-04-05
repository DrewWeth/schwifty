var Humanize = require('humanize-plus');
var ipcRenderer = require('electron').ipcRenderer;

ipcRenderer.on("send-console", function(event, args){
  console.log(args);
});

document.getElementById("setup-link").addEventListener("click", function(e){
  ipcRenderer.send("link-setup-page", true);
});

ipcRenderer.on("rankings-analysis-complete", function(event, arg){
  var table = document.getElementById("rankings-table");
  var tableHeader = document.createElement('thead');
  var tableBody = document.createElement('tbody');

  var stats = arg.stats
  var columns = arg.columns;

  var row = document.createElement('tr');
  row.id="rankings-table-header-row";
  columns.forEach(function(column){
    var header = document.createElement('th');
    header.data = column.statName;
    header.appendChild(document.createTextNode(column.name));
    row.appendChild(header);
  });
  tableHeader.appendChild(row);

  stats.forEach(function(contact){
    var row = document.createElement('tr');
    columns.forEach(function(column, rowIndex){
      var cell = document.createElement('td');
      cell.appendChild(document.createTextNode(contact.stats[column.statName]));
      row.appendChild(cell);
    });
    tableBody.appendChild(row);
  });
  table.appendChild(tableHeader);
  table.appendChild(tableBody);
  $(document).ready(function(){
    $('#rankings-table').DataTable({
      "paging":false,
      "aaSorting": []
    });
  });
});



ipcRenderer.on("done-loading-chats", function(event, args){
  var uniqueContacts = args["uniqueContacts"];
  var messages = args["messages"];
  var messagesLookup = args["messagesLookup"];
  var stats = args["stats"];
  var contactLookup = args["contactLookup"];

  var selectConvo = document.getElementById("selectConvo")
  var chatList = document.getElementById("searchlist")
  document.getElementById("chats-count-value").innerHTML = Humanize.intComma(uniqueContacts.length);
  document.getElementById("messages-count-value").innerHTML = Humanize.intComma(messages.length);
  document.getElementById("incoming-init").innerHTML = stats["incomingInit"];
  document.getElementById("outgoing-init").innerHTML = stats["outgoingInit"];
  document.getElementById("all-incoming-avg").innerHTML = stats.allConversationsStatsAvg.incomingLengthAverage.toFixed(1)
  document.getElementById("all-outgoing-avg").innerHTML = stats.allConversationsStatsAvg.outgoingLengthAverage.toFixed(1)
  var options = {
    year: "numeric", month: "short",
    day: "numeric"
  };
  document.getElementById("first-text-date").innerHTML = (new Date(messages[0].date)).toLocaleDateString("en-US", options);
  uniqueContacts.forEach(function(chat){
    // var option = document.createElement("option");
    // var text = document.createTextNode(chat);
    var link = document.createElement("a");
    link.className += " list-group-item convoButton";
    link.id=chat;

    var contact = contactLookup[chat.replace(/\D/g,'')]

    if(contact === undefined || contact == null){
      var textName = document.createTextNode(chat);
      var nameDiv = document.createElement("div").appendChild(textName)
      link.appendChild(nameDiv);
    }else{
      var textName = document.createTextNode((contact.First || "") + " " + (contact.Last || "") + " " + chat);
      var nameDiv = document.createElement("div").appendChild(textName)
      link.appendChild(nameDiv);
    }

    // var textNumber = document.createTextNode(chat);
    // var numberDiv = document.createElement("div").appendChild(textNumber)
    // link.appendChild(numberDiv);

    // option.appendChild(text);
    // selectConvo.appendChild(option);
    chatList.appendChild(link);
  });

  trackConvoButtons();
  var lineChartData = getConversationGraph(messages);
  var ctx = document.getElementById("canvas-all").getContext("2d");
  	window.myLine = new Chart(ctx).Line(lineChartData, {
  		responsive: true
	});
  document.getElementById("individual-search").placeholder = "Search " + uniqueContacts.length + " contacts...";
});

function selectConvoChanged(){
  var selectConvo = document.getElementById("selectConvo")
  ipcRenderer.send("select-convo-changed", selectConvo.options[selectConvo.selectedIndex].value);
}

function trackConvoButtons(){

  document.getElementById("searchlist").addEventListener("click",function(e) {
    // e.target is our targetted element.
                // try doing console.log(e.target.nodeName), it will result LI
    if(e.target && e.target.nodeName == "A") {
        // console.log(e.target.id + " was clicked");
        ipcRenderer.send("select-convo-changed", e.target.id);

    }
  });
}

$("#individual-search").keyup(function () {
    // console.log("Searching!")
    var filter = jQuery(this).val();
    jQuery("#searchlist a").each(function () {
        if (jQuery(this).text().search(new RegExp(filter, "i")) < 0) {
            jQuery(this).hide();
        } else {
            jQuery(this).show()
        }
    });
});

document.getElementById("text-search-form").onsubmit = function(){
  console.log("Form submitted");
  ipcRenderer.send("text-search-form-submitted", document.getElementById("text-search").value);
  document.getElementById("individual-section").style.display = "none";
  document.getElementById("commentArea").style.display = "none";
  document.getElementById("text-search-section").style.display = "block";
  return false;
}

ipcRenderer.on("text-search-results", function(event, results){
  var messages = results.matchingMessages;
  var target = results.target;
  var textResults = document.getElementById("text-search-results");
  var individualSection = document.getElementById("individual-section");

  textResults.innerHTML = "";

  var textSearchCount = document.getElementById("text-search-count");
  if(messages.length == 1){
    textSearchCount.innerHTML = "1 message with " + target + " in it."
  }else{
    textSearchCount.innerHTML = messages.length + " messages with " + target + " in them.";
  }

  messages.forEach(function(message){
    var div = document.createElement('div');
    var divDirection = document.createElement('span');
    var divMessage = document.createElement('div');
    var divDetails = document.createElement('div');
    divDetails.className += ' fixed-details';
    divMessage.className += ' search-result-message';
    if(message.is_from_me == "1"){
      divDirection.appendChild(document.createTextNode("Sent"));
      divDirection.className += ' label label-primary';
    }else{
      divDirection.appendChild(document.createTextNode("Received"));
      divDirection.className += ' label label-success';
    }
    divDetails.appendChild(document.createTextNode(message.contact.friendly + " - "))
    divDetails.appendChild(document.createTextNode(message.date))

    div.id = message.id;
    div.className += ' bottom-sep';
    var message = document.createTextNode(message.message);
    textResults.appendChild(div);
    div.addEventListener("click", function(event){
      ipcRenderer.send("text-snippet-clicked", { id: this.id, target: document.getElementById('text-search').value } );
    });
    divMessage.appendChild(message);
    div.appendChild(divMessage);
    div.appendChild(divDirection);
    divMessage.appendChild(divDetails);

  });

  $('.search-result-message').mark(target);

});


ipcRenderer.on("select-convo-changed-reply", function(event, arg){
  console.log(arg);

  var stats = arg["stats"];
  document.getElementById("individual-section").style.display="block";
  document.getElementById("commentArea").style.display="block";
  document.getElementById("text-search-section").style.display="none";

  if (arg.contact){
    document.getElementById("contact-number").innerHTML = arg.contact.chat_identifier;
    document.getElementById("contact-name").innerHTML = arg.contact.friendly;
  }else{
    document.getElementById("contact-number").innerHTML = "";
    document.getElementById("contact-name").innerHTML = "";
  }
  document.getElementById("messages-count-total").innerHTML = stats.totalCount;
  document.getElementById("incoming-message-count").innerHTML = stats.receivedCount;
  document.getElementById("outgoing-message-count").innerHTML = stats.sentCount;

  document.getElementById("incoming-length-avg").innerHTML = stats.incomingLengthAverage;
  document.getElementById("outgoing-length-avg").innerHTML = stats.outgoingLengthAverage;
  document.getElementById("incoming-vocab-count").innerHTML = stats.incomingVocabCount;
  document.getElementById("outgoing-vocab-count").innerHTML = stats.outgoingVocabCount;
  document.getElementById("life-in-days").innerHTML = stats.textingLifeAgeInDays;
  document.getElementById("first-message-date").innerHTML = stats.firstMessageDate;
  document.getElementById("last-message-date").innerHTML = stats.lastMessageDate;

  // console.log("hasContext:\t" + arg["hasContext"]);
  // console.log("context:\t" + arg["context"]);

  // Contextual movement
  // console.log("CONTEXT:\t" + JSON.stringify(arg["contextMessage"]));
  // if(contextMessage){
  //   document.getElementById(contextualMessage.id).style += " background-color: blue";
  // }

  var lineChartData = getConversationGraph(arg["chat"]);
  var oldcanv = document.getElementById('canvas-one');
  document.getElementById("individual-graph").removeChild(oldcanv)
  var canv = document.createElement('canvas');
  canv.id = 'canvas-one';
  document.getElementById("individual-graph").appendChild(canv);

  var ctx = document.getElementById("canvas-one").getContext("2d");
	window.myLine = new Chart(ctx).Line(lineChartData, {
	   responsive: true
	});

  var ChatBox = React.createClass({
    render: function() {
      var children = [];
      var keyCounter = 0;
      this.props.chats.forEach(function(chat){
        if (chat.is_from_me == 1){
          children.push(React.createElement("div", {key: keyCounter, className:"bubbledRight", id:chat.id}, chat.message));
        }else{
          children.push(React.createElement("div", {key: keyCounter, className:"bubbledLeft"}, chat.message));
        }
        keyCounter += 1;
      });

      return React.createElement("div", null, children);
      // return "<div> Hello, world! I am a CommentBox.</div>";
    }
  });

  var StatBox = React.createClass({
    render: function() {
      return React.createElement("div", null, JSON.stringify(this.props.stats));
      // return ()
      // return "<div> Hello, world! I am a CommentBox.</div>";
    }
  });

  console.log("Rendering chat...");

  ReactDOM.render(
    React.createElement(ChatBox, {chats: arg["chat"]}),
    document.getElementById('commentArea')
  );

  if(arg.hasContext){
    var contextDiv = document.getElementById(arg.contextId);
    console.log(contextDiv);
    console.log(window.find(arg.wholeMessage, false, false, true, false, true, true));
  }
  console.log("Rendering stats area...");

  ReactDOM.render(
    React.createElement(StatBox, {stats: arg["stats"]}),
    document.getElementById('statsArea')
  );

  console.log("Done...");
});

function getMonthsBetween(to, from){
  var months = to.getMonth() - from.getMonth()
  + (12 * (to.getFullYear() - from.getFullYear()));

  if(to.getDate() < from.getDate()){
    months--;
  }
  return months;
}

var dateFormat = require('dateformat');
function getConversationGraph(messages){
  var xData = [];
  var yData = [];

  var tempX = new Date(messages[0].date);
  var tempY = 0;

  messages.forEach(function(message){
    var currentDate = new Date(message.date);
    if (currentDate.getMonth() === tempX.getMonth()){
      tempY += 1;
    } else {
      xData.push(dateFormat(tempX, "mmmm, yyyy"));
      yData.push(tempY);

      // If there's a difference of 1 month
      var monthsDiff = getMonthsBetween(currentDate, tempX);
      if(monthsDiff > 1){
        // if monthsDiff == 2, then set one month to 0

        // If there's a difference of 2 or more
        for(var i = 0; i < monthsDiff - 1; i++){
          xData.push(dateFormat(tempX.setMonth(tempX.getMonth() + 1), "mmmm, yyyy"));
          yData.push(0);
        }
      }

      tempX = new Date(message.date);
      tempY = 1;
    }
  });
  xData.push(dateFormat(tempX, "mmmm, yyyy"));
  yData.push(tempY);

	var lineChartData = {
		labels : xData,
		datasets : [
			{
				label: "My First dataset",
				fillColor : "rgba(220,220,220,0.2)",
				strokeColor : "rgba(220,220,220,1)",
				pointColor : "rgba(220,220,220,1)",
				pointStrokeColor : "#fff",
				pointHighlightFill : "#fff",
				pointHighlightStroke : "rgba(220,220,220,1)",
				data : yData,
        showXLabels: 10,
			}
		]
	}

  return lineChartData;
}

ipcRenderer.on("notify", function(event, arg){
  // document.getElementById("selectConvo").append(arg["convos"]);

  var myNotification = new Notification(arg["title"], {
    body: arg["body"]
  });
});

function findPos(obj) {
    var curtop = 0;
    if (obj.offsetParent) {
        do {
            curtop += obj.offsetTop;
        } while (obj = obj.offsetParent);
    return [curtop];
    }
}

ipcRenderer.on('async-form-reply', function(event, arg) {
  console.log(arg);
  document.getElementById("convo_response").innerHTML = arg;
});
