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
                var hours = Math.floor((timeRem/(1000*60*60)) % 24);
                var minutes = Math.floor((timeRem/1000/60) % 60);
                var seconds = Math.floor((timeRem/1000) % 60);
                //pads minutes and seconds with zeroes
                minutes = ('0' + minutes).slice(-2);
                seconds = ('0' + seconds).slice(-2);
                Spots.update({_id: spot._id}, {$set: {status : hours + ':' + minutes + ":" + seconds}});
            }
        }, 1000);
        Spots.update({_id: spot._id}, {$set: {timer: timer.toString()}});
    },
   startTimer : function (spot){
       var curTime = new Date();
       var updates = {
           parked: true,
           endTime: Date.parse(curTime) + (1000*60*60)};
       Spots.update({_id: spot._id}, {$set : updates});
       Meteor.call('resumeTimer', spot);
   }
});

if (Meteor.isClient) {
    Template.body.helpers({
        'spots': function () {
            return Spots.find({});
        }
    });

    Template.body.events({
        "click .parkbtn" : function(event) {
            if (!this.parked) {
                var spot = this;
                StripeCheckout.open({
                    key: 'pk_test_eqCxZfI6l6UfjOvtovUPdhYT',
                    amount: 100, // this is equivalent to $1
                    name: 'Meteor Tutorial',
                    description: 'Spot ' + spot.name + ' - 1hr',
                    panelLabel: 'Pay Now',
                    token: function (res) {
                        stripeToken = res.id;
                        console.info(res);
                        Meteor.call('chargeCard', stripeToken, spot);
                    }
                });
            }
        }
    });
}

if (Meteor.isServer) {
    Meteor.methods({
        'chargeCard': function(stripeToken, spot) {
            var Stripe = StripeAPI('sk_test_3pGKeJIsjhfcEUVAXinrNkVX');
            var chargeSync = Meteor.wrapAsync(Stripe.charges.create, Stripe.charges);
            var result = chargeSync({
                source: stripeToken,
                amount: 100, // this is equivalent to $1
                currency: 'usd'
            });
            if (result != null){
                Meteor.call('startTimer', spot);
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
