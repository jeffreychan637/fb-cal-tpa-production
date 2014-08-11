'use strict';

/**
 * This directive tells the Settings Controller that all the user events
 * in the Settings Panel have finished rendering and it is time to initialize
 * the Wix UI.
 *
 * @author Jeffrey Chan
 */

angular.module('fbCal')
    .directive('onFinishRender', function ($timeout) {
    return {
        restrict: 'A',
        link: function (scope, element, attr) {
            if (scope.$last === true) {
                $timeout(function () {
                    scope.$emit(attr.onFinishRender);
                });
            }
        }
    };
});