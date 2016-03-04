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

ipcRenderer.on("done-loading-chats", function(event, args){
  var uniqueContacts = args["uniqueContacts"];
  var messages = args["messages"];
  var messagesLookup = args["messagesLookup"];
  var selectConvo = document.getElementById("selectConvo")
  document.getElementById("chats-count-value").innerHTML = Humanize.intComma(uniqueContacts.length + 1);
  document.getElementById("messages-count-value").innerHTML = Humanize.intComma(messages.length + 1);
  var options = {
    year: "numeric", month: "short",
    day: "numeric"
  };
  document.getElementById("first-text-date").innerHTML = (new Date(messages[0].date)).toLocaleDateString("en-US", options);
  uniqueContacts.forEach(function(chat){
      var option = document.createElement("option");
      var text = document.createTextNode(chat);
      option.appendChild(text);
      selectConvo.appendChild(option);
  });

  var lineChartData = getConversationGraph(messages);
  var ctx = document.getElementById("canvas-all").getContext("2d");
  	window.myLine = new Chart(ctx).Line(lineChartData, {
  		responsive: true
	});
});

function selectConvoChanged(){
  var selectConvo = document.getElementById("selectConvo")
  ipcRenderer.send("select-convo-changed", selectConvo.options[selectConvo.selectedIndex].value);
}

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
    if (new Date(message.date).getMonth() === tempX.getMonth()){
      tempY += 1;
    }else{
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
