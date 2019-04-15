/**
 * Created by nektarios on 10/2/2017.
 */

(function () {
  'use strict';

  /*global angular */
  angular.module('cnextApp.feedService', [])
    .factory('FeedService',
      ['$q', '$sce', '$injector', '$rootScope', '$state', '$filter', 'CONST', 'dataUtils', 'jsUtils', 'EventsService', 'PostsService','GuiUtilsService','PushService', 'UsersService', 'InfoService', 'CommentsService', '$ionicLoading', '$ionicPopup', '$ionicModal', '$ionicActionSheet', '$timeout', '$translate',
        function ($q, $sce, $injector, $rootScope, $state, $filter, CONST, dataUtils, jsUtils, EventsService, PostsService, GuiUtilsService, PushService, UsersService, InfoService, CommentsService, $ionicLoading, $ionicPopup, $ionicModal, $ionicActionSheet, $timeout, $translate) {
          var fs = {};
          var observerCallbacks = {};
          var feedListeners =[];

          /*Functions used by controllers to register callback functions.
           * These callbacks will be managing special notifications (events)
           * sent by the Feed Service*/
          fs.registerObserverCallback = function (event, callback) {
            if (!observerCallbacks[event]) {
              observerCallbacks[event] = [];
            }
            observerCallbacks[event].push(callback);
          }

          /*Function used to notify callbacks*/
          var notifyObservers = function (event, params) {
            if (observerCallbacks[event]) {
              angular.forEach(observerCallbacks[event], function (callBack) {
                callBack(params);
              });
            }
          };

          var resetFeedListeners = function(){
            angular.forEach(feedListeners, function (listernDeregistrationFunction) {
              listernDeregistrationFunction();
            });
          };

          fs.initFeed = function ($scope) {
            /*Used to simulate a local scope for the service...
             * In this scope modals will be attached/detached */
            fs.scope = $scope;
            resetFeedListeners();
            /*If a new post is created, then destroy the EditPost Modal.
            The returned object from $on function is a deregistration function
            which is pushed in scope listerners so that it can be called when the feed
            service is reset*/
            feedListeners.push(fs.scope.$on('newPostCreated',function($event,post){
              /*
               Unshift the new post ONLY if some posts have been fetched in the feed
               otherwise skip it. It will be fetched with the first page
               */
              /*if (fs.scope.feed.status.totalPages >= 0){
                fs.scope.feed.data.unshift(post);
              }*/
              if (fs.scope.editPostModal){
                fs.scope.editPostModal.remove();
              }
              if (dataUtils.isInArray(fs.scope.feed.cfg.ntfAction,['reply','checkIn'])) {
                PushService.setNotificationProcessed(fs.scope.feed.cfg.ntfKey,CONST.NOTIFICATIONS_KEY);
              }
              if (dataUtils.isInArray(fs.scope.feed.cfg.ntfAction,['lbsReply'])) {
                var LbsService = $injector.get('LbsManager');
                LbsService.setScenarioActionCompleted(fs.scope.feed.cfg.ntfKey);
              }
              notifyObservers('reloadFeed');
            }));

            //If a post is updated, then: a) update the post in the feed, b) destroy the EditPost Modal
            feedListeners.push(fs.scope.$on('postUpdated',function($event,post){
              var idx = _.findIndex(fs.scope.feed.data, {id: post.id});
              //remove post from feed and add it again. This ensures that the view is refreshed
              fs.scope.feed.data.splice(idx,1);
              if (!(fs.scope.feed.cfg.state==='app.event' && post.eventId !== fs.scope.feed.cfg.filters.eventId)) {
                //Add it again if still matches the applied event filter (if any)
                fs.scope.feed.data.splice(idx,0,post);
              }
              console.log("Post in feed:");
              console.log(post);
              if (fs.scope.editPostModal) {
                fs.scope.editPostModal.remove();
              }

            }));

            /*If a the user transitioned to Login State, then hide the CreatePost Modal
             * in order to allow him/her to do the Login Process */
            feedListeners.push(fs.scope.$on('onLoginState',function(event){
              if (fs.scope.editPostModal && fs.scope.editPostModal.isShown()){
                fs.scope.editPostModal.hide();
              }
            }));

            /*If a the user logged In and it was creating a Post, then restore the CreatePost Modal
             * in order to allow him/her to do the Post */
            feedListeners.push(fs.scope.$on('userLoggedIn',function(event){
              if (fs.scope.editPostModal){
                fs.scope.editPostModal.show();
              }
            }));

            fs.scope.closeCreatePostModal = function() {
              if (fs.scope.editPostModal) {
                fs.scope.editPostModal.remove();
              }
            };

            return {
              data: [],
              cfg: {state:$state.current.name},
              status: {
                totalPages: undefined,
                canLoadMore: true,
                currentPage: 0
              },
              resetStatus: function () {
                this.status = {
                  totalPages: undefined,
                  canLoadMore: true,
                  currentPage: 0
                };
                this.data = [];
              },
              configure: function (filters, userId, userIssuer) {
                this.cfg = {
                  state:$state.current.name,
                  filters: filters,
                  currentUserId: userId,
                  currentUserIssuer: userIssuer
                }
              }
            }

          };

          fs.configurePostEditor = function (feed,post){

            /*This params will be passed to showLogin function in order to be able to come back after login.*/
            fs.scope.postEditorParams = {
              state:feed.cfg.state,
              params: {
                eventId: (feed.cfg.filters)? feed.cfg.filters.eventId : undefined,
                ntfAction: feed.cfg.ntfAction,
                ntfKey: feed.cfg.ntfKey,
                ntfHashTag: feed.cfg.ntfHashTag
              },
              postId:post?post.id : undefined
            };


            $ionicModal.fromTemplateUrl('templates/partials/edit-post.html', {
              scope:fs.scope,
              animation: 'slide-in-up'
            }).then(function(modal) {
              fs.scope.editPostModal = modal;
              fs.scope.editPostModal.show();
            });
          }

          /*Function used to populate feed with posts page by page*/
          fs.loadMorePosts = function (feed) {
            /*$ionicLoading.show(CONST.LOADER_CFG);*/
            feed.status.currentPage++;
            console.log('Loading page ' + feed.status.currentPage + '/ ' + feed.status.totalPages);
            if (feed.cfg.filters) {
              console.log('filtering by:');
              console.log(feed.cfg.filters);
            }

            PostsService.getPosts(feed.status.currentPage, feed.cfg.filters)
              .then(function (res) {
                feed.status.totalPages = res.pages;
                feed.data = feed.data.concat(res.data);
                feed.status.appliedFilters = [];
                /*Set the Feed Title if Filtered*/
                angular.forEach(feed.cfg.filters, function (value, key) {
                  if (key === 'eventId') {
                    var evtTitle = EventsService.getEvent(value).title;
                    feed.status.appliedFilters.push({key: key, title: evtTitle});
                  } else if (key !== 'authorId') {
                    feed.status.appliedFilters.push({key: key, title: value});
                  } else if (feed.data.length > 0) {
                    feed.status.appliedFilters.push({key: key, title: (res.data[0]).author.name});
                  }
                });
                feed.status.canLoadMore = feed.status.totalPages > feed.status.currentPage ? true : false;
                /*$ionicLoading.hide();*/
                notifyObservers('feedPageLoaded');
              }, function () {
                feed.status.canLoadMore = false;
                console.log('Error while loading Posts');
              });
          };

          /*Function used to show the menu for managing a post*/
          fs.managePost = function (post, idx, feed) {
            var buttonsArray = [];
            var deleteTxt;
            if (post.mediaUrl && post.mediaUrl!='') {
              buttonsArray.push({
                id: 'dl',
                text: $translate.instant("Download") + '<i class="icon ion-android-download"></i>'
              });
            }

            if (feed.cfg.currentUserId === post.author.id) {
              deleteTxt = $translate.instant("DELETE") + '<i class="icon ion-android-delete"></i>';
              buttonsArray.push({
                id: 'ep',
                text: $translate.instant("EDIT") + '<i class="icon ion-edit"></i>'
              });
            } else {
              buttonsArray.push({
                id: 'ra',
                text: $translate.instant("REPORT_ABUSE") + '<i class="icon ion-android-warning"></i>'
              });
              buttonsArray.push({
                id: 'bu',
                text: $translate.instant("BLOCK_USER") + '<i class="icon ion-close-circled"></i>'
              });
            }
            /*buttonsArray.push({
              id: 'sp',
              text: $translate.instant("SHARE_TO_FB") + '<i class="icon ion-social-facebook"></i>'
            });*/
            $ionicActionSheet.show({
              buttons: buttonsArray,
              destructiveText: deleteTxt,
              cancelText: $translate.instant("CANCEL"),
              cancel: function () {
                console.log('CANCELLED');
              },
              buttonClicked: function (index) {
                var btn = buttonsArray[index];
                switch (btn.id) {
                  case 'ra':
                    console.log('Report Abuse clicked...');
                    fs.showReportAbuseModal(post);
                    break;
                  case 'bu':
                    console.log('Block User clicked...');
                    fs.blockAuthor(post);
                    break;
                  /*case 'sp':
                    console.log('Share Post clicked...');
                    fs.scope.PostsService.sharePost2FB(post);
                    break;*/
                  case 'ep':
                    console.log('Edit Post clicked...');
                    fs.configurePostEditor(feed,post);
                    break;
                  case 'dl':
                    console.log('Download Post Media clicked');
                    fs.downloadPostMedia(post);
                }
                return true;
              },
              destructiveButtonClicked: function () {
                //Confirm deletion
                var confirmPopup = $ionicPopup.confirm({
                  title: $translate.instant("CONFIRMATION"),
                  template: $translate.instant("CONFIRM_DELETE"),
                  cssClass: 'cnextPop'
                });
                confirmPopup.then(function (res) {
                  if (res) {
                    PostsService.deletePost(post.id, post.eventId).then(function (response) {
                      CommentsService.removeCommentsOfPost(post.id);
                      feed.data.splice(idx, 1);
                    }, function (error) {
                      console.log(error);
                      $ionicPopup.alert({
                        title: $translate.instant("OOOPS"),
                        template: $translate.instant("SOMETHING_WRONG") + '<br/>' + $translate.instant("MESSAGE") + ': ' + error,
                        cssClass: 'cnextPop'
                      });
                    });
                  }
                });
                return true;
              }
            });
          };

          /*Function used to navigate user to the post state*/
          fs.showPost = function (postId, eventId, forComment) {
            $state.go('app.post', {postId: postId, eventId: eventId, forComment: forComment});
          };

          /*Function used to show the Report Abuse Form (Modal)*/
          fs.showReportAbuseModal = function (post) {
            console.log('On Report Post from Wall');
            fs.scope.abuseReport = {postId: post.id, explanation: ''};
            /*Passing references to Service functions so that can be used by the Modal window*/
            fs.scope.closeReportAbuseModal = fs.closeReportAbuseModal;
            fs.scope.reportAbuse = fs.reportAbuse;

            $ionicModal.fromTemplateUrl('templates/partials/report-abuse.html', {
              scope: fs.scope,
              animation: 'slide-in-up'
            }).then(function (modal) {
              fs.scope.reportPostModal = modal;
              fs.scope.reportPostModal.show();
            });
          };

          /*Function used to close the Report Abuse Form (Modal)*/
          fs.closeReportAbuseModal = function () {
            if (fs.scope.reportPostModal) {
              delete fs.scope.abuseReport;
              fs.scope.reportPostModal.remove();
              console.log('FeedService scope:');
              console.log(fs.scope);
            }
          };

          /*Function used to submit the Abuse Report to the server side*/
          fs.reportAbuse = function () {
            $ionicLoading.show(CONST.LOADER_CFG);
            PostsService.reportAbuse(fs.scope.abuseReport).then(
              function (report) {
                $ionicLoading.hide();
                GuiUtilsService.showToastNotification($translate.instant('SENT'),'SHORT');
              }, function (error) {
                $ionicLoading.hide();
                $ionicPopup.alert({
                  title: $translate.instant("OOOPS"),
                  template: $translate.instant("SOMETHING_WRONG") + '<br/>' + $translate.instant("MESSAGE") + ': ' + error,
                  cssClass: 'cnextPop'
                });
              }
            );
            delete fs.scope.abuseReport;
            fs.closeReportAbuseModal();
          };

          /*Functions used to block a user*/
          fs.blockAuthor = function (post) {
            //Confirm deletion
            var confirmPopup = $ionicPopup.confirm({
              title: $translate.instant("CONFIRMATION"),
              template: $translate.instant("CONFIRM_BLOCK", {userName: post.author.name}),
              cssClass: 'cnextPop'
            });
            confirmPopup.then(function (res) {
              if (res) {
                $ionicLoading.show(CONST.LOADER_CFG);
                UsersService.blockUser(post.author.id).then(
                  function (success) {
                    $ionicLoading.hide();
                    GuiUtilsService.showToastNotification($translate.instant("USER_BLOCKED", {userName: post.author.name}),'SHORT');
                    /*Notify callbacks about userBlocked event*/
                    notifyObservers('userBlocked', {userId: post.author.id});
                  }, function (error) {
                    $ionicLoading.hide();
                    $ionicPopup.alert({
                      title: $translate.instant("OOOPS"),
                      template: $translate.instant("SOMETHING_WRONG") + '<br/>' + $translate.instant("MESSAGE") + ': ' + error,
                      cssClass: 'cnextPop'
                    });
                  }
                );
              }
            });
            return true;
          };

          /*Function used to add filters to the FeedService */
          fs.addFeedFilter = function (filter, feed) {
            feed.cfg.filters = feed.cfg.filters || {};
            angular.forEach(filter, function (value, key) {
              feed.cfg.filters[key] = value;
            });
            notifyObservers('reloadFeed');
          };

          fs.removeFilter = function (filter, feed) {
            if (feed.cfg.filters) {
              delete feed.cfg.filters[filter];
              notifyObservers('reloadFeed');
            }
          };

          fs.clearFilters = function (feed) {
            if (feed.cfg.filters.eventId) {
              feed.cfg.filters = {eventId: feed.cfg.filters.eventId};
            } else {
              delete feed.cfg.filters;
            }
            notifyObservers('reloadFeed');
          };

          fs.downloadPostMedia = function(post){
            PostsService.downloadPostMedia(post);
          };

          return fs;
        }]);
}());
