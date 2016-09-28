var five = require("johnny-five");
var board = new five.Board();

board.on("ready", function() {
    var led = new five.Led(13);
    var on = false;

    function toggle()
    {
        on = !on;
        if (on) {
            led.on();
        } else {
            led.off();
        }

        var delay = Math.random()*5000;
        var status = (on) ? 'ON' : 'OFF';
        console.log(status+' waiting: '+delay);
        setTimeout(toggle, delay);
    }

    toggle();


});