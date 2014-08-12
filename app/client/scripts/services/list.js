'use strict';
/*global $:false, moment:false */

/**
 * This factory is used for initializing the list of events in the widget.
 *
 * @author Jeffrey Chan
 */

angular.module('fbCal').factory('list', function () {
  /**
   * Setup of the List. It involves changing the styles of the list to match
   * the user's settings and processing the event data from the settings and
   * formatting it appropriately.
   * 
   * @param  {String} borderWidth The width of the border the user wants
   * @param  {Object} eventData   The event data fetched from the server.
   * @return {Array}              The processed event data if there is any;
   *                              otherwise, return original event data
   */
  var setup = function(borderWidth, eventData) {
    var borderStyle;
    if (eventData.length) {
      borderStyle = {'border-bottom-width' : borderWidth + 'px',
                         'margin-bottom' : '0px'
                        };
      $('#header').removeAttr('style');
      $('#header').css(borderStyle);
      $('#header').addClass('header');

      return processEvents(eventData);
    } else {
      borderStyle = {'border' : 'none'};
      $('#header').css(borderStyle);
      return eventData;
    }
  };

  /**
   * Removes the border from the last event in List View.
   * 
   * @param  {boolean} last If this is the last event in list
   * @return {Object}       The appropriate CSS style
   */
  var listStyle = function(last) {
    if (last) {
      return {'border' : 'none'};
    } else {
      return {};
    }
  };

  /**
   * Processes the Event data by creating a list filled with event objects
   * containing data processed from the original event data.
   * 
   * @param  {Array} eventData List of events objects to be processed
   * @return {Array}           A list of event objects with processed data in
   *                           sorted order based on time of event
   */
  var processEvents = function(eventData) {
    var eventList = [];
    for (var i = 0; i < eventData.length; i++) {
      eventList[i] = {};
      eventList[i].id = eventData[i].id;
      eventList[i].title = eventData[i].name;
      eventList[i].unixTime = moment(eventData[i].start_time)._d.getTime();
      eventList[i].time = formatTime(eventList[i].unixTime);
    }
    eventList.sort(compare);
    return eventList;
  };

  /**
   * Function that states how to sort events (Based on event time).
   * 
   * @param  {Object} a First Event to be sorted
   * @param  {Object} b Second Event to be sorted
   * @return {Number}   Whether or not the first event is greater
   *                    than the second
   */
  var compare = function(a, b) {
    if (a.unixTime < b.unixTime) {
      return -1;
    } else if (a.unixTime > b.unixTime) {
      return 1;
    } else {
      return 0;
    }
  };

  /**
   * Formats the time of the event.
   * 
   * @param  {String} time An event time
   * @return {String}      The event time formatted
   */
  var formatTime = function(time) {
    var localTime = moment(time)._d;
    var timeString = localTime.toLocaleTimeString().replace(/:\d\d /, '').toLowerCase();
    var dateString = localTime.toLocaleDateString();
    var dayString = localTime.toString().replace(/ .+/, ', ');
    return dayString + dateString + ' at ' + timeString;
  };

  return {
    setup: setup,
    listStyle : listStyle
  };
});
