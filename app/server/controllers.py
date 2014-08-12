"""This file is essentially the REST API for the app. It handles all requests
from the client side as well as all requests to save data. It is built on the
Flask-Restful package.
"""

import json
from flask import request
from flask.ext.restful import Resource, Api, abort
from app import flask_app
from status_codes import STATUS
from wix_verifications import instance_parser
from fb import get_long_term_token, get_event_data, get_user_name, \
               get_all_event_data, get_specific_event, get_more_feed
from models import save_settings, get_settings, delete_info

__author__ = "Jeffrey Chan"

"""Sets up the flask app with the Flask-Restful package"""
api = Api(flask_app)

class SaveSettings(Resource):
    """This class handles put requests to save settings to the database."""
    def put(self, compID):
        return save_data(request, compID, 'settings')

class SaveAccessToken(Resource):
    """This class handles put requests to save access tokens to the database."""
    def put(self, compID):
        return save_data(request, compID, 'access_token')

class GetSettingsWidget(Resource):
    """This class handles get requests for the settings and event data from the
    widget.
    """
    def get(self, compID):
        return get_data(request, compID, True)

class GetSettingsSettings(Resource):
    """This class handles get requests for the settings from the settings panel.
    """
    def get(self, compID):
        return get_data(request, compID, False)

class GetAllEvents(Resource):
    """This class handles get requests from the settings panel to get event data
    when trying to do so on the client side fails.
    """
    def get(self, compID):
        return get_event(request, compID, "all")

class GetModalEvent(Resource):
    """This class handles all get requests from the modal for basic event data,
    cover photos, the first page of the event feed, as well as guest stats.
    """
    def get(self, compID):
        return get_event(request, compID, "specific")

class GetModalFeed(Resource):
    """This class handles all get requests from the modal for additional pages
    of the event feed as well as additional pages for a specific status. This is
    needed when the site visitor wants to see more statuses in the event feed
    or more comments for a specific status.
    """
    def get(self, compID):
        return get_event(request, compID, "feed")


class Logout(Resource):
    """This class handles put requests from the settings panel to delete the
    user's access token and saved events data from the database after she logs
    out of the app.
    """
    def put(self, compID):
        info = validate_put_request(request, "logout")
        if not delete_info(compID, info["instance"]):
            abort(STATUS["Internal_Server_Error"], \
                  message="Failed to Logout")
        else:
            return { "message" : "User Logged Out Successfully"}

"""This sets the URLs of the app's REST API."""
api.add_resource(SaveSettings, "/SaveSettings/<string:compID>")
api.add_resource(SaveAccessToken, "/SaveAccessToken/<string:compID>")
api.add_resource(GetSettingsWidget, "/GetSettingsWidget/<string:compID>")
api.add_resource(GetSettingsSettings, "/GetSettingsSettings/<string:compID>")
api.add_resource(GetAllEvents, "/GetAllEvents/<string:compID>")
api.add_resource(GetModalEvent, "/GetModalEvent/<string:compID>")
api.add_resource(GetModalFeed, "/GetModalFeed/<string:compID>")
api.add_resource(Logout, "/Logout/<string:compID>")

def validate_put_request(request, datatype):
    """This function validates all put requests to the server.
    
    It makes sure that each request comes with a valid Wix instance and the
    instance is coming from the owner of the app.

    It also makes sure that, depending on the datatype being stored, all the
    needed information to perform the put request has been provided by the
    client.

    It returns the data from the client if successful. Otherwise, it replies
    to the client with an appropiate error status code and corresponding
    message.
    """
    try:
        instance = request.headers["X-Wix-Instance"]
        content_type = request.headers["Content-Type"]
    except AttributeError:
        abort(STATUS["Unauthorized"], message="Request Incomplete")
    except KeyError:
        abort(STATUS["Unauthorized"], message="Missing Value")
    if content_type != "application/json;charset=UTF-8":
        abort(STATUS["Bad_Request"], message="Badly Formed Request")
    instance_json = instance_parser(instance)
    if not instance_json:
        abort(STATUS["Forbidden"], message="Invalid Instance")
    else:
        try:
            if (instance_json["permissions"] != "OWNER"):
                abort(STATUS["Forbidden"], message="Invalid Instance")
            else:
                instance = instance_json["instanceId"]
        except KeyError:
            abort(STATUS["Forbidden"], message="Invalid Instance")
    if datatype == "access_token":
        try:
            data = json.loads(request.data)
            access_token = data["access_token"]
        except Exception:
            abort(STATUS["Bad_Request"], message="Badly Formed Request")
        info = {"instance" : instance, "access_token" : access_token}
    elif datatype == "settings":
        try:
            data_dict = json.loads(request.data)
            settings = json.dumps(data_dict["settings"])
            events = json.dumps(data_dict["events"])
        except Exception:
            abort(STATUS["Bad_Request"], message="Badly Formed Request")
        if not (settings and events):
            abort(STATUS["Bad_Request"], message="Missing Settings or Events")
        info = {"instance" : instance, "settings" : settings, \
                "events" : events}
    else:
        info = {"instance" : instance}
    return info

