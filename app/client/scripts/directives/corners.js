'use strict';
/**
 * This directive binds an event listener to all the relevant elements whose
 * border radius can be adjusted by the user. This means all changes in the
 * settings will immediately be reflected in the widget.
 *
 * @author Jeffrey Chan
 */
angular.module('fbCal')
  .directive('corners', function() {
        return {
          link: function(scope, element) {
            scope.$watch(function() {
                if (scope.settings) {
                  return scope.settings.corners;
                } else {
                  return false;
                }
              },
              function() {
                if (scope.settings) {
                  element.css('border-radius', scope.settings.corners + 'px');
                }
              });
          }
        };
      });

angular.module('fbCal')
  .directive('modalCorners', function() {
        return {
          link: function(scope, element, attr) {
            scope.$watch(function() {
                if (scope.settings) {
                  return scope.settings.modalCorners;
                } else {
                  return false;
                }
              },
              function() {
                if (scope.settings && scope.feed) {
                  if (attr.modalCorners === "-1") {
                    element.css('border-radius',
                                scope.settings.modalCorners + 'px');
                  } else if (attr.modalCorners) {
                    if (scope.feed[attr.modalCorners]) {
                      if (!scope.feed[attr.modalCorners].comments.length) {
                        element.css('border-bottom-left-radius',
                                    scope.settings.modalCorners + 'px');
                         element.css('border-bottom-right-radius',
                                      scope.settings.modalCorners + 'px');
                      }
                    }
                  } else if (element.hasClass('add-on')) {
                    element.css('border-bottom-left-radius',
                                scope.settings.modalCorners + 'px');
                    element.css('border-bottom-right-radius',
                                scope.settings.modalCorners + 'px');
                  } else if (element.hasClass('block')) {
                    element.css('border-top-left-radius',
                                scope.settings.modalCorners + 'px');
                    element.css('border-top-right-radius',
                                scope.settings.modalCorners + 'px');
                  }
                }
              });
          }
        };
      });
