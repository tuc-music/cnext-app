/**
 * Created by nektarios on 20/1/2016.
 */


(function () {
  'use strict';

  angular.module('tuc.utilities', [])
    .factory('jsUtils', function () {
      return {
        isGraterVersion: function (myVersion, minimumVersion) {

          if (typeof myVersion === 'number' && typeof minimumVersion === 'number') {
            return (myVersion >= minimumVersion);
          }

          var v1 = myVersion.split("."), v2 = minimumVersion.split("."), minLength;

          minLength = Math.min(v1.length, v2.length);
          var i;
          for (i = 0; i < minLength; i++) {
            if (Number(v1[i]) < Number(v2[i])) {
              return false;
            }
            else if (Number(v1[i]) < Number(v2[i])) {
              return true;
            }

          }

          return (v1.length >= v2.length);
        },

        plainToHtml: function(str){
          if (str) {
            str = str.replace(/(?:\r\n|\r|\n)/g, '<br/>')    //remove return / new line
              .replace(/"/g, '\\"')                           //escape double quotes
              .replace(/\t+/g, " ");                          //replace tabs with space
            /*console.log(str);*/
          }
          return str;
        },

        htmlToPlain: function(str){
          if (str) {
            str = str.replace("<br/>", '\n');                   //change <br/> to \n
            /*console.log(str);*/
          }
          return str;
        }
      }
    })
    .factory('htmlUtils', function () {
      return {
        // Function that changes a text area height (up to a specific threshold)
        // as the user types in. Input params: keypress/up/down event. Define data-min-height and data-max-height in
        // textarea element as attributes without the px extension;

        autoExpand: function (e) {
          var element = typeof e === 'object' ? e.target : document.getElementById(e);
          var min = element.dataset.minHeight
          var max = element.dataset.maxHeight;
          if (element.style.height) {
            if (element.scrollHeight < max && element.scrollHeight >= min) {
              element.style.height = element.scrollHeight + "px";
            }
          } else {
            element.style.height = min + "px";
          }
        }
      };
    })
    .factory('dataUtils', function () {

      return {
        //Function used to get a page of data in a data table. If page===all then all data will be returned.
        getDataByPage: function (dataTable, pageSize, page) {
          if (page !== 'all') {
            var startIdx = (page > 0) ? pageSize * (page - 1) : 0;
            var endIdx = (page > 0) ? (pageSize * page) : 0;
            /*console.log('PagingUtils: Requested Page ' + page +'. Start:'+startIdx + ', End: '+endIdx);
             console.log('current DataTable:');
             console.log(dataTable);*/
            if (!dataTable || !angular.isArray(dataTable) || !dataTable.length > 0) {
              return [];
            }
            if (dataTable.length > startIdx) {
              if (dataTable.length < endIdx) {
                endIdx = dataTable.length;
                /*console.log('End index changed to dataTable length ('+endIdx+')');*/
              }
              ;
              var pageData = dataTable.slice(startIdx, endIdx);
              /*console.log('Returned page:');
               console.log(pageData);*/
              return pageData;
            } else {
              /*console.log('Returned page (whole table):');
               console.log(dataTable);*/
              return dataTable;
            }
          } else {
            /*console.log('Returned page (whole table):');
             console.log(dataTable);*/
            return dataTable;
          }
        },

        arrayUnion: function (arr1, arr2, equalityFunc) {
          var union = arr1.concat(arr2);
          for (var i = 0; i < union.length; i++) {
            for (var j = i + 1; j < union.length; j++) {
              if (equalityFunc(union[i], union[j])) {
                union.splice(j, 1);
                j--;
              }
            }
          }
          return union;
        },

        isInArray: function(value,array){
          return array.indexOf( value ) > -1;
        },

        parseBoolean: function (value){
          if (value === 'true' || value === 'TRUE'){
            return true;
          }
          if (value === 'false' || value === 'FALSE'){
            return false;
          }
          return value;
        },

        parseBooleanObj: function (obj){
          angular.forEach(Object.keys(obj),function(key){
            if (obj[key] === 'true' || obj[key] === 'TRUE'){
              obj[key] = true;
            }else if (obj[key] === 'false' || obj[key] === 'FALSE'){
              obj[key] = false;
            }
          });
          return obj;
        }


      }
    });
}())
