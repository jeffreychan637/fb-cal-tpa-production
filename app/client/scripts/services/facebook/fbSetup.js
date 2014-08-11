'use strict';
/*global FB:false, document:false */

/**
 * The factory handles the setup of the Facebook SDK.
 *
 * @author Jeffrey Chan
 */

angular.module('fbCal').factory('fbSetup', function ($window, server, $rootScope) {

  var fbReady = false;

  /**
   * Valid Hosts to save Access Token.
   * @type {Array}
   */
  var validHosts = ['editor.wix.com'];

  /**
   * Checks whether the current host is valid.
   * 
   * @param  {String} currentHost Current Host
   * @return {Boolean}            Whether the current host is valid.
   */
  var  checkValidHost = function(currentHost) {
   return validHosts.indexOf(currentHost) > 0;
  };

  /**
   * Tells if Facebook SDK is ready to be used.
   * 
   * @return {Boolean} Represents if Facebook SDK is ready to be used
   */
  var getFbReady = function() {
    return fbReady;
  };

  /**
   * Initializes the Facebook SDK. After initalizing, SDK, it try to get the
   * access token of the current site visitor. If successful and we are in a
   * valid host, it sends the access token to the server to be saved.
   */
  $window.fbAsyncInit = function() {
    FB.init({
      appId      : '790467867660486',
      xfbml      : true,
      version    : 'v2.0'
    });

    FB.getLoginStatus(function(response) {
      fbReady = true;
      $rootScope.$apply();
      if (response && !response.error && response.status === 'connected' &&
          checkValidHost($window.location.hostname)) {
        server.saveData({access_token: response.authResponse.accessToken}, "access token");
      }
    });
  };

  (function(d, s, id){
     var js, fjs = d.getElementsByTagName(s)[0];
     if (d.getElementById(id)) {return;}
     js = d.createElement(s); js.id = id;
     js.src = "//connect.facebook.net/en_US/sdk.js";
     fjs.parentNode.insertBefore(js, fjs);
   }(document, 'script', 'facebook-jssdk'));


  return {
    getFbReady: getFbReady
  };
});