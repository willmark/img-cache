img-cache
============

> Stability - 2 Unstable

An image pre-processor handling caching and resizing/cropping.

NOTE:Only jpg supported at this time.

First, check if the image is in the cache public dir.If so,
write it out to the response, and finish.

If not cached, call the cacheImage method to determine if the
file prefix indicates the original image should be resized/cropped
first before copying/caching.

## API

````
cacheImage(srcdir, dstdir, imgfile, callback)

Caches an image currently stored in a master repository at full resolution
If the requested image file prefix matches <width>x<height>_<crop|resize>_<original filename>,
The <original filename> will be read from the master repository and modified to the new max dimensions
and/or cropped before caching
  usage:
    srcdir   - String path where master repository is located 
    dstdir   - String path where destination cache is located (ex. public) 
    imgfile  - String path to image file (as requested in url)
    callback - Callback for result.  function (resulti, error)
       result - true|false
       error  - Error message

````
