/**
 * Created by Nektarios Gioldasis on 21/3/2016.
 */

(function () {
  'use strict';

  /*global angular */
  angular.module('cnextApp.pushControllers', ['cnextApp.systemServices' , 'tuc.utilities', 'ngCordova'])
    .controller('NotificationsCtlr',['$scope','$rootScope','PushService','$ionicPopover','$state','CONST','dataUtils',function($scope,$rootScope,PushService,$ionicPopover,$state,CONST,dataUtils){

      $scope.data = {notifications:[]};
      $scope.loadNotifications = function(){
        var ntfs = PushService.getStoredNotifications(CONST.NOTIFICATIONS_KEY);
        $scope.data.notifications = [];
        angular.forEach(ntfs,function(value){
          if (value.receivedOn){
            value.dateTimeSent=value.receivedOn;
            delete value.receivedOn;
          }
          $scope.data.notifications.push(value);
        });
        $scope.data.notifications.sort(function(a,b){
          if (a.dateTimeSent<b.dateTimeSent){
            return 1;
          }else{
            return -1;
          }
        });
      }

      $scope.$on('$ionicView.beforeEnter', function(){
        $scope.loadNotifications();
      });


      $scope.$on('$ionicView.enter',function(){
        $rootScope.$broadcast('loading:hide');
        var elms = document.getElementsByClassName("title title-center header-item");
        for (var i=0;i<elms.length;i++){
          elms[i].style.left="50px";
          elms[i].style.right="70px";
        }
      });

      $scope.doRefresh=function(){
        $scope.loadNotifications();
        $scope.$broadcast('scroll.refreshComplete');
      }

      $scope.manageNotification = function(notification,$event){
        $ionicPopover.fromTemplateUrl('templates/partials/push-menu.html', {
          scope: $scope
        }).then(function(popover) {
          $scope.pushMenu = popover;
          $scope.notification = notification;
          $scope.pushMenu.show($event);
        });
      };

      $scope.deleteNotification = function(ntfKey){
        PushService.deleteNotification(ntfKey,CONST.NOTIFICATIONS_KEY);
        var idx = _.findIndex($scope.data.notifications,{dateTimeSent:ntfKey});
        $scope.data.notifications.splice(idx,1);
        $scope.pushMenu.remove();
      };

      $scope.processNotification = function(ntfKey){
        var idx = _.findIndex($scope.data.notifications,{dateTimeSent:ntfKey});
        var notification =$scope.data.notifications[idx];
        PushService.processNotification(notification);
        $scope.pushMenu.remove();
      };
    }]);
}())
