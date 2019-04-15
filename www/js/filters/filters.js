/**
 * Created by Nektarios Gioldasis on 14/1/2016.
 */

angular.module('cnextApp.filters', [])

    .filter('rawHtml', ['$sce', function($sce){
        return function(val) {
            return $sce.trustAsHtml(val);
        };
    }])
    .filter('cut', function () {
    return function (value, wordwise, max, tail) {
      if (!value) {return '';}

      max = parseInt(max, 10);
      if (!max) return value;
      if (value.length <= max) return value;

      value = value.substr(0, max);
      if (wordwise) {
        var lastspace = value.lastIndexOf(' ');
        if (lastspace !== -1) {
          value = value.substr(0, lastspace);
        }
      }

      return value + (tail || '...');
    };
  })
  .filter('capitalize', function() {
  return function(input) {
    return (!!input) ? input.charAt(0).toUpperCase() + input.substr(1).toLowerCase() : '';
  }
})
  .filter('filterEventTitles', ['orderByFilter',function(orderByFilter){
    return function (events, query, scope) {
      var filtered = [];
      var letterMatch = new RegExp(query, 'i');
      for (var i = 0; i < events.length; i++) {
        var item = events[i];
        if (query) {
          if (letterMatch.test(item.title)) {
            if ((scope=='') || (scope!=='' && item.parentEventId == scope)){
              filtered.push(item);
            }
          }
        } else {
          if (item.parentEventId == scope) {
            filtered.push(item);
          }
        }
      }
      filtered = orderByFilter(filtered, 'startDate', scope=='');
      return filtered
    };
  }]);
