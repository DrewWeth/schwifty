var React = require('react');
var ReactDOM = require('react');


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
    // return React.createElement("div", null, JSON.stringify(this.props.stats));
    return (
      <div>
      Hello
      </div>
    );
    // return "<div> Hello, world! I am a CommentBox.</div>";
  }
});

exports.ChatBox = ChatBox;
exports.StatBox = StatBox;
