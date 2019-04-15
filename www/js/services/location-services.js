/**
 * Created by nektarios on 10/3/2017.
 */

(function () {
  'use strict';

  /*global angular */
  angular.module('cnextApp.locationServices', [])
    .factory('LocationService', ['$q', 'CONST', '$localStorage', '$cordovaGeolocation', 'GoogleMaps', function ($q, CONST, $localStorage, $cordovaGeolocation, GoogleMaps) {

      var lsFac = {};
      var lastUpdated = moment();
      lsFac.currentLocation = undefined;
      var watcherId = undefined;

      var deg2rad = function (deg) {
        return deg * (Math.PI / 180)
      };

      lsFac.getLocationOfPlace = function (address) {
        var deferred = $q.defer();
        if (!(typeof google === 'object' && typeof google.maps === 'object')) {
          deferred.reject("GoogleMaps api is not loaded");
          return deferred.promise;
        }
        try {
          var geocoder = new google.maps.Geocoder;
          geocoder.geocode({
            'address': address
          }, function (results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
              var cityLocation = results[0].geometry.location;
              deferred.resolve(cityLocation);
            } else {
              console.log('Could not resolve address' + address);
              deferred.reject();
            }
          });
        } catch (ex) {
          deferred.reject("Google Geocoder is not Available");
        }
        return deferred.promise;
      };

      var getLocation = function () {
        var deferred = $q.defer();
        if (lsFac.currentLocation && moment.duration(lastUpdated.diff(moment())).asMinutes() < 2) {
          deferred.resolve(lsFac.currentLocation);
          return deferred.promise;
        }

        try {
          var options = {maximumAge: 0, timeout: 10000, enableHighAccuracy: true};
          $cordovaGeolocation.getCurrentPosition(options).then(function (position) {
            lastUpdated = moment();
            lsFac.currentLocation = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            $localStorage.setObject(CONST.USER_LOCATION.LS_KEY, {coords: lsFac.currentLocation});
            deferred.resolve(lsFac.currentLocation);
          }, function (error) {
            console.log("LS: Could not get location... trying to approximate");
            if ($localStorage.hasEntry(CONST.USER_LOCATION.LS_KEY)) {
              var lastCoords = $localStorage.getObject(CONST.USER_LOCATION.LS_KEY).coords;
              lsFac.currentLocation = new google.maps.LatLng(lastCoords.lat, lastCoords.lng);
              deferred.resolve(lsFac.currentLocation);
            } else {
              deferred.reject();
            }
          });
        } catch (error) {
          console.log(error);
          deferred.reject("Error in Getting User Location");
        }
        return deferred.promise;
      };

      lsFac.getUserLocation = function () {
        var deferred = $q.defer();
        if (!GoogleMaps.isLoaded()) {
          console.log('google is not available');
          GoogleMaps.loadApi()
            .then(function () {
                deferred.resolve(getLocation());
              }
              , function (error) {
                deferred.reject(error);
              });
        } else {
          console.log('LS.getUserLocation: google is available');
          deferred.resolve(getLocation());
        }
        return deferred.promise;
      };

      lsFac.getDistanceOfLocationsInKm = function (p1, p2) {
        var lat1 = p1.lat();
        var lat2 = p2.lat();
        var lon1 = p1.lng();
        var lon2 = p2.lng();
        var R = 6371; // Radius of the earth in km
        var dLat = deg2rad(lat2 - lat1);  // deg2rad below
        var dLon = deg2rad(lon2 - lon1);
        var a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        var d = R * c; // Distance in km
        return d;
      };

      lsFac.getDistanceOfLocationsInM = function (p1, p2) {
        var dis = lsFac.getDistanceOfLocationsInKm(p1, p2)*1000;
        //console.log(dis + ' vs. ' + google.maps.geometry.spherical.computeDistanceBetween(p1, p2));
        return dis;
      };

      lsFac.startWatchingUserLocation = function (onSuccessFn, onErrorFn) {

        var myOnSuccess = function (pos) {
          lsFac.currentLocation = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
          lastUpdated = moment();
          onSuccessFn(pos);
        };

        if (watcherId === undefined) {
          var options = {maximumAge: 0, timeout: 30000, enableHighAccuracy: true};
          watcherId = navigator.geolocation.watchPosition(myOnSuccess, onErrorFn, options);
        }
      };

      lsFac.stopWatchingUserLocation = function () {
        if (watcherId !== undefined) {
          navigator.geolocation.clearWatch(watcherId);
          watcherId = undefined;
        }
        return watcherId!==undefined;
      };

      return lsFac;
    }])

    .factory('GoogleMaps', ['$window', '$localStorage', '$q', 'CONST', '$timeout', function ($window, $localStorage, $q, CONST, $timeout) {
      var gmLoader = {};
      var loadRequest = undefined;

      gmLoader.loadApi = function () {
        if (loadRequest !== undefined) {
          return loadRequest.promise;
        } else {
          loadRequest = $q.defer();
        }

        // Load Google map API script
        function loadGoogleMapsApi() {
          var mapLang = $localStorage.get('NG_TRANSLATE_LANG_KEY', CONST.DEFAULT_GUI_LANG);
          var script = document.createElement('script');
          script.src = 'http://maps.google.com/maps/api/js?v=3.exp&key=' + CONST.SERVICE_PROVIDERS.GOOGLE.MAPS_KEY + '&language=' + mapLang + '&libraries=geometry&callback=onGMapsLoaded';
          document.body.appendChild(script);
        }

        // Script loaded callback, send resolve
        $window.onGMapsLoaded = function () {
          console.log('Google Maps Api Loaded...');
          loadRequest.resolve();
        };
        console.log('Trying to Load Google Maps Api...');
        loadGoogleMapsApi();
        $timeout(function () {
          loadRequest.reject('Google Maps Api could not be loaded');
        }, 20000);

        return loadRequest.promise;
      };

      gmLoader.isLoaded = function () {
        return (typeof google === 'object' && typeof google.maps === 'object');
      }

      return gmLoader;

    }])

    .factory('GeoTracker', ['$http', 'LocationService', 'UsersService', 'InfoService', 'GuiUtilsService', '$localStorage', 'CONST', 'dataUtils', 'LbsManager',
      function ($http, LocationService, UsersService, InfoService, GuiUtilsService, $localStorage, CONST, dataUtils, LbsManager) {
        var gtFac = {};
        var started=false;
        var poisToDetect = [];
        var distanceManager;

        function DistanceManager(pois, onPositionChange) {
          var dm = {};
          dm.distanceMap = {};
          dm.onPoiPositionChange = onPositionChange;

          angular.forEach(pois, function (poi) {
            var out = new Array(CONST.LBS.NUM_OF_MEASURES + 1).join(CONST.LBS.PROXIMITY.OUT.NUM);
            dm.distanceMap[poi.id] = {distances: out, position: CONST.LBS.PROXIMITY.OUT.LEX};
          });

          var calculatePosition = function (proximityNums, oldPosition) {
            var unknown = new Array(CONST.LBS.NUM_OF_MEASURES + 1).join(CONST.LBS.PROXIMITY.UNKNOWN.NUM);
            var out = new Array(CONST.LBS.NUM_OF_MEASURES + 1).join(CONST.LBS.PROXIMITY.OUT.NUM);
            var near = new Array(CONST.LBS.NUM_OF_MEASURES + 1).join(CONST.LBS.PROXIMITY.IN.NUM);
            var close = new Array(CONST.LBS.NUM_OF_MEASURES + 1).join(CONST.LBS.PROXIMITY.CLOSE.NUM);

            switch (proximityNums) {
              case unknown:
                return CONST.LBS.PROXIMITY.UNKNOWN.LEX;
                break;
              case out:
                return CONST.LBS.PROXIMITY.OUT.LEX;
                break;
              case near:
                return CONST.LBS.PROXIMITY.IN.LEX;
                break;
              case close:
                return CONST.LBS.PROXIMITY.CLOSE.LEX;
                break;
            }
            return oldPosition;
          };

          dm.pushDistance = function (poiId, dist) {
            var poiDistances = dm.distanceMap[poiId];
            var oldPoiDistances = poiDistances.distances;
            var newPoiDistances = oldPoiDistances.substr(1, oldPoiDistances.length - 1) + dist;
            poiDistances.distances = newPoiDistances;
            var newPosition = calculatePosition(newPoiDistances, poiDistances.position);
            if (poiDistances.position !== newPosition) {
              poiDistances.position = newPosition;
              dm.onPoiPositionChange(poiId, newPosition);
            }
          };

          dm.reset = function () {
            angular.forEach(Object.keys(dm.distanceMap), function (key) {
              var out = new Array(CONST.LBS.NUM_OF_MEASURES + 1).join(CONST.LBS.PROXIMITY.OUT.NUM);
              dm.distanceMap[key] = {distances: out, position: CONST.LBS.PROXIMITY.OUT.LEX};
            });
          };

          return dm;
        };

        var onPoiPositionChange = function (poiId, position) {
          if (UsersService.getCurrentUserId() < 0) {
            GuiUtilsService.log('PoI Reporting skipped because user is not logged in');
            return;
          }
          GuiUtilsService.log('POI: ' + poiId + ' ' + position + '!');

          if (LbsManager.canPoiTriggerBeFired(poiId, position)) {
            LbsManager.fireTrigger(poiId, position);
          } else {
            GuiUtilsService.log('Trigger: ' + poiId + '.' + position + ' not fired...');
          }
        };

        gtFac.setGeoLocationsMap = function (map) {
          poisToDetect = map;
          angular.forEach(poisToDetect, function (poi) {
            try {
              poi.coords = new google.maps.LatLng(poi.trackingInfo.lat, poi.trackingInfo.lng);
            } catch (error) {
              console.log(error);
            }

          });
          distanceManager = new DistanceManager(poisToDetect);
        };

        gtFac.startMonitoringCnextGeoLocations = function () {
          var onPositionRetrieved = function (position) {
            started = true;
            var userPosition = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
            angular.forEach(poisToDetect, function (poi) {
              var poiPosition = new google.maps.LatLng(poi.trackingInfo.lat, poi.trackingInfo.lng);
              var distance = LocationService.getDistanceOfLocationsInM(userPosition, poiPosition);
              if (poi.trackingInfo.closeRad && distance <= poi.trackingInfo.closeRad) {
                distanceManager.pushDistance(poi.id, CONST.LBS.PROXIMITY.CLOSE.NUM);
              } else if (distance <= poi.trackingInfo.inRangeRad) {
                distanceManager.pushDistance(poi.id, CONST.LBS.PROXIMITY.IN.NUM);
              } else {
                distanceManager.pushDistance(poi.id, CONST.LBS.PROXIMITY.OUT.NUM);
              }
              /*GuiUtilsService.log(poi.id +': ' +poi.status + ' ('+distance + ') ['+position.coords.latitude+','+position.coords.longitude+']');*/
            });
          };
          distanceManager = new DistanceManager(poisToDetect, onPoiPositionChange);
          LocationService.startWatchingUserLocation(onPositionRetrieved, function (error) {
            GuiUtilsService.log('Error in Watching UserLocation: ' + error.message)
          });
        };

        gtFac.stopMonitoringCnextGeoLocations = function () {
          started = LocationService.stopWatchingUserLocation();
        };

        gtFac.resetTrackingData = function () {
          if (distanceManager !== undefined) {
            distanceManager.reset();
          }
        };

        gtFac.isStarted = function (){
          return started;
        };

        return gtFac;
      }])

    .factory('BeaconTracker', ['$http', '$q', '$interval', 'LocationService', 'CONST', 'dataUtils', '$timeout', '$localStorage', 'InfoService', 'UsersService', 'GuiUtilsService', 'LbsManager',
      function ($http, $q, $interval, LocationService, CONST, dataUtils, $timeout, $localStorage, InfoService, UsersService, GuiUtilsService, LbsManager) {
        var bTracker = {};
        var delegate;
        var started=false;
        /*variable to indicate if a beacon will be ranged (i.e. track distance) when in range*/
        var rangeWhenIn = false;


        /*
         HashMap of beacons to track*/
        var cNextBeaconPois = {};


        /*Array of BeaconRegion objects for PoIs. These objects are passed to LocationManager for monitoring/ranging */
        var beacons = [];

        /*Variable used to keep the last beacon measured proximities
         * along with the calculated (over those measured proximities) distance called position (close,near,out)
         * */
        var rangingsOfBeacons = {};

        /*Function used to remove the oldest and push
         the newest measured proximity for a beacon in the rangingsOfBeacons
         */
        var pushProximity = function (minor, proxNumber) {
          var beaconRangings = rangingsOfBeacons[minor];
          var oldBeaconProximities = beaconRangings.proximities;
          var newBeaconProximities = oldBeaconProximities.substr(1, oldBeaconProximities.length - 1) + proxNumber;
          //console.log('lastProximities changed from ' + oldBeaconProximities + ' to ' + newBeaconProximities);
          beaconRangings.proximities = newBeaconProximities;
          var newPosition = calculatePosition(newBeaconProximities, beaconRangings.position);
          if (beaconRangings.position !== newPosition) {
            GuiUtilsService.log('Beacon' + minor + ': ' + beaconRangings.position + ' => ' + newPosition)
          }
          beaconRangings.position = newPosition;
        };

        var findPoiByMajorMinor = function (major, minor) {
          return _.find(cNextBeaconPois, function (poi) {
            return poi.trackingInfo.major == major && poi.trackingInfo.minor == minor;
          });
        };

        /*Function used to notify the lbs/beacons/{id} endpoint that a beacon found/lost*/
        var handleBeaconSensing = function (rangedBeacon) {
          if (UsersService.getCurrentUserId() < 0) {
            GuiUtilsService.log('Beacon Reporting skipped because user is not logged in');
            return;
          }
          var position = rangedBeacon.position || rangingsOfBeacons[rangedBeacon.identifier].position;
          if (LbsManager.canPoiTriggerBeFired(rangedBeacon.identifier, position)) {
            LbsManager.fireTrigger(rangedBeacon.identifier, position);
          } else {
            GuiUtilsService.log('Trigger: ' + rangedBeacon.identifier + '.' + position + ' not fired...');
          }
        };

        /*Function to create a BeaconRegion transfer object let the beacons library range it*/
        var createBeaconRegion = function (identifier, uuid, major, minor) {
          var beaconRegion = new cordova.plugins.locationManager.BeaconRegion(identifier.toString(), uuid, major, minor);
          return beaconRegion;
        };

        /*Function used to get a numeric value for a lexical proximity*/
        var getProximityNum = function (proximity) {
          switch (proximity) {
            case 'ProximityImmediate':
              return CONST.LBS.PROXIMITY.CLOSE.NUM;
              break;
            case 'ProximityNear':
              return CONST.LBS.PROXIMITY.IN.NUM;
              break;
          }
          return CONST.LBS.PROXIMITY.OUT.NUM;
        };

        /*Function that checks the measured proximities (proximityNums) for a beacon and calculates its position (close,near,out)
         If no new position can be matched, it returns the old one (oldPosition)*/
        var calculatePosition = function (proximityNums, oldPosition) {
          var out = new Array(CONST.LBS.NUM_OF_MEASURES + 1).join(CONST.LBS.PROXIMITY.OUT.NUM);
          var near = new Array(CONST.LBS.NUM_OF_MEASURES + 1).join(CONST.LBS.PROXIMITY.IN.NUM);
          var close = new Array(CONST.LBS.NUM_OF_MEASURES + 1).join(CONST.LBS.PROXIMITY.CLOSE.NUM);
          switch (proximityNums) {
            case out:
              return CONST.LBS.PROXIMITY.OUT.LEX;
              break;
            case near:
              return CONST.LBS.PROXIMITY.IN.LEX;
              break;
            case close:
              return CONST.LBS.PROXIMITY.CLOSE.LEX;
              break;
          }
          return oldPosition;
        };

        /*Function that records a new proximity measure and returns true if after the new record
         * the beacon position has changed. Otherwise, returns false*/
        var detectProximityChange = function (identifier, proxNum) {
          var oldBeaconPosition = rangingsOfBeacons[identifier].position;
          pushProximity(identifier, proxNum);
          return oldBeaconPosition !== rangingsOfBeacons[identifier].position;
        };

        /*Listener function that handles the ranging of beacons*/
        var onRangingBeacon = function (pluginResult) {
          if (pluginResult.beacons.length > 0) {
            var rangedBeacon = pluginResult.beacons[0];
            var newDistance = getProximityNum(rangedBeacon.proximity);
            var poi = findPoiByMajorMinor(rangedBeacon.major, rangedBeacon.minor);

            rangedBeacon['identifier'] = poi.id;

            if (detectProximityChange(rangedBeacon.identifier, newDistance)) {
              handleBeaconSensing(rangedBeacon);
            }
          }
        };

        bTracker.startMonitoringCNextBeacons = function (range) {
          rangeWhenIn = range;
          GuiUtilsService.log('Beacons monitoring started.');
          delegate = new cordova.plugins.locationManager.Delegate();
          delegate.didRangeBeaconsInRegion = onRangingBeacon;

          delegate.didEnterRegion = function (pluginResult) {
            var foundBeacon = pluginResult.region;
            foundBeacon['position'] = CONST.LBS.PROXIMITY.IN.LEX;
            GuiUtilsService.log('Beacon ' + foundBeacon.identifier + ' [' + foundBeacon.major + '.' + foundBeacon.minor + '] Found!');
            handleBeaconSensing(foundBeacon);

            var poi = findPoiByMajorMinor(foundBeacon.major, foundBeacon.minor);
            var poiTriggers = Object.keys(poi.triggers);

            if (dataUtils.isInArray('CLOSE', poiTriggers)) {
              var foundBeaconRegion = _.findWhere(beacons, {identifier: foundBeacon.identifier});
              if (foundBeaconRegion) {
                GuiUtilsService.log('Beacon ' + foundBeacon.minor + ' ranging started.');
                cordova.plugins.locationManager.startRangingBeaconsInRegion(foundBeaconRegion);
              } else {
                GuiUtilsService.log('! Could not find beaconReagion to start ranging...');
              }
            }
          };

          delegate.didExitRegion = function (pluginResult) {
            var lostBeacon = pluginResult.region;
            lostBeacon['position'] = CONST.LBS.PROXIMITY.OUT.LEX;
            GuiUtilsService.log('Beacon ' + lostBeacon.identifier + ' [' + lostBeacon.major + '.' + lostBeacon.minor + '] Lost!');
            handleBeaconSensing(lostBeacon);
            var poi = findPoiByMajorMinor(lostBeacon.major, lostBeacon.minor);
            var poiTriggers = Object.keys(poi.triggers);

            if (dataUtils.isInArray('CLOSE', poiTriggers)) {
              var lostBeaconRegion = _.findWhere(beacons, {identifier: lostBeacon.identifier});
              if (lostBeaconRegion) {
                cordova.plugins.locationManager.stopRangingBeaconsInRegion(lostBeaconRegion);
                GuiUtilsService.log('Beacon ' + lostBeacon.minor + ' ranging stopped.');
              }
            }
          };

          cordova.plugins.locationManager.setDelegate(delegate);

          if (beacons.length === 0) {
            angular.forEach(cNextBeaconPois, function (poi) {
              beacons.push(createBeaconRegion(poi.id, poi.trackingInfo.uuid, poi.trackingInfo.major, poi.trackingInfo.minor));
              var out = new Array(CONST.LBS.NUM_OF_MEASURES + 1).join(CONST.LBS.PROXIMITY.OUT.NUM);
              rangingsOfBeacons[poi.id] = {proximities: out, position: CONST.LBS.PROXIMITY.OUT.LEX};
            });
          }

          cordova.plugins.locationManager.disableDebugNotifications();
          cordova.plugins.locationManager.requestAlwaysAuthorization();
          angular.forEach(beacons, function (br) {
            if (br === undefined) return;
            cordova.plugins.locationManager.startMonitoringForRegion(br)
              .fail(function (e) {
                console.log('Error on startMonitoringForRegion');
                console.error(e);
              })
              .done(function(){
                started=true;
                GuiUtilsService.log('BeaconTracker is ON');
              });
          });
        };

        bTracker.enableBlueTooth = function () {
          cordova.plugins.locationManager.isBluetoothEnabled()
            .then(function (isEnabled) {
              console.log("isEnabled: " + isEnabled);
              if (!isEnabled) {
                cordova.plugins.locationManager.enableBluetooth();
                console.log('Bluetooth enabled...');
                if (InfoService.is(CONST.OS_KEY, 'iOS')) {
                  GuiUtilsService.showToastNotification('Please check that bluetooth is ON (Settings\\Bluetooth\\On).', 'LONG');
                }
              }
            })
            .fail(function (e) {
              console.error('Could not enable bluetooth');
            })
            .done();
        };

        bTracker.disableBlueTooth = function () {
          cordova.plugins.locationManager.isBluetoothEnabled()
            .then(function (isEnabled) {
              if (isEnabled) {
                cordova.plugins.locationManager.disableBluetooth();
                console.log('Bluetooth disabled...');
                if (InfoService.is(CONST.OS_KEY, 'iOS')) {
                  GuiUtilsService.showToastNotification('Turn off Bluetooth (from Settings) to save battery...', 'LONG');
                }
              }
            })
            .fail(function (e) {
              console.error('Could not disable bluetooth');
            })
            .done();
        };

        bTracker.isBluetoothEnabled = function () {
          return cordova.plugins.locationManager.isBluetoothEnabled();
        };

        bTracker.stopMonitoringCNextBeacons = function () {
          angular.forEach(beacons, function (br) {
            if (br === undefined) return;
            cordova.plugins.locationManager.stopMonitoringForRegion(br)
              .fail(function (e) {
                console.log('Error on stopMonitoringBeacon: ' + br.identifier);
                console.error(e);
              })
              .done(function(){
                started=false;
                GuiUtilsService.log('BeaconTracker is OFF');
              });
          });
        };

        bTracker.setBeaconsMap = function (map) {
          cNextBeaconPois = map;
        };

        bTracker.isStarted=function(){
          return started;
        };

        bTracker.resetTrackingData = function () {
          if (beacons.length > 0) {
            angular.forEach(cNextBeaconPois, function (cnBeacon) {
              var out = new Array(CONST.LBS.NUM_OF_MEASURES + 1).join(CONST.LBS.PROXIMITY.OUT.NUM);
              rangingsOfBeacons[cnBeacon.id] = {proximities: out, position: CONST.LBS.PROXIMITY.OUT.LEX};
              console.log('Beacon ' + cnBeacon.id + ' set to position ' + out);
            });
          }
        };

        return bTracker;
      }])

    .factory('LbsManager', ['$rootScope', '$state', '$injector', '$translate', '$http', '$q', '$ionicHistory', 'dataUtils', 'CONST', '$localStorage', 'InfoService', 'NetworkService', 'PushService', 'UsersService', 'GuiUtilsService',
      function ($rootScope, $state, $injector, $translate, $http, $q, $ionicHistory, dataUtils, CONST, $localStorage, InfoService, NetworkService, PushService, UsersService, GuiUtilsService) {
        var lbsFac = {};
        var pois = {};
        var cNextBeaconsMap = {};
        var cNextGeoLocsMap = {};
        var scenarios = {};

        var fetchLbsConfiguration = function () {
          var deferred = $q.defer();
          $http.get(CONST.REST_API_URL + '/lbs/scenarios', {timeout: CONST.NETWORK_TIMEOUT})
            .then(function (res) {
              var apiResponse = res.data;
              if (apiResponse.success) {
                angular.forEach(apiResponse.data, function (sc) {
                  scenarios[sc.id] = {
                    id: sc.id,
                    name: sc.name,
                    active: sc.active || false,
                    desc: sc.desc,
                    eventId: sc.eventId
                  };
                  angular.forEach(sc.pois, function (poi) {
                    poi.active = (sc.active)? poi.active : false;
                    poi.gameEnd = false;
                    pois[poi.id] = poi;
                    if (poi.type === 'beacon' && poi.active) {
                      cNextBeaconsMap[poi.id] = poi;
                    } else if (poi.type === 'geolocation' && poi.active) {
                      cNextGeoLocsMap[poi.id] = poi;
                    }
                  });
                  if (sc.pois && sc.pois.length > 0) {
                    var lastPoi = sc.pois[sc.pois.length - 1];
                    lastPoi.gameEnd = true;
                  }
                });
                console.log(pois);
                $localStorage.setObject('SCENARIOS', scenarios);
                $localStorage.setObject('POIS', pois);
                deferred.resolve();
                GuiUtilsService.log('Games cfg fetched from Server...');
                $rootScope.$broadcast('lbs:updated');
              } else {
                if ($localStorage.hasEntry('SCENARIOS') && $localStorage.hasEntry('POIS')) {
                  scenarios = $localStorage.getObject('SCENARIOS');
                  pois = $localStorage.getObject('POIS');
                  angular.forEach(pois, function (poi) {
                    if (poi.type === 'beacon' && poi.active) {
                      cNextBeaconsMap[poi.id] = poi;
                    } else if (poi.type === 'geolocation' && poi.active) {
                      cNextGeoLocsMap[poi.id] = poi;
                    }
                  });
                  GuiUtilsService.log('Games cfg loaded from cache...');
                  $rootScope.$broadcast('lbs:updated');
                  deferred.resolve();
                } else {
                  deferred.reject();
                  GuiUtilsService.log('Games cfg is missing');
                }
              }
            }, function (error) {
              if ($localStorage.hasEntry('SCENARIOS') && $localStorage.hasEntry('POIS')) {
                scenarios = $localStorage.getObject('SCENARIOS');
                pois = $localStorage.getObject('POIS');
                angular.forEach(pois, function (poi) {
                  if (poi.type === 'beacon' && poi.active) {
                    cNextBeaconsMap[poi.id] = poi;
                  } else if (poi.type === 'geolocation' && poi.active) {
                    cNextGeoLocsMap[poi.id] = poi;
                  }
                });
                GuiUtilsService.log('Games cfg loaded from cache...');
                deferred.resolve();
              } else {
                deferred.reject();
                GuiUtilsService.log('Games cfg is missing');
              }
            });

          return deferred.promise;
        };

        var isPoiTriggerUsed = function (poi, trigger) {
          var poiTriggers = Object.keys(poi.triggers);
          return dataUtils.isInArray(trigger, poiTriggers);
        };

        var checkTriggerStatus = function (poiId, triggerName, status) {
          var allPoiReports = $localStorage.getObjectDefault('POI_REPORTS', {});
          var poiReports = allPoiReports[poiId];
          if (poiReports && poiReports[triggerName]) {
            var triggerReport = poiReports[triggerName];
            if (status) {
              console.log(poiId + '.' + triggerName + '(' + status + ') is ' + triggerReport[status]);
              return triggerReport[status] || false;
            } else {
              console.log('status of ' + poiId + '.' + triggerName + '(reported) is ' + triggerReport.reported);
              return triggerReport.reported || false;
            }
          } else {
            console.log('checking ' + poiId + '.' + triggerName + '(' + status + ') failed because there is not entry in POI_REPORTS');
            return false;
          }

        };

        lbsFac.getActiveScenarios = function () {
          var activeScenarios = {};
          angular.forEach(scenarios, function (scenario) {
            if (scenario.active) {
              activeScenarios[scenario.id] = {id: scenario.id, name: scenario.name, eventId: scenario.eventId};
            }
          });
          return activeScenarios;
        };

        lbsFac.start = function(){
          lbsFac.startGeoTracker();
          lbsFac.startBeaconTracker();
        };

        lbsFac.stop = function(){
          lbsFac.stopGeoTracker();
          lbsFac.stopBeaconTracker();
        };

        lbsFac.startGeoTracker = function () {
          var GeoTracker = $injector.get('GeoTracker');
          var GoogleMaps = $injector.get('GoogleMaps');

          if (!NetworkService.isOnline()) {
            GuiUtilsService.showToastNotification($translate.instant('ON_OFFLINE'), 'SHORT');
            return;
          }
          if (GeoTracker.isStarted()){
            console.log('Already Started');
            return;
          }
          fetchLbsConfiguration().then(
            function () {
              if (!GoogleMaps.isLoaded()) {
                console.log('LS.getUserLocation: google is not available');
                GoogleMaps.loadApi()
                  .then(function () {
                    GeoTracker.setGeoLocationsMap(cNextGeoLocsMap);
                    /*Start Monitoring...*/
                    if (Object.keys(cNextGeoLocsMap).length > 0) {
                      GeoTracker.startMonitoringCnextGeoLocations();
                    } else {
                      console.log('There are no geolocation to track. GeoTracker did not start!');
                    }
                  });
              } else {
                GeoTracker.setGeoLocationsMap(cNextGeoLocsMap);
                if (Object.keys(cNextGeoLocsMap).length > 0) {
                  GeoTracker.startMonitoringCnextGeoLocations();
                } else {
                  console.log('There are no geolocation to track. GeoTracker did not start!');
                }
              }
            }, function (error) {
              GuiUtilsService.showToastNotification("Something went wrong!", 'SHORT');
              console.log('error');
            })
        };

        lbsFac.startBeaconTracker = function () {
          var BeaconTracker = $injector.get('BeaconTracker');
          if (BeaconTracker.isStarted()){
            console.log('Already Started');
            return;
          }
          fetchLbsConfiguration().then(
            function () {
              BeaconTracker.setBeaconsMap(cNextBeaconsMap);
              if (Object.keys(cNextBeaconsMap).length > 0) {
                BeaconTracker.enableBlueTooth();
                BeaconTracker.startMonitoringCNextBeacons(false);
              } else {
                console.log('There are no beacons to track. BeaconTracker did not start!');
              }
            }, function (error) {
              GuiUtilsService.showToastNotification("Something went wrong!", 'SHORT');
              console.log('error');
            })
        };

        lbsFac.stopGeoTracker = function () {
          var GeoTracker = $injector.get('GeoTracker');
          if (GeoTracker.isStarted()) {
            GeoTracker.stopMonitoringCnextGeoLocations();
          }
        };

        lbsFac.stopBeaconTracker = function () {
          var BeaconTracker = $injector.get('BeaconTracker');
          if (BeaconTracker.isStarted()) {
            BeaconTracker.stopMonitoringCNextBeacons();
            BeaconTracker.disableBlueTooth();
          }
        };

        lbsFac.setPoiTriggerReported = function (poiId, triggerName) {
          var value = {reported: true, completed: false};
          var allPoiReports = $localStorage.getObjectDefault('POI_REPORTS', {});
          var currentPoiReports = allPoiReports[poiId];
          if (!currentPoiReports) {
            currentPoiReports = {};
            currentPoiReports[triggerName] = value;
            allPoiReports[poiId] = currentPoiReports;
          } else {
            currentPoiReports[triggerName] = value;
          }
          $localStorage.setObject('POI_REPORTS', allPoiReports);
          $rootScope.$broadcast('lbs:updated');
        };

        lbsFac.canPoiTriggerBeFired = function (poiId, triggerName) {
          if (isPoiTriggerUsed(pois[poiId], triggerName)) {
            var reqStmt = pois[poiId].triggers[triggerName].requires;
            if (reqStmt) {
              var req = reqStmt.split('/');
              return (!checkTriggerStatus(poiId, triggerName) && checkTriggerStatus(req[0], req[1], req[2]));
            } else {
              return (!checkTriggerStatus(poiId, triggerName));
            }
          } else {
            //console.log(poiId + '.' + triggerName + ' cannot be fired becouse is not used');
            return false;
          }
        };

        lbsFac.resetLbsTrackingData = function () {
          $localStorage.deleteEntry('POI_REPORTS');
          $localStorage.deleteEntry(CONST.LBS.NOTIFICATIONS_KEY);
          var GeoTracker = $injector.get('GeoTracker');
          var BeaconTracker = $injector.get('BeaconTracker');
          GeoTracker.resetTrackingData();
          BeaconTracker.resetTrackingData();
          GuiUtilsService.showToastNotification('Gaming data deleted...','SHORT');
          $rootScope.$broadcast('lbs:updated');
        };

        /*Fires a POI trigger.
         - If the trigger mode is auto, it calls a scenario action,
         - If the thrigger mode is TBC, it reports the poi detection
         */
        lbsFac.fireTrigger = function (poiId, triggerName) {
          var poi = pois[poiId];
          var scenarioId = poiId.substring(0, poiId.indexOf('.'));
          var scenario = scenarios[scenarioId];
          if (!scenario.active) {
            var msg = 'Scenario ' + scenarioId + ' is inactive. Trigger: ' + poiId + '.' + triggerName + ' ignored';
            GuiUtilsService.log(msg);
            return;
          }
          var triggerMode = poi.triggers[triggerName]['mode'];
          /*Create Data to Process Trigger*/
          var fireData = {
            scenario: scenario.id,
            poi: poiId,
            trigger: triggerName,
            pushRegId: $localStorage.get(CONST.GCM_TOKEN_KEY),
            os: InfoService.get(CONST.OS_KEY),
            action: triggerName, //To be Removed....
            deviceUuid: InfoService.get(CONST.APP_ID_KEY),
            eventId: scenario.eventId,
            userId: UsersService.getCurrentUserId()
          };

          if (triggerMode === 'AUTO') {
            lbsFac.setPoiTriggerReported(poiId, triggerName);
            lbsFac.executeScenarioAction(fireData);
          } else {
            var msg = 'Asking to Confirm Fire for trigger : ' + poiId + '(' + triggerName + ')';
            GuiUtilsService.log(msg);
            $http({
              url: CONST.REST_API_URL + '/lbs/pois/' + poiId + '/' + triggerName,
              timeout: CONST.NETWORK_TIMEOUT,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              data: fireData
            }).then(function (response) {
              var res = response.data;
              if (res.success) {
                lbsFac.setPoiTriggerReported(poiId, triggerName);
                if (res.lbsMsg && !res.lbsMsg.doNotStore) {
                  res.lbsMsg = dataUtils.parseBooleanObj(res.lbsMsg);
                  res.lbsMsg.processed=false;
                  PushService.storeNotification(res.lbsMsg, CONST.LBS.NOTIFICATIONS_KEY);
                  console.log('lbs Msg stored');
                }
                $rootScope.$broadcast('lbs:updated');
              }
            }, function (error) {
              GuiUtilsService.log('Error in reporting poi position: ' + JSON.stringify(error));
            });
          }
        };

        var executeRemoteScenarioAction = function (cfg) {
          //console.log('Calling remote scenario action...');
          cfg.userId = UsersService.getCurrentUserId();
          cfg.pushRegId = $localStorage.get(CONST.GCM_TOKEN_KEY);
          cfg.os = InfoService.get(CONST.OS_KEY);
          cfg.deviceUuid = InfoService.get(CONST.APP_ID_KEY);
          var msg = 'Requesting Scenario Action: ' + cfg.scenario + '/' + cfg.poi + '/' + cfg.trigger;
          GuiUtilsService.log(msg);
          $rootScope.$broadcast('loading:show');
          $http({
            url: CONST.REST_API_URL + '/lbs/scenarios/' + cfg.scenario + '/' + cfg.poi + '/' + cfg.trigger,
            timeout: CONST.NETWORK_TIMEOUT * 2,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            data: cfg
          }).then(function (response) {
            var res = response.data;
            if (res.success) {
              console.log(res.lbsMsg);
              if (res.lbsMsg && !res.lbsMsg.doNotStore) {
                res.lbsMsg = dataUtils.parseBooleanObj(res.lbsMsg);
                res.lbsMsg.processed=false;
                PushService.storeNotification(res.lbsMsg, CONST.LBS.NOTIFICATIONS_KEY);
              }
              lbsFac.setScenarioActionCompleted(cfg.poi+'-'+cfg.trigger);
              if (res.callBacks) {
                chainScenarioCallBacks(res.callBacks);
              }
            } else {
              if (res.callBacks) {
                chainScenarioCallBacks(res.callBacks);
              }
            }
            $rootScope.$broadcast('loading:hide');
          }, function (error) {
            GuiUtilsService.log('Action ' + cfg.action + ' of Game ' + cfg.scenario + ' failed.');
            console.error('Action ' + cfg.action + ' of scenario ' + cfg.scenario + ' failed. Error=' + JSON.stringify(error));
            GuiUtilsService.showToastNotification($translate.instant('ON_OFFLINE'), 'SHORT');
            $rootScope.$broadcast('loading:hide');
          });


        };

        var executeLocalScenarioAction = function (cfg) {
          //console.log('Executing scenario action locally...');
          var handlerCfg = cfg.poiCfg.triggers[cfg.trigger].providerCfg;

          $ionicHistory.clearCache().then(function () {
            var toState = '';
            switch (handlerCfg.action) {
              case 'sendPost':
                toState = 'app.event';
                //console.log('going to state ' + toState +':'+handlerCfg.eventId);
                $state.go(toState, {
                  eventId: handlerCfg.eventId,
                  ntfAction: 'lbsReply',
                  ntfKey: cfg.poi + '-' + cfg.trigger,
                  ntfHashTag: handlerCfg.hashtag
                }, {reload: true});
                break;
              case 'longMsg':
                var ModalService = $injector.get('ModalService');
                ModalService.show('templates/partials/modal-msg-window.html', 'LbsModalCtlr', handlerCfg);
                break;
              case 'quiz':
              case 'mc-quiz':
                var ModalService = $injector.get('ModalService');
                ModalService.show('templates/partials/modal-msg-window.html', 'LbsModalCtlr', handlerCfg).then(function(answer){
                  if (answer && handlerCfg.correctAnswer){
                      if (handlerCfg.correctAnswer.toUpperCase() == answer.toUpperCase()){
                        GuiUtilsService.showToastNotification('Correct!','LONG');
                        lbsFac.setScenarioActionCompleted(cfg.poi+'-'+cfg.trigger);
                      }else{
                        GuiUtilsService.showToastNotification(handlerCfg.errorMsg,'LONG');
                      }
                  }else{
                      //TODO: send the answer back to the server
                  }
                });
                break;
              default:
                break;
            }
          });
        };

        var executeCallback = function (clbkName, clbkCfg) {
          var deferred = $q.defer();
          switch (clbkName) {
            case 'none':
              console.log(clbkName + ' resolved..');
              deferred.resolve();
              break;
            case 'beep':
              console.log ('Beeping for ' + clbkCfg.times + ' times');
              navigator.notification.beep(clbkCfg.times);
              break;
            case 'toast':
              GuiUtilsService.showToastNotification(clbkCfg.message, clbkCfg.duration || 'SHORT');
              console.log(clbkName + ' resolved..');
              deferred.resolve();
              break;
            case 'alert':
              GuiUtilsService.showAlert(clbkCfg.title, clbkCfg.message);
              console.log(clbkName + ' resolved..');
              deferred.resolve();
              break;
            case 'stateTransition':
              var toState = clbkCfg.toState;
              var stateParams = clbkCfg.stateParams;
              $state.go(toState, stateParams, {reload: true}).then(function () {
                console.log(clbkName + ' resolved..');
                deferred.resolve();
              });
              break;
            case 'reloadService':
              var srv = $injector.get(clbkCfg.serviceName);
              if (srv && srv.reload) {
                srv.reload().then(function () {
                  console.log(clbkName + ' resolved..');
                  deferred.resolve();
                });
              }
              break;
            default:
              deferred.resolve();
              break;
          }
          return deferred.promise;
        };

        var chainScenarioCallBacks = function (callBackActions) {
          var promise;
          angular.forEach(callBackActions, function (clbkCfg, clbkName) {
            console.log('executing callback: ' + clbkName);
            if (!promise) {
              promise = executeCallback(clbkName, clbkCfg);
            } else {
              promise = promise.then(function () {
                return executeCallback(clbkName, clbkCfg);
              });
            }
          });
        };

        var reportActionCompletion = function (cfg) {
          /*prepare data to send in scenario executor*/
          //TODO: Check if cfg contails these data, so jsonMsg is a dublicate
          var jsonMsg = {
            pushRegId: $localStorage.get(CONST.GCM_TOKEN_KEY),
            os: InfoService.get(CONST.OS_KEY),
            deviceUuid: InfoService.get(CONST.APP_ID_KEY),
            eventId: cfg.eventId,
            userId: UsersService.getCurrentUserId(),
            completed: true
          };
          console.log('Declaring Scenario Action Completion: ' + JSON.stringify(jsonMsg));
          $rootScope.$broadcast('loading:show');
          $http({
            url: CONST.REST_API_URL + '/lbs/scenarios/' + cfg.scenario + '/' + cfg.poi + '/' + cfg.trigger + '/completed',
            timeout: CONST.NETWORK_TIMEOUT * 2,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            data: jsonMsg
          }).then(function (response) {
            var res = response.data;
            if (res.success) {
              GuiUtilsService.log('Trigger ' + cfg.trigger + ' of poi ' + cfg.poi + ' executed successfully');
              var ntfKey = cfg.poi + '.' + cfg.trigger + '.lbsCnfrm';
              PushService.setNotificationProcessed(ntfKey, CONST.LBS.NOTIFICATIONS_KEY);
              console.log(res.lbsMsg);
              if (res.lbsMsg && !res.lbsMsg.doNotStore) {
                res.lbsMsg = dataUtils.parseBooleanObj(res.lbsMsg);
                res.lbsMsg.processed=false;
                PushService.storeNotification(res.lbsMsg, CONST.LBS.NOTIFICATIONS_KEY);
                $rootScope.$broadcast('lbs:updated');
              }
              if (res.callBacks) {
                chainScenarioCallBacks(res.callBacks);
              }
            } else {
              if (res.callBacks) {
                chainScenarioCallBacks(res.callBacks);
              }
            }
            $rootScope.$broadcast('loading:hide');
          }, function (error) {
            console.error('Action ' + cfg.action + ' of scenario ' + cfg.scenario + ' failed. Error=' + JSON.stringify(error));
            GuiUtilsService.showToastNotification($translate.instant('ON_OFFLINE'), 'SHORT');
            $rootScope.$broadcast('loading:hide');
          });
        };

        lbsFac.executeScenarioAction = function (cfg) {
          if (!cfg.poi) {
            console.log('Lbs POI is undefined');
            return;
          }
          //var poi = _.findWhere(pois, {id: cfg.poi});
          var poi = pois[cfg.poi];
          if (!poi) {
            return;
          }
          if (poi.triggers[cfg.trigger].handler === 'client') {
            //put poiObj in cfg...
            cfg.poiCfg = poi;
            executeLocalScenarioAction(cfg);
          } else {
            executeRemoteScenarioAction(cfg)
          }
        };

        lbsFac.setScenarioActionCompleted = function (poiAction) {
          var poiId = poiAction.substring(0, poiAction.indexOf('-'));
          var trigger = poiAction.substring(poiAction.indexOf('-') + 1);
          var scenario = poiId.substring(0, poiId.indexOf("."));


          var allPoiReports = $localStorage.getObjectDefault('POI_REPORTS', {});
          var currentPoiReports = allPoiReports[poiId];
          if (!currentPoiReports) {
            currentPoiReports = {};
            currentPoiReports[trigger] = {
              reported: true,
              completed: true
            };
            allPoiReports[poiId] = currentPoiReports;
          } else {
            currentPoiReports[trigger]['completed'] = true;
          }
          $localStorage.setObject('POI_REPORTS', allPoiReports);
          //Check if ActionCompletion needs to be reported to backend
          var poi = pois[poiId];
          if (!poi) {
            return;
          }


          if (poi.triggers[trigger].handler === 'client') {
            var cfg = poi.triggers[trigger].providerCfg;
            if (cfg.reportCompletion) {
              cfg.poi = poi.id;
              cfg.trigger = trigger;
              cfg.scenario = scenario;
              reportActionCompletion(cfg);
            }else{
              /*Set Lbs Notification (Triggering Scenario Action) as processed*/
              var ntfKey = poiId + '.' + trigger + '.lbsCnfrm';
              PushService.setNotificationProcessed(ntfKey, CONST.LBS.NOTIFICATIONS_KEY);
              $rootScope.$broadcast('lbs:updated');
            }
          }else{
            /*Set Lbs Notification (Triggering Scenario Action) as processed*/
            var ntfKey = poiId + '.' + trigger + '.lbsCnfrm';
            PushService.setNotificationProcessed(ntfKey, CONST.LBS.NOTIFICATIONS_KEY);
            $rootScope.$broadcast('lbs:updated');
          }
        };

        lbsFac.uploadLbsData = function(){
          var lbsStatus = $localStorage.getObjectDefault('POI_REPORTS', {});
          var lbsNtfs = $localStorage.getObjectDefault(CONST.LBS.NOTIFICATIONS_KEY,{});
          var sharedData = {
            user_id: UsersService.getCurrentUserId(),
            device_uuid: InfoService.get(CONST.APP_ID_KEY),
            device_os: InfoService.get(CONST.OS_KEY),
            gaming_status:lbsStatus,
            gaming_messages_received:lbsNtfs
          };

          $rootScope.$broadcast('loading:show');
          $http({
            url: CONST.REST_API_URL + '/lbs/player/'+sharedData.user_id+'/data',
            timeout: CONST.NETWORK_TIMEOUT,
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            data: sharedData
          }).then(function (response) {
            $rootScope.$broadcast('loading:hide');
            GuiUtilsService.showToastNotification("Gaming Data Sent!")
          }, function (error) {
            console.error('Gaming data could not be sent. Error: ' + JSON.stringify(error));
            $rootScope.$broadcast('loading:hide');
            GuiUtilsService.showToastNotification($translate.instant('SOMETHING_WRONG'), 'SHORT');
          });
        };

        return lbsFac;
      }]);
}());

