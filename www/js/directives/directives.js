/**
 * Created by nektarios on 14/1/2016.
 */
angular.module('cnextApp.directives', [])
  .directive('passwordConfirm', ['$parse', function ($parse) {
    /*Directive to check if two password fields are identical. Used in form validation*/
    "use strict";
    return {
      restrict: 'A',
      scope: {
        matchTarget: '=',
      },
      require: 'ngModel',
      link: function link(scope, elem, attrs, ctrl) {
        var validator = function (value) {
          ctrl.$setValidity('match', value && value === scope.matchTarget);
          return value;
        };

        ctrl.$parsers.unshift(validator);
        ctrl.$formatters.push(validator);

        // This is to force validator when the original password gets changed
        scope.$watch('matchTarget', function (newval, oldval) {
          validator(ctrl.$viewValue);
        });

      }
    };
  }])
  //Directive to show User Images. Not Used...because had problems in ng-repeat...
  .directive('userImg', function() {
    /*Directive to create image element a User based on the Account Issuer (FB/CNEXT)*/
    "use strict";
    return {
      restrict: 'A',
      scope: {
        issuer: "@issuer",
        socialId:"@socialId"
      },
      link: function(scope, element, attrs) {
        if (scope.issuer==='FB'){
          attrs.$set('src','http://graph.facebook.com/'+scope.socialId + '/picture?width=60&height=60');
        }else if (scope.issuer==='CN'){
          attrs.$set('src','http://cnext.tuc.gr/content/users/User-'+scope.socialId);
        }
      },
    };
  })
  .directive('categoryImg', function() {
    /*Directive to create image element an Event Category*/
    "use strict";
    return {
      restrict: 'A',
      scope: {
        catId: "@categoryId"
      },
      link: function(scope, element, attrs) {
        if (scope.catId==='1'){
          attrs.$set('src','img/performance.svg');
        }else if (scope.catId==='2'){
          attrs.$set('src','img/workshop.svg');
        }else if (scope.catId==='3'){
          attrs.$set('src','img/conference.svg');
        }else if (scope.catId==='4'){
          attrs.$set('src','img/meeting.svg');
        }else if (scope.catId==='5'){
          attrs.$set('src','img/exhibition.svg');
        }else if (scope.catId==='6'){
          attrs.$set('src','img/other.svg');
        }
      },
    };
  })
  .directive('showHideContainer', function(){
    /*Directive used to show/hide passwords typed by user in conjunction with showHideInput?*/
    "use strict";
    return {
      scope: {},
      controller: function($scope, $element, $attrs) {
        $scope.show = false;

        $scope.toggleType = function($event){
          $event.stopPropagation();
          $event.preventDefault();

          $scope.show = !$scope.show;

          // Emit event
          $scope.$broadcast("toggle-type", $scope.show);
        };
      },
      templateUrl: 'templates/partials/show-hide-password.html',
      restrict: 'A',
      replace: false,
      transclude: true
    };
  })
  .directive('showHideInput', function(){
    /*Directive used to show/hide passwords typed by user*/
    "use strict";
    return {
      scope: {},
      link: function(scope, element, attrs) {
        // listen to event
        scope.$on("toggle-type", function(event, show){
          var password_input = element[0],
            input_type = password_input.getAttribute('type');

          if(!show)
          {
            password_input.setAttribute('type', 'password');
          }

          if(show)
          {
            password_input.setAttribute('type', 'text');
          }
        });
      },
      require: '^showHideContainer',
      restrict: 'A',
      replace: false,
      transclude: false
    };
  })
  .directive('compileHtml', ['$compile', function ($compile) {
    return function(scope, element, attrs) {
      scope.$watch(
        function(scope) {
          // watch the 'compile' expression for changes
          return scope.$eval(attrs.compileHtml);
        },
        function(value) {
          // when the 'compile' expression changes assign it into the current DOM
          element.html(value);

          // compile the new DOM and link it to the current
          // scope.
          // NOTE: we only compile .childNodes so that we don't get into infinite loop compiling ourselves
          $compile(element.contents())(scope);
        }
      );
    };
  }])
  .directive('openExternalUrl', function ($compile,$timeout) {
    /*Directive used to change hyperlinks inside an html element so that they open in system browser */
    return {
      priority: -1,
      restrict: 'A',
      scope: false,
      link: function (scope, elem, attrs) {
        $timeout(function() {
          var links = elem.find('a');
          _.map(links, function (a) {
            var href = a.href;
            if (href) {
              a.setAttribute('onclick', 'window.open(\'' + href + '\',\'_system\')');
              a.removeAttribute('href');
              a.removeAttribute('target');
              a.removeAttribute('class');
            }
          });
          //$compile(elem.contents())(scope);
        });
      }
    }
  })
  .directive("contenteditable", function() {
    /*Directive used to create Editable Div. Not used in cNext App*/
      return {
        restrict: "A",
        require: "ngModel",
        link: function(scope, element, attrs, ngModel) {

          function read() {
            ngModel.$setViewValue(element.html());
          }

          ngModel.$render = function() {
            element.html(ngModel.$viewValue || "");
          };

          element.bind("blur keyup change", function() {
            scope.$apply(read);
          });
        }
      };
    });
