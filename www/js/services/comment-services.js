/* Created by Nektarios Gioldasis */
(function () {
  'use strict';

  /*global angular */
  angular.module('cnextApp.commentServices', [])
    .factory('CommentsService', ['$http', '$q','CONST','dataUtils','UsersService','jsUtils','InfoService', function ($http, $q, CONST, dataUitls,UsersService,jsUtils,InfoService) {
      var commentsFac = {};
      var commentsData = {};
      var comments;
      var appId = InfoService.get(CONST.APP_ID_KEY) || 'ALL';
      comments = function(postId,page,stats) {
        return $http.get(CONST.REST_API_URL+'/comments/'+postId,{params:{uuid:appId},timeout:CONST.NETWORK_TIMEOUT})
          .then(
            function (res) { // success
              commentsData[postId] = (res.data.success)? res.data.data :[];
              if (stats){
                return (commentsData[postId].length);
              }else {
                return dataUitls.getDataByPage(commentsData[postId], CONST.DATA_PAGE_SIZE, page);
              }
            },
            function (error) { // error handling
              return ((stats)? 0 : error);
            }
          );
      };

      commentsFac.getComments = function (postId, page,stats) {
        if (!page || page==='all') {page='all';}
        if (commentsData[postId]){
          var deferred = $q.defer();
          deferred.resolve(dataUitls.getDataByPage(commentsData[postId],CONST.DATA_PAGE_SIZE,page));
          /*console.log('CommentsService returned local data!')*/
          return deferred.promise;
        }else{
          return comments(postId,page);
        }
      };

      commentsFac.reload=function(postId){
        if (postId) {
            return comments(postId, 1);
        }
      }

      commentsFac.getNumOfComments = function(postId){
        if (commentsData[postId]){
          var deferred = $q.defer();
          deferred.resolve(commentsData[postId].length);
          return deferred.promise;
        }else{
          return comments(postId,1,true);
        }
      }

      commentsFac.removeCommentsOfPost=function(postId){
        if (commentsData[postId]){
          delete commentsData[postId];
          console.log(commentsData);
        }
      }

      commentsFac.deleteComment = function(commentId,postId){
        var deferred = $q.defer();
        var user = UsersService.getCurrentUser();
        if (commentsData[postId]){
          $http({
            url:CONST.REST_API_URL + '/comments/'+commentId,
            method:'delete',
            timeout:CONST.NETWORK_TIMEOUT,
            headers: {
              'Content-Type': 'application/json'
            },
            data:{email:user.email,accessToken:user.accessToken}
          }).then(function(response){
            if (response.data.success) {
              deferred.resolve(response.data);
              //Remove comment from local data
              (commentsData[postId]).splice(_.findIndex(commentsData[postId],{id:commentId}),1);
            }else{
              deferred.reject(response.data);
            }
          },function(error){
            console.log(error);
            deferred.reject(error);
          });
        }
        return deferred.promise;
      }

      commentsFac.saveComment=function(comment){
        var deferred = $q.defer();
        comment.caption = jsUtils.plainToHtml(comment.caption);
        $http.post(CONST.REST_API_URL+'/comments', comment,{headers: {'Content-Type': 'application/json'}})
          .then(function(rsp){
            var response = rsp.data;
            if (response.success) {
              if (commentsData[comment.postId]) {
                commentsData[comment.postId].push(response.data);
              }else {
                commentsData[comment.postId] = [].push(response.data);
              }
              deferred.resolve(response.data);
            }else{
              deferred.reject(response.data.message);
            }
          },function(error){
            deferred.reject(error);
          });
        return deferred.promise;
      };
      commentsFac.reportAbuse = function(report){
        var deferred = $q.defer();
        $http({
          url:CONST.REST_API_URL + '/comments/abuses',
          method:'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          data:{
            commentId:report.commentId,
            text:report.explanation,
            creatorUuid:InfoService.get(CONST.APP_ID_KEY)
          }
        }).then(function(response){
          var httpResponse =response.data;
          if (httpResponse.success) {
            deferred.resolve(httpResponse.data);
          }else{
            deferred.reject(httpResponse.data.message);
          }
        },function(error){
          deferred.reject("Access Denied!");
        });
        return deferred.promise;
      };

      return commentsFac;
    }]);
}())

