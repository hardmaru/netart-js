
// neural network random art generator
var canvas = document.getElementById('netart_canvas');
var ctx = canvas.getContext('2d');

// globs

var image_resolution = 240;
var network_size = R.randi(12, 20);
var network_depth = 24-network_size;

var color_mode = 0;
var alpha_mode = 0;

var z1 = Math.round(R.randf(-1.0, 1.0)*1000)/1000;
var z2 = Math.round(R.randf(-1.0, 1.0)*1000)/1000;

var model = NetArt.createModel(network_size, network_depth, color_mode);
var img;

function display_image() {
  document.getElementById('netart_canvas').width = image_resolution;
  document.getElementById('netart_canvas').height = image_resolution;
  ctx.putImageData(img.getCanvasImage(ctx), 0, 0);
}

function redraw_all() {
  img = NetArt.genImage(model, image_resolution, image_resolution, z1, z2, alpha_mode);
  display_image();
}

// main:

redraw_all();

// below are the UI controls:

$("#reinit_button").click(function() {
  model = NetArt.createModel(network_size, network_depth, color_mode);
  redraw_all();
});

$("#redraw_button").click(function() {
  redraw_all();
});

$("#save_button").click(function(){
  var fileName = "netart.png";
  document.getElementById("save_button").download = fileName;
  document.getElementById("save_button").href = canvas.toDataURL("image/png").replace(/^data:image\/[^;]/, 'data:application/octet-stream');
});

$(function() {
    $( "#sliderResolution" ).slider({
      max : 1080,
      min : 100,
      step : 10,
      value : image_resolution,
      change: function (event, ui) {
        image_resolution = ui.value;
        $("#displayResolution").html("Image Size = "+image_resolution+"px");
      },
    });
});
$("#displayResolution").html("Image Size = "+image_resolution+"px");

$(function() {
    $( "#sliderNetworkSize" ).slider({
      max : 24,
      min : 2,
      step : 1,
      value : network_size,
      change: function (event, ui) {
        network_size = ui.value;
        $("#displayNetworkSize").html("Network Size = "+network_size);
      },
    });
});
$("#displayNetworkSize").html("Network Size = "+network_size);

$(function() {
    $( "#sliderNetworkDepth" ).slider({
      max : 24,
      min : 2,
      step : 1,
      value : network_depth,
      change: function (event, ui) {
        network_depth = ui.value;
        $("#displayNetworkDepth").html("Network Depth = "+network_depth);
      },
    });
});
$("#displayNetworkDepth").html("Network Depth = "+network_depth);

$(function() {
    $( "#sliderZ1" ).slider({
      max : 1.0,
      min : -1.0,
      step : 0.001,
      value : z1,
      change: function (event, ui) {
        z1 = ui.value;
        $("#displayZ1").html("Z1 = "+z1);
      },
    });
});
$("#displayZ1").html("Z1 = "+z1);

$(function() {
    $( "#sliderZ2" ).slider({
      max : 1.0,
      min : -1.0,
      step : 0.001,
      value : z2,
      change: function (event, ui) {
        z2 = ui.value;
        $("#displayZ2").html("Z2 = "+z2);
      },
    });
});
$("#displayZ2").html("Z2 = "+z2);

$(function() {
  $( "#colorMode" ).selectmenu({
    change: function (event, data) {
      color_mode = data.item.index;
    },
  });
  $( "#alphaMode" ).selectmenu({
    change: function (event, data) {
      alpha_mode = data.item.index;
    },
  });
});
