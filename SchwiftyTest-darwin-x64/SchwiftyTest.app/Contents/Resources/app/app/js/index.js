var Humanize = require('humanize-plus');
var ipcRenderer = require('electron').ipcRenderer;

// document.getElementById("convo").onsubmit = function(){
//   console.log("Form submitted");
//   ipcRenderer.send("async-form", document.getElementById("chat_identifier").value);
//   return false;
// }


// document.getElementById("btnGo").onclick = function(){
//   ipcRenderer.send("goEvent", true);
// }

ipcRenderer.on("send-console", function(event, args){
  console.log(args);
});

document.getElementById("setup-link").addEventListener("click", function(e){
  ipcRenderer.send("link-setup-page", true);
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
  document.getElementById("all-incoming-avg").innerHTML = stats["allConversationsStats"]["incomingLengthAverage"].toFixed(1)
  document.getElementById("all-outgoing-avg").innerHTML = stats["allConversationsStats"]["outgoingLengthAverage"].toFixed(1)
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

    }else{
      var textName = document.createTextNode(contact.First + " " + contact.Last);
      var nameDiv = document.createElement("div").appendChild(textName)
      link.appendChild(nameDiv);
    }

    var textNumber = document.createTextNode(chat);
    var numberDiv = document.createElement("div").appendChild(textNumber)
    link.appendChild(numberDiv);

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
    jQuery("div a").each(function () {
        if (jQuery(this).text().search(new RegExp(filter, "i")) < 0) {
            jQuery(this).hide();
        } else {
            jQuery(this).show()
        }
    });
});


ipcRenderer.on("select-convo-changed-reply", function(event, arg){
  var stats = arg["stats"];
  document.getElementById("individual-section").style.display="block";
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
      var children = []
      var keyCounter = 0;
      this.props.chats.forEach(function(chat){
        if (chat.is_from_me == 1){
          children.push(React.createElement("div", {key: keyCounter, className:"bubbledRight"}, chat.message));
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

  ReactDOM.render(
      React.createElement(ChatBox, {chats: arg["chat"]}),
      document.getElementById('commentArea')
    );


  ReactDOM.render(
    React.createElement(StatBox, {stats: arg["stats"]}),
    document.getElementById('statsArea')
  );
});

var dateFormat = require('dateformat');
function getConversationGraph(messages){
  var xData = [];
  var yData = [];

  var tempX = new Date(messages[0].date);
  var tempY = 0;

  messages.forEach(function(message){
    var currentMonth = new Date(message.date).getMonth();
    if (currentMonth === tempX.getMonth()){
      tempY += 1;
    } else {
      xData.push(dateFormat(tempX, "mmmm, yyyy"));
      yData.push(tempY);


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

ipcRenderer.on('async-form-reply', function(event, arg) {
  console.log(arg);
  document.getElementById("convo_response").innerHTML = arg;
});
