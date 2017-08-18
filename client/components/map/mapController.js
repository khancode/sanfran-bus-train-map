
app.controller('mapController', ['$scope', '$interval', '$http', '$location', function($scope, $interval, $http, $location) {

    $scope.vehicles = [];
    $scope.routeTags = [];
    $scope.routeColorMap = {};
    $scope.routeTagSelected = '';
    $scope.routeTagsSelected = [];

    var projection;
    getRouteTags();
    getVehicleLocations();
    initD3();

    $interval(function() {
      getVehicleLocations();
    }, 15000);

    $scope.onRouteTagSelect = function() {
      if ($scope.routeTagSelected.length === 0) {
        return;
      }

      const routeTagSelected = $scope.routeTagSelected[0];

      if (routeTagSelected === 'All') {
        for (const i in $scope.routeTagsSelected) {
          const rt = $scope.routeTagsSelected[i];
          $scope.routeTags.push({ tag: rt });
        }

        $scope.routeTagsSelected = [];
      } else {
        for (const i in $scope.routeTags) {
          const rt = $scope.routeTags[i];

          if (rt.tag === routeTagSelected) {
            $scope.routeTags.splice(i, 1);
            break;
          }
        }

        $scope.routeTagsSelected.push(routeTagSelected);
      }

      refreshMap();
    };

    $scope.onChipClose = function(routeTag) {
      for (const i in $scope.routeTagsSelected) {
        const rt = $scope.routeTagsSelected[i];
        if (rt === routeTag) {
          $scope.routeTagsSelected.splice(i, 1);
          break;
        }
      }

      $scope.routeTags.push({ tag: routeTag });

      refreshMap();
    };

    function getRouteTags() {
      $http.get('http://webservices.nextbus.com/service/publicJSONFeed?command=routeList&a=sf-muni')
        .then((data) => {
          console.log('dat data:');
          console.log(data);

          const routes = data.data.route;
          $scope.routeTags = routes;
          $scope.routeColorMap = createRouteColorMap($scope.routeTags);
        });
    }

    function createRouteColorMap(routes) {
      var color_scale = d3.scale.linear().domain([0, routes.length]).range(['beige','red']);

      const routeColorMap = {};
      for (const i in routes) {
        const r = routes[i];
        routeColorMap[r.tag] = color_scale(i);
        console.log(color_scale(i));
      }

      return routeColorMap;
    }

    function getVehicleLocations() {
      $http.get('http://webservices.nextbus.com/service/publicJSONFeed?command=vehicleLocations&a=sf-muni')
        .then((data) => {
          $scope.vehicles = data.data.vehicle;
          refreshMap();
        });
    };

    function refreshMap() {
      const feed = [];
      let j = 0;
      for (let i = 0; i < $scope.vehicles.length; i++) {
        const v = $scope.vehicles[i];
        if ($scope.routeTagsSelected.length === 0 || $.inArray(v.routeTag, $scope.routeTagsSelected) > -1) {
          feed[j++] = [v.lon, v.lat, v];
        }
      }

      var tip = d3.tip()
        .attr('class', 'd3-tip')
        .html(function(d) { return '<p>Route Tag: ' + d[2].routeTag + '</p>'; })
        .direction('nw')
        .offset([0, 3])

      var svg = d3.select("svg");
      svg.call(tip);

      svg.selectAll("circle").remove();
      svg.selectAll('circle').data(feed).enter()
      .append("circle")
      .attr("cx", function (d) { return projection(d)[0]; })
      .attr("cy", function (d) { return projection(d)[1]; })
      .attr("r", "4px")
      .attr("fill", (d) => {
        const routeTag = d[2].routeTag;
        return $scope.routeColorMap[routeTag];
      })
      .on('mouseover', tip.show)
      .on('mouseout', tip.hide);
    }

    function initD3() {
      var width = 960,
          height = 700,
          centered;

      // Define color scale
      var color = d3.scale.linear()
        .domain([1, 20])
        .clamp(true)
        .range(['#fff', '#409A99']);

      projection = d3.geo.mercator()
        // Center the Map in San Fran
        .center([-122.433701, 37.767683])
        .scale(240000)
        .translate([width / 2, height / 2]);

      var path = d3.geo.path()
        .projection(projection);

      // Set svg width & height
      var svg = d3.select('svg')
        .attr('width', width)
        .attr('height', height);

      // Add background
      svg.append('rect')
        .attr('class', 'background')
        .attr('width', width)
        .attr('height', height)
        // .on('click', clicked);

      var g = svg.append('g');

      var effectLayer = g.append('g')
        .classed('effect-layer', true);

      var mapLayer = g.append('g')
        .classed('map-layer', true);

      var dummyText = g.append('text')
        .classed('dummy-text', true)
        .attr('x', 10)
        .attr('y', 30)
        .style('opacity', 0);

      var bigText = g.append('text')
        .classed('big-text', true)
        .attr('x', 20)
        .attr('y', 45);

      // Load map data
      d3.json('components/map/sfmaps/neighborhoods.json', function(error, mapData) {
        var features = mapData.features;

        // Update color scale domain based on data
        color.domain([0, d3.max(features, nameLength)]);

        // Draw each neighborhood as a path
        mapLayer.selectAll('path')
            .data(features)
          .enter().append('path')
            .attr('d', path)
            .attr('vector-effect', 'non-scaling-stroke')
            .style('fill', fillFn);

        // points
        aa = [-122.490402, 37.786453];
        bb = [-122.389809, 37.72728];

        // add circles to svg
        svg.selectAll("circle")
        .data([aa,bb]).enter()
        .append("circle")
        .attr("cx", function (d) { return projection(d)[0]; })
        .attr("cy", function (d) { return projection(d)[1]; })
        .attr("r", "8px")
        .attr("fill", "red");
      });

      d3.json('components/map/sfmaps/streets.json', function(error, mapData) {
        var features = mapData.features;

        // Update color scale domain based on data
        color.domain([0, features]);

        // Draw each street as a path
        mapLayer.selectAll('path')
            .data(features)
          .enter().append('path')
            .attr('d', path)
            .attr('vector-effect', 'non-scaling-stroke')
            .style('fill', 'grey');
      });

      // Get neighborhood name
      function nameFn(d){
        return d && d.properties ? d.properties.neighborho : null;
      }

      // Get neighborhood name length
      function nameLength(d){
        var n = nameFn(d);
        return n ? n.length : 0;
      }

      // Get neighborhood color
      function fillFn(d){
        return color(nameLength(d));
      }
    }

}]);