def validate_get_request(request, request_from):
    """This function validates all get requests to the server.
    
    It makes sure that each request comes with a valid Wix instance.

    It also makes sure that, depending on the datatype being requested, all the
    needed information to perform the get request has been provided by the
    client.

    It returns the provided data from the client if successful. Otherwise, it
    replies to the client with an appropiate error status code and corresponding
    message.
    """
    try:
        instance = request.headers["X-Wix-Instance"]
        instance_json = instance_parser(instance)
        if not instance_json:
            abort(STATUS["Forbidden"], message="Invalid Instance")
        else:
            try:
                instance = instance_json["instanceId"]
            except KeyError:
                abort(STATUS["Forbidden"], message="Invalid Instance")
        if request_from == "settings":
            try:
                if (instance_json["permissions"] != "OWNER"):
                    abort(STATUS["Forbidden"], message="Invalid Instance")
            except KeyError:
                abort(STATUS["Forbidden"], message="Invalid Instance")
        if request_from == "modal" or request_from == "modalNeedingMoreFeed":
            event_id = request.headers["event_id"]
            desired_data = request.headers["desired_data"]
        if request_from == "modalNeedingMoreFeed":
            object_id = request.headers["object_id"]
            if "until" in request.headers:
                until = request.headers["until"]
                after = None
            else:
                after = request.headers["after"]
                until = None
    except AttributeError:
        abort(STATUS["Unauthorized"], message="Request Incomplete")
    except KeyError:
        abort(STATUS["Unauthorized"], message="Missing Value")
    if request_from == "modal" or request_from == "modalNeedingMoreFeed":
        info = {"instance" : instance, "event_id" : event_id, \
                "desired_data" : desired_data}
        if not (request_from == "modalNeedingMoreFeed"):
            return info
        else:
            info["object_id"] = object_id
            info["until"] = until
            info["after"] = after
            return info
    else:
        return instance

def save_data(request, compID, datatype):
    """This function saves the data from the client to the database.

    If saving an access token, it first exchanges it for a long term one while
    doing various security checks on the token.

    It returns an appropiate error status code and corresponding message if
    anything fails while attempting to save.
    """
    info = validate_put_request(request, datatype)
    if datatype == "access_token":
        long_term_token = get_long_term_token(info["access_token"], compID, \
                                              info["instance"])
        if  long_term_token == "Facebook Error":
            abort(STATUS["Bad_Gateway"], 
                  message="Facebook returned error on access_token")
        elif long_term_token == "Invalid Access Token":
            abort(STATUS["Forbidden"], message="This access token is invalid.")
        else:
            access_token_data = json.dumps(long_term_token)
            info["access_token"] = access_token_data
    if not save_settings(compID, info, datatype):
        abort(STATUS["Internal_Server_Error"], message="Could Not Save " + datatype)
    else:
        return {"message" : "Saved " + datatype + " Successfully"}

