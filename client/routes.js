
app.config(['$routeProvider', function($routeProvider) {

    $routeProvider

        .when('/', {
            templateUrl: '/client/components/map/map.html',
            controller: 'mapController'
        });

}]);
