/* Created by Nektarios Gioldasis */
(function () {
  'use strict';

  /*global angular */
  angular.module('cnextApp.controllers', ['cnextApp.constants', 'cnextApp.pushControllers','cnextApp.eventControllers', 'cnextApp.postControllers','cnextApp.locationControllers', 'ngCordova', 'cnextApp.userServices','cnextApp.socialService'])
    .controller('AppCtlr', ['$rootScope','$state','$translate','$ionicHistory','$scope', 'NetworkService' , 'UsersService',
      'PushService','PostsService','$ionicLoading','$ionicModal','$ionicPopup','$timeout','CONST','InfoService','SocialService','GuiUtilsService',
      function ($rootScope,$state, $translate, $ionicHistory, $scope, NetworkService, UsersService,
                PushService,PostsService,$ionicLoading,$ionicModal,$ionicPopup,$timeout,CONST,InfoService,SocialService,GuiUtilsService) {
      $scope.isUserLoggedIn = UsersService.isUserLoggedIn();
      $scope.user=UsersService.getCurrentUser();
      $scope.hasUserAcceptedDisclaimer=($scope.isUserLoggedIn)? UsersService.isDisclaimerAccepted($scope.user.email):false;
      $scope.isOnline = NetworkService.isOnline();
      $scope.currentGuiLang = $translate.use();
      $scope.SocialService = SocialService;

      $scope.$on('lbs-mode',function(evt,mode){
        $scope.lbsTesting=mode;
      });

      $scope.$on('online',function(){
        $scope.isOnline=true;
      });

      $scope.$on('offline',function(){
        $scope.isOnline=false;
      });

      $scope.$on('userSignedUp',function(event,user){
        $scope.isUserLoggedIn=true;
        $scope.user = user;
        console.log('AppCtlr Scope User changed to:');
        PushService.register();
        $scope.showDisclaimer(true);
      });

      $scope.$on('userLoggedIn',function(event,user){
        $scope.isUserLoggedIn=true;
        $scope.user = user;
        //Reload Posts to handle likes properly...
        PostsService.reload();
        GuiUtilsService.showToastNotification($translate.instant('WELCOME'),'SHORT');
        PushService.register();
      });

      $scope.$on('userAcceptedDisclaimer',function(){
        $scope.hasUserAcceptedDisclaimer=true;
      });


      /*Function used to go to Login State. The Params argument is a JSON object
      * that contains the following information: a) 'state' the state name that the app should
      * be transitioned after successful login, and b) 'params' a json object with params that
      * should be passed back to that state.*/
      $scope.showLogin=function(params){
        $ionicLoading.show(CONST.LOADER_CFG);
        $rootScope.$broadcast('onLoginState');
        $timeout(function () {
          console.log('going to Login Page with Params:');
          console.log(params);
          $state.go('app.login',{cfg:params});
          $ionicLoading.hide();
        }, 500);
      };

      $scope.goHome=function(){
        $ionicHistory.nextViewOptions({
          disableBack: true,
          historyRoot:true
        });
        $state.go('app.home').then(function(){
          console.log('went to home...');
          $ionicHistory.clearCache().then(function(){
            console.log('...and deleted the cache');
          });
        })

      };

      $scope.logoutUser = function () {
        UsersService.logoutUser();
        $scope.isUserLoggedIn=false;
        $scope.user=undefined;
        //PostsService.reload();
      };

      $scope.showDisclaimer=function(newUser){
        $scope.newUser = newUser || false;
        $ionicModal.fromTemplateUrl('templates/partials/disclaimer.html', {
          scope:$scope,
          animation: 'slide-in-up'
        }).then(function(modal) {
          $scope.discModal = modal;
          $scope.discModal.show();
        });
      };

      $scope.declineDisclaimer=function(){
        if ($scope.newUser) {
          $translate(['POP_UP.DSCLMR_DECLINED.TITLE','POP_UP.DSCLMR_DECLINED.BODY']).then(function(texts) {
            $ionicPopup.alert({
              title: texts['POP_UP.DSCLMR_DECLINED.TITLE'],
              template: texts['POP_UP.DSCLMR_DECLINED.BODY'],
              cssClass: 'cnextPop'
            });
          });
        }
        console.log('Trying to set Disclaimer Declined....');
        delete $scope.newUser;
        $scope.discModal.remove();
        $rootScope.$broadcast('userDeclinedDisclaimer');
      };

      $scope.acceptDisclaimer=function(){
        if ($scope.newUser) {
          $translate(['POP_UP.DSCLMR_ACCEPTED.TITLE','POP_UP.DSCLMR_ACCEPTED.BODY']).then(function(texts) {
            $ionicPopup.alert({
              title: texts['POP_UP.DSCLMR_ACCEPTED.TITLE'],
              template: texts['POP_UP.DSCLMR_ACCEPTED.BODY'],
              cssClass: 'cnextPop'
            });
          });
        }
        console.log('Trying to set Disclaimer Accepted....');
        delete $scope.newUser;
        UsersService.setDisclaimerAccepted($scope.user.email);
        $rootScope.$broadcast('userAcceptedDisclaimer');
        $scope.discModal.remove();
      };

      $scope.imgUrl = function(userId,source){
        source = source || 'CN';
        if (source==='FB'){
          return 'https://graph.facebook.com/'+userId + '/picture?width=60&height=60';
        }else{
          return CONST.BACKEND_URL + 'content/users/User-'+userId;
        }
      };

      $scope.openUrlInSystem=function(url){
        window.open(url, '_system', 'location=yes');
        return false;
      };

      $scope.showFullImage=function (fullImgSrc) {
        $scope.fullImageSrc=fullImgSrc;
        $ionicModal.fromTemplateUrl('templates/partials/image-modal.html', {
          scope: $scope,
          animation: 'slide-in-up'
        }).then(function (modal) {
          $scope.fullImgModal = modal;
          $scope.fullImgModal.show();
        });
      };

      $scope.closeFullImage = function(){
        $scope.fullImgModal.hide();
      };

      $scope.$on('$destroy', function() {
        if ($scope.fullImgModal) {
          $scope.fullImgModal.remove();
          console.log('Image Modal Destroyed');
        }
      });
    }])

    .controller('LoginCtlr', ['$rootScope','$state','$stateParams','$translate','$ionicHistory','$scope', 'UsersService','$ionicLoading','$ionicPopup','$ionicModal','CONST', function ($rootScope,$state,$stateParams,$translate,$ionicHistory, $scope, UsersService,$ionicLoading,$ionicPopup,$ionicModal,CONST) {

      $scope.$on('$ionicView.afterEnter', function () {
        $rootScope.$broadcast('loading:hide');
      });

      $scope.userCredentials = {email:'',pw:''};

      //Configure where to go after a successful login
      if ($stateParams.cfg && $stateParams.cfg!=={}) {
        $scope.redirectTo = {state: $stateParams.cfg.state, params: $stateParams.cfg.params};
      }else{
        $scope.redirectTo={state:'app.home',params:{}};
      }

      $scope.loginWithFB = function () {
        UsersService.loginUserWithFB().then(function (user) {
          $ionicLoading.hide();
          if (user.newUser){
            $rootScope.$broadcast('userSignedUp',user);
          }else{
            console.log('Logged in with FB and now going to '+$scope.redirectTo.state +' Page with Params:');
            console.log($scope.redirectTo.params);
            if ($scope.redirectTo.state==='app.home'){
              $ionicHistory.nextViewOptions({
                disableBack: true
              });
            }
            $state.go($scope.redirectTo.state,$scope.redirectTo.params).then(function(){
              $rootScope.$broadcast('userLoggedIn',user);
            });
          }
        }, function (error) {
          $ionicLoading.hide();
          console.log('AppCtlr. Login Error Result:');
          console.log(error);
            $ionicPopup.alert({
              title: $translate.instant('POP_UP.LOGIN_ERROR.TITLE'),
              template: $translate.instant('POP_UP.LOGIN_ERROR.BODY')+'<br/>'+$translate.instant('MESSAGE')+': ' + error,
              cssClass: 'cnextPop'
            });
        });
      };

      $scope.loginWithCN = function () {
        $ionicLoading.show(CONST.LOADER_CFG);
        UsersService.loginUserWithCN($scope.userCredentials).then(function (user) {
          //console.log('Logged in with CN and now going to '+$scope.redirectTo.state +' Page with Params:');
          //console.log($scope.redirectTo.params);
          $ionicLoading.hide();
          if ($scope.redirectTo.state === 'app.home'){
            $ionicHistory.nextViewOptions({
              disableBack: true
            });
          }
          $state.go($scope.redirectTo.state,$scope.redirectTo.params).then(function(){
            $rootScope.$broadcast('userLoggedIn',user);
          });
        }, function (error) {
          $ionicLoading.hide();
          console.log('AppCtlr. Login Error Result:');
          console.log(error);
          $translate(['POP_UP.LOGIN_ERROR.TITLE','POP_UP.LOGIN_ERROR.BODY']).then(function(texts) {
            $ionicPopup.alert({
              title: texts['POP_UP.LOGIN_ERROR.TITLE'],
              template: texts['POP_UP.LOGIN_ERROR.BODY']+ '<br/>['+error+']',
              cssClass: 'cnextPop'
            });
          });
        });
      };

      $scope.showSignUpModal = function(){
        $ionicModal.fromTemplateUrl('templates/partials/sign-up.html', {
          scope:$scope,
          animation: 'slide-in-up'
        }).then(function(modal) {
          $scope.signUpModal = modal;
          $scope.signUpModal.show();
        });
      };

      $scope.$on('userSignedUp',function(){
        if ($scope.signUpModal){
          $scope.signUpModal.remove();
        }
      });

      $scope.$on('userAcceptedDisclaimer',function(){
        $scope.doRedirect(true);
      });

      $scope.$on('userDeclinedDisclaimer',function(){
        $scope.doRedirect(true);
      });

      $scope.doRedirect = function(loginSuccess){
        $state.go($scope.redirectTo.state,$scope.redirectTo.params).then(function(){
          if (loginSuccess) {
            $rootScope.$broadcast('userLoggedIn', $scope.user);
          }
        });
      };

    }])

    .controller('SignUpCtlr', ['$rootScope','$state','$stateParams','$translate','$ionicHistory','$scope', 'UsersService','$ionicLoading','$ionicPopup','$timeout','InfoService','ImageService','$ionicActionSheet','CONST', function ($rootScope,$state,$stateParams,$translate,$ionicHistory, $scope, UsersService,$ionicLoading,$ionicPopup,$timeout,InfoService,ImageService,$ionicActionSheet,CONST) {

      $scope.$on('$ionicView.afterEnter', function () {
        $rootScope.$broadcast('loading:hide');
      });

      var fileUri = (InfoService.is(CONST.ON_DEVICE))? cordova.file.applicationDirectory + 'www/img/icon-user.png' : 'img/icon-user.png';
      console.log(fileUri);

      $scope.user = {email:'',pw:'',firstName:'',lastName:'',photoUrl:fileUri};
      /*$scope.user = {email:'petros@ced.tuc.gr',pw:'qwerty',pwc:'qwerty',firstName:'Petros',lastName:'Kapoulas',photoUrl:fileUri};*/

      $scope.signUp = function(){
        $ionicLoading.show(CONST.LOADER_CFG);
        UsersService.signUp($scope.user, function (user) {
          $ionicLoading.hide();
            $rootScope.$broadcast('userSignedUp',user);
        }, function (error) {
          console.log(error);
          $ionicLoading.hide();
          $translate(['POP_UP.SIGNUP_ERROR.TITLE','POP_UP.SIGNUP_ERROR.BODY']).then(function(texts) {
            $ionicPopup.alert({
              title: texts['POP_UP.SIGNUP_ERROR.TITLE'],
              template: texts['POP_UP.SIGNUP_ERROR.BODY'],
              cssClass: 'cnextPop'
            });
          });
        });
      };


      //function to Open ActionSheet
      $scope.showPhotoSelector = function () {
        $translate(['YOUR_PHOTO','CANCEL','NEW_PHOTO','GALLERY_PHOTO']).then(function(texts) {
          $scope.photoSrcSelector = $ionicActionSheet.show({
            buttons: [
              {text: texts.NEW_PHOTO},
              {text: texts.GALLERY_PHOTO}
            ],
            titleText: texts.YOUR_PHOTO,
            cancelText: texts.CANCEL,
            buttonClicked: function (index) {
              $scope.addUserPhoto(index);
              return true;
            }
          });
        });
      };

      $scope.addUserPhoto = function (source) {
        ImageService.handleMediaDialog(source,'userImg').then(function (imgUrl) {
          $scope.user.photoUrl = imgUrl;
        }, function () {
          console.log('error while taking photo...');
        });
      };

    }])

    .controller('HomeCtlr', ['$rootScope','$scope','$state', '$timeout','$ionicLoading','$localStorage','UsersService','EventsService','EventAlertsService','InfoService','CONST','ModalService','GuiUtilsService',
      function ($rootScope,$scope,$state,$timeout,$ionicLoading,$localStorage, UsersService,EventsService,EventAlertsService,InfoService,CONST,ModalService, GuiUtilsService) {

      $scope.isUserLoggedIn = UsersService.isUserLoggedIn();
      $scope.user=UsersService.getCurrentUser();

      /*Show Alerts on Home Page*/
      $scope.reminders = {show:false,data:[]};
      EventsService.fetchEvents()
        .then(function(){
          $rootScope.$broadcast('loading:hide');
          /*GetEventReminders params: timePeriod, onlyFirst, onlyTopLevel*/
          EventAlertsService.getEventReminders([1,'weeks'],false,true).then(
            function(evtReminders){
              $scope.reminders.data = $scope.reminders.data.concat(evtReminders);
            }
          )
        },function(error){
          $rootScope.$broadcast('loading:hide');
        });
        /*Close Alert*/
        $scope.dismissReminder=function(index){
          var reminder = $scope.reminders.data[index];
          var reminderShows = $localStorage.getObjectDefault("reminders",{events:{}});
          reminderShows.events[reminder.evtId] = [reminder.key];
          $localStorage.setObject('reminders',reminderShows);
          $scope.reminders.data.splice(index, 1);
        };

        /*Resolve Alert*/
        $scope.resolveReminder = function (index,$event, evtId){
          $rootScope.$broadcast('loading:show');
          $state.go('app.event',{eventId:evtId});
          $scope.dismissReminder(index,$event);
        };

      $scope.doRefresh=function(){
        window.location.reload(true);
      };

      $scope.$on('$ionicView.afterEnter',function(){
        if (EventsService.isResolved()){
          $rootScope.$broadcast('loading:hide');
        }
        var elms = document.getElementsByClassName("title title-center header-item");
        for (var i=0;i<elms.length;i++){
          elms[i].style.left="50px";
          elms[i].style.right="70px";
        }
      });

      $scope.clearLogs=function(){
        var logDiv = document.getElementById('appLogs');
        if (logDiv){
          logDiv.innerHTML='';
        }
      };

      $scope.testQuiz = function(){
        ModalService.show('templates/partials/modal-msg-window.html','LbsModalCtlr',{
          popUpTitle:'Your input...',
          ntfType:'mc-quiz',
          options:['Green','Yellow','Black'],
          question:'Please enter the code you received by SMS',
          correctAnswer:1234
        }).then(function (answer) {
          console.log('user answered: '+ answer);
        });
      };

        $scope.testLocalNtf = function (){
          cordova.plugins.notification.local.schedule({
          title: 'Permission Required',
          text: 'Welcome to the "Human Mosaic Treasure Hunt game. If you find the treasure, lots of goodies will become yours! Do you want to play?',
          actions:[
              {id:'no', title:'No Thanks...'},
              {id:'yes', title:'Yeap!'}
          ],
          trigger:{in:2,unit:'second'},
          foreground: true,
          launch:true
      });

        }

    }])

    .controller('SettingsCtlr',['$scope','$state','$rootScope','$localStorage','InfoService','$translate','PushService','UsersService','$ionicLoading','$ionicPopup','$timeout','CONST','amMoment','LbsManager','GuiUtilsService',
      function ($scope, $state, $rootScope, $localStorage, InfoService, $translate, PushService, UsersService, $ionicLoading, $ionicPopup, $timeout, CONST, amMoment, LbsManager, GuiUtilsService) {

        if ($localStorage.hasEntry(CONST.APP_SETTINGS_KEY)) {
          $scope.data = $localStorage.getObject(CONST.APP_SETTINGS_KEY);
          $scope.initial= $localStorage.getObject(CONST.APP_SETTINGS_KEY);
        }else{
          $scope.data = CONST.DEFAULT_APP_SETTINGS;
          $scope.initial = {};
          angular.copy($scope.data,$scope.initial);
        };

        $scope.langs = CONST.GUI_LANGUAGES;

        $scope.timeFilters= _.values(CONST.TIME_FILTERS);
        $scope.timeFilters.splice(3,1);

        $scope.placeFilters = CONST.PLACE_FILTERS;

        $scope.advancedLbs = false;

        $scope.toogleAdvancedLbs = function () {
          $scope.advancedLbs = !$scope.advancedLbs;
        };

        $scope.resetLbsTrackingData = function () {
          LbsManager.resetLbsTrackingData();
        };

        $scope.setLbsMode = function () {
            InfoService.set(CONST.LBS.TESTING_KEY,$scope.data.lbsSettings[CONST.LBS.TESTING_KEY]);
            $rootScope.$broadcast('lbs-mode',$scope.data.lbsSettings[CONST.LBS.TESTING_KEY]);
        };

        $scope.uploadLbsData = function (){
          LbsManager.uploadLbsData();
        };

        $scope.$on('$ionicView.afterEnter',function(){
          $rootScope.$broadcast('loading:hide');
        });

        $scope.setLanguage = function(){
          console.log($scope.data.gui_language);
        };

        $scope.applyPushPolicy=function(){
          if (!$scope.data.pushSettings.receive){
            $scope.data.pushSettings.show=false;
          }
        };

        $scope.applyPushDisplayPolicy=function(){
          if ($scope.data.pushSettings.show){
            $scope.data.pushSettings.receive=true;
          }
        };

        $scope.applyLbsPolicy = function(){
          if ($scope.data.lbsSettings.allow){
            $scope.data.lbsSettings.gps.allow=true;
            $scope.data.lbsSettings.bcn.allow=true;
            if (!UsersService.isUserLoggedIn()){
              GuiUtilsService.showToastNotification('Location Based Services are offered to logged in users only. Please Login.','LONG');
              $scope.data.lbsSettings.allow=false;
              $scope.data.lbsSettings.gps.allow=false;
              $scope.data.lbsSettings.bcn.allow=false;
              return false;
            }else {
              LbsManager.start();
            }
          }else{
            LbsManager.stop();
            $scope.data.lbsSettings.gps.allow=false;
            $scope.data.lbsSettings.bcn.allow=false;
          }
          return true;
        };

        $scope.saveSettings = function(){
          PushService.setSettings($scope.data.pushSettings);
          if ($scope.data.pushSettings.receive){
            PushService.register();
            if (!$scope.data.pushSettings.show){
              PushService.mute();
            }else{
              PushService.unMute();
            }
          }else{
            PushService.unRegister();
          }

          if (!$scope.applyLbsPolicy()){
            // do not save settings if lbs policy cannot be applied
            return;
          }

          $localStorage.setObject(CONST.APP_SETTINGS_KEY,$scope.data);

          if ($scope.data.gui_language !== $scope.initial.gui_language){
            $translate.use($scope.data.gui_language).then(function() {
                var msg = $ionicPopup.show({
                  title: $translate.instant('POP_UP.SAVE_SETTINGS.TITLE'),
                  template: $translate.instant('POP_UP.SAVE_SETTINGS.BODY'),
                  cssClass: 'cnextPop'
                });
                $timeout(function () {
                  msg.close();
                  $state.go('app.home');
                }, 1000);
              amMoment.changeLocale($scope.data.gui_language);
              });
          }else{
            var msg = $ionicPopup.show({
              title: $translate.instant('POP_UP.SAVE_SETTINGS.TITLE'),
              template: $translate.instant('POP_UP.SAVE_SETTINGS.BODY'),
              cssClass: 'cnextPop'
            });
            $timeout(function () {
              msg.close();
              $state.go('app.home');
            }, 1000);
          }
          angular.copy($scope.data,$scope.initial);

        };

        $scope.revertSettings = function(){
          angular.copy($scope.initial,$scope.data);
        };

    }])

    .controller('AboutCtlr',['$scope','$rootScope','InfoService','CONST',function($scope,$rootScope,InfoService,CONST){
      $scope.data= {
        appId: InfoService.get(CONST.APP_ID_KEY) || '',
        appVer: InfoService.get(CONST.APP_VERSION_KEY) || ''
      };
      $scope.showAppId=false;
      $scope.$on('$ionicView.afterEnter',function(){
        $rootScope.$broadcast('loading:hide');
      });
    }])

    .controller('ProfileCtlr', ['$rootScope','$state','$translate','CONST','$ionicHistory','$scope', 'UsersService','$ionicLoading','$ionicPopup','$timeout','jsUtils', function ($rootScope,$state,$translate,CONST, $ionicHistory, $scope, UsersService,$ionicLoading,$ionicPopup,$timeout,jsUtils) {

      $scope.$on('$ionicView.afterEnter',function(){
        $rootScope.$broadcast('loading:hide');
        var elms = document.getElementsByClassName("title title-center header-item");
        for (var i=0;i<elms.length;i++){
          elms[i].style.left="50px";
          elms[i].style.right="70px";
        }
      });

      $scope.mode='view';

      $scope.$on('$ionicView.beforeEnter', function(){
        $scope.user = UsersService.getCurrentUser();
        $scope.user.statement= $scope.user.statement || '';
        $scope.user.statement = jsUtils.htmlToPlain($scope.user.statement);
      });

      $scope.startEdit=function(){
        $scope.mode='edit';
      };

      $scope.endEdit=function(){
        $scope.mode='view';
      };

      $scope.updateUser=function(){
        $ionicLoading.show(CONST.LOADER_CFG);
        UsersService.updateUserStatement($scope.user).then(function(user){
          $scope.user = user;
          $ionicLoading.hide();
          var msg = $ionicPopup.show({
            template: $translate.instant("SAVED"),
            cssClass:'popUpNoTitle'
          });
          $timeout(function () {
            msg.close();
          }, 1000);
          $scope.endEdit();
        },function(error){
          $ionicLoading.hide();
          $ionicPopup.alert({
            title:$translate.instant('OOOPS'),
            template:$translate.instant('SOMETHING_WRONG') + '. Message: ' + error,
            cssClass: 'cnextPop'
          });
          $scope.endEdit();
        });
      };

    }])

    .controller('PoliciesCtlr',['$scope','$rootScope',function($scope,$rootScope){
      $scope.$on('$ionicView.afterEnter',function(){
        $rootScope.$broadcast('loading:hide');
      });
    }])

    .controller('TermsCtlr',['$scope','$rootScope',function($scope,$rootScope){
      $scope.$on('$ionicView.afterEnter',function(){
        $rootScope.$broadcast('loading:hide');
      });
    }])

    .controller('LbsModalCtlr',['$scope','parameters','$http','CONST',function($scope,params,$http,CONST){
      $scope.quizTitle='First Question!';
      $scope.msg='';
      $scope.data=params;

      if (params.msgUrl){
        $http.get(params.msgUrl, {headers: {
            'Accept':'text/html'
          },
          timeout: CONST.NETWORK_TIMEOUT})
          .then(function (res) {
            $scope.msg = res.data;
          }, function (error) {
            console.log('Cannot get long message');
            console.log(error);
          });
      }

      if ($scope.data.ntfType==='quiz' || $scope.data.ntfType==='mc-quiz'){
        $scope.data.userAnswer='';
      }

      $scope.setAnswer=function (v) {
        $scope.data.userAnswer = v;
      }

      $scope.submit=function () {
          $scope.closeModal();
      }
    }])
  ;

}());
