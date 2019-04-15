/**
 * Created by nektarios on 10/12/2016.
 */
(function () {
  'use strict';

  /*global angular */
  angular.module('cnextApp.uiServices', [])
    .factory('GuiUtilsService', ['$translate', 'CONST', 'InfoService', '$ionicPopup', '$timeout',
      function ($translate, CONST, InfoService, $ionicPopup, $timeout) {

        var uiFac = {}
        var toastDurations = {
          LONG: CONST.TOAST_LONG_MSG.duration,
          SHORT: CONST.TOAST_SHORT_MSG.duration
        };

        uiFac.showToastNotification = function (msg, duration) {
          duration = duration || 'SHORT';
          if (InfoService.is(CONST.ON_DEVICE)) {
            var toastOptions = {};

            angular.copy(CONST['TOAST_' + duration + '_MSG'], toastOptions);
            toastOptions.message = msg;
            window.plugins.toast.showWithOptions(toastOptions);
          } else {
            var msg = $ionicPopup.show({
              template: msg,
              cssClass: 'popUpNoTitle'
            });
            $timeout(function () {
              msg.close();
            }, toastDurations[duration]);
          }
        };

        uiFac.showAlert = function (title, msg) {
          $ionicPopup.alert({
            title: title,
            template: msg,
            cssClass: 'cnextPop'
          });
        };

        uiFac.log = function (msg) {
          var logDiv = document.getElementById('appLogs');
          if (logDiv) {
            var e = document.createElement('label');
            var timePrefix=new moment().format('LTS');
            e.innerText = timePrefix + ': '+msg;
            var br = document.createElement('br');
            logDiv.insertBefore(br, logDiv.childNodes[0]);
            logDiv.insertBefore(e, logDiv.childNodes[0]);
          }
          console.log(msg);
          if (InfoService.is(CONST.LBS.TESTING_KEY, true)) {
            uiFac.showToastNotification(msg,'SHORT');
          }
        };

        return uiFac;
      }])

    .factory('ModalService', ['$ionicModal', '$rootScope', '$q', '$injector', '$controller',
      function($ionicModal, $rootScope, $q, $injector, $controller) {

        return {
          show: show
        }

        function show(templeteUrl, controller, parameters, options) {
          // Grab the injector and create a new scope
          var deferred = $q.defer(),
            ctrlInstance,
            modalScope = $rootScope.$new(),
            thisScopeId = modalScope.$id,
            defaultOptions = {
              animation: 'slide-in-up',
              focusFirstInput: false,
              backdropClickToClose: true,
              hardwareBackButtonClose: true,
              modalCallback: null
            };

          options = angular.extend({}, defaultOptions, options);

          $ionicModal.fromTemplateUrl(templeteUrl, {
            scope: modalScope,
            animation: options.animation,
            focusFirstInput: options.focusFirstInput,
            backdropClickToClose: options.backdropClickToClose,
            hardwareBackButtonClose: options.hardwareBackButtonClose
          }).then(function (modal) {
            modalScope.modal = modal;

            modalScope.openModal = function () {
              modalScope.modal.show();
            };
            modalScope.closeModal = function (result) {
              deferred.resolve(result);
              modalScope.modal.hide();
            };
            modalScope.$on('modal.hidden', function (thisModal) {
              if (thisModal.currentScope) {
                var modalScopeId = thisModal.currentScope.$id;
                if (thisScopeId === modalScopeId) {
                  deferred.resolve(null);
                  _cleanup(thisModal.currentScope);
                }
              }
            });

            // Invoke the controller
            var locals = { '$scope': modalScope, 'parameters': parameters };
            var ctrlEval = _evalController(controller);
            ctrlInstance = $controller(controller, locals);
            if (ctrlEval.isControllerAs) {
              ctrlInstance.openModal = modalScope.openModal;
              ctrlInstance.closeModal = modalScope.closeModal;
            }

            modalScope.modal.show()
              .then(function () {
                modalScope.$broadcast('modal.afterShow', modalScope.modal);
              });

            if (angular.isFunction(options.modalCallback)) {
              options.modalCallback(modal);
            }

          }, function (err) {
            deferred.reject(err);
          });

          return deferred.promise;
        }

        function _cleanup(scope) {
          scope.$destroy();
          if (scope.modal) {
            scope.modal.remove();
          }
        }

        function _evalController(ctrlName) {
          var result = {
            isControllerAs: false,
            controllerName: '',
            propName: ''
          };
          var fragments = (ctrlName || '').trim().split(/\s+/);
          result.isControllerAs = fragments.length === 3 && (fragments[1] || '').toLowerCase() === 'as';
          if (result.isControllerAs) {
            result.controllerName = fragments[0];
            result.propName = fragments[2];
          } else {
            result.controllerName = ctrlName;
          }

          return result;
        }

      }]);
}())
