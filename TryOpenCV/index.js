var cv = require('opencv');

cv.readImage("./Fig0310(b)(washed_out_pollen_image).png", function(err, im){

    im.convertGrayscale();
    im.equalizeHist();


    im.save('./out.jpg');

});