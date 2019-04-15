/**
 * Created by Nektarios Gioldasis on 18/1/2016.
 */

(function () {
  'use strict';

  /*global angular */
  angular.module('cnextApp.postControllers', ['cnextApp.postServices', 'cnextApp.feedService','cnextApp.commentServices','cnextApp.systemServices' , 'tuc.utilities', 'ngCordova'])
    .controller('WallCtlr',['$scope','$rootScope','$state','$translate','$ionicHistory','CONST',
        '$ionicLoading','PostsService','$ionicModal','$timeout','FeedService','$ionicScrollDelegate','$location','$anchorScroll',
        function($scope,$rootScope,$state,$translate,$ionicHistory,CONST,$ionicLoading,PostsService,$ionicModal,$timeout,FeedService,$ionicScrollDelegate,$location,$anchorScroll){

      $scope.fs = FeedService;
      $scope.feed = $scope.fs.initFeed($scope);
      $scope.feed.configure(undefined,cUserId,cUserIssuer);
      $scope.PostsService = PostsService;
      var cUserId = ($scope.user)? $scope.user.id : 0;
      var cUserIssuer = (cUserId > 0) ? $scope.user.issuer : '';
      $scope.feed.configure(undefined,cUserId,cUserIssuer);

      $scope.$on('$ionicView.afterEnter',function(){
        console.log('welcome to the wall');
        $rootScope.$broadcast('loading:hide');
        var elms = document.getElementsByClassName("title title-center header-item");
        for (var i=0;i<elms.length;i++){
          elms[i].style.left="50px";
          elms[i].style.right="70px";
        }
      });

      $scope.doRefresh=function(){
        /*$ionicLoading.show(CONST.LOADER_CFG);*/
        PostsService.reload().then(function(){
          $scope.feed = $scope.fs.initFeed($scope);
          $scope.feed.configure(undefined,cUserId,cUserIssuer);
          $ionicScrollDelegate.resize();
          $timeout(function(){
            $location.hash('feedStart');
            $anchorScroll(true);
            $scope.fs.loadMorePosts($scope.feed);
            $scope.$broadcast('scroll.refreshComplete');
            /*$ionicLoading.hide();*/
          },500);
        },function(error){
          $scope.$broadcast('scroll.refreshComplete');
          /*$ionicLoading.hide();*/
        });
      };

      //Register callback function to refresh wall when a user is blocked
      $scope.fs.registerObserverCallback('userBlocked',$scope.doRefresh);

      //Register callback function to stop infiniteScroll
      $scope.fs.registerObserverCallback('feedPageLoaded',function(){
          $scope.$broadcast('scroll.infiniteScrollComplete');
      });

      /*Register callback function to scroll on top when wall filtering changes*/
      $scope.fs.registerObserverCallback('reloadFeed',function(){
        $scope.feed.resetStatus();
        $ionicScrollDelegate.resize();
        $scope.$broadcast('scroll.infiniteScrollComplete');
      });

      /*register listener to PostsService.reload() event*/
      $scope.$on('posts.reloaded',$scope.doRefresh);

    }])

    .controller('PostCtlr', ['$scope','$sce','$rootScope', '$http', '$stateParams','$translate', 'InfoService', '$timeout','PostsService', 'CommentsService', 'UsersService', '$ionicActionSheet', '$ionicPopup','$ionicModal','$ionicScrollDelegate','$ionicHistory', 'post', 'discussion','$ionicLoading','CONST','GuiUtilsService',
      function ($scope, $sce, $rootScope, $http, $stateParams,$translate, InfoService, $timeout, PostsService, CommentsService, UsersService, $ionicActionSheet, $ionicPopup, $ionicModal, $ionicScrollDelegate,$ionicHistory, post, discussion,$ionicLoading,CONST,GuiUtilsService) {

        $scope.PostsService = PostsService;

        $scope.$on('$ionicView.afterEnter',function(){
          $rootScope.$broadcast('loading:hide');
          var elms = document.getElementsByClassName("title title-center header-item");
          for (var i=0;i<elms.length;i++){
            elms[i].style.left="50px";
            elms[i].style.right="70px";
          }
          $scope.startVideo();
          if ($stateParams.forComment){
            $ionicScrollDelegate.$getByHandle('postScroll').scrollBottom();
            var input = document.getElementById('newCommentTxtArea');
            if (input){
              input.focus();
            }
            if (!$scope.isUserLoggedIn){
              GuiUtilsService.showToastNotification($translate.instant('LOGIN_REQUIRED'),'SHORT');
            }
          }
        });

        $scope.$on('$ionicView.beforeLeave',function() {
          $scope.stopVideo();
        });

        $scope.data = {
          post: post,
          discussion: discussion,
          newCommentTxt: ''
        };
        $scope.loginParams = {
          state:'app.post',
          params:{postId:post.id}
        };

        $scope.doRefresh=function(){
          CommentsService.reload(post.id).then(function(comments){
            $scope.data.discussion=comments;
            //$scope.startVideo();
          },function(error){

          });
          $scope.$broadcast('scroll.refreshComplete');
        };

        $scope.startVideo = function(){
          if ($scope.data.post && $scope.data.post.type==='vid'){
            var postVid = document.getElementById('postVideoPlayer');
            postVid.src=$scope.data.post.mediaUrl;
            postVid.load();
            postVid.play();
          }
        };

        $scope.stopVideo = function(){
          if ($scope.data.post && $scope.data.post.type==='vid'){
            var postVid = document.getElementById('postVideoPlayer');
            if (postVid) {
              postVid.pause();
            }
          }
        }

        $scope.manageComment = function (comment, idx) {
          console.log('Managing comments...');
          var user = UsersService.getCurrentUser();
          var delText;
          var buttonsArray=[];

          if (user && user.id === comment.author.id) {
            delText= $translate.instant("DELETE")+'<i class="icon ion-android-delete"></i>';
          }else{
            buttonsArray.push({text:$translate.instant("REPORT_ABUSE") + '<i class="icon ion-android-warning"></i>'});
            buttonsArray.push({text:$translate.instant("BLOCK_USER") + '<i class="icon ion-close-circled"></i>'});
          }
          $ionicActionSheet.show({
            destructiveText: delText,
            cancelText: $translate.instant("CANCEL"),
            cancel: function () {
              console.log('CANCELLED');
            },
            buttons:buttonsArray,
            destructiveButtonClicked: function () {
              //Confirm deletion
              var confirmPopup = $ionicPopup.confirm({
                title: $translate.instant("CONFIRMATION"),
                template: $translate.instant("CONFIRM_DELETE"),
                cssClass:'cnextPop'
              });
              confirmPopup.then(function (res) {
                if (res) {
                  CommentsService.deleteComment(comment.id, $scope.data.post.id).then(function (response) {
                    //response.success is true for sure
                    $scope.data.discussion.splice(idx, 1);
                    $scope.data.post.numOfComments--;
                  }, function (error) {
                    console.log(error);
                    $ionicPopup.alert({
                      title: $translate.instant("OOOPS"),
                      template: $translate.instant("SOMETHING_WRONG")+'<br/>'+ $translate.instant("MESSAGE")+': ' + error,
                      cssClass:'cnextPop'
                    });
                  });
                }
              });
              return true;
            },
            buttonClicked: function (index) {
              console.log('BUTTON CLICKED', index);
              switch (index) {
                case 0:
                  console.log('Reporting comment abuse');
                  $scope.showReportAbuseModal(comment);
                  break;
                case 1:
                  $scope.blockAuthor(comment);
                  break;
              }
              return true;
            },
          });
        };

        $scope.showReportAbuseModal = function(comment){
          console.log('On Report Post from Wall');
          $scope.abuseReport={commentId:comment.id,explanation:''};
          $ionicModal.fromTemplateUrl('templates/partials/report-abuse.html', {
            scope:$scope,
            animation: 'slide-in-up'
          }).then(function(modal) {
            $scope.reportCommentModal = modal;
            $scope.reportCommentModal.show();
          });
        };

        $scope.closeReportAbuseModal = function() {
          if ($scope.reportCommentModal) {
            delete $scope.abuseReport;
            $scope.reportCommentModal.remove();
          }
        };

        $scope.reportAbuse = function() {
          $ionicLoading.show(CONST.LOADER_CFG);
          CommentsService.reportAbuse($scope.abuseReport).then(
            function(report){
              $ionicLoading.hide();
              GuiUtilsService.showToastNotification($translate.instant('SENT'),'SHORT');
            },function(error){
              $ionicLoading.hide();
              $ionicPopup.alert({
                title: $translate.instant("OOOPS"),
                template: $translate.instant("SOMETHING_WRONG")+'<br/>'+$translate.instant("MESSAGE")+': ' + error,
                cssClass:'cnextPop'
              });
            }
          );
          //In any case, delete the abuseReport...
          delete $scope.abuseReport;
          $scope.closeReportAbuseModal();
        };

        $scope.blockAuthor = function(comment) {
          //Confirm deletion
          var confirmPopup = $ionicPopup.confirm({
            title: $translate.instant("CONFIRMATION"),
            template: $translate.instant("CONFIRM_BLOCK",{userName:comment.author.name}),
            cssClass:'cnextPop'
          });
          confirmPopup.then(function (res) {
            if (res) {
              $ionicLoading.show(CONST.LOADER_CFG);
              UsersService.blockUser(comment.author.id).then(
                function(success){
                  $ionicLoading.hide();
                  GuiUtilsService.showToastNotification($translate.instant("USER_BLOCKED", {userName: comment.author.name}),'LONG');
                  PostsService.reload().then(function(){
                    if ($scope.data.post.author.id===comment.author.id){
                      $ionicHistory.goBack();
                    }else {
                      $scope.doRefresh();
                    }
                  });
                },function(error){
                  $ionicLoading.hide();
                  $ionicPopup.alert({
                    title: $translate.instant("OOOPS"),
                    template: $translate.instant("SOMETHING_WRONG")+'<br/>'+$translate.instant("MESSAGE")+': ' + error,
                    cssClass:'cnextPop'
                  });
                }
              );
            }
          });
          return true;
        };

        $scope.doComment = function () {
          console.log('Adding Comment..');
          if ($scope.data.newCommentTxt && $scope.data.newCommentTxt !== '') {
            var user = UsersService.getCurrentUser();
            var newComment = {
              caption: $scope.data.newCommentTxt,
              postId: $scope.data.post.id,
              author: {id: user.id, email: user.email, accessToken: user.accessToken}
            };
            CommentsService.saveComment(newComment)
              .then(function (comment) {
                $scope.data.discussion.push(comment);
                $scope.data.post.numOfComments++;
                $scope.data.newCommentTxt = '';
              }, function (error) {
                console.log(error);
                $ionicPopup.alert({
                  title: $translate.instant("OOOPS"),
                  template: $translate.instant("SOMETHING_WRONG")+'<br/>'+ $translate.instant("MESSAGE")+': ' + error,
                  cssClass:'cnextPop'
                });
              });
          }
        };

        $scope.doRefresh();

        $scope.showLikesViewer = function (post){
          console.log('View Post likes from Wall');
          PostsService.getPostLikes(post).then(function(likes){
            $scope.postLikes=likes;
          },function(error){
            $scope.postLikes=[];
          });
          $ionicModal.fromTemplateUrl('templates/partials/likes-viewer.html', {
            scope:$scope,
            animation: 'slide-in-up'
          }).then(function(modal) {
            $scope.likesViewer = modal;
            $scope.likesViewer.show();
          });
        };

        $scope.closeLikesViewer = function (post){
          if ($scope.likesViewer) {
            delete $scope.postLikes;
            $scope.likesViewer.remove();
          }
        };

      }])

    .controller('NewPostCtlr', ['$scope','$sce','$rootScope', '$translate','$ionicActionSheet', 'InfoService', 'PostsService','jsUtils', 'htmlUtils', 'ImageService', 'UsersService',
      '$ionicLoading', '$ionicPopup', '$timeout', 'CONST','EventsService','orderByFilter', '$ionicModal','GuiUtilsService',
      function ($scope, $sce,$rootScope, $translate, $ionicActionSheet, InfoService, PostsService, jsUtils, htmlUtils, ImageService, UsersService, $ionicLoading, $ionicPopup, $timeout, CONST,EventsService,orderByFilter,$ionicModal,GuiUtilsService) {
        $scope.htmlUtils = htmlUtils;
        $scope.forceSelectEvent=false;
        $scope.editorMode = $scope.postEditorParams.postId? 'EDIT_POST' : 'NEW_POST';

        if ($scope.editorMode==='EDIT_POST'){
          $scope.newPost = {};
          $scope.oldPost = PostsService.getPost($scope.postEditorParams.postId);
          angular.copy($scope.oldPost ,$scope.newPost);
          $scope.newPost.caption=jsUtils.htmlToPlain($scope.newPost.caption);
        }else{
          $scope.newPost = {caption: '', mediaUrl:'', eventId:'', type:'txt'};
        }

        $scope.getVideoSrc = function(){
          return $sce.trustAsResourceUrl($scope.newPost.mediaUrl);
        };

        $scope.isPristinePost = function(){
          var newPost = {};
          angular.copy($scope.newPost,newPost);
          newPost.caption = jsUtils.plainToHtml(newPost.caption);
          return angular.equals($scope.oldPost,newPost);
        };

        $scope.findMostRelativeEvent = function(){
          var event = EventsService.getHappeningNowEvent();
          if (event!==undefined) {
            console.log('Most Relative Event is happening now...');
            return event;
          }

          var closest = EventsService.getClosestEvent(true);
          event = EventsService.getEvent(closest.evtId);
          if (event!==undefined){
            console.log('Most Relative Event is ' + closest.days + ' days far...');
            return event;
          }

          // No Event is happening right now...
          // Try to find the latest past event (within a month)
          event = EventsService.getLatestPastEvent([1,'months']);
          if (event!==undefined){
            console.log('Most Relative Event is the latest past event (in the last month)...');
            return event;
          }

          // No Event is happening right now...and no event ended during the last month
          // Try to find the the soonest upcoming event (within a month)
          event = EventsService.getUpcomingEvents([1,'months']);
          if (event.length>0){
            console.log('Most Relative Event is the first upcoming event (in the next month)...');
            event = event[0];
            return event;
          }

          // No Event is happening right now, no event ended during the last month,
          // and no event is starting during the next month
          // Try to find the latest event (from the beginning of time)

          event = EventsService.getLatestPastEvent();
          if (event!==undefined){
            console.log('Most Relative Event is the latest past event...');
            return event;
          }
          // No Event is happening right now, there are no past events at all,
          // and no event is starting during the next month,
          // Try to find the soonest event (whenever it starts)
          event = EventsService.getUpcomingEvents();
          if (event.length>0){
            console.log('Most Relative Event is the first upcoming event (after a month)...');
            event = event[0];
            return event;
          }else{
            console.log('There are no events to Choose From...');
          }
          return undefined;
        };

        /*Associate the new post with an event. If feedis filtered by eventId, then this is the event.
        * Otherwise, find the most relative event to associate with*/
        if ($scope.editorMode==='NEW_POST') {
          if (!($scope.feed.cfg.filters && $scope.feed.cfg.filters.eventId)) {
            $scope.selectedEvent = $scope.findMostRelativeEvent();
            $scope.newPost.eventId = $scope.selectedEvent.id;
            $scope.forceSelectEvent = true;
          } else {
            $scope.newPost.eventId = $scope.feed.cfg.filters.eventId;
            $scope.selectedEvent = EventsService.getEvent($scope.feed.cfg.eventId);
          }

          //Check if the Post creation is done on reply to some Push Notification
          if ($scope.feed.cfg.ntfAction && $scope.feed.cfg.ntfAction.toLowerCase().endsWith('reply')) {
            $scope.newPost.hashtag = $scope.feed.cfg.ntfHashTag;
          }
        }else{
          $scope.forceSelectEvent = true;
          $scope.selectedEvent=EventsService.getEvent($scope.newPost.eventId);
        }

        /*Notify that Login is required*/
        if (!$scope.isUserLoggedIn){
          GuiUtilsService.showToastNotification($translate.instant('LOGIN_REQUIRED'),'SHORT');
        }


        $scope.showEventSelectionMenu = function() {
          $ionicModal.fromTemplateUrl('templates/partials/select-event.html', {
            scope:$scope,
            animation: 'slide-in-up'
          }).then(function(modal) {
            $scope.selectEventModal = modal;
            $scope.selectEventModal.show();
          });
        };

        $scope.closeEventSelectionMenu = function(){
          $scope.selectEventModal.remove();
          console.log('EventSelectionMenu Closed: SearchFilter='+$scope.search+
            ', SelectedEvent='+$scope.selectedEvent.title +
            ', NewPost.eventId='+$scope.newPost.eventId);
        };

        $scope.selectEvent = function(event){
          $scope.selectedEvent=event;
          $scope.newPost.eventId=$scope.selectedEvent.id;
          $scope.closeEventSelectionMenu();
        };


        //function to Open ActionSheet
        $scope.showPhotoSelector = function (mediaType) {
          var mediaSrcs = [];
          /*if (mediaType==='PHOTO'){
            mediaSrcs.push({id:'new', text: $translate.instant("NEW_"+mediaType)});
          }*/
          mediaSrcs.push({id:'new', text: $translate.instant("NEW_"+mediaType)});
          mediaSrcs.push({id:'gallery', text: $translate.instant("GALLERY_"+mediaType)});
          $scope.photoSrcSelector = $ionicActionSheet.show({
            buttons: mediaSrcs,
            titleText: $translate.instant(mediaType),
            cancelText: $translate.instant("CANCEL"),
            buttonClicked: function (index) {
              $scope.addMediaToPost(mediaSrcs[index].id,mediaType);
              return true;
            }
          });
        };

        $scope.addMediaToPost = function (source,mediaType) {
          if(source==='new'&& mediaType==='VIDEO'){
            ImageService.captureVideo().then(function(videoPath){
              console.log('captured video at: ' + videoPath);
              $scope.newPost.mediaUrl = videoPath;
              $scope.newPost.type='vid';
            },function(error){
              console.log('Error: ' + error)
            });
          }else {
            ImageService.handleMediaDialog(source, 'post', mediaType).then(function (mediaUrl) {
              $scope.newPost.mediaUrl = mediaUrl;
              $scope.newPost.type = mediaType === 'PHOTO' ? 'img' : 'vid';
            }, function () {
              console.log('error while taking photo...');
            });
          }
        };

        $scope.deleteMediaFromPost = function(){
          $scope.newPost.mediaUrl= ($scope.editorMode==='EDIT_POST' && $scope.oldPost.mediaUrl)? '': undefined;
          $scope.newPost.type='txt';
        };

        $scope.doPost = function () {
          $ionicLoading.show(CONST.LOADER_CFG);
            PostsService.savePost($scope.newPost, function (result) {
              $ionicLoading.hide();
              if($scope.editorMode==='NEW_POST'){
                $rootScope.$broadcast('newPostCreated',result);
              }else{
                $rootScope.$broadcast('postUpdated',result,$scope.oldPost);
              }
              var eventId= $scope.feed.cfg.filters? $scope.feed.cfg.filters.eventId : undefined;
              $scope.newPost = {caption: '', mediaUrl:'', eventId:eventId, type:'txt'};
            }, function (error) {
              console.log(error);
              $ionicLoading.hide();
            });
        };
      }])
    .controller('EventSelectorCtlr',['$scope','EventsService','orderByFilter',function($scope,EventsService,orderByFilter){

      //$scope.allEvents = orderByFilter(EventsService.getAllEventTitles(),'-id');
      $scope.allEvents = orderByFilter(EventsService.getAllEventTitles(), 'startDate', true)

      $scope.search='';
      /*Set searchScope to allEvents*/
      $scope.searchScope={id:'',title:''};

      $scope.clearFilter = function(){
        $scope.search='';
      };

      $scope.setSearchScope=function (scope){
        $scope.searchScope=scope;
        $scope.clearFilter();
      };

    }]);
}());
