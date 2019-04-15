/**
 * Created by nektarios on 20/2/2017.
 */


(function () {
  'use strict';

  /*global angular */
  angular.module('cnextApp.socialService', [])
    .factory('SocialService',
      ['$q', 'CONST', 'UsersService', 'InfoService', '$ionicPopup', '$ionicModal', '$timeout', '$translate',
        function ($q, CONST, UsersService, InfoService, $ionicPopup, $ionicModal, $timeout, $translate) {
          var socialFac={};
          /*Function that uses the facebookConnect plugin to send appInvites to FB friends.
          * Not currently used in the app.*/
          socialFac.sendFbAppInvite = function () {
                if (InfoService.is(CONST.ON_DEVICE)) {
                  facebookConnectPlugin.appInvite(
                    {
                      url: "https://fb.me/1734994340147643",
                      picture: "https://lh3.googleusercontent.com/4tqZRZzR_ea9jrLD8hJX52E1pBljx9fB40S5F5UMrvn5cR3KxL6kFx7hfdvH-C_xNtY=w300-rw"
                    },
                    function(obj){
                      if(obj) {
                        if(obj.completionGesture == "cancel") {
                          // user canceled, bad guy
                          console.log('User Canceled...');
                        } else {
                          // user really invited someone :)
                          console.log('User Invited friends...');
                        }
                      } else {
                        // user just pressed done, bad guy
                        console.log('User pressed "Done" ...');
                      }
                    },
                    function(obj){
                      console.log("Error on sending AppInvite");
                      console.log(obj);
                    }
                  );
                } else {
                  $ionicPopup.alert({
                    title: $translate.instant("OOOPS"),
                    template: $translate.instant("SOMETHING_WRONG") + '<br/>' + $translate.instant("MESSAGE") + ': Available on devices only...',
                    cssClass: 'cnextPop'
                  });
                }
              };

          socialFac.invite2cnext = function(){
            if (InfoService.is(CONST.ON_DEVICE)) {
              var onSuccess = function (result) {
                console.log("Share completed? " + result.completed); // On Android apps mostly return false even while it's true
                console.log("Shared to app: " + result.app); // On Android result.app is currently empty. On iOS it's empty when sharing is cancelled (result.completed=false)
              };
              var onError = function (msg) {
                console.log("Sharing failed with message: " + msg);
              };
              /*Dont share an image, because some apps share only the image and not the link*/
              /*var imgUri = 'www/img/app-logo.png';*/
              var msg = $translate.instant('INVITATION_MSG');
              var sbj = $translate.instant('INVITATION_SUBJECT');
              var shareTitle = $translate.instant('INVITE_WITH');
              var options = {
                message: msg,
                subject: sbj,
                files: null,
                url: "http://cnext.tuc.gr/app",
                chooserTitle:shareTitle
              };
              /*window.plugins.socialsharing.share(
                'Hi, Join the Caravan Next community. Get the cNext app Now.',
                'cNext App Invitation',
                null,
                'http://cnext.tuc.gr/app');*/
              window.plugins.socialsharing.shareWithOptions(options, onSuccess, onError);
            }
          };


          return socialFac;
        }]);
}())
