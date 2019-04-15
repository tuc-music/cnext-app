/* Created by Nektarios Gioldasis */

(function () {
  'use strict';

  /*global angular */
  angular.module('cnextApp.systemServices', [])
    .factory('InfoService', ['$cordovaFile', function ($cordovaFile) {
      var info = {};
      return {

        set: function (key, value) {
          info[key] = value;
        },

        get: function (key) {
          return info[key] || undefined;
        },

        is: function (property, value) {
          return (value) ? info[property] === value : info[property] == true;
        },

        /*      Generating InstallationId and saving it to local File....
         setUpAppId:function(){
         var settingsDir= cordova.file.dataDirectory;
         var settingsFile= 'cnext.json';
         var successHandler = function(){
         var settings = $cordovaFile.readAsText(settingsDir, settingsFile);
         console.log('Settings Found:');
         console.log(settings);
         };
         var failureHandler = function(){
         var settings = {cnextGUID:'CNEXT::APP-ID::12131415'};
         var writeResult = $cordovaFile.writeFile(settingsDir, settingsFile, settings, true);
         console.log('After Settings Save:');
         console.log(writeResult);
         }
         window.resolveLocalFileSystemURL(settingsDir+settingsFile,successHandler,failureHandler);
         }*/
      }
    }])

    .factory('ImageService', ['$cordovaCamera', '$q', '$cordovaFile', 'InfoService', 'CONST', function ($cordovaCamera, $q, $cordovaFile, InfoService, CONST) {
      function makeid() {
        var text = '';
        var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

        for (var i = 0; i < 5; i++) {
          text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
      };

      function optionsForType(source, usage,mediaType) {
        var editable;
        var width;
        var height;
        var mType = (mediaType==='VIDEO' && source==='gallery')?Camera.MediaType.VIDEO:Camera.MediaType.PICTURE;
        if (usage == 'post') {
          editable = false;
          width = 720;
          height = 720;
        } else {
          editable = true;
          width = 200;
          height = 200;
        }
        switch (source) {
          case 'new':
            source = Camera.PictureSourceType.CAMERA;
            break;
          case 'gallery':
            source = Camera.PictureSourceType.SAVEDPHOTOALBUM;
            break;
        }
        return {
          destinationType: Camera.DestinationType.FILE_URI,
          sourceType: source,
          targetWidth: width,
          targetHeight: height,
          quality: 75,
          allowEdit: editable,
          encodingType: Camera.EncodingType.JPEG,
          mediaType: mType,
          popoverOptions: CameraPopoverOptions,
          saveToPhotoAlbum: false,
          correctOrientation: true
        };
      }

      function saveMedia(source, mediaUsage,mediaType) {
        return $q(function (resolve, reject) {
          var options = optionsForType(source, mediaUsage,mediaType);

          $cordovaCamera.getPicture(options).then(function (mediaUrl) {
            if (InfoService.is(CONST.OS_KEY, 'Android')) {
              //android only...
              mediaUrl = (mediaUrl.startsWith('file:///'))? mediaUrl : 'file://'+mediaUrl;

              window.resolveLocalFileSystemURL(mediaUrl, function (result) {
                console.log(result);
                /*window.FilePath.resolveNativePath(mediaUrl, function (result) {*/
                var name = result.name;
                var namePath = result.nativeURL.substr(0, result.nativeURL.lastIndexOf('/') + 1);
                var newName = makeid() + name;
                $cordovaFile.copyFile(namePath, name, cordova.file.dataDirectory, newName)
                  .then(function (info) {
                    resolve(cordova.file.dataDirectory + newName);
                  }, function (e) {
                    reject();
                  });
              }, function (error) {
                console.log('could not resolve image uri');
                reject();
              });
            } else {
              var name = mediaUrl.substr(mediaUrl.lastIndexOf('/') + 1);
              var namePath = mediaUrl.substr(0, mediaUrl.lastIndexOf('/') + 1);
              var newName = makeid() + name;
              $cordovaFile.copyFile(namePath, name, cordova.file.dataDirectory, newName)
                .then(function (info) {
                  resolve(cordova.file.dataDirectory + newName);
                }, function (e) {
                  reject();
                });
            }
          },function(error){
            console.log('oops');
            console.log(error);
            reject(error);
          });
        });
      };

      function captureVideo(){
        var deferred = $q.defer();

        var captureSuccess = function(mediaFiles) {
          deferred.resolve(mediaFiles[0].fullPath);
        };

        var captureError = function(error) {
          deferred.reject(error.code);
        };
        var captureVideoOptions={limit:1,quality:1};

        if (InfoService.is(CONST.ON_DEVICE)){
          navigator.device.capture.captureVideo(captureSuccess, captureError,captureVideoOptions);
        }else{
          deferred.reject("Available only on Devices");
        }

        return deferred.promise;
      }

      return {
        handleMediaDialog: saveMedia,
        captureVideo:captureVideo
      }
    }])

    .factory('NetworkService', ['$ionicPopup', '$translate','GuiUtilsService', '$timeout', 'CONST','InfoService', function ($ionicPopup, $translate,GuiUtilsService, $timeout, CONST,InfoService) {
      var connected = true;
      return {
        isOnline: function () {
          return connected;
        },
        setOnline: function () {
          connected = true;
        },

        setOffline: function () {
          connected = false;
        },

        checkConnection: function () {
          if (navigator.connection.type == Connection.NONE) {
            connected = false;
            GuiUtilsService.showToastNotification($translate.instant('ON_OFFLINE'),'LONG');
          } else {
            connected = true;
          }
        }
      }
    }])

    .factory('$localStorage', ['$window', function ($window) {
      return {
        set: function (key, value) {
          $window.localStorage[key] = value;
        },
        get: function (key, defaultValue) {
          return $window.localStorage[key] || defaultValue;
        },
        setArray: function (key, value) {
          $window.localStorage[key] = JSON.stringify(value);
        },
        getArray: function (key) {
          return JSON.parse($window.localStorage[key] || '[]');
        },
        setObject: function (key, value) {
          $window.localStorage[key] = JSON.stringify(value);
        },
        getObject: function (key) {
          return JSON.parse($window.localStorage[key] || '{}');
        },

        getObjectDefault: function (key, defaultObj) {
          if ($window.localStorage[key])
            return JSON.parse($window.localStorage[key]);
          var defaultClone = {};
          angular.copy(defaultObj, defaultClone);
          return defaultClone;
        },

        hasEntry: function (key) {
          return $window.localStorage.hasOwnProperty(key);
        },
        deleteEntry: function (key) {
          $window.localStorage.removeItem(key);
        }
      }
    }])
}())

