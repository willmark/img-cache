/*
 * An image pre-processor handling caching and resizing/cropping.
 *
 * NOTE:  Only jpg supported at this time.
 *
 * First, check if the image is in the cache public dir.  If so,
 * write it out to the response, and finish.
 *
 * If not cached, call the cacheImage method to determine if the
 * file prefix indicates the original image should be resized/cropped
 * first before copying/caching.
 */
var fs = require("fs");

/**
 * Caches an image currently stored in a master repository at full resolution
 * If the requested image file prefix matches <width>x<height>_<crop|resize>_<original filename>,
 * The <original filename> will be read from the master repository and modified to the new max dimensions
 * and/or cropped before caching
 * usage:
 *    srcdir - String path where master repository is located 
 *    dstdir - String path where destination cache is located (ex. public) 
 *    imgfile - String path to image file (as requested in url)
 *    cb - Callback for result.  function (resulti, error)
 *       result - true|false
 *       error  - Error message
 */
function cacheImage(srcdir, dstdir, imgfile, cb) {
    if (!isValidDir(srcdir)) {
        cb(false, new Error("Master directory " + srcdir + " is invalid"));
        return;
    }
    if (!isValidDir(dstdir)) {
        cb(false, new Error("Destination directory " + dstdir + " is invalid"));
        return;
    }
    var path = require("path");
    var parts = imgfile.match(/([0-9]+)x([0-9]+)_(crop|resize)_(.+)/m);
    var dstfile = path.resolve(dstdir + path.sep + imgfile);
    if (parts !== null && parts.length > 4) {
        origfile = parts[4];
        srcfile = path.resolve(srcdir + path.sep + origfile);
        modifyImage(srcfile, dstfile, parts[3], parts[1], parts[2], cb);
    } else {
        //Perhaps not an altered image, just try to find the original file in the source repository
        //rs = fs.createReadStream(srcfile);
        srcfile = path.resolve(srcdir + path.sep + imgfile);
        copyImage(srcfile, dstfile, cb);
    }
}

/**
 * Copy image unmodified from source directory to cache directory.
 * Validate the image file first, verify it matches supported image format
 * usage:
 *    srcfile  - String path to original file 
 *    dstfile  - String path to destination file 
 *    cd - Callback for result.  function (resulti, error)
 *       result - true|false
 *       error  - Error message
 */
function copyImage(srcfile, dstfile, cb) {
    verifyImageFormat(srcfile, "jpeg", function(result, error) {
        if (result) {
            var rs = fs.createReadStream(srcfile);
            var ws = fs.createWriteStream(dstfile, "wx");
            rwEvents(ws, rs, function(result, err) {
                cb(result, err);
            });
        } else {
            cb(result, err);
        }
    });
}

/**
 * Validate the image file. Verify it matches supported image format
 * usage:
 *    srcfile  - String path to original file 
 *    format   - String format specification (currently, only jpg supported)
 *    callback - function(result, error) callback
 *       result - true|false operation successful
 *       error  - Error message
 */
function verifyImageFormat(srcfile, format, callback) {
    switch (format) {
      case "jpeg":
        verifyJPEGFormat(srcfile, callback);
        break;

      default:
        callback(false, new Error(format + " unsupported image format"));
    }
}

/**
 * Validate the jpeg image file. Simple check of id header first two bytes 0xFFD8 
 * usage:
 *    srcfile  - String path to image file 
 *    callback - function(result, error) callback
 *       result - true|false operation successful
 *       error  - Error message
 */
function verifyJPEGFormat(srcfile, callback) {
    if (!isValidFile(srcfile)) {
        callback(false, new Error(srcfile + " is not a file"));
        return;
    }
    var rs = fs.createReadStream(srcfile, {
        start: 0,
        end: 1
    });
    //var JPEGID = "ÿØ";
    var JPEGID = new Buffer([ 255, 216 ]);
    var verified = false;
    rs.on("error", function(err) {
        callback(false, err);
    });
    rs.on("data", function(chunk) {
        if (chunk.toString() === JPEGID.toString()) {
            verified = true;
            //signal 'end' we have verified
            callback(true);
        } else {
            callback(false, new Error("Not a valid JPEG"));
        }
    });
    rs.on("end", function() {
        if (!verified) callback(false, new Error("Not a valid JPEG"));
    });
}

/**
 * Modifies the source image to new dimensions and/or cropping
 * usage:
 *    srcfile - String path to original file (currently, only jpg supported)
 *    dstfile - String path to modified destination file
 *    method  - Name of the modification function crop | resize
 *    width   - Maximum width of resulting image (for resize), or cropped width
 *    height  - Maximum height of image (for resize), or cropped height
 *    cb      - Callback for result.  function (result, error)
 *       result - boolean result of conversion
 *       error  - non-null Error is conversion fails 
 */
function modifyImage(srcfile, dstfile, method, width, height, cb) {
    verifyImageFormat(srcfile, "jpeg", function(result, error) {
        if (!result) {
            cb(result, error);
        } else {
            var Convert = require("img-canvas-helper").Convert;
            var rs = new Convert({
                img: srcfile,
                method: method,
                width: Number(width),
                height: Number(height),
                callback: cb
            });
            var ws = fs.createWriteStream(dstfile, "wx");
            ws.dstfile = dstfile;
            rwEvents(ws, rs, function(result, err) {
                cb(result, err);
            });
        }
    });
}

/**
 * Handles readstream/writestream copying events
 * This allows a modules an opportunity look for a callback
 * to assure the write operation is finished before
 * prematurely terminating a process.  It is similar
 * to using readSync and writeSync, but with more fined-grained
 * control of response and events.
 * usage:
 *    ws - Writestream.  Handles 'error' and 'finish' events
 *    rs - Readstream.  Handles 'error', 'data', and 'end' events
 *    cb - Callback function with results of operation. function (result, error)
 *       result - true|false
 *       error  - Error message
 */
function rwEvents(ws, rs, cb) {
    rs.on("error", function(err) {
        //no srcfile, log error, and skip
        cb(false, err);
    });
    ws.on("error", function(err) {
        //thumb exists, no need to do any caching
        cb(false, err);
    });
    rs.on("data", function(chunk) {
        ws.write(chunk);
    });
    rs.on("end", function() {
        ws.end();
    });
    ws.on("finish", function() {
        cb(true);
    });
}

/**
 * Validate file exists
 * usage:
 *     file - String path of file to check
 */
function isValidFile(file) {
    return fs.statSync(file).isFile();
}

/**
 * Validate directory exists
 * usage:
 *     dir - String path of directory to check
 */
function isValidDir(dir) {
    try {
        return fs.statSync(file).isFile();
    } catch (err) {
        return false;
    }
}

module.exports = {
    cacheImage: function(srcdir, dstdir, imgfile, cb) {
        /**
         * Common argument checking 
         */
        var Args = require("vargs").Constructor;
        var args = new Args(arguments);
        if (args.length < 3) throw new Error("srcdir, dstdir, imgfile, and callback required");
        if (typeof args.at(2) != "string") throw new Error("imgfile string file path required");
        if (typeof args.at(1) != "string") throw new Error("dstdir string path required");
        if (typeof args.at(0) != "string") throw new Error("srcdir string path required");
        if (!args.callbackGiven()) throw new Error("Callback required");
        cacheImage(srcdir, dstdir, imgfile, cb);
    }
};
