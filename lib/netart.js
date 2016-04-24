/*globals paper, console, $ */
/*jslint nomen: true, undef: true, sloppy: true */

// network art library

/*

@licstart  The following is the entire license notice for the
JavaScript code in this page.

Copyright (C) 2015 david ha, otoro.net, otoro labs

The JavaScript code in this page is free software: you can
redistribute it and/or modify it under the terms of the GNU
General Public License (GNU GPL) as published by the Free Software
Foundation, either version 3 of the License, or (at your option)
any later version.  The code is distributed WITHOUT ANY WARRANTY;
without even the implied warranty of MERCHANTABILITY or FITNESS
FOR A PARTICULAR PURPOSE.  See the GNU GPL for more details.

As additional permission under GNU GPL version 3 section 7, you
may distribute non-source (e.g., minimized or compacted) forms of
that code without the copy of the GNU GPL normally required by
section 4, provided you include this license notice and a URL
through which recipients can access the Corresponding Source.


@licend  The above is the entire license notice
for the JavaScript code in this page.
*/

// neural network random art generator
if (typeof module != "undefined") {
  var R = require('./recurrent.js');
}

var NetArt = {};
(function(global) {
  "use strict";

  var G0 = new R.Graph(false);

  var networkSize = 16;
  var nHidden = 8;
  var colorMode = 0;
  var alphaMode = 0;

  // internal image class
  var Image = function(n_, d_) {
    this.n = n_ || 32; // maxrow
    this.d = d_ || 32; // maxcol
    var l = this.n*this.d;
    this.r = R.zeros(l); // between 0 -> 1
    this.g = R.zeros(l);
    this.b = R.zeros(l);
    this.a = R.zeros(l);
    this.label = -1;
  };

  Image.prototype = {
    checkBound: function(i, j) {
      // returns true if (i, j) within boundary of image
      if (i >= 0 && j >= 0 && i < this.n && j < this.d) {
        return true;
      }
      return false;
    },
    get: function(vec, row, col) {
      // returns pixel at (row, col) of 1d unrolled vector vec
      return vec[row*this.n+col];
    },
    set: function(vec, row, col, value) {
      // sets (row, col) to value for a 1d unrolled vec
      vec[row*this.n+col] = value;
    },
    getColor: function(row, col) {
      // returns pixel at (row, col) of 1d unrolled vector vec
      return [this.r[row*this.n+col], this.g[row*this.n+col], this.b[row*this.n+col]];
    },
    setColor: function(row, col, c) {
      // sets (row, col) to value for a 1d unrolled vec
      this.r[row*this.n+col] = c[0];
      this.g[row*this.n+col] = c[1];
      this.b[row*this.n+col] = c[2];
    },
    copy: function() {
      // returns exact copy of image
      var image = new Image(this.n, this.d);
      image.r = R.copy(this.r);
      image.g = R.copy(this.g);
      image.b = R.copy(this.b);
      image.label = this.label;
      return image;
    },
    flip: function() {
      // return a copy of the horizontally flipped image
      var image = this.copy();
      var tempColor;
      var middle = Math.floor(this.d/2);
      var maxcol = this.d;
      for (var i=0,maxrow=this.n;i<maxrow;i++) {
        for (var j=0;j<middle;j++) {
          tempColor = image.getColor(i, j);
          image.setColor(i, j, image.getColor(i, maxcol-j-1));
          image.setColor(i, maxcol-j-1, tempColor);
        }
      }
      return image;
    },
    augment: function(drow, dcol, flip_) {
      // return a copy of the augmented image.
      var flip = typeof flip_ === 'undefined' ? false : flip_;
      var image = this.copy();
      for (var i=0,maxrow=this.n;i<maxrow;i++) {
        for (var j=0,maxcol=this.d;j<maxcol;j++) {
          if (this.checkBound(i-drow,j-dcol)) {
            image.setColor(i, j, this.getColor(i-drow,j-dcol));
          }
        }
      }
      if (flip) {
        image = image.flip();
      }
      return image;
    },
    randomAugment: function(shiftSize) {
      // returns a randomised augmented version of the image with 50% prob flip
      return this.augment(R.randi(-shiftSize,shiftSize),R.randi(-shiftSize,shiftSize),(Math.random()<0.5));
    },
    getCanvasImage: function (ctx) { // input is a NetArt.Image

      var sizeh = this.d;
      var sizew = this.n;
      var imgData=ctx.createImageData(sizeh, sizew);

      var k = 0;
      var i, j;
      var offset;

      for (i = 0; i < sizeh; i++) {
        for (j = 0; j < sizew; j++) {
          offset = i*sizew;
          imgData.data[k+0]=this.r[offset+j]*255.0;
          imgData.data[k+1]=this.g[offset+j]*255.0;
          imgData.data[k+2]=this.b[offset+j]*255.0;
          imgData.data[k+3]=this.a[offset+j]*255.0;
          k+=4;
        }
      }
      return imgData;
    }

  };

  // from
  // https://bgrins.github.io/TinyColor/docs/tinycolor.html
  function hsvToRgb(h, s, v) {
      // hsv are between 0 and 1
      // returns rgb between 0 and 1

      h *= 6;

      var i = Math.floor(h),
          f = h - i,
          p = v * (1 - s),
          q = v * (1 - f * s),
          t = v * (1 - (1 - f) * s),
          mod = i % 6,
          r = [v, q, p, p, t, v][mod],
          g = [t, v, v, q, p, p][mod],
          b = [p, p, t, v, v, q][mod];

      return [r, g, b];
  }
  function hslToRgb(h, s, l) {
      var r, g, b;

      // hsl are between 0 and 1
      // returns rgb between 0 and 1

      function hue2rgb(p, q, t) {
          if(t < 0) t += 1;
          if(t > 1) t -= 1;
          if(t < 1/6) return p + (q - p) * 6 * t;
          if(t < 1/2) return q;
          if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
          return p;
      }

      if(s === 0) {
          r = g = b = l; // achromatic
      }
      else {
          var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
          var p = 2 * l - q;
          r = hue2rgb(p, q, h + 1/3);
          g = hue2rgb(p, q, h);
          b = hue2rgb(p, q, h - 1/3);
      }

      return [r, g, b];
  }

  var createModel = function(networkSize_, nHidden_, colorMode_) {
    // returns a recurrent.js model used to generate images

    // settings of nnet:
    networkSize = networkSize_ || 16;
    nHidden = nHidden_ || 8;

    colorMode = typeof colorMode_ === 'undefined' ? 0 : colorMode_;
    alphaMode = 1; // typeof alphaMode_ === 'undefined' ? 0 : alphaMode_;

    var model = [];
    var i;

    var randomSize = 1.0;

    var nOut = 5;
    var nIn = 6;

    if (colorMode === 0) { // bw
      nOut = 1;
    } else if (colorMode === 1) { // rgb
      nOut = 3;
    } else if (colorMode === 2) { // cymk
      nOut = 4;
    } else if (colorMode === 3) { // hsv
      nOut = 3;
    } else if (colorMode === 3) { // hsl
      nOut = 4;
    }

    if (alphaMode === 1) {
      nOut += 1;
    }

    // define the model below:
    model.w_in = R.RandMat(networkSize, nIn, 0, randomSize); // x, y, r, z1, z2, and bias

    for (i = 0; i < nHidden; i++) {
      model['w_'+i] = R.RandMat(networkSize, networkSize, 0, randomSize);
    }

    model.w_out = R.RandMat(nOut, networkSize, 0, randomSize); // output layer

    return model;
  };

  var forwardNetwork = function(model, x_, y_, z1, z2, graph_) {
    // x_, y_ is a normal javascript float, will be converted to a mat object below
    // can pass in graph object if one needs backprop later.

    var x = new R.Mat(6, 1); // input
    var i;
    x.set(0, 0, x_);
    x.set(1, 0, y_);
    x.set(2, 0, Math.sqrt(y_*y_+x_*x_));
    x.set(3, 0, z1);
    x.set(4, 0, z2);
    x.set(5, 0, 1.0); // bias.
    var out;
    var G = typeof graph_ === 'undefined'? G0 : graph_;
    out = G.tanh(G.mul(model.w_in, x));
    for (i = 0; i < nHidden; i++) {
      if (i % 2  === 0) {
        out = G.tanh(G.mul(model['w_'+i], out));
      } else {
        out = G.tanh(G.mul(model['w_'+i], out));
      }
    }
    out = G.sigmoid(G.mul(model.w_out, out));
    return out;
  };

  function getColorAt(model, x, y, z1, z2) {
    // function that returns a color given coordintes (x, y)
    // (x, y) are scaled to -0.5 -> 0.5 for image recognition later
    // but it can be behond the +/- 0.5 for generation above and beyond
    // recognition limits
    var r, g, b, a;
    a = 1.0;
    var cc, cm, cy, ck;
    var h, s, v, l;
    var c;
    var alphaIndex = 0;
    var out = forwardNetwork(model, x, y, z1, z2);

    if (colorMode === 0) { // bw
      alphaIndex = 1;
      r = out.w[0];
      g = r;
      b = r;
    } else if (colorMode === 1) { // rgb
      alphaIndex = 3;
      r = out.w[0];
      g = out.w[1];
      b = out.w[2];
    } else if (colorMode === 2) { // cymk
      alphaIndex = 4;
      cc = out.w[0];
      cm = out.w[1];
      cy = out.w[2];
      ck = Math.abs(2*out.w[3]-1);
      r = (1-cc)*ck;
      g = (1-cm)*ck;
      b = (1-cy)*ck;
    } else if (colorMode === 3) { // hsv
      alphaIndex = 3;
      h = out.w[0];
      s = out.w[1];
      v = out.w[2];
      c = hsvToRgb(h, s, v);
      r = c[0];
      g = c[1];
      b = c[2];
    } else if (colorMode === 4) { // hsl
      alphaIndex = 3;
      h = out.w[0];
      s = out.w[1];
      l = out.w[2];
      c = hslToRgb(h, s, l);
      r = c[0];
      g = c[1];
      b = c[2];
    }

    if (alphaMode === 1) {
      a = 1-Math.abs(2*out.w[alphaIndex]-1);
      a = 0.25 + 0.75*a;
    } else {
      a = 1.0;
    }

    return [r, g, b, a];
  }

  function genImage(model, sizeh, sizew, z1, z2, alphaMode_) {

    var img = new Image(sizeh, sizew);
    var offset;
    var i, j;
    var factor = Math.min(sizeh, sizew);
    var c;

    alphaMode = typeof alphaMode_ === 'undefined' ? 0 : alphaMode_;

    for (i = 0; i < sizeh; i++) {
      for (j = 0; j < sizew; j++) {
        offset = i*sizew;
        c = getColorAt(model, i/factor-0.5,j/factor-0.5, z1, z2);
        img.r[offset+j]=c[0];
        img.g[offset+j]=c[1];
        img.b[offset+j]=c[2];
        img.a[offset+j]=c[3];
      }
    }

    return img;

  }

  // exports:

  global.Image = Image;
  global.createModel = createModel;
  global.genImage = genImage;

})(NetArt);
(function(lib) {
  "use strict";
  if (typeof module === "undefined" || typeof module.exports === "undefined") {
    //window.jsfeat = lib; // in ordinary browser attach library to window
  } else {
    module.exports = lib; // in nodejs
  }
})(NetArt);
