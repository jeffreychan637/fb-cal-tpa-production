'use strict';

/**
 * This factory is used for storing messages for the user in the settings
 * panel as well as messages for the site visitor when something goes wrong
 * in the modal.
 *
 * @author Jeffrey Chan
 */

angular.module('fbCal').factory('messages', function () {

  /**
   * These are messages for the user in the settings panel.
   * @type {String}
   */
  var notConnected = 'We haven\'t connected to the Facebook server yet. Try' +
                      ' connecting again in a minute or reload the page.';
  
  var logoutSucessful = 'Logout successful.';
  
  var unknown = 'Oh no! Something went wrong; please try again.';
  
  var declined = 'To use this app, you must connect it with your Facebook' +
                 ' account.';
  
  var denied = 'To use this app, you must give access to your events. Please' +
               ' login again.';
  
  var notLoggedIn = 'You must log into Facebook before you can connect.';
  
  var login = 'You are not logged out. You must be logged into Facebook' +
              ' before you can disconnect. Login and try again.';

  /**
   * These are the objects that hold the various attributes of the message modal
   * in the modal. Each object represents a different sitation and reason to
   * show the user the message modal.
   * @type {Object}
   */
  var errorModal = {title: 'Oh no!',
                    message: 'Something terrible happened. Please try again or reload the page.',
                    modalButton: 'Try Again'
                   };

  var waitModal = {title: 'Please wait...',
                   message: 'We are still connecting to Facebook. Please wait a few seconds and then click try again.',
                   modalButton: 'Try Again'
                  };

  var permissionModal = {title: 'Hello there!',
                         modalButton: 'Grant Permission',
                         declinedMessage: 'We can’t perform your request regarding this Facebook event unless you don’t give us permission to.',
                         notLoggedInMessage: 'We need your permission to fulfill your request regarding this Facebook event. If you’re not logged in, you can’t grant your permission.',
                         declinedPermissionMessage: 'You might be wondering why we need these permissions to fulfill your request.'
                        };

  var linkModal = {title: 'Share'};

  return { 
          logoutSucessful : logoutSucessful,
          notConnected : notConnected,
          unknown : unknown,
          declined : declined,
          denied : denied,
          notLoggedIn : notLoggedIn,
          login : login,
          errorModal : errorModal,
          waitModal : waitModal,
          permissionModal : permissionModal,
          linkModal : linkModal
         };
});
