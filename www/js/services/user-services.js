/* Created by Nektarios Gioldasis */
(function () {
  'use strict';

  /*global angular */
  angular.module('cnextApp.userServices', [])
    .factory('UsersService', ['$http', '$q', 'ngFB', 'CONST', '$localStorage', 'jsUtils', 'InfoService', '$ionicLoading', '$ionicPopup', '$timeout', '$translate', function ($http, $q, ngFB, CONST, $localStorage, jsUtils, InfoService, $ionicLoading, $ionicPopup, $timeout, $translate) {
      var usersFac = {};

      var openFBLogin = function () {
        console.log('into fbLogin');
        var deferred = $q.defer();
        ngFB.login({scope: 'email,public_profile'}).then(
          function (response) {
            if (response.status === 'connected') {
              var loggedInUser = {
                issuer: CONST.SERVICE_PROVIDERS.FB.NAME,
                accessToken: response.authResponse.accessToken
              };
              deferred.resolve(loggedInUser);
            } else {
              deferred.reject(response);
            }
          });
        return deferred.promise;
      };

      var fbConnectLogin = function () {
        console.log('into fbLogin');
        var deferred = $q.defer();
        facebookConnectPlugin.login(['email', 'public_profile'], function (response) {
          if (response.status === 'connected') {
            var loggedInUser = {
              issuer: CONST.SERVICE_PROVIDERS.FB.NAME,
              accessToken: response.authResponse.accessToken,
              socialId: response.authResponse.userID
            };
            deferred.resolve(loggedInUser);
          } else {
            deferred.reject(response);
          }
        }, function (response) {
          deferred.reject(response);
        });
        return deferred.promise;
      };

      var getOpenFBProfile = function (loggedInUser) {
        /*Get the User Details from FB*/
        /*AccessToken is not needed since openFB internally stores it and reuses it on subsequent api requests.*/
        /*console.log('into getFBProfile. Input:');
         console.log(loggedInUser);*/
        $ionicLoading.show(CONST.LOADER_CFG);
        var deferred = $q.defer();
        ngFB.api({
          path: '/me',
          params: {fields: 'id,first_name,last_name,email'}
        }).then(function (user) {
            var result = {
              issuer: loggedInUser.issuer,
              email: user.email,
              accessToken: loggedInUser.accessToken,
              firstName: user.first_name,
              lastName: user.last_name,
              socialId: user.id
            };
            deferred.resolve(result);
          },
          function (error) {
            console.log('into getFBProfile. Rejecting to:');
            console.log(error);
            deferred.reject("Could not get Facebook Profile");
            $ionicLoading.hide();
          });
        return deferred.promise;
      };

      var getFBConnectProfile = function (loggedInUser) {
        /*Get the User Details from FB*/
        /*AccessToken is not needed since facebookConnect is loogedIn internally stores it and reuses it on subsequent api requests.*/
        $ionicLoading.show(CONST.LOADER_CFG);
        var deferred = $q.defer();
        facebookConnectPlugin.api('/me?fields=id,first_name,last_name,email', ['public_profile'], function (user) {
            var result = {
              issuer: loggedInUser.issuer,
              email: user.email,
              accessToken: loggedInUser.accessToken,
              firstName: user.first_name,
              lastName: user.last_name,
              socialId: user.id
            };
            deferred.resolve(result);
          },
          function (error) {
            console.log('into getFBProfile. Rejecting to:');
            console.log(error);
            deferred.reject("Could not get Facebook Profile");
            $ionicLoading.hide();
          });
        return deferred.promise;
      };

      var cnSocialLogin = function (userProfile) {
        var deferred = $q.defer();
        $http({
          url: CONST.REST_API_URL + '/authorizations/social-login',
          method: 'POST',
          data: userProfile,
          headers: {
            'Content-Type': 'application/json'
          }
        }).then(function (response) {
          var rsp = response.data;
          if (rsp.success) {
            rsp.data.socialId = userProfile.socialId;
            $localStorage.setObject(CONST.CURRENT_USER_KEY, rsp.data);
            deferred.resolve(rsp.data);
          } else {
            deferred.reject(rsp.data.message);
          }
        }, function (error) {
          deferred.reject("Facebook Login could not be validated at cNext Server.");
        });
        return deferred.promise;
      };

      usersFac.loginUserWithFB = function () {
        /*console.log('into loginUserWithFB');*/
        if (InfoService.is(CONST.ON_DEVICE) && CONST.SERVICE_PROVIDERS.FB.LOGIN_WITH==='FCP') {
          return fbConnectLogin()
            .then(getFBConnectProfile)
            .then(cnSocialLogin);
        }else{
          return openFBLogin()
            .then(getOpenFBProfile)
            .then(cnSocialLogin);
        }
      };

      usersFac.loginUserWithCN = function (user) {
        var deferred = $q.defer();
        $http({
          url: CONST.REST_API_URL + '/authorizations/login',
          method: 'POST',
          data: user,
          headers: {
            'Content-Type': 'application/json'
          }
        }).then(function (response) {
          var rsp = response.data;
          if (rsp.success) {
            $localStorage.setObject(CONST.CURRENT_USER_KEY, rsp.data);
            deferred.resolve(rsp.data);
          } else {
            deferred.reject(rsp.data.message);
          }
        }, function (error) {
          deferred.reject("Could not connect to cNext server...");
        });
        return deferred.promise;
      };

      usersFac.signUp = function (user, successClbck, failureClbck) {

        user.photoUrl = (user.photoUrl == '') ? cordova.file.applicationDirectory + 'www/img/icon-user.png' : user.photoUrl;
        var options = new FileUploadOptions();

        options.httpMethod = "POST";
        options.fileKey = "file";
        options.fileName = user.photoUrl.split("/").pop();
        options.mimeType = "image/jpeg";
        options.chunkedMode = false;
        options.headers = {connection: "close"};

        var ftSuccessClbck = function (r) {
          var response;
          response = JSON.parse(r.response);
          console.log('Registration Success Response:');
          console.log(response);
          if (response.success) {
            $localStorage.setObject(CONST.CURRENT_USER_KEY, response.data);
            console.log('User stored in Local Storage');
            console.log(response.data);
            successClbck(response.data);
          } else {
            console.log('Registration Failure Response:');
            console.log(response);
            failureClbck(response.data.message);
          }
        };

        var ftFailureClbck = function (error) {
          console.log("An error has occurred: Code = " + error.code);
          console.log("upload error source " + error.source);
          console.log("upload error target " + error.target);
          failureClbck(error);
        };

        options.params = user;
        var uploader = new FileTransfer();
        uploader.upload(user.photoUrl, encodeURI(CONST.REST_API_URL + '/authorizations/register'), ftSuccessClbck, ftFailureClbck, options, true);
      };

      //Function to test registration workflow...
      usersFac.signUpTest = function (user, successClbck, failureClbck) {
        successClbck({
          first_name: user.firstName,
          last_name: user.lastName,
          issuer: 'CN',
          accessToken: 'accessToken',
          email: 'email@server.org'
        });
      };

      usersFac.setDisclaimerAccepted = function (email) {
        $localStorage.set(CONST.DISCLAIMER_ACCEPTED_PREFIX + email, true);
      };

      usersFac.isDisclaimerAccepted = function (email) {
        return $localStorage.get(CONST.DISCLAIMER_ACCEPTED_PREFIX + email, false);
      };

      usersFac.isUserLoggedIn = function () {
        return $localStorage.hasEntry(CONST.CURRENT_USER_KEY);
      };

      usersFac.getCurrentUser = function () {
        return $localStorage.getObjectDefault(CONST.CURRENT_USER_KEY, undefined);
      };

      usersFac.getCurrentUserId = function () {
        var usr = $localStorage.getObjectDefault(CONST.CURRENT_USER_KEY, undefined);
        return usr ? usr.id : -1;
      };

      usersFac.logoutUser = function () {
        /*if (!usersFac.isUserLoggedIn()) {
         return;
         }*/
        ngFB.logout();
        $localStorage.deleteEntry(CONST.CURRENT_USER_KEY);
        if (typeof facebookConnectPlugin !== "undefined") {
          facebookConnectPlugin.logout(function (success) {
            console.log(success);
          }, function (failure) {
            console.log(failure);
          });
        }
      };

      usersFac.updateUserStatement = function (user) {
        user.userId = user.id;
        user.statement = jsUtils.plainToHtml(user.statement);
        var deferred = $q.defer();
        $http({
          url: CONST.REST_API_URL + '/users/' + user.id,
          method: 'POST',
          data: user,
          headers: {
            'Content-Type': 'application/json'
          }
        }).then(function (response) {
          var rsp = response.data;
          if (rsp.success) {
            delete user.userId;
            $localStorage.setObject(CONST.CURRENT_USER_KEY, user);
            deferred.resolve(user);
          } else {
            deferred.reject(rsp.data.message);
          }
        }, function (error) {
          deferred.reject(error);
        });
        return deferred.promise;
      };

      usersFac.blockUser = function (userId) {
        var deferred = $q.defer();
        $http({
          url: CONST.REST_API_URL + '/users/block',
          method: 'POST',
          data: {
            blockerUuid: InfoService.get(CONST.APP_ID_KEY),
            blockedUserId: userId
          },
          headers: {
            'Content-Type': 'application/json'
          }
        }).then(function (response) {
          var rsp = response.data;
          if (rsp.success) {
            deferred.resolve(true);
          } else {
            deferred.reject(rsp.data.message);
          }
        }, function (error) {
          deferred.reject("Network Operation Failed. Please try again later.");
        });
        return deferred.promise;
      };

      return usersFac;
    }]);
}())

