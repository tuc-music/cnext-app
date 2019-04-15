/**
 * Created by nektarios on 24/2/2016.
 */
(function () {
  'use strict';

  /*global angular */
  angular.module('cnextApp.locationControllers', [])
    .controller('MapCtlr', ['$scope', '$rootScope', '$q', '$state', '$timeout', '$translate', '$localStorage', 'InfoService', 'NetworkService', 'LocationService', '$ionicLoading', '$ionicPopup', 'CONST', 'EventsService', 'allEvents', '$compile', '$ionicPopover', 'GoogleMaps', 'GuiUtilsService',
      function ($scope, $rootScope, $q, $state, $timeout, $translate, $localStorage, InfoService, NetworkService, LocationService, $ionicLoading, $ionicPopup, CONST, EventsService, allEvents, $compile, $ionicPopover, GoogleMaps, GuiUtilsService) {

        $scope.filterOptions = {
          timeFilters: [CONST.TIME_FILTERS.ALL, CONST.TIME_FILTERS.TODAY, CONST.TIME_FILTERS.UPCOMING, CONST.TIME_FILTERS.PAST],
          placeFilters: [{id: 'ALL', label: $translate.instant("EVERYWHERE")}]
        };

        $scope.placeFilterType = CONST.PLACE_FILTERS[CONST.DEFAULT_PLACE_FILTER];

        if ($localStorage.hasEntry(CONST.APP_SETTINGS_KEY)) {
          var settings = $localStorage.getObject(CONST.APP_SETTINGS_KEY);
          $scope.placeFilterType = settings.placeFilter ? CONST.PLACE_FILTERS[settings.placeFilter] : $scope.placeFilterType;
        }

        $scope.getMapZoom = function () {
          if ($scope.activeFilters.placeFilter === 'ALL') {
            return 4;
          } else if ($scope.activeFilters.placeFilter === 'nearBy') {
            return 12;
          } else if ($scope.placeFilterType.value === 'country') {
            return 5;
          } else {
            return 12;
          }
        };

        $scope.initFilters = function () {
          var tFilter = $localStorage.getObjectDefault(CONST.APP_SETTINGS_KEY, CONST.DEFAULT_APP_SETTINGS).timeFilter;
          $scope.activeFilters = {
            timeFilter: tFilter,
            placeFilter: 'ALL',
            placeFilterLabel: $translate.instant("EVERYWHERE")
          };
        };
        $scope.initFilters();
        $scope.allEvents = [];

        $scope.resetData = function () {
          angular.copy(allEvents, $scope.allEvents);
          $scope.filteredEvents = [];
          $scope.filterOptions.placeFilters = [{id: 'ALL', label: $translate.instant("EVERYWHERE")}];
          $scope.markers = []
        };

        $scope.$on('$ionicView.enter', function () {
          var elms = document.getElementsByClassName("title title-center header-item");
          for (var i = 0; i < elms.length; i++) {
            elms[i].style.left = "50px";
            elms[i].style.right = "70px";
          }
          if ($scope.map) {
            $rootScope.$broadcast('loading:hide');
          }
        });

        $scope.applyTimeFilter = function () {
          console.log('Applying Time Filter');
          var deferred = $q.defer();
          $scope.resetData();
          var toDay = function () {
            var now = new Date();
            return new Date(now.getFullYear(), now.getMonth(), now.getDate());
          };
          $scope.filteredEvents = EventsService.filterEventsByTime($scope.allEvents, $scope.activeFilters.timeFilter.id);
          console.log('Filtered Events:');
          console.log($scope.filteredEvents);
          deferred.resolve($scope.filteredEvents);
          return deferred.promise;
        };

        $scope.setFilter = function (filterValue, filterType, filterLabel) {
          if (filterType === 'time') {
            $scope.activeFilters.timeFilter = filterValue;
            $scope.clearMap();
            $scope.applyTimeFilter().then($scope.prepareMapData).then($scope.filterMap);
            $scope.timeFilterMenu.hide();
          } else if (filterType === 'place') {
            $scope.activeFilters.placeFilter = filterValue;
            $scope.activeFilters.placeFilterLabel = filterLabel;
            $scope.clearMap();
            $scope.filterMap();
            $scope.placeFilterMenu.hide();
          }
        };

        /*Function that Gets all Events and Creates appropriate Markers and InfoWindows (stored in $scope.data)*/
        $scope.prepareMapData = function () {
          $ionicLoading.show(CONST.LOADER_CFG);
          //console.log('Preparing Map Data');
          var deferred = $q.defer();
          angular.forEach($scope.filteredEvents, function (evt) {
            var evtPlace = new google.maps.LatLng(evt.venue.latitude, evt.venue.longitude);
            var evtTitle = (evt.title.length > 100) ? evt.title.substring(0, 50) + '...' : evt.title;
            /*var evtDesc = (evt.description.length > 300) ? evt.description.substring(0, 300) + '...' : evt.description;*/
            if (!_.findWhere($scope.filterOptions.placeFilters, {id: evt.venue[$scope.placeFilterType.value]})) {
              $scope.filterOptions.placeFilters.push({
                id: evt.venue[$scope.placeFilterType.value],
                label: '@' + evt.venue[$scope.placeFilterType.value]
              });
            }

            var winPrefix = '<div>' +
              '<h2 id="firstHeading" class="firstHeading royal">' + evt.venue.title + '</h2>' +
              '<div class="stable-bg padding-4 font-larger">' + evt.venue.address + ', ' + evt.venue.city + ', ' + evt.venue.country + '</div>' +
              '<h4 class="bordered-bottom-dark">' + $translate.instant("EVENTS") + '</h4>' +
              '<div id="bodyContent" class="">';

            var eventTimeEntry = (evt.parentEventId === '') ? EventsService.getFormattedEventDateRange(evt) : EventsService.getFormattedEventDateTime(evt, 'start', 'DD MMMM HH:mm');
            var eventEntry = '<div class="card padding">' +
              '<p class="cnext-purple-text font-larger">' + evtTitle + '</p>' +
              '<p><b>' + $translate.instant("WHEN") + ': </b><span>' + eventTimeEntry + '</span></p>' +
              '<p class="text-center"><button class="button button-block button-calm" ui-sref="app.event({eventId:' + evt.id + '})"> ' + $translate.instant("VIEW_EVENT") + '</button></p>' +
              '</div>';

            var marker, venueMarker;
            venueMarker = _.find($scope.markers, function (aMarker) {
              var marker = aMarker.marker;
              return (marker.position.lat() === evtPlace.lat()) && (marker.position.lng() === evtPlace.lng());
            });
            if (!venueMarker) {
              marker = new google.maps.Marker({
                map: null,
                animation: google.maps.Animation.DROP,
                position: evtPlace,
                desc: '',
                venueId: evt.venue.id
              });

              marker.desc = winPrefix + eventEntry;
              $scope.markers.push({place: evt.venue[$scope.placeFilterType.value], marker: marker});
            } else {
              marker = venueMarker.marker;
              marker.desc += eventEntry;
            }
          });
          //console.log('Place Filters');
          //console.log($scope.filterOptions.placeFilters);

          $scope.markers.forEach(function (venueMarker) {
            var marker = venueMarker.marker;
            marker.desc += '</div></div>';
            google.maps.event.addListener(marker, 'click', function () {
              var infoWindow = new google.maps.InfoWindow({});
              var compiled = $compile(marker.desc)($scope);
              infoWindow.setContent(compiled[0]);
              infoWindow.open($scope.map, this);
            });
          });
          deferred.resolve($scope.markers);
          return deferred.promise;
        };

        /*Function that Initializes Google Map after tracking user's Location*/
        $scope.initializeMap = function () {
          //console.log('Initializing the Map');
          var deferred = $q.defer();
          var mapOptions = {
            center: null,
            zoomControl: false,
            streetViewControl: false,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            mapTypeControl: false,
            disableDefaultUI: true
          };

          var drawMyLocationMarker = function (location) {
            new google.maps.Marker({
              map: $scope.map,
              icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png',
              animation: google.maps.Animation.DROP,
              position: location,
              title: $translate.instant("POP_UP.YOUR_LOCATION.BODY")
            }).addListener('click', function () {
              $ionicPopup.alert({
                title: $translate.instant("POP_UP.YOUR_LOCATION.TITLE"),
                template: $translate.instant("POP_UP.YOUR_LOCATION.BODY"),
                cssClass: 'cnextPop'
              });
            });
          };
          //console.log('Trying to get Location and create the map');
          LocationService.getUserLocation().then(function (latLng) {
            //console.log('Location is on');
            mapOptions.center = latLng;
            $scope.currentLocation = latLng;
            $scope.map = new google.maps.Map(document.getElementById("map"), mapOptions);
            google.maps.event.addListenerOnce($scope.map, 'idle', function () {
              //console.log('Map is Idle!');
              drawMyLocationMarker(latLng);
              $ionicLoading.hide();
              deferred.resolve($scope.map);
            });
          }, function () {
            //console.log('Location is off');
            mapOptions.center = new google.maps.LatLng(CONST.USER_LOCATION.DEFAULT.LAT, CONST.USER_LOCATION.DEFAULT.LON);
            $scope.map = new google.maps.Map(document.getElementById("map"), mapOptions);
            google.maps.event.addListenerOnce($scope.map, 'idle', function () {
              console.log('Map is Idle (No Location)!');
              $ionicLoading.hide();
              deferred.resolve($scope.map);
            });
          });
          return deferred.promise;
        };

        $scope.clearMap = function () {
          /* $scope.directionsDisplay.set('directions',null);*/
          angular.forEach($scope.markers, function (venueMarker) {
            venueMarker.marker.setMap(null);
          });
        };

        $scope.filterMap = function () {
          console.log('Filtering Map');
          var drawMarkers = function (venueMarkers) {
            if (!venueMarkers) {
              venueMarkers = $scope.markers;
            }
            if (!venueMarkers.length > 0) {
              GuiUtilsService.showToastNotification($translate.instant('NO_EVENTS'), 'SHORT');
            }
            angular.forEach(venueMarkers, function (venueMarker) {
              venueMarker.marker.setMap($scope.map);
            });
          };

          if ($scope.activeFilters.placeFilter === "ALL") {
            $scope.map.setZoom($scope.getMapZoom());
            drawMarkers();
            if ($scope.currentLocation) {
              $scope.map.setCenter($scope.currentLocation);
              $scope.filterOptions.placeFilters.splice(1, 0, {id: 'nearBy', label: $translate.instant("NEAR_BY")});
            } else if ($scope.markers.length > 0) {
              $scope.map.setCenter($scope.markers[0].position);
            } else {
              $scope.map.setCenter(new google.maps.LatLng(CONST.USER_LOCATION.DEFAULT.LAT, CONST.USER_LOCATION.DEFAULT.LON));
            }
          } else if ($scope.activeFilters.placeFilter === "nearBy") {
            //nearBy filter is enabled only when currentLocation is known...
            var visibleMarkers = _.filter($scope.markers, function (venueMarker) {
              return LocationService.getDistanceOfLocationsInKm($scope.currentLocation, venueMarker.marker.getPosition()) < 50;
            });
            $scope.map.setZoom($scope.getMapZoom());
            drawMarkers(visibleMarkers);
            $scope.map.setCenter($scope.currentLocation);

            /*LocationService.getPlaceOfLocation($scope.currentLocation).then(function (userPlace) {
              console.log('Displaying Markers for ' + userPlace);
              var visibleMarkers = _.where($scope.markers, {place: userPlace});
              //$scope.map.setZoom(5);
              drawMarkers(visibleMarkers);
              $scope.map.setCenter($scope.currentLocation);
            });*/
          } else {
            var visibleMarkers = _.where($scope.markers, {place: $scope.activeFilters.placeFilter});
            drawMarkers(visibleMarkers);
            LocationService.getLocationOfPlace($scope.activeFilters.placeFilter).then(
              function (location) {
                $scope.map.setZoom($scope.getMapZoom());
                $scope.map.setCenter(location);
              },
              function (error) {
              });
          }
          $rootScope.$broadcast('loading:hide');
        };

        $ionicPopover.fromTemplateUrl('templates/partials/timeFilter-menu.html', {
          scope: $scope
        }).then(function (popover) {
          $scope.timeFilterMenu = popover;
        });

        $ionicPopover.fromTemplateUrl('templates/partials/places-menu.html', {
          scope: $scope
        }).then(function (popover) {
          $scope.placeFilterMenu = popover;
        });

        if (!NetworkService.isOnline()) {
          return;
        }

        if (!GoogleMaps.isLoaded()) {
          GoogleMaps.loadApi().then(function () {
            //console.log(google);
            $scope.applyTimeFilter()
              .then($scope.prepareMapData)
              .then($scope.initializeMap)
              .then($scope.filterMap);
          }, function (error) {
            //console.log(error);
            $rootScope.$broadcast('loading:hide');
            $ionicPopup.alert({
              title: $translate.instant("OOOPS"),
              template: $translate.instant("GMAPS_LOAD_ERROR"),
              cssClass: 'cnextPop'
            });
          });
        } else {
          $scope.applyTimeFilter()
            .then($scope.prepareMapData)
            .then($scope.initializeMap)
            .then($scope.filterMap);
        }
      }])

    .controller('GameCtlr', ['$scope', '$rootScope', '$q', '$state', '$timeout', '$translate', '$localStorage', '$injector', 'InfoService', 'GuiUtilsService', 'LocationService', '$ionicLoading', '$ionicPopup', 'CONST', 'EventsService', 'allEvents', '$compile', '$ionicPopover', 'GoogleMaps',
      function ($scope, $rootScope, $q, $state, $timeout, $translate, $localStorage, $injector, InfoService, GuiUtilsService, LocationService, $ionicLoading, $ionicPopup, CONST, EventsService, allEvents, $compile, $ionicPopover, GoogleMaps) {

        $scope.os = InfoService.get(CONST.OS_KEY);
        $scope.games = [];
        $scope.currentGame = undefined;
        $scope.currentGameMarkers=[];
        var poiVisits={};
        var pois={};
        var lbsNtfs = {};
        $scope.lbsSettings = $localStorage.getObjectDefault(CONST.APP_SETTINGS_KEY, CONST.DEFAULT_APP_SETTINGS).lbsSettings;

        /*Start/Stop Playing Games*/
        $scope.applyLbs = function(){
          var LbsManager = $injector.get('LbsManager');
          var UsersService = $injector.get('UsersService');
          if (!$scope.lbsSettings.allow){
            if (!UsersService.isUserLoggedIn()){
              GuiUtilsService.showToastNotification('Games are for logged in users only. Please Login.','LONG');
              return false;
            }else {
              $scope.lbsSettings.allow=true;
              $scope.lbsSettings.gps.allow=true;
              $scope.lbsSettings.bcn.allow=true;
              LbsManager.start();
            }
          }else{
            LbsManager.stop();
            $scope.lbsSettings.allow=false;
            $scope.lbsSettings.gps.allow=false;
            $scope.lbsSettings.bcn.allow=false;
          }
          var appSettings = $localStorage.getObjectDefault(CONST.APP_SETTINGS_KEY,CONST.DEFAULT_APP_SETTINGS);
          appSettings.lbsSettings = $scope.lbsSettings;
          $localStorage.setObject(CONST.APP_SETTINGS_KEY,appSettings);
          return true;
        };

        /*Live Update Map on game updates*/
        $rootScope.$on('lbs:updated',function(){
          console.log('on lbs:updated');
          $scope.clearMap();
          $scope.initGamingData();
          $scope.drawMap();
        });

        $scope.initGamingData = function () {
          console.log('Gaming Init....');
          /*The pois that the player has visited*/
          poiVisits = $localStorage.getObjectDefault('POI_REPORTS', {});
          /*The config of all active pois*/
          pois = $localStorage.getObjectDefault('POIS', {});
          /*The list of all LBS notifications received*/
          lbsNtfs = $localStorage.getObjectDefault(CONST.LBS.NOTIFICATIONS_KEY,{});
          var scenarios = $localStorage.getObjectDefault('SCENARIOS',{'0':{id:0,name:'cNext Gaming'}});
          $scope.games=[];
          angular.forEach(Object.keys(scenarios),function(key){
            var game = scenarios[key];
            game.completed=false;
            game.started=false;
            $scope.games.push(game);
          });
          /* This is to test the case that no games are defined in the backend
          $scope.games.push({id:0,name:'No gaming data yet'});*/
          if (!$scope.currentGame || $scope.currentGame.id===0){
            $scope.currentGame=$scope.games[0];
          }else{
            $scope.currentGame = _.findWhere($scope.games,{id:$scope.currentGame.id});
          }
        };

        $scope.$on('$ionicView.enter', function () {
          var elms = document.getElementsByClassName("title title-center header-item");
          for (var i = 0; i < elms.length; i++) {
            elms[i].style.left = "50px";
            elms[i].style.right = "70px";
          }
          /*$timeout(function () {
            $ionicLoading.hide();
            console.log('ioningLoading killed!');
          },4000);*/
        });

        var PushService = $injector.get('PushService');
        var ModalService = $injector.get('ModalService');

        $scope.showHelp = function () {
          ModalService.show('templates/partials/game-help.html', 'LbsModalCtlr', {});
        };

        $scope.previewLbsMessage = function (ntfKey) {
          var ntf = lbsNtfs[ntfKey];
          ModalService.show('templates/partials/modal-msg-window.html', 'LbsModalCtlr', ntf).then(function (confirmed) {
            if (confirmed) {
              var PushService = $injector.get('PushService');
              PushService.processNotification(ntf);
            }
          });
        };

        $scope.resetPoiData = function (ntfKey) {
          var allPoiReports = $localStorage.getObjectDefault('POI_REPORTS', {});
          if (allPoiReports[ntfKey]) {
            delete allPoiReports[ntfKey]
          }
          $localStorage.setObject('POI_REPORTS', allPoiReports);
          //console.log('POI_REPORTS updated: ' + JSON.stringify(allPoiReports));
          //var ntfKeysToDelete = [];
          angular.forEach(Object.keys(lbsNtfs), function (storedNtfKey) {
            if (storedNtfKey.startsWith(ntfKey)) {
              delete lbsNtfs[storedNtfKey];
            }
          });
          $localStorage.setObject(CONST.LBS.NOTIFICATIONS_KEY,lbsNtfs);
          var GeoTracker = $injector.get('GeoTracker');
          var BeaconTracker = $injector.get('BeaconTracker');
          GeoTracker.resetTrackingData();
          BeaconTracker.resetTrackingData();
          $scope.initGamingData();
          $scope.clearMap();
          $scope.drawMap();
        };

        $scope.LS = LocationService;
        $scope.playerLocationMarker = undefined;
        //$scope.showPlayerLocation = true;

        var drawMyLocationMarker = function () {
          var dot = {
            path: google.maps.SymbolPath.CIRCLE,
            strokeColor: '#4390ff',
            fillColor: '#4390ff',
            fillOpacity: 1,
            scale: 7
          };
          if (!$scope.playerLocationMarker) {
            $scope.playerLocationMarker = new google.maps.Marker({
              map: $scope.gameMap,
              icon: dot,
              position: {lat: $scope.LS.currentLocation.lat(), lng: $scope.LS.currentLocation.lng()},
            });
            $scope.playerLocationMarker.addListener('click', function () {
              $ionicPopup.alert({
                title: $translate.instant("POP_UP.YOUR_LOCATION.TITLE"),
                template: $translate.instant("POP_UP.YOUR_LOCATION.BODY"),
                cssClass: 'cnextPop'
              });

            });
            $scope.gameMap.setCenter($scope.LS.currentLocation);
            $scope.locationUpdater = setInterval(function () {
              $scope.playerLocationMarker.setPosition($scope.LS.currentLocation);
            }, 3000);
          }else{
            //$scope.playerLocationMarker.setMap($scope.gameMap);
          }
        };

        $scope.createMap = function () {
          $scope.gameMap = new google.maps.Map(document.getElementById('game-map'), {
            zoomControl: false,
            streetViewControl: false,
            mapTypeId: google.maps.MapTypeId.HYBRID,
            mapTypeControl: false,
            disableDefaultUI: true,
            zoom: 18,
            center: $scope.LS.currentLocation
          });
        };

        $scope.clearMap = function(){
          angular.forEach($scope.currentGameMarkers,function(mrkr){
            mrkr.setMap(null);
          });
          if ($scope.directionsDisplay) {
            $scope.directionsDisplay.setMap(null);
          }
        };

        var drawPolyline = function (points, map,dashed) {
          if (dashed){
            var lineSymbol = {
              path: 'M 0,-1 0,1',
              strokeOpacity: 1,
              strokeWeight:5,
              strokeColor: '#4390ff',
              scale: 4
            };

            return new google.maps.Polyline({
              path: points,
              strokeOpacity: 0,
              icons: [{
                icon: lineSymbol,
                offset: '0',
                repeat: '20px'
              }],
              map: map
            });
          }else{
            return new google.maps.Polyline({
              path: points,
              strokeOpacity: 1.0,
              strokeColor: '#4390ff',
              strokeWeight:5,
              map: map
            });
          }

        };

        $scope.setActiveGame=function(game){
          $scope.currentGame=game;
          $scope.gameFilterMenu.hide();
          $scope.clearMap();
          $scope.drawMap();
        };

        $ionicPopover.fromTemplateUrl('templates/partials/game-filter-menu.html', {
          scope: $scope
        }).then(function (popover) {
          $scope.gameFilterMenu = popover;
        });

        $ionicPopover.fromTemplateUrl('templates/partials/game-info-window.html', {
          scope: $scope
        }).then(function (popover) {
          $scope.gameInfoWindow = popover;
        });


        $scope.drawMap = function () {
          var visitOrder = Object.keys(poiVisits).sort();
          var playerRoutePoints = [];
          var playerTrcks=[];
          //var labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
          var labelIdx = 0;
          angular.forEach(visitOrder, function (poiId) {
            if (!poiId.startsWith($scope.currentGame.id) || !pois[poiId]){
              return;
            }
            $scope.currentGame.started=true;
            var poi = pois[poiId];
            labelIdx++;
            /*1. Add Poi Location to Directions Route*/
            var mapLoc=new google.maps.LatLng(poi.trackingInfo.lat, poi.trackingInfo.lng);
            playerTrcks.push(mapLoc);

            playerRoutePoints.push({
              location: mapLoc,
              stopover: true
            });


            /*2. Calculate Marker Colour*/
            var poiReport = poiVisits[poiId];
            var factor = 1 / Object.keys(poi.triggers).length;
            var poiActionProgress = 0;
            angular.forEach(Object.keys(poiVisits[poiId]), function (trigger) {
              if (poiVisits[poiId][trigger].completed) {
                poiActionProgress += factor;
              }
            });
            //console.log('Colour Factor for Marker' + labelIdx + '(' + poiId + '): ' + poiActionProgress);
            var markerIcon = 'red.png';
            if (poiActionProgress >= 0.33 && poiActionProgress < 0.66) {
              markerIcon = 'yellow.png';
            } else if (poiActionProgress >= 0.66) {
              markerIcon = 'green.png';
            }

            var markerImg = {
              url: 'http://maps.google.com/mapfiles/ms/icons/' + markerIcon,
              size: new google.maps.Size(40, 40),
              scaledSize: new google.maps.Size(40, 40),
              labelOrigin: new google.maps.Point(20, 12)
            };

            /*3. Check if poiVisit means Game Over*/
            if (poi.gameEnd && poiActionProgress===1){
              $scope.currentGame.completed=true;
            }

            /*4. Calculate Marker InfoWindow Contents*/
            var winPrefix = '<div><h3 class="firstHeading calm">' + poi.logicalName + '</h3>';
            if (InfoService.is(CONST.LBS.TESTING_KEY,true)){
              winPrefix += '<span class="note">Completed Actions: ' + poiActionProgress * 100 + '%</span>';
            }
            var msgsHeader = '<h4 class="bordered-bottom-stable">Instructions Given</h4>' +
              '<div id="bodyContent" class="">';
            var headerIn = false;
            angular.forEach(Object.keys(lbsNtfs), function (ntfKey) {
              if (ntfKey.startsWith(poiId)) {
                var ntf = lbsNtfs[ntfKey];
                if (!headerIn) {
                  winPrefix += msgsHeader;
                  headerIn = true;
                }
                var msgEntry = '<div class="card padding">' +
                  '<p class="cnext-purple-text font-larger">' + ntf.popUpTitle + '</p>' +
                  '<p><b>' + moment(ntf.dateTimeSent).format('LLL') + ' (when ' + ntf.trigger.toLowerCase() + ')</b></p>' +
                  '<p><button class="button button-small button-calm float-right" ng-click="previewLbsMessage(\'' + ntfKey + '\')"> ' + 'View Message' + '</button></p>' +
                  '</div>';
                winPrefix += msgEntry;
              }
            });
            /*4. Create the Marker*/
            var marker = new google.maps.Marker({
              map: $scope.gameMap,
              icon: markerImg,
              position: new google.maps.LatLng(poi.trackingInfo.lat, poi.trackingInfo.lng),
              label: {
                text: labelIdx + '',
                fontSize: '12px'
              },
              desc: poi.logicalName
            });
            var contentSuffix = headerIn ? '</div>' : '';
            //var txt = (InfoService.is(CONST.LBS.TESTING_KEY,true) && $scope.currentGame.completed===false)? winPrefix + '<div class="margin-vertical-4"><button class="button button-block button-assertive button-outline" ng-click="resetPoiData(\'' + poiId + '\')"> ' + 'Reset Data for this Point' + '</button></div></div>': winPrefix +'</div>';
            var txt = (InfoService.is(CONST.LBS.TESTING_KEY,true))? winPrefix + '<div class="margin-vertical-4"><button class="button button-block button-assertive button-outline" ng-click="resetPoiData(\'' + poiId + '\')"> ' + 'Reset Data for this Point' + '</button></div></div>': winPrefix +'</div>';

            google.maps.event.addListener(marker, 'click', function () {
              var infoWindow = new google.maps.InfoWindow({});
              var $compile = $injector.get('$compile');
              var compiled = $compile(txt)($scope);
              infoWindow.setContent(compiled[0]);
              infoWindow.open($scope.gameMap, this);
            });

            $scope.currentGameMarkers.push(marker);
          });

          if (playerRoutePoints.length > 0) {
            if ($scope.lbsSettings.usePolyLine) {
              drawPolyline(playerTrcks, $scope.gameMap);
            }else {
              var rendererOptions = {map: $scope.gameMap, suppressMarkers: true};
              $scope.directionsDisplay = new google.maps.DirectionsRenderer(rendererOptions);
              $scope.directionsService = new google.maps.DirectionsService();
              var org = playerRoutePoints[0].location;
              var dest = playerRoutePoints[playerRoutePoints.length - 1].location;
              var request = {
                origin: org,
                destination: dest,
                waypoints: playerRoutePoints,
                travelMode: google.maps.DirectionsTravelMode.WALKING
              };

              $scope.directionsService.route(request, function (response, status) {
                if (status == google.maps.DirectionsStatus.OK) {
                  $scope.directionsDisplay.setDirections(response);
                  /*var linePoints = [];
                  linePoints.push(dest);
                  linePoints.push($scope.LS.currentLocation);
                  drawPolyline(linePoints,$scope.gameMap);*/
                } else {
                  console.log('failed to get directions');
                }
              });
            }
          }
          /*else if ($scope.currentGame.id!==0){
            GuiUtilsService.showToastNotification('You have not made any progress in this game. Move On!', 'SHORT');
          }*/
          drawMyLocationMarker();
          $rootScope.$broadcast('loading:hide');
        };

        LocationService.getUserLocation().then(function (latLng) {
          //GuiUtilsService.log('Player Location ON!');
          //console.log($scope.LS.currentLocation);
          $scope.initGamingData();
          $scope.createMap();
          $ionicLoading.hide();
          $scope.drawMap();
        }, function () {
          if (GoogleMaps.isLoaded()) {
            $scope.LS.currentLocation = new google.maps.LatLng(CONST.USER_LOCATION.DEFAULT.LAT, CONST.USER_LOCATION.DEFAULT.LON);
            $scope.initGamingData();
            $scope.createMap();
            $ionicLoading.hide();
            $scope.drawMap();
          } else {
            $ionicLoading.hide();
            GuiUtilsService.showToastNotification("Google Maps cannot be Loaded", 'SHORT');
          }
        });

      }]);
}());
