// Ionic Starter App
/*global angular */
/*global window */
(function () {
  'use strict';
  angular.module('underscore', [])
    .factory('_', function () {
      return window._;
    });

  angular.module('cnextApp', [
    'ionic',
    'ngOpenFB',
    'angularMoment',
    'cnextApp.constants',
    'cnextApp.controllers',
    'cnextApp.directives',
    'cnextApp.filters',
    'cnextApp.systemServices',
    'cnextApp.notificationServices',
    'cnextApp.uiServices',
    'cnextApp.locationServices',
    'underscore',
    'slugifier',
    'pascalprecht.translate',
    'ngCookies',
    'ngSanitize',
    'hm.readmore',
    'ionic-letter-avatar',
    'ionicLazyLoad',
    'ngEmbed'
  ])
    .config(['$stateProvider', '$urlRouterProvider', '$httpProvider', '$translateProvider', '$ionicConfigProvider', function ($stateProvider, $urlRouterProvider, $httpProvider, $translateProvider, $ionicConfigProvider) {
      $httpProvider.defaults.useXDomain = true;

      $translateProvider.useStaticFilesLoader({
          prefix: 'languages/',
          suffix: '.json'
        }).preferredLanguage('en')
        .useLocalStorage()
        .useSanitizeValueStrategy('sanitizeParameters')
        .useMissingTranslationHandlerLog();

      $stateProvider
        .state('app', {
          url: "/app",
          abstract: true,
          templateUrl: "templates/side-menu.html",
          controller: 'AppCtlr'
        })
        .state('app.game-status',{
          url: '/game-status',
          views:{
            'mainApplication':{
              templateUrl:'templates/gaming.html',
              controller:'GameCtlr'
            }
          },
          resolve: {
            EventsService: 'EventsService',
            allEvents: function (EventsService) {
              return EventsService.getEvents();
            }
          }
        })
        .state('app.browse-events', {
          url: '/events',
          views: {
            'mainApplication': {
              /*templateUrl: "events-filtering.html",*/
              templateUrl: "templates/events-filtering.html",
              controller: 'EventFilteringCtlr'
            }
          },
          resolve: {
            EventsService: 'EventsService',
            CatsService:'CatsService',
            events: function (EventsService) {
              return EventsService.getEvents();
            },
            cats:function(CatsService){
              return CatsService.getCategories();
            }
          }

        })
        .state('app.list-events', {
          url: '/events/:filterType/:filterValue',
          params: {
            timeFilter: null
          },
          views: {
            'mainApplication': {
              /*templateUrl: "events-list.html",*/
              templateUrl: 'templates/events-list.html',
              controller: 'EventsListCtlr'
            }
          },
          resolve: {
            EventsService: 'EventsService',
            eventsList: function ($stateParams, EventsService) {
              return EventsService.getEvents($stateParams.timeFilter, $stateParams.filterType, $stateParams.filterValue);
            }
          }
        })
        .state('app.event', {
          url: '/events/:eventId',
          params: {
            eventId: null,
            ntfAction: null,
            ntfKey: null,
            ntfHashTag: null
          },
          views: {
            'mainApplication': {
              templateUrl: 'templates/event.html',
              controller: 'EventCtlr'
            }
          },
          resolve: {
            PostsService: 'PostsService',
            EventsService: 'EventsService',
            CatsService: 'CatsService',
            event: function ($stateParams, EventsService) {
              return EventsService.getEvent(parseInt($stateParams.eventId));
            },
            cats: function (CatsService) {
              return CatsService.getCategories();
            }
          }
        })
        .state('app.home', {
          url: '/home',
          views: {
            'mainApplication': {
              templateUrl: 'templates/home.html',
              controller: 'HomeCtlr'
            }
          }
        })
        .state('app.wall', {
          url: '/wall',
          views: {
            'mainApplication': {
              templateUrl: 'templates/wall.html',
              controller: 'WallCtlr'
            }
          }
        })
        .state('app.post', {
          url: '/posts/:postId',
          params: {
            //these params are set on state.go commands...
            postId:null,
            eventId: 0,
            forComment: false
          },
          views: {
            'mainApplication': {
              templateUrl: "templates/post.html",
              controller: 'PostCtlr'
            }
          },
          resolve: {
            PostsService: 'PostsService',
            CommentsService: 'CommentsService',
            post: function ($stateParams, PostsService) {
              return PostsService.getPost(parseInt($stateParams.postId), parseInt($stateParams.eventId));
            },
            discussion: function ($stateParams, CommentsService) {
              return CommentsService.getComments(parseInt($stateParams.postId), 'all');
            }
          }
        })
        .state('app.places', {
          url: '/places',
          views: {
            'mainApplication': {
              templateUrl: 'templates/places.html',
              controller: 'MapCtlr'
            }
          },
          resolve: {
            EventsService: 'EventsService',
            allEvents: function (EventsService) {
              return EventsService.getEvents();
            }
          }
        })
        .state('app.settings', {
          url: '/settings',
          views: {
            'mainApplication': {
              templateUrl: 'templates/settings.html',
              controller: 'SettingsCtlr'
            }
          }
        })
        .state('app.terms', {
          url: '/terms',
          views: {
            'mainApplication': {
              templateUrl: 'templates/terms.html',
              controller: 'TermsCtlr'
            }
          }
        })
        .state('app.login', {
          url: '/login',
          views: {
            'mainApplication': {
              templateUrl: 'templates/login.html',
              controller: 'LoginCtlr'
            }
          },
          params: {
            cfg: null
          }
        })
        .state('app.notifications', {
          url: '/notifications',
          views: {
            'mainApplication': {
              templateUrl: 'templates/notifications.html',
              controller: 'NotificationsCtlr'
            }
          }
        })
        .state('app.about', {
          url: '/about',
          views: {
            'mainApplication': {
              templateUrl: 'templates/about.html',
              controller: 'AboutCtlr'
            }
          }
        })
        .state('app.profile', {
          url: '/profile',
          views: {
            'mainApplication': {
              templateUrl: 'templates/profile.html',
              controller: 'ProfileCtlr'
            }
          }
        })
        .state('app.policies', {
          url: '/policies',
          views: {
            'mainApplication': {
              templateUrl: 'templates/policies.html',
              controller: 'PoliciesCtlr'
            }
          }
        });
      $urlRouterProvider.otherwise('/app/home');
    }])

    .run(['$state', '$rootScope', '$ionicPlatform', '$translate', 'ngFB', 'CONST', '$localStorage', '$cordovaToast', 'LbsManager', 'GuiUtilsService',
      '$ionicLoading', '$ionicPopup', '$timeout', 'InfoService', 'NetworkService', 'PushService', 'LocationService', 'CatsService', 'EventsService', 'PostsService', 'CommentsService', 'amMoment',
      function ($state, $rootScope, $ionicPlatform, $translate, ngFB, CONST, $localStorage, $cordovaToast, LbsManager, GuiUtilsService,
                $ionicLoading, $ionicPopup, $timeout, InfoService, NetworkService, PushService, LocationService, CatsService, EventsService, PostsService, CommentsService, amMoment) {
        $rootScope.$on('loading:show', function () {
          $ionicLoading.show(CONST.LOADER_CFG);
        });

        $rootScope.$on('loading:hide', function () {
          $ionicLoading.hide();
        });

        // fire the events (publishers)
        $rootScope.$on('$stateChangeStart', function (event, toState, toParams) {
          $rootScope.$broadcast('loading:show');
        });

        /*$rootScope.$on('$stateChangeSuccess', function () {
          $rootScope.$broadcast('loading:hide');
        });*/

        amMoment.changeLocale($localStorage.get('NG_TRANSLATE_LANG_KEY', 'en'));

        $ionicPlatform.ready(function () {
          ngFB.init({appId: CONST.SERVICE_PROVIDERS.FB.APP_KEY});

          var validateSettings = function(){
            var appSettings = $localStorage.getObjectDefault(CONST.APP_SETTINGS_KEY,CONST.DEFAULT_APP_SETTINGS);
            if (!appSettings.version || appSettings.version < CONST.DEFAULT_APP_SETTINGS.version){
                $localStorage.setObject(CONST.APP_SETTINGS_KEY,CONST.DEFAULT_APP_SETTINGS);
                console.log('Settings reset to version: ' + CONST.DEFAULT_APP_SETTINGS.version);
            }
          };

          var applyLbsSettings = function () {
            var lbsSettings = $localStorage.getObjectDefault(CONST.APP_SETTINGS_KEY, CONST.DEFAULT_APP_SETTINGS).lbsSettings;
            if (lbsSettings.allow) {
              LbsManager.start();
            }
            if (lbsSettings[CONST.LBS.TESTING_KEY]){
              InfoService.set(CONST.LBS.TESTING_KEY,true);
              $rootScope.$broadcast('lbs-mode',true);
            }else{
              $rootScope.$broadcast('lbs-mode',false);
            }
          };

          //Function that is called when device is going Online.
          var onOnline = function () {
            $rootScope.$broadcast('online');
            if (NetworkService.isOnline()) {
              return;
            }
            if (navigator.connection.type != Connection.NONE) {
              NetworkService.setOnline();
              /*Try to register Device to GCM*/
              PushService.register();
              /*Reloading Data*/
              CatsService.fetchCategories();
              EventsService.fetchEvents();
              //PostsService.reload();
              applyLbsSettings();
              //Show Alert...
              GuiUtilsService.showToastNotification($translate.instant('ON_ONLINE'),'SHORT');
            }
          };
          //Function that is called when device is going OffLine.
          var onOffline = function () {
            $rootScope.$broadcast('offline');
            if (!NetworkService.isOnline()) {
              return;
            }
            if (navigator.connection.type == Connection.NONE) {
              NetworkService.setOffline();
              GuiUtilsService.showToastNotification($translate.instant('ON_OFFLINE'),"SHORT");
            }
          };

          var getAppId = function () {
            /*Generate a UUID, Store it to $localStorage, and use it as Device UUID*/
            var s4 = function () {
              return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
            };
            if ($localStorage.hasEntry(CONST.APP_ID_KEY)) {
              return $localStorage.get(CONST.APP_ID_KEY);
            } else {
              var appId = s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
              $localStorage.set(CONST.APP_ID_KEY, appId.toUpperCase());
              return appId.toUpperCase();
            }
          };

          document.addEventListener("deviceready", function () {
            if (navigator.splashscreen) {
              navigator.splashscreen.hide();
            }

            //replace the window.open function with the similar function of InAppBrowser
            window.open = cordova.InAppBrowser.open;

            InfoService.set(CONST.ON_DEVICE, true);
            InfoService.set(CONST.OS_KEY, device.platform);
            if (CONST.USE_DEVICE_UUID) {
              InfoService.set(CONST.APP_ID_KEY, device.uuid.toUpperCase());
            } else {
              InfoService.set(CONST.APP_ID_KEY, getAppId());
            }
            validateSettings();

            if (device.platform === 'browser') {
              try {
                facebookConnectPlugin.browserInit(CONST.SERVICE_PROVIDERS.FB.APP_KEY, 'v2.4');
              } catch (error) {
                console.log('Error while initializing fb plugin');
              }
            }

            //Check for internet Connection
            NetworkService.checkConnection();
            //Setup Push Notifications...
            if (NetworkService.isOnline()) {
              PushService.register();
              //Check LBS settings and start automatically....
              applyLbsSettings();
            }

            try {
              cordova.getAppVersion.getVersionNumber(function (version) {
                InfoService.set(CONST.APP_VERSION_KEY, version);
              });
            } catch (ex) {
              console.log('Could not get AppVersion...');
            }
          }, false);
          document.addEventListener("offline", onOffline, false);
          document.addEventListener("online", onOnline, false);
          /*document.addEventListener('onunload', onExit,false);*/

          // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard for form inputs)
          if (window.cordova && window.cordova.plugins.Keyboard) {
            cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
          }
          if (window.StatusBar) {
            StatusBar.styleDefault();
          }

        });
      }]);
}());
