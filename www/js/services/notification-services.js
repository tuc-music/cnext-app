/**
 * Created by nektarios on 10/12/2016.
 */
(function () {
  'use strict';

  /*global angular */
  angular.module('cnextApp.notificationServices', [])

    .factory('PushService', ['$rootScope', '$state', '$http', '$translate', 'PostsService', 'LocationService', 'UsersService', 'EventsService', '$localStorage', '$ionicPopup', '$ionicHistory', 'CONST', 'InfoService', '$filter', 'dataUtils','GuiUtilsService', '$injector',
      function ($rootScope, $state, $http, $translate, PostsService, LocationService, UsersService, EventsService, $localStorage, $ionicPopup, $ionicHistory, CONST, InfoService, $filter, dataUtils, GuiUtilsService, $injector) {
        var registered = false;
        var muted = false;
        var push;
        var pushFac = {};
        var withUser=false;

        var pushSettings = $localStorage.getObjectDefault(CONST.APP_SETTINGS_KEY, {
          pushSettings: {
            receive: true,
            show: true
          }
        }).pushSettings;

        /*Handler function for notifications. Is declared as var in order to be attached/detached to the notification event */
        var onNotificationReceived = function (ntfIn) {
          var notification = {};
          var removeKeys = ['coldstart', 'foreground', 'google.message_id'];
          angular.forEach(ntfIn.additionalData, function (value, key) {
            if (!dataUtils.isInArray(key, removeKeys)) {
              notification[key] = dataUtils.parseBoolean(value);
            }
          });

          /*Play a sound when an LBS notification is send on iOS and the app is Open*/
          //TODO: Check if dismissed can be used to achieve this behavior for all notifications
          if (InfoService.is(CONST.OS_KEY,'iOS') && navigator.notification && dataUtils.isInArray(notification.ntfType, CONST.NTFS.LBS)){
            navigator.notification.beep(1);
          }

          /*Change notification message to linkify its message*/
          if (dataUtils.isInArray(notification.ntfType, CONST.NTFS.LINKABLE) && !notification.doNotLinkify) {
            var htmlMsg = (notification.popUpMsg==='')? '' : '<p open-external-url>' + $filter('linky')(notification.popUpMsg) + '</p>';
            notification.popUpMsg = htmlMsg;
          }

          /*If notification can be processed later on, mark it as unprocessed*/
          if (dataUtils.isInArray(notification.ntfType, CONST.NTFS.DEFERRED)) {
            notification.processed = false;
          }

          /*if notification should be stored, store it*/
          if (dataUtils.isInArray(notification.ntfType, CONST.NTFS.STORABLE) && !notification.doNotStore) {
            storeNotification(notification,CONST.NOTIFICATIONS_KEY);
          }

          /*if notification is an lbs response then store it no matter if it has been already stored*/
          if (dataUtils.isInArray(notification.ntfType, CONST.NTFS.LBS) && !notification.doNotStore){
            var ntfKey = notification.poi +'.'+ notification.trigger + '.' +notification.ntfType;
            var lbsNtfs = $localStorage.getObjectDefault(CONST.LBS.NOTIFICATIONS_KEY,{});
            if (lbsNtfs[ntfKey] && lbsNtfs[ntfKey].processed){
              notification.processed=true;
            }
            storeNotification(notification,CONST.LBS.NOTIFICATIONS_KEY);
          }

          /*4 Debugging Purposes only*/
          console.log('Notification:');
          console.log(notification);

          if (pushSettings.show) {
            if (dataUtils.isInArray(notification.ntfType, CONST.NTFS.CONFIRMABLE)) {
              var msgTemplate = (notification.hashtag && notification.hashtag !== '') ? notification.popUpMsg + '<br/>HashTag:' + notification.hashtag : notification.popUpMsg;
              if (notification.ntfType === 'digest') {
                notification.popUpTitle = $translate.instant('NEW_POSTS_DIGEST');
                msgTemplate = $translate.instant('SEE_NEW_POSTS_NOW');
              }
              if (!notification.msgUrl) {
                var dialog = $ionicPopup.confirm({
                  title: notification.popUpTitle,
                  template: msgTemplate,
                  cssClass: 'cnextPop',
                  okText: 'Yes'
                });
                dialog.then(function (agreed) {
                  if (agreed) {
                    resolveNotification(notification);
                  } else {
                    console.log('User did not resolve the notification...');
                  }
                });
              }else{
                var ModalService = $injector.get('ModalService');
                ModalService.show('templates/partials/modal-msg-window.html','LbsModalCtlr',notification).then(function (confirmed) {
                  if (confirmed){
                    resolveNotification(notification);
                  }else{
                    console.log("User did not confirm LBS!")
                  }
                });
              }
            } else {
              resolveNotification(notification);
            }
          }
          push.finish(function () {
          });
        };

        var resolveNotification = function (notification) {
          $ionicHistory.clearCache().then(function () {
            var toState = '';
            switch (notification.ntfType) {
              case 'reqPst':
                toState = 'app.event';
                $state.go(toState, {
                  eventId: notification.eventId,
                  ntfAction: 'reply',
                  ntfKey: notification.dateTimeSent,
                  ntfHashTag: notification.hashtag
                }, {reload: true});
                break;
              case 'digest':
                toState = 'app.wall';
                PostsService.reload().then(function () {
                  $rootScope.$broadcast('posts.reloaded');
                  $state.go(toState, {
                    ntfKey: notification.dateTimeSent,
                  }, {reload: true});
                });
                break;
              case 'openSettings':
                toState = 'app.settings';
                $state.go(toState, {
                  ntfKey: notification.dateTimeSent,
                }, {reload: true});
                break;
              case 'lbsCnfrm':
                var LBSService = $injector.get('LbsManager');
                LBSService.executeScenarioAction(notification);
                break;
              case 'alert':
              case 'lbsMsg':
                if (notification.msgUrl){
                  var ModalService = $injector.get('ModalService');
                  ModalService.show('templates/partials/modal-msg-window.html','LbsModalCtlr',notification);
                }else {
                  $ionicPopup.alert({
                    title: notification.popUpTitle,
                    template: notification.popUpMsg,
                    cssClass: 'cnextPop'
                  });
                }
                var ntfList=(dataUtils.isInArray(notification.ntfType,CONST.NTFS.LBS))? CONST.LBS.NOTIFICATIONS_KEY : CONST.NOTIFICATIONS_KEY;
                var ntfKey = ntfList===CONST.NOTIFICATIONS_KEY? notification.dateTimeSent: notification.poi+'.'+notification.trigger+'.'+notification.ntfType;
                pushFac.setNotificationProcessed(ntfKey,ntfList);
                break;
              case 'quiz':
              case 'mc-quiz':
                var ModalService = $injector.get('ModalService');
                ModalService.show('templates/partials/modal-msg-window.html','LbsModalCtlr',notification).then(function(answer){
                  console.log("User answer is: " + answer);
                  //TODO:Process answer...
                });
                break;
              default:
                break;
            }
          });
        };

        var storeNotification = function (notification,listKey) {
          var persistentNtfs = $localStorage.getObjectDefault(listKey,{});
          if (listKey===CONST.LBS.NOTIFICATIONS_KEY){
            var ntfKey = notification.poi +'.'+ notification.trigger + '.' +notification.ntfType;
            persistentNtfs[ntfKey] = notification;
          }else {
            persistentNtfs[notification.dateTimeSent] = notification;
          }
          $localStorage.setObject(listKey, persistentNtfs);
        };


        var getStoredNotifications = function (ntfList) {
          var ntfs = $localStorage.getObjectDefault(ntfList,{});
          angular.forEach(ntfs, function (ntf) {
            if (ntf.eventId) {
              var evt = EventsService.getEvent(ntf.eventId);
              if (evt !== {}) {
                ntf['eventTitle'] = EventsService.getEvent(ntf.eventId).title;
              } else {
                delete ntf.eventId;
              }
            }
          });
          return ntfs;
        };


        pushFac.isRegistered = function () {
          return registered;
        };

        pushFac.processNotification = resolveNotification;

        pushFac.getStoredNotifications = getStoredNotifications

        pushFac.setNotificationProcessed = function (ntfKey,ntfList) {
          var persistentNtfs = $localStorage.getObject(ntfList);
          if (persistentNtfs[ntfKey]) {
            persistentNtfs[ntfKey].processed = true;
            $localStorage.setObject(ntfList, persistentNtfs);
            $rootScope.$broadcast('notificationProcessed', ntfKey);
          }
        };

        pushFac.deleteNotification = function (ntfKey,ntfList) {
          var persistentNtfs = $localStorage.getObject(ntfList);
          delete persistentNtfs[ntfKey];
          $localStorage.setObject(ntfList, persistentNtfs);
        };

        pushFac.storeNotification = storeNotification;

        pushFac.setSettings = function (settings) {
          pushSettings = settings;
        };

        pushFac.register = function () {
          if ((UsersService.isUserLoggedIn()==withUser) && ((push && registered) || !pushSettings.receive)) {
            console.log('Already registered for Push Notifications. Skipping registration');
            return;
          }
          console.log('Trying to register for push Notifications');
          try {
            push = PushNotification.init({
              "android": {
                "senderID": CONST.SERVICE_PROVIDERS.GOOGLE.GCM_SENDER_ID,
                "forceShow":true
              },
              "ios": {
                "alert": "true",
                "badge": "true",
                "sound": "true"
              },
              "windows": {}
            });

            push.on('registration', function (gcmRegistration) {
              console.log("Device Registered for Push Notifications");
              console.log(JSON.stringify(gcmRegistration));
              /*Add Device Information*/
              if (device) {
                gcmRegistration['os'] = device.platform;
                gcmRegistration['uuid'] = InfoService.get(CONST.APP_ID_KEY);
              }
              /*Add User Information*/
              if (UsersService.isUserLoggedIn()) {
                withUser=true;
                gcmRegistration['userId'] = UsersService.getCurrentUserId();
              }
              /*Add Old RegistrationID Information*/
              //gcmRegistration['prevRegId'] = $localStorage.get(CONST.GCM_TOKEN_KEY);

              //Add location data to Request
              LocationService.getUserLocation().then(function (location) {
                if (location) {
                  gcmRegistration['latitude'] = parseFloat(location.lat().toFixed(6));
                  gcmRegistration['longitude'] = parseFloat(location.lng().toFixed(6));
                }
                $http({
                  url: CONST.REST_API_URL + '/devices/register',
                  timeout: CONST.NETWORK_TIMEOUT,
                  method: 'POST',
                  data: gcmRegistration,
                  headers: {
                    'Content-Type': 'application/json'
                  }
                }).then(function (response) {
                  var rsp = response.data;
                  if (rsp.success) {
                    $localStorage.set(CONST.GCM_TOKEN_KEY, gcmRegistration.registrationId);
                    registered = true;
                    console.log('Device successfully registered to Cnext!');
                  } else {
                    console.log('GCM Registration@CNEXT Error:');
                    console.log(rsp.data.message);
                    //Delete any gcm registration Id existed in local storage
                    $localStorage.deleteEntry(CONST.GCM_TOKEN_KEY);
                    registered = false;
                  }
                }, function (error) {
                  console.log('GCM Registration@CNEXT Error:');
                  console.log(error);
                  //Delete any gcm registration Id existed in local storage
                  $localStorage.deleteEntry(CONST.GCM_TOKEN_KEY);
                  registered = false;
                });
              }, function (error) {
                console.log(error);
                console.log('Registering to cnext without location coords');
                $http({
                  url: CONST.REST_API_URL + '/devices/register',
                  timeout: CONST.NETWORK_TIMEOUT,
                  method: 'POST',
                  data: gcmRegistration,
                  headers: {
                    'Content-Type': 'application/json'
                  }
                }).then(function (response) {
                  var rsp = response.data;
                  if (rsp.success) {
                    $localStorage.set(CONST.GCM_TOKEN_KEY, gcmRegistration.registrationId);
                    registered = true;
                    console.log('Device successfully registered to Cnext!');
                  } else {
                    console.log('GCM Registration@CNEXT Error:');
                    console.log(rsp.data.message);
                    //Delete any gcm registration Id existed in local storage
                    $localStorage.deleteEntry(CONST.GCM_TOKEN_KEY);
                    registered = false;
                  }
                }, function (error) {
                  console.log('GCM Registration@CNEXT Error:');
                  console.log(error);
                  //Delete any gcm registration Id existed in local storage
                  $localStorage.deleteEntry(CONST.GCM_TOKEN_KEY);
                  registered = false;
                });
              });
            });

            push.on('notification', onNotificationReceived);

            push.on('error', function (error) {
              console.log("push error");
              console.log(error);
            });
          } catch (ex) {
            console.log('could not register');
          }

        };

        pushFac.unRegister = function () {
          push.unregister(function () {
            registered = false;
            push = undefined;
            console.log('unregistered');
          }, function () {
            console.log('error');
          });
        };

        pushFac.mute = function () {
          pushSettings.show = false;
          /*if (push) {
           push.off('notification', onNotificationReceived);
           }*/
        };

        pushFac.unMute = function () {
          pushSettings.show = true;
        };

        return pushFac;
      }])
  ;
}());

