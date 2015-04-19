selected = null;
geocoder = {};
map = {};
t = 0;

var config = {
  mapOptions: {
    zoom: true,
    scrollwheel: true,
    loaderControl: false,
    search:false,
    shareable: false
  },
  vizjson: 'https://arce.cartodb.com/api/v2/viz/84c40c80-e5ef-11e4-a74b-0e853d047bba/viz.json'
};

var onMapClick = function(e) {
  selected = -1;
  //t = setTimeout(function() {
  var coordinates = [e.latlng.lat, e.latlng.lng];

  var latlng = new google.maps.LatLng(coordinates[0], coordinates[1]);
  geocoder.geocode({'latLng': latlng}, function(results, status) {
    if (status == google.maps.GeocoderStatus.OK) {
      if (results && results.length > 0) {
        openPopup(map, null, results[0].formatted_address, coordinates);
      } else {
        openPopup(map, null, "Unknown street", coordinates);
      }
    } else {
      openPopup(map, null, "Unknown street", coordinates);
    }
  });
  //}, 170)
};

var openPopup = function(map, name, address, coordinates, opts, readonly) {

  var comment = "";
  var profile_image_url = "";

  if (opts) {
    comment       = opts.comment;
    profile_image_url = opts.profile_image_url;
  }

  var placeholder = "Thanks" + (username !== "anonymous" ? ", " + username : "" )  + "! Why do you think I should go " + (name !== null ? ("to " + name) : " here" ) + "?";

  var getPlaceName = function(name) {

    if (name) {
      return name;
    }

    var places = ["Unknown place", "Misterious place", "Misterious location", "Unkown spot"];
    return _.shuffle(places)[0];

  };

  name = getPlaceName(name);

  var content = '<div class="header"><h3>' + name + '</h3></div><div class="Body"><div class="message"><div class="Spinner"></div><div class="success"></div></div><div class="comment"><img class="Avatar" src="' + profile_image_url + '" /> ' + comment + '</div><textarea placeholder="' + placeholder +'" name="name" rows="8" cols="40"></textarea><div class="Controls"><a href="#" class="Button js-add-place">Add this place</a></div></div><div class="footer">' + address + '</div>';

  var className = readonly ? "is--readonly" : "";

  var options = {
    className: "Popup " + className,
    offset: new L.Point(0, 0)
  };

  var popup = L.popup(options)
  .setLatLng(coordinates)
  .setContent(content)
  .openOn(map)

  map.on("popupclose", function() { selected = null });

  var onClickPlace = function(e) {
    e && e.preventDefault();
    e && e.stopPropagation();

    var $el = $(this).closest(".leaflet-popup");
    var $textarea = $el.find("textarea");
    var comment = $textarea.val();
    var data = JSON.stringify({ coordinates: coordinates, name: name, address: address, comment: comment });

    if (!comment) {
      return;
    }

    $el.find(".message").fadeIn(150);

    $.ajax({ url: "/place", data: data, type: "POST", contentType: "application/json", dataType: "json" }).done(function(data) {
      $el.find(".message .success").animate({ top: 0 }, { duration: 100, easing: "easeOutQuad" });
    });
  };

  $(".js-add-place").off("click", onClickPlace);
  $(".js-add-place").on("click", onClickPlace);

};

var goToCoordinates = function(map, coordinates) {
  map.panTo(coordinates);

  setTimeout(function() {
    map.setZoom(15);
  }, 500);
};

onVisLoaded = function(vis, layers) {

  $(document).on("keyup", function(e) {
    if (e.keyCode === 27) {
      map.closePopup();
    }
  });

  var layer = layers[1]
  layer.setInteraction(true);
  var sublayer = layer.getSubLayer(0);

  map = vis.getNativeMap();

  map.on('click', onMapClick);

  sublayer.setInteractivity('cartodb_id, name, description, comment, latitude, longitude, profile_image_url, screen_name');

  var subLayerOptions = {
    sql: "SELECT *, ST_X(ST_Centroid(the_geom)) as longitude,ST_Y(ST_Centroid(the_geom)) as latitude FROM jp",
  }

  sublayer.set(subLayerOptions);

  layer.on('mouseover', function() {
    //$('.leaflet-container').css('cursor','pointer');
  });

  layer.on('mouseout', function() {
    //$('.leaflet-container').css('cursor','auto');
  });

  layer.on('featureOut', function(e, latlng, pos, data, layer) {
    if (selected !== -1) {
      selected = null;
      map.closePopup();
    }
  });

  layer.on('featureOver', function(e, latlng, pos, data, layer) {
    if (selected !== -1 && selected !== data.cartodb_id) {
    selected = data.cartodb_id;
    //if (t) clearTimeout(t);
    e.preventDefault();
    e.stopPropagation();
    //map.closePopup();
    openPopup(map, data.name, data.description, [data.latitude, data.longitude], { comment: data.comment, profile_image_url: data.profile_image_url, screen_name: data.screen_name }, true);
    }
  });


  var input = document.getElementById('pac-input');
  var autocomplete = new google.maps.places.Autocomplete(input);
  geocoder = new google.maps.Geocoder();

  var onPlaceChange = function() {

    var place = autocomplete.getPlace();

    if (!place.geometry) {
      return;
    }

    if (place.geometry.location) {
        selected = -1;

      var lat = place.geometry.location.lat();
      var lng = place.geometry.location.lng();
      var coordinates = [lat, lng];


        goToCoordinates(map, coordinates);

        setTimeout(function() {
          openPopup(map, place.name, place.formatted_address, coordinates);
        }, 900);

    }

  }

  google.maps.event.addListener(autocomplete, 'place_changed', onPlaceChange);

}

$(function() {

  if (username !== "anonymous") {
    $("body").addClass("is--logged");
  }

  $(".js-information-pane > div").html('<h3>Hi!</h3><p>Sit aspernatur nam quod at suscipit expedita nisi incidunt amet veritatis! Quos officia tempora debitis officia suscipit, voluptatem asperiores laboriosam reiciendis quos recusandae. Obcaecati dolorem illum minus consequuntur itaque recusandae?</p> <a href="/login" class="Button">Login with twitter</a>');


  cartodb.createVis('map', config.vizjson, config.mapOptions).done(onVisLoaded);
});