def get_data(request, compID, request_from_widget):
    """This function handles all the getting of data from widget and settings
    panel (exception: getting event data for settings panel).

    Using the component ID and instance ID, it calls functions that make a
    request to the database for the appropiate row. If no row exists, it returns
    empty settings to the client (where they will be replaced with the
    default settings).

    Otherwise, depending on where the request is coming from (widget or
    settings), it returns the appropiate data in a JSON format to the 
    client side.

    It returns an appropiate error status code and corresponding message if
    anything fails while getting the data.
    """
    if (request_from_widget):
        instance = validate_get_request(request, "widget")
    else:
        instance = validate_get_request(request, "settings")
    db_entry = get_settings(compID, instance)
    if db_entry is None:
        abort(STATUS["Internal_Server_Error"], \
              message= "Could Not Get Settings")
    if not db_entry:
        if request_from_widget:
            empty_settings = {"settings" : "", \
                              "fb_event_data" : "", "active" : "false"}
        else:
            empty_settings = {"settings" : "", "events" : "", \
                              "active" : "false", "name" : "", "user_id" : ""}
        empty_json = json.dumps(empty_settings)
        return empty_json
    else:
        settings = ""
        access_token_data = ""
        events = ""
        if db_entry.settings:
            settings = json.loads(db_entry.settings)
        if db_entry.events:
            events = json.loads(db_entry.events)
        if db_entry.access_token_data:
            access_token_data = json.loads(db_entry.access_token_data)
        if request_from_widget:
            if access_token_data:
                fb_event_data = get_event_data(events, access_token_data)
                if (not fb_event_data) and (fb_event_data != []):
                    abort(STATUS["Bad_Gateway"], 
                        message="Couldn't receive data from Facebook")
                full_settings = {"settings" : settings, \
                                 "fb_event_data" : fb_event_data, \
                                 "active" : "true"}
            else:
                full_settings = {"settings" : settings, \
                                 "fb_event_data" : "", "active" : "false"}
        else:
            if access_token_data:
                user_id = access_token_data["user_id"]
                name = get_user_name(access_token_data)
                active = "true"
            else:
                active = "false"
                user_id = ""
                name = ""

            full_settings = {"settings" : settings, "events" : events, \
                             "active" : active, "name" : name, "user_id" : user_id};
        full_json = json.dumps(full_settings)
        return full_json

def get_event(request, compID, datatype):
    """This function handles all requests from the modal as well as gets event
    data for the settings panel.

    For the modal, it can get specific data on the event (e.g. cover photo,
    event feed) as well as any basic event data.

    It makes the assumption that if this request is being made, the user has
    an entry in the database and will return an error is there is no entry.

    Once it gets the appropiate data, it returns it to the client in a JSON
    format.

    It returns an appropiate error status code and corresponding message if
    anything fails while getting the data.
    """
    if (datatype == "all"):
        instance = validate_get_request(request, "settings")
    elif (datatype == "specific"):
        info = validate_get_request(request, "modal")
    else:
        info = validate_get_request(request, "modalNeedingMoreFeed")
    if (datatype != "all"):
        instance = info["instance"]
        event_id = info["event_id"]
        desired_data = info["desired_data"]
    if (datatype == "feed"):
        object_id = info["object_id"]
        after = info["after"]
        until = info["until"]
    db_entry = get_settings(compID, instance)
    if db_entry is None:
        abort(STATUS["Internal_Server_Error"], \
          message= "Could Not Get Events")
    if not (db_entry and db_entry.access_token_data):
        abort(STATUS["Not_Found"], message= "Could not find User")
    access_token_data = json.loads(db_entry.access_token_data)
    if (datatype == "all"):
        event_data = get_all_event_data(access_token_data)
    else:
        access_token = access_token_data["access_token"]
        if not (db_entry.events):
            abort(STATUS["Not_Found"], message= "User has no events to display")
        events = json.loads(db_entry.events)
        found = False
        for event in events:
            if event["eventId"] == event_id:
                found = True
                break;
        if (found):
            if (datatype == "specific"):
                event_data = get_specific_event(event_id, access_token, \
                                            desired_data)
            else:
                event_data = get_more_feed(object_id, access_token, \
                                           desired_data, after, until)
            if not event_data:
                abort(STATUS["Bad_Gateway"],
                message="Couldn't receive data from Facebook")
        else:
            abort(STATUS["Forbidden"], message= "User cannot display this event")
        if desired_data == "all":
            settings = ""
            if db_entry.settings:
                settings = json.loads(db_entry.settings)
            event_data = {"settings" : settings, "event_data" : event_data}
    if not event_data:
        abort(STATUS["Bad_Gateway"],
              message="Couldn't receive data from Facebook")
    return json.dumps(event_data)
