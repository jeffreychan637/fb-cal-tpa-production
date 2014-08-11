'use strict';

/**
 * This factory holds some defaults settings and the function to get the Wix
 * unparsed instance.
 *
 * @author Jeffrey Chan
 */

angular.module('fbCal').factory('api', function ($wix, $location, $log) {

  /**
   * The default settings for the app.
   * @type {Object}
   */
  var defaults = {
    title: 'This is my title.',
    description: 'This is my description.',
    view: 'Month',
    commenting: true,
    hostedBy: true,
    corners: '25',
    borderWidth: '5',
    modalCorners: '0',
    modalBorderWidth: '3'
  };

  /**
   * Gets the unparsed instance from the URL. It is parsed on the server side
   * to verify that requests are being sent from authenticated sources.
   * 
   * @return {String} The unparsed instance
   */
  var getInstance = function() {
    var instanceId = false;
    var url = $location.absUrl();
    var instanceRegexp = /.*instance=([\[\]a-zA-Z0-9\.\-_]*?)(&|$|#).*/g;
    var instance = instanceRegexp.exec(url);
    if (instance && instance[1]) {
      instanceId = instance[1]; //instanceId is actually the unparsed instance
    } else {
      $log.error('Getting Instance ID failed');
      //This should never happen. It means the user is accessing the app outside
      //of Wix.
    }
    return instanceId;
  };

  return {
    defaults: defaults,
    getInstance: getInstance
  };
});
