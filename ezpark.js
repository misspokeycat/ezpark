Spots = new Mongo.Collection('spots');
Meteor.methods({
    resumeTimer : function (spot){
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
                var days = Math.floor((timeRem/(1000*60*60*24)));
                var hours = Math.floor((timeRem/(1000*60*60)) % 24);
                var minutes = Math.floor((timeRem/1000/60) % 60);
                var seconds = Math.floor((timeRem/1000) % 60);
                //pads minutes and seconds with zeroes
                minutes = ('0' + minutes).slice(-2);
                seconds = ('0' + seconds).slice(-2);
                var status;
                if (days === 0){
                    status = hours + ':' + minutes + ":" + seconds;
                } else {
                    status = days + " days"
                }
                status = "In Use - " + status;
                Spots.update({_id: spot._id}, {$set: {status : status}});
            }
        }, 1000);
        Spots.update({_id: spot._id}, {$set: {timer: timer.toString()}});
    },
   startTimer : function (spot, hours){
       var curTime = new Date();
       var updates = {
           parked: true,
           endTime: Date.parse(curTime) + (1000*60*60*hours)};
       Spots.update({_id: spot._id}, {$set : updates});
       Meteor.call('resumeTimer', spot);
   }
});

if (Meteor.isClient) {
    Template.body.helpers({
        'spots': function () {
            return Spots.find({}, {sort: {name: 1}});
        }
    });

    Template.body.events({
        "click .parkbtn" : function() {
            if (!this.parked) {
                var spot = this;
                var hours = 24;
                StripeCheckout.open({
                    key: 'pk_test_eqCxZfI6l6UfjOvtovUPdhYT',
                    amount: 500, // this is equivalent to $5
                    name: 'EZ Park',
                    description: 'Spot ' + spot.name + ' - 1 Day',
                    panelLabel: 'Pay Now',
                    token: function (res) {
                        stripeToken = res.id;
                        console.info(res);
                        Meteor.call('chargeCard', stripeToken, spot, hours, 500);
                    }
                });
            }
        },
        "click .parkbtnMonth" : function() {
            if (!this.parked) {
                var spot = this;
                var hours = 24*30;
                StripeCheckout.open({
                    key: 'pk_test_eqCxZfI6l6UfjOvtovUPdhYT',
                    amount: 10000, // this is equivalent to $100
                    name: 'EZ Park',
                    description: 'Spot ' + spot.name + ' - 30 Days',
                    panelLabel: 'Pay Now',
                    token: function (res) {
                        stripeToken = res.id;
                        console.info(res);
                        Meteor.call('chargeCard', stripeToken, spot, hours, 10000);
                    }
                });
            }
        }
    });
}

if (Meteor.isServer) {
    Meteor.methods({
        'chargeCard': function(stripeToken, spot, hours, amount) {
            var Stripe = StripeAPI('sk_test_3pGKeJIsjhfcEUVAXinrNkVX');
            var chargeSync = Meteor.wrapAsync(Stripe.charges.create, Stripe.charges);
            var result = chargeSync({
                source: stripeToken,
                amount: amount,
                currency: 'usd'
            });
            if (result != null){
                Meteor.call('startTimer', spot, hours);
            }
        }
    });
    Meteor.startup(function () {
        // code to run on server at startup
        //db init
        if (!Spots.findOne({name: 'C1'})){
            Spots.insert({name: 'C1', parked: false, status: "Open"});
            Spots.insert({name: 'C2', parked: false, status: "Open"});
            Spots.insert({name: 'D1', parked: false, status: "Open"});
            Spots.insert({name: 'D2', parked: false, status: "Open"});
        }
        //resume stopped timers (in case of crash)
        var runningSpots = Spots.find({parked: true});
        runningSpots.forEach(function(spot){
            Meteor.call('resumeTimer', spot);
        });
    });
}
