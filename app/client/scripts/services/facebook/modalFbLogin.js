'use strict';
/*global FB:false */

/**
 * This factory is handles all site visitor logins to Facebook in the modal.
 *
 * @author Jeffrey Chan
 */

angular.module('fbCal').factory('modalFbLogin', function ($q) {
  var grantedPermissions = [];

  /**
   * Checks if the given permission has been granted.
   * 
   * @param  {String} permission  Permission to check
   * @return {Boolean}            If permission was granted or not
   */
  var checkPermission = function(permission) {
    return grantedPermissions.indexOf(permission) >= 0;
  };

  /**
   * Checks if user is first time user of the app.
   * 
   * @return {Boolean} If user is first time user of the app
   */
  var checkFirstTime = function() {
    return grantedPermissions === [];
  };

  /**
   * Checks whether or not the user is logged in.
   * 
   * @return {Object} Promise to log in the user if she is not logged in
   */
  var checkLoginState = function() {
    var deferred = $q.defer();
    FB.getLoginStatus(function(response) {
      loginCallback(response, deferred);
    }, true);
    return deferred.promise;
  };

  /**
   * Verifies the login status of the user. If the user is logged in, it
   * checks permissions. Otherwise, it logs in the user.
   * 
   * @param  {Object} response Response from Facebook on user's login status
   * @param  {Object} deferred Promise object
   */
  var loginCallback = function(response, deferred) {
    if (response.status === 'connected') {
      checkPermissions(deferred, false);
    } else {
      login(deferred);
    }
  };

  /**
   * Checks the permissions granted by the user. Stores them into array. If
   * a specfic permission is provided, it also returns whether or not this 
   * permission was granted.
   * 
   * @param  {Object} deferred           Promise Object
   * @param  {String} specificPermission The permission to check if any
   */
  var checkPermissions = function(deferred, specificPermission) {
    FB.api('/me/permissions', function(response) {
      if (!response || response.error) {
        deferred.reject('unknown');
      } else {
        for (var i = 0; i < response.data.length; i++) {
          var permission = response.data[i];
          if (permission.status === 'granted') {
            grantedPermissions.push(permission.permission);
          }
        }
        if (specificPermission) {
          if (checkPermission(specificPermission)) {
            deferred.resolve();
          } else {
            deferred.reject('declined permission');
          }
        } else {
          deferred.resolve();
        }
      }
    });
  };

  /**
   * Logins in the user, specifically asking for certain permissions. 
   * If logged in succesfully, it checks permissions. Else it returns the 
   * reason for the login failure (whether it's the user's fault of Facebook's).
   * 
   * @param  {Object} deferred Promise Object
   */
  var login = function(deferred) {
    FB.login(function(response) {
      if (!response.error) {
        if (response.status === 'connected') {
          checkPermissions(deferred, false);
        } else if (response.status === 'not_authorized') {
          deferred.reject('declined');
        } else {
          deferred.reject('not logged in');
        }
      } else {
        deferred.reject('unknown');
      }
    }, {scope: 'public_profile, publish_actions, rsvp_event'});
  };

  /**
   * Logins the user while asking for a specific permission.
   * 
   * @param  {String} permission Permission to request
   * @param  {Boolean} rejected  If true, it lets Facebook know that this is a
   *                             rerequest for a permission. Otherwise, Facebook
   *                             protcts against asking users for permissions
   *                             multiple times.
   * @return {Object}            Promise to log the user in asking for the
   *                             specific permission
   */
  var loginWithPermission = function(permission, rejected) {
    var params;
    if (rejected) {
      params = {scope: permission, auth_type: 'rerequest'};
    } else {
      params = {scope: permission};
    }
    var deferred = $q.defer();
    FB.login(function(response) {
      if (!response.error) {
        if (response.status === 'connected') {
          checkPermissions(deferred, permission);
        } else if (response.status === 'not_authorized') {
          deferred.reject('declined');
        } else {
          deferred.reject('not logged in');
        }
      } else {
        deferred.reject('unknown');
      }
    }, params);
    return deferred.promise;
  };

  return {
    checkLoginState: checkLoginState,
    checkPermission: checkPermission,
    checkFirstTime: checkFirstTime,
    loginWithPermission: loginWithPermission
  };
});