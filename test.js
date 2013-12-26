var cache = require("./index");

var goodimgcrop = "/200x200_crop_test.jpg";

var goodimgresize = "/100x100_resize_test.jpg";

var badimg = "/200x200_resize_badtest.jpg";

var srcdir = __dirname;

var dstdir = __dirname + "/dstdir";

//be sure to create this in Gruntfile.js
exports.cropImageMissingParms = function(a) {
    a.expect(1);
    a.throws(function() {
        cache.cacheImage();
    }, /srcdir, dstdir, imgfile, and callback required/);
    a.done();
};

exports.cropImageMissingCallback = function(a) {
    a.expect(1);
    a.throws(function() {
        cache.cacheImage(goodimgcrop);
    }, /srcdir, dstdir, imgfile, and callback required/);
    a.done();
};

exports.cropImageMissingImg = function(a) {
    a.expect(1);
    a.throws(function() {
        cache.cacheImage(function() {});
    }, /srcdir, dstdir, imgfile, and callback required/);
    a.done();
};

exports.resizeBadImage = function(a) {
    a.expect(1);
    cache.cacheImage(srcdir, dstdir, badimg, function(result, data) {
        a.ok(!result);
        a.done();
    });
};

exports.resizeNoFileImage = function(a) {
    cache.cacheImage(srcdir, dstdir, "noexists", function(result, err) {
        a.ok(!result);
        a.done();
    });
};

exports.cropImageFile = function(a) {
    a.expect(1);
    cache.cacheImage(srcdir, dstdir, goodimgcrop, function(result, data) {
        a.ok(result);
        a.done();
    });
};

exports.resizeImageFile = function(a) {
    a.expect(1);
    cache.cacheImage(srcdir, dstdir, goodimgresize, function(result, data) {
        a.ok(result);
        a.done();
    });
};
