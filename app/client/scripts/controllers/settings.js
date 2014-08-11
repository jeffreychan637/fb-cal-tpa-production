'use strict';
/*global $:false, JSON:false , location:false*/

/**
 * This is the Controller of the Settings Panel. It is the main file that sends
 * info to be displayed on the DOM to the user and calls different functions
 * across different files to do so.
 *
 * @author Jeffrey Chan
 */

angular.module('fbCal')
  .controller('SettingsCtrl', function ($scope, $wix, fbSetup, fbLogin,
                                        $timeout, server, fbEvents, messages) {
    /**
     * allEventsList - A list containing all the events the user created on
     *                 Facebook that we were able to pull
     * @type {Array}
     * checkedEventsList - Events that the user has "checked" (She wants it
     *                     on her calendar/list).
     * @type {Array}
     * numericalSettings - A special list of settings whose values are rounded
     *                     down to the nearest integer before being saved.
     * @type {Array}
     * eventChange - Whether or not the change that the user made in
     *               the settings involves adding/deleting an event or
     *               changing the color of an event. If this is true
     *               the widget is refreshed after the change is made.
     * @type {Boolean}
     * userId - The facebook ID of the app user.
     * @type {String}
     */
    $scope.allEventsList = [];
    var checkedEventsList;
    var numericalSettings = ['borderWidth', 'modalBorderWidth',
                             'corners', 'modalCorners'];
    var eventChange;
    var userId;

    
    /**
     * This function watches for when all the facebook events are done being
     * added to the DOM. When this is complete, the function goes through the
     * DOM and adds the Wix "checked" attribute to all the events the user has
     * saved to be added to her calendar.
     * 
     * Then, the settings panel is initialized. 
     * 
     * Lastly, the function parses the list again and sets the
     * color of all the events in the list to the ones that the user has saved.
     */
    $scope.$on('Render Finished', function() {
        for (var i = 0; i < checkedEventsList.length; i++) {
          if (($scope.allEventsList.map(getElemId).indexOf(checkedEventsList[i].eventId)) >= 0) {
          $('#event' + checkedEventsList[i].eventId).attr('wix-options', 
                                                        '{checked:true}');
          }
        }
        $wix.UI.initialize($scope.settings);
        for (var j = 0; j < $scope.allEventsList.length; j++) {
          $('#event' + $scope.allEventsList[j].id + 'Color .color-box-inner').css('background', '#0088CB');
        }
        for (var k = 0; k < checkedEventsList.length; k++) {
          var index = ($scope.allEventsList.map(getElemId).indexOf(checkedEventsList[k].eventId));
          if (index >= 0) {
             $('#event' + checkedEventsList[k].eventId + 'Color .color-box-inner').css('background', checkedEventsList[k].eventColor);
          }
        }
    });

    /**
     * Returns the element ID of the given element. Used when determining what
     * events to apply the check mark and colors on.
     * 
     * @param  {Object} elem Given element to get ID of
     * @return {String}      The ID of the given element
     */
    var getElemId = function(elem) {
      return elem.id;
    };

    /**
     * Sends the settings to the widget so that they can be reflected to the
     * user.
     */
    var sendSettings = function() {
      $wix.Settings.triggerSettingsUpdatedEvent({settings: $scope.settings},
                                                $wix.Utils.getOrigCompId());
    };

    /**
     * This is an event listener that watches for any changes in the settings
     * panel except for changes to the toggle switches. Based on the setting 
     * being changed, it performs the appropriate actions and then calls the
     * function to save the settings.
     *
     * For changes involving events, all are saved except for changes to an
     * event color where that event has not been checked. Only checked events
     * have their color saved. 
     * 
     * @param  {String, Object, Number} value The new value of the changed
     *                                        setting
     * @param  {String} key                   The name of the changed setting
     */ 
    $wix.UI.onChange('*', function (value, key) {
      var eventId = key.match(/([0-9]+)$/);
      if (eventId) {
        if (value) {
          var eventHex = getColor(eventId[1]);
          var eventObj = {eventId: eventId[1], eventColor: eventHex};
          checkedEventsList.push(eventObj);
        } else {
          var eventIndex = checkedEventsList.map(function (elem) {
                                              return elem.eventId;
                                            }).indexOf(eventId[1]);
          checkedEventsList.splice(eventIndex, 1);
        }
        eventChange = true;
      } else if (key.match(/event([0-9]+)Color$/)) {
        eventId = key.match(/([0-9]+)/);
        var found;
        for (var i = 0; i < checkedEventsList.length; i++) {
          if (checkedEventsList[i].eventId === eventId[1]) {
            found = true;
            eventChange = true;
            checkedEventsList[i].eventColor = value.cssColor;
            break;
          }
        }
        if ($scope.settings.view === 'List') {
          eventChange = false;
        }
        if (!found) {
          return;
        }
      } else if (numericalSettings.indexOf(key) >= 0) {
        $scope.settings[key] = Math.ceil(value);
        eventChange = false;
      } else {
        $scope.settings[key] = value;
        eventChange = false;
      }
      sendSettings();
      saveSettingsDebounce();
    });

    /**
     * This gets the color of the event with the provided event ID.
     * 
     * @param  {String} eventId The event ID of the event we want
     * @return {String}         The Hex value of the event we want.
     */
    var getColor = function(eventId) {
      var style = $('#event' + eventId + 'Color .color-box-inner').attr('style');
      var colorRGB = style.match(/rgb\(([0-9]+), ([0-9]+), ([0-9]+)\);$/);
      return convertToHex(parseInt(colorRGB[1], 10), parseInt(colorRGB[2], 10), 
                          parseInt(colorRGB[3], 10));
    };

    /**
     * Converts RGB values to Hex.
     * 
     * @param  {Number} r Red Value
     * @param  {Number} g Green Value
     * @param  {Number} b Blue Value
     * @return {String}   The Hex value of the RGB values
     */
    var convertToHex = function(r, g, b) {
      return ("#" + componentToHex(r) + componentToHex(g) + componentToHex(b));
    };

    /**
     * Converts a number to Hex (base 16) format.
     * 
     * @param  {Number} c Number we want to convert to Hex
     * @return {Number}   The Hex version of the given number
     */
    var componentToHex = function(c) {
      var hex = c.toString(16).toUpperCase();
      if (hex.length === 1) {
        return "0" + hex;
      } else {
        return hex;
      }
    };

    /**
     * This handles all changes to the toggles in the settings panel.
     * Once it figures out which toggle is being changed, it makes the change
     * to the settings and then calls the function to save the settings.
     * 
     * @param  {String} toggle The toggle being changed
     */
    $scope.handleToggles = function(toggle) {
      if (toggle === 'view') {
        if ($scope.settings.view === 'List') {
          $scope.settings.view = 'Month';
        } else {
          $scope.settings.view = 'List';
        }
      } else if (toggle === 'commenting') {
        $scope.settings.commenting = !$scope.settings.commenting;
      } else if (toggle === 'moderating') {
        $scope.settings.moderating = !$scope.settings.moderating;
      } else {
        $scope.settings.hostedBy = !$scope.settings.hostedBy;
      }
      eventChange = false;
      sendSettings();
      saveSettingsDebounce();
    };

    /**
     * Logins in the user. If successful, the settings are reloaded the user's
     * events can be displayed. Else, it displays an error message.
     */
    $scope.login = function() {
      $scope.connectDisabled = true;
      $scope.loginMessage = '';
      if (fbSetup.getFbReady()) {
        fbLogin.checkLoginState()
          .then(function(response) {
            $scope.userName = response;
            $scope.loggedIn = true;
            location.reload();
          }, 
          function(error) {
            handlingFbMessages(error);
          })['finally'](function() {
            $scope.connectDisabled = false;
          });
      } else {
        handlingFbMessages('not connected');
        $scope.connectDisabled = false;
      }
    };

    /**
     * Logs the user out of the app. If the call to logout of Facebook is
     * successful, the user's access token and saved events are deleted from
     * the database. Else, an appropriate error message is displayed.
     * 
     * @param  {Boolean} disconnectDisabled Whether the user can logout right
     *                                      now - this prevents error when the
     *                                      user mashes the logout link.
     */
    $scope.logout = function(disconnectDisabled) {
      if (!disconnectDisabled) {
        $scope.disconnectDisabled = true;
        fbLogin.logout()
          .then(function() {
            server.logout()
              .then(function() {
                  $scope.loggedIn = false;
                  handlingFbMessages('logout successful');
                  $scope.allEventsList = [];
              }, function() {
                $scope.loggedIn = false;
                handlingFbMessages('unknown');
              });
          },
          function(error) {
            $scope.loggedIn = false;
            handlingFbMessages(error);
          })['finally'](function() {
            $scope.disconnectDisabled = false;
          });
        }
    };

    /**
     * This function is used to display all the messages to the user in the
     * settings panel. After 7 seconds, the message automatically fades away.
     * 
     * @param  {String} message The type of message to display.
     */
    var handlingFbMessages = function(message) {
      $('.error').removeAttr('style');
      switch(message) {
        case 'not connected':
          $scope.loginMessage = messages.notConnected;
          break;
        case 'logout successful':
          $('.error').css('color', '#0099FF');
          $scope.loginMessage = messages.logoutSucessful;
          break;
        case 'unknown':
          $scope.loginMessage = messages.unknown;
          break;
        case 'declined':
          $scope.loginMessage = messages.declined;
          break;
        case 'denied':
          $scope.loginMessage = messages.denied;
          break;
        case 'not logged in':
          $scope.loginMessage = messages.notLoggedIn;
          break;
        case 'login':
          $scope.loginMessage = messages.login;
          break;
      }
      $timeout(function() {
          $scope.loginMessage = false; 
        }, 7000);
    };

    /**
     * Gets the settings from the server. Regardless of success or failure from
     * the server, some settings are retrieved (failure or empty settings
     * results in a response containing the default settings). 
     */
    var getSettings = function() {
      server.getUserInfo('settings')
        .then(function (response) {
          setSettings(response);
        }, function(response) {
          setSettings(response);
        });
    };

    /**
     * Sets the settings based on the response from the server.
     * 
     * @param {Object} response Response from the server
     */
    var setSettings = function(response) {
      $scope.settings = response.settings;
      checkedEventsList = response.events;
      $scope.loggedIn = response.active;
      $scope.userName = response.name;
      userId = response.user_id;
    };

    /**
     * Saves the settings to the database. If the settings change involved
     * changing the events or their color, the widget is reloaded.
     */
    var saveSettings = function() {
      var data = JSON.stringify({'settings': $scope.settings, 'events' : checkedEventsList});
      server.saveData(data, 'settings')
        .then(function() {
          if (eventChange) {
            $wix.Settings.refreshApp();
          }
        });
    };

    /**
     * A function that returns a function to call whenever we want to run the
     * provided function (func) in debounced fashion. This allows us to
     * debounce the saving of the settings.
     * 
     * @param  {Function} func      The function we want to call in dobounced
     *                              fashion
     * @param  {Number} wait        The amount of time to debounce by in
     *                              milliseconds
     * @param  {Boolean} immediate  Whether we want to run the function
     *                              immediately
     * @return {Function}           The function to call whenever we want to run
     *                              provided function (func) in debounced
     *                              fashion.
     */
    var debounce = function(func, wait, immediate) {
        var timeout;
        return function() {
          $timeout.cancel(timeout);
          timeout = $timeout(function() {
            timeout = null;
            if (!immediate) {
              func.apply();
            }
          }, wait);
          if (immediate && !timeout) func.apply();
        };
      };

    /**
     * This call returns a function that we call when we want to save the
     * settings in debounced fashion.
     * @type {function}
     */
    var saveSettingsDebounce = debounce(saveSettings, 1000);

    /**
     * These lines of code essentially watch for when we get the access token
     * for the user from Facebook on the client side. If and once we get that,
     * we pull all event data and the user's ID from Facebook. Then we compare
     * this user ID with the user ID from the database that is sent with the
     * settings. If they match, we show the event data in the settings panel.
     * If they don't, we make an extra call to the server to get the actual
     * user's event data.
     *
     * For the most part, users tend to stay signed into their Facebook accounts
     * so this technique will result in simultanenous loading of event details
     * from Facebook and settings from the database. In rare cases where this is
     * not the case, we have to make two calls to the server before the settings
     * are ready for the user.
     *
     * All watches are killed after we determine that the components we are
     * waiting for (getting token on client side and settings from server)
     * are received.
     */
    var fbInitWatch = $scope.$watch(function() {
      return fbSetup.getFbReady();
      }, function() {
        if (fbSetup.getFbReady()) {
          fbInitWatch();
          fbEvents.getUserEventDetails()
            .then(function(eventDetailsFromClient) {
              var watchServerforUserInfo = $scope.$watch('userName', function() {
                if (userId) {
                  watchServerforUserInfo();
                  if (userId === eventDetailsFromClient.userId) {
                    $scope.allEventsList = eventDetailsFromClient.data;
                  } else if ($scope.loggedIn) {
                    getAllEventsFromServer();
                  }
                } else if (userId === "") {
                   $wix.UI.initialize($scope.settings);
                }
              });
            }, function(response) {
              var watchServerforActiveInfo = $scope.$watch('userName', function() {
                if ($scope.userName !== undefined) {
                  if ($scope.userName) {
                    watchServerforActiveInfo();
                    getAllEventsFromServer();
                  } else {
                    $wix.UI.initialize($scope.settings);
                  }
                }
              }); 
            });
        }
    });

    /**
     * This function gets all the event details from the server. It should only
     * be called if getting the access token on the client side fails.
     * On success, the data is added to the allEventsList to be shown in the
     * DOM. Else, the Wix UI is initialized (as opposed to later when the DOM
     * has finished rendering the events in the allEventsList).
     */
    var getAllEventsFromServer = function() {
      server.getAllEvents()
        .then(function(eventDetailsFromServer) {
          $scope.allEventsList = eventDetailsFromServer;
        }, function() {
          $wix.UI.initialize($scope.settings);
        });
    };

    getSettings();
});
