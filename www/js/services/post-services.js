/* Created by Nektarios Gioldasis */

(function () {
  'use strict';

  /*global angular */
  angular.module('cnextApp.postServices', [])
    .factory('PostsService',
      ['$http', '$rootScope', '$sce', '$q','$filter', 'CONST', 'dataUtils', 'jsUtils', '$cordovaFileTransfer', 'UsersService','NetworkService', 'InfoService', '$ionicPopup','$ionicModal', '$timeout', '$translate','GuiUtilsService',
        function ($http, $rootScope, $sce, $q, $filter, CONST, dataUtils, jsUtils, $cordovaFileTransfer, UsersService, NetworkService, InfoService, $ionicPopup,$ionicModal, $timeout, $translate,GuiUtilsService) {
          var postsFac = {};
          var posts;
          var isDownSuccessClbkSet=false;
          var isDownErrorClbkSet = false;

          /*Function used to load posts data from the server */
          postsFac.fetchPosts = function (eventId, page) {
            var appId = InfoService.get(CONST.APP_ID_KEY) || 'ALL';
            var apiParams = {uuid: appId};
            var userId = UsersService.getCurrentUserId();
            if (userId > 0) {
              apiParams.userId = userId;
            }
            var deferred = $q.defer();
            console.log('Posts Requested from Server...');
            $http.get(CONST.REST_API_URL + '/posts', {params: apiParams, timeout: CONST.NETWORK_TIMEOUT})
              .then(
                function (res) { // success network op
                  var apiResponse = res.data;
                  if (apiResponse.success) {
                    posts = apiResponse.data;
                    console.log('Posts Fetched from Server...');
                    if (eventId) {
                      var eventPosts = _.filter(posts, function (post) {
                        return post.eventId == eventId
                      });
                      deferred.resolve({
                        data: dataUtils.getDataByPage(eventPosts, CONST.DATA_PAGE_SIZE, page),
                        pages: getNumOfPages(eventPosts)
                      });
                    } else {
                      deferred.resolve({
                        data: dataUtils.getDataByPage(posts, CONST.DATA_PAGE_SIZE, page),
                        pages: getNumOfPages(posts)
                      });
                    }
                  } else {
                    console.log('PostsService http request returned success:false');
                    deferred.reject();
                  }
                },
                function (res) { // error handling
                  console.log('PostsService http request rejected!!!');
                  deferred.reject(res);
                }
              );
            return deferred.promise;
          };

          var matchFilter = function (post, filter, value) {
            if (filter==='hashtag'){
              return post.hashtag === value || post.caption.includes(value);
            }else if (filter==='authorId') {
              return post.author.id===value;
            }else{
                return post[filter]===value;
            }
          };

          var filterPosts = function(page, filters){
            page = page || 1;
              var filteredPosts = _.filter(posts, function (post) {
                var match = true;
                angular.forEach(filters,function(value,filter){
                  match = match && matchFilter(post, filter,value);
                });
                return match;
              });
              if (filteredPosts) {
                return {
                  data: dataUtils.getDataByPage(filteredPosts, CONST.DATA_PAGE_SIZE, page),
                  pages: getNumOfPages(filteredPosts)
                }
              }else{
                return {data:[],pages:0};
              }
          }

          /*Function that calculates the number of pages over a table of posts*/
          var getNumOfPages = function (table) {
            if (!table) {
              return 0;
            }
            return Math.ceil(table.length / CONST.DATA_PAGE_SIZE);
          };

          /*Function used to get Posts by page filtered by some criterion*/
          postsFac.getPosts = function (page, filters) {
            var deferred = $q.defer();
            if(posts) {
              deferred.resolve(filterPosts(page,filters));
            }else{
              postsFac.fetchPosts().then(function(){
                deferred.resolve(filterPosts(page, filters));
              },function(error){
                deferred.reject(error);
              });
            }
            return deferred.promise;
          };

          var updatePostInTable = function(table, post){
            if (!table){
              table=[];
            }
            var idx = _.findIndex(table, {id: post.id});
            if (idx >= 0) {
              table[idx] = post;
              console.log('post updated in PostsService table');
            } else {
              console.log('Warning: Updated post, could not be found in feed');
            }
          }

          /*Function used to submit a post that has no media file associated with it*/
          var uploadTextPost = function (post, successClbck, failureClbck) {
            var fd = new FormData();

            fd.append('eventId', post.eventId);
            fd.append('caption', jsUtils.plainToHtml(post.caption));
            if (post.hashtag && post.hashtag != '') {
              fd.append('hashtag', post.hashtag);
            }
            fd.append('creatorId', post.author.id);
            fd.append('creatorName', post.author.name);
            fd.append('email', UsersService.getCurrentUser().email);
            fd.append('accessToken', UsersService.getCurrentUser().accessToken);
            fd.append('type', post.type);
            var httpMethod = post.id? 'PUT': 'POST';
            var httpUrl = post.id? CONST.REST_API_URL + '/posts/'+post.id : CONST.REST_API_URL + '/posts';
            $http({
              method:httpMethod,
              url:httpUrl,
              data:fd,
              transformRequest: angular.identity,
              headers: {'Content-Type': undefined}
            }).then(function (response) {
              if (response.status===200){
                if (response.data.success){
                  var post = response.data.data;
                  if (httpMethod==='PUT'){
                    updatePostInTable(posts,post);
                  }else{
                    postsFac.addPost(post);
                  }
                  successClbck(post);
                    GuiUtilsService.showToastNotification($translate.instant("PUBLISHED"),'SHORT');
                }else{
                  $ionicPopup.alert({
                    title: $translate.instant("OOOPS"),
                    template: $translate.instant("SOMETHING_WRONG")+'<br/>'+$translate.instant("MESSAGE")+': ' + response.data.data.message,
                    cssClass:'cnextPop'
                  });
                  failureClbck(response.data.message);
                }
              }else{
                $ionicPopup.alert({
                  title: $translate.instant("OOOPS"),
                  template: $translate.instant("SOMETHING_WRONG")+'<br/>'+$translate.instant("MESSAGE: Error in request processing..."),
                  cssClass:'cnextPop'
                });
                failureClbck(response.statusText);
              }
            }, function (error) {
              $ionicPopup.alert({
                title: $translate.instant("OOOPS"),
                template: $translate.instant("SOMETHING_WRONG")+'<br/>'+$translate.instant("MESSAGE: Communication Error"),
                cssClass:'cnextPop'
              });
              failureClbck(error.statusText);
            });
          };

          /*Function used to submit a post that has a media file associated with it*/
          var uploadMediaPost = function (post, successClbck, failureClbck) {
            var options = new FileUploadOptions();
            options.httpMethod = post.id? "PUT" : "POST";
            options.fileKey = "file";
            options.fileName = post.mediaUrl.split("/").pop();
            options.mimeType = "image/jpeg";
            options.chunkedMode = false;
            options.headers = {connection: "close"};

            var ftSuccessClbck = function (r) {
              var response;
              response = JSON.parse(r.response);
              if (response.success) {
                if (options.httpMethod==='PUT'){
                  updatePostInTable(posts,response.data);
                }else{
                  postsFac.addPost(response.data);
                }
                GuiUtilsService.showToastNotification($translate.instant('PUBLISHED'),'SHORT');
                successClbck(response.data);
              }else{
                $ionicPopup.alert({
                  title: $translate.instant("OOOPS"),
                  template: $translate.instant("SOMETHING_WRONG")+'<br/>'+$translate.instant("MESSAGE:") + response.data.message,
                  cssClass:'cnextPop'
                });
                failureClbck(response.data.message);
              }
              window.resolveLocalFileSystemURL(post.mediaUrl, function(file) {
                file.remove(function(){
                  console.log(post.mediaUrl + " deleted");
                },function () {
                  console.log('Could not delete file: ' + post.mediaUrl)
                });
              }, function () {
                console.log('Could not resolve mediaUrl: ' + post.mediaUrl)
              });



            };

            var ftFailureClbck = function (error) {
              console.log("An error has occurred: Code = " + error.code);
              console.log("upload error source " + error.source);
              console.log("upload error target " + error.target);
              $ionicPopup.alert({
                title: $translate.instant("OOOPS"),
                template: $translate.instant("SOMETHING_WRONG")+'<br/>'+$translate.instant("MESSAGE: Communication Error"),
                cssClass:'cnextPop'
              });
              failureClbck(error);
            };

            var postData = {
              eventId: post.eventId,
              caption: jsUtils.plainToHtml(post.caption),
              creatorId: post.author.id,
              creatorName: post.author.name,
              email: UsersService.getCurrentUser().email,
              accessToken: UsersService.getCurrentUser().accessToken,
              lat: post.lat,
              lon: post.lon,
              type: post.type
            };

            if (post.hashtag) {
              postData.hashtag = post.hashtag;
            }
            options.params = postData;

            var httpUrl = post.id? CONST.REST_API_URL + '/posts/'+post.id : CONST.REST_API_URL + '/posts';

            var uploader = new FileTransfer();
            uploader.upload(post.mediaUrl, encodeURI(httpUrl), ftSuccessClbck, ftFailureClbck, options, true);
          };

          //Function getPost(assumes that posts are available)
          postsFac.getPost = function (postId) {
            return _.find(posts, {id: postId}) || {};
          };

          //function used to update local postsData when a new post has been created on the server-side
          postsFac.addPost = function (post) {
            if (posts) {
              posts.unshift(post);
            } else {
              posts = [];
              posts.push(post);
            }
            console.log('post inserted in PostsService table');
          };

          /*Function used by controllers to save a post (i.e. to upload a post)*/
          postsFac.savePost = function (post, successClbck, failureClbck) {
            if(post.caption === '' && post.mediaUrl === ''){
              GuiUtilsService.showToastNotification($translate.instant('NOTHING_TO_POST'),'LONG');
              failureClbck('Nothing to Post');
              return;
            }
            var user = UsersService.getCurrentUser();
            if (!post.id) {
              post.author = {
                name: user.name,
                'id': user.id
              };
            }
            if ($cordovaFileTransfer && post.mediaUrl && post.mediaUrl !== '' && !post.mediaUrl.startsWith(CONST.BACKEND_URL)) {
              uploadMediaPost(post, successClbck, failureClbck);
            } else {
              uploadTextPost(post, successClbck, failureClbck);
            }
          };

          /*Function used by controllers to delete a post*/
          postsFac.deletePost = function (postId, eventId) {
            var deferred = $q.defer();
            var user = UsersService.getCurrentUser();
            $http({
              url: CONST.REST_API_URL + '/posts/' + postId,
              timeout: CONST.NETWORK_TIMEOUT,
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json'
              },
              data: {email: user.email, accessToken: user.accessToken}
            }).then(function (response) {
              if (response.data.success) {
                deferred.resolve(response.data);
                //Remove post from local data
                posts.splice(_.findIndex(posts, {id: postId}), 1);
              } else {
                deferred.reject(response.data);
              }
            }, function (error) {
              console.log(error);
              deferred.reject(error);
            });
            return deferred.promise;
          };

          /*Function used to submit an abuse report about some post */
          postsFac.reportAbuse = function (report) {
            var deferred = $q.defer();
            $http({
              url: CONST.REST_API_URL + '/posts/abuses',
              /*timeout:CONST.NETWORK_TIMEOUT,*/
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              data: {
                postId: report.postId,
                text: report.explanation,
                creatorUuid: InfoService.get(CONST.APP_ID_KEY)
              }
            }).then(function (response) {
              var httpResponse = response.data;
              if (httpResponse.success) {
                deferred.resolve(httpResponse.data);
              } else {
                deferred.reject(httpResponse.data.message);
              }
            }, function (error) {
              deferred.reject("Access Denied!");
            });
            return deferred.promise;
          };

          /*Function used to reload Service Data*/
          postsFac.reload = function () {
            return postsFac.fetchPosts(undefined,1);
          }

          /*Function used to share a post to FB*/
          postsFac.sharePost2FB = function (post) {
            var options = {
              method: "feed",
              href: CONST.REST_API_URL + '/posts/' + post.id,
              share_feedWeb: true,
            };
            if (InfoService.is(CONST.ON_DEVICE)) {
              facebookConnectPlugin.showDialog(options, function (response) {
                if (!(Object.keys(response).length === 0 && response.constructor === Object)) { //check if response is an empty object
                  var msg = $ionicPopup.show({
                    template: $translate.instant("OK"),
                    cssClass: 'popUpNoTitle'
                  });
                  $timeout(function () {
                    msg.close();
                  }, 1000);
                }
              }, function (error) {
                console.log('FBShare Error:');
                console.log(error);
                if (typeof error === 'object' && error.errorCode !== '4201') {
                  $ionicPopup.alert({
                    title: $translate.instant("OOOPS"),
                    template: $translate.instant("SOMETHING_WRONG") + '<br/>' + $translate.instant("MESSAGE") + ': ' + error.errorMessage,
                    cssClass: 'cnextPop'
                  });
                }
              });
            } else {
              $ionicPopup.alert({
                title: $translate.instant("OOOPS"),
                template: $translate.instant("SOMETHING_WRONG") + '<br/>' + $translate.instant("MESSAGE") + ': Available on devices only...',
                cssClass: 'cnextPop'
              });
            }
          };

          /*Function used to get the Likes of a post*/
          postsFac.getPostLikes = function(post){
            var appId = InfoService.get(CONST.APP_ID_KEY) || 'ALL';
            var apiParams = {uuid: appId};
            var userId = UsersService.getCurrentUserId();
            if (userId > 0) {
              apiParams.userId = userId;
            }
            var deferred = $q.defer();
            $http.get(CONST.REST_API_URL + '/posts/'+post.id+'/likes', {params: apiParams, timeout: CONST.NETWORK_TIMEOUT})
              .then(
                function (res) { // success network op
                  var apiResponse = res.data;
                  if (apiResponse.success) {
                    deferred.resolve(apiResponse.data);
                  } else {
                    deferred.reject(apiResponse.data.message);
                  }
                },
                function (res) { // error handling
                  deferred.reject(res.data);
                }
              );
            return deferred.promise;
          };

          /*Function used to submit a Like*/
          var likePost = function(post,user,btn){
            if (btn){btn.disabled = !btn.disabled;}
            $http({
              url: CONST.REST_API_URL + '/posts/' + post.id + '/likes',
              timeout: CONST.NETWORK_TIMEOUT,
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              data: {userId:user.id, userEmail: user.email, accessToken: user.accessToken}
            }).then(function (response) {
              var result = response.data;
              if (result.success) {
                post.likeId=result.data.id;
                post.numOfLikes++;
              } else {
                $ionicPopup.alert({
                  title: $translate.instant("OOOPS"),
                  template: $translate.instant("SOMETHING_WRONG") + '<br/>' + $translate.instant("MESSAGE") + ': '+ result.data.message,
                  cssClass: 'cnextPop'
                });
              }
              if (btn){btn.disabled = !btn.disabled;}
            }, function (error) {
              var msg = error.data || 'Network Request Failed';
              $ionicPopup.alert({
                title: $translate.instant("OOOPS"),
                template: $translate.instant("SOMETHING_WRONG") + '<br/>' + $translate.instant("MESSAGE") + ': '+ msg,
                cssClass: 'cnextPop'
              });
              if (btn){btn.disabled = !btn.disabled;}
            });
          };

          /*Function used to delete a Like*/
          var unLikePost = function(post,user,btn){
            if (btn){btn.disabled = !btn.disabled;}
            $http({
              url: CONST.REST_API_URL + '/posts/' + post.id + '/likes/'+post.likeId,
              timeout: CONST.NETWORK_TIMEOUT,
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json'
              },
              data: {userId:user.id, userEmail: user.email, accessToken: user.accessToken}
            }).then(function (response) {
              var result = response.data;
              if (result.success) {
                delete post.likeId;
                post.numOfLikes--;
              } else {
                console.log(result.data.message);
                $ionicPopup.alert({
                  title: $translate.instant("OOOPS"),
                  template: $translate.instant("SOMETHING_WRONG") + '<br/>' + $translate.instant("MESSAGE") + ': '+ result.data.message,
                  cssClass: 'cnextPop'
                });
              }
              if (btn){btn.disabled = !btn.disabled;}
            }, function (error) {
              console.log(error);
              $ionicPopup.alert({
                title: $translate.instant("OOOPS"),
                template: $translate.instant("SOMETHING_WRONG") + '<br/>' + $translate.instant("MESSAGE") + ': '+ msg,
                cssClass: 'cnextPop'
              });
              if (btn){btn.disabled = !btn.disabled;}
            });
          };

          /*Function used to submit/delete a Like*/
          postsFac.likeUnlikePost = function (post,$event){
            var user = UsersService.getCurrentUser();
            if (!user){
              GuiUtilsService.showToastNotification($translate.instant('LOGIN_REQUIRED'),'LONG');
            }else {
              if (post.likeId) {
                unLikePost(post, user,$event.target);
              } else {
                likePost(post, user,$event.target);
              }
            }
          }

          /*Function used to to show the likes of a post*/
          postsFac.showLikesViewer = function (post,scope){
            postsFac.getPostLikes(post).then(function(likes){
              scope.postLikes=likes;
            },function(error){
              scope.postLikes=[];
            });
            $ionicModal.fromTemplateUrl('templates/partials/likes-viewer.html', {
              scope:scope,
              animation: 'slide-in-up'
            }).then(function(modal) {
              scope.likesViewer = modal;
              scope.likesViewer.show();
            });
          };

          postsFac.closeLikesViewer = function (scope){
            if (scope.likesViewer) {
              delete scope.postLikes;
              scope.likesViewer.remove();
            }
          };

          /*function used to compile html content of posts*/
          postsFac.getHtmlCaption = function (post){
            if (post.caption!==''){
              var tagged = post.caption.replace(/#(\w+)/g, "<a ng-click=\"fs.addFeedFilter({hashtag:\'$&\'},feed)\">$&</a>");
              tagged = tagged.replace(/@(\w+)/g, "<a ng-click=\"fs.addFeedFilter({hashtag:\'$&\'},feed)\">$&</a>");
              var filtered = $filter('embed')(tagged,{link:true, linkTarget:'_blank'});
              var unescaped = _.unescape(filtered);
              return unescaped
            }else{
              return post.caption
            }
          };

          /*function used to escape video url*/
          postsFac.getVideoSrc = function(post){
            if (post.mediaUrl) {
              return $sce.trustAsResourceUrl(post.mediaUrl);
            };
          };

          postsFac.downloadPostMedia = function (post) {
            cordova.plugins.photoLibrary.getLibrary(function (library) {
                doDownload(post);
              },
              function (err) {
                if (err.startsWith('Permission')) {
                  cordova.plugins.photoLibrary.requestAuthorization(
                    function () {
                      doDownload(post);
                    },
                    function (err) {
                      GuiUtilsService.showToastNotification('PhotoLibrary access permission not granted','SHORT');
                    },
                    {
                      read: true,
                      write: true
                    }
                  );
                }

              }
            );
          };

          var doDownload = function(post){
            var url = post.mediaUrl;
            var album = 'cNext';

            var onSaveToLibSuccess = function (result) {
              $rootScope.$broadcast('loading:hide');
              GuiUtilsService.showToastNotification($translate.instant('DOWNLOADED'),'SHORT');
            };

            var onSaveToLibFailure = function (error) {
              $rootScope.$broadcast('loading:hide');
              GuiUtilsService.showToastNotification(error,'SHORT');
            };

            if (post.type==='img'){
              $rootScope.$broadcast('loading:show');
              cordova.plugins.photoLibrary.saveImage(url, album, onSaveToLibSuccess,onSaveToLibFailure);
            }else if (post.type==='vid'){
              var dialog = $ionicPopup.confirm({
                title: $translate.instant('CONFIRMATION'),
                template:'Downloading videos may take some time (and bandwidth). Are you sure you want to continue?',
                cssClass: 'cnextPop',
                okText:'Yes'
              });
              dialog.then(function (agreed) {
                if (agreed) {
                  $rootScope.$broadcast('loading:show');
                  if (InfoService.is(CONST.OS_KEY,'iOS')){ //when on iOS, first download the file locally, and then insert it to library
                    var localTmpFileName = post.mediaUrl.substring(post.mediaUrl.lastIndexOf('/')+1);
                    var dlFail = function () {
                      $rootScope.$broadcast('loading:hide');
                      GuiUtilsService.showToastNotification('Could not get remote file');
                    };
                    window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fileSystem) {
                      fileSystem.root.getFile(localTmpFileName, {create: true, exclusive: false}, function(fileEntry) {
                        var localPath = fileEntry.toURL();
                        var ft = new FileTransfer();
                        ft.download(post.mediaUrl,
                          localPath, function(entry) {
                            cordova.plugins.photoLibrary.saveVideo(entry.nativeURL, album, onSaveToLibSuccess,onSaveToLibFailure);
                          }, dlFail);
                      }, dlFail);
                    }, dlFail);
                  }else{
                    cordova.plugins.photoLibrary.saveVideo(url, album, onSaveToLibSuccess,onSaveToLibFailure);
                  }
                } else {
                  console.log('User did not download post video');
                }
              });


            }
          };

          return postsFac;
        }]);
}());

