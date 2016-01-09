Spots = new Mongo.Collection('spots');
Meteor.methods({
   startTimer : function (spot){
       var timer = Meteor.setInterval(function(){
           //finds diff between current and ending times, returns value in ms
           var curTime = new Date();
           var endTime = Spots.findOne({_id: spot._id}).endTime;
           var timeRem = endTime - curTime;
           var timer = Spots.findOne({_id: spot._id}).timer;
           if (timeRem <= 0){
               Spots.update({_id: spot._id}, {$set: {status : "Open", parked: false}});
               Meteor.clearInterval(timer);
           } else {
               //Gets H:M:S
               var hours = Math.floor((timeRem/(1000*60*60)) % 24);
               var minutes = Math.floor((timeRem/1000/60) % 60);
               var seconds = Math.floor((timeRem/1000) % 60);
               //pads minutes and seconds with zeroes
               minutes = ('0' + minutes).slice(-2);
               seconds = ('0' + seconds).slice(-2);
               Spots.update({_id: spot._id}, {$set: {status : hours + ':' + minutes + ":" + seconds}});
           }
       }, 1000);
       var curTime = new Date();
       var updates = {
           parked: true,
           timer: timer.toString(), //otherwise timer references self
           endTime: Date.parse(curTime) + (1000*60)};
       Spots.update({_id: spot._id}, {$set : updates});
   }
});

if (Meteor.isClient) {
    Template.body.helpers({
        'spots': function () {
            return Spots.find({});
        }
    });

    Template.body.events({
        "click .parkbtn" : function(event){
            //updates timer every second, destroys timer on finish
            Meteor.call('startTimer', this);
        }
    });
}

if (Meteor.isServer) {
    Meteor.startup(function () {
        // code to run on server at startup
        if (!Spots.findOne({name: 'C1'})){
            //db init
            Spots.insert({name: 'C1', parked: false, status: "Open"});
            Spots.insert({name: 'C2', parked: false, status: "Open"});
            Spots.insert({name: 'D1', parked: false, status: "Open"});
            Spots.insert({name: 'D2', parked: false, status: "Open"});
        }
    });
}
