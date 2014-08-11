'use strict';
/*global $:false, FB:false */

/**
 * This factory handles all logins to Facebook in the settings panel.
 *
 * @author Jeffrey Chan
 */

angular.module('fbCal').factory('fbLogin', function ($q, server) {

  /**
   * This checks the login state of the user.
   * 
   * @return {Object} Promise to return the login state of the user and log
   *                  her in if necessary
   */
  var checkLoginState = function() {
    var deferred = $q.defer();
    FB.getLoginStatus(function(response) {
      loginCallback(response, deferred);
    }, true);
    return deferred.promise;
  };

  /**
   * Reads the login state response from Facebook. If logged in, it tests the
   * Facebook API to get the user's name (to display in the settings panel) as
   * well as verifies that the user granted all necessary permissions.
   * 
   * @param  {Object} response Login state response from Facebook
   * @param  {Object} deferred The promise object - it's passed into other
   *                           functions to be fulfilled later
   */
  var loginCallback = function(response, deferred) {
    if (response.status === 'connected') {
      testAPI(deferred, response.authResponse.accessToken);
    } else {
      login(deferred);
    }
  };

  /**
   * Tests whether the user is actually connected with Facebook through the app
   * by getting the user's name. As a side effect, this name is also used in the
   * settings panel to show the user which account she is logged into. If
   * succesful, it makes a call to check the permissions granted.
   * 
   * @param  {Object} deferred    The promise object - it's passed into other
   *                              functions to be fulfilled later unless an
   *                              error occurs
   * @param  {String} accessToken The access token to the user's Facebook data
   */
  var testAPI = function(deferred, accessToken) {
    FB.api('/me', function(response) {
      if (!response || response.error) {
        deferred.reject('unknown');
      } else {
        checkPermissions(deferred, response.name, accessToken);
      }
    });
  };

  /**
   * Checks whether or not the user has granted the ability for the app to get
   * her events. If yes, then the user's access token is saved to the database.
   * If not the user is logged out and shown an appropriate message in the
   * settings panel.
   * 
   * @param  {Object} deferred     The promise object - Resolved with the name
   *                               if events permission granted; otherwise
   *                               rejected
   * @param  {String} name         Name of the user whose Facebook account is
   *                               connected to the app
   * @param  {String} accessToken  The access token to the user's Facebook data
   */
  var checkPermissions = function(deferred, name, accessToken) {
    FB.api('/me/permissions', function(response) {
      if (!response || response.error) {
        deferred.reject('unknown');
      } else {
        var permissionGranted;
        for (var i = 0; i < response.data.length; i++) {
          var permission = response.data[i];
          if (permission.permission === 'user_events' && permission.status === 'granted') {
            permissionGranted = true;
            server.saveData({access_token: accessToken}, "access token")
              .then(function() {
                  deferred.resolve(name);
                }, function() {
                  logout()['finally'](function() {
                  deferred.reject('unknown');
                });
              });
            break;
          }
        }
        if (!permissionGranted) {
          logout().then(function() {
            deferred.reject('denied');
          }, function() {
            deferred.reject('unknown');
          });
        }
      }
    });
  };

  /**
   * Connects the user's Facebook account with the app. If sucessful, it checks
   * the permissions granted by the user.
   * 
   * @param  {Object} deferred The promise object
   */
  var login = function(deferred) {
    FB.login(function(response) {
      if (!response.error) {
        if (response.status === 'connected') {
          testAPI(deferred, response.authResponse.accessToken);
        } else if (response.status === 'not_authorized') {
          deferred.reject('declined');
        } else {
          deferred.reject('not logged in');
        }
      } else {
        deferred.reject('unknown');
      }
    }, {scope: 'public_profile, user_events'});
  };

  /**
   * Disconnects the user's Facebook account with the app.
   */
  var logout = function() {
    var deferred = $q.defer();
    FB.api('/me/permissions', 'DELETE', function(response) {
      if (response && !response.error) {
        deferred.resolve();
      } else if (response.error && response.error.type === 'OAuthException') {
        deferred.reject('login');
      } else {
        deferred.reject('unknown');
      }
    });
    return deferred.promise;
  };

  return {
    checkLoginState: checkLoginState,
    logout: logout,
  };
});
