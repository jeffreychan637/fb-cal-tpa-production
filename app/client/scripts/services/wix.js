'use strict';

/**
 * This factory checks for the Wix file on load.
 */

angular.module('fbCal').factory('$wix', function ($window, $log) {
  if ('Wix' in $window) {
    return $window.Wix;
  } else {
    return $log.error('Did you forget to include Wix.js?');
  }
});
