'use strict';
/**
 * These directives binds an event listener to all the relevant elements whose
 * border width can be adjusted by the user. This means all changes in the
 * settings will immediately be reflected in the widget.
 *
 * The header needs a specific directive because the border width is only
 * affected by the user settings in list view.
 *
 * @author Jeffrey Chan
 */
angular.module('fbCal')
  .directive('borderWidth', function() {
        return {
          link: function(scope, element) {
            scope.$watch(function() {
                if (scope.settings) {
                  return scope.settings.borderWidth;
                } else {
                  return false;
                }
              },
              function() {
                if (scope.settings) {
                  element.css('border-width', scope.settings.borderWidth + 'px');
                }
              });
          }
        };
      });

angular.module('fbCal')
  .directive('borderWidthHeader', function() {
        return {
          link: function(scope, element) {
            scope.$watch(function() {
                if (scope.settings) {
                  return scope.settings.borderWidth;
                } else {
                  return false;
                }
              },
              function() {
                if (scope.settings && scope.settings.view === 'List') {
                  element.css('border-width', 
                              scope.settings.borderWidth + 'px');
                }
              });
          }
        };
      });

angular.module('fbCal')
  .directive('modalBorderWidth', function() {
        return {
          link: function(scope, element) {
            scope.$watch(function() {
                if (scope.settings) {
                  return scope.settings.modalBorderWidth;
                } else {
                  return false;
                }
              },
              function() {
                if (scope.settings) {
                  element.css('border-width',
                              scope.settings.modalBorderWidth + 'px');
                }
              });
          }
        };
      });
