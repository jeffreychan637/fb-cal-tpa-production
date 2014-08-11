'use strict';
/*global $:false */

/**
 * This is the Controller of the Widget. It is the main file that sends
 * info to be displayed on the DOM to the user and calls different functions
 * across different files to do so.
 *
 * @author Jeffrey Chan
 */

angular.module('fbCal')
  .controller('DesktopCtrl', function ($scope, $wix, $window, desktopCalendar,
                                       list, server) {

    var eventData = [];

    /**
     * Calls the appropriate function in List.js to get appropriate style for
     * the event object.
     * 
     * @param  {Boolean} last Whether or not this is the last item in the list
     * @return {Object}       Appropriate CSS style for this Event object
     */
    $scope.listStyle = function(last) {
      return list.listStyle(last);
    };

    /**
     * Opens the Modal. This function is only used in List View. In calendar.js,
     * there is a corresponding function that opens the modal in Calendar View.
     * 
     * @param  {Number} index The index of the event that we want to open the
     *                        modal of in the eventList array.
     */
    $scope.openModal = function(index) {
      var eventId = $scope.eventList[index].id;
      var url = $window.location.protocol + '//' + $window.location.host + '/modal/' + eventId;
      var onClose = function(message) {};
      $wix.openModal(url, 850, 600, onClose);
    };

    /**
     * Gets the settings from the Server.
     */
    var getSettings = function() {
      server.getUserInfo('widget').then(function(response) {
        setSettings(response);
      }, function(response) {
        setSettings(response);
      });
    };

    /**
     * Sets the settings from the server and sends the event data to the
     * appropriate setup function (based on the view) to be processed. The
     * setup functions setup the list or calendar so that they contain the
     * events in the event data.
     * 
     * @param {Object} response The reponse from the server containing the
     *                          settings and the event data.
     */
    var setSettings = function(response) {
      $scope.settings = response.settings;
      /**
       * If you want to prevent the user from using the app if they have not
       * logged in via settings, do it here.
       *
       * if (!response.active) {
       *    Active stuff here to tell user to active app.
       * }
       */
      eventData = response.fb_event_data;
      if ($scope.settings.view === "Month") {
        desktopCalendar.setup(eventData);
      } else {
        $scope.eventList = list.setup($scope.settings.borderWidth, eventData);
      }
    };

    /** 
     * When the site owner updates the settings, this added event listener
     * allows the widget to implement these changes immediately.
     *
     * View changes in the settings panel results in the appropriate setup
     * funtion being called.
     */
    $wix.addEventListener($wix.Events.SETTINGS_UPDATED, function(message) {
      if (message.settings.view === 'Month' && $scope.settings.view === 'List') {
        desktopCalendar.setup(eventData);
      } else if (message.settings.view === 'List' && $scope.settings.view === 'Month') {
        $scope.eventList = list.setup(message.settings.borderWidth, eventData);
      }
      $scope.settings = message.settings;
      $scope.$apply();
    });

    getSettings();
});