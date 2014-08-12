'use strict';
/*global $:false, FB:false, jQuery:false */

/**
 * This factory makes all the calls to the server and sends any requested data
 * back to the controllers/factories that use it.
 *
 * @author Jeffrey Chan
 */

angular.module('fbCal').factory('server', function ($log, $http, $wix, api, 
                                                    $window, $q) {

  /**
   * The Wix IDs needed for verification on the server
   */
  var compId = $wix.Utils.getOrigCompId() || $wix.Utils.getCompId();
  var instance = api.getInstance();
  var url = $window.location.hostname;
  console.log(url);

  /**
   * All the URLs for communicating with the Server.
   * @type {String}
   */
  var getSettingsWidgetURL = '/GetSettingsWidget/' + compId;
  var getSettingsSettingsURL = '/GetSettingsSettings/' + compId;
  var getAllEventsURL = '/GetAllEvents/' + compId;
  var getModalEventURL = '/GetModalEvent/' + compId;
  var getModalFeedURL = '/GetModalFeed/' + compId;
  var saveSettingsURL = '/SaveSettings/' + compId;
  var saveAccessTokenURL = '/SaveAccessToken/' + compId;
  var logoutURL = '/Logout/' + compId;

  /**
   * Default Settings in case the Server returns an error.
   * @type {Object}
   */
  var defaultSettingsWidget = {settings : api.defaults,
                               fb_event_data : [], active : true};
  var defaultSettingsSettings = {settings : api.defaults, events : [],
                                 active : true, name: "", user_id: ""};

  /**
   * Returns the appropriate URL based on the type of request and who is
   * making.
   * 
   * @param  {String} requestType Type of request
   * @param  {String} from        Who is making the request (Widget or Settings)
   * @return {String}             The appropriate URL
   */
  var getURL = function(requestType, from) {
    if (requestType === 'get') {
      if (from === 'widget') {
        return getSettingsWidgetURL;
      } else {
        return getSettingsSettingsURL;
      }
    } else {
      if (from === 'settings') {
        return saveSettingsURL;
      } else {
        return saveAccessTokenURL;
      }
    }
  };

  /**
   * Returns the appriate default settings based on who is requesting.
   * 
   * @param  {String} from Who is making the request (Server or Widget)
   * @return {Object}        The default settings
   */
  var getDefault = function(from) {
    if (from === 'widget') {
      return defaultSettingsWidget;
    } else {
      return defaultSettingsSettings;
    }
  };

  /**
   * Returns the appriate header based on who is requesting.
   * 
   * @param  {String} from   Who is making the request (Server or Widget)
   * @return {Object}        The appropriate header
   */
  var getHeader = function(from) {
    if (from === 'widget') {
      return {'X-Wix-Instance' : instance};
    } else {
      return {'X-Wix-Instance' : instance, 'URL' : url};
    }
  };

  /**
   * Returns the correct header depending on the FB api parameter provided.
   * 
   * @param  {Object} params      Contains the FB api param needed to get next
   *                              part of feed or comments
   * @param  {String} desiredData The type of data wanted (Either more posts
   *                              or comments)
   * @param  {String} eventId     Event Id for the event that we are requesting
   *                              data about
   * @return {Object}             The appropriate header
   */
  var getFeedHeader = function(params, desiredData, eventId) {
    if (params.after) {
      return {'X-Wix-Instance' : instance,
              'object_id' : params.id,
              'desired_data' : desiredData,
              'event_id' : eventId,
              'after' : params.after
             };
    } else {
      return {'X-Wix-Instance' : instance,
              'object_id' : params.id,
              'desired_data' : desiredData,
              'event_id' : eventId,
              'until' : params.until
             };
    }
  };

  /**
   * This function makes a call to the backend database to get the
   * latest user settings. It's called whenever the widget or settings panal
   * is first loaded. On errors or empty settings from the server, the default
   * settings are loaded.
   * 
   * @param  {String} from        Who is making the request (Widget or Settings)
   * @return {Object}             A promise to return the settings
   */
  var getUserInfo = function(from) {
    var deferred = $q.defer();
    $http({
           method: 'GET',
           url: getURL('get', from),
           headers: getHeader(from),
           timeout: 15000
          }).success(function (data, status) {
            if (status === 200) {
              var response = jQuery.parseJSON(jQuery.parseJSON(data));
              if (!response.settings) {
                response.settings = api.defaults;
              }
              if (from === 'settings' && !response.events) {
                response.events = [];
              }
              if (from === 'widget' && !response.fb_event_data) {
                response.fb_event_data = [];
              }
              deferred.resolve(response);
            } else {
              $log.warn('The server is returning an incorrect status.');
              deferred.reject(getDefault(from));
            }
          }).error(function (message, status) {
            console.debug(status, message);
            deferred.reject(getDefault(from));
          });
    return deferred.promise;
  };

  /**
   * This is used by the Settings panel to get all the events created by the
   * user on her Facebook account. It is only used if trying to get the event
   * data from the client side fails.
   * 
   * @return {Object} Promise to return the event data from Server
   */
  var getAllEvents = function() {
    var deferred = $q.defer();
    $http({
           method: 'GET',
           url: getAllEventsURL,
           headers: getHeader('settings'),
           timeout: 15000
          }).success(function (data, status) {
            if (status === 200) {
              deferred.resolve(jQuery.parseJSON(jQuery.parseJSON(data)));
            } else {
              $log.warn('The server is returning an incorrect status.');
              deferred.reject();
            }
          }).error(function (message, status) {
            deferred.reject();
          });
    return deferred.promise;
  };

  /**
   * Gets the event data for a specific event for the Modal.
   * 
   * @param  {String} eventId     The event ID for the event you want data about
   * @param  {String} desiredData The desired data you want about this event
   *                              (e.g. cover photo, feed)
   * @return {Object}             Promise to return the event data
   */
  var getModalEvent = function(eventId, desiredData) {
    var modalHeader = {'X-Wix-Instance' : instance, 
                       'event_id' : eventId.toString(),
                       'desired_data' : desiredData
                      };
    var deferred = $q.defer();
    $http({
           method: 'GET',
           url: getModalEventURL,
           headers: modalHeader,
           timeout: 15000
          }).success(function (data, status) {
            if (status === 200) {
              var response = jQuery.parseJSON(jQuery.parseJSON(data));
              if (!response.settings) {
                response.settings = api.defaults;
              }
              deferred.resolve(response);
            } else {
              $log.warn('The server is returning an incorrect status.');
              deferred.reject();
            }
          }).error(function (message, status) {
            console.debug(status, message);
            deferred.reject();
          });
    return deferred.promise;
  };

  /**
   * Get additional feed data for the Modal.
   * 
   * @param  {Object} params      The params that will need to be provided to
   *                              the Facebook SDK to get the specific event
   *                              data
   * @param  {String} desiredData The type of event data you want (more feed or
   *                              more comments)
   * @param  {String} eventId     The event ID for the event you want
   * @return {Object}             Promise to return data from server
   */
  var getModalFeed = function(params, desiredData, eventId) {
    var deferred = $q.defer();
    $http({
           method: 'GET',
           url: getModalFeedURL,
           headers: getFeedHeader(params, desiredData, eventId),
           timeout: 15000
         }).success(function (data, status) {
            if (status === 200) {
              var response = jQuery.parseJSON(jQuery.parseJSON(data));  
              deferred.resolve(response);
            } else {
              $log.warn('The server is returning an incorrect status.');
              deferred.reject();
            }
          }).error(function (message, status) {
            deferred.reject();
          });
    return deferred.promise;
  };

  /**
   * Saves data to the database on the server.
   * 
   * @param  {Object} data     The data to be saved
   * @param  {String} dataType The type of data to save
   *                            (Access Token or Settings)
   * @return {Object}          Promise to tell you if data was saved
   *                           successfully
   */
  var saveData = function(data, dataType) {
    var deferred = $q.defer();
    $http({
            method: 'PUT',
            url: getURL('post', dataType),
            headers: {'X-Wix-Instance' : instance, 'URL' : url},
            timeout: 10000,
            data: data
          }).success(function (message, status) {
            if (status === 200) {
              deferred.resolve();
            } else {
              $log.warn('The server is returning an incorrect status.');
              deferred.reject();
            }
          }).error(function (message, status) {
            console.debug(status, message);
            deferred.reject();
          });
    return deferred.promise;
  };

  /**
   * Deletes the access token and saved events data from the database. Called
   * when the user logs out of her Facebook account in the settings panel.
   * 
   * @return {Object} Promise to tell if deletion was successfully
   */
  var logout = function() {
    var deferred = $q.defer();
    $http({
            method: 'PUT',
            url: logoutURL,
            headers: {'X-Wix-Instance' : instance, 'URL' : url},
            timeout: 10000,
            data: {}
          }).success(function (message, status) {
            if (status === 200) {
              deferred.resolve();
            } else {
              $log.warn('The server is returning an incorrect status.');
              deferred.resolve();
            }
          }).error(function (message, status) {
            console.debug(status, message);
            deferred.reject();
          });
      return deferred.promise;
  };

  return {
    getUserInfo: getUserInfo,
    getAllEvents: getAllEvents,
    getModalEvent: getModalEvent,
    getModalFeed: getModalFeed,
    saveData: saveData,
    logout: logout
  };
});
